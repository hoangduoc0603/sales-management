import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { PlatformCacheStore } from '../../infrastructure/platform/cache';
import type { AppendOnlySheetRecordGateway } from './sheet-record-repository';

export interface UserAccountRecord {
  userId: string;
  loginId: string;
  displayName: string;
  tenantId: string;
  authVersion: number;
  disabled: boolean;
  passwordChangeRequired: boolean;
  passwordVerifier: string;
  failedLoginCount: number;
  lockedUntil?: string;
  actions: readonly string[];
  branchIds: readonly string[];
  warehouseIds: readonly string[];
}

export interface SessionRecord {
  sessionId: string;
  tokenFingerprint: string;
  userId: string;
  authVersion: number;
  issuedAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  revokedAt?: string;
}

export interface AuthRepository {
  findUserByLoginId(loginId: string): UserAccountRecord | undefined;
  findUserById(userId: string): UserAccountRecord | undefined;
  findUserProfileById?(userId: string): UserAccountRecord | undefined;
  saveUser(user: UserAccountRecord): void;
  saveSession(session: SessionRecord): void;
  findSessionByFingerprint(tokenFingerprint: string): SessionRecord | undefined;
  saveUpdatedSession(session: SessionRecord): void;
}

export interface CredentialVerifierStore {
  getVerifier(userId: string): string | undefined;
  saveVerifier(userId: string, verifier: string): void;
}

export interface SheetAuthRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  credentialVerifierStore: CredentialVerifierStore;
  cacheStore?: PlatformCacheStore;
  userProfileCacheTtlSeconds?: number;
}

export function toActorContext(user: UserAccountRecord): ActorContextDTO {
  return {
    userId: user.userId,
    loginId: user.loginId,
    displayName: user.displayName,
    tenantId: user.tenantId,
    authVersion: user.authVersion,
    actions: user.actions,
    scope: {
      tenantId: user.tenantId,
      branchIds: user.branchIds,
      warehouseIds: user.warehouseIds,
    },
  };
}

export function createInMemoryAuthRepository(seedUsers: readonly UserAccountRecord[]): AuthRepository {
  const usersById = new Map(seedUsers.map((user) => [user.userId, { ...user }]));
  const sessionsByFingerprint = new Map<string, SessionRecord>();

  return {
    findUserByLoginId(loginId) {
      return [...usersById.values()].find((user) => user.loginId === loginId);
    },
    findUserById(userId) {
      return usersById.get(userId);
    },
    findUserProfileById(userId) {
      return usersById.get(userId);
    },
    saveUser(user) {
      usersById.set(user.userId, { ...user });
    },
    saveSession(session) {
      sessionsByFingerprint.set(session.tokenFingerprint, { ...session });
    },
    findSessionByFingerprint(tokenFingerprint) {
      return sessionsByFingerprint.get(tokenFingerprint);
    },
    saveUpdatedSession(session) {
      sessionsByFingerprint.set(session.tokenFingerprint, { ...session });
    },
  };
}

export function createSheetAuthRepository(deps: SheetAuthRepositoryDependencies): AuthRepository {
  const userTable = findTable(deps.tableDefinitions, 'UserAccount');
  const sessionTable = findTable(deps.tableDefinitions, 'Session');
  const cacheTtlSeconds = deps.userProfileCacheTtlSeconds ?? 21600;

  return {
    findUserByLoginId(loginId) {
      const normalized = normalizeLoginId(loginId);
      const cached = readCachedUserProfile(deps.cacheStore, userLoginCacheKey(normalized));
      if (cached !== undefined && normalizeLoginId(cached.loginId) === normalized) {
        return attachVerifier(cached, deps.credentialVerifierStore);
      }

      return latestRows(readRowsByColumn(deps.gateway, userTable, 'loginIdNormalized', normalized), 'userId')
        .map((row) => userFromRow(row, deps.credentialVerifierStore))
        .map((user) => cacheUserProfile(deps.cacheStore, user, cacheTtlSeconds))
        .find((user) => normalizeLoginId(user.loginId) === normalized);
    },
    findUserById(userId) {
      const cached = readCachedUserProfile(deps.cacheStore, userIdCacheKey(userId));
      if (cached !== undefined && cached.userId === userId) {
        return attachVerifier(cached, deps.credentialVerifierStore);
      }

      return latestRows(readRowsByColumn(deps.gateway, userTable, 'userId', userId), 'userId')
        .map((row) => userFromRow(row, deps.credentialVerifierStore))
        .map((user) => cacheUserProfile(deps.cacheStore, user, cacheTtlSeconds))
        .find((user) => user.userId === userId);
    },
    findUserProfileById(userId) {
      const cached = readCachedUserProfile(deps.cacheStore, userIdCacheKey(userId));
      if (cached !== undefined && cached.userId === userId) {
        return cached;
      }

      return latestRows(readRowsByColumn(deps.gateway, userTable, 'userId', userId), 'userId')
        .map((row) => userFromRow(row))
        .map((user) => cacheUserProfile(deps.cacheStore, user, cacheTtlSeconds))
        .find((user) => user.userId === userId);
    },
    saveUser(user) {
      deps.credentialVerifierStore.saveVerifier(user.userId, user.passwordVerifier);
      appendVersionedRow({
        gateway: deps.gateway,
        table: userTable,
        idField: 'userId',
        recordId: user.userId,
        row: userToRow(user),
      });
      cacheUserProfile(deps.cacheStore, user, cacheTtlSeconds);
    },
    saveSession(session) {
      appendNewVersionedRow({
        gateway: deps.gateway,
        table: sessionTable,
        recordId: session.sessionId,
        row: sessionToRow(session),
      });
    },
    findSessionByFingerprint(tokenFingerprint) {
      return latestRows(
        readRowsByColumn(deps.gateway, sessionTable, 'tokenFingerprint', tokenFingerprint),
        'sessionId',
      )
        .map(sessionFromRow)
        .find((session) => session.tokenFingerprint === tokenFingerprint);
    },
    saveUpdatedSession(session) {
      appendVersionedRow({
        gateway: deps.gateway,
        table: sessionTable,
        idField: 'sessionId',
        recordId: session.sessionId,
        row: sessionToRow(session),
      });
    },
  };
}

