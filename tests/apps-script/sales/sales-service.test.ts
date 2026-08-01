import { describe, expect, it } from 'vitest';
import { createInMemoryCatalogRepository } from '../../../apps-script/src/repositories/catalog/catalog-repository';
import { createInMemoryFinanceRepository } from '../../../apps-script/src/repositories/finance/finance-repository';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createInMemorySalesRepository } from '../../../apps-script/src/repositories/sales/sales-repository';
import { createCatalogService } from '../../../apps-script/src/services/catalog/catalog-service';
import { createFinanceService } from '../../../apps-script/src/services/finance/finance-service';
import { createInventoryService } from '../../../apps-script/src/services/inventory/inventory-service';
import { createCommandCoordinatorForTest } from '../../../apps-script/src/services/platform/command/command-coordinator';
import { createSalesService } from '../../../apps-script/src/services/sales/sales-service';

describe('SalesService POS checkout', () => {
  it('saves, lists and cancels explicit POS draft without inventory or finance ledger', () => {
    const { salesRepository, salesService, inventoryRepository, financeRepository } = createFixture();

    const saved = salesService.saveDraft(draftInput());

    expect(saved).toMatchObject({
      ok: true,
      data: {
        order: {
          status: 'Draft',
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          totalVnd: 84_000,
        },
        lines: [{ displayName: 'Sữa hạt óc chó 1L', quantityMilli: 2_000 }],
        tenders: [{ amountVnd: 84_000 }],
      },
    });
    expect(salesService.listDrafts({ branchId: 'branch-default', warehouseId: 'warehouse-default' }).drafts).toHaveLength(1);
    expect(inventoryRepository.listMovements()).toHaveLength(1);
    expect(financeRepository.listPayments()).toHaveLength(0);

    if (!saved.ok) throw new Error('Expected draft save success.');
    const cancelled = salesService.cancelDraft({
      commandId: 'cmd-draft-cancel',
      idempotencyKey: 'idem-draft-cancel',
      draftId: saved.data.order.saleOrderId,
      reason: 'Khách đổi ý.',
    });

    expect(cancelled).toMatchObject({ ok: true, data: { order: { status: 'Cancelled' } } });
    expect(salesRepository.listOrders()).toHaveLength(1);
    expect(salesService.listDrafts({ branchId: 'branch-default', warehouseId: 'warehouse-default' }).drafts).toHaveLength(0);
  });

  it('completes fully paid POS once, issues stock, records payment and returns immutable receipt snapshot', () => {
    const { financeRepository, inventoryRepository, salesRepository, salesService, shiftId } = createFixture();

    const result = salesService.completePosSale(posCompleteInput({ shiftId }));

    expect(result).toMatchObject({
      ok: true,
      data: {
        order: {
          status: 'Completed',
          paymentStatus: 'Paid',
          totalVnd: 84_000,
          paidVnd: 84_000,
          receivableVnd: 0,
        },
        receipt: {
          receiptFormat: 'K80',
          totals: {
            totalVnd: 84_000,
            paidVnd: 84_000,
            changeVnd: 0,
          },
        },
        conflicts: [],
      },
    });
    expect(salesRepository.listOrders()).toHaveLength(1);
    expect(inventoryRepository.listMovements().filter((movement) => movement.movementType === 'SaleIssue')).toHaveLength(1);
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-2')).toMatchObject({
      availableMilli: 8_000,
      onHandMilli: 8_000,
    });
    expect(financeRepository.listPayments()).toHaveLength(1);
    expect(financeRepository.listCustomerCredits()).toHaveLength(0);

    const retry = salesService.completePosSale({
      ...posCompleteInput({ shiftId }),
      commandId: 'cmd-pos-retry-different',
    });
    expect(retry).toMatchObject({ ok: true, data: { order: { saleOrderId: result.ok ? result.data.order.saleOrderId : '' } } });
    expect(salesRepository.listOrders()).toHaveLength(1);
    expect(financeRepository.listPayments()).toHaveLength(1);
  });

  it('validates POS shift by direct shiftId lookup instead of scanning open shifts by cashier', () => {
    const { financeRepository, salesService, shiftId } = createFixture();
    let getShiftCalls = 0;
    const originalGetShift = financeRepository.getShift;
    financeRepository.getShift = (currentShiftId: string) => {
      getShiftCalls += 1;
      return originalGetShift(currentShiftId);
    };
    financeRepository.findOpenShiftForPos = () => {
      throw new Error('POS checkout must not scan open shifts by cashier when shiftId is provided.');
    };

    const result = salesService.completePosSale(posCompleteInput({ shiftId }));

    expect(result).toMatchObject({ ok: true, data: { order: { status: 'Completed' } } });
    expect(getShiftCalls).toBe(1);
  });

  it('skips separate stock precheck for single-line POS because issueForSale validates availability before writing', () => {
    const { inventoryService, salesService, shiftId } = createFixture();
    let checkAvailabilityCalls = 0;
    const originalCheckAvailability = inventoryService.checkAvailability;
    inventoryService.checkAvailability = (input) => {
      checkAvailabilityCalls += 1;
      return originalCheckAvailability(input);
    };

    const result = salesService.completePosSale(posCompleteInput({ shiftId }));

    expect(result).toMatchObject({ ok: true, data: { order: { status: 'Completed' } } });
    expect(checkAvailabilityCalls).toBe(0);
  });

  it('creates receivable when POS tender is partial', () => {
    const { financeRepository, salesService, shiftId } = createFixture();

    const result = salesService.completePosSale({
      ...posCompleteInput({ shiftId }),
      commandId: 'cmd-pos-partial',
      idempotencyKey: 'idem-pos-partial',
      customerId: 'customer-1',
      tenders: [{ tenderId: 'tender-cash', paymentMethodId: 'cash', amountVnd: 40_000 }],
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        order: { paymentStatus: 'Partial', paidVnd: 40_000, receivableVnd: 44_000 },
        receivable: { remainingAmountVnd: 44_000, status: 'Open' },
      },
    });
    expect(financeRepository.listObligations()).toHaveLength(1);
    expect(financeRepository.listPayments()).toHaveLength(1);
  });

  it('returns conflict without creating order when quote is stale or stock is insufficient', () => {
    const stale = createFixture();
    const staleResult = stale.salesService.completePosSale({
      ...posCompleteInput({ shiftId: stale.shiftId }),
      commandId: 'cmd-pos-stale',
      idempotencyKey: 'idem-pos-stale',
      quoteVersion: 'quote-old',
    });

    expect(staleResult).toMatchObject({
      ok: false,
      error: { code: 'PRICE_CHANGED' },
    });
    expect(stale.salesRepository.listOrders()).toHaveLength(0);

    const stock = createFixture({ quantityMilli: 1_000 });
    const stockResult = stock.salesService.completePosSale({
      ...posCompleteInput({ shiftId: stock.shiftId }),
      commandId: 'cmd-pos-stock',
      idempotencyKey: 'idem-pos-stock',
    });

    expect(stockResult).toMatchObject({
      ok: false,
      error: { code: 'INSUFFICIENT_STOCK' },
    });
    expect(stock.salesRepository.listOrders()).toHaveLength(0);
  });

  it('blocks POS checkout when shift is required and no shift is open for the cashier scope', () => {
    const { salesRepository, salesService } = createFixture({ openShift: false });

    const result = salesService.completePosSale(posCompleteInput({ shiftId: undefined }));

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'SHIFT_NOT_OPEN' },
    });
    expect(salesRepository.listOrders()).toHaveLength(0);
  });

  it('lists order documents by branch, warehouse and status with detail lines', () => {
    const { salesService, shiftId } = createFixture();
    const completed = salesService.completePosSale(posCompleteInput({ shiftId }));
    if (!completed.ok) throw new Error('Expected POS completion.');

    const listed = salesService.listOrders({
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      statuses: ['Completed'],
      sources: ['POS'],
      limit: 20,
    });

    expect(listed).toMatchObject({
      orders: [
        {
          order: {
            saleOrderId: completed.data.order.saleOrderId,
            status: 'Completed',
          },
          lineCount: 1,
        },
      ],
    });

    const detail = salesService.getOrder({ saleOrderId: completed.data.order.saleOrderId });
    expect(detail).toMatchObject({
      order: { businessNumber: completed.data.order.businessNumber },
      lines: [{ displayName: 'Sữa hạt óc chó 1L' }],
      receipt: { saleOrderId: completed.data.order.saleOrderId },
    });
  });

  it('confirms and cancels manual online order by reserving then releasing stock only', () => {
    const { inventoryRepository, salesService } = createFixture();
    const draft = salesService.saveDraft(onlineDraftInput());
    if (!draft.ok) throw new Error('Expected online draft save.');

    const confirmed = salesService.confirmOnline({
      commandId: 'cmd-online-confirm',
      idempotencyKey: 'idem-online-confirm',
      saleOrderId: draft.data.order.saleOrderId,
      actorId: 'seller-1',
    });
    expect(confirmed).toMatchObject({ ok: true, data: { order: { status: 'Confirmed' } } });
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-2')).toMatchObject({
      availableMilli: 8_000,
      reservedMilli: 2_000,
      onHandMilli: 10_000,
    });

    const cancelled = salesService.cancelOnline({
      commandId: 'cmd-online-cancel',
      idempotencyKey: 'idem-online-cancel',
      saleOrderId: draft.data.order.saleOrderId,
      actorId: 'seller-1',
      reason: 'Khách hủy trước khi giao.',
      depositTreatment: 'KeepCustomerCredit',
    });
    expect(cancelled).toMatchObject({ ok: true, data: { order: { status: 'Cancelled' } } });
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-2')).toMatchObject({
      availableMilli: 10_000,
      reservedMilli: 0,
      onHandMilli: 10_000,
    });
    expect(inventoryRepository.listMovements().filter((movement) => movement.movementType === 'SaleIssue')).toHaveLength(0);
  });

  it('cancels online order with deposit by keeping paid amount as customer credit', () => {
    const { financeRepository, inventoryRepository, salesService } = createFixture();
    const draft = salesService.saveDraft({
      ...onlineDraftInput(),
      commandId: 'cmd-online-draft-deposit-credit',
      idempotencyKey: 'idem-online-draft-deposit-credit',
      tenders: [{ tenderId: 'tender-deposit-cash', paymentMethodId: 'cash', amountVnd: 20_000, cashDrawerId: 'drawer-main' }],
    });
    if (!draft.ok) throw new Error('Expected online draft save.');

    const confirmed = salesService.confirmOnline({
      commandId: 'cmd-online-confirm-deposit-credit',
      idempotencyKey: 'idem-online-confirm-deposit-credit',
      saleOrderId: draft.data.order.saleOrderId,
      actorId: 'seller-1',
    });
    expect(confirmed).toMatchObject({ ok: true });

    const cancelled = salesService.cancelOnline({
      commandId: 'cmd-online-cancel-deposit-credit',
      idempotencyKey: 'idem-online-cancel-deposit-credit',
      saleOrderId: draft.data.order.saleOrderId,
      actorId: 'seller-1',
      reason: 'Khách hủy và giữ tiền cọc.',
      depositTreatment: 'KeepCustomerCredit',
    });

    expect(cancelled).toMatchObject({
      ok: true,
      data: {
        order: { status: 'Cancelled', paidVnd: 20_000, paymentStatus: 'Partial' },
        customerCredit: { customerId: 'customer-1', amountVnd: 20_000, sourceDocument: { sourceType: 'SaleOrder' } },
      },
    });
    expect(financeRepository.listCustomerCredits()).toHaveLength(1);
    expect(financeRepository.listPayments()).toHaveLength(0);
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-2')).toMatchObject({
      availableMilli: 10_000,
      reservedMilli: 0,
      onHandMilli: 10_000,
    });
  });

  it('cancels online order with deposit by recording a refund counter-payment', () => {
    const { financeRepository, salesService } = createFixture();
    const draft = salesService.saveDraft({
      ...onlineDraftInput(),
      commandId: 'cmd-online-draft-deposit-refund',
      idempotencyKey: 'idem-online-draft-deposit-refund',
      tenders: [{ tenderId: 'tender-deposit-bank', paymentMethodId: 'bank', amountVnd: 30_000, cashDrawerId: 'drawer-main' }],
    });
    if (!draft.ok) throw new Error('Expected online draft save.');

    const cancelled = salesService.cancelOnline({
      commandId: 'cmd-online-cancel-deposit-refund',
      idempotencyKey: 'idem-online-cancel-deposit-refund',
      saleOrderId: draft.data.order.saleOrderId,
      actorId: 'seller-1',
      reason: 'Khách hủy và hoàn tiền cọc.',
      depositTreatment: 'Refund',
      cashDrawerId: 'drawer-main',
      paymentMethodId: 'bank',
      approverId: 'manager-1',
    });

    expect(cancelled).toMatchObject({
      ok: true,
      data: {
        order: { status: 'Cancelled', paidVnd: 30_000 },
        financeResult: { payment: { amountVnd: -30_000, sourceDocument: { sourceType: 'SaleOrder' } } },
      },
    });
    expect(financeRepository.listPayments()).toMatchObject([{ amountVnd: -30_000, status: 'Approved' }]);
    expect(financeRepository.listCustomerCredits()).toHaveLength(0);
  });

  it('ships manual online order once, creates receivable and delivery does not create another ledger', () => {
    const { financeRepository, inventoryRepository, salesService } = createFixture();
    const draft = salesService.saveDraft({ ...onlineDraftInput(), commandId: 'cmd-online-draft-ship', idempotencyKey: 'idem-online-draft-ship' });
    if (!draft.ok) throw new Error('Expected online draft save.');

    const confirmed = salesService.confirmOnline({
      commandId: 'cmd-online-confirm-ship',
      idempotencyKey: 'idem-online-confirm-ship',
      saleOrderId: draft.data.order.saleOrderId,
      actorId: 'seller-1',
    });
    expect(confirmed).toMatchObject({ ok: true });

    const packing = salesService.startPackingOnline({
      commandId: 'cmd-online-pack',
      idempotencyKey: 'idem-online-pack',
      saleOrderId: draft.data.order.saleOrderId,
      actorId: 'packer-1',
    });
    expect(packing).toMatchObject({ ok: true, data: { order: { status: 'Packing' } } });

    const shipped = salesService.shipOnline({
      commandId: 'cmd-online-ship',
      idempotencyKey: 'idem-online-ship',
      saleOrderId: draft.data.order.saleOrderId,
      actorId: 'seller-1',
    });
    expect(shipped).toMatchObject({
      ok: true,
      data: {
        order: { status: 'Shipped', paymentStatus: 'Unpaid', receivableVnd: 84_000 },
        receivable: { remainingAmountVnd: 84_000, status: 'Open' },
      },
    });
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-2')).toMatchObject({
      availableMilli: 8_000,
      reservedMilli: 0,
      onHandMilli: 8_000,
    });
    expect(inventoryRepository.listMovements().filter((movement) => movement.movementType === 'SaleIssue')).toHaveLength(1);
    expect(financeRepository.listObligations()).toHaveLength(1);

    const delivered = salesService.deliverOnline({
      commandId: 'cmd-online-deliver',
      idempotencyKey: 'idem-online-deliver',
      saleOrderId: draft.data.order.saleOrderId,
      actorId: 'seller-1',
    });
    expect(delivered).toMatchObject({ ok: true, data: { order: { status: 'Delivered' } } });
    expect(inventoryRepository.listMovements().filter((movement) => movement.movementType === 'SaleIssue')).toHaveLength(1);
    expect(financeRepository.listObligations()).toHaveLength(1);
  });

  it('creates source return into quarantine, blocks over-return and resolves restock', () => {
    const { inventoryRepository, salesService, shiftId } = createFixture();
    const completed = salesService.completePosSale(posCompleteInput({ shiftId }));
    if (!completed.ok) throw new Error('Expected POS completion.');

    const blocked = salesService.createReturn({
      commandId: 'cmd-return-over',
      idempotencyKey: 'idem-return-over',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      actorId: 'cashier-1',
      sourceSaleOrderId: completed.data.order.saleOrderId,
      reason: 'Vượt số lượng.',
      lines: [
        {
          sourceSaleLineId: completed.data.lines[0].saleOrderLineId,
          variantId: 'variant-2',
          quantity: 3,
          quantityMilli: 3_000,
          disposition: 'Quarantine',
        },
      ],
    });
    expect(blocked).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });

    const created = salesService.createReturn({
      commandId: 'cmd-return-create',
      idempotencyKey: 'idem-return-create',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      actorId: 'cashier-1',
      sourceSaleOrderId: completed.data.order.saleOrderId,
      reason: 'Hàng lỗi.',
      lines: [
        {
          sourceSaleLineId: completed.data.lines[0].saleOrderLineId,
          variantId: 'variant-2',
          quantity: 1,
          quantityMilli: 1_000,
          disposition: 'Quarantine',
        },
      ],
    });
    expect(created).toMatchObject({ ok: true, data: { returnOrder: { status: 'ReceivedForInspection' } } });
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-2')).toMatchObject({
      availableMilli: 8_000,
      quarantineMilli: 1_000,
      onHandMilli: 9_000,
    });

    if (!created.ok) throw new Error('Expected return create.');
    const resolved = salesService.resolveReturn({
      commandId: 'cmd-return-resolve',
      idempotencyKey: 'idem-return-resolve',
      returnId: created.data.returnOrder.returnId,
      actorId: 'manager-1',
      lines: [{ returnLineId: created.data.returnOrder.lines[0].returnLineId, disposition: 'Restock' }],
    });
    expect(resolved).toMatchObject({ ok: true, data: { returnOrder: { status: 'Resolved' } } });
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-2')).toMatchObject({
      availableMilli: 9_000,
      quarantineMilli: 0,
      onHandMilli: 9_000,
    });
  });

  it('resolves source return with scrap and cash refund while marking the source sale partially refunded', () => {
    const { financeRepository, inventoryRepository, salesRepository, salesService, shiftId } = createFixture();
    const completed = salesService.completePosSale(posCompleteInput({ shiftId, customerId: 'customer-1' }));
    if (!completed.ok) throw new Error('Expected POS completion.');

    const created = salesService.createReturn({
      commandId: 'cmd-return-scrap-create',
      idempotencyKey: 'idem-return-scrap-create',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      actorId: 'cashier-1',
      sourceSaleOrderId: completed.data.order.saleOrderId,
      reason: 'Hàng hỏng.',
      lines: [
        {
          sourceSaleLineId: completed.data.lines[0].saleOrderLineId,
          variantId: 'variant-2',
          quantity: 1,
          quantityMilli: 1_000,
          disposition: 'Quarantine',
        },
      ],
    });
    if (!created.ok) throw new Error('Expected return create.');

    const resolved = salesService.resolveReturn({
      commandId: 'cmd-return-scrap-resolve',
      idempotencyKey: 'idem-return-scrap-resolve',
      returnId: created.data.returnOrder.returnId,
      actorId: 'manager-1',
      lines: [{ returnLineId: created.data.returnOrder.lines[0].returnLineId, disposition: 'Scrap' }],
      financialAction: {
        treatment: 'Refund',
        amountVnd: 42_000,
        cashDrawerId: 'drawer-main',
        paymentMethodId: 'cash',
        approverId: 'manager-1',
      },
    });

    expect(resolved).toMatchObject({
      ok: true,
      data: {
        returnOrder: { status: 'Resolved', lines: [{ disposition: 'Scrap' }] },
        financeResult: {
          payment: { amountVnd: -42_000, sourceDocument: { sourceType: 'SaleReturn' } },
          cashTransaction: { transactionType: 'Refund', amountVnd: -42_000 },
        },
      },
    });
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-2')).toMatchObject({
      availableMilli: 8_000,
      quarantineMilli: 0,
      onHandMilli: 8_000,
    });
    expect(financeRepository.listCashTransactions().filter((transaction) => transaction.transactionType === 'Refund')).toHaveLength(1);
    expect(salesRepository.getOrder(completed.data.order.saleOrderId)).toMatchObject({
      paymentStatus: 'PartialRefund',
    });
  });

  it('resolves source return with customer credit and keeps inspected stock in quarantine', () => {
    const { financeRepository, inventoryRepository, salesService, shiftId } = createFixture();
    const completed = salesService.completePosSale(posCompleteInput({ shiftId, customerId: 'customer-1' }));
    if (!completed.ok) throw new Error('Expected POS completion.');

    const created = salesService.createReturn({
      commandId: 'cmd-return-credit-create',
      idempotencyKey: 'idem-return-credit-create',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      actorId: 'cashier-1',
      sourceSaleOrderId: completed.data.order.saleOrderId,
      reason: 'Cần kiểm thêm.',
      lines: [
        {
          sourceSaleLineId: completed.data.lines[0].saleOrderLineId,
          variantId: 'variant-2',
          quantity: 1,
          quantityMilli: 1_000,
          disposition: 'Quarantine',
        },
      ],
    });
    if (!created.ok) throw new Error('Expected return create.');

    const resolved = salesService.resolveReturn({
      commandId: 'cmd-return-credit-resolve',
      idempotencyKey: 'idem-return-credit-resolve',
      returnId: created.data.returnOrder.returnId,
      actorId: 'manager-1',
      lines: [{ returnLineId: created.data.returnOrder.lines[0].returnLineId, disposition: 'KeepQuarantine' }],
      financialAction: {
        treatment: 'CustomerCredit',
        amountVnd: 42_000,
      },
    });

    expect(resolved).toMatchObject({
      ok: true,
      data: {
        returnOrder: { status: 'Resolved', lines: [{ disposition: 'KeepQuarantine' }] },
        customerCredit: {
          customerId: 'customer-1',
          amountVnd: 42_000,
          status: 'Open',
        },
      },
    });
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-2')).toMatchObject({
      availableMilli: 8_000,
      quarantineMilli: 1_000,
      onHandMilli: 9_000,
    });
    expect(financeRepository.listCustomerCredits()).toHaveLength(1);
  });

  it('creates exchange as linked resolved return and completed sale with net settlement', () => {
    const { exchangeVariant, financeRepository, inventoryRepository, salesRepository, salesService, shiftId } = createFixture({
      includeExchangeVariant: true,
    });
    if (exchangeVariant === undefined) throw new Error('Missing exchange variant.');
    const completed = salesService.completePosSale(posCompleteInput({ shiftId, customerId: 'customer-1' }));
    if (!completed.ok) throw new Error('Expected POS completion.');

    const exchanged = salesService.createExchange({
      commandId: 'cmd-exchange-create',
      idempotencyKey: 'idem-exchange-create',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      actorId: 'manager-1',
      cashierId: 'cashier-1',
      cashDrawerId: 'drawer-main',
      shiftId,
      sourceSaleOrderId: completed.data.order.saleOrderId,
      customerId: 'customer-1',
      reason: 'Đổi sang sản phẩm khác.',
      quoteVersion: 'quote-branch-default-185000-0',
      receiptFormat: 'K80',
      returnLines: [
        {
          sourceSaleLineId: completed.data.lines[0].saleOrderLineId,
          variantId: 'variant-2',
          quantity: 1,
          quantityMilli: 1_000,
          disposition: 'Restock',
        },
      ],
      exchangeLines: [
        {
          lineId: 'exchange-line-1',
          variantId: exchangeVariant.variantId,
          unitVersionId: exchangeVariant.unitVersionId,
          quantity: 1,
          quantityMilli: 1_000,
          unitPriceVnd: 185_000,
          lineDiscountVnd: 0,
        },
      ],
      tenders: [{ tenderId: 'tender-exchange-cash', paymentMethodId: 'cash', amountVnd: 143_000 }],
    });

    expect(exchanged).toMatchObject({
      ok: true,
      data: {
        returnOrder: {
          returnType: 'Exchange',
          status: 'Resolved',
          sourceSaleOrderId: completed.data.order.saleOrderId,
        },
        exchangeOrder: {
          source: 'POS',
          status: 'Completed',
          paymentStatus: 'Paid',
          totalVnd: 185_000,
          paidVnd: 185_000,
          receivableVnd: 0,
        },
        netSettlementVnd: 143_000,
        financeResult: { payment: { amountVnd: 143_000 } },
      },
    });
    if (!exchanged.ok) throw new Error('Expected exchange success.');
    expect(salesRepository.getOrder(completed.data.order.saleOrderId)).toMatchObject({
      linkedReturnId: exchanged.data.returnOrder.returnId,
      paymentStatus: 'PartialRefund',
    });
    expect(salesRepository.getReturn(exchanged.data.returnOrder.returnId)).toMatchObject({
      linkedExchangeSaleId: exchanged.data.exchangeOrder.saleOrderId,
    });
    expect(inventoryRepository.listMovements().filter((movement) => movement.movementType === 'SaleIssue')).toHaveLength(2);
    expect(financeRepository.listPayments().filter((payment) => payment.sourceDocument.sourceId === exchanged.data.exchangeOrder.saleOrderId)).toHaveLength(1);
  });

  it('denies fast return without approval and opens warranty case with serial trace', () => {
    const { salesService, shiftId } = createFixture();
    const completed = salesService.completePosSale(posCompleteInput({ shiftId, customerId: 'customer-1' }));
    if (!completed.ok) throw new Error('Expected POS completion.');

    const fastReturn = salesService.createReturn({
      commandId: 'cmd-fast-return',
      idempotencyKey: 'idem-fast-return',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      actorId: 'cashier-1',
      fastReturn: true,
      fastReturnApproved: false,
      reason: 'Không có đơn gốc.',
      lines: [
        {
          variantId: 'variant-2',
          quantity: 1,
          quantityMilli: 1_000,
          disposition: 'Quarantine',
        },
      ],
    });
    expect(fastReturn).toMatchObject({ ok: false, error: { code: 'PERMISSION_DENIED' } });

    const warranty = salesService.openWarranty({
      commandId: 'cmd-warranty-open',
      idempotencyKey: 'idem-warranty-open',
      actorId: 'seller-1',
      customerId: 'customer-1',
      saleOrderId: completed.data.order.saleOrderId,
      saleLineId: completed.data.lines[0].saleOrderLineId,
      variantId: 'variant-2',
      serialId: 'SERIAL-001',
      issue: 'Không lên nguồn.',
      attachmentIds: ['attachment-1'],
    });
    expect(warranty).toMatchObject({
      ok: true,
      data: {
        warrantyCase: {
          saleOrderId: completed.data.order.saleOrderId,
          saleLineId: completed.data.lines[0].saleOrderLineId,
          serialId: 'SERIAL-001',
          status: 'Open',
          attachmentIds: ['attachment-1'],
        },
      },
    });

    if (!warranty.ok) throw new Error('Expected warranty open.');
    const resolved = salesService.transitionWarranty({
      commandId: 'cmd-warranty-transition',
      idempotencyKey: 'idem-warranty-transition',
      warrantyCaseId: warranty.data.warrantyCase.warrantyCaseId,
      actorId: 'manager-1',
      status: 'Resolved',
      resolution: 'Đã đổi sản phẩm.',
    });
    expect(resolved).toMatchObject({ ok: true, data: { warrantyCase: { status: 'Resolved', resolution: 'Đã đổi sản phẩm.' } } });
  });
});

