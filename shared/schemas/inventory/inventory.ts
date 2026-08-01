import { z } from 'zod';
import type {
  InventoryBalanceSummaryRequest,
  InventoryIssueForSaleRequest,
  InventoryReceiveRequest,
  InventoryReleaseRequest,
  InventoryReserveRequest,
  InventoryStocktakeApproveRequest,
  InventoryStocktakeOpenRequest,
  InventoryStocktakeSubmitRequest,
  InventoryTransferApproveRequest,
  InventoryTransferCreateRequest,
  InventoryTransferReceiveRequest,
  InventoryTransferShipRequest,
  InventoryReturnReceiveRequest,
  InventoryReturnRestockRequest,
} from '@shared/contracts/inventory/inventory';

const nonEmptyTrimmed = z.string().trim().min(1);
const positiveQuantityMilli = z.number().int().positive();
const nonNegativeVnd = z.number().int().nonnegative();
const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const inventorySourceDocumentSchema = z
  .object({
    sourceType: z.enum([
      'OpeningBalance',
      'PurchaseReceipt',
      'SupplierReturn',
      'SaleOrder',
      'SaleReturn',
      'StockTransfer',
      'StocktakeSession',
      'ManualAdjustment',
    ]),
    sourceId: nonEmptyTrimmed,
    sourceLineId: nonEmptyTrimmed.optional(),
  })
  .strict();

const commandBaseSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
    warehouseId: nonEmptyTrimmed,
    variantId: nonEmptyTrimmed,
    quantityMilli: positiveQuantityMilli,
    unitVersionId: nonEmptyTrimmed.optional(),
    lotId: nonEmptyTrimmed.optional(),
    lotCode: nonEmptyTrimmed.optional(),
    expiryDate: isoDateOnly.optional(),
    serialId: nonEmptyTrimmed.optional(),
    sourceDocument: inventorySourceDocumentSchema,
    actorId: nonEmptyTrimmed.optional(),
  })
  .strict();

export const inventoryReceiveRequestSchema = commandBaseSchema.extend({
  unitCostVnd: nonNegativeVnd,
});

export function parseInventoryReceiveRequest(value: unknown): InventoryReceiveRequest {
  return inventoryReceiveRequestSchema.parse(value);
}

export const negativeStockApprovalSchema = z
  .object({
    approvedBy: nonEmptyTrimmed,
    reasonCode: nonEmptyTrimmed,
    reasonNote: nonEmptyTrimmed,
    temporaryUnitCostVnd: nonNegativeVnd.optional(),
  })
  .strict();

export const inventoryIssueForSaleRequestSchema = commandBaseSchema.extend({
  negativeStockApproval: negativeStockApprovalSchema.optional(),
});

export function parseInventoryIssueForSaleRequest(value: unknown): InventoryIssueForSaleRequest {
  return inventoryIssueForSaleRequestSchema.parse(value);
}

export const inventoryReserveRequestSchema = commandBaseSchema;

export function parseInventoryReserveRequest(value: unknown): InventoryReserveRequest {
  return inventoryReserveRequestSchema.parse(value);
}

export const inventoryReleaseRequestSchema = commandBaseSchema;

export function parseInventoryReleaseRequest(value: unknown): InventoryReleaseRequest {
  return inventoryReleaseRequestSchema.parse(value);
}

export const inventoryReturnReceiveRequestSchema = commandBaseSchema.extend({
  unitCostVnd: nonNegativeVnd,
});

export function parseInventoryReturnReceiveRequest(value: unknown): InventoryReturnReceiveRequest {
  return inventoryReturnReceiveRequestSchema.parse(value);
}

export const inventoryReturnRestockRequestSchema = commandBaseSchema.extend({
  unitCostVnd: nonNegativeVnd,
});

export function parseInventoryReturnRestockRequest(value: unknown): InventoryReturnRestockRequest {
  return inventoryReturnRestockRequestSchema.parse(value);
}

export const inventoryBalanceSummaryRequestSchema = z
  .object({
    warehouseId: nonEmptyTrimmed,
  })
  .strict();

