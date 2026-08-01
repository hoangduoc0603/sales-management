import { describe, expect, it } from 'vitest';
import { createInMemoryFinanceRepository } from '../../../apps-script/src/repositories/finance/finance-repository';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createInMemoryPurchasingRepository } from '../../../apps-script/src/repositories/purchasing/purchasing-repository';
import { createFinanceService } from '../../../apps-script/src/services/finance/finance-service';
import { createInventoryService } from '../../../apps-script/src/services/inventory/inventory-service';
import { createPurchasingService } from '../../../apps-script/src/services/purchasing/purchasing-service';

describe('PurchasingService supplier and PO lifecycle', () => {
  it('creates supplier with unique code and blocks disabled supplier for new PO', () => {
    const { service } = createFixture();
    const created = service.createSupplier(supplierInput());

    expect(created).toMatchObject({
      ok: true,
      data: { supplier: { supplierCode: 'NCC-001', status: 'Active', paymentTerms: { dueDays: 15 } } },
    });
    expect(service.createSupplier({ ...supplierInput(), commandId: 'cmd-supplier-dup', idempotencyKey: 'idem-supplier-dup' })).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE_SUPPLIER_CODE' },
    });
    if (!created.ok) throw new Error('Expected supplier create success.');

    service.disableSupplier({ supplierId: created.data.supplier.supplierId, actorId: 'admin-1', reason: 'Ngừng mua.' });
    expect(
      service.createPurchaseOrder({
        ...poInput(created.data.supplier.supplierId),
        commandId: 'cmd-po-disabled',
        idempotencyKey: 'idem-po-disabled',
      }),
    ).toMatchObject({ ok: false, error: { code: 'SUPPLIER_DISABLED' } });
  });

  it('moves PO through approval without creating inventory movement or payable', () => {
    const { financeRepository, inventoryRepository, service } = createFixture();
    const supplier = service.createSupplier(supplierInput());
    if (!supplier.ok) throw new Error('Expected supplier create success.');

    const po = service.createPurchaseOrder(poInput(supplier.data.supplier.supplierId));
    expect(po).toMatchObject({
      ok: true,
      data: {
        purchaseOrder: {
          status: 'Draft',
          supplierId: supplier.data.supplier.supplierId,
          totalVnd: 200_000,
        },
        lines: [{ quantityMilli: 10_000, receivedQuantityMilli: 0 }],
      },
    });
    if (!po.ok) throw new Error('Expected PO create success.');

    const submitted = service.submitPurchaseOrder({
      commandId: 'cmd-po-submit',
      idempotencyKey: 'idem-po-submit',
      purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
      actorId: 'buyer-1',
    });
    expect(submitted).toMatchObject({ ok: true, data: { purchaseOrder: { status: 'PendingApproval' } } });

    const approved = service.approvePurchaseOrder({
      commandId: 'cmd-po-approve',
      idempotencyKey: 'idem-po-approve',
      purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
      approverId: 'manager-1',
    });
    expect(approved).toMatchObject({ ok: true, data: { purchaseOrder: { status: 'Approved' } } });
    expect(inventoryRepository.listMovements()).toHaveLength(0);
    expect(financeRepository.listObligations()).toHaveLength(0);
  });

  it('approves partial goods receipt from PO with inventory receive, moving cost and payable', () => {
    const { financeRepository, inventoryRepository, repository, service } = createFixture();
    const supplier = service.createSupplier(supplierInput());
    if (!supplier.ok) throw new Error('Expected supplier create success.');
    const po = service.createPurchaseOrder(poInput(supplier.data.supplier.supplierId));
    if (!po.ok) throw new Error('Expected PO create success.');
    const approvedPo = service.approvePurchaseOrder({
      commandId: 'cmd-po-approve',
      idempotencyKey: 'idem-po-approve',
      purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
      approverId: 'manager-1',
    });
    expect(approvedPo).toMatchObject({ ok: true });

    const receipt = service.createGoodsReceipt({
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
    });
    expect(receipt).toMatchObject({ ok: true, data: { goodsReceipt: { status: 'Draft', totalPayableVnd: 110_000 } } });
    if (!receipt.ok) throw new Error('Expected receipt create success.');

    const approvedReceipt = service.approveGoodsReceipt({
      commandId: 'cmd-receipt-approve',
      idempotencyKey: 'idem-receipt-approve',
      goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
      approverId: 'manager-1',
    });

    expect(approvedReceipt).toMatchObject({
      ok: true,
      data: {
        goodsReceipt: { status: 'Approved' },
        inventoryMovements: [
          {
            movement: {
              movementType: 'PurchaseReceipt',
              quantityMilli: 5_000,
              unitCostVnd: 22_000,
              totalCostVnd: 110_000,
            },
          },
        ],
        payable: {
          obligationType: 'Payable',
          partyId: supplier.data.supplier.supplierId,
          originalAmountVnd: 110_000,
        },
      },
    });
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-milk-1l')).toMatchObject({
      onHandMilli: 5_000,
      availableMilli: 5_000,
      inventoryValueVnd: 110_000,
    });
    expect(financeRepository.listObligations()).toHaveLength(1);
    expect(repository.getPurchaseOrder(po.data.purchaseOrder.purchaseOrderId)).toMatchObject({ status: 'PartiallyReceived' });
    expect(repository.getPurchaseOrderLines(po.data.purchaseOrder.purchaseOrderId)[0]).toMatchObject({ receivedQuantityMilli: 5_000 });
  });

  it('blocks receipt approval when serial count does not match received quantity', () => {
    const { inventoryRepository, service } = createFixture();
    const supplier = service.createSupplier(supplierInput());
    if (!supplier.ok) throw new Error('Expected supplier create success.');

    const receipt = service.createGoodsReceipt({
      commandId: 'cmd-receipt-serial-create',
      idempotencyKey: 'idem-receipt-serial-create',
      supplierId: supplier.data.supplier.supplierId,
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      receivedDate: '2026-07-27',
      actorId: 'receiver-1',
      lines: [
        {
          lineId: 'receipt-line-serial',
          variantId: 'variant-serial-phone',
          unitVersionId: 'unit-piece-v1',
          quantity: 2,
          quantityMilli: 2_000,
          unitCostVnd: 1_000_000,
          lineDiscountVnd: 0,
          vatVnd: 0,
          serialIds: ['IMEI-001'],
        },
      ],
    });
    if (!receipt.ok) throw new Error('Expected receipt create success.');

    const approved = service.approveGoodsReceipt({
      commandId: 'cmd-receipt-serial-approve',
      idempotencyKey: 'idem-receipt-serial-approve',
      goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
      approverId: 'manager-1',
    });

    expect(approved).toMatchObject({ ok: false, error: { code: 'SERIAL_REQUIRED' } });
    expect(inventoryRepository.listMovements()).toHaveLength(0);
  });

  it('splits late landed cost between remaining on-hand value and purchase cost variance', () => {
    const { inventoryRepository, inventoryService, service } = createFixture();
    const supplier = service.createSupplier(supplierInput());
    if (!supplier.ok) throw new Error('Expected supplier create success.');
    const po = service.createPurchaseOrder(poInput(supplier.data.supplier.supplierId));
    if (!po.ok) throw new Error('Expected PO create success.');
    service.approvePurchaseOrder({
      commandId: 'cmd-po-approve',
      idempotencyKey: 'idem-po-approve',
      purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
      approverId: 'manager-1',
    });
    const receipt = service.createGoodsReceipt({
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
    });
    if (!receipt.ok) throw new Error('Expected receipt create success.');
    const approvedReceipt = service.approveGoodsReceipt({
      commandId: 'cmd-receipt-approve',
      idempotencyKey: 'idem-receipt-approve',
      goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
      approverId: 'manager-1',
    });
    if (!approvedReceipt.ok) throw new Error('Expected receipt approve success.');
    const receiptLine = approvedReceipt.data.lines[0];

    inventoryService.issueForSale({
      commandId: 'cmd-issue-sold',
      idempotencyKey: 'idem-issue-sold',
      warehouseId: 'warehouse-default',
      variantId: 'variant-milk-1l',
      quantityMilli: 2_000,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-before-late-cost' },
    });

    const adjusted = service.adjustLandedCost({
      commandId: 'cmd-late-cost',
      idempotencyKey: 'idem-late-cost',
      goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
      adjustmentType: 'LateCost',
      method: 'ByValue',
      totalCostVnd: 50_000,
      approverId: 'manager-1',
      allocations: [
        {
          goodsReceiptLineId: receiptLine.goodsReceiptLineId,
          variantId: 'variant-milk-1l',
          warehouseId: 'warehouse-default',
          allocatedCostVnd: 50_000,
        },
      ],
    });

    expect(adjusted).toMatchObject({
      ok: true,
      data: {
        adjustment: {
          totalCostVnd: 50_000,
          onHandAllocatedVnd: 30_000,
          varianceVnd: 20_000,
        },
        variances: [{ amountVnd: 20_000 }],
        inventoryMovements: [{ movement: { totalCostVnd: 30_000, quantityMilli: 0 } }],
      },
    });
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-milk-1l')).toMatchObject({
      onHandMilli: 3_000,
      availableMilli: 3_000,
      inventoryValueVnd: 96_000,
    });
  });

  it('approves supplier return within received quantity and reduces inventory plus payable', () => {
    const { financeRepository, inventoryRepository, service } = createFixture();
    const supplier = service.createSupplier(supplierInput());
    if (!supplier.ok) throw new Error('Expected supplier create success.');
    const po = service.createPurchaseOrder(poInput(supplier.data.supplier.supplierId));
    if (!po.ok) throw new Error('Expected PO create success.');
    service.approvePurchaseOrder({
      commandId: 'cmd-po-approve',
      idempotencyKey: 'idem-po-approve',
      purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
      approverId: 'manager-1',
    });
    const receipt = service.createGoodsReceipt({
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
    });
    if (!receipt.ok) throw new Error('Expected receipt create success.');
    const approvedReceipt = service.approveGoodsReceipt({
      commandId: 'cmd-receipt-approve',
      idempotencyKey: 'idem-receipt-approve',
      goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
      approverId: 'manager-1',
    });
    if (!approvedReceipt.ok) throw new Error('Expected receipt approve success.');
    const receiptLine = approvedReceipt.data.lines[0];

    const blocked = service.createSupplierReturn({
      commandId: 'cmd-return-over',
      idempotencyKey: 'idem-return-over',
      supplierId: supplier.data.supplier.supplierId,
      goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      actorId: 'buyer-1',
      treatment: 'ReducePayable',
      reason: 'Vượt số lượng.',
      lines: [
        {
          lineId: 'return-line-over',
          goodsReceiptLineId: receiptLine.goodsReceiptLineId,
          variantId: 'variant-milk-1l',
          quantity: 6,
          quantityMilli: 6_000,
          unitCostVnd: 22_000,
        },
      ],
    });
    expect(blocked).toMatchObject({ ok: false, error: { code: 'PURCHASE_RECEIPT_LIMIT_EXCEEDED' } });

    const created = service.createSupplierReturn({
      commandId: 'cmd-return-create',
      idempotencyKey: 'idem-return-create',
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
          goodsReceiptLineId: receiptLine.goodsReceiptLineId,
          variantId: 'variant-milk-1l',
          quantity: 1,
          quantityMilli: 1_000,
          unitCostVnd: 22_000,
        },
      ],
    });
    expect(created).toMatchObject({ ok: true, data: { supplierReturn: { status: 'Draft', totalVnd: 22_000 } } });
    if (!created.ok) throw new Error('Expected supplier return create success.');

    const approved = service.approveSupplierReturn({
      commandId: 'cmd-return-approve',
      idempotencyKey: 'idem-return-approve',
      supplierReturnId: created.data.supplierReturn.supplierReturnId,
      approverId: 'manager-1',
    });

    expect(approved).toMatchObject({
      ok: true,
      data: {
        supplierReturn: { status: 'Approved', treatment: 'ReducePayable' },
        inventoryMovements: [{ movement: { movementType: 'PurchaseReturn', quantityMilli: -1_000, totalCostVnd: -22_000 } }],
        payableAdjustment: { remainingAmountVnd: 88_000 },
      },
    });
    expect(inventoryRepository.getBalance('warehouse-default', 'variant-milk-1l')).toMatchObject({
      onHandMilli: 4_000,
      availableMilli: 4_000,
      inventoryValueVnd: 88_000,
    });
    expect(financeRepository.listObligations()[0]).toMatchObject({ remainingAmountVnd: 88_000 });
  });

  it('approves supplier return refund as supplier prepayment without reducing payable', () => {
    const { financeRepository, service } = createFixture();
    const fixture = approveReceiptForSupplierReturn(service);
    const created = service.createSupplierReturn({
      commandId: 'cmd-return-refund-create',
      idempotencyKey: 'idem-return-refund-create',
      supplierId: fixture.supplierId,
      goodsReceiptId: fixture.goodsReceiptId,
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      actorId: 'buyer-1',
      treatment: 'Refund',
      reason: 'NCC hoàn tiền sau khi nhận hàng lỗi.',
      lines: [
        {
          lineId: 'return-refund-line-1',
          goodsReceiptLineId: fixture.goodsReceiptLineId,
          variantId: 'variant-milk-1l',
          quantity: 1,
          quantityMilli: 1_000,
          unitCostVnd: 22_000,
        },
      ],
    });
    if (!created.ok) throw new Error('Expected supplier return create success.');

    const approved = service.approveSupplierReturn({
      commandId: 'cmd-return-refund-approve',
      idempotencyKey: 'idem-return-refund-approve',
      supplierReturnId: created.data.supplierReturn.supplierReturnId,
      approverId: 'manager-1',
    });

    expect(approved).toMatchObject({
      ok: true,
      data: {
        supplierReturn: { status: 'Approved', treatment: 'Refund' },
        supplierPrepayment: {
          supplierId: fixture.supplierId,
          sourceDocument: { sourceType: 'SupplierReturn', sourceId: created.data.supplierReturn.supplierReturnId },
          amountVnd: 22_000,
          consumedAmountVnd: 0,
          status: 'Open',
        },
      },
    });
    expect(financeRepository.listObligations()[0]).toMatchObject({ remainingAmountVnd: 110_000 });
    expect(financeRepository.listSupplierPrepayments()).toHaveLength(1);
  });

  it('approves supplier return replacement without payable adjustment or supplier prepayment', () => {
    const { financeRepository, service } = createFixture();
    const fixture = approveReceiptForSupplierReturn(service);
    const created = service.createSupplierReturn({
      commandId: 'cmd-return-replacement-create',
      idempotencyKey: 'idem-return-replacement-create',
      supplierId: fixture.supplierId,
      goodsReceiptId: fixture.goodsReceiptId,
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      actorId: 'buyer-1',
      treatment: 'Replacement',
      reason: 'Đổi sang hàng thay thế.',
      lines: [
        {
          lineId: 'return-replacement-line-1',
          goodsReceiptLineId: fixture.goodsReceiptLineId,
          variantId: 'variant-milk-1l',
          quantity: 1,
          quantityMilli: 1_000,
          unitCostVnd: 22_000,
        },
      ],
    });
    if (!created.ok) throw new Error('Expected supplier return create success.');

    const approved = service.approveSupplierReturn({
      commandId: 'cmd-return-replacement-approve',
      idempotencyKey: 'idem-return-replacement-approve',
      supplierReturnId: created.data.supplierReturn.supplierReturnId,
      approverId: 'manager-1',
    });

    expect(approved).toMatchObject({
      ok: true,
      data: {
        supplierReturn: { status: 'Approved', treatment: 'Replacement' },
        inventoryMovements: [{ movement: { movementType: 'PurchaseReturn', quantityMilli: -1_000, totalCostVnd: -22_000 } }],
      },
    });
    expect(approved.ok && approved.data.payableAdjustment).toBeUndefined();
    expect(approved.ok && approved.data.supplierPrepayment).toBeUndefined();
    expect(financeRepository.listObligations()[0]).toMatchObject({ remainingAmountVnd: 110_000 });
    expect(financeRepository.listSupplierPrepayments()).toHaveLength(0);
  });
});

