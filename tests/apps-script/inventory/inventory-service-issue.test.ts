import { describe, expect, it } from 'vitest';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createInventoryService } from '../../../apps-script/src/services/inventory/inventory-service';

describe('InventoryService issueForSale', () => {
  it('snapshots current average cost and reduces on-hand/available/value', () => {
    const { repository, service } = createService();
    service.receive(receiveInput({ quantityMilli: 10_000, unitCostVnd: 100_000 }));
    service.receive(receiveInput({ commandId: 'cmd-r2', idempotencyKey: 'idem-r2', quantityMilli: 10_000, unitCostVnd: 120_000 }));

    const result = service.issueForSale({
      commandId: 'cmd-i1',
      idempotencyKey: 'idem-i1',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 5_000,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1', sourceLineId: 'line-1' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected issue success.');
    expect(result.data.movement).toMatchObject({
      movementType: 'SaleIssue',
      quantityMilli: -5_000,
      unitCostVnd: 110_000,
      totalCostVnd: -550_000,
    });
    expect(repository.getBalance('warehouse-1', 'variant-1')).toMatchObject({
      onHandMilli: 15_000,
      availableMilli: 15_000,
      inventoryValueVnd: 1_650_000,
    });
  });

  it('blocks negative available by default', () => {
    const { service } = createService();
    service.receive(receiveInput({ quantityMilli: 1_000, unitCostVnd: 100_000 }));

    const result = service.issueForSale({
      commandId: 'cmd-i1',
      idempotencyKey: 'idem-i1',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 2_000,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INSUFFICIENT_STOCK' },
    });
  });

  it('requires temporary cost when approved negative stock has no valid cost', () => {
    const { service } = createService();

    const missingCost = service.issueForSale({
      commandId: 'cmd-i1',
      idempotencyKey: 'idem-i1',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 1_000,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
      negativeStockApproval: {
        approvedBy: 'manager-1',
        reasonCode: 'ALLOW_NEGATIVE',
        reasonNote: 'Khách lấy trước, nhập bù trong ngày.',
      },
    });

    expect(missingCost).toMatchObject({
      ok: false,
      error: { code: 'TEMPORARY_COST_REQUIRED' },
    });

    const approved = service.issueForSale({
      commandId: 'cmd-i2',
      idempotencyKey: 'idem-i2',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 1_000,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-2' },
      negativeStockApproval: {
        approvedBy: 'manager-1',
        reasonCode: 'ALLOW_NEGATIVE',
        reasonNote: 'Khách lấy trước, nhập bù trong ngày.',
        temporaryUnitCostVnd: 95_000,
      },
    });

    expect(approved).toMatchObject({
      ok: true,
      data: {
        movement: {
          movementType: 'SaleIssue',
          quantityMilli: -1_000,
          unitCostVnd: 95_000,
          totalCostVnd: -95_000,
          approverId: 'manager-1',
          requiresCostReconciliation: true,
        },
      },
    });
  });
});

function createService() {
  const repository = createInMemoryInventoryRepository();
  const service = createInventoryService({
    repository,
    tenantId: 'tenant-default',
    now: () => new Date('2026-07-27T02:00:00.000Z'),
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
