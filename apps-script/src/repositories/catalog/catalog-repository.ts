import type {
  ProductDTO,
  UnitConversionVersionDTO,
  VariantBarcodeDTO,
  VariantDTO,
} from '@shared/contracts/catalog/catalog';

export interface CatalogRepository {
  findVariantBySkuNormalized(skuNormalized: string): VariantDTO | undefined;
  findBarcodeByNormalized(barcodeNormalized: string): VariantBarcodeDTO | undefined;
  listProducts(): readonly ProductDTO[];
  listVariants(): readonly VariantDTO[];
  listBarcodes(): readonly VariantBarcodeDTO[];
  listUnitVersions(): readonly UnitConversionVersionDTO[];
  saveProduct(product: ProductDTO): void;
  saveVariant(variant: VariantDTO): void;
  saveBarcode(barcode: VariantBarcodeDTO): void;
  saveUnitVersion(unitVersion: UnitConversionVersionDTO): void;
}

export function createInMemoryCatalogRepository(): CatalogRepository {
  const products = new Map<string, ProductDTO>();
  const variants = new Map<string, VariantDTO>();
  const barcodes = new Map<string, VariantBarcodeDTO>();
  const unitVersions = new Map<string, UnitConversionVersionDTO>();

  return {
    findVariantBySkuNormalized(skuNormalized) {
      return [...variants.values()].find((variant) => variant.skuNormalized === skuNormalized);
    },
    findBarcodeByNormalized(barcodeNormalized) {
      return [...barcodes.values()].find((barcode) => barcode.barcodeNormalized === barcodeNormalized);
    },
    listProducts: () => [...products.values()].map(clone),
    listVariants: () => [...variants.values()].map(clone),
    listBarcodes: () => [...barcodes.values()].map(clone),
    listUnitVersions: () => [...unitVersions.values()].map(clone),
    saveProduct(product) {
      products.set(product.productId, clone(product));
    },
    saveVariant(variant) {
      variants.set(variant.variantId, clone(variant));
    },
    saveBarcode(barcode) {
      barcodes.set(barcode.barcodeId, clone(barcode));
    },
    saveUnitVersion(unitVersion) {
      unitVersions.set(unitVersion.unitVersionId, clone(unitVersion));
    },
  };
}

function clone<T>(value: T): T {
  return { ...value };
}
