import { describe, expect, it } from 'vitest';
import { createInMemoryFinanceRepository } from '../../../apps-script/src/repositories/finance/finance-repository';
import { createFinanceService } from '../../../apps-script/src/services/finance/finance-service';

describe('FinanceService reversal and expense', () => {
  it('reverses payment with counter transaction without changing original payment', () => {
    const { repository, service } = createService();
    const payment = service.recordPayment({
      commandId: 'cmd-pay-1',
      idempotencyKey: 'idem-pay-1',
      branchId: 'branch-default',
      cashDrawerId: 'drawer-main',
      paymentMethodId: 'cash',
      amountVnd: 500_000,
      payerType: 'Customer',
      payerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
      allocations: [],
    });
    if (!payment.ok) throw new Error('Expected payment.');

    const reversal = service.reversePayment({
      commandId: 'cmd-reverse-1',
      idempotencyKey: 'idem-reverse-1',
      paymentId: payment.data.payment.paymentId,
      amountVnd: 500_000,
      reason: 'Nhập nhầm khoản thu.',
      approverId: 'manager-1',
    });

    expect(reversal).toMatchObject({
      ok: true,
      data: {
        payment: {
          amountVnd: -500_000,
          reversalOfPaymentId: payment.data.payment.paymentId,
        },
        cashTransaction: {
          transactionType: 'Reversal',
          amountVnd: -500_000,
        },
      },
    });
    expect(repository.getPayment(payment.data.payment.paymentId)).toMatchObject({
      amountVnd: 500_000,
      status: 'Approved',
    });
  });

  it('approves expense by creating an immutable expense cash transaction', () => {
    const { repository, service } = createService();

    const result = service.approveExpense({
      commandId: 'cmd-expense-1',
      idempotencyKey: 'idem-expense-1',
      branchId: 'branch-default',
      cashDrawerId: 'drawer-main',
      paymentMethodId: 'cash',
      expenseId: 'expense-1',
      amountVnd: 120_000,
      payeeName: 'Nhân viên giao hàng',
      reason: 'Chi phí giao hàng nội thành.',
      approverId: 'manager-1',
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        cashTransaction: {
          transactionType: 'Expense',
          amountVnd: -120_000,
          sourceDocument: { sourceType: 'Expense', sourceId: 'expense-1' },
          approverId: 'manager-1',
        },
      },
    });
    expect(repository.listCashTransactions()).toHaveLength(1);
  });
});

function createService() {
  const repository = createInMemoryFinanceRepository();
  const service = createFinanceService({
    repository,
    tenantId: 'tenant-default',
    now: () => new Date('2026-07-27T08:00:00.000Z'),
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
