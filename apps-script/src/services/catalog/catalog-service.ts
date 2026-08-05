import type { ApiErrorCode } from '@shared/contracts/errors';
import type {
  BundleFormulaVersionDTO,
  CatalogConfigureBundleFormulaRequest,
  CatalogConfigureBundleFormulaResponse,
  CatalogCreateProductRequest,
  CatalogCreateProductResponse,
  CatalogCreateVariantRequest,
  CatalogCreateVariantResponse,
  CatalogProductListItemDTO,
  CatalogProductListRequest,
  CatalogProductListResponse,
  CatalogGetBundleFormulaRequest,
  CatalogGetBundleFormulaResponse,
  CatalogQuoteRequest,
  CatalogQuoteResponse,
  CatalogPosProjectionRequest,
  CatalogPosProjectionResponse,
  CatalogPosVariantDTO,
  InventoryMode,
  ProductDTO,
  CatalogSetProductActiveRequest,
  CatalogSetProductActiveResponse,
  CatalogSetVariantActiveRequest,
  CatalogSetVariantActiveResponse,
  CatalogUpdateProductRequest,
  CatalogUpdateProductResponse,
  CatalogUpdateVariantRequest,
  CatalogUpdateVariantResponse,
  UnitConversionVersionDTO,
  VariantBarcodeDTO,
  VariantDTO,
} from '@shared/contracts/catalog/catalog';
import type { CatalogRepository } from '../../repositories/catalog/catalog-repository';
import { createPricingService } from './pricing-service';

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

export type CatalogPosLineQuoteResult =
  | { ok: true; quote: CatalogQuoteResponse }
  | {
      ok: false;
      error: {
        lineId: string;
        variantId: string;
        unitVersionId: string;
        reason: 'PRODUCT_NOT_FOUND' | 'PRODUCT_INACTIVE' | 'VARIANT_UNAVAILABLE' | 'UNIT_UNAVAILABLE' | 'UNIT_MISMATCH';
      };
    };

export interface CatalogService {
  createProduct(input: CatalogCreateProductRequest): CatalogServiceResult<CatalogCreateProductResponse>;
  createVariant(input: CatalogCreateVariantRequest): CatalogServiceResult<CatalogCreateVariantResponse>;
  listProducts(input: CatalogProductListRequest): CatalogProductListResponse;
  updateProduct(input: CatalogUpdateProductRequest): CatalogServiceResult<CatalogUpdateProductResponse>;
  updateVariant(input: CatalogUpdateVariantRequest): CatalogServiceResult<CatalogUpdateVariantResponse>;
  setProductActive(
    input: CatalogSetProductActiveRequest,
  ): CatalogServiceResult<CatalogSetProductActiveResponse>;
  setVariantActive(
    input: CatalogSetVariantActiveRequest,
  ): CatalogServiceResult<CatalogSetVariantActiveResponse>;
  getPosProjection(input: CatalogPosProjectionRequest): CatalogPosProjectionResponse;
  quotePosLines(input: CatalogQuoteRequest): CatalogPosLineQuoteResult;
  configureBundleFormula(
    input: CatalogConfigureBundleFormulaRequest,
  ): CatalogServiceResult<CatalogConfigureBundleFormulaResponse>;
  getActiveBundleFormula(
    input: CatalogGetBundleFormulaRequest,
  ): CatalogServiceResult<CatalogGetBundleFormulaResponse>;
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
    createVariant(input) {
      const product = deps.repository.findProductById(input.productId);
      if (product === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Sản phẩm không tồn tại.' },
        };
      }

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

