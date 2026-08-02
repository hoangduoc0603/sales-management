import type { ApiErrorCode } from '@shared/contracts/errors';
import type {
  CatalogCreateProductRequest,
  CatalogCreateProductResponse,
  CatalogProductListItemDTO,
  CatalogProductListRequest,
  CatalogProductListResponse,
  CatalogPosProjectionRequest,
  CatalogPosProjectionResponse,
  InventoryMode,
  ProductDTO,
  CatalogSetProductActiveRequest,
  CatalogSetProductActiveResponse,
  CatalogUpdateProductRequest,
  CatalogUpdateProductResponse,
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
  listProducts(input: CatalogProductListRequest): CatalogProductListResponse;
  updateProduct(input: CatalogUpdateProductRequest): CatalogServiceResult<CatalogUpdateProductResponse>;
  setProductActive(
    input: CatalogSetProductActiveRequest,
  ): CatalogServiceResult<CatalogSetProductActiveResponse>;
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
    listProducts(input) {
      const status = input.status ?? 'Active';
      const query = input.query === undefined ? undefined : normalizeLookup(input.query);
      const productsById = new Map(deps.repository.listProducts().map((product) => [product.productId, product]));
      const barcodesByVariantId = new Map(
        deps.repository
          .listBarcodes()
          .filter((barcode) => barcode.isActive)
          .map((barcode) => [barcode.variantId, barcode]),
      );

      const items = deps.repository
        .listVariants()
        .flatMap((variant): CatalogProductListItemDTO[] => {
          const product = productsById.get(variant.productId);
          if (product === undefined) return [];
          const isActive = product.isActive && variant.isActive;
          if (status === 'Active' && !isActive) return [];
          if (status === 'Inactive' && isActive) return [];
          const barcode = barcodesByVariantId.get(variant.variantId);
          const item: CatalogProductListItemDTO = {
            productId: product.productId,
            productCode: product.productCode,
            productName: product.name,
            productType: product.productType,
            variantId: variant.variantId,
            sku: variant.sku,
            displayName: variant.displayName,
            barcode: barcode?.barcode,
            defaultUnitId: variant.defaultUnitId,
            unitPriceVnd: variant.unitPriceVnd,
            inventoryMode: variant.inventoryMode,
            lotTracking: variant.lotTracking,
            serialTracking: variant.serialTracking,
            isActive,
          };
          if (query !== undefined && !matchesProductQuery(item, query)) return [];
          return [item];
        })
        .sort((left, right) => left.displayName.localeCompare(right.displayName, 'vi-VN'));

      return {
        generatedAt: deps.now().toISOString(),
        items: items.slice(0, input.limit ?? 100),
      };
    },
    updateProduct(input) {
      const product = deps.repository.findProductById(input.productId);
      if (product === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Sản phẩm không tồn tại.' },
        };
      }

      const defaultVariant = findDefaultVariant(deps.repository, product.productId);
      if (defaultVariant === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Sản phẩm chưa có biến thể mặc định.' },
        };
      }

      if (input.sku !== undefined) {
        const skuNormalized = normalizeLookup(input.sku);
        const duplicateSku = deps.repository.findVariantBySkuNormalized(skuNormalized);
        if (duplicateSku !== undefined && duplicateSku.variantId !== defaultVariant.variantId) {
          return {
            ok: false,
            error: { code: 'DUPLICATE_SKU', message: 'SKU đã tồn tại.' },
          };
        }
      }

      if (input.barcode !== undefined) {
        const barcodeNormalized = normalizeLookup(input.barcode);
        const duplicateBarcode = deps.repository.findBarcodeByNormalized(barcodeNormalized);
        if (duplicateBarcode !== undefined && duplicateBarcode.variantId !== defaultVariant.variantId) {
          return {
            ok: false,
            error: { code: 'DUPLICATE_BARCODE', message: 'Barcode đã tồn tại.' },
          };
        }
      }

      const nextName = input.name?.trim() ?? product.name;
      const updatedProduct: ProductDTO = {
        ...product,
        productCode: input.productCode?.trim() ?? product.productCode,
        name: nextName,
        productType: input.productType ?? product.productType,
      };
      const updatedVariant: VariantDTO = {
        ...defaultVariant,
        displayName: nextName,
        sku: input.sku?.trim() ?? defaultVariant.sku,
        skuNormalized:
          input.sku === undefined ? defaultVariant.skuNormalized : normalizeLookup(input.sku),
        defaultUnitId: input.defaultUnitId?.trim() ?? defaultVariant.defaultUnitId,
        inventoryMode: input.inventoryMode ?? defaultVariant.inventoryMode,
        unitPriceVnd: input.unitPriceVnd ?? defaultVariant.unitPriceVnd,
        lotTracking: input.lotTracking ?? defaultVariant.lotTracking,
        serialTracking: input.serialTracking ?? defaultVariant.serialTracking,
      };

      deps.repository.saveProduct(updatedProduct);
      deps.repository.saveVariant(updatedVariant);

      const barcode = input.barcode === undefined
        ? activeBarcodeForVariant(deps.repository, defaultVariant.variantId)
        : upsertActiveBarcode({
            repository: deps.repository,
            newId: deps.newId,
            tenantId: deps.tenantId,
            variantId: defaultVariant.variantId,
            unitVersionId: findDefaultUnitVersion(deps.repository, defaultVariant.variantId)?.unitVersionId,
            barcode: input.barcode,
          });

      return {
        ok: true,
        data: {
          product: updatedProduct,
          defaultVariant: updatedVariant,
          barcode,
        },
      };
    },
    setProductActive(input) {
      const product = deps.repository.findProductById(input.productId);
      if (product === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Sản phẩm không tồn tại.' },
        };
      }

      const defaultVariant = findDefaultVariant(deps.repository, product.productId);
      if (defaultVariant === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Sản phẩm chưa có biến thể mặc định.' },
        };
      }

      const updatedProduct: ProductDTO = { ...product, isActive: input.isActive };
      const updatedVariant: VariantDTO = { ...defaultVariant, isActive: input.isActive };
      deps.repository.saveProduct(updatedProduct);
      deps.repository.saveVariant(updatedVariant);

      return {
        ok: true,
        data: {
          product: updatedProduct,
          defaultVariant: updatedVariant,
        },
      };
    },
    getPosProjection(input) {
      const activeProductIds = new Set(
        deps.repository
          .listProducts()
          .filter((product) => product.isActive)
          .map((product) => product.productId),
      );
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
          .filter((variant) => activeProductIds.has(variant.productId))
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

function matchesProductQuery(item: CatalogProductListItemDTO, query: string): boolean {
  const values = [
    item.productCode,
    item.productName,
    item.sku,
    item.displayName,
    item.barcode ?? '',
    item.defaultUnitId,
  ];
  return values.some((value) => normalizeLookup(value).includes(query));
}

function findDefaultVariant(
  repository: CatalogRepository,
  productId: string,
): VariantDTO | undefined {
  const variants = repository.listVariants().filter((variant) => variant.productId === productId);
  return variants.find((variant) => variant.isActive) ?? variants[0];
}

function activeBarcodeForVariant(
  repository: CatalogRepository,
  variantId: string,
): VariantBarcodeDTO | undefined {
  return repository
    .listBarcodes()
    .find((barcode) => barcode.variantId === variantId && barcode.isActive);
}

function findDefaultUnitVersion(
  repository: CatalogRepository,
  variantId: string,
): UnitConversionVersionDTO | undefined {
  return repository
    .listUnitVersions()
    .find((unitVersion) => unitVersion.variantId === variantId && unitVersion.isActive);
}

function upsertActiveBarcode(input: {
  repository: CatalogRepository;
  newId: (prefix: string) => string;
  tenantId: string;
  variantId: string;
  unitVersionId?: string;
  barcode: string;
}): VariantBarcodeDTO {
  const currentBarcode = activeBarcodeForVariant(input.repository, input.variantId);
  const barcodeNormalized = normalizeLookup(input.barcode);
  const nextBarcode: VariantBarcodeDTO = {
    barcodeId: currentBarcode?.barcodeId ?? input.newId('barcode'),
    tenantId: input.tenantId,
    variantId: input.variantId,
    unitVersionId: currentBarcode?.unitVersionId ?? input.unitVersionId ?? input.newId('unit-version'),
    barcode: input.barcode.trim(),
    barcodeNormalized,
    barcodeKind: currentBarcode?.barcodeKind ?? 'Manufacturer',
    isActive: true,
  };
  input.repository.saveBarcode(nextBarcode);
  return nextBarcode;
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
