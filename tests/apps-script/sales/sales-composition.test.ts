import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

describe('sales composition', () => {
  it('exposes POS draft and checkout through authenticated invoke pipeline', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-27T10:00:00.000Z'),
    });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const created = composition.invoke({
      operation: 'catalog.product.create',
      requestId: 'req-product',
      sessionToken: login.data.sessionToken,
      payload: {
        productCode: 'SP-001',
        name: 'Sữa hạt óc chó 1L',
        productType: 'Stocked',
        sku: 'SH-OC-1L',
        barcode: '893000000001',
        defaultUnitId: 'chai',
        unitPriceVnd: 42_000,
      },
    });
    if (!created.ok) throw new Error('product create failed');
    const variant = created.data.defaultVariant;
    const unit = created.data.defaultUnit;

    const received = composition.invoke({
      operation: 'inventory.receive',
      requestId: 'req-opening',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-opening-pos',
        idempotencyKey: 'idem-opening-pos',
        warehouseId: 'warehouse-default',
        variantId: variant.variantId,
        quantityMilli: 10_000,
        unitCostVnd: 20_000,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-pos' },
      },
    });
    if (!received.ok) throw new Error('opening inventory failed');

    const shift = composition.invoke({
      operation: 'finance.shift.open',
      requestId: 'req-shift-open',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-shift-open-pos',
        idempotencyKey: 'idem-shift-open-pos',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashDrawerId: 'drawer-main',
        cashierId: 'user-admin',
        openingCashVnd: 500_000,
      },
    });
    if (!shift.ok) throw new Error('shift open failed');

    const quote = composition.invoke({
      operation: 'catalog.quote.preview',
      requestId: 'req-pos-quote',
      sessionToken: login.data.sessionToken,
      payload: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        lines: [{ lineId: 'line-1', variantId: variant.variantId, unitVersionId: unit.unitVersionId, quantity: 2 }],
      },
    });
    if (!quote.ok) throw new Error('quote failed');

    const draft = composition.invoke({
      operation: 'sales.draft.save',
      requestId: 'req-draft-save',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-draft-save',
        idempotencyKey: 'idem-draft-save',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'user-admin',
        lines: [
          {
            lineId: 'line-1',
            variantId: variant.variantId,
            unitVersionId: unit.unitVersionId,
            quantity: 2,
            quantityMilli: 2_000,
            unitPriceVnd: variant.unitPriceVnd,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [{ tenderId: 'tender-cash', paymentMethodId: 'cash', amountVnd: quote.data.totalVnd }],
      },
    });
    expect(draft).toMatchObject({ ok: true, data: { order: { status: 'Draft' } } });

    const checkout = composition.invoke({
      operation: 'sales.pos.complete',
      requestId: 'req-pos-complete',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-pos-complete',
        idempotencyKey: 'idem-pos-complete',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'user-admin',
        cashDrawerId: 'drawer-main',
        shiftId: shift.data.shift.shiftId,
        quoteVersion: quote.data.quoteVersion,
        receiptFormat: 'K80',
        lines: [
          {
            lineId: 'line-1',
            variantId: variant.variantId,
            unitVersionId: unit.unitVersionId,
            quantity: 2,
            quantityMilli: 2_000,
            unitPriceVnd: variant.unitPriceVnd,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [{ tenderId: 'tender-cash', paymentMethodId: 'cash', amountVnd: quote.data.totalVnd }],
      },
    });

    expect(checkout).toMatchObject({
      ok: true,
      data: {
        order: { status: 'Completed', paymentStatus: 'Paid' },
        receipt: { receiptFormat: 'K80' },
      },
    });
    if (!checkout.ok) throw new Error('checkout failed');

    const exchangeProduct = composition.invoke({
      operation: 'catalog.product.create',
      requestId: 'req-product-exchange',
      sessionToken: login.data.sessionToken,
      payload: {
        productCode: 'SP-EXCHANGE',
        name: 'Nước giặt sinh học hương hoa 3,6 kg',
        productType: 'Stocked',
        sku: 'NG-EXCHANGE',
        barcode: '893000000188',
        defaultUnitId: 'túi',
        unitPriceVnd: 185_000,
      },
    });
    if (!exchangeProduct.ok) throw new Error('exchange product create failed');

    const exchangeOpening = composition.invoke({
      operation: 'inventory.receive',
      requestId: 'req-opening-exchange',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-opening-exchange',
        idempotencyKey: 'idem-opening-exchange',
        warehouseId: 'warehouse-default',
        variantId: exchangeProduct.data.defaultVariant.variantId,
        quantityMilli: 5_000,
        unitCostVnd: 90_000,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-exchange' },
      },
    });
    if (!exchangeOpening.ok) throw new Error('exchange opening failed');

    const exchangeQuote = composition.invoke({
      operation: 'catalog.quote.preview',
      requestId: 'req-exchange-quote',
      sessionToken: login.data.sessionToken,
      payload: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        customerId: 'customer-1',
        lines: [
          {
            lineId: 'exchange-line-1',
            variantId: exchangeProduct.data.defaultVariant.variantId,
            unitVersionId: exchangeProduct.data.defaultUnit.unitVersionId,
            quantity: 1,
          },
        ],
      },
    });
    if (!exchangeQuote.ok) throw new Error('exchange quote failed');

    const exchange = composition.invoke({
      operation: 'sales.exchange.create',
      requestId: 'req-exchange-create',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-exchange-create',
        idempotencyKey: 'idem-exchange-create',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        actorId: 'user-admin',
        cashierId: 'user-admin',
        cashDrawerId: 'drawer-main',
        shiftId: shift.data.shift.shiftId,
        customerId: 'customer-1',
        sourceSaleOrderId: checkout.data.order.saleOrderId,
        reason: 'Đổi sang sản phẩm khác.',
        quoteVersion: exchangeQuote.data.quoteVersion,
        receiptFormat: 'K80',
        returnLines: [
          {
            sourceSaleLineId: checkout.data.lines[0].saleOrderLineId,
            variantId: variant.variantId,
            quantity: 1,
            quantityMilli: 1_000,
            disposition: 'Restock',
          },
        ],
        exchangeLines: [
          {
            lineId: 'exchange-line-1',
            variantId: exchangeProduct.data.defaultVariant.variantId,
            unitVersionId: exchangeProduct.data.defaultUnit.unitVersionId,
            quantity: 1,
            quantityMilli: 1_000,
            unitPriceVnd: exchangeProduct.data.defaultVariant.unitPriceVnd,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [{ tenderId: 'tender-exchange-cash', paymentMethodId: 'cash', amountVnd: exchangeQuote.data.totalVnd - 42_000 }],
      },
    });

    expect(exchange).toMatchObject({
      ok: true,
      data: {
        returnOrder: { returnType: 'Exchange', status: 'Resolved' },
        exchangeOrder: { status: 'Completed', paymentStatus: 'Paid' },
        netSettlementVnd: exchangeQuote.data.totalVnd - 42_000,
      },
    });
  });

  it('exposes sales order list/detail and online lifecycle through authenticated invoke pipeline', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-27T10:00:00.000Z'),
    });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-online',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const product = composition.invoke({
      operation: 'catalog.product.create',
      requestId: 'req-product-online',
      sessionToken: login.data.sessionToken,
      payload: {
        productCode: 'SP-ONLINE',
        name: 'Sữa hạt óc chó 1L',
        productType: 'Stocked',
        sku: 'SH-ONLINE',
        barcode: '893000000099',
        defaultUnitId: 'chai',
        unitPriceVnd: 42_000,
      },
    });
    if (!product.ok) throw new Error('product create failed');

    const received = composition.invoke({
      operation: 'inventory.receive',
      requestId: 'req-opening-online',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-opening-online',
        idempotencyKey: 'idem-opening-online',
        warehouseId: 'warehouse-default',
        variantId: product.data.defaultVariant.variantId,
        quantityMilli: 10_000,
        unitCostVnd: 20_000,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-online' },
      },
    });
    if (!received.ok) throw new Error('opening inventory failed');

    const draft = composition.invoke({
      operation: 'sales.draft.save',
      requestId: 'req-online-draft-save',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-online-draft-save',
        idempotencyKey: 'idem-online-draft-save',
        source: 'ManualOnline',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'user-admin',
        customerId: 'customer-1',
        recipient: {
          name: 'Trần Thị Hồng Nhung',
          phone: '0909482176',
          address: '12 Nguyễn Trãi',
          shippingMethod: 'Tự giao',
          codVnd: 84_000,
        },
        lines: [
          {
            lineId: 'line-1',
            variantId: product.data.defaultVariant.variantId,
            unitVersionId: product.data.defaultUnit.unitVersionId,
            quantity: 2,
            quantityMilli: 2_000,
            unitPriceVnd: product.data.defaultVariant.unitPriceVnd,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [],
      },
    });
    expect(draft).toMatchObject({ ok: true, data: { order: { source: 'ManualOnline', status: 'Draft' } } });
    if (!draft.ok) throw new Error('draft failed');

    const confirmed = composition.invoke({
      operation: 'sales.online.confirm',
      requestId: 'req-online-confirm',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-online-confirm',
        idempotencyKey: 'idem-online-confirm',
        saleOrderId: draft.data.order.saleOrderId,
        actorId: 'user-admin',
      },
    });
    expect(confirmed).toMatchObject({ ok: true, data: { order: { status: 'Confirmed' } } });

    expect(
      composition.invoke({
        operation: 'sales.order.list',
        requestId: 'req-order-list',
        sessionToken: login.data.sessionToken,
        payload: {
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          statuses: ['Confirmed'],
          sources: ['ManualOnline'],
          limit: 20,
        },
      }),
    ).toMatchObject({
      ok: true,
      data: { orders: [expect.objectContaining({ order: expect.objectContaining({ status: 'Confirmed' }) })] },
    });

    expect(
      composition.invoke({
        operation: 'sales.order.get',
        requestId: 'req-order-get',
        sessionToken: login.data.sessionToken,
        payload: { saleOrderId: draft.data.order.saleOrderId },
      }),
    ).toMatchObject({
      ok: true,
      data: { order: { saleOrderId: draft.data.order.saleOrderId }, lines: [expect.objectContaining({ quantityMilli: 2_000 })] },
    });
  });
});
