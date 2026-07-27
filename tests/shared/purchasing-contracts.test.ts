import { describe, expect, it } from 'vitest';
import { operationNames } from '../../shared/contracts/platform/operations';
import {
  parsePurchasingGoodsReceiptApproveRequest,
  parsePurchasingGoodsReceiptCreateRequest,
  parsePurchasingLandedCostAdjustRequest,
  parsePurchasingPoApproveRequest,
  parsePurchasingPoCreateRequest,
  parsePurchasingPoSubmitRequest,
  parsePurchasingSupplierCreateRequest,
  parsePurchasingSupplierReturnApproveRequest,
  parsePurchasingSupplierReturnCreateRequest,
} from '../../shared/schemas/purchasing/purchasing';

describe('purchasing shared contracts', () => {
  it('registers purchasing operations', () => {
    expect(operationNames).toEqual(
      expect.arrayContaining([
        'purchasing.supplier.create',
        'purchasing.po.create',
        'purchasing.po.submit',
        'purchasing.po.approve',
        'purchasing.receipt.create',
        'purchasing.receipt.approve',
        'purchasing.landedCost.adjust',
        'purchasing.supplierReturn.create',
        'purchasing.supplierReturn.approve',
      ]),
    );
  });

  it('validates supplier and PO lifecycle payloads', () => {
    expect(() =>
      parsePurchasingSupplierCreateRequest({
        commandId: 'cmd-supplier-create',
        idempotencyKey: 'idem-supplier-create',
        supplierCode: 'NCC-001',
        name: 'Công ty Sữa An Nhiên',
        taxCode: '0312345678',
        contact: { phone: '0909000111', email: 'sales@ncc.test' },
        paymentTerms: { dueDays: 15 },
      }),
    ).not.toThrow();

    expect(() =>
      parsePurchasingPoCreateRequest({
        commandId: 'cmd-po-create',
        idempotencyKey: 'idem-po-create',
        supplierId: 'supplier-1',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        expectedDate: '2026-07-31',
        actorId: 'buyer-1',
        lines: [
          {
            lineId: 'line-1',
            variantId: 'variant-milk-1l',
            unitVersionId: 'unit-bottle-v1',
            quantity: 10,
            quantityMilli: 10_000,
            unitCostVnd: 20_000,
            lineDiscountVnd: 0,
            vatVnd: 0,
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      parsePurchasingPoSubmitRequest({
        commandId: 'cmd-po-submit',
        idempotencyKey: 'idem-po-submit',
        purchaseOrderId: 'po-1',
        actorId: 'buyer-1',
      }),
    ).not.toThrow();

    expect(() =>
      parsePurchasingPoApproveRequest({
        commandId: 'cmd-po-approve',
        idempotencyKey: 'idem-po-approve',
        purchaseOrderId: 'po-1',
        approverId: 'manager-1',
      }),
    ).not.toThrow();
  });

  it('validates goods receipt, landed cost and supplier return payloads', () => {
    expect(() =>
      parsePurchasingGoodsReceiptCreateRequest({
        commandId: 'cmd-receipt-create',
        idempotencyKey: 'idem-receipt-create',
        supplierId: 'supplier-1',
        purchaseOrderId: 'po-1',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        receivedDate: '2026-07-27',
        actorId: 'receiver-1',
        lines: [
          {
            lineId: 'receipt-line-1',
            purchaseOrderLineId: 'po-line-1',
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
      }),
    ).not.toThrow();

    expect(() =>
      parsePurchasingGoodsReceiptApproveRequest({
        commandId: 'cmd-receipt-approve',
        idempotencyKey: 'idem-receipt-approve',
        goodsReceiptId: 'receipt-1',
        approverId: 'manager-1',
      }),
    ).not.toThrow();

    expect(() =>
      parsePurchasingLandedCostAdjustRequest({
        commandId: 'cmd-landed-adjust',
        idempotencyKey: 'idem-landed-adjust',
        goodsReceiptId: 'receipt-1',
        adjustmentType: 'LateCost',
        method: 'ByValue',
        totalCostVnd: 300_000,
        approverId: 'manager-1',
        allocations: [
          {
            goodsReceiptLineId: 'receipt-line-1',
            variantId: 'variant-milk-1l',
            warehouseId: 'warehouse-default',
            allocatedCostVnd: 300_000,
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      parsePurchasingSupplierReturnCreateRequest({
        commandId: 'cmd-supplier-return-create',
        idempotencyKey: 'idem-supplier-return-create',
        supplierId: 'supplier-1',
        goodsReceiptId: 'receipt-1',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        actorId: 'buyer-1',
        treatment: 'ReducePayable',
        reason: 'Hàng lỗi.',
        lines: [
          {
            lineId: 'return-line-1',
            goodsReceiptLineId: 'receipt-line-1',
            variantId: 'variant-milk-1l',
            quantity: 1,
            quantityMilli: 1_000,
            unitCostVnd: 22_000,
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      parsePurchasingSupplierReturnApproveRequest({
        commandId: 'cmd-supplier-return-approve',
        idempotencyKey: 'idem-supplier-return-approve',
        supplierReturnId: 'supplier-return-1',
        approverId: 'manager-1',
      }),
    ).not.toThrow();
  });
});
