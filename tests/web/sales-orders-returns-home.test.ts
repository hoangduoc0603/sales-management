import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
    expect(html).toContain('Đơn online cần xử lý');
    expect(html).toContain('SO-260726-01842');
    expect(html).toContain('Draft → Confirmed → Packing → Shipped → Delivered');
    expect(html).toContain('Xác nhận giữ hàng');
    expect(html).toContain('Xuất giao');
    expect(html).toContain('Trả hàng theo đơn gốc');
    expect(html).toContain('Fast return cần quyền riêng');
    expect(html).toContain('Bảo hành theo serial');
    expect(html).toContain('Dữ liệu nhạy cảm bị hạn chế');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('Shopee');
    expect(html).not.toContain('Website');
  });
});
