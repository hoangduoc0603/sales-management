import { describe, expect, it } from 'vitest';
import type { InventoryMovementDTO } from '../../../shared/contracts/inventory/inventory';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';

describe('InventoryRepository', () => {
  it('stores movements append-only and returns cloned rows', () => {
    const repository = createInMemoryInventoryRepository();
    const movement = createMovement({ movementId: 'movement-1', quantityMilli: 1_000 });

    repository.appendMovement(movement);
    const firstRead = repository.listMovements()[0];
    if (firstRead === undefined) throw new Error('Expected movement.');

    firstRead.quantityMilli = 9_999;

    expect(repository.listMovements()).toHaveLength(1);
    expect(repository.listMovements()[0]?.quantityMilli).toBe(1_000);
    expect(() => repository.appendMovement({ ...movement, quantityMilli: 2_000 })).toThrow(
      /append-only/i,
    );
  });

  it('does not expose direct balance mutation outside movement projection seam', () => {
    const repository = createInMemoryInventoryRepository();

    expect('saveBalance' in repository).toBe(false);
    repository.applyProjection({
      balanceId: 'balance-warehouse-1-variant-1',
      tenantId: 'tenant-default',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      onHandMilli: 1_000,
      availableMilli: 1_000,
      reservedMilli: 0,
      inTransitMilli: 0,
      quarantineMilli: 0,
      inventoryValueVnd: 100_000,
      asOfMovementId: 'movement-1',
    });

    const balance = repository.getBalance('warehouse-1', 'variant-1');
    if (balance === undefined) throw new Error('Expected balance.');

    balance.availableMilli = 0;

    expect(repository.getBalance('warehouse-1', 'variant-1')?.availableMilli).toBe(1_000);
  });
});

function createMovement(overrides: Partial<InventoryMovementDTO> = {}): InventoryMovementDTO {
  return {
    movementId: 'movement-default',
    tenantId: 'tenant-default',
    movementType: 'OpeningBalance',
    warehouseId: 'warehouse-1',
    variantId: 'variant-1',
    quantityMilli: 1_000,
    unitCostVnd: 100_000,
    totalCostVnd: 100_000,
    sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
    effectiveAt: '2026-07-27T00:00:00.000Z',
    actorId: 'user-admin',
    idempotencyKey: 'idem-1',
    ...overrides,
  };
}
