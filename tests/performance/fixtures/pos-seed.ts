import type { CatalogPosProjectionResponse, CatalogPosVariantDTO } from '../../../web/src/features/pos/catalog-cache/pos-catalog-cache';

export interface BenchmarkSample {
  name: string;
  durationsMs: readonly number[];
  p95Ms: number;
  p99Ms: number;
}

export function createLargePosProjection(variantCount = 10_000): CatalogPosProjectionResponse {
  const variants = Array.from({ length: variantCount }, (_, index): CatalogPosVariantDTO => {
    const padded = index.toString().padStart(5, '0');
    return {
      variantId: `variant-benchmark-${padded}`,
      productId: `product-benchmark-${padded}`,
      sku: `SKU-BENCH-${padded}`,
      displayName: index === 9_876
        ? 'Sản phẩm benchmark mục tiêu'
        : `Sản phẩm bán lẻ benchmark ${padded}`,
      barcode: `893000${padded}`,
      unitVersionId: `unit-benchmark-${padded}`,
      unitName: 'cái',
      unitPriceVnd: 10_000 + (index % 50) * 1_000,
      saleEnabled: true,
      inventoryMode: 'Tracked',
      lotTracking: false,
      serialTracking: false,
      isActive: true,
    };
  });

  return {
    projectionVersion: `catalog-pos-benchmark-${variantCount}`,
    branchId: 'branch-default',
    warehouseId: 'warehouse-default',
    generatedAt: '2026-07-27T00:00:00.000Z',
    variants,
  };
}

export function measureDurationsMs(
  name: string,
  iterations: number,
  operation: (index: number) => void,
): BenchmarkSample {
  const durationsMs: number[] = [];

  for (let index = 0; index < iterations; index += 1) {
    const started = process.hrtime.bigint();
    operation(index);
    const ended = process.hrtime.bigint();
    durationsMs.push(Number(ended - started) / 1_000_000);
  }

  return {
    name,
    durationsMs,
    p95Ms: percentile(durationsMs, 0.95),
    p99Ms: percentile(durationsMs, 0.99),
  };
}

export function percentile(values: readonly number[], percentileRank: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * percentileRank) - 1),
  );

  return sorted[index];
}
