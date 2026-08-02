import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CatalogCrmHome } from '../../web/src/features/catalog/catalog-crm-home';

describe('CatalogCrmHome', () => {
  it('render các khu vực chính theo handoff Catalog/CRM/Commercial', () => {
    const html = renderToStaticMarkup(createElement(CatalogCrmHome, { route: 'catalog' }));

    expect(html).toContain('Hàng hóa &amp; biến thể');
    expect(html).toContain('Catalog table');
    expect(html).toContain('Product editor');
    expect(html).toContain('Product master');
    expect(html).toContain('Variant &amp; đơn vị');
    expect(html).toContain('Barcode search');
    expect(html).toContain('Loại hàng');
    expect(html).toContain('Stocked');
    expect(html).toContain('Service');
    expect(html).toContain('NonStock');
    expect(html).toContain('Bundle');
    expect(html).toContain('Chế độ tồn');
    expect(html).toContain('Tracked');
    expect(html).toContain('NotTracked');
    expect(html).toContain('Tạo sản phẩm');
    expect(html).toContain('Ngừng bán');
    expect(html).toContain('Tên hàng, SKU hoặc barcode');
    expect(html).toContain('không xóa cứng');
    expect(html).not.toContain('<select');
  });

  it('route customers ưu tiên Customer workspace', () => {
    const html = renderToStaticMarkup(createElement(CatalogCrmHome, { route: 'customers' }));

    expect(html).toContain('Khách hàng &amp; loyalty');
    expect(html).toContain('Tìm khách hàng');
    expect(html).toContain('Tên, số điện thoại, email hoặc mã khách');
    expect(html).toContain('Tạo nhanh khách hàng');
    expect(html).toContain('Nhóm khách');
    expect(html).toContain('Cảnh báo trùng');
    expect(html).toContain('Không có công nợ/hạn mức nhạy cảm trong payload');
    expect(html).not.toContain('<select');
  });
});
