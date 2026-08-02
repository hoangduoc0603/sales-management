import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../apps-script/src/bootstrap/create-api-composition';
import { createPosCatalogCache } from '../../web/src/features/pos/catalog-cache/pos-catalog-cache';
import { createPosCartState } from '../../web/src/features/pos/pos-cart-state';
import {
  createLargePosProjection,
  measureDurationsMs,
  summarizePerformanceSamples,
} from './fixtures/pos-seed';
import type { ApiResult } from '@shared/contracts/api';

type ApiComposition = ReturnType<typeof createApiComposition>;

function invokeOk<TData>(
  api: ApiComposition,
  request: Parameters<ApiComposition['invoke']>[0],
): TData {
  const result = api.invoke(request) as ApiResult<TData>;
  if (!result.ok) {
    throw new Error(JSON.stringify(result.error));
  }

  return result.data;
}

describe('POS release performance baseline', () => {
  it('labels fewer than 20 samples as smoke evidence instead of certified percentile evidence', () => {
    expect(summarizePerformanceSamples([1, 2, 3])).toEqual({
      sampleCount: 3,
      p50Ms: 2,
      p95Ms: 3,
      p99Ms: 3,
      maxMs: 3,
      certified: false,
    });
  });

  it('keeps browser-local scan/search/cart operations within SRS p95 budgets on 10,000 variants', () => {
    const projection = createLargePosProjection(10_000);
    let unexpectedRemoteLookups = 0;
    const cache = createPosCatalogCache(projection, {
      onUnexpectedRemoteLookup: () => {
        unexpectedRemoteLookups += 1;
      },
    });
    const cart = createPosCartState(projection, {
      onUnexpectedRemoteLookup: () => {
        unexpectedRemoteLookups += 1;
      },
    });

    const scanSample = measureDurationsMs('warm scan/add', 250, (index) => {
      const barcode = projection.variants[index % projection.variants.length].barcode;
      if (barcode === undefined) throw new Error('Missing benchmark barcode.');
      expect(cart.scanBarcode(barcode).type).toMatch(/added|updated/);
    });
    const searchSample = measureDurationsMs('warm search', 120, () => {
      expect(cache.search('benchmark mục tiêu')[0]?.variantId).toBe('variant-benchmark-09876');
    });
    const cartChangeSample = measureDurationsMs('warm cart change', 250, (index) => {
      const variantId = projection.variants[index % projection.variants.length].variantId;
      expect(cart.changeQuantity(variantId, (index % 5) + 1).type).toBe('updated');
    });

    expect(unexpectedRemoteLookups).toBe(0);
    expect(scanSample.p95Ms).toBeLessThanOrEqual(150);
    expect(searchSample.p95Ms).toBeLessThanOrEqual(250);
    expect(cartChangeSample.p95Ms).toBeLessThanOrEqual(100);
  });

  it('records executable local/in-memory checkout p95 and p99 baseline below SRS budgets', () => {
    const checkoutSample = measureDurationsMs('local in-memory checkout', 25, (index) => {
      runSingleCheckout(index);
    });

    expect(checkoutSample.p95Ms).toBeLessThanOrEqual(3_000);
    expect(checkoutSample.p99Ms).toBeLessThanOrEqual(5_000);
  });
});

function runSingleCheckout(index: number): void {
  const padded = index.toString().padStart(3, '0');
  const api = createApiComposition({ now: () => new Date('2026-07-27T10:00:00.000Z') });
  const login = invokeOk<{ sessionToken: string }>(api, {
    operation: 'platform.auth.login',
    requestId: `req-perf-login-${padded}`,
    payload: { loginId: 'admin', password: 'admin123' },
  });
  const product = invokeOk<{
    defaultVariant: { variantId: string; unitPriceVnd: number };
    defaultUnit: { unitVersionId: string };
  }>(api, {
    operation: 'catalog.product.create',
    requestId: `req-perf-product-${padded}`,
    sessionToken: login.sessionToken,
    payload: {
      productCode: `SP-PERF-${padded}`,
      name: `Sản phẩm hiệu năng ${padded}`,
      productType: 'Stocked',
      sku: `SKU-PERF-${padded}`,
      barcode: `893999${padded}`,
      defaultUnitId: 'cái',
      unitPriceVnd: 42_000,
    },
  });
  invokeOk(api, {
    operation: 'inventory.receive',
    requestId: `req-perf-opening-${padded}`,
    sessionToken: login.sessionToken,
    payload: {
      commandId: `cmd-perf-opening-${padded}`,
      idempotencyKey: `idem-perf-opening-${padded}`,
      warehouseId: 'warehouse-default',
      variantId: product.defaultVariant.variantId,
      quantityMilli: 10_000,
      unitCostVnd: 20_000,
      sourceDocument: { sourceType: 'OpeningBalance', sourceId: `opening-perf-${padded}` },
    },
  });
  const shift = invokeOk<{ shift: { shiftId: string } }>(api, {
    operation: 'finance.shift.open',
    requestId: `req-perf-shift-${padded}`,
    sessionToken: login.sessionToken,
    payload: {
      commandId: `cmd-perf-shift-${padded}`,
      idempotencyKey: `idem-perf-shift-${padded}`,
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      cashDrawerId: 'drawer-main',
      cashierId: 'user-admin',
      openingCashVnd: 500_000,
    },
  });
  const quote = invokeOk<{ quoteVersion: string; totalVnd: number }>(api, {
    operation: 'catalog.quote.preview',
    requestId: `req-perf-quote-${padded}`,
    sessionToken: login.sessionToken,
    payload: {
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      lines: [
        {
          lineId: `perf-line-${padded}`,
          variantId: product.defaultVariant.variantId,
          unitVersionId: product.defaultUnit.unitVersionId,
          quantity: 2,
        },
      ],
    },
  });
  const checkout = invokeOk<{ order: { status: string }; receipt: { receiptFormat: string } }>(api, {
    operation: 'sales.pos.complete',
    requestId: `req-perf-checkout-${padded}`,
    sessionToken: login.sessionToken,
    payload: {
      commandId: `cmd-perf-checkout-${padded}`,
      idempotencyKey: `idem-perf-checkout-${padded}`,
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      cashierId: 'user-admin',
      cashDrawerId: 'drawer-main',
      shiftId: shift.shift.shiftId,
      quoteVersion: quote.quoteVersion,
      receiptFormat: 'K80',
      lines: [
        {
          lineId: `perf-line-${padded}`,
          variantId: product.defaultVariant.variantId,
          unitVersionId: product.defaultUnit.unitVersionId,
          quantity: 2,
          quantityMilli: 2_000,
          unitPriceVnd: product.defaultVariant.unitPriceVnd,
          lineDiscountVnd: 0,
        },
      ],
      tenders: [{ tenderId: `perf-tender-${padded}`, paymentMethodId: 'cash', amountVnd: quote.totalVnd }],
    },
  });
  expect(checkout).toMatchObject({ order: { status: 'Completed' }, receipt: { receiptFormat: 'K80' } });
}
