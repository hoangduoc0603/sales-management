import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import { SalesOrdersReturnsHome } from '../../web/src/features/sales/sales-orders-returns-home';

const scope: CurrentScopeResponse = {
  tenant: {
    tenantId: 'tenant-default',
    displayName: 'Công ty Cenio Retail',
    status: 'Active',
    timezone: 'Asia/Ho_Chi_Minh',
    activeConfigVersionId: 'config-default',
  },
  branches: [
    {
      branchId: 'branch-default',
      tenantId: 'tenant-default',
      branchCode: 'BR-DEFAULT',
      name: 'Chi nhánh mặc định',
      status: 'Active',
    },
  ],
  warehouses: [
    {
      warehouseId: 'warehouse-default',
      tenantId: 'tenant-default',
      branchId: 'branch-default',
      warehouseCode: 'WH-DEFAULT',
      name: 'Kho mặc định',
      status: 'Active',
      directSaleEnabled: true,
      negativeStockPolicy: 'Block',
      lotTrackingDefault: false,
      serialTrackingDefault: false,
    },
  ],
  activeBranchId: 'branch-default',
  activeWarehouseId: 'warehouse-default',
};

describe('SalesOrdersReturnsHome', () => {
  it('render sales orders, return and warranty shell theo approved handoff', () => {
    const html = renderToStaticMarkup(
      createElement(SalesOrdersReturnsHome, {
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
      }),
    );

    expect(html).toContain('Đơn bán &amp; hậu mãi');
    expect(html).toContain('Nguồn đơn');
    expect(html).toContain('Trạng thái đơn');
    expect(html).toContain('Tìm mã đơn, khách hàng hoặc SĐT');
    expect(html).toContain('Chưa có đơn phù hợp');
    expect(html).toContain('Đơn online cần xử lý');
    expect(html).toContain('SO-260726-01842');
    expect(html).toContain('Draft → Confirmed → Packing → Shipped → Delivered');
    expect(html).toContain('Xác nhận giữ hàng');
    expect(html).toContain('Xuất giao');
    expect(html).toContain('Giao thành công');
    expect(html).toContain('Trả hàng theo đơn gốc');
    expect(html).toContain('Fast return cần quyền riêng');
    expect(html).toContain('Bảo hành theo serial');
    expect(html).toContain('Dữ liệu nhạy cảm bị hạn chế');
    expect(html).toContain('Chi tiết đơn nhập tay &amp; fulfillment');
    expect(html).toContain('Khách nhận');
    expect(html).toContain('Nghĩa vụ thanh toán');
    expect(html).toContain('Kiểm tra trước xác nhận');
    expect(html).toContain('Thông tin bàn giao');
    expect(html).toContain('Cancel guard');
    expect(html).toContain('Không thể hủy trực tiếp');
    expect(html).not.toContain('Artifact Approved');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('Shopee');
    expect(html).not.toContain('Website');
  });

  it('renders the explicit-save manual order composer from the approved design', () => {
    const html = renderToStaticMarkup(
      createElement(SalesOrdersReturnsHome, {
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
      }),
    );

    expect(html).toContain('Tạo / sửa đơn nhập tay');
    expect(html).toContain('Nháp được lưu rõ ràng theo lựa chọn; không tự lưu.');
    expect(html).toContain('Nguồn nhập tay');
    expect(html).toContain('Điện thoại');
    expect(html).toContain('Tin nhắn khách hàng');
    expect(html).toContain('Khách đặt trước');
    expect(html).toContain('Nhân viên tạo');
    expect(html).toContain('Khách nhận');
    expect(html).toContain('Số điện thoại');
    expect(html).toContain('Địa chỉ nhận');
    expect(html).toContain('Kho xuất / reservation');
    expect(html).toContain('Đặt cọc');
    expect(html).toContain('Hủy nháp');
    expect(html).toContain('Lưu nháp đơn');
    expect(html).toContain('Xác nhận đơn');
    expect(html).toContain('Lưu nháp trước khi xác nhận.');
    expect(html).not.toContain('<select');
  });

  it('renders source-return actions for the selected order instead of a static-only panel', () => {
    const html = renderToStaticMarkup(
      createElement(SalesOrdersReturnsHome, {
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
      }),
    );

    expect(html).toContain('Tạo phiếu trả từ đơn đã chọn');
    expect(html).toContain('Đơn hợp lệ: Completed / Shipped / Delivered.');
    expect(html).toContain('Chờ kiểm hàng');
    expect(html).toContain('Hoàn tất kiểm hàng');
    expect(html).toContain('Tạo phiếu trả');
    expect(html).toContain('Restock');
    expect(html).toContain('KeepQuarantine');
    expect(html).toContain('Scrap');
  });

  it('renders serial warranty actions for the selected order instead of a static-only panel', () => {
    const html = renderToStaticMarkup(
      createElement(SalesOrdersReturnsHome, {
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
      }),
    );

    expect(html).toContain('Mở ca bảo hành từ đơn đã chọn');
    expect(html).toContain('Serial / IMEI');
    expect(html).toContain('Không lên nguồn');
    expect(html).toContain('Mở bảo hành');
    expect(html).toContain('Chuyển InReview');
    expect(html).toContain('Đóng bảo hành');
  });

  it('renders exchange actions for the selected order instead of a static placeholder', () => {
    const html = renderToStaticMarkup(
      createElement(SalesOrdersReturnsHome, {
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
      }),
    );

    expect(html).toContain('Tạo đổi hàng từ đơn đã chọn');
    expect(html).toContain('Hàng nhận lại');
    expect(html).toContain('Hàng đổi mới');
    expect(html).toContain('Thu / hoàn chênh lệch');
    expect(html).toContain('Tạo đơn đổi hàng');
    expect(html).not.toContain('Chờ triển khai exchange sâu');
  });

  it('keeps hidden helper copy visually hidden instead of leaking into the table', () => {
    const css = readFileSync(resolve(process.cwd(), 'web/src/styles/index.css'), 'utf8');

    expect(css).toMatch(/\.sr-only\s*\{/);
    expect(css).toContain('clip: rect(0, 0, 0, 0)');
  });
});
