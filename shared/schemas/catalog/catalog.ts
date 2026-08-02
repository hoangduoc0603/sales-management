import { z } from 'zod';
import type {
  CatalogCreateProductRequest,
  CatalogCreateVariantRequest,
  CatalogProductListRequest,
  CatalogPosProjectionRequest,
  CatalogQuoteRequest,
  CatalogSetProductActiveRequest,
  CatalogSetVariantActiveRequest,
  CatalogUpdateProductRequest,
  CatalogUpdateVariantRequest,
} from '@shared/contracts/catalog/catalog';

const nonEmptyTrimmed = z.string().trim().min(1);
const optionalNonEmptyTrimmed = z.string().trim().min(1).optional();

export const catalogCreateProductRequestSchema = z
  .object({
    productCode: nonEmptyTrimmed,
    name: nonEmptyTrimmed,
    productType: z.enum(['Stocked', 'Service', 'NonStock', 'Bundle']),
    sku: nonEmptyTrimmed,
    barcode: optionalNonEmptyTrimmed,
    defaultUnitId: nonEmptyTrimmed,
    unitPriceVnd: z.number().int().nonnegative(),
    inventoryMode: z.enum(['Tracked', 'NotTracked', 'Bundle']).optional(),
    lotTracking: z.boolean().optional(),
    serialTracking: z.boolean().optional(),
  })
  .strict();

export function parseCatalogCreateProductRequest(value: unknown): CatalogCreateProductRequest {
  return catalogCreateProductRequestSchema.parse(value);
}

export const catalogProductListRequestSchema = z
  .object({
    query: optionalNonEmptyTrimmed,
    status: z.enum(['Active', 'Inactive', 'All']).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .strict();

export function parseCatalogProductListRequest(value: unknown): CatalogProductListRequest {
  return catalogProductListRequestSchema.parse(value);
}

export const catalogUpdateProductRequestSchema = z
  .object({
    productId: nonEmptyTrimmed,
    productCode: optionalNonEmptyTrimmed,
    name: optionalNonEmptyTrimmed,
    productType: z.enum(['Stocked', 'Service', 'NonStock', 'Bundle']).optional(),
    sku: optionalNonEmptyTrimmed,
    barcode: optionalNonEmptyTrimmed,
    defaultUnitId: optionalNonEmptyTrimmed,
    inventoryMode: z.enum(['Tracked', 'NotTracked', 'Bundle']).optional(),
    unitPriceVnd: z.number().int().nonnegative().optional(),
    lotTracking: z.boolean().optional(),
    serialTracking: z.boolean().optional(),
  })
  .strict();

export function parseCatalogUpdateProductRequest(value: unknown): CatalogUpdateProductRequest {
  return catalogUpdateProductRequestSchema.parse(value);
}

const variantMutationBaseSchema = {
  displayName: optionalNonEmptyTrimmed,
  sku: optionalNonEmptyTrimmed,
  barcode: optionalNonEmptyTrimmed,
  defaultUnitId: optionalNonEmptyTrimmed,
  unitPriceVnd: z.number().int().nonnegative().optional(),
  inventoryMode: z.enum(['Tracked', 'NotTracked', 'Bundle']).optional(),
  lotTracking: z.boolean().optional(),
  serialTracking: z.boolean().optional(),
  unitFactor: z.number().positive().optional(),
  saleEnabled: z.boolean().optional(),
  purchaseEnabled: z.boolean().optional(),
};

export const catalogCreateVariantRequestSchema = z
  .object({
    productId: nonEmptyTrimmed,
    displayName: nonEmptyTrimmed,
    sku: nonEmptyTrimmed,
    barcode: optionalNonEmptyTrimmed,
    defaultUnitId: nonEmptyTrimmed,
    unitPriceVnd: z.number().int().nonnegative(),
    inventoryMode: z.enum(['Tracked', 'NotTracked', 'Bundle']).optional(),
    lotTracking: z.boolean().optional(),
    serialTracking: z.boolean().optional(),
    unitFactor: z.number().positive().optional(),
    saleEnabled: z.boolean().optional(),
    purchaseEnabled: z.boolean().optional(),
  })
  .strict();

export function parseCatalogCreateVariantRequest(value: unknown): CatalogCreateVariantRequest {
  return catalogCreateVariantRequestSchema.parse(value);
}

export const catalogUpdateVariantRequestSchema = z
  .object({
    variantId: nonEmptyTrimmed,
    ...variantMutationBaseSchema,
  })
  .strict();

export function parseCatalogUpdateVariantRequest(value: unknown): CatalogUpdateVariantRequest {
  return catalogUpdateVariantRequestSchema.parse(value);
}

export const catalogSetVariantActiveRequestSchema = z
  .object({
    variantId: nonEmptyTrimmed,
    isActive: z.boolean(),
    reason: optionalNonEmptyTrimmed,
  })
  .strict();

export function parseCatalogSetVariantActiveRequest(value: unknown): CatalogSetVariantActiveRequest {
  return catalogSetVariantActiveRequestSchema.parse(value);
}

export const catalogSetProductActiveRequestSchema = z
  .object({
    productId: nonEmptyTrimmed,
    isActive: z.boolean(),
    reason: optionalNonEmptyTrimmed,
  })
  .strict();

export function parseCatalogSetProductActiveRequest(value: unknown): CatalogSetProductActiveRequest {
  return catalogSetProductActiveRequestSchema.parse(value);
}

export const catalogPosProjectionRequestSchema = z
  .object({
    branchId: nonEmptyTrimmed,
    warehouseId: nonEmptyTrimmed,
  })
  .strict();

export function parseCatalogPosProjectionRequest(value: unknown): CatalogPosProjectionRequest {
  return catalogPosProjectionRequestSchema.parse(value);
}

export const catalogQuoteLineInputSchema = z
  .object({
    lineId: nonEmptyTrimmed,
    variantId: nonEmptyTrimmed,
    unitVersionId: nonEmptyTrimmed,
    quantity: z.number().positive(),
  })
  .strict();

export const catalogQuoteRequestSchema = z
  .object({
    branchId: nonEmptyTrimmed,
    warehouseId: nonEmptyTrimmed,
    customerId: optionalNonEmptyTrimmed,
    customerGroupId: optionalNonEmptyTrimmed,
    lines: z.array(catalogQuoteLineInputSchema).min(1),
    voucherCode: optionalNonEmptyTrimmed,
    pointRedemption: z.number().int().nonnegative().optional(),
  })
  .strict();

export function parseCatalogQuoteRequest(value: unknown): CatalogQuoteRequest {
  return catalogQuoteRequestSchema.parse(value);
}
