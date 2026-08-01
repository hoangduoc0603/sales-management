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

  it('exposes transfer and stocktake state transitions through the invoke pipeline', () => {
    const composition = createApiComposition({
      now: createClock([
        '2026-07-27T05:00:00.000Z',
        '2026-07-27T05:01:00.000Z',
        '2026-07-27T05:02:00.000Z',
        '2026-07-27T05:03:00.000Z',
        '2026-07-27T05:04:00.000Z',
        '2026-07-27T05:05:00.000Z',
        '2026-07-27T05:06:00.000Z',
      ]),
    });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const sessionToken = login.data.sessionToken;
    expect(
      composition.invoke({
        operation: 'inventory.receive',
        requestId: 'req-opening',
        sessionToken,
        payload: {
          commandId: 'cmd-opening-1',
          idempotencyKey: 'idem-opening-1',
          warehouseId: 'warehouse-default',
          variantId: 'variant-milk-1l',
          quantityMilli: 10_000,
          unitCostVnd: 100_000,
          sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
        },
      }).ok,
    ).toBe(true);

    const created = composition.invoke({
      operation: 'inventory.transfer.create',
      requestId: 'req-transfer-create',
      sessionToken,
      payload: {
        commandId: 'cmd-transfer-create-1',
        idempotencyKey: 'idem-transfer-create-1',
        sourceWarehouseId: 'warehouse-default',
        destinationWarehouseId: 'warehouse-secondary',
        lines: [{ transferLineId: 'transfer-line-1', variantId: 'variant-milk-1l', quantityMilli: 4_000 }],
      },
    });
    expect(created).toMatchObject({ ok: true, data: { transfer: { status: 'PendingApproval' } } });
    const transferId = created.ok ? created.data.transfer.transferId : '';

    expect(
      composition.invoke({
        operation: 'inventory.transfer.approve',
        requestId: 'req-transfer-approve',
        sessionToken,
        payload: { commandId: 'cmd-transfer-approve-1', idempotencyKey: 'idem-transfer-approve-1', transferId },
      }),
    ).toMatchObject({ ok: true, data: { transfer: { status: 'Approved' } } });
    expect(
      composition.invoke({
        operation: 'inventory.transfer.ship',
        requestId: 'req-transfer-ship',
        sessionToken,
        payload: { commandId: 'cmd-transfer-ship-1', idempotencyKey: 'idem-transfer-ship-1', transferId },
      }),
    ).toMatchObject({ ok: true, data: { transfer: { status: 'Shipped' } } });
    expect(
      composition.invoke({
        operation: 'inventory.transfer.receive',
        requestId: 'req-transfer-receive',
        sessionToken,
        payload: {
          commandId: 'cmd-transfer-receive-1',
          idempotencyKey: 'idem-transfer-receive-1',
          transferId,
          receivedLines: [{ transferLineId: 'transfer-line-1', receivedQuantityMilli: 4_000 }],
        },
      }),
    ).toMatchObject({ ok: true, data: { transfer: { status: 'Received' } } });

    const opened = composition.invoke({
      operation: 'inventory.stocktake.open',
      requestId: 'req-stocktake-open',
      sessionToken,
      payload: {
        commandId: 'cmd-stocktake-open-1',
        idempotencyKey: 'idem-stocktake-open-1',
        warehouseId: 'warehouse-default',
        scopeVariantIds: ['variant-milk-1l'],
      },
    });
    expect(opened).toMatchObject({ ok: true, data: { session: { status: 'InProgress' } } });
    const stocktakeSessionId = opened.ok ? opened.data.session.stocktakeSessionId : '';
    const stocktakeLineId = opened.ok ? opened.data.lines[0]?.stocktakeLineId : '';

    expect(
      composition.invoke({
        operation: 'inventory.stocktake.submit',
        requestId: 'req-stocktake-submit',
        sessionToken,
        payload: {
          commandId: 'cmd-stocktake-submit-1',
          idempotencyKey: 'idem-stocktake-submit-1',
          stocktakeSessionId,
          lines: [{ stocktakeLineId, countedQuantityMilli: 6_000, reasonCode: 'count-diff' }],
        },
      }),
    ).toMatchObject({ ok: true, data: { session: { status: 'Submitted' } } });
    expect(
      composition.invoke({
        operation: 'inventory.stocktake.approve',
        requestId: 'req-stocktake-approve',
        sessionToken,
        payload: {
          commandId: 'cmd-stocktake-approve-1',
          idempotencyKey: 'idem-stocktake-approve-1',
          stocktakeSessionId,
        },
      }),
    ).toMatchObject({ ok: true, data: { session: { status: 'Approved' } } });
  });
});

function createClock(timestamps: readonly string[]) {
  let index = 0;
  return () => {
    const timestamp = timestamps[Math.min(index, timestamps.length - 1)];
    index += 1;
    return new Date(timestamp);
  };
}
