import type { ApiErrorCode } from '../errors';
import type { CustomerCreditDTO, FinancePaymentRecordResponse, ObligationDTO } from '../finance/finance';
import type { InventoryMovementResponse } from '../inventory/inventory';

export type SaleOrderSource = 'POS' | 'ManualOnline';
export type SaleOrderStatus =
  | 'Draft'
  | 'Completed'
  | 'Confirmed'
  | 'Packing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';
export type SalePaymentStatus = 'Unpaid' | 'Partial' | 'Paid' | 'PartialRefund' | 'FullRefund';
export type ReceiptFormat = 'K80' | 'A4';
export type SalesReturnStatus = 'Draft' | 'ReceivedForInspection' | 'Resolved' | 'Cancelled';
export type SalesReturnType = 'SourceReturn' | 'FastReturn' | 'Exchange';
export type SalesReturnDisposition = 'Quarantine' | 'Restock' | 'KeepQuarantine' | 'Scrap';
export type SalesDepositTreatment = 'KeepCustomerCredit' | 'Refund';
export type WarrantyCaseStatus = 'Open' | 'InReview' | 'Resolved' | 'Rejected' | 'Cancelled';

export interface SalesCommandBase {
  commandId: string;
  idempotencyKey: string;
}

export interface SaleOrderLineInputDTO {
  lineId: string;
  variantId: string;
  unitVersionId: string;
  quantity: number;
  quantityMilli: number;
  unitPriceVnd: number;
  lineDiscountVnd: number;
  lotId?: string;
  serialId?: string;
  note?: string;
}

export interface SaleTenderDraftInputDTO {
  tenderId: string;
  paymentMethodId: string;
  amountVnd: number;
  cashDrawerId?: string;
}

export interface SaleOrderLineDTO extends SaleOrderLineInputDTO {
  saleOrderLineId: string;
  sku?: string;
  displayName: string;
  unitName: string;
  lineSubtotalVnd: number;
  lineTotalVnd: number;
  costVnd?: number;
}

export interface SaleTenderDraftDTO extends SaleTenderDraftInputDTO {
  tenderDraftId: string;
  saleOrderId: string;
}

export interface SaleOrderDTO {
  saleOrderId: string;
  tenantId: string;
  businessNumber: string;
  source: SaleOrderSource;
  branchId: string;
  warehouseId: string;
  status: SaleOrderStatus;
  paymentStatus: SalePaymentStatus;
  customerId?: string;
  cashierId: string;
  salesPersonId?: string;
  note?: string;
  subtotalVnd: number;
  discountVnd: number;
  taxVnd: number;
  shippingFeeVnd: number;
  totalVnd: number;
  paidVnd: number;
  receivableVnd: number;
  quoteVersion?: string;
  draftVersion: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  confirmedAt?: string;
  packingAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  linkedReturnId?: string;
  linkedExchangeSaleId?: string;
  recipient?: {
    name?: string;
    phone?: string;
    address?: string;
    shippingMethod?: string;
    externalReference?: string;
    codVnd?: number;
  };
}

export interface ReceiptSnapshotDTO {
  receiptId: string;
  saleOrderId: string;
  businessNumber: string;
  receiptFormat: ReceiptFormat;
  createdAt: string;
  branchId: string;
  warehouseId: string;
  cashierId: string;
  customerId?: string;
  lines: readonly SaleOrderLineDTO[];
  totals: {
    subtotalVnd: number;
    discountVnd: number;
    taxVnd: number;
    shippingFeeVnd: number;
    totalVnd: number;
    paidVnd: number;
    receivableVnd: number;
    changeVnd: number;
  };
}

export interface SalesDraftSaveRequest extends SalesCommandBase {
  draftId?: string;
  source?: SaleOrderSource;
  branchId: string;
  warehouseId: string;
  cashierId: string;
  customerId?: string;
  salesPersonId?: string;
  note?: string;
  quoteVersion?: string;
  recipient?: SaleOrderDTO['recipient'];
  lines: readonly SaleOrderLineInputDTO[];
  tenders: readonly SaleTenderDraftInputDTO[];
}

export interface SalesDraftOpenRequest {
  branchId: string;
  warehouseId: string;
}