      const variantId = deps.newId('variant');
      const unitVersionId = deps.newId('unit-version');
      const inventoryMode = resolveInventoryModeForProductType(product.productType, input.inventoryMode);
      const variant: VariantDTO = {
        variantId,
        tenantId: deps.tenantId,
        productId: product.productId,
        sku: input.sku.trim(),
        skuNormalized,
        displayName: input.displayName.trim(),
        inventoryMode,
        lotTracking: input.lotTracking ?? false,
        serialTracking: input.serialTracking ?? false,
        defaultUnitId: input.defaultUnitId.trim(),
        isActive: product.isActive,
        unitPriceVnd: input.unitPriceVnd,
      };
      const unit = createUnitVersion({
        unitVersionId,
        tenantId: deps.tenantId,
        variantId,
        unitId: input.defaultUnitId,
        factor: input.unitFactor ?? 1,
        saleEnabled: input.saleEnabled ?? true,
        purchaseEnabled: input.purchaseEnabled ?? inventoryMode === 'Tracked',
        effectiveFrom: deps.now().toISOString(),
      });
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

      deps.repository.saveVariant(variant);
      deps.repository.saveUnitVersion(unit);
      if (barcode !== undefined) {
        deps.repository.saveBarcode(barcode);
      }

      return {
        ok: true,
        data: { product, variant, unit, barcode },
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
    updateVariant(input) {
      const currentVariant = deps.repository.findVariantById(input.variantId);
      if (currentVariant === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Biến thể không tồn tại.' },
        };
      }
      const product = deps.repository.findProductById(currentVariant.productId);
      if (product === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Sản phẩm không tồn tại.' },
        };
      }

      if (input.sku !== undefined) {
        const skuNormalized = normalizeLookup(input.sku);
        const duplicateSku = deps.repository.findVariantBySkuNormalized(skuNormalized);
        if (duplicateSku !== undefined && duplicateSku.variantId !== currentVariant.variantId) {
          return {
            ok: false,
            error: { code: 'DUPLICATE_SKU', message: 'SKU đã tồn tại.' },
          };
        }
      }
      if (input.barcode !== undefined) {
        const barcodeNormalized = normalizeLookup(input.barcode);
        const duplicateBarcode = deps.repository.findBarcodeByNormalized(barcodeNormalized);
        if (duplicateBarcode !== undefined && duplicateBarcode.variantId !== currentVariant.variantId) {
          return {
            ok: false,
            error: { code: 'DUPLICATE_BARCODE', message: 'Barcode đã tồn tại.' },
          };
        }
      }

      const updatedVariant: VariantDTO = {
        ...currentVariant,
        displayName: input.displayName?.trim() ?? currentVariant.displayName,
        sku: input.sku?.trim() ?? currentVariant.sku,
        skuNormalized:
          input.sku === undefined ? currentVariant.skuNormalized : normalizeLookup(input.sku),
        defaultUnitId: input.defaultUnitId?.trim() ?? currentVariant.defaultUnitId,
        inventoryMode: input.inventoryMode ?? currentVariant.inventoryMode,
        unitPriceVnd: input.unitPriceVnd ?? currentVariant.unitPriceVnd,
        lotTracking: input.lotTracking ?? currentVariant.lotTracking,
        serialTracking: input.serialTracking ?? currentVariant.serialTracking,
      };
      deps.repository.saveVariant(updatedVariant);

      const currentUnit = findDefaultUnitVersion(deps.repository, currentVariant.variantId);
      const nextUnit =
        currentUnit === undefined
          ? createUnitVersion({
              unitVersionId: deps.newId('unit-version'),
              tenantId: deps.tenantId,
              variantId: currentVariant.variantId,
              unitId: updatedVariant.defaultUnitId,
              factor: input.unitFactor ?? 1,
              saleEnabled: input.saleEnabled ?? true,
              purchaseEnabled: input.purchaseEnabled ?? updatedVariant.inventoryMode === 'Tracked',
              effectiveFrom: deps.now().toISOString(),
            })
          : {
              ...currentUnit,
              unitId: input.defaultUnitId?.trim() ?? currentUnit.unitId,
              unitName: input.defaultUnitId?.trim() ?? currentUnit.unitName,
              baseUnitId: input.defaultUnitId?.trim() ?? currentUnit.baseUnitId,
              factor: input.unitFactor ?? currentUnit.factor,
              saleEnabled: input.saleEnabled ?? currentUnit.saleEnabled,
              purchaseEnabled: input.purchaseEnabled ?? currentUnit.purchaseEnabled,
            };
      deps.repository.saveUnitVersion(nextUnit);

