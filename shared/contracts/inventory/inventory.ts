export const inventoryMovementTypes = [
  'OpeningBalance',
  'PurchaseReceipt',
  'PurchaseReturn',
  'SaleIssue',
  'SaleReturnReceive',
  'SaleReturnRestock',
  'TransferShip',
  'TransferReceive',
  'CountAdjustment',
  'ManualAdjustment',
  'Scrap',
  'WarrantyIssue',
  'WarrantyReturn',
] as const;

export type InventoryMovementType = (typeof inventoryMovementTypes)[number];

export const inventorySourceTypes = [
  'OpeningBalance',
  'PurchaseReceipt',
  'SupplierReturn',
  'SaleOrder',
  'SaleReturn',
  'StockTransfer',
  'StocktakeSession',
  'ManualAdjustment',
] as const;

export type InventorySourceType = (typeof inventorySourceTypes)[number];

export interface InventorySourceDocumentDTO {
  sourceType: InventorySourceType;
  sourceId: string;
  sourceLineId?: string;
}

export interface NegativeStockApprovalDTO {
  approvedBy: string;
  reasonCode: string;
  reasonNote: string;
  temporaryUnitCostVnd?: number;
}

export interface InventoryMovementDTO {
  movementId: string;
  tenantId: string;
  movementType: InventoryMovementType;
  warehouseId: string;
  variantId: string;
  lotId?: string;
  serialId?: string;
  quantityMilli: number;
  unitVersionId?: string;
  unitCostVnd: number;
  totalCostVnd: number;
  sourceDocument: InventorySourceDocumentDTO;
  effectiveAt: string;
  actorId: string;
  approverId?: string;
  idempotencyKey: string;
  reversalOfMovementId?: string;
  requiresCostReconciliation?: boolean;
}

export interface InventoryBalanceDTO {
  balanceId: string;
  tenantId: string;
  warehouseId: string;
  variantId: string;
  onHandMilli: number;
  availableMilli: number;
  reservedMilli: number;
  inTransitMilli: number;
  quarantineMilli: number;
  inventoryValueVnd: number;
  asOfMovementId?: string;
}

export const serialStateStatuses = [
  'Saleable',
  'Reserved',
  'Sold',
  'Quarantine',
  'Scrapped',
  'ReturnedToSupplier',
  'InTransit',
] as const;

export type SerialStateStatus = (typeof serialStateStatuses)[number];

export interface InventoryLotBalanceDTO {
  lotBalanceId: string;
  tenantId: string;
  warehouseId: string;
  variantId: string;
  lotId: string;
  lotCode: string;
  expiryDate?: string;
  onHandMilli: number;
  availableMilli: number;
  quarantineMilli: number;
  asOfMovementId?: string;
}

export interface SerialStateDTO {
  serialId: string;
  tenantId: string;
  variantId: string;
  warehouseId: string;
  status: SerialStateStatus;
  sourceMovementId?: string;
  sourceSaleLineId?: string;
  updatedAt: string;
}

export const stockTransferStatuses = [
  'Draft',
  'PendingApproval',
  'Approved',
  'Shipped',
  'PartiallyReceived',
  'Received',
  'Cancelled',
] as const;

export type StockTransferStatus = (typeof stockTransferStatuses)[number];

export interface StockTransferLineDTO {
  transferLineId: string;
  transferId: string;
  variantId: string;
  quantityMilli: number;
  receivedQuantityMilli: number;
  unitVersionId?: string;
  unitCostVnd?: number;
  varianceReasonCode?: string;
  varianceNote?: string;
}

export interface StockTransferDTO {
  transferId: string;
  tenantId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: StockTransferStatus;
  reasonCode?: string;
  reasonNote?: string;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  shippedBy?: string;
  shippedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
}

export interface InventoryTransferCreateLineRequest {
  transferLineId?: string;
  variantId: string;
  quantityMilli: number;
  unitVersionId?: string;
}

export interface InventoryTransferCreateRequest {
  commandId: string;
  idempotencyKey: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  reasonCode?: string;
  reasonNote?: string;
  lines: readonly InventoryTransferCreateLineRequest[];
  actorId?: string;
}

export interface InventoryTransferApproveRequest {
  commandId: string;
  idempotencyKey: string;
  transferId: string;
  actorId?: string;
}

export type InventoryTransferShipRequest = InventoryTransferApproveRequest;

export interface InventoryTransferReceiveLineRequest {
  transferLineId: string;
  receivedQuantityMilli: number;
  varianceReasonCode?: string;
  varianceNote?: string;
}

export interface InventoryTransferReceiveRequest {
  commandId: string;
  idempotencyKey: string;
  transferId: string;
  receivedLines: readonly InventoryTransferReceiveLineRequest[];
  actorId?: string;
}

export interface InventoryTransferResponse {
  transfer: StockTransferDTO;
  lines: readonly StockTransferLineDTO[];
  movements?: readonly InventoryMovementDTO[];
  balances?: readonly InventoryBalanceDTO[];
}

