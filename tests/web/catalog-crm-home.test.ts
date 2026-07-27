import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CatalogCrmHome } from '../../web/src/features/catalog/catalog-crm-home';

describe('CatalogCrmHome', () => {
  it('render các khu vực chính theo handoff Catalog/CRM/Commercial', () => {
    const html = renderToStaticMarkup(createElement(CatalogCrmHome, { route: 'catalog' }));

    expect(html).toContain('Catalog, CRM &amp; Commercial');
    expect(html).toContain('Product / Variant');
    expect(html).toContain('Customer 360');
    expect(html).toContain('Price lists &amp; promotions');
    expect(html).toContain('Catalog import');
    expect(html).toContain('Không hiển thị cost/supplier/credit nhạy cảm');
    expect(html).not.toContain('<select');
  });

  it('route customers ưu tiên Customer workspace', () => {
    const html = renderToStaticMarkup(createElement(CatalogCrmHome, { route: 'customers' }));

    expect(html).toContain('Khách hàng &amp; loyalty');
    expect(html).toContain('Duplicate warning');
    expect(html).toContain('Point ledger');
  });
});