export interface SalesDraftCancelRequest extends SalesCommandBase {
  draftId: string;
  reason?: string;
}

export interface SalesPosCompleteRequest extends SalesCommandBase {
  draftId?: string;
  branchId: string;
  warehouseId: string;
  cashierId: string;
  cashDrawerId: string;
  shiftId?: string;
  customerId?: string;
  salesPersonId?: string;
  note?: string;
  quoteVersion: string;
  receiptFormat: ReceiptFormat;
  lines: readonly SaleOrderLineInputDTO[];
  tenders: readonly SaleTenderDraftInputDTO[];
}

export interface SalesPosPrewarmCheckoutContextRequest {
  branchId: string;
  warehouseId: string;
  cashierId: string;
  shiftId?: string;
  variantIds: readonly string[];
}

export interface SalesPosPrewarmCheckoutContextResponse {
  warmed: {
    shift: boolean;
    balances: number;
  };
  generatedAt: string;
}

export interface SalesDraftSaveResponse {
  order: SaleOrderDTO;
  lines: readonly SaleOrderLineDTO[];
  tenders: readonly SaleTenderDraftDTO[];
}

export interface SalesDraftListResponse {
  drafts: readonly SalesDraftSaveResponse[];
}

export interface SalesDraftCancelResponse {
  order: SaleOrderDTO;
}

export type SalesPosConflictCode =
  | 'PRICE_CHANGED'
  | 'PROMOTION_CHANGED'
  | 'INSUFFICIENT_STOCK'
  | 'VOUCHER_UNAVAILABLE'
  | 'POINT_BALANCE_CHANGED'
  | ApiErrorCode;

export interface SalesPosConflictDTO {
  code: SalesPosConflictCode;
  message: string;
  lineId?: string;
  variantId?: string;
  expectedVnd?: number;
  actualVnd?: number;
  availableMilli?: number;
}

export interface SalesPosCompleteResponse {
  order: SaleOrderDTO;
  lines: readonly SaleOrderLineDTO[];
  receipt: ReceiptSnapshotDTO;
  inventoryMovements: readonly InventoryMovementResponse[];
  financeResult?: FinancePaymentRecordResponse;
  receivable?: ObligationDTO;
  conflicts: readonly SalesPosConflictDTO[];
}

export interface SalesOrderListRequest {
  branchId: string;
  warehouseId?: string;
  statuses?: readonly SaleOrderStatus[];
  sources?: readonly SaleOrderSource[];
  dateFrom?: string;
  dateTo?: string;
  query?: string;
  limit?: number;
}

export interface SalesOrderListItemDTO {
  order: SaleOrderDTO;
  lineCount: number;
  returnedLineCount: number;
  warrantyCaseCount: number;
}

export interface SalesOrderListResponse {
  orders: readonly SalesOrderListItemDTO[];
  generatedAt: string;
}

export interface SalesOrderDetailRequest {
  saleOrderId: string;
}

export interface SalesOrderDetailResponse {
  order: SaleOrderDTO;
  lines: readonly SaleOrderLineDTO[];
  tenders: readonly SaleTenderDraftDTO[];
  receipt?: ReceiptSnapshotDTO;
  returns: readonly SalesReturnDTO[];
  warrantyCases: readonly WarrantyCaseDTO[];
}

export interface SalesOnlineTransitionRequest extends SalesCommandBase {
  saleOrderId: string;
  actorId: string;
  note?: string;
}

export type SalesOnlineConfirmRequest = SalesOnlineTransitionRequest;

export interface SalesOnlineCancelRequest extends SalesOnlineTransitionRequest {
  reason: string;
  depositTreatment?: SalesDepositTreatment;
  cashDrawerId?: string;
  paymentMethodId?: string;
  approverId?: string;
  shiftId?: string;
}

export interface SalesOnlineTransitionResponse {
  order: SaleOrderDTO;
  inventoryMovements: readonly InventoryMovementResponse[];
  receivable?: ObligationDTO;
  customerCredit?: CustomerCreditDTO;
  financeResult?: FinancePaymentRecordResponse;
}

export interface SalesReturnLineInputDTO {
  sourceSaleLineId?: string;
  variantId: string;
  quantity: number;
  quantityMilli: number;
  disposition: SalesReturnDisposition;
  refundVnd?: number;
  unitCostVnd?: number;
  serialId?: string;
  lotId?: string;
  note?: string;
}

