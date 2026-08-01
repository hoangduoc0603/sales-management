import { describe, expect, it } from 'vitest';
import { operationNames } from '../../shared/contracts/platform/operations';
import {
  parseFinanceAgingProjectionRequest,
  parseFinanceCashDrawerUpsertRequest,
  parseFinancePaymentMethodUpsertRequest,
  parseFinancePaymentRecordRequest,
  parseFinanceShiftCloseRequest,
  parseFinanceShiftOpenRequest,
} from '../../shared/schemas/finance/finance';

describe('finance shared contracts', () => {
  it('registers finance operations in the shared operation list', () => {
    expect(operationNames).toContain('finance.shift.open');
    expect(operationNames).toContain('finance.shift.close');
    expect(operationNames).toContain('finance.shift.lock');
    expect(operationNames).toContain('finance.payment.record');
    expect(operationNames).toContain('finance.payment.reverse');
    expect(operationNames).toContain('finance.expense.approve');
    expect(operationNames).toContain('finance.master.get');
    expect(operationNames).toContain('finance.cashDrawer.upsert');
    expect(operationNames).toContain('finance.paymentMethod.upsert');
    expect(operationNames).toContain('finance.aging.get');
    expect(operationNames).toContain('finance.summary.get');
  });

  it('validates finance master and aging requests', () => {
    expect(() =>
      parseFinanceCashDrawerUpsertRequest({
        commandId: 'cmd-drawer',
        idempotencyKey: 'idem-drawer',
        branchId: 'branch-default',
        drawerCode: 'MAIN',
        name: 'Két chính',
        drawerType: 'Cash',
        status: 'Active',
        directSaleEnabled: true,
      }),
    ).not.toThrow();
    expect(() =>
      parseFinancePaymentMethodUpsertRequest({
        commandId: 'cmd-method',
        idempotencyKey: 'idem-method',
        methodCode: 'BANK',
        name: 'Chuyển khoản',
        methodType: 'BankTransfer',
        status: 'Active',
        directSaleEnabled: false,
      }),
    ).not.toThrow();
    expect(() =>
      parseFinanceAgingProjectionRequest({
        asOfDate: '2026-07-31',
        branchId: 'branch-default',
        obligationType: 'Receivable',
        includeSettled: false,
      }),
    ).not.toThrow();
    expect(() => parseFinanceAgingProjectionRequest({ asOfDate: '31/07/2026' })).toThrow();
  });

  it('requires integer VND amounts and source document for payment record', () => {
    expect(() =>
      parseFinancePaymentRecordRequest({
        commandId: 'cmd-pay-1',
        idempotencyKey: 'idem-pay-1',
        branchId: 'branch-default',
        cashDrawerId: 'drawer-main',
        paymentMethodId: 'cash',
        amountVnd: 100_000,
        payerType: 'Customer',
        payerId: 'customer-1',
        sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
        allocations: [{ obligationId: 'ar-1', amountVnd: 80_000 }],
      }),
    ).not.toThrow();

    expect(() =>
      parseFinancePaymentRecordRequest({
        commandId: 'cmd-pay-1',
        idempotencyKey: 'idem-pay-1',
        branchId: 'branch-default',
        cashDrawerId: 'drawer-main',
        paymentMethodId: 'cash',
        amountVnd: 100_000.5,
        payerType: 'Customer',
        payerId: 'customer-1',
        allocations: [],
      }),
    ).toThrow();
  });

  it('validates shift open and close inputs', () => {
    expect(() =>
      parseFinanceShiftOpenRequest({
        commandId: 'cmd-shift-open',
        idempotencyKey: 'idem-shift-open',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashDrawerId: 'drawer-main',
        cashierId: 'cashier-1',
        openingCashVnd: 500_000,
      }),
    ).not.toThrow();

    expect(() =>
      parseFinanceShiftCloseRequest({
        commandId: 'cmd-shift-close',
        idempotencyKey: 'idem-shift-close',
        shiftId: 'shift-1',
        actualCashVnd: 510_000,
        expectedCashVnd: 500_000,
      }),
    ).toThrow();
  });
});
