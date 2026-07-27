import type {
  CatalogPosProjectionResponse,
  CatalogPosVariantDTO,
} from '@shared/contracts/catalog/catalog';

export type { CatalogPosProjectionResponse, CatalogPosVariantDTO };

export interface PosCatalogCacheDiagnostics {
  onUnexpectedRemoteLookup?(): void;
}

export interface PosCatalogCache {
  projectionVersion: string;
  findByBarcode(barcode: string): CatalogPosVariantDTO | undefined;
  search(term: string): readonly CatalogPosVariantDTO[];
}

export function createPosCatalogCache(
  projection: CatalogPosProjectionResponse,
  diagnostics: PosCatalogCacheDiagnostics = {},
): PosCatalogCache {
  void diagnostics;
  const barcodeIndex = new Map<string, CatalogPosVariantDTO>();
  const searchable = projection.variants.map((variant) => {
    if (variant.barcode !== undefined) {
      barcodeIndex.set(normalizeLookup(variant.barcode), variant);
    }

    return {
      variant,
      haystack: normalizeLookup(
        [variant.sku, variant.barcode, variant.displayName, variant.unitName]
          .filter((value): value is string => value !== undefined)
          .join(' '),
      ),
    };
  });

  return {
    projectionVersion: projection.projectionVersion,
    findByBarcode(barcode) {
      return barcodeIndex.get(normalizeLookup(barcode));
    },
    search(term) {
      const query = normalizeLookup(term);
      if (query.length === 0) {
        return [];
      }

      return searchable
        .filter((entry) => entry.haystack.includes(query))
        .map((entry) => entry.variant);
    },
  };
}

function normalizeLookup(value: string): string {
  return value.trim().toLocaleUpperCase('vi-VN');
}
