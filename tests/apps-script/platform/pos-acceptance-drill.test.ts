import { describe, expect, it } from 'vitest';
import { createImmediateLockProvider } from '../../../apps-script/src/infrastructure/platform/runtime';
import { createInMemoryCatalogRepository } from '../../../apps-script/src/repositories/catalog/catalog-repository';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createInMemoryFinanceRepository } from '../../../apps-script/src/repositories/finance/finance-repository';
import { createInMemorySalesRepository } from '../../../apps-script/src/repositories/sales/sales-repository';
import { createInMemoryCommandRepository } from '../../../apps-script/src/repositories/platform/command-repository';
import { runPosAcceptanceDrill } from '../../../apps-script/src/bootstrap/pos-acceptance-drill';
import { readPerformanceSnapshot, withPerformanceTracker } from '../../../apps-script/src/api/performance-tracker';

describe('POS production acceptance drill', () => {
  it('seeds POS sellable fixture and completes a paid checkout with the UI-compatible open shift', () => {
    const deps = createFixture();

    const result = runPosAcceptanceDrill(deps);

    expect(result.fixture).toMatchObject({
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      cashierId: 'user-admin',
      shiftId: 'shift-local-open',
      sku: 'POS-ACCEPT-001',
      barcode: '899999000001',
    });
    expect(result.projection).toMatchObject({
      variantCount: 1,
      seededVariantVisible: true,
    });
    expect(result.checkout).toMatchObject({
      orderStatus: 'Completed',
      paymentStatus: 'Paid',
      receiptFormat: 'K80',
      totalVnd: 84_000,
      inventoryMovementTypes: ['SaleIssue'],
      paymentStatusFinance: 'Approved',
    });
    expect(result.stages.checkoutMs).toBeGreaterThanOrEqual(0);
    expect(result.stages.projectionMs).toBeGreaterThanOrEqual(0);
    expect(deps.inventoryRepository.getBalance('warehouse-default', result.fixture.variantId)).toMatchObject({
      availableMilli: 48_000,
      onHandMilli: 48_000,
    });
  });

  it('can run repeatedly without duplicating the product or creating another open shift', () => {
    const deps = createFixture();

    runPosAcceptanceDrill(deps);
    runPosAcceptanceDrill(deps);

    expect(deps.catalogRepository.listVariants().filter((variant) => variant.sku === 'POS-ACCEPT-001')).toHaveLength(1);
    expect(deps.financeRepository.listShifts().filter((shift) => shift.shiftId === 'shift-local-open')).toHaveLength(1);
  });

  it('records POS checkout performance stages when a tracker is active', () => {
    const deps = createFixture();

    const performance = withPerformanceTracker(() => {
      runPosAcceptanceDrill(deps);
      return readPerformanceSnapshot();
    });

    expect(performance.stages['sales.pos.validateShiftMs']).toBeGreaterThanOrEqual(0);
    expect(performance.stages['sales.pos.inventoryIssueMs']).toBeGreaterThanOrEqual(0);
    expect(performance.stages['sales.pos.financeRecordMs']).toBeGreaterThanOrEqual(0);
    expect(performance.stages['sales.pos.persistOrderMs']).toBeGreaterThanOrEqual(0);
  });
});

function createFixture() {
  let sequence = 0;
  const catalogRepository = createInMemoryCatalogRepository();
  const inventoryRepository = createInMemoryInventoryRepository();
  const financeRepository = createInMemoryFinanceRepository();

  return {
    tenantId: 'tenant-default',
    catalogRepository,
    inventoryRepository,
    financeRepository,
    salesRepository: createInMemorySalesRepository(),
    commandRepository: createInMemoryCommandRepository(),
    lockProvider: createImmediateLockProvider(),
    now: () => new Date('2026-08-01T05:00:00.000Z'),
    newId(prefix: string) {
      sequence += 1;
      return `${prefix}-${sequence}`;
    },
  };
}
