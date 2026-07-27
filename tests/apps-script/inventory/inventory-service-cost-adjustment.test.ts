import { describe, expect, it } from 'vitest';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createInventoryService } from '../../../apps-script/src/services/inventory/inventory-service';

describe('InventoryService value adjustment', () => {
  it('adjusts inventory value without changing quantity', () => {
    const repository = createInMemoryInventoryRepository();
    const service = createInventoryService({
      repository,
      tenantId: 'tenant-default',
      now: () => new Date('2026-07-27T10:00:00.000Z'),
      newId: createSequentialId(),
    });
    service.receive({
      commandId: 'cmd-receive',
      idempotencyKey: 'idem-receive',
      warehouseId: 'warehouse-default',
      variantId: 'variant-milk-1l',
      quantityMilli: 5_000,
      unitCostVnd: 22_000,
      sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-1' },
    });

    const adjusted = service.adjustInventoryValue({
      commandId: 'cmd-value-adjust',
      idempotencyKey: 'idem-value-adjust',
      warehouseId: 'warehouse-default',
      variantId: 'variant-milk-1l',
      amountVnd: 30_000,
      sourceDocument: { sourceType: 'ManualAdjustment', sourceId: 'late-cost-1' },
      actorId: 'manager-1',
    });

    expect(adjusted).toMatchObject({
      ok: true,
      data: {
        movement: {
          movementType: 'ManualAdjustment',
          quantityMilli: 0,
          totalCostVnd: 30_000,
        },
        balance: {
          onHandMilli: 5_000,
          availableMilli: 5_000,
          inventoryValueVnd: 140_000,
        },
      },
    });
  });
});

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
