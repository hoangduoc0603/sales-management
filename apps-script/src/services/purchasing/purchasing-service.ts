import type { ApiErrorCode } from '@shared/contracts/errors';
import type {
  GoodsReceiptDTO,
  GoodsReceiptLineDTO,
  LandedCostAdjustmentDTO,
  PurchaseOrderDTO,
  PurchaseOrderLineDTO,
  PurchaseCostVarianceDTO,
  PurchasingGoodsReceiptApproveRequest,
  PurchasingGoodsReceiptApproveResponse,
  PurchasingGoodsReceiptCreateRequest,
  PurchasingGoodsReceiptCreateResponse,
  PurchasingLandedCostAdjustRequest,
  PurchasingLandedCostAdjustResponse,
  PurchasingPoApproveRequest,
  PurchasingPoCreateRequest,
  PurchasingPoResponse,
  PurchasingPoSubmitRequest,
  PurchasingSupplierCreateRequest,
  PurchasingSupplierCreateResponse,
  PurchasingSupplierReturnApproveRequest,
  PurchasingSupplierReturnApproveResponse,
  PurchasingSupplierReturnCreateRequest,
  PurchasingSupplierReturnCreateResponse,
  SupplierDTO,
  SupplierReturnDTO,
  SupplierReturnLineDTO,
} from '@shared/contracts/purchasing/purchasing';
import type { FinanceService } from '../finance/finance-service';
import type { InventoryService } from '../inventory/inventory-service';
import type { PurchasingRepository } from '../../repositories/purchasing/purchasing-repository';

type PurchasingServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string } };

export interface PurchasingService {
  createSupplier(input: PurchasingSupplierCreateRequest): PurchasingServiceResult<PurchasingSupplierCreateResponse>;
  disableSupplier(input: { supplierId: string; actorId: string; reason: string }): PurchasingServiceResult<{ supplier: SupplierDTO }>;
  createPurchaseOrder(input: PurchasingPoCreateRequest): PurchasingServiceResult<PurchasingPoResponse>;
  submitPurchaseOrder(input: PurchasingPoSubmitRequest): PurchasingServiceResult<PurchasingPoResponse>;
  approvePurchaseOrder(input: PurchasingPoApproveRequest): PurchasingServiceResult<PurchasingPoResponse>;
  createGoodsReceipt(input: PurchasingGoodsReceiptCreateRequest): PurchasingServiceResult<PurchasingGoodsReceiptCreateResponse>;
  approveGoodsReceipt(input: PurchasingGoodsReceiptApproveRequest): PurchasingServiceResult<PurchasingGoodsReceiptApproveResponse>;
  adjustLandedCost(input: PurchasingLandedCostAdjustRequest): PurchasingServiceResult<PurchasingLandedCostAdjustResponse>;
  createSupplierReturn(input: PurchasingSupplierReturnCreateRequest): PurchasingServiceResult<PurchasingSupplierReturnCreateResponse>;
  approveSupplierReturn(input: PurchasingSupplierReturnApproveRequest): PurchasingServiceResult<PurchasingSupplierReturnApproveResponse>;
}

export interface PurchasingServiceDependencies {
  repository: PurchasingRepository;
  inventoryService: InventoryService;
  financeService: FinanceService;
  tenantId: string;
  now: () => Date;
  newId(prefix: string): string;
}