export const stocktakeSessionStatuses = [
  'Draft',
  'InProgress',
  'Submitted',
  'Approved',
  'Rejected',
  'Cancelled',
] as const;

export type StocktakeSessionStatus = (typeof stocktakeSessionStatuses)[number];

export interface StocktakeLineDTO {
  stocktakeLineId: string;
  stocktakeSessionId: string;
  variantId: string;
  lotId?: string;
  serialId?: string;
  snapshotQuantityMilli: number;
  countedQuantityMilli?: number;
  varianceMilli?: number;
  movementsAfterSnapshotCount: number;
  reasonCode?: string;
  reasonNote?: string;
}

export interface StocktakeSessionDTO {
  stocktakeSessionId: string;
  tenantId: string;
  warehouseId: string;
  status: StocktakeSessionStatus;
  snapshotAt: string;
  scopeVariantIds?: readonly string[];
  createdBy: string;
  createdAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface InventoryStocktakeOpenRequest {
  commandId: string;
  idempotencyKey: string;
  warehouseId: string;
  scopeVariantIds?: readonly string[];
  actorId?: string;
}

export interface InventoryStocktakeSubmitLineRequest {
  stocktakeLineId: string;
  countedQuantityMilli: number;
  reasonCode?: string;
  reasonNote?: string;
}

export interface InventoryStocktakeSubmitRequest {
  commandId: string;
  idempotencyKey: string;
  stocktakeSessionId: string;
  lines: readonly InventoryStocktakeSubmitLineRequest[];
  actorId?: string;
}

export interface InventoryStocktakeApproveRequest {
  commandId: string;
  idempotencyKey: string;
  stocktakeSessionId: string;
  actorId?: string;
}

export interface InventoryStocktakeResponse {
  session: StocktakeSessionDTO;
  lines: readonly StocktakeLineDTO[];
  movements?: readonly InventoryMovementDTO[];
  balances?: readonly InventoryBalanceDTO[];
}

export interface InventoryReceiveRequest {
  commandId: string;
  idempotencyKey: string;
  warehouseId: string;
  variantId: string;
  quantityMilli: number;
  unitCostVnd: number;
  unitVersionId?: string;
  lotId?: string;
  lotCode?: string;
  expiryDate?: string;
  serialId?: string;
  sourceDocument: InventorySourceDocumentDTO;
  actorId?: string;
}

export interface InventoryIssueForSaleRequest {
  commandId: string;
  idempotencyKey: string;
  warehouseId: string;
  variantId: string;
  quantityMilli: number;
  unitVersionId?: string;
  lotId?: string;
  serialId?: string;
  sourceDocument: InventorySourceDocumentDTO;
  negativeStockApproval?: NegativeStockApprovalDTO;
  actorId?: string;
}

export interface InventoryReserveRequest {
  commandId: string;
  idempotencyKey: string;
  warehouseId: string;
  variantId: string;
  quantityMilli: number;
  lotId?: string;
  serialId?: string;
  sourceDocument: InventorySourceDocumentDTO;
  actorId?: string;
}

export type InventoryReleaseRequest = InventoryReserveRequest;

export interface InventoryReturnReceiveRequest {
  commandId: string;
  idempotencyKey: string;
  warehouseId: string;
  variantId: string;
  quantityMilli: number;
  unitCostVnd: number;
  lotId?: string;
  lotCode?: string;
  expiryDate?: string;
  serialId?: string;
  sourceDocument: InventorySourceDocumentDTO;
  actorId?: string;
}

export interface InventoryReturnRestockRequest {
  commandId: string;
  idempotencyKey: string;
  warehouseId: string;
  variantId: string;
  quantityMilli: number;
  unitCostVnd: number;
  lotId?: string;
  lotCode?: string;
  expiryDate?: string;
  serialId?: string;
  sourceDocument: InventorySourceDocumentDTO;
  actorId?: string;
}

export type InventoryReturnScrapRequest = InventoryReturnRestockRequest;

export interface InventoryValueAdjustmentRequest {
  commandId: string;
  idempotencyKey: string;
  warehouseId: string;
  variantId: string;
  amountVnd: number;
  sourceDocument: InventorySourceDocumentDTO;
  actorId?: string;
}

export interface InventoryPurchaseReturnRequest {
  commandId: string;
  idempotencyKey: string;
  warehouseId: string;
  variantId: string;
  quantityMilli: number;
  unitCostVnd: number;
  lotId?: string;
  serialId?: string;
  sourceDocument: InventorySourceDocumentDTO;
  actorId?: string;
}

export interface InventoryMovementResponse {
  movement: InventoryMovementDTO;
  balance: InventoryBalanceDTO;
}

export interface InventoryBalanceSummaryRequest {
  warehouseId: string;
}

export interface InventoryBalanceSummaryRowDTO {
  warehouseId: string;
  variantId: string;
  onHandMilli: number;
  availableMilli: number;
  reservedMilli: number;
  quarantineMilli: number;
  inventoryValueVnd: number;
}

export interface InventoryBalanceSummaryResponse {
  generatedAt: string;
  rows: readonly InventoryBalanceSummaryRowDTO[];
}