function createFixture() {
  const tenantId = 'tenant-default';
  const repository = createInMemoryPurchasingRepository();
  const inventoryRepository = createInMemoryInventoryRepository();
  const financeRepository = createInMemoryFinanceRepository();
  const newId = createSequentialId();
  const now = () => new Date('2026-07-27T09:00:00.000Z');
  const inventoryService = createInventoryService({ repository: inventoryRepository, tenantId, now, newId });
  const financeService = createFinanceService({ repository: financeRepository, tenantId, now, newId });
  const service = createPurchasingService({
    financeService,
    inventoryService,
    repository,
    tenantId,
    now,
    newId,
  });

  return { financeRepository, inventoryRepository, inventoryService, repository, service };
}

function approveReceiptForSupplierReturn(service: ReturnType<typeof createFixture>['service']) {
  const supplier = service.createSupplier({ ...supplierInput(), commandId: 'cmd-supplier-for-return', idempotencyKey: 'idem-supplier-for-return' });
  if (!supplier.ok) throw new Error('Expected supplier create success.');
  const po = service.createPurchaseOrder({
    ...poInput(supplier.data.supplier.supplierId),
    commandId: 'cmd-po-for-return',
    idempotencyKey: 'idem-po-for-return',
  });
  if (!po.ok) throw new Error('Expected PO create success.');
  service.approvePurchaseOrder({
    commandId: 'cmd-po-for-return-approve',
    idempotencyKey: 'idem-po-for-return-approve',
    purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
    approverId: 'manager-1',
  });
  const receipt = service.createGoodsReceipt({
    commandId: 'cmd-receipt-for-return-create',
    idempotencyKey: 'idem-receipt-for-return-create',
    supplierId: supplier.data.supplier.supplierId,
    purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
    branchId: 'branch-default',
    warehouseId: 'warehouse-default',
    receivedDate: '2026-07-27',
    actorId: 'receiver-1',
    lines: [
      {
        lineId: 'receipt-for-return-line-1',
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
  });
  if (!receipt.ok) throw new Error('Expected receipt create success.');
  const approvedReceipt = service.approveGoodsReceipt({
    commandId: 'cmd-receipt-for-return-approve',
    idempotencyKey: 'idem-receipt-for-return-approve',
    goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
    approverId: 'manager-1',
  });
  if (!approvedReceipt.ok) throw new Error('Expected receipt approve success.');

  return {
    supplierId: supplier.data.supplier.supplierId,
    goodsReceiptId: approvedReceipt.data.goodsReceipt.goodsReceiptId,
    goodsReceiptLineId: approvedReceipt.data.lines[0].goodsReceiptLineId,
  };
}

function supplierInput() {
  return {
    commandId: 'cmd-supplier-create',
    idempotencyKey: 'idem-supplier-create',
    supplierCode: 'NCC-001',
    name: 'Công ty Sữa An Nhiên',
    paymentTerms: { dueDays: 15 },
  };
}

function poInput(supplierId: string) {
  return {
    commandId: 'cmd-po-create',
    idempotencyKey: 'idem-po-create',
    supplierId,
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
  };
}

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
