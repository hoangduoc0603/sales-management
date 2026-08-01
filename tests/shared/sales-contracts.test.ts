import { describe, expect, it } from 'vitest';
import { operationNames } from '../../shared/contracts/platform/operations';
import {
  parseSalesOnlineCancelRequest,
  parseSalesOnlineTransitionRequest,
  parseSalesOrderDetailRequest,
  parseSalesOrderListRequest,
  parseSalesExchangeCreateRequest,
  parseSalesReturnCreateRequest,
  parseSalesReturnResolveRequest,
  parseSalesDraftCancelRequest,
  parseSalesDraftSaveRequest,
  parseSalesPosCompleteRequest,
  parseSalesWarrantyOpenRequest,
  parseSalesWarrantyTransitionRequest,
} from '../../shared/schemas/sales/sales';

describe('sales shared contracts', () => {
  it('registers sales POS and draft operations in the shared operation list', () => {
    expect(operationNames).toContain('sales.draft.save');
    expect(operationNames).toContain('sales.draft.list');
    expect(operationNames).toContain('sales.draft.cancel');
    expect(operationNames).toContain('sales.pos.complete');
  });

  it('registers sales order, online, return and warranty operations', () => {
    expect(operationNames).toEqual(
      expect.arrayContaining([
        'sales.order.list',
        'sales.order.get',
        'sales.online.confirm',
        'sales.online.startPacking',
        'sales.online.ship',
        'sales.online.deliver',
        'sales.online.cancel',
        'sales.return.create',
        'sales.return.resolve',
        'sales.exchange.create',
        'sales.warranty.open',
        'sales.warranty.transition',
      ]),
    );
  });

  it('validates explicit POS draft save payload', () => {
    expect(() =>
      parseSalesDraftSaveRequest({
        commandId: 'cmd-draft-save',
        idempotencyKey: 'idem-draft-save',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'cashier-1',
        lines: [
          {
            lineId: 'line-1',
            variantId: 'variant-milk-1l',
            unitVersionId: 'unit-bottle-v1',
            quantity: 2,
            quantityMilli: 2_000,
            unitPriceVnd: 42_000,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [{ tenderId: 'tender-1', paymentMethodId: 'cash', amountVnd: 84_000 }],
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesDraftSaveRequest({
        commandId: 'cmd-draft-save',
        idempotencyKey: 'idem-draft-save',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'cashier-1',
        lines: [],
        tenders: [{ tenderId: 'tender-1', paymentMethodId: 'cash', amountVnd: 84_000.5 }],
      }),
    ).toThrow();
  });

  it('validates draft cancel command identity', () => {
    expect(() =>
      parseSalesDraftCancelRequest({
        commandId: 'cmd-draft-cancel',
        idempotencyKey: 'idem-draft-cancel',
        draftId: 'sale-draft-1',
        reason: 'Khách hủy giỏ.',
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesDraftCancelRequest({
        idempotencyKey: 'idem-draft-cancel',
        draftId: 'sale-draft-1',
      }),
    ).toThrow();
  });

  it('validates POS complete request with quote, tender and receipt format', () => {
    expect(() =>
      parseSalesPosCompleteRequest({
        commandId: 'cmd-pos-complete',
        idempotencyKey: 'idem-pos-complete',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'cashier-1',
        cashDrawerId: 'drawer-main',
        shiftId: 'shift-open-1',
        customerId: 'customer-1',
        quoteVersion: 'quote-v1',
        receiptFormat: 'K80',
        lines: [
          {
            lineId: 'line-1',
            variantId: 'variant-milk-1l',
            unitVersionId: 'unit-bottle-v1',
            quantity: 2,
            quantityMilli: 2_000,
            unitPriceVnd: 42_000,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [{ tenderId: 'tender-1', paymentMethodId: 'cash', amountVnd: 84_000 }],
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesPosCompleteRequest({
        commandId: 'cmd-pos-complete',
        idempotencyKey: 'idem-pos-complete',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'cashier-1',
        cashDrawerId: 'drawer-main',
        quoteVersion: 'quote-v1',
        receiptFormat: 'A5',
        lines: [
          {
            lineId: 'line-1',
            variantId: 'variant-milk-1l',
            unitVersionId: 'unit-bottle-v1',
            quantity: 0,
            quantityMilli: 0,
            unitPriceVnd: 42_000,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [],
      }),
    ).toThrow();
  });

  it('validates order list/detail query payloads', () => {
    expect(() =>
      parseSalesOrderListRequest({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        statuses: ['Draft', 'Confirmed', 'Packing', 'Shipped', 'Delivered'],
        sources: ['POS', 'ManualOnline'],
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        limit: 50,
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesOrderListRequest({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        statuses: ['Deleted'],
        limit: 0,
      }),
    ).toThrow();

    expect(() => parseSalesOrderDetailRequest({ saleOrderId: 'sale-order-1' })).not.toThrow();
    expect(() => parseSalesOrderDetailRequest({ saleOrderId: '' })).toThrow();
  });

  it('validates online lifecycle command payloads', () => {
    expect(() =>
      parseSalesOnlineTransitionRequest({
        commandId: 'cmd-confirm',
        idempotencyKey: 'idem-confirm',
        saleOrderId: 'sale-order-online',
        actorId: 'seller-1',
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesOnlineCancelRequest({
        commandId: 'cmd-cancel',
        idempotencyKey: 'idem-cancel',
        saleOrderId: 'sale-order-online',
        actorId: 'seller-1',
        reason: 'Khách hủy trước khi giao.',
        depositTreatment: 'KeepCustomerCredit',
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesOnlineCancelRequest({
        commandId: 'cmd-cancel-refund',
        idempotencyKey: 'idem-cancel-refund',
        saleOrderId: 'sale-order-online',
        actorId: 'seller-1',
        reason: 'Khách hủy và hoàn tiền cọc.',
        depositTreatment: 'Refund',
        cashDrawerId: 'drawer-main',
        paymentMethodId: 'cash',
        approverId: 'manager-1',
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesOnlineCancelRequest({
        commandId: 'cmd-cancel-refund',
        idempotencyKey: 'idem-cancel-refund',
        saleOrderId: 'sale-order-online',
        actorId: 'seller-1',
        reason: 'Khách hủy và hoàn tiền cọc.',
        depositTreatment: 'Refund',
        paymentMethodId: 'cash',
        approverId: 'manager-1',
      }),
    ).toThrow();

    expect(() =>
      parseSalesOnlineCancelRequest({
        commandId: 'cmd-cancel',
        idempotencyKey: 'idem-cancel',
        saleOrderId: 'sale-order-online',
        actorId: 'seller-1',
        depositTreatment: 'DeleteDeposit',
      }),
    ).toThrow();
  });

  it('validates return and warranty command payloads', () => {
    expect(() =>
      parseSalesReturnCreateRequest({
        commandId: 'cmd-return-create',
        idempotencyKey: 'idem-return-create',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        actorId: 'cashier-1',
        sourceSaleOrderId: 'sale-order-1',
        reason: 'Hàng lỗi.',
        lines: [
          {
            sourceSaleLineId: 'sale-line-1',
            variantId: 'variant-milk-1l',
            quantity: 1,
            quantityMilli: 1_000,
            disposition: 'Quarantine',
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesReturnCreateRequest({
        commandId: 'cmd-return-create',
        idempotencyKey: 'idem-return-create',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        actorId: 'cashier-1',
        fastReturn: true,
        fastReturnApproved: false,
        reason: 'Không có đơn gốc.',
        lines: [],
      }),
    ).toThrow();

    expect(() =>
      parseSalesReturnResolveRequest({
        commandId: 'cmd-return-resolve',
        idempotencyKey: 'idem-return-resolve',
        returnId: 'return-1',
        actorId: 'manager-1',
        lines: [{ returnLineId: 'return-line-1', disposition: 'Scrap' }],
        financialAction: {
          treatment: 'Refund',
          amountVnd: 42_000,
          cashDrawerId: 'drawer-main',
          paymentMethodId: 'cash',
          approverId: 'manager-1',
        },
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesReturnResolveRequest({
        commandId: 'cmd-return-resolve',
        idempotencyKey: 'idem-return-resolve',
        returnId: 'return-1',
        actorId: 'manager-1',
        lines: [{ returnLineId: 'return-line-1', disposition: 'KeepQuarantine' }],
        financialAction: {
          treatment: 'CustomerCredit',
          amountVnd: 42_000,
        },
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesWarrantyOpenRequest({
        commandId: 'cmd-warranty-open',
        idempotencyKey: 'idem-warranty-open',
        actorId: 'seller-1',
        customerId: 'customer-1',
        saleOrderId: 'sale-order-1',
        saleLineId: 'sale-line-1',
        variantId: 'variant-phone',
        serialId: 'IMEI-001',
        issue: 'Không sạc.',
      }),
    ).not.toThrow();

    expect(() =>
      parseSalesWarrantyTransitionRequest({
        commandId: 'cmd-warranty-close',
        idempotencyKey: 'idem-warranty-close',
        warrantyCaseId: 'warranty-1',
        actorId: 'seller-1',
        status: 'Resolved',
        resolution: 'Đã đổi máy.',
      }),
    ).not.toThrow();
  });

  it('validates exchange command payload with linked return and new sale lines', () => {
    expect(operationNames).toContain('sales.exchange.create');
    expect(() =>
      parseSalesExchangeCreateRequest({
        commandId: 'cmd-exchange-create',
        idempotencyKey: 'idem-exchange-create',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        actorId: 'manager-1',
        cashierId: 'cashier-1',
        cashDrawerId: 'drawer-main',
        sourceSaleOrderId: 'sale-order-1',
        customerId: 'customer-1',
        reason: 'Đổi sang sản phẩm khác.',
        quoteVersion: 'quote-v1',
        receiptFormat: 'K80',
        returnLines: [
          {
            sourceSaleLineId: 'sale-line-1',
            variantId: 'variant-milk-1l',
            quantity: 1,
            quantityMilli: 1_000,
            disposition: 'Restock',
          },
        ],
        exchangeLines: [
          {
            lineId: 'exchange-line-1',
            variantId: 'variant-laundry-36',
            unitVersionId: 'unit-bag-v1',
            quantity: 1,
            quantityMilli: 1_000,
            unitPriceVnd: 185_000,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [{ tenderId: 'tender-cash', paymentMethodId: 'cash', amountVnd: 143_000 }],
      }),
    ).not.toThrow();
  });
});
