import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

describe('finance composition', () => {
  it('exposes finance shift and summary through invoke pipeline', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-27T09:00:00.000Z'),
    });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const shift = composition.invoke({
      operation: 'finance.shift.open',
      requestId: 'req-shift-open',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-shift-open',
        idempotencyKey: 'idem-shift-open',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashDrawerId: 'drawer-main',
        cashierId: 'user-admin',
        openingCashVnd: 500_000,
      },
    });
    expect(shift).toMatchObject({ ok: true, data: { shift: { status: 'Open' } } });

    const summary = composition.invoke({
      operation: 'finance.summary.get',
      requestId: 'req-finance-summary',
      sessionToken: login.data.sessionToken,
      payload: {},
    });
    expect(summary).toMatchObject({
      ok: true,
      data: {
        openShiftCount: 1,
        cashInVnd: 500_000,
      },
    });
  });
});
