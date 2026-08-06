import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CatalogCrmHome } from '../../web/src/features/catalog/catalog-crm-home';

describe('CatalogCrmHome', () => {
  it('render màn Hàng hóa & biến thể theo artifact đã Approved, không lẫn Customer/Commercial', () => {
    const html = renderToStaticMarkup(createElement(CatalogCrmHome, { route: 'catalog' }));

    expect(html).toContain('Hàng hóa &amp; biến thể');
    expect(html).toContain('2 sản phẩm');
    expect(html).toContain('Nhập dữ liệu');
    expect(html).toContain('Xuất dữ liệu');
    expect(html).toContain('Tìm tên hàng, SKU, barcode hoặc mã hàng');
    expect(html).toContain('Loại hàng');
    expect(html).toContain('Nhóm hàng');
    expect(html).toContain('Thương hiệu');
    expect(html).toContain('Hàng tồn');
    expect(html).toContain('Dịch vụ');
    expect(html).toContain('Không tồn');
    expect(html).toContain('Bộ sản phẩm');
    expect(html).toContain('Thiết lập tồn kho');
    expect(html).toContain('Quản lý tồn');
    expect(html).toContain('Bật quản lý tồn để thiết lập mức tồn và cách theo dõi hàng hóa.');
    expect(html).toContain('Phương thức theo dõi hàng hóa');
    expect(html).toContain('Theo dõi lô &amp; hạn sử dụng và serial / IMEI');
    expect(html).toContain('Cấu hình công thức bộ sản phẩm');
    expect(html).toContain('Bộ sản phẩm không quản lý tồn thành phẩm riêng');
    expect(html).toContain('Sửa biến thể');
    expect(html).toContain('Sao chép');
    expect(html).toContain('Ngừng bán');
    expect(html).toContain('Xác nhận ngừng bán');
    expect(html).toContain('Chỉ tạo mới. SKU hoặc barcode đã tồn tại sẽ được báo lỗi và không ghi đè.');
    expect(html).toContain('Chọn tệp');
    expect(html).toContain('Kiểm tra');
    expect(html).toContain('Xác nhận');
    expect(html).toContain('Tất cả');
    expect(html).toContain('Lỗi');
    expect(html).toContain('Hợp lệ');
    expect(html).toContain('Chỉ nhập');
    expect(html).toContain('Tải báo cáo kết quả');
    expect(html).toContain('Bạn chưa có quyền nhập dữ liệu Catalog');
    expect(html).toContain('Xuất danh mục theo filter hiện tại');
    expect(html).toContain('Tem barcode');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('Catalog workspace');
    expect(html).not.toContain('Product editor');
    expect(html).not.toContain('Barcode search');
    expect(html).not.toContain('Commercial');
  });

  it('render lifecycle action mở bán lại khi variant đang ngừng bán', () => {
    const html = renderToStaticMarkup(
      createElement(CatalogCrmHome, {
        initialProductItems: [
          {
            productId: 'product-inactive',
            productCode: 'SP-OFF',
            productName: 'Sản phẩm tạm ngừng',
            productType: 'Stocked',
            variantId: 'variant-inactive',
            sku: 'SKU-OFF',
            displayName: 'Sản phẩm tạm ngừng',
            defaultUnitId: 'cái',
            unitPriceVnd: 1000,
            inventoryMode: 'Tracked',
            lotTracking: false,
            serialTracking: false,
            isActive: false,
          },
        ],
        route: 'catalog',
      }),
    );

    expect(html).toContain('Mở bán lại');
    expect(html).toContain('Xác nhận mở bán lại');
  });

  it('render skeleton thay vì dữ liệu mẫu khi danh sách hàng hóa đang load từ API', () => {
    const html = renderToStaticMarkup(
      createElement(CatalogCrmHome, {
        apiClient: {
          invoke: async () => ({
            ok: true,
            data: { generatedAt: '2026-08-05T00:00:00.000Z', items: [] },
          }),
        },
        route: 'catalog',
        sessionToken: 'session-token',
      }),
    );

    expect(html).toContain('Đang tải danh sách hàng hóa');
    expect(html).not.toContain('class="product-row"');
    expect(html).not.toContain('data-row=""');
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
