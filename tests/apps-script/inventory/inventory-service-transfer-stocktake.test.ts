import { describe, expect, it } from 'vitest';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createInventoryService } from '../../../apps-script/src/services/inventory/inventory-service';

describe('InventoryService transfer and stocktake baseline', () => {
  it('ships transfer from source and receives partially into destination', () => {
    const repository = createInMemoryInventoryRepository();
    const service = createInventoryService({
      repository,
      tenantId: 'tenant-default',
      now: createClock([
        '2026-07-27T01:00:00.000Z',
        '2026-07-27T01:01:00.000Z',
        '2026-07-27T01:02:00.000Z',
        '2026-07-27T01:03:00.000Z',
        '2026-07-27T01:04:00.000Z',
      ]),
      newId: createSequentialId(),
    });

    const opening = service.receive({
      commandId: 'cmd-opening-1',
      idempotencyKey: 'idem-opening-1',
      warehouseId: 'warehouse-source',
      variantId: 'variant-1',
      quantityMilli: 10_000,
      unitCostVnd: 100_000,
      sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
      actorId: 'user-admin',
    });
    expect(opening.ok).toBe(true);

    const created = service.createTransfer({
      commandId: 'cmd-transfer-create-1',
      idempotencyKey: 'idem-transfer-create-1',
      sourceWarehouseId: 'warehouse-source',
      destinationWarehouseId: 'warehouse-destination',
      reasonCode: 'replenishment',
      lines: [{ transferLineId: 'line-1', variantId: 'variant-1', quantityMilli: 10_000 }],
      actorId: 'user-admin',
    });
    expect(created.ok).toBe(true);

    const approved = service.approveTransfer({
      commandId: 'cmd-transfer-approve-1',
      idempotencyKey: 'idem-transfer-approve-1',
      transferId: 'transfer-2',
      actorId: 'manager-1',
    });
    expect(approved.ok).toBe(true);

    const shipped = service.shipTransfer({
      commandId: 'cmd-transfer-ship-1',
      idempotencyKey: 'idem-transfer-ship-1',
      transferId: 'transfer-2',
      actorId: 'warehouse-1',
    });
    expect(shipped.ok).toBe(true);

    const received = service.receiveTransfer({
      commandId: 'cmd-transfer-receive-1',
      idempotencyKey: 'idem-transfer-receive-1',
      transferId: 'transfer-2',
      receivedLines: [{ transferLineId: 'line-1', receivedQuantityMilli: 6_000, varianceReasonCode: 'short' }],
      actorId: 'warehouse-destination-user',
    });

    expect(received.ok).toBe(true);
    expect(received.ok ? received.data.transfer.status : undefined).toBe('PartiallyReceived');
    expect(repository.getBalance('warehouse-source', 'variant-1')).toMatchObject({
      onHandMilli: 0,
      availableMilli: 0,
      inTransitMilli: 4_000,
      inventoryValueVnd: 0,
    });
    expect(repository.getBalance('warehouse-destination', 'variant-1')).toMatchObject({
      onHandMilli: 6_000,
      availableMilli: 6_000,
      inTransitMilli: 0,
      inventoryValueVnd: 600_000,
    });
    expect(repository.listMovements().map((movement) => movement.movementType)).toEqual([
      'OpeningBalance',
      'TransferShip',
      'TransferReceive',
    ]);
  });

  it('approves stocktake variance from snapshot and reports movements after snapshot', () => {
    const repository = createInMemoryInventoryRepository();
    const service = createInventoryService({
      repository,
      tenantId: 'tenant-default',
      now: createClock([
        '2026-07-27T01:00:00.000Z',
        '2026-07-27T01:01:00.000Z',
        '2026-07-27T01:02:00.000Z',
        '2026-07-27T01:03:00.000Z',
        '2026-07-27T01:04:00.000Z',
      ]),
      newId: createSequentialId(),
    });

    expect(
      service.receive({
        commandId: 'cmd-opening-1',
        idempotencyKey: 'idem-opening-1',
        warehouseId: 'warehouse-default',
        variantId: 'variant-1',
        quantityMilli: 10_000,
        unitCostVnd: 100_000,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
        actorId: 'user-admin',
      }).ok,
    ).toBe(true);

    const opened = service.openStocktake({
      commandId: 'cmd-stocktake-open-1',
      idempotencyKey: 'idem-stocktake-open-1',
      warehouseId: 'warehouse-default',
      scopeVariantIds: ['variant-1'],
      actorId: 'counter-1',
    });
    expect(opened.ok).toBe(true);

    expect(
      service.issueForSale({
        commandId: 'cmd-sale-1',
        idempotencyKey: 'idem-sale-1',
        warehouseId: 'warehouse-default',
        variantId: 'variant-1',
        quantityMilli: 2_000,
        sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
        actorId: 'cashier-1',
      }).ok,
    ).toBe(true);

    const submitted = service.submitStocktake({
      commandId: 'cmd-stocktake-submit-1',
      idempotencyKey: 'idem-stocktake-submit-1',
      stocktakeSessionId: 'stocktake-2',
      lines: [{ stocktakeLineId: 'stocktake-line-3', countedQuantityMilli: 9_000, reasonCode: 'count-diff' }],
      actorId: 'counter-1',
    });
    expect(submitted.ok).toBe(true);
    expect(submitted.ok ? submitted.data.lines[0]?.movementsAfterSnapshotCount : undefined).toBe(1);

    const approved = service.approveStocktake({
      commandId: 'cmd-stocktake-approve-1',
      idempotencyKey: 'idem-stocktake-approve-1',
      stocktakeSessionId: 'stocktake-2',
      actorId: 'manager-1',
    });

    expect(approved.ok).toBe(true);
    expect(repository.getBalance('warehouse-default', 'variant-1')).toMatchObject({
      onHandMilli: 7_000,
      availableMilli: 7_000,
      inventoryValueVnd: 700_000,
    });
    expect(repository.listMovements().map((movement) => movement.movementType)).toEqual([
      'OpeningBalance',
      'SaleIssue',
      'CountAdjustment',
    ]);
  });
});

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}

function createClock(timestamps: readonly string[]) {
  let index = 0;
  return () => {
    const timestamp = timestamps[Math.min(index, timestamps.length - 1)];
    index += 1;
    return new Date(timestamp);
  };
}