      const barcode =
        input.barcode === undefined
          ? activeBarcodeForVariant(deps.repository, currentVariant.variantId)
          : upsertActiveBarcode({
              repository: deps.repository,
              newId: deps.newId,
              tenantId: deps.tenantId,
              variantId: currentVariant.variantId,
              unitVersionId: nextUnit.unitVersionId,
              barcode: input.barcode,
            });

      return {
        ok: true,
        data: { product, variant: updatedVariant, unit: nextUnit, barcode },
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
    setVariantActive(input) {
      const variant = deps.repository.findVariantById(input.variantId);
      if (variant === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Biến thể không tồn tại.' },
        };
      }
      const product = deps.repository.findProductById(variant.productId);
      if (product === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Sản phẩm không tồn tại.' },
        };
      }

      const updatedVariant: VariantDTO = { ...variant, isActive: input.isActive };
      deps.repository.saveVariant(updatedVariant);

      return {
        ok: true,
        data: { product, variant: updatedVariant },
      };
    },
    configureBundleFormula(input) {
      const bundleVariant = deps.repository.findVariantById(input.bundleVariantId);
      if (bundleVariant === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Biến thể bundle không tồn tại.' },
        };
      }
      const bundleProduct = deps.repository.findProductById(bundleVariant.productId);
      if (bundleProduct === undefined || bundleProduct.productType !== 'Bundle') {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Chỉ product loại Bundle được cấu hình công thức.' },
        };
      }
      const componentIds = input.components.map((component) => component.componentVariantId);
      if (new Set(componentIds).size !== componentIds.length) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Component trong công thức bị trùng.' },
        };
      }
      if (componentIds.includes(input.bundleVariantId)) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Bundle không được chứa chính nó làm component.' },
        };
      }
      if (input.components.some((component) => component.quantityBase <= 0)) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Số lượng component phải lớn hơn 0.' },
        };
      }
      const components = deps.repository.findVariantsByIds(componentIds);
      if (components.length !== componentIds.length) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Component variant không tồn tại.' },
        };
      }

      const effectiveFrom = input.effectiveFrom ?? deps.now().toISOString();
      const retiredFormula = activeBundleFormulaForVariant(deps.repository, input.bundleVariantId);
      const nextFormula: BundleFormulaVersionDTO = {
        formulaVersionId: deps.newId('bundle-formula'),
        tenantId: deps.tenantId,
        bundleVariantId: input.bundleVariantId,
        effectiveFrom,
        status: 'Active',
        components: input.components.map((component) => ({
          componentVariantId: component.componentVariantId,
          quantityBase: component.quantityBase,
          substitutionAllowed: component.substitutionAllowed,
        })),
      };
      const retired =
        retiredFormula === undefined
          ? undefined
          : {
              ...retiredFormula,
              status: 'Retired' as const,
              effectiveTo: effectiveFrom,
            };
      if (retired !== undefined) deps.repository.saveBundleFormulaVersion(retired);
      deps.repository.saveBundleFormulaVersion(nextFormula);

      return { ok: true, data: { formula: nextFormula, retiredFormula: retired } };
    },
    getActiveBundleFormula(input) {
      const bundleVariant = deps.repository.findVariantById(input.bundleVariantId);
      if (bundleVariant === undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Biến thể bundle không tồn tại.' },
        };
      }
      return {
        ok: true,
        data: {
          formula: activeBundleFormulaForVariant(deps.repository, input.bundleVariantId),
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

      const projectionVariants = variants
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
        });

      return {
        projectionVersion: createPosProjectionVersion(input, projectionVariants),
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        generatedAt: deps.now().toISOString(),
        variants: projectionVariants,
      };
    },
    quotePosLines(input) {
      const variantsById = new Map(
        deps.repository.findVariantsByIds(input.lines.map((line) => line.variantId)).map((variant) => [variant.variantId, variant]),
      );
      const productsById = new Map(
        deps.repository
          .findProductsByIds([...variantsById.values()].map((variant) => variant.productId))
          .map((product) => [product.productId, product]),
      );
      const unitsById = new Map(
        deps.repository
          .findUnitVersionsByIds(input.lines.map((line) => line.unitVersionId))
          .map((unitVersion) => [unitVersion.unitVersionId, unitVersion]),
      );
      for (const line of input.lines) {
        const variant = variantsById.get(line.variantId);
        if (variant === undefined || !variant.isActive) {
          return { ok: false, error: { ...line, reason: 'VARIANT_UNAVAILABLE' } };
        }
        const product = productsById.get(variant.productId);
        if (product === undefined) {
          return { ok: false, error: { ...line, reason: 'PRODUCT_NOT_FOUND' } };
        }
        if (!product.isActive) {
          return { ok: false, error: { ...line, reason: 'PRODUCT_INACTIVE' } };
        }
        const unitVersion = unitsById.get(line.unitVersionId);
        if (unitVersion === undefined || !unitVersion.isActive || !unitVersion.saleEnabled) {
          return { ok: false, error: { ...line, reason: 'UNIT_UNAVAILABLE' } };
        }
        if (unitVersion.variantId !== variant.variantId) {
          return { ok: false, error: { ...line, reason: 'UNIT_MISMATCH' } };
        }
      }
      const pricingVariants = input.lines.flatMap((line) => {
        const variant = variantsById.get(line.variantId);
        const unitVersion = unitsById.get(line.unitVersionId);
        if (variant === undefined || unitVersion === undefined) return [];
        return [{
          variantId: variant.variantId,
          unitVersionId: unitVersion.unitVersionId,
          unitPriceVnd: variant.unitPriceVnd,
        }];
      });

      return {
        ok: true,
        quote: createPricingService({
        variants: pricingVariants,
        priceRules: [],
        promotions: [],
        }).quoteCart(input),
      };
    },
  };
}

