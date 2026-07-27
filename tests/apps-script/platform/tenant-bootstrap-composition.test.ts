import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

describe('tenant bootstrap platform composition', () => {
  it('cung cấp bootstrap status và current scope qua invoke pipeline', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-27T00:00:00.000Z'),
    });

    const status = composition.invoke({
      operation: 'platform.bootstrap.getStatus',
      requestId: 'req-bootstrap-status',
      payload: {},
    });

    expect(status).toMatchObject({ ok: true, data: { installed: true } });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const scope = composition.invoke({
      operation: 'platform.scope.getCurrent',
      requestId: 'req-scope',
      sessionToken: login.data.sessionToken,
      payload: {},
    });

    expect(scope).toMatchObject({
      ok: true,
      data: {
        tenant: { tenantId: 'tenant-default' },
        activeBranchId: 'branch-default',
        activeWarehouseId: 'warehouse-default',
      },
    });
  });

  it('đổi mật khẩu admin qua invoke pipeline và session cũ hết hiệu lực', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-27T00:00:00.000Z'),
    });
    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const changed = composition.invoke({
      operation: 'platform.auth.changeOwnPassword',
      requestId: 'req-change-password',
      sessionToken: login.data.sessionToken,
      payload: { currentPassword: 'admin123', newPassword: 'new-admin-123' },
    });

    expect(changed).toEqual(
      expect.objectContaining({
        ok: true,
        data: { changed: true, sessionRevoked: true },
      }),
    );

    const oldSession = composition.invoke({
      operation: 'platform.session.me',
      requestId: 'req-old-session',
      sessionToken: login.data.sessionToken,
      payload: {},
    });
    expect(oldSession).toMatchObject({ ok: false, error: { code: 'SESSION_EXPIRED' } });

    const relogin = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-relogin',
      payload: { loginId: 'admin', password: 'new-admin-123' },
    });
    expect(relogin).toMatchObject({ ok: true });
  });
});
