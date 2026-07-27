import { z } from 'zod';
import type {
  InventoryBalanceSummaryRequest,
  InventoryIssueForSaleRequest,
  InventoryReceiveRequest,
  InventoryReleaseRequest,
  InventoryReserveRequest,
  InventoryReturnReceiveRequest,
  InventoryReturnRestockRequest,
} from '@shared/contracts/inventory/inventory';

const nonEmptyTrimmed = z.string().trim().min(1);
const positiveQuantityMilli = z.number().int().positive();
const nonNegativeVnd = z.number().int().nonnegative();

export const inventorySourceDocumentSchema = z
  .object({
    sourceType: z.enum([
      'OpeningBalance',
      'PurchaseReceipt',
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
