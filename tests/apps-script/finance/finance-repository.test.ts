import { describe, expect, it } from 'vitest';
import type { CashTransactionDTO, PaymentAllocationDTO } from '../../../shared/contracts/finance/finance';
import { createInMemoryFinanceRepository } from '../../../apps-script/src/repositories/finance/finance-repository';

describe('FinanceRepository', () => {
  it('stores cash transactions and allocations append-only', () => {
    const repository = createInMemoryFinanceRepository();
    const transaction = createCashTransaction({ cashTransactionId: 'cash-1', amountVnd: 100_000 });
    const allocation = createAllocation({ allocationId: 'alloc-1', amountVnd: 80_000 });

    repository.appendCashTransaction(transaction);
    repository.appendPaymentAllocation(allocation);

    repository.listCashTransactions()[0]!.amountVnd = 1;
    repository.listPaymentAllocations()[0]!.amountVnd = 1;

    expect(repository.listCashTransactions()[0]?.amountVnd).toBe(100_000);
    expect(repository.listPaymentAllocations()[0]?.amountVnd).toBe(80_000);
    expect(() => repository.appendCashTransaction(transaction)).toThrow(/append-only/i);
    expect(() => repository.appendPaymentAllocation(allocation)).toThrow(/append-only/i);
  });

  it('does not expose direct balance mutation', () => {
    const repository = createInMemoryFinanceRepository();

    expect('saveBalance' in repository).toBe(false);
    expect('setCashBalance' in repository).toBe(false);
  });
});

function createCashTransaction(overrides: Partial<CashTransactionDTO> = {}): CashTransactionDTO {
  return {
    cashTransactionId: 'cash-default',
    tenantId: 'tenant-default',
    branchId: 'branch-default',
    cashDrawerId: 'drawer-main',
    transactionType: 'Receipt',
    amountVnd: 100_000,
    effectiveAt: '2026-07-27T00:00:00.000Z',
    sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
    actorId: 'user-admin',
    idempotencyKey: 'idem-1',
    ...overrides,
  };
}

function createAllocation(overrides: Partial<PaymentAllocationDTO> = {}): PaymentAllocationDTO {
  return {
    allocationId: 'alloc-default',
    tenantId: 'tenant-default',
    paymentId: 'payment-1',
    obligationId: 'ar-1',
    amountVnd: 80_000,
    allocatedAt: '2026-07-27T00:00:00.000Z',
    ...overrides,
  };
}