export function createPurchasingService(deps: PurchasingServiceDependencies): PurchasingService {
  return {
    createSupplier(input) {
      if (deps.repository.findSupplierByCode(input.supplierCode) !== undefined) {
        return failure('DUPLICATE_SUPPLIER_CODE', 'Mã nhà cung cấp đã tồn tại.');
      }

      const now = deps.now().toISOString();
      const supplier: SupplierDTO = {
        supplierId: deps.newId('supplier'),
        tenantId: deps.tenantId,
        supplierCode: input.supplierCode.trim(),
        name: input.name.trim(),
        taxCode: input.taxCode?.trim(),
        status: 'Active',
        paymentTerms: input.paymentTerms ?? { dueDays: 0 },
        contact: input.contact,
        note: input.note,
        createdAt: now,
        updatedAt: now,
      };
      deps.repository.saveSupplier(supplier);

      return { ok: true, data: { supplier } };
    },
    disableSupplier(input) {
      const supplier = deps.repository.getSupplier(input.supplierId);
      if (supplier === undefined) return failure('INVALID_INPUT', 'Không tìm thấy nhà cung cấp.');

      const next: SupplierDTO = {
        ...supplier,
        status: 'Disabled',
        note: input.reason,
        updatedAt: deps.now().toISOString(),
      };
      deps.repository.saveSupplier(next);
      return { ok: true, data: { supplier: next } };
    },
    createPurchaseOrder(input) {
      const supplier = deps.repository.getSupplier(input.supplierId);
      if (supplier === undefined) return failure('INVALID_INPUT', 'Không tìm thấy nhà cung cấp.');
      if (supplier.status !== 'Active') return failure('SUPPLIER_DISABLED', 'Không được tạo PO cho nhà cung cấp ngừng hoạt động.');

      const purchaseOrderId = deps.newId('purchase-order');
      const now = deps.now().toISOString();
      const lines = input.lines.map((line): PurchaseOrderLineDTO => {
        const lineSubtotalVnd = Math.round(line.unitCostVnd * line.quantity);
        return {
          ...line,
          purchaseOrderId,
          purchaseOrderLineId: deps.newId('purchase-order-line'),
          receivedQuantityMilli: 0,
          lineSubtotalVnd,
          lineTotalVnd: Math.max(0, lineSubtotalVnd - line.lineDiscountVnd + line.vatVnd),
        };
      });
      const subtotalVnd = lines.reduce((sum, line) => sum + line.lineSubtotalVnd, 0);
      const discountVnd = lines.reduce((sum, line) => sum + line.lineDiscountVnd, 0);
      const vatVnd = lines.reduce((sum, line) => sum + line.vatVnd, 0);
      const purchaseOrder: PurchaseOrderDTO = {
        purchaseOrderId,
        tenantId: deps.tenantId,
        businessNumber: `PO-${purchaseOrderId.toLocaleUpperCase('vi-VN')}`,
        supplierId: input.supplierId,
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        status: 'Draft',
        expectedDate: input.expectedDate,
        termsSnapshot: supplier.paymentTerms,
        attachmentIds: input.attachmentIds ?? [],
        subtotalVnd,
        discountVnd,
        vatVnd,
        totalVnd: Math.max(0, subtotalVnd - discountVnd + vatVnd),
        note: input.note,
        createdAt: now,
        updatedAt: now,
      };
      deps.repository.savePurchaseOrder(purchaseOrder);
      deps.repository.savePurchaseOrderLines(purchaseOrderId, lines);
      return { ok: true, data: { purchaseOrder, lines } };
    },
    submitPurchaseOrder(input) {
      const current = deps.repository.getPurchaseOrder(input.purchaseOrderId);
      if (current === undefined || current.status !== 'Draft') {
        return failure('PURCHASE_ORDER_STATE_INVALID', 'Chỉ PO Draft mới được gửi duyệt.');
      }

      return savePoStatus(deps, current, 'PendingApproval', { submittedAt: deps.now().toISOString() });
    },
    approvePurchaseOrder(input) {
      const current = deps.repository.getPurchaseOrder(input.purchaseOrderId);
      if (current === undefined || !['Draft', 'PendingApproval'].includes(current.status)) {
        return failure('PURCHASE_ORDER_STATE_INVALID', 'Chỉ PO Draft/PendingApproval mới được duyệt.');
      }

      return savePoStatus(deps, current, 'Approved', { approvedAt: deps.now().toISOString() });
    },
    createGoodsReceipt(input) {
      const supplier = deps.repository.getSupplier(input.supplierId);
      if (supplier === undefined) return failure('INVALID_INPUT', 'Không tìm thấy nhà cung cấp.');
      if (supplier.status !== 'Active') return failure('SUPPLIER_DISABLED', 'Nhà cung cấp đã ngừng hoạt động.');

      const purchaseOrder =
        input.purchaseOrderId === undefined ? undefined : deps.repository.getPurchaseOrder(input.purchaseOrderId);
      const purchaseOrderLines =
        purchaseOrder === undefined ? [] : deps.repository.getPurchaseOrderLines(purchaseOrder.purchaseOrderId);
      if (input.purchaseOrderId !== undefined && (purchaseOrder === undefined || !['Approved', 'PartiallyReceived'].includes(purchaseOrder.status))) {
        return failure('PURCHASE_ORDER_STATE_INVALID', 'Receipt chỉ được tạo từ PO đã duyệt/còn nhận.');
      }

      for (const line of input.lines) {
        if (purchaseOrder === undefined) continue;
        const poLine = purchaseOrderLines.find((candidate) => candidate.purchaseOrderLineId === line.purchaseOrderLineId);
        if (poLine === undefined) return failure('INVALID_INPUT', 'Dòng receipt không khớp PO.');
        if (line.quantityMilli > poLine.quantityMilli - poLine.receivedQuantityMilli) {
          return failure('PURCHASE_RECEIPT_LIMIT_EXCEEDED', 'Số lượng nhận vượt phần còn lại của PO.');
        }
      }

      const goodsReceiptId = deps.newId('goods-receipt');
      const now = deps.now().toISOString();
      const lines = input.lines.map((line): GoodsReceiptLineDTO => {
        const lineSubtotalVnd = Math.round(line.unitCostVnd * line.quantity);
        const lineTotalVnd = Math.max(0, lineSubtotalVnd - line.lineDiscountVnd + line.vatVnd);
        const actualCostVnd = Math.max(0, lineSubtotalVnd - line.lineDiscountVnd + (line.allocatedLandedCostVnd ?? 0));
        return {
          ...line,
          goodsReceiptId,
          goodsReceiptLineId: deps.newId('goods-receipt-line'),
          allocatedLandedCostVnd: line.allocatedLandedCostVnd ?? 0,
          lineSubtotalVnd,
          lineTotalVnd,
          actualCostVnd,
          returnedQuantityMilli: 0,
        };
      });
      const subtotalVnd = lines.reduce((sum, line) => sum + line.lineSubtotalVnd, 0);
      const discountVnd = lines.reduce((sum, line) => sum + line.lineDiscountVnd, 0);
      const vatVnd = lines.reduce((sum, line) => sum + line.vatVnd, 0);
      const landedCostVnd = lines.reduce((sum, line) => sum + (line.allocatedLandedCostVnd ?? 0), 0);
      const goodsReceipt: GoodsReceiptDTO = {
        goodsReceiptId,
        tenantId: deps.tenantId,
        businessNumber: `GR-${goodsReceiptId.toLocaleUpperCase('vi-VN')}`,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId,
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        status: 'Draft',
        receivedDate: input.receivedDate,
        subtotalVnd,
        discountVnd,
        vatVnd,
        landedCostVnd,
        totalPayableVnd: Math.max(0, subtotalVnd - discountVnd + landedCostVnd),
        actorId: input.actorId,
        createdAt: now,
        updatedAt: now,
      };
      deps.repository.saveGoodsReceipt(goodsReceipt);
      deps.repository.saveGoodsReceiptLines(goodsReceiptId, lines);
      return { ok: true, data: { goodsReceipt, lines } };
    },
    approveGoodsReceipt(input) {
      const receipt = deps.repository.getGoodsReceipt(input.goodsReceiptId);
      if (receipt === undefined || receipt.status !== 'Draft') {
        return failure('GOODS_RECEIPT_STATE_INVALID', 'Chỉ receipt Draft mới được duyệt.');
      }

      const lines = deps.repository.getGoodsReceiptLines(receipt.goodsReceiptId);
      const serialError = validateReceiptSerials(lines);
      if (serialError !== undefined) return serialError;

      const inventoryMovements = [];
      for (const line of lines) {
        const unitCostVnd = Math.round((line.actualCostVnd * 1000) / line.quantityMilli);
        const received = deps.inventoryService.receive({
          commandId: `${input.commandId}-${line.goodsReceiptLineId}-receive`,
          idempotencyKey: `${input.idempotencyKey}-${line.goodsReceiptLineId}-receive`,
          warehouseId: receipt.warehouseId,
          variantId: line.variantId,
          quantityMilli: line.quantityMilli,
          unitCostVnd,
          unitVersionId: line.unitVersionId,
          sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: receipt.goodsReceiptId, sourceLineId: line.goodsReceiptLineId },
          actorId: input.approverId,
        });
        if (!received.ok) return failure(received.error.code, received.error.message);
        inventoryMovements.push(received.data);
      }

      const payable = deps.financeService.createPayable({
        branchId: receipt.branchId,
        supplierId: receipt.supplierId,
        sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: receipt.goodsReceiptId },
        amountVnd: receipt.totalPayableVnd,
      });
      const approved: GoodsReceiptDTO = {
        ...receipt,
        status: 'Approved',
        approvedBy: input.approverId,
        approvedAt: deps.now().toISOString(),
        updatedAt: deps.now().toISOString(),
      };
      deps.repository.saveGoodsReceipt(approved);
      updatePoReceivedProjection(deps, approved, lines);

      return { ok: true, data: { goodsReceipt: approved, lines, inventoryMovements, payable } };
    },
    adjustLandedCost(input) {
      const receipt = deps.repository.getGoodsReceipt(input.goodsReceiptId);
      if (receipt === undefined || receipt.status !== 'Approved') {
        return failure('GOODS_RECEIPT_STATE_INVALID', 'Chỉ receipt Approved mới được điều chỉnh chi phí.');
      }
      const allocationTotal = input.allocations.reduce((sum, allocation) => sum + allocation.allocatedCostVnd, 0);
      if (allocationTotal !== input.totalCostVnd) {
        return failure('LANDED_COST_ALLOCATION_MISMATCH', 'Tổng phân bổ chi phí mua không khớp tổng chi phí.');
      }

      const receiptLines = deps.repository.getGoodsReceiptLines(receipt.goodsReceiptId);
      const adjustmentId = deps.newId('landed-cost-adjustment');
      const variances: PurchaseCostVarianceDTO[] = [];
      const inventoryMovements = [];
      let onHandAllocatedVnd = 0;
      let varianceVnd = 0;

      for (const allocation of input.allocations) {
        const receiptLine = receiptLines.find((line) => line.goodsReceiptLineId === allocation.goodsReceiptLineId);
        if (receiptLine === undefined) return failure('INVALID_INPUT', 'Dòng phân bổ không khớp receipt.');

        const balance = deps.inventoryService.getBalanceSummary({ warehouseId: allocation.warehouseId }).rows.find(
          (row) => row.variantId === allocation.variantId,
        );
        const remainingRatio = Math.min(1, Math.max(0, (balance?.onHandMilli ?? 0) / receiptLine.quantityMilli));
        const onHandAmountVnd = Math.round(allocation.allocatedCostVnd * remainingRatio);
        const varianceAmountVnd = allocation.allocatedCostVnd - onHandAmountVnd;
        onHandAllocatedVnd += onHandAmountVnd;
        varianceVnd += varianceAmountVnd;

        if (onHandAmountVnd !== 0) {
          const adjusted = deps.inventoryService.adjustInventoryValue({
            commandId: `${input.commandId}-${receiptLine.goodsReceiptLineId}-value-adjust`,
            idempotencyKey: `${input.idempotencyKey}-${receiptLine.goodsReceiptLineId}-value-adjust`,
            warehouseId: allocation.warehouseId,
            variantId: allocation.variantId,
            amountVnd: onHandAmountVnd,
            sourceDocument: { sourceType: 'ManualAdjustment', sourceId: adjustmentId, sourceLineId: receiptLine.goodsReceiptLineId },
            actorId: input.approverId,
          });
          if (!adjusted.ok) return failure(adjusted.error.code, adjusted.error.message);
          inventoryMovements.push(adjusted.data);
        }

        if (varianceAmountVnd !== 0) {
          const variance: PurchaseCostVarianceDTO = {
            varianceId: deps.newId('purchase-cost-variance'),
            tenantId: deps.tenantId,
            adjustmentId,
            goodsReceiptId: receipt.goodsReceiptId,
            goodsReceiptLineId: receiptLine.goodsReceiptLineId,
            variantId: allocation.variantId,
            warehouseId: allocation.warehouseId,
            amountVnd: varianceAmountVnd,
            effectiveAt: deps.now().toISOString(),
          };
          deps.repository.appendPurchaseCostVariance(variance);
          variances.push(variance);
        }
      }

      const adjustment: LandedCostAdjustmentDTO = {
        adjustmentId,
        tenantId: deps.tenantId,
        goodsReceiptId: receipt.goodsReceiptId,
        adjustmentType: input.adjustmentType,
        status: 'Approved',
        method: input.method,
        totalCostVnd: input.totalCostVnd,
        onHandAllocatedVnd,
        varianceVnd,
        approvedBy: input.approverId,
        createdAt: deps.now().toISOString(),
      };
      deps.repository.saveLandedCostAdjustment(adjustment);

      return { ok: true, data: { adjustment, variances, inventoryMovements } };
    },
    createSupplierReturn(input) {
      const supplier = deps.repository.getSupplier(input.supplierId);
      if (supplier === undefined) return failure('INVALID_INPUT', 'Không tìm thấy nhà cung cấp.');
      const receipt = input.goodsReceiptId === undefined ? undefined : deps.repository.getGoodsReceipt(input.goodsReceiptId);
      if (input.goodsReceiptId !== undefined && (receipt === undefined || receipt.status !== 'Approved')) {
        return failure('GOODS_RECEIPT_STATE_INVALID', 'Supplier return phải tham chiếu receipt Approved.');
      }
      const receiptLines = receipt === undefined ? [] : deps.repository.getGoodsReceiptLines(receipt.goodsReceiptId);

      for (const line of input.lines) {
        const receiptLine = receiptLines.find((candidate) => candidate.goodsReceiptLineId === line.goodsReceiptLineId);
        if (receiptLine === undefined) return failure('INVALID_INPUT', 'Dòng trả NCC không khớp receipt.');
        const alreadyReturned = deps.repository
          .listSupplierReturnsByReceipt(receipt?.goodsReceiptId ?? '')
          .filter((supplierReturn) => supplierReturn.status === 'Approved' || supplierReturn.status === 'Draft')
          .flatMap((supplierReturn) => deps.repository.getSupplierReturnLines(supplierReturn.supplierReturnId))
          .filter((returnLine) => returnLine.goodsReceiptLineId === receiptLine.goodsReceiptLineId)
          .reduce((sum, returnLine) => sum + returnLine.quantityMilli, 0);
        if (line.quantityMilli > receiptLine.quantityMilli - alreadyReturned) {
          return failure('PURCHASE_RECEIPT_LIMIT_EXCEEDED', 'Số lượng trả NCC vượt số đã nhận còn lại.');
        }
      }

      const supplierReturnId = deps.newId('supplier-return');
      const now = deps.now().toISOString();
      const lines = input.lines.map((line): SupplierReturnLineDTO => ({
        ...line,
        supplierReturnId,
        supplierReturnLineId: deps.newId('supplier-return-line'),
        lineTotalVnd: Math.round((line.quantityMilli * line.unitCostVnd) / 1000),
      }));
      const supplierReturn: SupplierReturnDTO = {
        supplierReturnId,
        tenantId: deps.tenantId,
        supplierId: input.supplierId,
        goodsReceiptId: input.goodsReceiptId,
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        status: 'Draft',
        treatment: input.treatment,
        reason: input.reason,
        actorId: input.actorId,
        totalVnd: lines.reduce((sum, line) => sum + line.lineTotalVnd, 0),
        createdAt: now,
        updatedAt: now,
      };
      deps.repository.saveSupplierReturn(supplierReturn);
      deps.repository.saveSupplierReturnLines(supplierReturnId, lines);

      return { ok: true, data: { supplierReturn, lines } };
    },
    approveSupplierReturn(input) {
      const supplierReturn = deps.repository.getSupplierReturn(input.supplierReturnId);
      if (supplierReturn === undefined || supplierReturn.status !== 'Draft') {
        return failure('SUPPLIER_RETURN_STATE_INVALID', 'Chỉ supplier return Draft mới được duyệt.');
      }
      const lines = deps.repository.getSupplierReturnLines(supplierReturn.supplierReturnId);
      const inventoryMovements = [];
      for (const line of lines) {
        const returned = deps.inventoryService.purchaseReturn({
          commandId: `${input.commandId}-${line.supplierReturnLineId}-purchase-return`,
          idempotencyKey: `${input.idempotencyKey}-${line.supplierReturnLineId}-purchase-return`,
          warehouseId: supplierReturn.warehouseId,
          variantId: line.variantId,
          quantityMilli: line.quantityMilli,
          unitCostVnd: line.unitCostVnd,
          sourceDocument: { sourceType: 'SupplierReturn', sourceId: supplierReturn.supplierReturnId, sourceLineId: line.supplierReturnLineId },
          actorId: input.approverId,
        });
        if (!returned.ok) return failure(returned.error.code, returned.error.message);
        inventoryMovements.push(returned.data);
      }

      const payableAdjustment =
        supplierReturn.treatment === 'ReducePayable' && supplierReturn.goodsReceiptId !== undefined
          ? reduceReceiptPayable(deps, supplierReturn)
          : undefined;
      const supplierPrepayment =
        supplierReturn.treatment === 'Refund'
          ? deps.financeService.createSupplierPrepaymentFromSource({
              branchId: supplierReturn.branchId,
              supplierId: supplierReturn.supplierId,
              sourceDocument: { sourceType: 'SupplierReturn', sourceId: supplierReturn.supplierReturnId },
              amountVnd: supplierReturn.totalVnd,
            })
          : undefined;
      const approved: SupplierReturnDTO = {
        ...supplierReturn,
        status: 'Approved',
        approvedBy: input.approverId,
        approvedAt: deps.now().toISOString(),
        updatedAt: deps.now().toISOString(),
      };
      deps.repository.saveSupplierReturn(approved);
      updateReceiptReturnedProjection(deps, approved, lines);

      return { ok: true, data: { supplierReturn: approved, lines, inventoryMovements, payableAdjustment, supplierPrepayment } };
    },
  };
}