function userLoginCacheKey(normalizedLoginId: string): string {
  return `salesManagement.auth.user.login.${normalizedLoginId}`;
}

function userIdCacheKey(userId: string): string {
  return `salesManagement.auth.user.id.${userId}`;
}

function cacheUserProfile(
  cacheStore: PlatformCacheStore | undefined,
  user: UserAccountRecord,
  ttlSeconds: number,
): UserAccountRecord {
  if (cacheStore === undefined) return user;
  const profile = userWithoutVerifier(user);
  const payload = JSON.stringify(profile);
  cacheStore.put(userLoginCacheKey(normalizeLoginId(user.loginId)), payload, ttlSeconds);
  cacheStore.put(userIdCacheKey(user.userId), payload, ttlSeconds);
  return user;
}

function readCachedUserProfile(
  cacheStore: PlatformCacheStore | undefined,
  key: string,
): UserAccountRecord | undefined {
  if (cacheStore === undefined) return undefined;
  const raw = cacheStore.get(key);
  if (raw === undefined) return undefined;
  try {
    return userWithoutVerifier(JSON.parse(raw) as UserAccountRecord);
  } catch {
    cacheStore.remove(key);
    return undefined;
  }
}

function attachVerifier(user: UserAccountRecord, credentialVerifierStore: CredentialVerifierStore): UserAccountRecord {
  return {
    ...user,
    passwordVerifier: credentialVerifierStore.getVerifier(user.userId) ?? '',
  };
}

function userWithoutVerifier(user: UserAccountRecord): UserAccountRecord {
  return {
    ...user,
    passwordVerifier: '',
    actions: [...user.actions],
    branchIds: [...user.branchIds],
    warehouseIds: [...user.warehouseIds],
  };
}

interface VersionedSheetRow extends Record<string, unknown> {
  id: string;
  schemaVersion: number;
  recordVersion: number;
}

interface UserAccountSheetRow extends VersionedSheetRow {
  userId: string;
  loginId: string;
  loginIdNormalized: string;
  displayName: string;
  tenantId: string;
  authVersion: number;
  disabled: boolean;
  passwordChangeRequired: boolean;
  failedLoginCount: number;
  lockedUntil?: string;
  actionsJson?: readonly string[];
  branchIdsJson?: readonly string[];
  warehouseIdsJson?: readonly string[];
}

interface SessionSheetRow extends VersionedSheetRow {
  sessionId: string;
  tokenFingerprint: string;
  userId: string;
  authVersion: number;
  issuedAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  lastSeenAt?: string;
  revokedAt?: string;
  status?: string;
}

function userToRow(user: UserAccountRecord): Omit<UserAccountSheetRow, 'id' | 'schemaVersion' | 'recordVersion'> {
  return {
    userId: user.userId,
    loginId: user.loginId,
    loginIdNormalized: normalizeLoginId(user.loginId),
    displayName: user.displayName,
    tenantId: user.tenantId,
    authVersion: user.authVersion,
    disabled: user.disabled,
    passwordChangeRequired: user.passwordChangeRequired,
    failedLoginCount: user.failedLoginCount,
    lockedUntil: user.lockedUntil,
    actionsJson: [...user.actions],
    branchIdsJson: [...user.branchIds],
    warehouseIdsJson: [...user.warehouseIds],
  };
}