function createFixture(options: { quantityMilli?: number; openShift?: boolean; includeExchangeVariant?: boolean } = {}) {
  const tenantId = 'tenant-default';
  const catalogRepository = createInMemoryCatalogRepository();
  const inventoryRepository = createInMemoryInventoryRepository();
  const financeRepository = createInMemoryFinanceRepository();
  const salesRepository = createInMemorySalesRepository();
  const newId = createSequentialId();
  const now = () => new Date('2026-07-27T08:00:00.000Z');
  const catalogService = createCatalogService({ repository: catalogRepository, tenantId, now, newId });
  const inventoryService = createInventoryService({ repository: inventoryRepository, tenantId, now, newId });
  const financeService = createFinanceService({ repository: financeRepository, tenantId, now, newId });

  catalogService.createProduct({
    productCode: 'P-MILK',
    name: 'Sữa hạt óc chó 1L',
    productType: 'Stocked',
    sku: 'SH-OC-1L',
    barcode: '893000000001',
    defaultUnitId: 'chai',
    unitPriceVnd: 42_000,
  });
  inventoryService.receive({
    commandId: 'cmd-opening',
    idempotencyKey: 'idem-opening',
    warehouseId: 'warehouse-default',
    variantId: 'variant-2',
    quantityMilli: options.quantityMilli ?? 10_000,
    unitCostVnd: 20_000,
    sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
  });
  const exchangeProduct =
    options.includeExchangeVariant === true
      ? catalogService.createProduct({
          productCode: 'P-LAUNDRY',
          name: 'Nước giặt sinh học hương hoa 3,6 kg',
          productType: 'Stocked',
          sku: 'NG-SH-3600',
          barcode: '893000000002',
          defaultUnitId: 'túi',
          unitPriceVnd: 185_000,
        })
      : undefined;
  if (exchangeProduct?.ok) {
    inventoryService.receive({
      commandId: 'cmd-opening-exchange',
      idempotencyKey: 'idem-opening-exchange',
      warehouseId: 'warehouse-default',
      variantId: exchangeProduct.data.defaultVariant.variantId,
      quantityMilli: 5_000,
      unitCostVnd: 90_000,
      sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-exchange' },
    });
  }
  const openShift =
    options.openShift === false
      ? undefined
      : financeService.openShift({
          commandId: 'cmd-shift-open',
          idempotencyKey: 'idem-shift-open',
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          cashDrawerId: 'drawer-main',
          cashierId: 'cashier-1',
          openingCashVnd: 500_000,
        });

  const salesService = createSalesService({
    catalogService,
    commandCoordinator: createCommandCoordinatorForTest(),
    financeRepository,
    financeService,
    inventoryService,
    repository: salesRepository,
    tenantId,
    now,
    newId,
    requireOpenShift: true,
  });

  return {
    financeRepository,
    inventoryRepository,
    inventoryService,
    salesRepository,
    salesService,
    exchangeVariant:
      exchangeProduct?.ok === true
        ? {
            variantId: exchangeProduct.data.defaultVariant.variantId,
            unitVersionId: exchangeProduct.data.defaultUnit.unitVersionId,
          }
        : undefined,
    shiftId: openShift?.ok ? openShift.data.shift.shiftId : undefined,
  };
}

