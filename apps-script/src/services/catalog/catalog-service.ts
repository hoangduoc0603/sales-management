import type { ApiErrorCode } from '@shared/contracts/errors';
import type {
  CatalogCreateProductRequest,
  CatalogCreateProductResponse,
  CatalogPosProjectionRequest,
  CatalogPosProjectionResponse,
  InventoryMode,
  ProductDTO,
  UnitConversionVersionDTO,
  VariantBarcodeDTO,
  VariantDTO,
} from '@shared/contracts/catalog/catalog';
import type { CatalogRepository } from '../../repositories/catalog/catalog-repository';

type CatalogServiceResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: ApiErrorCode;
        message: string;
      };
    };

export interface CatalogService {
  createProduct(input: CatalogCreateProductRequest): CatalogServiceResult<CatalogCreateProductResponse>;
  getPosProjection(input: CatalogPosProjectionRequest): CatalogPosProjectionResponse;
}

export interface CatalogServiceDependencies {
  repository: CatalogRepository;
  tenantId: string;
  now: () => Date;
  newId(prefix: string): string;
}

export function createCatalogService(deps: CatalogServiceDependencies): CatalogService {
  return {
    createProduct(input) {
      const skuNormalized = normalizeLookup(input.sku);
      const barcodeNormalized = input.barcode === undefined ? undefined : normalizeLookup(input.barcode);

      if (deps.repository.findVariantBySkuNormalized(skuNormalized) !== undefined) {
        return {
          ok: false,
          error: { code: 'DUPLICATE_SKU', message: 'SKU đã tồn tại.' },
        };
      }

      if (
        barcodeNormalized !== undefined &&
        deps.repository.findBarcodeByNormalized(barcodeNormalized) !== undefined
      ) {
        return {
          ok: false,
          error: { code: 'DUPLICATE_BARCODE', message: 'Barcode đã tồn tại.' },
        };
      }

      const productId = deps.newId('product');
      const variantId = deps.newId('variant');
      const unitVersionId = deps.newId('unit-version');
      const product: ProductDTO = {
        productId,
        tenantId: deps.tenantId,
        productCode: input.productCode.trim(),
        name: input.name.trim(),
        productType: input.productType,
        isActive: true,
      };
      const inventoryMode = resolveInventoryMode(input);
      const defaultVariant: VariantDTO = {
        variantId,
        tenantId: deps.tenantId,
        productId,
        sku: input.sku.trim(),
        skuNormalized,
        displayName: input.name.trim(),
        inventoryMode,
        lotTracking: input.lotTracking ?? false,
        serialTracking: input.serialTracking ?? false,
        defaultUnitId: input.defaultUnitId.trim(),
        isActive: true,
        unitPriceVnd: input.unitPriceVnd,
      };
      const defaultUnit: UnitConversionVersionDTO = {
        unitVersionId,
        tenantId: deps.tenantId,
        variantId,
        unitId: input.defaultUnitId.trim(),
        unitName: input.defaultUnitId.trim(),
        baseUnitId: input.defaultUnitId.trim(),
        factor: 1,
        saleEnabled: true,
        purchaseEnabled: inventoryMode === 'Tracked',
        effectiveFrom: deps.now().toISOString(),
        isActive: true,
      };
      const barcode: VariantBarcodeDTO | undefined =
        input.barcode === undefined || barcodeNormalized === undefined
          ? undefined
          : {
              barcodeId: deps.newId('barcode'),
              tenantId: deps.tenantId,
              variantId,
              unitVersionId,
              barcode: input.barcode.trim(),
              barcodeNormalized,
              barcodeKind: 'Manufacturer',
              isActive: true,
            };

      deps.repository.saveProduct(product);
      deps.repository.saveVariant(defaultVariant);
      deps.repository.saveUnitVersion(defaultUnit);
      if (barcode !== undefined) {
        deps.repository.saveBarcode(barcode);
      }

      return {
        ok: true,
        data: {
          product,
          defaultVariant,
          defaultUnit,
          barcode,
        },
      };
    },
    getPosProjection(input) {
      const variants = deps.repository.listVariants();
      const barcodesByVariantId = new Map(
        deps.repository
          .listBarcodes()
          .filter((barcode) => barcode.isActive)
          .map((barcode) => [barcode.variantId, barcode]),
      );
      const unitVersionsByVariantId = new Map(
        deps.repository
          .listUnitVersions()
          .filter((unit) => unit.isActive && unit.saleEnabled)
          .map((unit) => [unit.variantId, unit]),
      );

      return {
        projectionVersion: `catalog-pos-${variants.length}`,
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        generatedAt: deps.now().toISOString(),
        variants: variants
          .filter((variant) => variant.isActive)
          .flatMap((variant) => {
            const unit = unitVersionsByVariantId.get(variant.variantId);
            if (unit === undefined) return [];

            return [
              {
                variantId: variant.variantId,
                productId: variant.productId,
                sku: variant.sku,
                displayName: variant.displayName,
                barcode: barcodesByVariantId.get(variant.variantId)?.barcode,
                unitVersionId: unit.unitVersionId,
                unitName: unit.unitName,
                unitPriceVnd: variant.unitPriceVnd,
                saleEnabled: unit.saleEnabled,
                inventoryMode: variant.inventoryMode,
                lotTracking: variant.lotTracking,
                serialTracking: variant.serialTracking,
                isActive: variant.isActive,
              },
            ];
          }),
      };
    },
  };
}

export function normalizeLookup(value: string): string {
  return value.trim().toLocaleUpperCase('vi-VN');
}

function resolveInventoryMode(input: CatalogCreateProductRequest): InventoryMode {
  if (input.inventoryMode !== undefined) {
    return input.inventoryMode;
  }

  if (input.productType === 'Service' || input.productType === 'NonStock') {
    return 'NotTracked';
  }

  if (input.productType === 'Bundle') {
    return 'Bundle';
  }

  return 'Tracked';
}
