import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import { PosCheckoutShell } from '../../web/src/features/pos/pos-checkout-shell';

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

describe('PosCheckoutShell', () => {
  it('render POS shell theo handoff: scan, cart, checkout sticky và recovery states', () => {
    const html = renderToStaticMarkup(
      createElement(PosCheckoutShell, {
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
      }),
    );

    expect(html).toContain('POS tại quầy');
    expect(html).toContain('Quét mã vạch, SKU hoặc tên hàng');
    expect(html).toContain('Sữa hạt óc chó 1L');
    expect(html).toContain('SH-OC-1L');
    expect(html).toContain('Giỏ hàng');
    expect(html).toContain('Tổng thanh toán');
    expect(html).toContain('Hoàn tất bán hàng');
    expect(html).toContain('Lưu nháp');
    expect(html).toContain('Mở nháp');
    expect(html).toContain('Bán chịu');
    expect(html).toContain('Khách hàng');
    expect(html).toContain('Đã hoàn tất');
    expect(html).toContain('Chưa mở ca');
    expect(html).toContain('Dữ liệu thay đổi');
    expect(html).not.toContain('readOnly=""');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('Website');
    expect(html).not.toContain('Shopee');
  });
});
