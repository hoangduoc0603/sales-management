import type { ApiErrorCode } from '@shared/contracts/errors';
import type {
  AuthChangeOwnPasswordRequest,
  AuthChangeOwnPasswordResponse,
  AuthLoginRequest,
  AuthLoginResponse,
  SessionMeResponse,
} from '@shared/contracts/platform/auth';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { Clock } from '../../../api/api-context';
import {
  createInMemoryAuthRepository,
  toActorContext,
  type AuthRepository,
  type UserAccountRecord,
} from '../../../repositories/platform/auth-repository';
import {
  createDeterministicPasswordServiceForTest,
  type PasswordService,
} from './password-service';

type ServiceResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: ApiErrorCode;
        message: string;
      };
    };

export interface IdGenerator {
  newId(prefix: string): string;
}

export interface SessionService {
  login(input: AuthLoginRequest): ServiceResult<AuthLoginResponse>;
  validateSession(sessionToken: string): ServiceResult<SessionMeResponse>;
  logout(sessionToken: string): ServiceResult<{ revoked: boolean }>;
  changeOwnPassword(
    sessionToken: string,
    input: AuthChangeOwnPasswordRequest,
  ): ServiceResult<AuthChangeOwnPasswordResponse>;
  resetPassword(input: {
    userId: string;
    temporaryPassword: string;
  }): ServiceResult<{ userId: string; authVersion: number; passwordChangeRequired: boolean }>;
  disableUser(input: {
    userId: string;
  }): ServiceResult<{ userId: string; authVersion: number; disabled: boolean }>;
  applyAccessChange(input: {
    userId: string;
    actions?: readonly string[];
    branchIds?: readonly string[];
    warehouseIds?: readonly string[];
  }): ServiceResult<{ userId: string; authVersion: number; actions: readonly string[]; branchIds: readonly string[]; warehouseIds: readonly string[] }>;
  bumpAuthVersion(userId: string): void;
}

interface SessionServiceDependencies {
  clock: Clock;
  idGenerator: IdGenerator;
  repository: AuthRepository;
  passwordService: PasswordService;
}

const idleTtlMs = 60 * 60 * 1000;
const absoluteTtlMs = 8 * 60 * 60 * 1000;
const lockoutMs = 15 * 60 * 1000;
const maxFailedAttempts = 5;

