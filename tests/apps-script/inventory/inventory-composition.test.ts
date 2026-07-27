import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

describe('inventory composition', () => {
  it('exposes inventory receive and balance summary through the invoke pipeline', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-27T05:00:00.000Z'),
    });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const received = composition.invoke({
      operation: 'inventory.receive',
      requestId: 'req-receive',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-receive-1',
        idempotencyKey: 'idem-receive-1',
        warehouseId: 'warehouse-default',
        variantId: 'variant-milk-1l',
        quantityMilli: 10_000,
        unitCostVnd: 100_000,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
      },
    });
    expect(received).toMatchObject({ ok: true, data: { balance: { availableMilli: 10_000 } } });

    const summary = composition.invoke({
      operation: 'inventory.balance.getSummary',
      requestId: 'req-summary',
      sessionToken: login.data.sessionToken,
      payload: { warehouseId: 'warehouse-default' },
    });
    expect(summary).toMatchObject({
      ok: true,
      data: {
        rows: [
          {
            warehouseId: 'warehouse-default',
            variantId: 'variant-milk-1l',
            onHandMilli: 10_000,
            availableMilli: 10_000,
          },
        ],
      },
    });
  });
});
