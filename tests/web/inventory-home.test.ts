import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InventoryHome } from '../../web/src/features/inventory/inventory-home';

describe('InventoryHome', () => {
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

  it('route purchasing prioritizes purchase workspace copy', () => {
    const html = renderToStaticMarkup(createElement(InventoryHome, { route: 'purchasing' }));

    expect(html).toContain('Purchase orders &amp; goods receipt');
    expect(html).toContain('Landed cost &amp; late invoice');
    expect(html).toContain('Supplier return');
  });
});
