import type { ApiMeta, ApiRequest, ApiResult } from '@shared/contracts/api';
import type { ApiErrorCode } from '@shared/contracts/errors';
import type { AuthLoginResponse } from '@shared/contracts/platform/auth';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { CommandStatusResponse } from '@shared/contracts/platform/command';
import type { TableDefinitionDTO, TableDefinitionsResponse } from '@shared/contracts/platform/registry';
import { parseApiRequest } from '@shared/schemas/api';
import { parseAuthLoginRequest } from '@shared/schemas/platform/auth';
import { parseCommandStatusRequest } from '@shared/schemas/platform/command';
import { createApiClient, type ApiClient, type ApiInvoker } from './client';

interface LocalSession {
  sessionToken: string;
  actor: ActorContextDTO;
  issuedAtMs: number;
  idleExpiresAtMs: number;
  absoluteExpiresAtMs: number;
  revoked: boolean;
}

export interface LocalFakeBackendOptions {
  now?: () => Date;
}

const idleTtlMs = 60 * 60 * 1000;
const absoluteTtlMs = 8 * 60 * 60 * 1000;

export function createLocalFakeBackendClient(options: LocalFakeBackendOptions = {}): ApiClient {
  return createApiClient(createLocalFakeBackendInvoker(options));
}

export function createLocalFakeBackendInvoker(options: LocalFakeBackendOptions = {}): ApiInvoker {
  const now = options.now ?? (() => new Date());
  let sequence = 0;
  const sessions = new Map<string, LocalSession>();

  const nextId = (prefix: string) => {
    sequence += 1;
    return `local-${prefix}-${sequence}`;
  };

  return {
    async invoke<T>(request: ApiRequest): Promise<ApiResult<T>> {
      const startedAt = now();
      let apiRequest: ApiRequest;

      try {
        apiRequest = parseApiRequest(request);
      } catch {
        return errorResult<T>(
          'INVALID_REQUEST',
          'Yêu cầu không hợp lệ.',
          createMeta(request, startedAt, now()),
        );
      }

      const meta = createMeta(apiRequest, startedAt, now());

      switch (apiRequest.operation) {
        case 'platform.auth.login':
          return handleLogin<T>(apiRequest, meta, sessions, now, nextId);
        case 'platform.auth.logout':
          return withSession<T>(apiRequest, meta, sessions, now, (session) => {
            session.revoked = true;
            return { revoked: true };
          });
        case 'platform.session.me':
          return withSession<T>(apiRequest, meta, sessions, now, (session) => ({
            actor: session.actor,
            idleExpiresAt: new Date(session.idleExpiresAtMs).toISOString(),
            absoluteExpiresAt: new Date(session.absoluteExpiresAtMs).toISOString(),
          }));
        case 'platform.command.getStatus':
          try {
            parseCommandStatusRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CommandStatusResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            () => ({ command: undefined }),
          );
        case 'platform.registry.getTableDefinitions':
          return withSession<T, TableDefinitionsResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            () => ({ tables: createLocalPlatformTableDefinitions() }),
          );
        default:
          return errorResult<T>('OPERATION_NOT_SUPPORTED', 'Thao tác chưa được hỗ trợ.', meta);
      }
    },
  };
}

function handleLogin<T>(
  request: ApiRequest,
  meta: ApiMeta,
  sessions: Map<string, LocalSession>,
  now: () => Date,
  nextId: (prefix: string) => string,
): ApiResult<T> {
  const payload = parseAuthLoginRequest(request.payload);

  if (payload.loginId !== 'admin' || payload.password !== 'admin123') {
    return errorResult<T>('INVALID_CREDENTIALS', 'Tài khoản hoặc mật khẩu không đúng.', meta);
  }

  const currentTime = now().getTime();
  const sessionToken = nextId('session');
  const actor = createLocalAdminActor();
  const session: LocalSession = {
    sessionToken,
    actor,
    issuedAtMs: currentTime,
    idleExpiresAtMs: currentTime + idleTtlMs,
    absoluteExpiresAtMs: currentTime + absoluteTtlMs,
    revoked: false,
  };
  sessions.set(sessionToken, session);

  const response: AuthLoginResponse = {
    sessionToken,
    actor,
    idleExpiresAt: new Date(session.idleExpiresAtMs).toISOString(),
    absoluteExpiresAt: new Date(session.absoluteExpiresAtMs).toISOString(),
    passwordChangeRequired: false,
  };

  return successResult(response as T, meta);
}

