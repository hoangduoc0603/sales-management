import type { FinancePaymentRecordResponse, ObligationDTO, SupplierPrepaymentDTO } from '../finance/finance';
import type { InventoryMovementResponse } from '../inventory/inventory';

export type SupplierStatus = 'Active' | 'Disabled';
export type PurchaseOrderStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'PartiallyReceived' | 'Completed' | 'Cancelled';
export type GoodsReceiptStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Cancelled';
export type SupplierReturnStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Cancelled';
export type SupplierReturnTreatment = 'ReducePayable' | 'Refund' | 'Replacement';
export type LandedCostAdjustmentStatus = 'Approved' | 'Rejected';
export type LandedCostAdjustmentType = 'ReceiptCost' | 'LateCost';
export type LandedCostAllocationMethod = 'ByValue' | 'ByQuantity' | 'Manual';

export interface PurchasingCommandBase {
  commandId: string;
  idempotencyKey: string;
}

export interface SupplierDTO {
  supplierId: string;
  tenantId: string;
  supplierCode: string;
  name: string;
  taxCode?: string;
  status: SupplierStatus;
  paymentTerms: {
    dueDays: number;
  };
  contact?: {
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchasingSupplierCreateRequest extends PurchasingCommandBase {
  supplierCode: string;
  name: string;
  taxCode?: string;
  paymentTerms?: {
    dueDays: number;
  };
  contact?: SupplierDTO['contact'];
  note?: string;
}

export interface PurchasingSupplierCreateResponse {
  supplier: SupplierDTO;
}

export interface PurchaseOrderLineInputDTO {
  lineId: string;
  variantId: string;
  unitVersionId: string;
  quantity: number;
  quantityMilli: number;
  unitCostVnd: number;
  lineDiscountVnd: number;
  vatVnd: number;
  note?: string;
}

export interface PurchaseOrderLineDTO extends PurchaseOrderLineInputDTO {
  purchaseOrderLineId: string;
  purchaseOrderId: string;
  receivedQuantityMilli: number;
  lineSubtotalVnd: number;
  lineTotalVnd: number;
}

export interface PurchaseOrderDTO {
  purchaseOrderId: string;
  tenantId: string;
  businessNumber: string;
  supplierId: string;
  branchId: string;
  warehouseId: string;
  status: PurchaseOrderStatus;
  expectedDate?: string;
  termsSnapshot?: SupplierDTO['paymentTerms'];
  attachmentIds: readonly string[];
  subtotalVnd: number;
  discountVnd: number;
  vatVnd: number;
  totalVnd: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  cancelledAt?: string;
}

export interface PurchasingPoCreateRequest extends PurchasingCommandBase {
  supplierId: string;
  branchId: string;
  warehouseId: string;
  expectedDate?: string;
  actorId: string;
  note?: string;
  attachmentIds?: readonly string[];
  lines: readonly PurchaseOrderLineInputDTO[];
}

export interface PurchasingPoResponse {
  purchaseOrder: PurchaseOrderDTO;
  lines: readonly PurchaseOrderLineDTO[];
}

export interface PurchasingPoTransitionRequest extends PurchasingCommandBase {
  purchaseOrderId: string;
  actorId?: string;
  approverId?: string;
  reason?: string;
}

export type PurchasingPoSubmitRequest = PurchasingPoTransitionRequest;
export type PurchasingPoApproveRequest = PurchasingPoTransitionRequest;

export interface GoodsReceiptLineInputDTO {
  lineId: string;
  purchaseOrderLineId?: string;
  variantId: string;
  unitVersionId: string;
  quantity: number;
  quantityMilli: number;
  unitCostVnd: number;
  lineDiscountVnd: number;
  vatVnd: number;
  allocatedLandedCostVnd?: number;
  lotId?: string;
  serialIds?: readonly string[];
  note?: string;
}

export interface GoodsReceiptLineDTO extends GoodsReceiptLineInputDTO {
  goodsReceiptLineId: string;
  goodsReceiptId: string;
  lineSubtotalVnd: number;
  lineTotalVnd: number;
  actualCostVnd: number;
  returnedQuantityMilli: number;
}

export interface GoodsReceiptDTO {
  goodsReceiptId: string;
  tenantId: string;
  businessNumber: string;
  supplierId: string;
  purchaseOrderId?: string;
  branchId: string;
  warehouseId: string;
  status: GoodsReceiptStatus;
  receivedDate: string;
  subtotalVnd: number;
  discountVnd: number;
  vatVnd: number;
  landedCostVnd: number;
  totalPayableVnd: number;
  actorId: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface PurchasingGoodsReceiptCreateRequest extends PurchasingCommandBase {
  supplierId: string;
  purchaseOrderId?: string;
  branchId: string;
  warehouseId: string;
  receivedDate: string;
  actorId: string;
  lines: readonly GoodsReceiptLineInputDTO[];
}

export interface PurchasingGoodsReceiptCreateResponse {
  goodsReceipt: GoodsReceiptDTO;
  lines: readonly GoodsReceiptLineDTO[];
}

export interface PurchasingGoodsReceiptApproveRequest extends PurchasingCommandBase {
  goodsReceiptId: string;
  approverId: string;
}

export interface PurchasingGoodsReceiptApproveResponse extends PurchasingGoodsReceiptCreateResponse {
  inventoryMovements: readonly InventoryMovementResponse[];
  payable?: ObligationDTO;
}

export interface LandedCostAllocationInputDTO {
  goodsReceiptLineId: string;
  variantId: string;
  warehouseId: string;
  allocatedCostVnd: number;
}

export interface PurchaseCostVarianceDTO {
  varianceId: string;
  tenantId: string;
  adjustmentId: string;
  goodsReceiptId: string;
  goodsReceiptLineId: string;
  variantId: string;
  warehouseId: string;
  amountVnd: number;
  effectiveAt: string;
}

export interface LandedCostAdjustmentDTO {
  adjustmentId: string;
  tenantId: string;
  goodsReceiptId: string;
  adjustmentType: LandedCostAdjustmentType;
  status: LandedCostAdjustmentStatus;
  method: LandedCostAllocationMethod;
  totalCostVnd: number;
  onHandAllocatedVnd: number;
  varianceVnd: number;
  approvedBy: string;
  createdAt: string;
}

export interface PurchasingLandedCostAdjustRequest extends PurchasingCommandBase {
  goodsReceiptId: string;
  adjustmentType: LandedCostAdjustmentType;
  method: LandedCostAllocationMethod;
  totalCostVnd: number;
  approverId: string;
  allocations: readonly LandedCostAllocationInputDTO[];
}

export interface PurchasingLandedCostAdjustResponse {
  adjustment: LandedCostAdjustmentDTO;
  variances: readonly PurchaseCostVarianceDTO[];
  inventoryMovements: readonly InventoryMovementResponse[];
}

export interface SupplierReturnLineInputDTO {
  lineId: string;
  goodsReceiptLineId: string;
  variantId: string;
  quantity: number;
  quantityMilli: number;
  unitCostVnd: number;
  note?: string;
}

export interface SupplierReturnLineDTO extends SupplierReturnLineInputDTO {
  supplierReturnLineId: string;
  supplierReturnId: string;
  lineTotalVnd: number;
}

export interface SupplierReturnDTO {
  supplierReturnId: string;
  tenantId: string;
  supplierId: string;
  goodsReceiptId?: string;
  branchId: string;
  warehouseId: string;
  status: SupplierReturnStatus;
  treatment: SupplierReturnTreatment;
  reason: string;
  actorId: string;
  approvedBy?: string;
  totalVnd: number;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface PurchasingSupplierReturnCreateRequest extends PurchasingCommandBase {
  supplierId: string;
  goodsReceiptId?: string;
  branchId: string;
  warehouseId: string;
  actorId: string;
  treatment: SupplierReturnTreatment;
  reason: string;
  lines: readonly SupplierReturnLineInputDTO[];
}

export interface PurchasingSupplierReturnCreateResponse {
  supplierReturn: SupplierReturnDTO;
  lines: readonly SupplierReturnLineDTO[];
}

export interface PurchasingSupplierReturnApproveRequest extends PurchasingCommandBase {
  supplierReturnId: string;
  approverId: string;
}

export interface PurchasingSupplierReturnApproveResponse extends PurchasingSupplierReturnCreateResponse {
  inventoryMovements: readonly InventoryMovementResponse[];
  financeResult?: FinancePaymentRecordResponse;
  payableAdjustment?: ObligationDTO;
  supplierPrepayment?: SupplierPrepaymentDTO;
}
