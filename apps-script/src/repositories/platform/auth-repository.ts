import type { ActorContextDTO } from '@shared/contracts/platform/authorization';

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
  saveUser(user: UserAccountRecord): void;
  saveSession(session: SessionRecord): void;
  findSessionByFingerprint(tokenFingerprint: string): SessionRecord | undefined;
  saveUpdatedSession(session: SessionRecord): void;
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
