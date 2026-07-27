import { describe, expect, it } from 'vitest';
import { createPosCartState } from '../../web/src/features/pos/pos-cart-state';
import type { CatalogPosProjectionResponse } from '../../web/src/features/pos/catalog-cache/pos-catalog-cache';

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
      unitPriceVnd: 42_000,
      saleEnabled: true,
      inventoryMode: 'Tracked',
      lotTracking: false,
      serialTracking: false,
      isActive: true,
    },
  ],
};

describe('createPosCartState', () => {
  it('scan/search/add/change/remove and totals run from local projection without API callback', () => {
    let apiCalls = 0;
    const cart = createPosCartState(projection, {
      onUnexpectedRemoteLookup: () => {
        apiCalls += 1;
      },
    });

    expect(cart.search('óc chó')[0]?.sku).toBe('SH-OC-1L');
    expect(cart.scanBarcode('893000000001')).toMatchObject({ type: 'added', line: { quantity: 1 } });
    expect(cart.scanBarcode('893000000001')).toMatchObject({ type: 'updated', line: { quantity: 2 } });
    expect(cart.changeQuantity('variant-milk-1l', 3)).toMatchObject({ type: 'updated', line: { quantity: 3 } });
    expect(cart.getSnapshot()).toMatchObject({
      lines: [{ variantId: 'variant-milk-1l', quantity: 3, lineTotalVnd: 126_000 }],
      totals: { subtotalVnd: 126_000, totalVnd: 126_000 },
    });
    expect(cart.removeLine('variant-milk-1l')).toBe(true);
    expect(cart.getSnapshot().lines).toHaveLength(0);
    expect(apiCalls).toBe(0);
  });

  it('does not auto-add unknown barcode or ambiguous search result', () => {
    const cart = createPosCartState(
      {
        ...projection,
        variants: [
          projection.variants[0],
          { ...projection.variants[0], variantId: 'variant-milk-2', sku: 'SH-OC-2L', barcode: undefined },
        ],
      },
    );

    expect(cart.scanBarcode('unknown')).toEqual({ type: 'not-found', query: 'unknown' });
    expect(cart.addFirstSearchResult('Sữa hạt')).toMatchObject({ type: 'ambiguous', matches: expect.any(Array) });
    expect(cart.getSnapshot().lines).toHaveLength(0);
  });
});
