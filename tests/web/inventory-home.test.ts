import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InventoryHome } from '../../web/src/features/inventory/inventory-home';

describe('InventoryHome', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders inventory shell according to approved Inventory/Purchasing handoff', () => {
    const html = renderToStaticMarkup(
      createElement(InventoryHome, {
        route: 'inventory',
        rows: [
          {
            variantId: 'variant-milk-1l',
            sku: 'SH-OC-1L',
            displayName: 'Sữa hạt óc chó 1L',
            unitName: 'chai',
            onHandMilli: 10_000,
            availableMilli: 7_000,
            reservedMilli: 3_000,
            quarantineMilli: 0,
            inventoryValueVnd: 1_000_000,
          },
        ],
      }),
    );

    expect(html).toContain('Kho, luân chuyển &amp; mua hàng');
    expect(html).toContain('Tồn kho theo biến thể');
    expect(html).toContain('Stock card');
    expect(html).toContain('Adjustment &amp; scrap');
    expect(html).toContain('Lot / serial / expiry');
    expect(html).toContain('COGS bị giới hạn theo quyền');
    expect(html).not.toContain('<select');
  });

  it('renders approved transfer workbench from hash state', () => {
    vi.stubGlobal('window', {
      location: {
        hash: '#transfer',
        pathname: '/app',
        search: '',
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      history: {
        replaceState: () => undefined,
      },
    });

    const html = renderToStaticMarkup(createElement(InventoryHome, { route: 'inventory' }));

    expect(html).toContain('Điều chuyển TRF-240726-041');
    expect(html).toContain('Partially received');
    expect(html).toContain('Approval guard');
    expect(html).toContain('Gửi duyệt chênh lệch');
  });

  it('renders approved stocktake workbench from hash state', () => {
    vi.stubGlobal('window', {
      location: {
        hash: '#stocktake',
        pathname: '/app',
        search: '',
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      history: {
        replaceState: () => undefined,
      },
    });

    const html = renderToStaticMarkup(createElement(InventoryHome, { route: 'inventory' }));

    expect(html).toContain('Stocktake STK-240726-08');
    expect(html).toContain('movement sau snapshot');
    expect(html).toContain('Variance approval');
    expect(html).toContain('CountAdjustment movement');
  });

  it('renders restricted negative cost and lot trace hash states', () => {
    vi.stubGlobal('window', {
      location: {
        hash: '#negative-cost',
        pathname: '/app',
        search: '',
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      history: {
        replaceState: () => undefined,
      },
    });

    const negativeCostHtml = renderToStaticMarkup(createElement(InventoryHome, { route: 'inventory' }));
    expect(negativeCostHtml).toContain('Negative stock exception');
    expect(negativeCostHtml).toContain('Temporary cost');
    expect(negativeCostHtml).toContain('Không có quyền duyệt');

    vi.stubGlobal('window', {
      location: {
        hash: '#trace',
        pathname: '/app',
        search: '',
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      history: {
        replaceState: () => undefined,
      },
    });

    const traceHtml = renderToStaticMarkup(createElement(InventoryHome, { route: 'inventory' }));
    expect(traceHtml).toContain('Trace lot / serial');
    expect(traceHtml).toContain('Movement ledger');
    expect(traceHtml).toContain('Immutable card.');
  });

  it('route purchasing prioritizes purchase workspace copy', () => {
    const html = renderToStaticMarkup(createElement(InventoryHome, { route: 'purchasing' }));

    expect(html).toContain('Purchase orders &amp; goods receipt');
    expect(html).toContain('Landed cost &amp; late invoice');
    expect(html).toContain('Supplier return');
  });
});
