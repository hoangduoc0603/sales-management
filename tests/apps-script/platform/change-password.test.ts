import { describe, expect, it } from 'vitest';
import { createSessionServiceForTest } from '../../../apps-script/src/services/platform/auth/session-service';

describe('SessionService.changeOwnPassword', () => {
  it('đổi mật khẩu lần đầu, tắt cờ bắt buộc đổi mật khẩu và revoke session cũ bằng authVersion', () => {
    const service = createSessionServiceForTest({ nowIso: '2026-07-27T00:00:00.000Z' });
    const login = service.login({ loginId: 'admin', password: 'admin123' });
    if (!login.ok) throw new Error('login failed');

    const changed = service.changeOwnPassword(login.data.sessionToken, {
      currentPassword: 'admin123',
      newPassword: 'new-admin-123',
    });

    expect(changed).toEqual({ ok: true, data: { changed: true, sessionRevoked: true } });
    expect(service.validateSession(login.data.sessionToken)).toMatchObject({
      ok: false,
      error: { code: 'SESSION_EXPIRED' },
    });

    const loginWithNewPassword = service.login({ loginId: 'admin', password: 'new-admin-123' });
    expect(loginWithNewPassword).toMatchObject({ ok: true });
    if (!loginWithNewPassword.ok) throw new Error('login with new password failed');
    expect(loginWithNewPassword.data.passwordChangeRequired).toBe(false);
  });

  it('từ chối đổi mật khẩu khi mật khẩu hiện tại không đúng', () => {
    const service = createSessionServiceForTest({ nowIso: '2026-07-27T00:00:00.000Z' });
    const login = service.login({ loginId: 'admin', password: 'admin123' });
    if (!login.ok) throw new Error('login failed');

    const changed = service.changeOwnPassword(login.data.sessionToken, {
      currentPassword: 'wrong',
      newPassword: 'new-admin-123',
    });

    expect(changed).toMatchObject({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS' },
    });
    expect(service.validateSession(login.data.sessionToken)).toMatchObject({ ok: true });
  });
});
