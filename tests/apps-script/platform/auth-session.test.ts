import { describe, expect, it } from 'vitest';
import { createSessionServiceForTest } from '../../../apps-script/src/services/platform/auth/session-service';

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
});
