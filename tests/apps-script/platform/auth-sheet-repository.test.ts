import { describe, expect, it } from 'vitest';
import {
  createSheetAuthRepository,
  type CredentialVerifierStore,
} from '../../../apps-script/src/repositories/platform/auth-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';

describe('SheetAuthRepository', () => {
  it('persists user/session metadata through Sheets while keeping credential verifier outside Sheets', () => {
    const gateway = new FakeSheetGateway();
    const credentialStore = new FakeCredentialVerifierStore();
    const repository = createSheetAuthRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      credentialVerifierStore: credentialStore,
    });

    repository.saveUser({
      userId: 'user-admin',
      loginId: 'admin',
      displayName: 'Admin',
      tenantId: 'tenant-default',
      authVersion: 1,
      disabled: false,
      passwordChangeRequired: true,
      passwordVerifier: 'pbkdf2:secret-verifier',
      failedLoginCount: 0,
      actions: ['platform.session.view', 'sales.pos.complete'],
      branchIds: ['branch-default'],
      warehouseIds: ['warehouse-default'],
    });
    repository.saveUser({
      userId: 'user-admin',
      loginId: 'admin',
      displayName: 'Admin',
      tenantId: 'tenant-default',
      authVersion: 2,
      disabled: false,
      passwordChangeRequired: false,
      passwordVerifier: 'pbkdf2:rotated-verifier',
      failedLoginCount: 5,
      lockedUntil: '2026-07-27T09:15:00.000Z',
      actions: ['platform.session.view'],
      branchIds: ['branch-default'],
      warehouseIds: ['warehouse-default'],
    });
    repository.saveSession({
      sessionId: 'session-1',
      tokenFingerprint: 'fingerprint-only',
      userId: 'user-admin',
      authVersion: 2,
      issuedAt: '2026-07-27T09:00:00.000Z',
      idleExpiresAt: '2026-07-27T10:00:00.000Z',
      absoluteExpiresAt: '2026-07-27T17:00:00.000Z',
    });
    repository.saveUpdatedSession({
      sessionId: 'session-1',
      tokenFingerprint: 'fingerprint-only',
      userId: 'user-admin',
      authVersion: 2,
      issuedAt: '2026-07-27T09:00:00.000Z',
      idleExpiresAt: '2026-07-27T10:30:00.000Z',
      absoluteExpiresAt: '2026-07-27T17:00:00.000Z',
      revokedAt: '2026-07-27T09:30:00.000Z',
    });

    expect(repository.findUserByLoginId('admin')).toMatchObject({
      userId: 'user-admin',
      authVersion: 2,
      passwordVerifier: 'pbkdf2:rotated-verifier',
      failedLoginCount: 5,
      lockedUntil: '2026-07-27T09:15:00.000Z',
      actions: ['platform.session.view'],
      branchIds: ['branch-default'],
      warehouseIds: ['warehouse-default'],
    });
    expect(repository.findUserById('user-admin')?.passwordVerifier).toBe('pbkdf2:rotated-verifier');
    credentialStore.getCalls = [];
    expect(repository.findUserProfileById?.('user-admin')).toMatchObject({
      userId: 'user-admin',
      authVersion: 2,
      passwordVerifier: '',
    });
    expect(credentialStore.getCalls).toEqual([]);
    expect(repository.findSessionByFingerprint('fingerprint-only')).toMatchObject({
      sessionId: 'session-1',
      revokedAt: '2026-07-27T09:30:00.000Z',
    });
    expect(credentialStore.saved).toEqual([
      ['user-admin', 'pbkdf2:secret-verifier'],
      ['user-admin', 'pbkdf2:rotated-verifier'],
    ]);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey])).toEqual([
      ['UserAccount', undefined],
      ['UserAccount', undefined],
      ['Session', undefined],
      ['Session', undefined],
    ]);
    expect(JSON.stringify(gateway.appendRequests)).not.toContain('pbkdf2:secret-verifier');
    expect(JSON.stringify(gateway.appendRequests)).not.toContain('pbkdf2:rotated-verifier');
    expect(JSON.stringify(gateway.appendRequests)).not.toContain('session-token');
  });

  it('ưu tiên lookup theo cột cho hot path user/session thay vì đọc toàn bảng', () => {
    const gateway = new FakeSheetGateway();
    const credentialStore = new FakeCredentialVerifierStore();
    const repository = createSheetAuthRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      credentialVerifierStore: credentialStore,
    });

    repository.saveUser({
      userId: 'user-admin',
      loginId: 'Admin',
      displayName: 'Admin',
      tenantId: 'tenant-default',
      authVersion: 1,
      disabled: false,
      passwordChangeRequired: false,
      passwordVerifier: 'hmac-sha256-v1:salt:mac',
      failedLoginCount: 0,
      actions: ['platform.session.view'],
      branchIds: ['branch-default'],
      warehouseIds: ['warehouse-default'],
    });
    repository.saveSession({
      sessionId: 'session-1',
      tokenFingerprint: 'hmac-session-fingerprint',
      userId: 'user-admin',
      authVersion: 1,
      issuedAt: '2026-07-27T09:00:00.000Z',
      idleExpiresAt: '2026-07-27T10:00:00.000Z',
      absoluteExpiresAt: '2026-07-27T17:00:00.000Z',
    });

    gateway.readRequests = [];
    gateway.findRequests = [];

    expect(repository.findUserByLoginId('admin')?.userId).toBe('user-admin');
    expect(repository.findUserById('user-admin')?.loginId).toBe('Admin');
    expect(repository.findSessionByFingerprint('hmac-session-fingerprint')?.sessionId).toBe('session-1');

    expect(gateway.readRequests).toEqual([]);
    expect(gateway.findRequests.map((request) => [request.tableName, request.columnName, request.value])).toEqual([
      ['UserAccount', 'loginIdNormalized', 'admin'],
      ['UserAccount', 'userId', 'user-admin'],
      ['Session', 'tokenFingerprint', 'hmac-session-fingerprint'],
    ]);
  });

  it('appends a newly issued session without a version lookup on the login hot path', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetAuthRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      credentialVerifierStore: new FakeCredentialVerifierStore(),
    });

    repository.saveSession({
      sessionId: 'session-new',
      tokenFingerprint: 'fingerprint-new',
      userId: 'user-admin',
      authVersion: 1,
      issuedAt: '2026-07-27T09:00:00.000Z',
      idleExpiresAt: '2026-07-27T10:00:00.000Z',
      absoluteExpiresAt: '2026-07-27T17:00:00.000Z',
    });

    expect(gateway.readRequests).toEqual([]);
    expect(gateway.findRequests).toEqual([]);
    expect(gateway.appendRequests).toEqual([
      {
        tableName: 'Session',
        partitionKey: undefined,
        rows: [
          expect.objectContaining({
            id: 'session-new:v1',
            sessionId: 'session-new',
            tokenFingerprint: 'fingerprint-new',
            recordVersion: 1,
          }),
        ],
      },
    ]);
  });

  it('caches session metadata for repeated authenticated API calls without reading Session sheet', () => {
    const gateway = new FakeSheetGateway();
    const cacheStore = new FakePlatformCacheStore();
    const repository = createSheetAuthRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      credentialVerifierStore: new FakeCredentialVerifierStore(),
      cacheStore,
    });

    repository.saveSession({
      sessionId: 'session-hot',
      tokenFingerprint: 'fingerprint-hot',
      userId: 'user-admin',
      authVersion: 1,
      issuedAt: '2026-07-27T09:00:00.000Z',
      idleExpiresAt: '2026-07-27T10:00:00.000Z',
      absoluteExpiresAt: '2026-07-27T17:00:00.000Z',
    });

    gateway.readRequests = [];
    gateway.findRequests = [];

    expect(repository.findSessionByFingerprint('fingerprint-hot')).toMatchObject({
      sessionId: 'session-hot',
      userId: 'user-admin',
      authVersion: 1,
    });

    expect(gateway.readRequests).toEqual([]);
    expect(gateway.findRequests).toEqual([]);
    expect(JSON.stringify(cacheStore.dump())).not.toContain('session-token');

    repository.saveUpdatedSession({
      sessionId: 'session-hot',
      tokenFingerprint: 'fingerprint-hot',
      userId: 'user-admin',
      authVersion: 1,
      issuedAt: '2026-07-27T09:00:00.000Z',
      idleExpiresAt: '2026-07-27T10:30:00.000Z',
      absoluteExpiresAt: '2026-07-27T17:00:00.000Z',
      revokedAt: '2026-07-27T09:30:00.000Z',
    });

    gateway.readRequests = [];
    gateway.findRequests = [];

    expect(repository.findSessionByFingerprint('fingerprint-hot')).toMatchObject({
      sessionId: 'session-hot',
      revokedAt: '2026-07-27T09:30:00.000Z',
    });
    expect(gateway.readRequests).toEqual([]);
    expect(gateway.findRequests).toEqual([]);
  });

  it('caches non-secret user profile for repeated login lookup while reading verifier from secure store', () => {
    const gateway = new FakeSheetGateway();
    const credentialStore = new FakeCredentialVerifierStore();
    const cacheStore = new FakePlatformCacheStore();
    const repository = createSheetAuthRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      credentialVerifierStore: credentialStore,
      cacheStore,
    });

    repository.saveUser({
      userId: 'user-admin',
      loginId: 'Admin',
      displayName: 'Admin',
      tenantId: 'tenant-default',
      authVersion: 1,
      disabled: false,
      passwordChangeRequired: false,
      passwordVerifier: 'hmac-sha256-v1:salt:mac',
      failedLoginCount: 0,
      actions: ['platform.session.view'],
      branchIds: ['branch-default'],
      warehouseIds: ['warehouse-default'],
    });
    cacheStore.clear();

    gateway.findRequests = [];
    credentialStore.getCalls = [];
    expect(repository.findUserByLoginId('admin')).toMatchObject({
      userId: 'user-admin',
      passwordVerifier: 'hmac-sha256-v1:salt:mac',
    });
    expect(gateway.findRequests).toHaveLength(1);
    expect(credentialStore.getCalls).toEqual(['user-admin']);
    expect(JSON.stringify(cacheStore.dump())).not.toContain('hmac-sha256-v1:salt:mac');
    expect(cacheStore.ttls()).toEqual([21600, 21600]);

    gateway.findRequests = [];
    credentialStore.getCalls = [];
    expect(repository.findUserByLoginId('admin')).toMatchObject({
      userId: 'user-admin',
      passwordVerifier: 'hmac-sha256-v1:salt:mac',
    });
    expect(gateway.findRequests).toEqual([]);
    expect(credentialStore.getCalls).toEqual(['user-admin']);
  });
});