export function createSessionService(deps: SessionServiceDependencies): SessionService {
  return {
    login(input) {
      const now = deps.clock.now();
      const user = deps.repository.findUserByLoginId(input.loginId);

      if (user === undefined || user.disabled) {
        return invalidCredentials();
      }

      if (isLocked(user, now)) {
        return {
          ok: false,
          error: { code: 'AUTH_LOCKED', message: 'Tài khoản đang bị khóa tạm thời.' },
        };
      }

      const passwordOk = deps.passwordService.verifyPassword({
        password: input.password,
        verifier: user.passwordVerifier,
      });

      if (!passwordOk) {
        const updatedUser = {
          ...user,
          failedLoginCount: user.failedLoginCount + 1,
          lockedUntil:
            user.failedLoginCount + 1 >= maxFailedAttempts
              ? new Date(now.getTime() + lockoutMs).toISOString()
              : user.lockedUntil,
        };
        deps.repository.saveUser(updatedUser);

        return invalidCredentials();
      }

      const resetUser = { ...user, failedLoginCount: 0, lockedUntil: undefined };
      deps.repository.saveUser(resetUser);

      const sessionToken = deps.idGenerator.newId('session');
      const idleExpiresAt = new Date(now.getTime() + idleTtlMs).toISOString();
      const absoluteExpiresAt = new Date(now.getTime() + absoluteTtlMs).toISOString();
      deps.repository.saveSession({
        sessionId: deps.idGenerator.newId('sesrec'),
        tokenFingerprint: fingerprintToken(sessionToken),
        userId: user.userId,
        authVersion: user.authVersion,
        issuedAt: now.toISOString(),
        idleExpiresAt,
        absoluteExpiresAt,
      });

      return {
        ok: true,
        data: {
          sessionToken,
          actor: toActorContext(resetUser),
          idleExpiresAt,
          absoluteExpiresAt,
          passwordChangeRequired: user.passwordChangeRequired,
        },
      };
    },
    validateSession(sessionToken) {
      const now = deps.clock.now();
      const session = deps.repository.findSessionByFingerprint(fingerprintToken(sessionToken));

      if (session === undefined || session.revokedAt !== undefined) {
        return sessionExpired();
      }

      const user = deps.repository.findUserById(session.userId);

      if (
        user === undefined ||
        user.disabled ||
        user.authVersion !== session.authVersion ||
        new Date(session.idleExpiresAt).getTime() <= now.getTime() ||
        new Date(session.absoluteExpiresAt).getTime() <= now.getTime()
      ) {
        return sessionExpired();
      }

      const updatedSession = {
        ...session,
        idleExpiresAt: new Date(now.getTime() + idleTtlMs).toISOString(),
      };
      deps.repository.saveUpdatedSession(updatedSession);

      return {
        ok: true,
        data: {
          actor: toActorContext(user),
          idleExpiresAt: updatedSession.idleExpiresAt,
          absoluteExpiresAt: session.absoluteExpiresAt,
        },
      };
    },
    logout(sessionToken) {
      const session = deps.repository.findSessionByFingerprint(fingerprintToken(sessionToken));

      if (session === undefined || session.revokedAt !== undefined) {
        return { ok: true, data: { revoked: false } };
      }

      deps.repository.saveUpdatedSession({
        ...session,
        revokedAt: deps.clock.now().toISOString(),
      });

      return { ok: true, data: { revoked: true } };
    },
    changeOwnPassword(sessionToken, input) {
      const sessionResult = this.validateSession(sessionToken);

      if (!sessionResult.ok) {
        return sessionResult;
      }

      const user = deps.repository.findUserById(sessionResult.data.actor.userId);

      if (user === undefined || user.disabled) {
        return sessionExpired();
      }

      const currentPasswordOk = deps.passwordService.verifyPassword({
        password: input.currentPassword,
        verifier: user.passwordVerifier,
      });

      if (!currentPasswordOk) {
        return invalidCredentials();
      }

      deps.repository.saveUser({
        ...user,
        authVersion: user.authVersion + 1,
        passwordVerifier: deps.passwordService.createVerifier(input.newPassword),
        passwordChangeRequired: false,
        failedLoginCount: 0,
        lockedUntil: undefined,
      });

      return { ok: true, data: { changed: true, sessionRevoked: true } };
    },
    resetPassword(input) {
      const user = deps.repository.findUserById(input.userId);

      if (user === undefined) {
        return failure('INVALID_INPUT', 'Không tìm thấy user.');
      }

      const updatedUser = {
        ...user,
        authVersion: user.authVersion + 1,
        passwordVerifier: deps.passwordService.createVerifier(input.temporaryPassword),
        passwordChangeRequired: true,
        failedLoginCount: 0,
        lockedUntil: undefined,
      };
      deps.repository.saveUser(updatedUser);

      return {
        ok: true,
        data: {
          userId: updatedUser.userId,
          authVersion: updatedUser.authVersion,
          passwordChangeRequired: updatedUser.passwordChangeRequired,
        },
      };
    },
    disableUser(input) {
      const user = deps.repository.findUserById(input.userId);

      if (user === undefined) {
        return failure('INVALID_INPUT', 'Không tìm thấy user.');
      }

      const updatedUser = {
        ...user,
        authVersion: user.authVersion + 1,
        disabled: true,
      };
      deps.repository.saveUser(updatedUser);

      return {
        ok: true,
        data: {
          userId: updatedUser.userId,
          authVersion: updatedUser.authVersion,
          disabled: updatedUser.disabled,
        },
      };
    },
    applyAccessChange(input) {
      const user = deps.repository.findUserById(input.userId);

      if (user === undefined) {
        return failure('INVALID_INPUT', 'Không tìm thấy user.');
      }

      const updatedUser = {
        ...user,
        authVersion: user.authVersion + 1,
        actions: input.actions ?? user.actions,
        branchIds: input.branchIds ?? user.branchIds,
        warehouseIds: input.warehouseIds ?? user.warehouseIds,
      };
      deps.repository.saveUser(updatedUser);

      return {
        ok: true,
        data: {
          userId: updatedUser.userId,
          authVersion: updatedUser.authVersion,
          actions: updatedUser.actions,
          branchIds: updatedUser.branchIds,
          warehouseIds: updatedUser.warehouseIds,
        },
      };
    },
    bumpAuthVersion(userId) {
      const user = deps.repository.findUserById(userId);

      if (user !== undefined) {
        deps.repository.saveUser({ ...user, authVersion: user.authVersion + 1 });
      }
    },
  };
}

