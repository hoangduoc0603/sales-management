import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';
import { withPerformanceTracker } from '../../../apps-script/src/api/performance-tracker';

const composition = createApiComposition({
  now: () => new Date('2026-07-26T00:00:00.000Z'),
});

describe('platform API pipeline', () => {
  it('cho phép gọi login public không cần session', () => {
    const result = withPerformanceTracker(() =>
      composition.invoke({
        operation: 'platform.auth.login',
        requestId: 'req-login',
        payload: { loginId: 'admin', password: 'admin123' },
      }),
    );

    expect(result).toMatchObject({
      ok: true,
      data: {
        currentScope: {
          activeBranchId: 'branch-default',
          activeWarehouseId: 'warehouse-default',
        },
      },
    });
    expect(result.meta.stages).toHaveProperty('login.rateLimitMs');
    expect(result.meta.stages).toHaveProperty('login.findUserMs');
    expect(result.meta.stages).toHaveProperty('login.verifyMs');
    expect(result.meta.stages).toHaveProperty('login.saveSessionMs');
    expect(result.meta.stages).toHaveProperty('login.buildResponseMs');
    expect(JSON.stringify(result)).not.toContain('admin123');
  });

  it('trả actor và current scope trong một call bootstrap session', () => {
    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-bootstrap',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const result = composition.invoke({
      operation: 'platform.session.bootstrap',
      requestId: 'req-session-bootstrap',
      sessionToken: String(login.data.sessionToken),
      payload: {},
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        actor: { userId: 'user-admin' },
        currentScope: {
          activeBranchId: 'branch-default',
          activeWarehouseId: 'warehouse-default',
        },
      },
    });
  });

  it('chặn protected operation khi thiếu session', () => {
    const result = composition.invoke({
      operation: 'platform.session.me',
      requestId: 'req-me',
      payload: {},
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'SESSION_REQUIRED' },
      meta: { requestId: 'req-me', operation: 'platform.session.me' },
    });
  });
});
