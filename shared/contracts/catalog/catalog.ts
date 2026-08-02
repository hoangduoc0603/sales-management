export const productTypes = ['Stocked', 'Service', 'NonStock', 'Bundle'] as const;
export type ProductType = (typeof productTypes)[number];

export const inventoryModes = ['Tracked', 'NotTracked', 'Bundle'] as const;
export type InventoryMode = (typeof inventoryModes)[number];

export interface ProductDTO {
  productId: string;
  tenantId: string;
  productCode: string;
  name: string;
  productType: ProductType;
  categoryId?: string;
  brandId?: string;
  taxCode?: string;
  isActive: boolean;
}

export interface VariantDTO {
  variantId: string;
  tenantId: string;
  productId: string;
  sku: string;
  skuNormalized: string;
  displayName: string;
  inventoryMode: InventoryMode;
  lotTracking: boolean;
  serialTracking: boolean;
  defaultUnitId: string;
  isActive: boolean;
  unitPriceVnd: number;
}

export interface VariantBarcodeDTO {
  barcodeId: string;
  tenantId: string;
  variantId: string;
  unitVersionId: string;
  barcode: string;
  barcodeNormalized: string;
  barcodeKind: 'Manufacturer' | 'Internal';
  isActive: boolean;
}

export interface UnitConversionVersionDTO {
  unitVersionId: string;
  tenantId: string;
  variantId: string;
  unitId: string;
  unitName: string;
  baseUnitId: string;
  factor: number;
  saleEnabled: boolean;
  purchaseEnabled: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface CatalogCreateProductRequest {
  productCode: string;
  name: string;
  productType: ProductType;
  sku: string;
  barcode?: string;
  defaultUnitId: string;
  unitPriceVnd: number;
  inventoryMode?: InventoryMode;
  lotTracking?: boolean;
  serialTracking?: boolean;
}

export interface CatalogCreateProductResponse {
  product: ProductDTO;
  defaultVariant: VariantDTO;
  defaultUnit: UnitConversionVersionDTO;
  barcode?: VariantBarcodeDTO;
}

export const catalogProductListStatuses = ['Active', 'Inactive', 'All'] as const;
export type CatalogProductListStatus = (typeof catalogProductListStatuses)[number];

export interface CatalogProductListRequest {
  query?: string;
  status?: CatalogProductListStatus;
  limit?: number;
}

export interface CatalogProductListItemDTO {
  productId: string;
  productCode: string;
  productName: string;
  productType: ProductType;
  variantId: string;
  sku: string;
  displayName: string;
  barcode?: string;
  defaultUnitId: string;
  unitPriceVnd: number;
  inventoryMode: InventoryMode;
  lotTracking: boolean;
  serialTracking: boolean;
  isActive: boolean;
}

export interface CatalogProductListResponse {
  generatedAt: string;
  items: readonly CatalogProductListItemDTO[];
}

export interface CatalogUpdateProductRequest {
  productId: string;
  productCode?: string;
  name?: string;
  productType?: ProductType;
  sku?: string;
  barcode?: string;
  defaultUnitId?: string;
  inventoryMode?: InventoryMode;
  unitPriceVnd?: number;
  lotTracking?: boolean;
  serialTracking?: boolean;
}

export interface CatalogUpdateProductResponse {
  product: ProductDTO;
  defaultVariant: VariantDTO;
  barcode?: VariantBarcodeDTO;
}

export interface CatalogSetProductActiveRequest {
  productId: string;
  isActive: boolean;
  reason?: string;
}

export interface CatalogSetProductActiveResponse {
  product: ProductDTO;
  defaultVariant: VariantDTO;
}

export interface CatalogPosProjectionRequest {
  branchId: string;
  warehouseId: string;
}

export interface CatalogPosVariantDTO {
  variantId: string;
  productId: string;
  sku: string;
  displayName: string;
  barcode?: string;
  unitVersionId: string;
  unitName: string;
  unitPriceVnd: number;
  saleEnabled: boolean;
  inventoryMode: InventoryMode;
  lotTracking: boolean;
  serialTracking: boolean;
  isActive: boolean;
}

export interface CatalogPosProjectionResponse {
  projectionVersion: string;
  branchId: string;
  warehouseId: string;
  generatedAt: string;
  variants: readonly CatalogPosVariantDTO[];
}

export interface CatalogQuoteLineInput {
  lineId: string;
  variantId: string;
  unitVersionId: string;
  quantity: number;
}

export interface CatalogQuoteRequest {
  branchId: string;
  warehouseId: string;
  customerId?: string;
  customerGroupId?: string;
  lines: readonly CatalogQuoteLineInput[];
  voucherCode?: string;
  pointRedemption?: number;
}

export interface CatalogQuoteLineDTO {
  lineId: string;
  variantId: string;
  quantity: number;
  unitPriceVnd: number;
  lineSubtotalVnd: number;
  lineDiscountVnd: number;
  lineTotalVnd: number;
}

export interface PromotionApplicationDTO {
  promotionId: string;
  name: string;
  discountVnd: number;
  reason: string;
}

export interface PromotionRejectionDTO {
  promotionId: string;
  name: string;
  reason: string;
}

export interface CatalogQuoteResponse {
  quoteVersion: string;
  subtotalVnd: number;
  discountVnd: number;
  totalVnd: number;
  lines: readonly CatalogQuoteLineDTO[];
  applications: readonly PromotionApplicationDTO[];
  rejections: readonly PromotionRejectionDTO[];
}
