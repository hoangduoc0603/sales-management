import { describe, expect, it } from 'vitest';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createInventoryService } from '../../../apps-script/src/services/inventory/inventory-service';

describe('InventoryService return quarantine/restock', () => {
  it('receives sale return into quarantine only', () => {
    const { repository, service } = createService();
    service.receive(receiveInput({ quantityMilli: 10_000, unitCostVnd: 100_000 }));

    const result = service.receiveReturnToQuarantine({
      commandId: 'cmd-return-1',
      idempotencyKey: 'idem-return-1',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 2_000,
      unitCostVnd: 100_000,
      sourceDocument: { sourceType: 'SaleReturn', sourceId: 'return-1' },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        movement: {
          movementType: 'SaleReturnReceive',
          quantityMilli: 2_000,
          totalCostVnd: 200_000,
        },
      },
    });
    expect(repository.getBalance('warehouse-1', 'variant-1')).toMatchObject({
      onHandMilli: 12_000,
      availableMilli: 10_000,
      quarantineMilli: 2_000,
      inventoryValueVnd: 1_200_000,
    });
  });

  it('restock moves return quantity from quarantine to available and keeps weighted value', () => {
    const { repository, service } = createService();
    service.receive(receiveInput({ quantityMilli: 10_000, unitCostVnd: 100_000 }));
    service.receiveReturnToQuarantine({
      commandId: 'cmd-return-1',
      idempotencyKey: 'idem-return-1',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 5_000,
      unitCostVnd: 120_000,
      sourceDocument: { sourceType: 'SaleReturn', sourceId: 'return-1' },
    });

    const result = service.restockReturn({
      commandId: 'cmd-restock-1',
      idempotencyKey: 'idem-restock-1',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 5_000,
      unitCostVnd: 120_000,
      sourceDocument: { sourceType: 'SaleReturn', sourceId: 'return-1' },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        movement: {
          movementType: 'SaleReturnRestock',
          quantityMilli: 5_000,
        },
      },
    });
    expect(repository.getBalance('warehouse-1', 'variant-1')).toMatchObject({
      onHandMilli: 15_000,
      availableMilli: 15_000,
      quarantineMilli: 0,
      inventoryValueVnd: 1_600_000,
    });
    expect(service.getAverageUnitCostVnd('warehouse-1', 'variant-1')).toBe(106_667);
  });

  it('scrap return removes quantity from quarantine and on-hand without increasing available', () => {
    const { repository, service } = createService();
    service.receive(receiveInput({ quantityMilli: 10_000, unitCostVnd: 100_000 }));
    service.receiveReturnToQuarantine({
      commandId: 'cmd-return-scrap-source',
      idempotencyKey: 'idem-return-scrap-source',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 2_000,
      unitCostVnd: 120_000,
      sourceDocument: { sourceType: 'SaleReturn', sourceId: 'return-scrap' },
    });

    const result = service.scrapReturn({
      commandId: 'cmd-return-scrap',
      idempotencyKey: 'idem-return-scrap',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 2_000,
      unitCostVnd: 120_000,
      sourceDocument: { sourceType: 'SaleReturn', sourceId: 'return-scrap' },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        movement: {
          movementType: 'Scrap',
          quantityMilli: -2_000,
          totalCostVnd: -240_000,
        },
      },
    });
    expect(repository.getBalance('warehouse-1', 'variant-1')).toMatchObject({
      onHandMilli: 10_000,
      availableMilli: 10_000,
      quarantineMilli: 0,
      inventoryValueVnd: 1_000_000,
    });
  });
});

function createService() {
  const repository = createInMemoryInventoryRepository();
  const service = createInventoryService({
    repository,
    tenantId: 'tenant-default',
    now: () => new Date('2026-07-27T04:00:00.000Z'),
    newId: createSequentialId(),
  });
  return { repository, service };
}

function receiveInput(overrides: Partial<Parameters<ReturnType<typeof createService>['service']['receive']>[0]> = {}) {
  return {
    commandId: 'cmd-r1',
    idempotencyKey: 'idem-r1',
    warehouseId: 'warehouse-1',
    variantId: 'variant-1',
    quantityMilli: 1_000,
    unitCostVnd: 100_000,
    sourceDocument: { sourceType: 'OpeningBalance' as const, sourceId: 'opening-1' },
    ...overrides,
  };
}

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
