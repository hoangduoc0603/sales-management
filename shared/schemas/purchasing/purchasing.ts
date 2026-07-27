import { z } from 'zod';
import type {
  PurchasingGoodsReceiptApproveRequest,
  PurchasingGoodsReceiptCreateRequest,
  PurchasingLandedCostAdjustRequest,
  PurchasingPoApproveRequest,
  PurchasingPoCreateRequest,
  PurchasingPoSubmitRequest,
  PurchasingSupplierCreateRequest,
  PurchasingSupplierReturnApproveRequest,
  PurchasingSupplierReturnCreateRequest,
} from '@shared/contracts/purchasing/purchasing';

const nonEmptyTrimmed = z.string().trim().min(1);
const optionalNonEmptyTrimmed = z.string().trim().min(1).optional();
const nonNegativeVnd = z.number().int().nonnegative();
const positiveQuantity = z.number().positive();
const positiveQuantityMilli = z.number().int().positive();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const commandBaseSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
  })
  .strict();

const paymentTermsSchema = z
  .object({
    dueDays: z.number().int().min(0).max(365).default(0),
  })
  .strict();

const contactSchema = z
  .object({
    contactName: optionalNonEmptyTrimmed,
    phone: optionalNonEmptyTrimmed,
    email: optionalNonEmptyTrimmed,
    address: optionalNonEmptyTrimmed,
  })
  .strict();

export const purchasingSupplierCreateRequestSchema = commandBaseSchema.extend({
  supplierCode: nonEmptyTrimmed,
  name: nonEmptyTrimmed,
  taxCode: optionalNonEmptyTrimmed,
  paymentTerms: paymentTermsSchema.default({ dueDays: 0 }),
  contact: contactSchema.optional(),
  note: optionalNonEmptyTrimmed,
});

export function parsePurchasingSupplierCreateRequest(value: unknown): PurchasingSupplierCreateRequest {
  return purchasingSupplierCreateRequestSchema.parse(value);
}

export const purchaseOrderLineInputSchema = z
  .object({
    lineId: nonEmptyTrimmed,
    variantId: nonEmptyTrimmed,
    unitVersionId: nonEmptyTrimmed,
    quantity: positiveQuantity,
    quantityMilli: positiveQuantityMilli,
    unitCostVnd: nonNegativeVnd,
    lineDiscountVnd: nonNegativeVnd,
    vatVnd: nonNegativeVnd,
    note: optionalNonEmptyTrimmed,
  })
  .strict();

export const purchasingPoCreateRequestSchema = commandBaseSchema.extend({
  supplierId: nonEmptyTrimmed,
  branchId: nonEmptyTrimmed,
  warehouseId: nonEmptyTrimmed,
  expectedDate: isoDate.optional(),
  actorId: nonEmptyTrimmed,
  note: optionalNonEmptyTrimmed,
  attachmentIds: z.array(nonEmptyTrimmed).default([]),
  lines: z.array(purchaseOrderLineInputSchema).min(1),
});

export function parsePurchasingPoCreateRequest(value: unknown): PurchasingPoCreateRequest {
  return purchasingPoCreateRequestSchema.parse(value);
}

const poTransitionRequestSchema = commandBaseSchema.extend({
  purchaseOrderId: nonEmptyTrimmed,
  actorId: optionalNonEmptyTrimmed,
  approverId: optionalNonEmptyTrimmed,
  reason: optionalNonEmptyTrimmed,
});

export function parsePurchasingPoSubmitRequest(value: unknown): PurchasingPoSubmitRequest {
  return poTransitionRequestSchema.parse(value);
}

export function parsePurchasingPoApproveRequest(value: unknown): PurchasingPoApproveRequest {
  return poTransitionRequestSchema.parse(value);
}