function draftInput() {
  return {
    commandId: 'cmd-draft-save',
    idempotencyKey: 'idem-draft-save',
    branchId: 'branch-default',
    warehouseId: 'warehouse-default',
    cashierId: 'cashier-1',
    lines: [lineInput()],
    tenders: [{ tenderId: 'tender-cash', paymentMethodId: 'cash', amountVnd: 84_000 }],
  };
}

function onlineDraftInput() {
  return {
    ...draftInput(),
    commandId: 'cmd-online-draft',
    idempotencyKey: 'idem-online-draft',
    source: 'ManualOnline' as const,
    customerId: 'customer-1',
    tenders: [],
    recipient: {
      name: 'Trần Thị Hồng Nhung',
      phone: '0909482176',
      address: '12 Nguyễn Trãi, Quận 1',
      shippingMethod: 'Tự giao',
      codVnd: 84_000,
    },
  };
}

function posCompleteInput(overrides: Partial<ReturnType<typeof draftInput> & { cashDrawerId: string; quoteVersion: string; receiptFormat: 'K80'; shiftId?: string }> = {}) {
  return {
    ...draftInput(),
    commandId: 'cmd-pos-complete',
    idempotencyKey: 'idem-pos-complete',
    cashDrawerId: 'drawer-main',
    shiftId: 'shift-5',
    quoteVersion: 'quote-branch-default-84000-0',
    receiptFormat: 'K80' as const,
    ...overrides,
  };
}

function lineInput() {
  return {
    lineId: 'line-1',
    variantId: 'variant-2',
    unitVersionId: 'unit-version-3',
    quantity: 2,
    quantityMilli: 2_000,
    unitPriceVnd: 42_000,
    lineDiscountVnd: 0,
  };
}

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
