import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InventoryHome } from '../../web/src/features/inventory/inventory-home';

describe('InventoryHome', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders approved inventory operations overview shell and read-only balance guard', () => {
    const html = renderInventory('#overview');

    expect(html).toContain('Tổng quan tồn kho');
    expect(html).toContain('Kiểm soát số dư khả dụng, cảnh báo và truy xuất theo phạm vi kho hiện tại.');
    expect(html).toContain('Tồn thực tế');
    expect(html).toContain('Tồn khả dụng');
    expect(html).toContain('cn-inventory-metric-icon neutral');
    expect(html).toContain('cn-inventory-metric-icon success');
    expect(html).toContain('cn-inventory-metric-icon warning');
    expect(html).toContain('Tạo chứng từ kho');
    expect(html).toContain('Không chỉnh sửa số dư trực tiếp');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('cn-inventory-view-tabs');
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('Snapshot');
    expect(html).not.toContain('Đồng bộ lúc');
    expect(html).not.toContain('12.486 biến thể');
  });

  it('renders the approved alert, lot serial, reservation and trace hash states', () => {
    expect(renderInventory('#alerts')).toContain('Cảnh báo cần xử lý');
    expect(renderInventory('#alerts')).toContain('Tồn thấp');
    expect(renderInventory('#alerts')).toContain('Serial bất thường');

    expect(renderInventory('#lot-serial')).toContain('Lô và serial cần theo dõi');
    expect(renderInventory('#lot-serial')).toContain('không thay đổi số dư trực tiếp tại đây');
    expect(renderInventory('#lot-serial')).toContain('Quy tắc khả dụng');

    expect(renderInventory('#reservation')).toContain('Giữ chỗ theo nguồn');
    expect(renderInventory('#reservation')).toContain('Giữ chỗ là cam kết giao hàng');
    expect(renderInventory('#reservation')).toContain('Đang chuyển, không khả dụng');

    expect(renderInventory('#trace')).toContain('Truy xuất biến động kho');
    expect(renderInventory('#trace')).toContain('Nhật ký bất biến, chỉ đọc');
    expect(renderInventory('#trace')).toContain('Tất cả chứng từ nguồn');
    expect(renderInventory('#trace')).toContain('SO-04218');
  });

  it('renders empty, restricted and scope-changed states from approved handoff', () => {
    expect(renderInventory('#empty')).toContain('Chưa có biến thể trong phạm vi này');
    expect(renderInventory('#empty')).toContain('Hiển thị theo quyền tạo chứng từ kho của bạn');

    expect(renderInventory('#restricted')).toContain('Phạm vi xem tồn kho bị giới hạn');
    expect(renderInventory('#restricted')).toContain('Các trường giá vốn và giá trị tồn không nằm trong quyền hiện tại');

    expect(renderInventory('#scope-changed')).toContain('Phạm vi kho đã thay đổi');
    expect(renderInventory('#scope-changed')).toContain('Dữ liệu cũ đã được xoá');
    expect(renderInventory('#scope-changed')).toContain('Làm mới tồn kho');
  });

  it('renders the receiving workflow instead of the handoff placeholder', () => {
    const html = renderInventory('#receiving');

    expect(html).toContain('Nhập kho và tiếp nhận hàng');
    expect(html).toContain('Hàng chờ tiếp nhận');
    expect(html).toContain('GRN-0108');
    expect(html).toContain('Theo PO');
    expect(html).toContain('Lô / serial');
    expect(html).toContain('Chi phí mua');
    expect(html).toContain('Gửi duyệt');
    expect(html).toContain('cn-inventory-metric-icon neutral');
    expect(html).toContain('cn-inventory-metric-icon success');
    expect(html).toContain('cn-inventory-metric-icon info');
    expect(html).toContain('cn-inventory-metric-icon warning');
    expect(html).not.toContain('Sẵn sàng triển khai theo thiết kế');
  });

  it('renders the outbound workflow instead of the handoff placeholder', () => {
    const html = renderInventory('#outbound');

    expect(html).toContain('Xuất kho và fulfillment theo nguồn');
    expect(html).toContain('Hàng chờ xuất');
    expect(html).toContain('Pick / pack / ship');
    expect(html).toContain('FEFO');
    expect(html).toContain('Serial bắt buộc');
    expect(html).toContain('Thiếu tồn');
    expect(html).toContain('Xác nhận xuất kho');
    expect(html).not.toContain('Sẵn sàng triển khai theo thiết kế');
  });

  it('renders the transfer workflow instead of the handoff placeholder', () => {
    const html = renderInventory('#transfer');

    expect(html).toContain('Điều chuyển và nhận kho');
    expect(html).toContain('Phiếu điều chuyển');
    expect(html).toContain('Kho nguồn');
    expect(html).toContain('Kho đích');
    expect(html).toContain('Đã ship');
    expect(html).toContain('Đã nhận');
    expect(html).toContain('Chênh lệch nhận');
    expect(html).not.toContain('Sẵn sàng triển khai theo thiết kế');
  });

  it('renders the stocktake workflow instead of the handoff placeholder', () => {
    const html = renderInventory('#stocktake');

    expect(html).toContain('Kiểm kê kho');
    expect(html).toContain('Phiên kiểm kê');
    expect(html).toContain('Snapshot hệ thống');
    expect(html).toContain('Số thực tế');
    expect(html).toContain('Chênh lệch');
    expect(html).toContain('Movement sau snapshot');
    expect(html).toContain('Gửi duyệt');
    expect(html).not.toContain('Sẵn sàng triển khai theo thiết kế');
  });

  it('renders the adjustment workflow instead of the handoff placeholder', () => {
    const html = renderInventory('#adjustment');

    expect(html).toContain('Điều chỉnh kho và ngoại lệ');
    expect(html).toContain('Phiếu điều chỉnh');
    expect(html).toContain('Tồn trước');
    expect(html).toContain('Tồn sau');
    expect(html).toContain('Lý do chuẩn hóa');
    expect(html).toContain('Bằng chứng');
    expect(html).toContain('Ngoại lệ âm kho');
    expect(html).not.toContain('Sẵn sàng triển khai theo thiết kế');
  });

  it('renders the quarantine and NXT workflow instead of the handoff placeholder', () => {
    const html = renderInventory('#nxt');

    expect(html).toContain('Hoàn trả, quarantine và báo cáo NXT');
    expect(html).toContain('Quarantine');
    expect(html).toContain('Báo cáo nhập-xuất-tồn');
    expect(html).toContain('Opening');
    expect(html).toContain('Nhập');
    expect(html).toContain('Xuất');
    expect(html).toContain('Closing');
    expect(html).toContain('Partial coverage');
    expect(html).not.toContain('Sẵn sàng triển khai theo thiết kế');
  });

  it('keeps alert, lot serial, reservation and trace as stock overview internal states only', () => {
    expect(renderInventory('#alerts')).toContain('Cảnh báo cần xử lý');
    expect(renderInventory('#lot-serial')).toContain('Lô và serial cần theo dõi');
    expect(renderInventory('#reservation')).toContain('Giữ chỗ theo nguồn');
    expect(renderInventory('#trace')).toContain('Truy xuất biến động kho');
  });

  it('falls back unknown hash states to overview', () => {
    const html = renderInventory('#does-not-exist');

    expect(html).toContain('Tổng quan tồn kho');
    expect(html).toContain('Tồn khả dụng');
  });
});

function renderInventory(hash: string): string {
  vi.stubGlobal('window', {
    location: {
      hash,
      pathname: '/app',
      search: '',
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    history: {
      replaceState: () => undefined,
    },
  });

  return renderToStaticMarkup(createElement(InventoryHome, { route: 'inventory' }));
}
