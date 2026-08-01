import { describe, expect, it } from 'vitest';
import {
  createAdminUserFixture,
  createSessionService,
  createSessionServiceForTest,
} from '../../../apps-script/src/services/platform/auth/session-service';
import type {
  AuthRepository,
  SessionRecord,
  UserAccountRecord,
} from '../../../apps-script/src/repositories/platform/auth-repository';
import { createDeterministicPasswordServiceForTest } from '../../../apps-script/src/services/platform/auth/password-service';

describe('SessionService', () => {
  it('khóa 15 phút sau 5 lần sai mật khẩu', () => {
    const service = createSessionServiceForTest({ nowIso: '2026-07-26T00:00:00.000Z' });

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect(service.login({ loginId: 'admin', password: 'wrong' }).ok).toBe(false);
    }

    const locked = service.login({ loginId: 'admin', password: 'admin123' });
    expect(locked).toMatchObject({ ok: false, error: { code: 'AUTH_LOCKED' } });
  });

  it('hết hạn idle sau 1 giờ và absolute sau 8 giờ', () => {
    const service = createSessionServiceForTest({ nowIso: '2026-07-26T00:00:00.000Z' });
    const login = service.login({ loginId: 'admin', password: 'admin123' });
    if (!login.ok) throw new Error('login failed');

    service.setNow('2026-07-26T01:00:01.000Z');
    expect(service.validateSession(login.data.sessionToken)).toMatchObject({
      ok: false,
      error: { code: 'SESSION_EXPIRED' },
    });
  });

  it('từ chối session khi authVersion của user thay đổi', () => {
    const service = createSessionServiceForTest({ nowIso: '2026-07-26T00:00:00.000Z' });
    const login = service.login({ loginId: 'admin', password: 'admin123' });
    if (!login.ok) throw new Error('login failed');

    service.bumpAuthVersion('user-admin');

    expect(service.validateSession(login.data.sessionToken)).toMatchObject({
      ok: false,
      error: { code: 'SESSION_EXPIRED' },
    });
  });

  it('giới hạn tần suất login trước khi đọc user để chống brute-force rẻ trên Apps Script', () => {
    const repository = new CountingAuthRepository([createAdminUserFixture()]);
    const service = createSessionService({
      clock: { now: () => new Date('2026-07-26T00:00:00.000Z') },
      idGenerator: { newId: (prefix) => `${prefix}-1` },
      repository,
      passwordService: createDeterministicPasswordServiceForTest(),
      loginRateLimiter: { canAttempt: () => false },
    });

    expect(service.login({ loginId: 'admin', password: 'admin123' })).toMatchObject({
      ok: false,
      error: { code: 'AUTH_RATE_LIMITED' },
    });
    expect(repository.findUserByLoginIdCalls).toBe(0);
  });

  it('không ghi session vào Sheet khi validate session còn xa idle expiry', () => {
    const repository = new CountingAuthRepository([createAdminUserFixture()]);
    const service = createSessionService({
      clock: { now: () => new Date('2026-07-26T00:00:00.000Z') },
      idGenerator: {
        newId: (prefix) => (prefix === 'session' ? 'session-token' : 'session-record-1'),
      },
      repository,
      passwordService: createDeterministicPasswordServiceForTest(),
    });

    const login = service.login({ loginId: 'admin', password: 'admin123' });
    if (!login.ok) throw new Error('login failed');

    repository.saveUpdatedSessionCalls = 0;
    expect(service.validateSession(login.data.sessionToken)).toMatchObject({ ok: true });
    expect(repository.saveUpdatedSessionCalls).toBe(0);
    expect(repository.findUserProfileByIdCalls).toBe(1);
    expect(repository.findUserByIdCalls).toBe(0);
  });
});

class CountingAuthRepository implements AuthRepository {
  findUserByLoginIdCalls = 0;
  findUserByIdCalls = 0;
  findUserProfileByIdCalls = 0;
  saveUpdatedSessionCalls = 0;
  private readonly usersById = new Map<string, UserAccountRecord>();
  private readonly sessionsByFingerprint = new Map<string, SessionRecord>();

  constructor(users: readonly UserAccountRecord[]) {
    for (const user of users) this.usersById.set(user.userId, { ...user });
  }

  findUserByLoginId(loginId: string): UserAccountRecord | undefined {
    this.findUserByLoginIdCalls += 1;
    return [...this.usersById.values()].find((user) => user.loginId === loginId);
  }

  findUserById(userId: string): UserAccountRecord | undefined {
    this.findUserByIdCalls += 1;
    return this.usersById.get(userId);
  }

  findUserProfileById(userId: string): UserAccountRecord | undefined {
    this.findUserProfileByIdCalls += 1;
    return this.usersById.get(userId);
  }

  saveUser(user: UserAccountRecord): void {
    this.usersById.set(user.userId, { ...user });
  }

  saveSession(session: SessionRecord): void {
    this.sessionsByFingerprint.set(session.tokenFingerprint, { ...session });
  }

  findSessionByFingerprint(tokenFingerprint: string): SessionRecord | undefined {
    return this.sessionsByFingerprint.get(tokenFingerprint);
  }

  saveUpdatedSession(session: SessionRecord): void {
    this.saveUpdatedSessionCalls += 1;
    this.sessionsByFingerprint.set(session.tokenFingerprint, { ...session });
  }
}
