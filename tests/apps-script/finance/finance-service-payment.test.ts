import { describe, expect, it } from 'vitest';
import { createInMemoryFinanceRepository } from '../../../apps-script/src/repositories/finance/finance-repository';
import { createFinanceService } from '../../../apps-script/src/services/finance/finance-service';

describe('FinanceService payment', () => {
  it('records payment with multiple allocations and updates receivable balances', () => {
    const { repository, service } = createService();
    const first = service.createReceivable({
      branchId: 'branch-default',
      customerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
      amountVnd: 600_000,
    });
    const second = service.createReceivable({
      branchId: 'branch-default',
      customerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-2' },
      amountVnd: 400_000,
    });

    const result = service.recordPayment({
      commandId: 'cmd-pay-1',
      idempotencyKey: 'idem-pay-1',
      branchId: 'branch-default',
      cashDrawerId: 'drawer-main',
      paymentMethodId: 'cash',
      amountVnd: 1_000_000,
      payerType: 'Customer',
      payerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'multi-pay' },
      allocations: [
        { obligationId: first.obligationId, amountVnd: 600_000 },
        { obligationId: second.obligationId, amountVnd: 400_000 },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        cashTransaction: { transactionType: 'Receipt', amountVnd: 1_000_000 },
        allocations: [{ amountVnd: 600_000 }, { amountVnd: 400_000 }],
      },
    });
    expect(repository.getObligation(first.obligationId)).toMatchObject({ remainingAmountVnd: 0, status: 'Settled' });
    expect(repository.getObligation(second.obligationId)).toMatchObject({ remainingAmountVnd: 0, status: 'Settled' });
  });

  it('partial payment keeps receivable open and overpayment creates customer credit', () => {
    const { repository, service } = createService();
    const receivable = service.createReceivable({
      branchId: 'branch-default',
      customerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
      amountVnd: 1_000_000,
    });

    service.recordPayment({
      commandId: 'cmd-partial',
      idempotencyKey: 'idem-partial',
      branchId: 'branch-default',
      cashDrawerId: 'drawer-main',
      paymentMethodId: 'cash',
      amountVnd: 600_000,
      payerType: 'Customer',
      payerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
      allocations: [{ obligationId: receivable.obligationId, amountVnd: 600_000 }],
    });
    expect(repository.getObligation(receivable.obligationId)).toMatchObject({
      remainingAmountVnd: 400_000,
      status: 'PartiallyPaid',
    });

    const overpayment = service.recordPayment({
      commandId: 'cmd-over',
      idempotencyKey: 'idem-over',
      branchId: 'branch-default',
      cashDrawerId: 'drawer-main',
      paymentMethodId: 'cash',
      amountVnd: 500_000,
      payerType: 'Customer',
      payerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
      allocations: [{ obligationId: receivable.obligationId, amountVnd: 400_000 }],
    });

    expect(overpayment).toMatchObject({
      ok: true,
      data: {
        customerCredit: {
          customerId: 'customer-1',
          amountVnd: 100_000,
          status: 'Open',
        },
      },
    });
    expect(repository.listCustomerCredits()).toHaveLength(1);
  });

  it('blocks allocation beyond payment or obligation balance', () => {
    const { service } = createService();
    const receivable = service.createReceivable({
      branchId: 'branch-default',
      customerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
      amountVnd: 500_000,
    });

    expect(
      service.recordPayment({
        commandId: 'cmd-pay-over',
        idempotencyKey: 'idem-pay-over',
        branchId: 'branch-default',
        cashDrawerId: 'drawer-main',
        paymentMethodId: 'cash',
        amountVnd: 300_000,
        payerType: 'Customer',
        payerId: 'customer-1',
        sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
        allocations: [{ obligationId: receivable.obligationId, amountVnd: 400_000 }],
      }),
    ).toMatchObject({ ok: false, error: { code: 'PAYMENT_ALLOCATION_EXCEEDS_AMOUNT' } });

    expect(
      service.recordPayment({
        commandId: 'cmd-obligation-over',
        idempotencyKey: 'idem-obligation-over',
        branchId: 'branch-default',
        cashDrawerId: 'drawer-main',
        paymentMethodId: 'cash',
        amountVnd: 600_000,
        payerType: 'Customer',
        payerId: 'customer-1',
        sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
        allocations: [{ obligationId: receivable.obligationId, amountVnd: 600_000 }],
      }),
    ).toMatchObject({ ok: false, error: { code: 'OBLIGATION_ALLOCATION_EXCEEDS_BALANCE' } });
  });

  it('records refund as counter cash transaction and creates customer credit from source document', () => {
    const { repository, service } = createService();

    const refund = service.recordRefund({
      commandId: 'cmd-refund-return',
      idempotencyKey: 'idem-refund-return',
      branchId: 'branch-default',
      cashDrawerId: 'drawer-main',
      paymentMethodId: 'cash',
      amountVnd: 84_000,
      payeeType: 'Customer',
      payeeId: 'customer-1',
      sourceDocument: { sourceType: 'SaleReturn', sourceId: 'return-1' },
      approverId: 'manager-1',
    });

    expect(refund).toMatchObject({
      ok: true,
      data: {
        payment: {
          amountVnd: -84_000,
          payerType: 'Customer',
          payerId: 'customer-1',
          sourceDocument: { sourceType: 'SaleReturn', sourceId: 'return-1' },
        },
        cashTransaction: {
          transactionType: 'Refund',
          amountVnd: -84_000,
          sourceDocument: { sourceType: 'SaleReturn', sourceId: 'return-1' },
        },
      },
    });
    expect(repository.listPayments()).toHaveLength(1);
    expect(repository.listCashTransactions().filter((tx) => tx.transactionType === 'Refund')).toHaveLength(1);

    const credit = service.createCustomerCreditFromSource({
      branchId: 'branch-default',
      customerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleReturn', sourceId: 'return-1' },
      amountVnd: 42_000,
    });

    expect(credit).toMatchObject({
      customerId: 'customer-1',
      amountVnd: 42_000,
      consumedAmountVnd: 0,
      status: 'Open',
    });
    expect(repository.listCustomerCredits()).toHaveLength(1);
  });

  it('creates payable obligation for approved purchase receipt', () => {
    const { repository, service } = createService();

    const payable = service.createPayable({
      branchId: 'branch-default',
      supplierId: 'supplier-1',
      sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-1' },
      amountVnd: 310_000,
    });

    expect(payable).toMatchObject({
      obligationType: 'Payable',
      partyId: 'supplier-1',
      originalAmountVnd: 310_000,
      remainingAmountVnd: 310_000,
      status: 'Open',
    });
    expect(repository.listObligations()).toHaveLength(1);
  });

  it('reduces payable by supplier return without deleting the original obligation', () => {
    const { repository, service } = createService();
    const payable = service.createPayable({
      branchId: 'branch-default',
      supplierId: 'supplier-1',
      sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-1' },
      amountVnd: 110_000,
    });

    const adjusted = service.reducePayable({
      branchId: 'branch-default',
      supplierId: 'supplier-1',
      sourceDocument: { sourceType: 'SupplierReturn', sourceId: 'supplier-return-1' },
      sourceObligationId: payable.obligationId,
      amountVnd: 22_000,
    });

    expect(adjusted).toMatchObject({
      obligationId: payable.obligationId,
      obligationType: 'Payable',
      originalAmountVnd: 110_000,
      allocatedAmountVnd: 22_000,
      remainingAmountVnd: 88_000,
      status: 'PartiallyPaid',
    });
    expect(repository.listObligations()).toHaveLength(1);
  });

  it('creates supplier prepayment evidence from supplier return refund source', () => {
    const { repository, service } = createService();

    const prepayment = service.createSupplierPrepaymentFromSource({
      branchId: 'branch-default',
      supplierId: 'supplier-1',
      sourceDocument: { sourceType: 'SupplierReturn', sourceId: 'supplier-return-1' },
      amountVnd: 22_000,
    });

    expect(prepayment).toMatchObject({
      supplierId: 'supplier-1',
      sourceDocument: { sourceType: 'SupplierReturn', sourceId: 'supplier-return-1' },
      amountVnd: 22_000,
      consumedAmountVnd: 0,
      status: 'Open',
    });
    expect(repository.listSupplierPrepayments()).toHaveLength(1);
  });

  it('records supplier payment and allocates it to multiple purchase receipts', () => {
    const { repository, service } = createService();
    const first = service.createPayable({
      branchId: 'branch-default',
      supplierId: 'supplier-1',
      sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-1' },
      amountVnd: 60_000,
    });
    const second = service.createPayable({
      branchId: 'branch-default',
      supplierId: 'supplier-1',
      sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-2' },
      amountVnd: 50_000,
    });

    const paid = service.recordSupplierPayment({
      commandId: 'cmd-supplier-payment',
      idempotencyKey: 'idem-supplier-payment',
      branchId: 'branch-default',
      cashDrawerId: 'drawer-main',
      paymentMethodId: 'bank',
      amountVnd: 110_000,
      supplierId: 'supplier-1',
      sourceDocument: { sourceType: 'Manual', sourceId: 'supplier-payment-1' },
      allocations: [
        { obligationId: first.obligationId, amountVnd: 60_000 },
        { obligationId: second.obligationId, amountVnd: 50_000 },
      ],
      actorId: 'accountant-1',
    });

    expect(paid).toMatchObject({
      ok: true,
      data: {
        payment: { amountVnd: -110_000, payerType: 'Supplier', payerId: 'supplier-1' },
        cashTransaction: { transactionType: 'Disbursement', amountVnd: -110_000 },
        allocations: [{ amountVnd: 60_000 }, { amountVnd: 50_000 }],
        obligations: [
          { obligationId: first.obligationId, status: 'Settled' },
          { obligationId: second.obligationId, status: 'Settled' },
        ],
      },
    });
    expect(repository.listPaymentAllocations()).toHaveLength(2);
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
