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

export interface InventoryReceiveRequest {
  commandId: string;
  idempotencyKey: string;
  warehouseId: string;
  variantId: string;
  quantityMilli: number;
  unitCostVnd: number;
  unitVersionId?: string;
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
