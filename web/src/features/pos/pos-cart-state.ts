import type {
  CatalogPosProjectionResponse,
  CatalogPosVariantDTO,
  PosCatalogCacheDiagnostics,
} from './catalog-cache/pos-catalog-cache';
import { createPosCatalogCache } from './catalog-cache/pos-catalog-cache';

export interface PosCartLine {
  lineId: string;
  variantId: string;
  unitVersionId: string;
  sku: string;
  displayName: string;
  unitName: string;
  quantity: number;
  quantityMilli: number;
  unitPriceVnd: number;
  lineDiscountVnd: number;
  lineSubtotalVnd: number;
  lineTotalVnd: number;
  lotTracking: boolean;
  serialTracking: boolean;
}

export interface PosCartSnapshot {
  projectionVersion: string;
  branchId: string;
  warehouseId: string;
  lines: readonly PosCartLine[];
  totals: {
    subtotalVnd: number;
    discountVnd: number;
    totalVnd: number;
  };
}

export type PosCartMutationResult =
  | { type: 'added'; line: PosCartLine }
  | { type: 'updated'; line: PosCartLine }
  | { type: 'not-found'; query: string }
  | { type: 'ambiguous'; matches: readonly CatalogPosVariantDTO[] };

export interface PosCartState {
  search(term: string): readonly CatalogPosVariantDTO[];
  scanBarcode(barcode: string): PosCartMutationResult;
  addFirstSearchResult(term: string): PosCartMutationResult;
  addVariant(variant: CatalogPosVariantDTO, quantity?: number): PosCartMutationResult;
  changeQuantity(variantId: string, quantity: number): PosCartMutationResult;
  removeLine(variantId: string): boolean;
  clear(): void;
  getSnapshot(): PosCartSnapshot;
}

export function createPosCartState(
  projection: CatalogPosProjectionResponse,
  diagnostics: PosCatalogCacheDiagnostics = {},
): PosCartState {
  const cache = createPosCatalogCache(projection, diagnostics);
  const lines = new Map<string, PosCartLine>();

  return {
    search(term) {
      return cache.search(term);
    },
    scanBarcode(barcode) {
      const variant = cache.findByBarcode(barcode);
      if (variant === undefined) return { type: 'not-found', query: barcode };
      return addOrIncrement(lines, variant, 1);
    },
    addFirstSearchResult(term) {
      const matches = cache.search(term);
      if (matches.length === 0) return { type: 'not-found', query: term };
      if (matches.length > 1) return { type: 'ambiguous', matches };
      return addOrIncrement(lines, matches[0], 1);
    },
    addVariant(variant, quantity = 1) {
      return addOrIncrement(lines, variant, quantity);
    },
    changeQuantity(variantId, quantity) {
      const current = lines.get(variantId);
      if (current === undefined) return { type: 'not-found', query: variantId };
      const next = buildLine(current, Math.max(1, quantity));
      lines.set(variantId, next);
      return { type: 'updated', line: next };
    },
    removeLine(variantId) {
      return lines.delete(variantId);
    },
    clear() {
      lines.clear();
    },
    getSnapshot() {
      const currentLines = [...lines.values()];
      const subtotalVnd = currentLines.reduce((sum, line) => sum + line.lineSubtotalVnd, 0);
      const discountVnd = currentLines.reduce((sum, line) => sum + line.lineDiscountVnd, 0);
      return {
        projectionVersion: projection.projectionVersion,
        branchId: projection.branchId,
        warehouseId: projection.warehouseId,
        lines: currentLines,
        totals: {
          subtotalVnd,
          discountVnd,
          totalVnd: Math.max(0, subtotalVnd - discountVnd),
        },
      };
    },
  };
}

function addOrIncrement(
  lines: Map<string, PosCartLine>,
  variant: CatalogPosVariantDTO,
  quantity: number,
): PosCartMutationResult {
  const current = lines.get(variant.variantId);
  const next =
    current === undefined
      ? buildLine(
          {
            lineId: `line-${variant.variantId}`,
            variantId: variant.variantId,
            unitVersionId: variant.unitVersionId,
            sku: variant.sku,
            displayName: variant.displayName,
            unitName: variant.unitName,
            quantity: 0,
            quantityMilli: 0,
            unitPriceVnd: variant.unitPriceVnd,
            lineDiscountVnd: 0,
            lineSubtotalVnd: 0,
            lineTotalVnd: 0,
            lotTracking: variant.lotTracking,
            serialTracking: variant.serialTracking,
          },
          quantity,
        )
      : buildLine(current, current.quantity + quantity);
  lines.set(variant.variantId, next);
  return { type: current === undefined ? 'added' : 'updated', line: next };
}

function buildLine(line: PosCartLine, quantity: number): PosCartLine {
  const lineSubtotalVnd = Math.round(line.unitPriceVnd * quantity);
  return {
    ...line,
    quantity,
    quantityMilli: Math.round(quantity * 1_000),
    lineSubtotalVnd,
    lineTotalVnd: Math.max(0, lineSubtotalVnd - line.lineDiscountVnd),
  };
}