function savePoStatus(
  deps: PurchasingServiceDependencies,
  current: PurchaseOrderDTO,
  status: PurchaseOrderDTO['status'],
  timestamps: Partial<Pick<PurchaseOrderDTO, 'submittedAt' | 'approvedAt' | 'cancelledAt'>>,
): PurchasingServiceResult<PurchasingPoResponse> {
  const next: PurchaseOrderDTO = {
    ...current,
    status,
    updatedAt: deps.now().toISOString(),
    ...timestamps,
  };
  deps.repository.savePurchaseOrder(next);
  return { ok: true, data: { purchaseOrder: next, lines: deps.repository.getPurchaseOrderLines(next.purchaseOrderId) } };
}

function updatePoReceivedProjection(
  deps: PurchasingServiceDependencies,
  receipt: GoodsReceiptDTO,
  receiptLines: readonly GoodsReceiptLineDTO[],
): void {
  if (receipt.purchaseOrderId === undefined) return;

  const po = deps.repository.getPurchaseOrder(receipt.purchaseOrderId);
  if (po === undefined) return;

  const poLines = deps.repository.getPurchaseOrderLines(po.purchaseOrderId).map((poLine) => {
    const receivedQuantityMilli = receiptLines
      .filter((receiptLine) => receiptLine.purchaseOrderLineId === poLine.purchaseOrderLineId)
      .reduce((sum, receiptLine) => sum + receiptLine.quantityMilli, poLine.receivedQuantityMilli);
    return { ...poLine, receivedQuantityMilli };
  });
  const allCompleted = poLines.every((line) => line.receivedQuantityMilli >= line.quantityMilli);
  deps.repository.savePurchaseOrderLines(po.purchaseOrderId, poLines);
  deps.repository.savePurchaseOrder({
    ...po,
    status: allCompleted ? 'Completed' : 'PartiallyReceived',
    updatedAt: deps.now().toISOString(),
  });
}

