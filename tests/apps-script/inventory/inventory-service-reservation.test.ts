import { describe, expect, it } from 'vitest';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createInventoryService } from '../../../apps-script/src/services/inventory/inventory-service';

describe('InventoryService reservation', () => {
  it('reserve reduces available and increases reserved without changing on-hand/value', () => {
    const { repository, service } = createService();
    service.receive(receiveInput({ quantityMilli: 10_000, unitCostVnd: 100_000 }));

    const result = service.reserve({
      commandId: 'cmd-reserve-1',
      idempotencyKey: 'idem-reserve-1',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 3_000,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-online-1' },
    });

    expect(result.ok).toBe(true);
    expect(repository.getBalance('warehouse-1', 'variant-1')).toMatchObject({
      onHandMilli: 10_000,
      availableMilli: 7_000,
      reservedMilli: 3_000,
      inventoryValueVnd: 1_000_000,
    });
  });

  it('release reverses a reservation without changing on-hand/value', () => {
    const { repository, service } = createService();
    service.receive(receiveInput({ quantityMilli: 10_000, unitCostVnd: 100_000 }));
    service.reserve({
      commandId: 'cmd-reserve-1',
      idempotencyKey: 'idem-reserve-1',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 3_000,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-online-1' },
    });

    const result = service.release({
      commandId: 'cmd-release-1',
      idempotencyKey: 'idem-release-1',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 2_000,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-online-1' },
    });

    expect(result.ok).toBe(true);
    expect(repository.getBalance('warehouse-1', 'variant-1')).toMatchObject({
      onHandMilli: 10_000,
      availableMilli: 9_000,
      reservedMilli: 1_000,
      inventoryValueVnd: 1_000_000,
    });
  });
});

function createService() {
  const repository = createInMemoryInventoryRepository();
  const service = createInventoryService({
    repository,
    tenantId: 'tenant-default',
    now: () => new Date('2026-07-27T03:00:00.000Z'),
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
