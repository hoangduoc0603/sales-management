import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
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

const actor: ActorContextDTO = {
  userId: 'user-admin',
  loginId: 'admin',
  displayName: 'Admin Local',
  tenantId: 'tenant-default',
  authVersion: 1,
  actions: ['sales.pos.complete'],
  scope: {
    tenantId: 'tenant-default',
    branchIds: ['branch-default'],
    warehouseIds: ['warehouse-default'],
  },
};

describe('PosCheckoutShell', () => {
  it('render POS shell theo handoff: scan, cart, checkout sticky và recovery states', () => {
    const html = renderToStaticMarkup(
      createElement(PosCheckoutShell, {
        actor,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        theme: 'light',
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
    expect(html).not.toContain('Local cache:');
    expect(html).not.toContain('Scope hiện tại:');
    expect(html).not.toContain('thao tác giỏ chạy local-first');
  });

  it('render POS visual structure bám artifact Approved: standalone header, product cards, checkout panel và 10 state tabs', () => {
    const html = renderToStaticMarkup(
      createElement(PosCheckoutShell, {
        actor,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        theme: 'dark',
      }),
    );
    const source = readText('web/src/features/pos/pos-checkout-shell.tsx');
    const globalCss = readText('web/src/styles/index.css');

    expect(html).toContain('cn-pos-page');
    expect(html).toContain('cn-pos-header');
    expect(html).toContain('cn-pos-layout-grid');
    expect(html).toContain('cn-product-grid');
    expect(html).toContain('cn-product-card');
    expect(html).toContain('cn-checkout-panel');
    expect(html).toContain('cn-scope-snapshot');
    expect(html).toContain('cn-state-tabs');
    expect(html.match(/class="cn-state-tab"/g)).toHaveLength(10);
    expect(html).toContain('Không tìm thấy');
    expect(html).toContain('Nhiều kết quả');
    expect(html).toContain('Thiếu tồn');
    expect(html).toContain('Lô / serial');
    expect(html).toContain('Chờ xác nhận');
    expect(html).toContain('aria-label="Chuyển sang giao diện sáng"');
    expect(html).not.toContain('cn-app-shell');
    expect(source).not.toContain('cn-pos-session-grid');
    expect(source).not.toContain('cn-pos-result-card');
    expect(source).not.toContain('cn-pos-recovery-grid');
    expect(source).toContain('name="barcodeScan"');
    expect(html).not.toContain('Cache sẵn sàng');
    expect(globalCss).toMatch(/html\[data-theme="dark"\][\s\S]*\.cn-pos-page/);
  });

  it('embedded mode dùng AppShell header chung nên không render POS header riêng', () => {
    const html = renderToStaticMarkup(
      createElement(PosCheckoutShell, {
        actor,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        shellMode: 'embedded',
        theme: 'dark',
      }),
    );

    expect(html).toContain('cn-pos-page cn-pos-page-embedded');
    expect(html).toContain('POS tại quầy');
    expect(html).toContain('Quét mã vạch, SKU hoặc tên hàng');
    expect(html).toContain('Giỏ hàng');
    expect(html).not.toContain('cn-pos-header');
    expect(html).not.toContain('Ca POS đang mở');
    expect(html).not.toContain('Dữ liệu quầy sẵn sàng');
    expect(html).not.toContain('aria-label="Chuyển sang giao diện sáng"');
    expect(html).not.toContain('Local cache:');
    expect(html).not.toContain('Scope hiện tại:');
    expect(html).not.toContain('thao tác giỏ chạy local-first');
  });
});

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}
