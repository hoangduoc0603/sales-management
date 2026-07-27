import { describe, expect, it } from 'vitest';
import type { CatalogPosProjectionResponse } from '../../web/src/features/pos/catalog-cache/pos-catalog-cache';
import { createPosCatalogCache } from '../../web/src/features/pos/catalog-cache/pos-catalog-cache';

const projection: CatalogPosProjectionResponse = {
  projectionVersion: 'catalog-pos-v1',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  generatedAt: '2026-07-27T00:00:00.000Z',
  variants: [
    {
      variantId: 'variant-milk-1l',
      productId: 'product-milk',
      sku: 'SH-OC-1L',
      displayName: 'Sữa hạt óc chó 1L',
      barcode: '893000000001',
      unitVersionId: 'unit-bottle-v1',
      unitName: 'chai',
      unitPriceVnd: 42000,
      saleEnabled: true,
      inventoryMode: 'Tracked',
      lotTracking: false,
      serialTracking: false,
      isActive: true,
    },
  ],
};

describe('createPosCatalogCache', () => {
  it('search và barcode lookup chạy từ projection local, không cần API callback', () => {
    let apiCalls = 0;
    const cache = createPosCatalogCache(projection, {
      onUnexpectedRemoteLookup: () => {
        apiCalls += 1;
      },
    });

    expect(cache.findByBarcode(' 893000000001 ')?.sku).toBe('SH-OC-1L');
    expect(cache.search('óc chó')).toEqual([projection.variants[0]]);
    expect(cache.search('sh-oc')).toEqual([projection.variants[0]]);
    expect(apiCalls).toBe(0);
  });

  it('search được trong projection 10.000 variants mà không gọi backend từng phím', () => {
    let apiCalls = 0;
    const largeProjection: CatalogPosProjectionResponse = {
      ...projection,
      variants: Array.from({ length: 10_000 }, (_, index) => ({
        ...projection.variants[0],
        variantId: `variant-${index}`,
        productId: `product-${index}`,
        sku: `SKU-${index}`,
        displayName: index === 9876 ? 'Sản phẩm benchmark mục tiêu' : `Sản phẩm ${index}`,
        barcode: `BC-${index}`,
      })),
    };
    const cache = createPosCatalogCache(largeProjection, {
      onUnexpectedRemoteLookup: () => {
        apiCalls += 1;
      },
    });

    expect(cache.findByBarcode('BC-9876')?.sku).toBe('SKU-9876');
    expect(cache.search('benchmark mục tiêu')[0]?.variantId).toBe('variant-9876');
    expect(apiCalls).toBe(0);
  });
});
