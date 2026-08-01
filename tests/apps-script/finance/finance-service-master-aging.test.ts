import { describe, expect, it } from 'vitest';
import { createInMemoryFinanceRepository } from '../../../apps-script/src/repositories/finance/finance-repository';
import { createFinanceService } from '../../../apps-script/src/services/finance/finance-service';

describe('FinanceService master data and aging', () => {
  it('upserts CashDrawer and PaymentMethod master without exposing balance mutation', () => {
    const { repository, service } = createService();

    const drawer = service.upsertCashDrawer({
      commandId: 'cmd-drawer',
      idempotencyKey: 'idem-drawer',
      branchId: 'branch-default',
      drawerCode: 'MAIN',
      name: 'Két chính',
      drawerType: 'Cash',
      status: 'Active',
      directSaleEnabled: true,
    });
    const method = service.upsertPaymentMethod({
      commandId: 'cmd-method',
      idempotencyKey: 'idem-method',
      methodCode: 'CASH',
      name: 'Tiền mặt',
      methodType: 'Cash',
      status: 'Active',
      directSaleEnabled: true,
    });

    expect(drawer).toMatchObject({ ok: true, data: { cashDrawer: { drawerCode: 'MAIN', directSaleEnabled: true } } });
    expect(method).toMatchObject({ ok: true, data: { paymentMethod: { methodCode: 'CASH', directSaleEnabled: true } } });
    expect(service.getMasterData({ branchId: 'branch-default' })).toMatchObject({
      cashDrawers: [{ drawerCode: 'MAIN' }],
      paymentMethods: [{ methodCode: 'CASH' }],
    });
    expect('saveBalance' in repository).toBe(false);
  });

  it('projects receivable and payable aging by due date, branch and status', () => {
    const { repository, service } = createService();
    const current = service.createReceivable({
      branchId: 'branch-default',
      customerId: 'customer-current',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-current' },
      amountVnd: 100_000,
      dueDate: '2026-07-31',
    });
    const overdue = service.createReceivable({
      branchId: 'branch-default',
      customerId: 'customer-overdue',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-overdue' },
      amountVnd: 200_000,
      dueDate: '2026-06-15',
    });
    service.createPayable({
      branchId: 'branch-default',
      supplierId: 'supplier-overdue',
      sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-overdue' },
      amountVnd: 300_000,
      dueDate: '2026-04-01',
    });
    service.recordPayment({
      commandId: 'cmd-pay-partial',
      idempotencyKey: 'idem-pay-partial',
      branchId: 'branch-default',
      cashDrawerId: 'drawer-main',
      paymentMethodId: 'cash',
      amountVnd: 50_000,
      payerType: 'Customer',
      payerId: 'customer-overdue',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-overdue' },
      allocations: [{ obligationId: overdue.obligationId, amountVnd: 50_000 }],
    });

    const receivableAging = service.getAgingProjection({
      asOfDate: '2026-07-31',
      branchId: 'branch-default',
      obligationType: 'Receivable',
    });

    expect(receivableAging).toMatchObject({
      asOfDate: '2026-07-31',
      obligationType: 'Receivable',
      totals: {
        totalRemainingVnd: 250_000,
        currentVnd: 100_000,
        bucket31To60Vnd: 150_000,
      },
      rows: [
        { obligationId: overdue.obligationId, bucket: '31-60', remainingAmountVnd: 150_000, daysOverdue: 46 },
        { obligationId: current.obligationId, bucket: 'Current', remainingAmountVnd: 100_000, daysOverdue: 0 },
      ],
    });

    expect(service.getAgingProjection({ asOfDate: '2026-07-31', obligationType: 'Payable' })).toMatchObject({
      totals: { totalRemainingVnd: 300_000, bucket90PlusVnd: 300_000 },
      rows: [{ partyId: 'supplier-overdue', bucket: '90+' }],
    });
    expect(repository.listObligations()).toHaveLength(3);
  });
});

function createService() {
  const repository = createInMemoryFinanceRepository();
  const service = createFinanceService({
    repository,
    tenantId: 'tenant-default',
    now: () => new Date('2026-07-27T07:00:00.000Z'),
    newId: createSequentialId(),
  });
  return { repository, service };
}

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