export function parseInventoryBalanceSummaryRequest(value: unknown): InventoryBalanceSummaryRequest {
  return inventoryBalanceSummaryRequestSchema.parse(value);
}

const transferLineCreateSchema = z
  .object({
    transferLineId: nonEmptyTrimmed.optional(),
    variantId: nonEmptyTrimmed,
    quantityMilli: positiveQuantityMilli,
    unitVersionId: nonEmptyTrimmed.optional(),
  })
  .strict();

export const inventoryTransferCreateRequestSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
    sourceWarehouseId: nonEmptyTrimmed,
    destinationWarehouseId: nonEmptyTrimmed,
    reasonCode: nonEmptyTrimmed.optional(),
    reasonNote: nonEmptyTrimmed.optional(),
    lines: z.array(transferLineCreateSchema).min(1),
    actorId: nonEmptyTrimmed.optional(),
  })
  .strict()
  .refine((value) => value.sourceWarehouseId !== value.destinationWarehouseId, {
    message: 'sourceWarehouseId and destinationWarehouseId must be different',
    path: ['destinationWarehouseId'],
  });

export function parseInventoryTransferCreateRequest(value: unknown): InventoryTransferCreateRequest {
  return inventoryTransferCreateRequestSchema.parse(value);
}

const transferCommandSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
    transferId: nonEmptyTrimmed,
    actorId: nonEmptyTrimmed.optional(),
  })
  .strict();

export const inventoryTransferApproveRequestSchema = transferCommandSchema;

export function parseInventoryTransferApproveRequest(value: unknown): InventoryTransferApproveRequest {
  return inventoryTransferApproveRequestSchema.parse(value);
}

export const inventoryTransferShipRequestSchema = transferCommandSchema;

export function parseInventoryTransferShipRequest(value: unknown): InventoryTransferShipRequest {
  return inventoryTransferShipRequestSchema.parse(value);
}

const transferReceiveLineSchema = z
  .object({
    transferLineId: nonEmptyTrimmed,
    receivedQuantityMilli: z.number().int().nonnegative(),
    varianceReasonCode: nonEmptyTrimmed.optional(),
    varianceNote: nonEmptyTrimmed.optional(),
  })
  .strict();

export const inventoryTransferReceiveRequestSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
    transferId: nonEmptyTrimmed,
    receivedLines: z.array(transferReceiveLineSchema).min(1),
    actorId: nonEmptyTrimmed.optional(),
  })
  .strict();

export function parseInventoryTransferReceiveRequest(value: unknown): InventoryTransferReceiveRequest {
  return inventoryTransferReceiveRequestSchema.parse(value);
}

export const inventoryStocktakeOpenRequestSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
    warehouseId: nonEmptyTrimmed,
    scopeVariantIds: z.array(nonEmptyTrimmed).min(1).optional(),
    actorId: nonEmptyTrimmed.optional(),
  })
  .strict();

export function parseInventoryStocktakeOpenRequest(value: unknown): InventoryStocktakeOpenRequest {
  return inventoryStocktakeOpenRequestSchema.parse(value);
}

const stocktakeSubmitLineSchema = z
  .object({
    stocktakeLineId: nonEmptyTrimmed,
    countedQuantityMilli: z.number().int().nonnegative(),
    reasonCode: nonEmptyTrimmed.optional(),
    reasonNote: nonEmptyTrimmed.optional(),
  })
  .strict();

export const inventoryStocktakeSubmitRequestSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
    stocktakeSessionId: nonEmptyTrimmed,
    lines: z.array(stocktakeSubmitLineSchema).min(1),
    actorId: nonEmptyTrimmed.optional(),
  })
  .strict();

export function parseInventoryStocktakeSubmitRequest(value: unknown): InventoryStocktakeSubmitRequest {
  return inventoryStocktakeSubmitRequestSchema.parse(value);
}

export const inventoryStocktakeApproveRequestSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
    stocktakeSessionId: nonEmptyTrimmed,
    actorId: nonEmptyTrimmed.optional(),
  })
  .strict();

export function parseInventoryStocktakeApproveRequest(value: unknown): InventoryStocktakeApproveRequest {
  return inventoryStocktakeApproveRequestSchema.parse(value);
}