class FakeCredentialVerifierStore implements CredentialVerifierStore {
  readonly saved: Array<[string, string]> = [];
  getCalls: string[] = [];
  private readonly values = new Map<string, string>();

  getVerifier(userId: string): string | undefined {
    this.getCalls.push(userId);
    return this.values.get(userId);
  }

  saveVerifier(userId: string, verifier: string): void {
    this.saved.push([userId, verifier]);
    this.values.set(userId, verifier);
  }
}

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  readRequests: Array<{ tableName: string; partitionKey?: string }> = [];
  findRequests: Array<{ tableName: string; columnName: string; value: string; partitionKey?: string }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  readTable(request: { table: TableDefinitionDTO; partitionKey?: string }): Record<string, unknown>[] {
    this.readRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey });
    return this.getRows(request.table.tableName).map(clone);
  }

  findRowsByColumn(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    columnName: string;
    value: string;
  }): Record<string, unknown>[] {
    this.findRequests.push({
      tableName: request.table.tableName,
      columnName: request.columnName,
      value: request.value,
      partitionKey: request.partitionKey,
    });
    return this.getRows(request.table.tableName)
      .filter((row) => String(row[request.columnName] ?? '') === request.value)
      .map(clone);
  }

  appendRows(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    rows: readonly Record<string, unknown>[];
  }): { appendedRowCount: number } {
    const rows = request.rows.map(clone);
    this.appendRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey, rows });
    this.getRows(request.table.tableName).push(...rows);
    return { appendedRowCount: rows.length };
  }

  private getRows(tableName: string): Record<string, unknown>[] {
    let rows = this.rowsByTable.get(tableName);
    if (rows === undefined) {
      rows = [];
      this.rowsByTable.set(tableName, rows);
    }
    return rows;
  }
}

class FakePlatformCacheStore {
  private readonly values = new Map<string, string>();
  private readonly ttlValues: number[] = [];

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  put(key: string, value: string, expirationInSeconds = 0): void {
    this.values.set(key, value);
    this.ttlValues.push(expirationInSeconds);
  }

  remove(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
    this.ttlValues.length = 0;
  }

  dump(): Record<string, string> {
    return Object.fromEntries(this.values);
  }

  ttls(): number[] {
    return [...this.ttlValues];
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
