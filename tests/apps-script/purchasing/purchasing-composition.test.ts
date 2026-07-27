import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

describe('purchasing composition', () => {
  it('exposes supplier, PO, receipt and supplier return through authenticated invoke pipeline', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-27T11:00:00.000Z'),
    });
    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-purchasing',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const supplier = composition.invoke({
      operation: 'purchasing.supplier.create',
      requestId: 'req-supplier-create',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-supplier-create',
        idempotencyKey: 'idem-supplier-create',
        supplierCode: 'NCC-001',
        name: 'Công ty Sữa An Nhiên',
        paymentTerms: { dueDays: 15 },
      },
    });
    expect(supplier).toMatchObject({ ok: true, data: { supplier: { status: 'Active' } } });
    if (!supplier.ok) throw new Error('supplier failed');

    const po = composition.invoke({
      operation: 'purchasing.po.create',
      requestId: 'req-po-create',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-po-create',
        idempotencyKey: 'idem-po-create',
        supplierId: supplier.data.supplier.supplierId,
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        expectedDate: '2026-07-31',
        actorId: 'buyer-1',
        lines: [
          {
            lineId: 'po-line-1',
            variantId: 'variant-milk-1l',
            unitVersionId: 'unit-bottle-v1',
            quantity: 5,
            quantityMilli: 5_000,
            unitCostVnd: 20_000,
            lineDiscountVnd: 0,
            vatVnd: 0,
          },
        ],
      },
    });
    expect(po).toMatchObject({ ok: true, data: { purchaseOrder: { status: 'Draft' } } });
    if (!po.ok) throw new Error('po failed');

    const approvedPo = composition.invoke({
      operation: 'purchasing.po.approve',
      requestId: 'req-po-approve',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-po-approve',
        idempotencyKey: 'idem-po-approve',
        purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
        approverId: 'manager-1',
      },
    });
    expect(approvedPo).toMatchObject({ ok: true, data: { purchaseOrder: { status: 'Approved' } } });

    const receipt = composition.invoke({
      operation: 'purchasing.receipt.create',
      requestId: 'req-receipt-create',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-receipt-create',
        idempotencyKey: 'idem-receipt-create',
        supplierId: supplier.data.supplier.supplierId,
        purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        receivedDate: '2026-07-27',
        actorId: 'receiver-1',
        lines: [
          {
            lineId: 'receipt-line-1',
            purchaseOrderLineId: po.data.lines[0].purchaseOrderLineId,
            variantId: 'variant-milk-1l',
            unitVersionId: 'unit-bottle-v1',
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
    expect(receipt).toMatchObject({ ok: true, data: { goodsReceipt: { status: 'Draft' } } });
    if (!receipt.ok) throw new Error('receipt failed');

    const approvedReceipt = composition.invoke({
      operation: 'purchasing.receipt.approve',
      requestId: 'req-receipt-approve',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-receipt-approve',
        idempotencyKey: 'idem-receipt-approve',
        goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
        approverId: 'manager-1',
      },
    });
    expect(approvedReceipt).toMatchObject({
      ok: true,
      data: {
        goodsReceipt: { status: 'Approved' },
        inventoryMovements: [{ movement: { movementType: 'PurchaseReceipt' } }],
        payable: { originalAmountVnd: 110_000 },
      },
    });
    if (!approvedReceipt.ok) throw new Error('receipt approve failed');

    const supplierReturn = composition.invoke({
      operation: 'purchasing.supplierReturn.create',
      requestId: 'req-supplier-return-create',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-supplier-return-create',
        idempotencyKey: 'idem-supplier-return-create',
        supplierId: supplier.data.supplier.supplierId,
        goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        actorId: 'buyer-1',
        treatment: 'ReducePayable',
        reason: 'Hàng lỗi.',
        lines: [
          {
            lineId: 'return-line-1',
            goodsReceiptLineId: approvedReceipt.data.lines[0].goodsReceiptLineId,
            variantId: 'variant-milk-1l',
            quantity: 1,
            quantityMilli: 1_000,
            unitCostVnd: 22_000,
          },
        ],
      },
    });
    expect(supplierReturn).toMatchObject({ ok: true, data: { supplierReturn: { status: 'Draft' } } });
    if (!supplierReturn.ok) throw new Error('supplier return failed');

    const approvedReturn = composition.invoke({
      operation: 'purchasing.supplierReturn.approve',
      requestId: 'req-supplier-return-approve',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-supplier-return-approve',
        idempotencyKey: 'idem-supplier-return-approve',
        supplierReturnId: supplierReturn.data.supplierReturn.supplierReturnId,
        approverId: 'manager-1',
      },
    });
    expect(approvedReturn).toMatchObject({
      ok: true,
      data: {
        supplierReturn: { status: 'Approved' },
        inventoryMovements: [{ movement: { movementType: 'PurchaseReturn' } }],
        payableAdjustment: { remainingAmountVnd: 88_000 },
      },
    });
  });
});
