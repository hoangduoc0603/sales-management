import { z } from 'zod';
import type {
  CatalogCreateProductRequest,
  CatalogProductListRequest,
  CatalogPosProjectionRequest,
  CatalogQuoteRequest,
  CatalogSetProductActiveRequest,
  CatalogUpdateProductRequest,
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
