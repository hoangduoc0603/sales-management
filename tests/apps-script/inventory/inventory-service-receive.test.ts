import { describe, expect, it } from 'vitest';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createInventoryService } from '../../../apps-script/src/services/inventory/inventory-service';

describe('InventoryService receive', () => {
  it('calculates moving weighted average by Warehouse + Variant', () => {
    const repository = createInMemoryInventoryRepository();
    const service = createInventoryService({
      repository,
      tenantId: 'tenant-default',
      now: () => new Date('2026-07-27T01:00:00.000Z'),
      newId: createSequentialId(),
    });

    const first = service.receive({
      commandId: 'cmd-1',
      idempotencyKey: 'idem-1',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 10_000,
      unitCostVnd: 100_000,
      sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
    });
    const second = service.receive({
      commandId: 'cmd-2',
      idempotencyKey: 'idem-2',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 10_000,
      unitCostVnd: 120_000,
      sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-1' },
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    const balance = repository.getBalance('warehouse-1', 'variant-1');

    expect(balance).toMatchObject({
      onHandMilli: 20_000,
      availableMilli: 20_000,
      reservedMilli: 0,
      quarantineMilli: 0,
      inventoryValueVnd: 2_200_000,
    });
    expect(service.getAverageUnitCostVnd('warehouse-1', 'variant-1')).toBe(110_000);
    expect(repository.listMovements().map((movement) => movement.totalCostVnd)).toEqual([
      1_000_000,
      1_200_000,
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