function validateReceiptSerials(
  lines: readonly GoodsReceiptLineDTO[],
): PurchasingServiceResult<never> | undefined {
  const seen = new Set<string>();
  for (const line of lines) {
    if (line.serialIds === undefined) continue;
    if (line.serialIds.length !== line.quantity) {
      return failure('SERIAL_REQUIRED', 'Số lượng serial phải khớp quantity nhận.');
    }

    for (const serialId of line.serialIds) {
      if (seen.has(serialId)) {
        return failure('SERIAL_REQUIRED', 'Serial trong receipt bị trùng.');
      }
      seen.add(serialId);
    }
  }

  return undefined;
}

function updateReceiptReturnedProjection(
  deps: PurchasingServiceDependencies,
  supplierReturn: SupplierReturnDTO,
  returnLines: readonly SupplierReturnLineDTO[],
): void {
  if (supplierReturn.goodsReceiptId === undefined) return;

  const receiptLines = deps.repository.getGoodsReceiptLines(supplierReturn.goodsReceiptId).map((receiptLine) => {
    const returnedQuantityMilli = returnLines
      .filter((returnLine) => returnLine.goodsReceiptLineId === receiptLine.goodsReceiptLineId)
      .reduce((sum, returnLine) => sum + returnLine.quantityMilli, receiptLine.returnedQuantityMilli);
    return { ...receiptLine, returnedQuantityMilli };
  });
  deps.repository.saveGoodsReceiptLines(supplierReturn.goodsReceiptId, receiptLines);
}

function reduceReceiptPayable(
  deps: PurchasingServiceDependencies,
  supplierReturn: SupplierReturnDTO,
) {
  const payable = deps.financeService.findPayableBySource({
    sourceType: 'PurchaseReceipt',
    sourceId: supplierReturn.goodsReceiptId ?? '',
  });
  if (payable === undefined) return undefined;

  return deps.financeService.reducePayable({
    branchId: supplierReturn.branchId,
    supplierId: supplierReturn.supplierId,
    sourceDocument: { sourceType: 'SupplierReturn', sourceId: supplierReturn.supplierReturnId },
    sourceObligationId: payable.obligationId,
    amountVnd: supplierReturn.totalVnd,
  });
}

function failure<T>(code: ApiErrorCode, message: string): PurchasingServiceResult<T> {
  return { ok: false, error: { code, message } };
}