function createPosProjectionVersion(
  input: CatalogPosProjectionRequest,
  variants: readonly CatalogPosVariantDTO[],
): string {
  const content = JSON.stringify({
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    variants: [...variants]
      .sort((left, right) => left.variantId.localeCompare(right.variantId) || left.unitVersionId.localeCompare(right.unitVersionId))
      .map((variant) => [
        variant.variantId,
        variant.productId,
        variant.sku,
        variant.displayName,
        variant.barcode,
        variant.unitVersionId,
        variant.unitName,
        variant.unitPriceVnd,
        variant.saleEnabled,
        variant.inventoryMode,
        variant.lotTracking,
        variant.serialTracking,
        variant.isActive,
      ]),
  });
  let hash = 2_166_136_261;
  for (let index = 0; index < content.length; index += 1) {
    hash = Math.imul(hash ^ content.charCodeAt(index), 16_777_619);
  }
  return `catalog-pos-${(hash >>> 0).toString(36)}`;
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

function activeBundleFormulaForVariant(
  repository: CatalogRepository,
  bundleVariantId: string,
): BundleFormulaVersionDTO | undefined {
  return repository
    .listBundleFormulaVersions()
    .filter((formula) => formula.bundleVariantId === bundleVariantId && formula.status === 'Active')
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))[0];
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

function createUnitVersion(input: {
  unitVersionId: string;
  tenantId: string;
  variantId: string;
  unitId: string;
  factor: number;
  saleEnabled: boolean;
  purchaseEnabled: boolean;
  effectiveFrom: string;
}): UnitConversionVersionDTO {
  const unitId = input.unitId.trim();
  return {
    unitVersionId: input.unitVersionId,
    tenantId: input.tenantId,
    variantId: input.variantId,
    unitId,
    unitName: unitId,
    baseUnitId: unitId,
    factor: input.factor,
    saleEnabled: input.saleEnabled,
    purchaseEnabled: input.purchaseEnabled,
    effectiveFrom: input.effectiveFrom,
    isActive: true,
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

function resolveInventoryModeForProductType(
  productType: ProductDTO['productType'],
  requested: InventoryMode | undefined,
): InventoryMode {
  if (requested !== undefined) return requested;
  if (productType === 'Service' || productType === 'NonStock') return 'NotTracked';
  if (productType === 'Bundle') return 'Bundle';
  return 'Tracked';
}