function withSession<T, TData = unknown>(
  request: ApiRequest,
  meta: ApiMeta,
  sessions: Map<string, LocalSession>,
  now: () => Date,
  handler: (session: LocalSession) => TData,
): ApiResult<T> {
  if (request.sessionToken === undefined) {
    return errorResult<T>('SESSION_REQUIRED', 'Phiên đăng nhập là bắt buộc.', meta);
  }

  const session = sessions.get(request.sessionToken);
  const currentTime = now().getTime();

  if (
    session === undefined ||
    session.revoked ||
    session.idleExpiresAtMs <= currentTime ||
    session.absoluteExpiresAtMs <= currentTime
  ) {
    return errorResult<T>('SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn.', meta);
  }

  session.idleExpiresAtMs = currentTime + idleTtlMs;

  return successResult(handler(session) as unknown as T, meta);
}

function successResult<T>(data: T, meta: ApiMeta): ApiResult<T> {
  return { ok: true, data, meta };
}

function errorResult<T>(code: ApiErrorCode, message: string, meta: ApiMeta): ApiResult<T> {
  return {
    ok: false,
    error: { code, message },
    meta,
  };
}

function createMeta(request: Pick<ApiRequest, 'requestId' | 'operation'>, startedAt: Date, finishedAt: Date): ApiMeta {
  return {
    requestId: request.requestId,
    operation: request.operation,
    serverTime: finishedAt.toISOString(),
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    stages: {},
    io: {},
  };
}

function createLocalAdminActor(): ActorContextDTO {
  return {
    userId: 'user-admin',
    loginId: 'admin',
    displayName: 'Admin Local',
    tenantId: 'tenant-local',
    authVersion: 1,
    actions: [
      'platform.auth.logout',
      'platform.session.view',
      'platform.command.view',
      'platform.registry.view',
    ],
    scope: {
      tenantId: 'tenant-local',
      branchIds: ['branch-local'],
      warehouseIds: ['warehouse-local'],
    },
  };
}

function createLocalPlatformTableDefinitions(): readonly TableDefinitionDTO[] {
  return [
    table('CommandTransaction', 'transaction', 'ledger', 'transaction-period', [
      'id',
      'commandId',
      'idempotencyKey',
      'status',
      'createdAt',
      'updatedAt',
      'resultJson',
    ]),
    table('AuditOutbox', 'transaction', 'audit', 'transaction-period', [
      'id',
      'eventId',
      'commandId',
      'actorId',
      'action',
      'status',
      'createdAt',
    ]),
    table('Session', 'runtime', 'runtime', 'none', [
      'id',
      'tokenFingerprint',
      'userId',
      'authVersion',
      'issuedAt',
      'idleExpiresAt',
      'absoluteExpiresAt',
      'revokedAt',
    ]),
  ];
}

function table(
  tableName: string,
  storageRole: TableDefinitionDTO['storageRole'],
  lifecycle: TableDefinitionDTO['lifecycle'],
  partitionPolicy: TableDefinitionDTO['partitionPolicy'],
  headers: readonly string[],
): TableDefinitionDTO {
  return {
    tableName,
    owner: 'platform',
    storageRole,
    sheetName: tableName,
    lifecycle,
    schemaVersion: 1,
    primaryKey: 'id',
    headers: headers.map((name) => ({
      name,
      type: name.endsWith('Json') ? 'json' : name.endsWith('At') ? 'timestamp' : 'string',
      required: name !== 'revokedAt' && name !== 'resultJson',
    })),
    partitionPolicy,
    lookupKeys: [{ name: `${tableName}.primary`, columns: ['id'], unique: true }],
  };
}