export function createSessionServiceForTest(input: { nowIso: string }) {
  let now = new Date(input.nowIso);
  let sequence = 0;
  const service = createSessionService({
    clock: { now: () => now },
    idGenerator: {
      newId(prefix) {
        sequence += 1;
        return `${prefix}-${sequence}`;
      },
    },
    repository: createInMemoryAuthRepository([createAdminUserFixture()]),
    passwordService: createDeterministicPasswordServiceForTest(),
  });

  return {
    ...service,
    setNow(nowIso: string) {
      now = new Date(nowIso);
    },
  };
}

export function createAdminUserFixture(): UserAccountRecord {
  return {
    userId: 'user-admin',
    loginId: 'admin',
    displayName: 'Admin',
    tenantId: 'tenant-default',
    authVersion: 1,
    disabled: false,
    passwordChangeRequired: true,
    passwordVerifier: 'test-verifier:admin123',
    failedLoginCount: 0,
    actions: [
      'platform.auth.logout',
      'platform.auth.changeOwnPassword',
      'platform.session.view',
      'platform.command.view',
      'platform.registry.view',
      'platform.scope.view',
      'platform.warehouse.update',
      'sales.draft.manage',
      'sales.pos.complete',
      'sales.order.view',
      'sales.online.manage',
      'sales.return.process',
      'sales.warranty.manage',
      'reporting.dashboard.view',
      'reporting.report.view',
      'reporting.export',
      'operations.import.manage',
      'operations.attachment.manage',
      'operations.attachment.view',
      'operations.audit.view',
      'operations.audit.deliver',
      'operations.backup.manage',
      'operations.restore.manage',
      'operations.health.view',
      'operations.partition.manage',
      'operations.runtime.cleanup',
    ],
    branchIds: ['branch-default'],
    warehouseIds: ['warehouse-default'],
  };
}

export function actorFromSessionResult(result: ServiceResult<SessionMeResponse>): ActorContextDTO | undefined {
  return result.ok ? result.data.actor : undefined;
}

function invalidCredentials(): ServiceResult<never> {
  return {
    ok: false,
    error: { code: 'INVALID_CREDENTIALS', message: 'Tài khoản hoặc mật khẩu không đúng.' },
  };
}

function sessionExpired(): ServiceResult<never> {
  return {
    ok: false,
    error: { code: 'SESSION_EXPIRED', message: 'Phiên đăng nhập đã hết hạn.' },
  };
}

function failure(code: ApiErrorCode, message: string): ServiceResult<never> {
  return {
    ok: false,
    error: { code, message },
  };
}

function isLocked(user: UserAccountRecord, now: Date): boolean {
  return user.lockedUntil !== undefined && new Date(user.lockedUntil).getTime() > now.getTime();
}

function fingerprintToken(token: string): string {
  return `fp:${token}`;
}
