import { describe, expect, it } from 'vitest';
import type { ApiResult } from '@shared/contracts/api';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

type ApiComposition = ReturnType<typeof createApiComposition>;

function invokeOk<TData>(
  api: ApiComposition,
  request: Parameters<ApiComposition['invoke']>[0],
): TData {
  const result = api.invoke(request) as ApiResult<TData>;
  if (!result.ok) {
    throw new Error(JSON.stringify(result.error));
  }

  return result.data;
}

describe('release cross-domain acceptance flow', () => {
  it('runs bootstrap -> auth -> scope -> POS catalog -> draft -> checkout -> order -> dashboard', () => {
    const api = createApiComposition({ now: () => new Date('2026-07-27T10:00:00.000Z') });

    const bootstrap = invokeOk<Record<string, unknown>>(api, {
      operation: 'platform.bootstrap.getStatus',
      requestId: 'req-release-bootstrap-status',
      payload: {},
    });
    expect(bootstrap).toMatchObject({
      installed: true,
      tenant: { tenantId: 'tenant-default' },
      branch: { branchId: 'branch-default' },
      warehouse: { warehouseId: 'warehouse-default' },
    });

    const login = invokeOk<{ sessionToken: string; passwordChangeRequired: boolean }>(api, {
      operation: 'platform.auth.login',
      requestId: 'req-release-login-temp',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    expect(login.passwordChangeRequired).toBe(true);

    const changed = invokeOk<{ changed: boolean; sessionRevoked: boolean }>(api, {
      operation: 'platform.auth.changeOwnPassword',
      requestId: 'req-release-change-password',
      sessionToken: login.sessionToken,
      payload: { currentPassword: 'admin123', newPassword: 'secureAdmin123' },
    });
    expect(changed).toEqual({ changed: true, sessionRevoked: true });

    const session = invokeOk<{ sessionToken: string; passwordChangeRequired: boolean }>(api, {
      operation: 'platform.auth.login',
      requestId: 'req-release-login-new',
      payload: { loginId: 'admin', password: 'secureAdmin123' },
    });
    expect(session.passwordChangeRequired).toBe(false);

    const scope = invokeOk<Record<string, unknown>>(api, {
      operation: 'platform.scope.getCurrent',
      requestId: 'req-release-scope',
      sessionToken: session.sessionToken,
      payload: {},
    });
    expect(scope).toMatchObject({
      tenant: { tenantId: 'tenant-default' },
      branches: [{ branchId: 'branch-default' }],
      warehouses: [{ warehouseId: 'warehouse-default' }],
    });

    const product = invokeOk<{
      defaultVariant: { variantId: string; unitPriceVnd: number };
      defaultUnit: { unitVersionId: string };
    }>(api, {
      operation: 'catalog.product.create',
      requestId: 'req-release-product',
      sessionToken: session.sessionToken,
      payload: {
        productCode: 'SP-RELEASE-POS',
        name: 'Sữa hạt óc chó 1L',
        productType: 'Stocked',
        sku: 'SH-RELEASE-POS',
        barcode: '893000000777',
        defaultUnitId: 'chai',
        unitPriceVnd: 42_000,
      },
    });

    invokeOk(api, {
      operation: 'inventory.receive',
      requestId: 'req-release-opening',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-opening',
        idempotencyKey: 'idem-release-opening',
        warehouseId: 'warehouse-default',
        variantId: product.defaultVariant.variantId,
        quantityMilli: 10_000,
        unitCostVnd: 20_000,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-release-pos' },
      },
    });

    const projection = invokeOk<{ variants: readonly { variantId: string }[] }>(api, {
      operation: 'catalog.pos.getProjection',
      requestId: 'req-release-pos-projection',
      sessionToken: session.sessionToken,
      payload: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
    });
    expect(projection.variants).toEqual(
      expect.arrayContaining([expect.objectContaining({ variantId: product.defaultVariant.variantId })]),
    );

    const shift = invokeOk<{ shift: { shiftId: string } }>(api, {
      operation: 'finance.shift.open',
      requestId: 'req-release-shift-open',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-shift-open',
        idempotencyKey: 'idem-release-shift-open',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashDrawerId: 'drawer-main',
        cashierId: 'user-admin',
        openingCashVnd: 500_000,
      },
    });

    const quote = invokeOk<{ quoteVersion: string; totalVnd: number }>(api, {
      operation: 'catalog.quote.preview',
      requestId: 'req-release-quote',
      sessionToken: session.sessionToken,
      payload: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        lines: [
          {
            lineId: 'pos-line-1',
            variantId: product.defaultVariant.variantId,
            unitVersionId: product.defaultUnit.unitVersionId,
            quantity: 2,
          },
        ],
      },
    });
    expect(quote.totalVnd).toBe(84_000);

    const draft = invokeOk<{ order: { saleOrderId: string; status: string } }>(api, {
      operation: 'sales.draft.save',
      requestId: 'req-release-draft-save',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-draft-save',
        idempotencyKey: 'idem-release-draft-save',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'user-admin',
        lines: [
          {
            lineId: 'pos-line-1',
            variantId: product.defaultVariant.variantId,
            unitVersionId: product.defaultUnit.unitVersionId,
            quantity: 2,
            quantityMilli: 2_000,
            unitPriceVnd: product.defaultVariant.unitPriceVnd,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [{ tenderId: 'tender-cash', paymentMethodId: 'cash', amountVnd: quote.totalVnd }],
      },
    });
    expect(draft.order.status).toBe('Draft');

    const checkout = invokeOk<{
      order: { saleOrderId: string; status: string; paymentStatus: string };
      lines: readonly { saleOrderLineId: string }[];
      receipt: { receiptFormat: string };
      inventoryMovements: readonly { movement: { movementType: string } }[];
      financeResult: { payment: { status: string } };
    }>(api, {
      operation: 'sales.pos.complete',
      requestId: 'req-release-pos-complete',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-pos-complete',
        idempotencyKey: 'idem-release-pos-complete',
        draftId: draft.order.saleOrderId,
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'user-admin',
        cashDrawerId: 'drawer-main',
        shiftId: shift.shift.shiftId,
        quoteVersion: quote.quoteVersion,
        receiptFormat: 'K80',
        lines: [
          {
            lineId: 'pos-line-1',
            variantId: product.defaultVariant.variantId,
            unitVersionId: product.defaultUnit.unitVersionId,
            quantity: 2,
            quantityMilli: 2_000,
            unitPriceVnd: product.defaultVariant.unitPriceVnd,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [{ tenderId: 'tender-cash', paymentMethodId: 'cash', amountVnd: quote.totalVnd }],
      },
    });
    expect(checkout).toMatchObject({
      order: { status: 'Completed', paymentStatus: 'Paid' },
      receipt: { receiptFormat: 'K80' },
      financeResult: { payment: { status: 'Approved' } },
    });
    expect(checkout.inventoryMovements.map((item) => item.movement.movementType)).toContain('SaleIssue');

    const detail = invokeOk<{ order: { saleOrderId: string }; receipt: { receiptFormat: string } }>(api, {
      operation: 'sales.order.get',
      requestId: 'req-release-order-detail',
      sessionToken: session.sessionToken,
      payload: { saleOrderId: checkout.order.saleOrderId },
    });
    expect(detail).toMatchObject({
      order: { saleOrderId: checkout.order.saleOrderId },
      receipt: { receiptFormat: 'K80' },
    });

    const dashboard = invokeOk<{
      kpis: readonly { kpiId: string }[];
      decisionQueue: readonly unknown[];
      restricted: { sensitiveFields: readonly string[] };
    }>(api, {
      operation: 'reporting.dashboard.get',
      requestId: 'req-release-dashboard',
      sessionToken: session.sessionToken,
      payload: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        dateRange: { from: '2026-07-26', to: '2026-07-26' },
        requestedSensitiveFields: ['cogsVnd', 'grossProfitVnd'],
      },
    });
    expect(dashboard.kpis.map((kpi) => kpi.kpiId)).toEqual([
      'netRevenue',
      'completedOrders',
      'collected',
      'receivableOverdue',
    ]);
    expect(dashboard.decisionQueue.length).toBeGreaterThan(0);
    expect(dashboard.restricted.sensitiveFields).toEqual(['cogsVnd', 'grossProfitVnd']);
  });

  it('runs manual online order -> confirm -> ship -> receivable payment -> return refund', () => {
    const api = createApiComposition({ now: () => new Date('2026-07-27T11:00:00.000Z') });
    const session = invokeOk<{ sessionToken: string }>(api, {
      operation: 'platform.auth.login',
      requestId: 'req-release-online-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    const product = invokeOk<{
      defaultVariant: { variantId: string; unitPriceVnd: number };
      defaultUnit: { unitVersionId: string };
    }>(api, {
      operation: 'catalog.product.create',
      requestId: 'req-release-online-product',
      sessionToken: session.sessionToken,
      payload: {
        productCode: 'SP-RELEASE-ONLINE',
        name: 'Nước giặt sinh học',
        productType: 'Stocked',
        sku: 'NG-RELEASE-ONLINE',
        barcode: '893000000778',
        defaultUnitId: 'túi',
        unitPriceVnd: 185_000,
      },
    });
    invokeOk(api, {
      operation: 'inventory.receive',
      requestId: 'req-release-online-opening',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-online-opening',
        idempotencyKey: 'idem-release-online-opening',
        warehouseId: 'warehouse-default',
        variantId: product.defaultVariant.variantId,
        quantityMilli: 5_000,
        unitCostVnd: 90_000,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-release-online' },
      },
    });

    const draft = invokeOk<{ order: { saleOrderId: string; status: string } }>(api, {
      operation: 'sales.draft.save',
      requestId: 'req-release-online-draft',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-online-draft',
        idempotencyKey: 'idem-release-online-draft',
        source: 'ManualOnline',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'user-admin',
        customerId: 'customer-release-online',
        recipient: {
          name: 'Trần Thị Hồng Nhung',
          phone: '0909482176',
          address: '12 Nguyễn Trãi',
          shippingMethod: 'Tự giao',
          codVnd: 185_000,
        },
        lines: [
          {
            lineId: 'online-line-1',
            variantId: product.defaultVariant.variantId,
            unitVersionId: product.defaultUnit.unitVersionId,
            quantity: 1,
            quantityMilli: 1_000,
            unitPriceVnd: product.defaultVariant.unitPriceVnd,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [],
      },
    });
    expect(draft.order.status).toBe('Draft');

    const confirmed = invokeOk<{ order: { status: string } }>(api, {
      operation: 'sales.online.confirm',
      requestId: 'req-release-online-confirm',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-online-confirm',
        idempotencyKey: 'idem-release-online-confirm',
        saleOrderId: draft.order.saleOrderId,
        actorId: 'user-admin',
      },
    });
    expect(confirmed.order.status).toBe('Confirmed');

    const shipped = invokeOk<{
      order: { saleOrderId: string; status: string; paymentStatus: string; receivableVnd: number };
      receivable: { obligationId: string; remainingAmountVnd: number };
    }>(api, {
      operation: 'sales.online.ship',
      requestId: 'req-release-online-ship',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-online-ship',
        idempotencyKey: 'idem-release-online-ship',
        saleOrderId: draft.order.saleOrderId,
        actorId: 'user-admin',
      },
    });
    expect(shipped).toMatchObject({
      order: { status: 'Shipped', paymentStatus: 'Unpaid', receivableVnd: 185_000 },
      receivable: { remainingAmountVnd: 185_000 },
    });

    const payment = invokeOk<{ obligations: readonly { obligationId: string; remainingAmountVnd: number; status: string }[] }>(api, {
      operation: 'finance.payment.record',
      requestId: 'req-release-online-payment',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-online-payment',
        idempotencyKey: 'idem-release-online-payment',
        branchId: 'branch-default',
        cashDrawerId: 'drawer-main',
        paymentMethodId: 'cash',
        amountVnd: 185_000,
        payerType: 'Customer',
        payerId: 'customer-release-online',
        sourceDocument: { sourceType: 'SaleOrder', sourceId: shipped.order.saleOrderId },
        allocations: [{ obligationId: shipped.receivable.obligationId, amountVnd: 185_000 }],
        actorId: 'user-admin',
      },
    });
    expect(payment.obligations).toEqual([
      expect.objectContaining({ obligationId: shipped.receivable.obligationId, remainingAmountVnd: 0, status: 'Settled' }),
    ]);

    const returnOrder = invokeOk<{
      returnOrder: { returnId: string; status: string; lines: readonly { returnLineId: string }[] };
    }>(api, {
      operation: 'sales.return.create',
      requestId: 'req-release-online-return',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-online-return',
        idempotencyKey: 'idem-release-online-return',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        actorId: 'user-admin',
        customerId: 'customer-release-online',
        sourceSaleOrderId: shipped.order.saleOrderId,
        reason: 'Khách trả hàng sau giao.',
        lines: [
          {
            sourceSaleLineId: invokeOk<{ lines: readonly { saleOrderLineId: string }[] }>(api, {
              operation: 'sales.order.get',
              requestId: 'req-release-online-order-for-return',
              sessionToken: session.sessionToken,
              payload: { saleOrderId: shipped.order.saleOrderId },
            }).lines[0].saleOrderLineId,
            variantId: product.defaultVariant.variantId,
            quantity: 1,
            quantityMilli: 1_000,
            disposition: 'Quarantine',
          },
        ],
      },
    });
    expect(returnOrder.returnOrder.status).toBe('ReceivedForInspection');

    const resolvedReturn = invokeOk<{
      returnOrder: { status: string };
      financeResult: { payment: { amountVnd: number }; cashTransaction: { transactionType: string; amountVnd: number } };
    }>(api, {
      operation: 'sales.return.resolve',
      requestId: 'req-release-online-return-resolve',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-online-return-resolve',
        idempotencyKey: 'idem-release-online-return-resolve',
        returnId: returnOrder.returnOrder.returnId,
        actorId: 'user-admin',
        lines: [{ returnLineId: returnOrder.returnOrder.lines[0].returnLineId, disposition: 'Restock' }],
        financialAction: {
          treatment: 'Refund',
          amountVnd: 185_000,
          cashDrawerId: 'drawer-main',
          paymentMethodId: 'cash',
          approverId: 'user-admin',
        },
      },
    });
    expect(resolvedReturn).toMatchObject({
      returnOrder: { status: 'Resolved' },
      financeResult: {
        payment: { amountVnd: -185_000 },
        cashTransaction: { transactionType: 'Refund', amountVnd: -185_000 },
      },
    });
  });

  it('runs supplier -> PO -> goods receipt -> payable -> supplier payment allocation', () => {
    const api = createApiComposition({ now: () => new Date('2026-07-27T12:00:00.000Z') });
    const session = invokeOk<{ sessionToken: string }>(api, {
      operation: 'platform.auth.login',
      requestId: 'req-release-purchasing-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    const supplier = invokeOk<{ supplier: { supplierId: string } }>(api, {
      operation: 'purchasing.supplier.create',
      requestId: 'req-release-supplier',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-supplier',
        idempotencyKey: 'idem-release-supplier',
        supplierCode: 'NCC-RELEASE',
        name: 'Công ty Sữa An Nhiên',
        paymentTerms: { dueDays: 15 },
      },
    });
    const po = invokeOk<{ purchaseOrder: { purchaseOrderId: string }; lines: readonly { purchaseOrderLineId: string }[] }>(api, {
      operation: 'purchasing.po.create',
      requestId: 'req-release-po',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-po',
        idempotencyKey: 'idem-release-po',
        supplierId: supplier.supplier.supplierId,
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        expectedDate: '2026-07-31',
        actorId: 'user-admin',
        lines: [
          {
            lineId: 'po-line-1',
            variantId: 'variant-release-po',
            unitVersionId: 'unit-release-po-v1',
            quantity: 5,
            quantityMilli: 5_000,
            unitCostVnd: 20_000,
            lineDiscountVnd: 0,
            vatVnd: 0,
          },
        ],
      },
    });
    invokeOk(api, {
      operation: 'purchasing.po.approve',
      requestId: 'req-release-po-approve',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-po-approve',
        idempotencyKey: 'idem-release-po-approve',
        purchaseOrderId: po.purchaseOrder.purchaseOrderId,
        approverId: 'user-admin',
      },
    });
    const receipt = invokeOk<{ goodsReceipt: { goodsReceiptId: string } }>(api, {
      operation: 'purchasing.receipt.create',
      requestId: 'req-release-receipt',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-receipt',
        idempotencyKey: 'idem-release-receipt',
        supplierId: supplier.supplier.supplierId,
        purchaseOrderId: po.purchaseOrder.purchaseOrderId,
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        receivedDate: '2026-07-27',
        actorId: 'user-admin',
        lines: [
          {
            lineId: 'receipt-line-1',
            purchaseOrderLineId: po.lines[0].purchaseOrderLineId,
            variantId: 'variant-release-po',
            unitVersionId: 'unit-release-po-v1',
            quantity: 5,
            quantityMilli: 5_000,
            unitCostVnd: 20_000,
            lineDiscountVnd: 0,
            vatVnd: 0,
            allocatedLandedCostVnd: 10_000,
          },
        ],
      },
    });
    const approvedReceipt = invokeOk<{ payable: { obligationId: string; remainingAmountVnd: number; status: string } }>(api, {
      operation: 'purchasing.receipt.approve',
      requestId: 'req-release-receipt-approve',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-receipt-approve',
        idempotencyKey: 'idem-release-receipt-approve',
        goodsReceiptId: receipt.goodsReceipt.goodsReceiptId,
        approverId: 'user-admin',
      },
    });
    expect(approvedReceipt.payable).toMatchObject({ remainingAmountVnd: 110_000, status: 'Open' });

    const supplierPayment = invokeOk<{
      payment: { amountVnd: number; payerType: string };
      obligations: readonly { obligationId: string; remainingAmountVnd: number; status: string }[];
      allocations: readonly { obligationId: string; amountVnd: number }[];
    }>(api, {
      operation: 'finance.supplierPayment.record',
      requestId: 'req-release-supplier-payment',
      sessionToken: session.sessionToken,
      payload: {
        commandId: 'cmd-release-supplier-payment',
        idempotencyKey: 'idem-release-supplier-payment',
        branchId: 'branch-default',
        cashDrawerId: 'drawer-main',
        paymentMethodId: 'cash',
        amountVnd: 110_000,
        supplierId: supplier.supplier.supplierId,
        sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: receipt.goodsReceipt.goodsReceiptId },
        allocations: [{ obligationId: approvedReceipt.payable.obligationId, amountVnd: 110_000 }],
        actorId: 'user-admin',
      },
    });
    expect(supplierPayment).toMatchObject({
      payment: { amountVnd: -110_000, payerType: 'Supplier' },
      obligations: [{ obligationId: approvedReceipt.payable.obligationId, remainingAmountVnd: 0, status: 'Settled' }],
      allocations: [{ obligationId: approvedReceipt.payable.obligationId, amountVnd: 110_000 }],
    });
  });

  it('runs backup request -> restore prepare -> restore switch -> health check', () => {
    const api = createApiComposition({ now: () => new Date('2026-07-27T13:00:00.000Z') });
    const session = invokeOk<{ sessionToken: string }>(api, {
      operation: 'platform.auth.login',
      requestId: 'req-release-ops-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    const backup = invokeOk<{ backup: { backupRunId: string; status: string; manifest: { checksum: string } } }>(api, {
      operation: 'operations.backup.request',
      requestId: 'req-release-backup',
      sessionToken: session.sessionToken,
      payload: {
        backupType: 'Manual',
        commandId: 'cmd-release-backup',
        idempotencyKey: 'idem-release-backup',
      },
    });
    expect(backup.backup).toMatchObject({ status: 'Completed', manifest: { checksum: expect.any(String) } });

    const prepared = invokeOk<{ restore: { restoreRunId: string; status: string; writeFrozen: boolean } }>(api, {
      operation: 'operations.restore.prepare',
      requestId: 'req-release-restore-prepare',
      sessionToken: session.sessionToken,
      payload: {
        backupRunId: backup.backup.backupRunId,
        confirmationText: `RESTORE ${backup.backup.backupRunId}`,
        commandId: 'cmd-release-restore-prepare',
        idempotencyKey: 'idem-release-restore-prepare',
      },
    });
    expect(prepared.restore).toMatchObject({ status: 'Prepared', writeFrozen: true });

    const switched = invokeOk<{ restore: { restoreRunId: string; status: string; writeFrozen: boolean; healthResult: string } }>(api, {
      operation: 'operations.restore.switch',
      requestId: 'req-release-restore-switch',
      sessionToken: session.sessionToken,
      payload: {
        restoreRunId: prepared.restore.restoreRunId,
        ownerConfirmationText: `SWITCH ${prepared.restore.restoreRunId}`,
        commandId: 'cmd-release-restore-switch',
        idempotencyKey: 'idem-release-restore-switch',
      },
    });
    expect(switched.restore).toMatchObject({ status: 'Switched', writeFrozen: false, healthResult: 'Ok' });

    const health = invokeOk<{ status: string; checks: readonly { checkType: string; status: string }[] }>(api, {
      operation: 'operations.health.check',
      requestId: 'req-release-health-after-restore',
      sessionToken: session.sessionToken,
      payload: { includeIntegrity: true },
    });
    expect(health).toMatchObject({
      status: 'Ok',
      checks: [expect.objectContaining({ checkType: 'Integrity', status: 'Ok' })],
    });
  });
});