export interface SalesReturnLineDTO extends SalesReturnLineInputDTO {
  returnLineId: string;
  returnId: string;
  refundVnd: number;
  unitCostVnd: number;
}

export interface SalesReturnDTO {
  returnId: string;
  tenantId: string;
  branchId: string;
  warehouseId: string;
  customerId?: string;
  sourceSaleOrderId?: string;
  status: SalesReturnStatus;
  returnType: SalesReturnType;
  reason: string;
  receivedAt: string;
  resolvedAt?: string;
  actorId: string;
  approvedBy?: string;
  linkedExchangeSaleId?: string;
  lines: readonly SalesReturnLineDTO[];
}

export interface SalesReturnCreateRequest extends SalesCommandBase {
  branchId: string;
  warehouseId: string;
  actorId: string;
  customerId?: string;
  sourceSaleOrderId?: string;
  fastReturn?: boolean;
  fastReturnApproved?: boolean;
  reason: string;
  lines: readonly SalesReturnLineInputDTO[];
}

export interface SalesReturnCreateResponse {
  returnOrder: SalesReturnDTO;
  inventoryMovements: readonly InventoryMovementResponse[];
}

export interface SalesReturnResolveLineInputDTO {
  returnLineId: string;
  disposition: SalesReturnDisposition;
}

export interface SalesReturnFinancialActionInputDTO {
  treatment: 'Refund' | 'CustomerCredit' | 'None';
  amountVnd: number;
  cashDrawerId?: string;
  paymentMethodId?: string;
  approverId?: string;
}

export interface SalesReturnResolveRequest extends SalesCommandBase {
  returnId: string;
  actorId: string;
  lines: readonly SalesReturnResolveLineInputDTO[];
  financialAction?: SalesReturnFinancialActionInputDTO;
}

export interface SalesReturnResolveResponse {
  returnOrder: SalesReturnDTO;
  inventoryMovements: readonly InventoryMovementResponse[];
  financeResult?: FinancePaymentRecordResponse;
  customerCredit?: CustomerCreditDTO;
}

export interface SalesExchangeCreateRequest extends SalesCommandBase {
  branchId: string;
  warehouseId: string;
  actorId: string;
  cashierId: string;
  cashDrawerId: string;
  shiftId?: string;
  customerId?: string;
  sourceSaleOrderId: string;
  reason: string;
  quoteVersion: string;
  receiptFormat: ReceiptFormat;
  returnLines: readonly SalesReturnLineInputDTO[];
  exchangeLines: readonly SaleOrderLineInputDTO[];
  tenders: readonly SaleTenderDraftInputDTO[];
}

export interface SalesExchangeCreateResponse {
  returnOrder: SalesReturnDTO;
  exchangeOrder: SaleOrderDTO;
  exchangeLines: readonly SaleOrderLineDTO[];
  receipt: ReceiptSnapshotDTO;
  inventoryMovements: readonly InventoryMovementResponse[];
  netSettlementVnd: number;
  financeResult?: FinancePaymentRecordResponse;
  customerCredit?: CustomerCreditDTO;
}

export interface SalesWarrantyOpenRequest extends SalesCommandBase {
  actorId: string;
  customerId: string;
  saleOrderId: string;
  saleLineId: string;
  variantId: string;
  serialId: string;
  policyVersionId?: string;
  issue: string;
  attachmentIds?: readonly string[];
}

export interface SalesWarrantyTransitionRequest extends SalesCommandBase {
  warrantyCaseId: string;
  actorId: string;
  status: WarrantyCaseStatus;
  resolution?: string;
  attachmentIds?: readonly string[];
}

export interface WarrantyCaseDTO {
  warrantyCaseId: string;
  tenantId: string;
  customerId: string;
  saleOrderId: string;
  saleLineId: string;
  variantId: string;
  serialId: string;
  policyVersionId?: string;
  receivedAt: string;
  status: WarrantyCaseStatus;
  issue: string;
  resolution?: string;
  attachmentIds: readonly string[];
}

export interface SalesWarrantyResponse {
  warrantyCase: WarrantyCaseDTO;
}
