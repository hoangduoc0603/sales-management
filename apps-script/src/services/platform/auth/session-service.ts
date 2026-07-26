import type { ApiErrorCode } from '@shared/contracts/errors';
import type { AuthLoginRequest, AuthLoginResponse, SessionMeResponse } from '@shared/contracts/platform/auth';
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
    passwordChangeRequired: false,
    passwordVerifier: 'test-verifier:admin123',
    failedLoginCount: 0,
    actions: [
      'platform.auth.logout',
      'platform.session.view',
      'platform.command.view',
      'platform.registry.view',
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

function isLocked(user: UserAccountRecord, now: Date): boolean {
  return user.lockedUntil !== undefined && new Date(user.lockedUntil).getTime() > now.getTime();
}

function fingerprintToken(token: string): string {
  return `fp:${token}`;
}