export const goodsReceiptLineInputSchema = z
  .object({
    lineId: nonEmptyTrimmed,
    purchaseOrderLineId: optionalNonEmptyTrimmed,
    variantId: nonEmptyTrimmed,
    unitVersionId: nonEmptyTrimmed,
    quantity: positiveQuantity,
    quantityMilli: positiveQuantityMilli,
    unitCostVnd: nonNegativeVnd,
    lineDiscountVnd: nonNegativeVnd,
    vatVnd: nonNegativeVnd,
    allocatedLandedCostVnd: nonNegativeVnd.default(0),
    lotId: optionalNonEmptyTrimmed,
    serialIds: z.array(nonEmptyTrimmed).optional(),
    note: optionalNonEmptyTrimmed,
  })
  .strict();

export const purchasingGoodsReceiptCreateRequestSchema = commandBaseSchema.extend({
  supplierId: nonEmptyTrimmed,
  purchaseOrderId: optionalNonEmptyTrimmed,
  branchId: nonEmptyTrimmed,
  warehouseId: nonEmptyTrimmed,
  receivedDate: isoDate,
  actorId: nonEmptyTrimmed,
  lines: z.array(goodsReceiptLineInputSchema).min(1),
});

export function parsePurchasingGoodsReceiptCreateRequest(value: unknown): PurchasingGoodsReceiptCreateRequest {
  return purchasingGoodsReceiptCreateRequestSchema.parse(value);
}

export const purchasingGoodsReceiptApproveRequestSchema = commandBaseSchema.extend({
  goodsReceiptId: nonEmptyTrimmed,
  approverId: nonEmptyTrimmed,
});

export function parsePurchasingGoodsReceiptApproveRequest(value: unknown): PurchasingGoodsReceiptApproveRequest {
  return purchasingGoodsReceiptApproveRequestSchema.parse(value);
}

export const landedCostAllocationInputSchema = z
  .object({
    goodsReceiptLineId: nonEmptyTrimmed,
    variantId: nonEmptyTrimmed,
    warehouseId: nonEmptyTrimmed,
    allocatedCostVnd: nonNegativeVnd,
  })
  .strict();

export const purchasingLandedCostAdjustRequestSchema = commandBaseSchema.extend({
  goodsReceiptId: nonEmptyTrimmed,
  adjustmentType: z.enum(['ReceiptCost', 'LateCost']),
  method: z.enum(['ByValue', 'ByQuantity', 'Manual']),
  totalCostVnd: nonNegativeVnd,
  approverId: nonEmptyTrimmed,
  allocations: z.array(landedCostAllocationInputSchema).min(1),
});

export function parsePurchasingLandedCostAdjustRequest(value: unknown): PurchasingLandedCostAdjustRequest {
  return purchasingLandedCostAdjustRequestSchema.parse(value);
}

export const supplierReturnLineInputSchema = z
  .object({
    lineId: nonEmptyTrimmed,
    goodsReceiptLineId: nonEmptyTrimmed,
    variantId: nonEmptyTrimmed,
    quantity: positiveQuantity,
    quantityMilli: positiveQuantityMilli,
    unitCostVnd: nonNegativeVnd,
    note: optionalNonEmptyTrimmed,
  })
  .strict();

export const purchasingSupplierReturnCreateRequestSchema = commandBaseSchema.extend({
  supplierId: nonEmptyTrimmed,
  goodsReceiptId: optionalNonEmptyTrimmed,
  branchId: nonEmptyTrimmed,
  warehouseId: nonEmptyTrimmed,
  actorId: nonEmptyTrimmed,
  treatment: z.enum(['ReducePayable', 'Refund', 'Replacement']),
  reason: nonEmptyTrimmed,
  lines: z.array(supplierReturnLineInputSchema).min(1),
});

export function parsePurchasingSupplierReturnCreateRequest(value: unknown): PurchasingSupplierReturnCreateRequest {
  return purchasingSupplierReturnCreateRequestSchema.parse(value);
}

export const purchasingSupplierReturnApproveRequestSchema = commandBaseSchema.extend({
  supplierReturnId: nonEmptyTrimmed,
  approverId: nonEmptyTrimmed,
});

export function parsePurchasingSupplierReturnApproveRequest(value: unknown): PurchasingSupplierReturnApproveRequest {
  return purchasingSupplierReturnApproveRequestSchema.parse(value);
}