function userFromRow(
  row: VersionedSheetRow,
  credentialVerifierStore?: CredentialVerifierStore,
): UserAccountRecord {
  const user = row as UserAccountSheetRow;
  return {
    userId: user.userId,
    loginId: user.loginId,
    displayName: user.displayName,
    tenantId: user.tenantId,
    authVersion: numberValue(user.authVersion),
    disabled: booleanValue(user.disabled),
    passwordChangeRequired: booleanValue(user.passwordChangeRequired),
    passwordVerifier: credentialVerifierStore?.getVerifier(user.userId) ?? '',
    failedLoginCount: numberValue(user.failedLoginCount),
    lockedUntil: stringOptional(user.lockedUntil),
    actions: arrayValue(user.actionsJson),
    branchIds: arrayValue(user.branchIdsJson),
    warehouseIds: arrayValue(user.warehouseIdsJson),
  };
}

function sessionToRow(session: SessionRecord): Omit<SessionSheetRow, 'id' | 'schemaVersion' | 'recordVersion'> {
  return {
    sessionId: session.sessionId,
    tokenFingerprint: session.tokenFingerprint,
    userId: session.userId,
    authVersion: session.authVersion,
    issuedAt: session.issuedAt,
    idleExpiresAt: session.idleExpiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
    lastSeenAt: session.revokedAt ?? session.issuedAt,
    revokedAt: session.revokedAt,
    status: session.revokedAt === undefined ? 'Active' : 'Revoked',
  };
}

function sessionFromRow(row: VersionedSheetRow): SessionRecord {
  const session = row as SessionSheetRow;
  return {
    sessionId: session.sessionId,
    tokenFingerprint: session.tokenFingerprint,
    userId: session.userId,
    authVersion: numberValue(session.authVersion),
    issuedAt: session.issuedAt,
    idleExpiresAt: session.idleExpiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
    revokedAt: stringOptional(session.revokedAt),
  };
}

function appendVersionedRow(input: {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  idField: string;
  recordId: string;
  row: Record<string, unknown>;
}): void {
  const rows = readRowsByColumn(input.gateway, input.table, input.idField, input.recordId);
  const nextVersion =
    rows
      .filter((row) => String(row[input.idField] ?? '') === input.recordId)
      .reduce((max, row) => Math.max(max, getRecordVersion(row)), 0) + 1;

  input.gateway.appendRows({
    table: input.table,
    rows: [
      {
        ...deepClone(input.row),
        id: `${input.recordId}:v${nextVersion}`,
        schemaVersion: input.table.schemaVersion,
        recordVersion: nextVersion,
      },
    ],
  });
}

function appendNewVersionedRow(input: {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  recordId: string;
  row: Record<string, unknown>;
}): void {
  input.gateway.appendRows({
    table: input.table,
    rows: [
      {
        ...deepClone(input.row),
        id: `${input.recordId}:v1`,
        schemaVersion: input.table.schemaVersion,
        recordVersion: 1,
      },
    ],
  });
}

function latestRows(rows: readonly VersionedSheetRow[], idField: string): VersionedSheetRow[] {
  const latestById = new Map<string, VersionedSheetRow>();
  for (const row of rows) {
    const recordId = String(row[idField] ?? '');
    if (recordId === '') continue;
    const current = latestById.get(recordId);
    if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) {
      latestById.set(recordId, row);
    }
  }
  return [...latestById.values()].map(deepClone);
}

function readRowsByColumn(
  gateway: AppendOnlySheetRecordGateway,
  table: TableDefinitionDTO,
  columnName: string,
  value: string,
): VersionedSheetRow[] {
  const rows = gateway.findRowsByColumn?.({ table, columnName, value }) ?? gateway.readTable({ table });
  return rows.map((row) => deepClone(row) as VersionedSheetRow);
}

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) {
    throw new Error(`Missing auth table definition: ${tableName}`);
  }
  return table;
}

function getRecordVersion(row: VersionedSheetRow): number {
  if (typeof row.recordVersion === 'number') return row.recordVersion;
  const parsed = Number(row.recordVersion);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const match = /:v(\d+)$/.exec(row.id);
  return match === null ? 0 : Number(match[1]);
}

function normalizeLoginId(loginId: string): string {
  return loginId.trim().toLowerCase();
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function booleanValue(value: unknown): boolean {
  return value === true || value === 'true';
}

function stringOptional(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function arrayValue(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
