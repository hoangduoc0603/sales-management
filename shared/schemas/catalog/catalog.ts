import { z } from 'zod';
import type {
  CatalogCreateProductRequest,
  CatalogPosProjectionRequest,
  CatalogQuoteRequest,
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
