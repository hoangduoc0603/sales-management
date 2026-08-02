import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import { AppShell } from '../../web/src/app/app-shell/app-shell';
import { resolveInitialTheme, toggleTheme } from '../../web/src/app/theme/theme';

const actor: ActorContextDTO = {
  userId: 'user-admin',
  loginId: 'admin',
  displayName: 'Admin',
  tenantId: 'tenant-default',
  authVersion: 1,
  actions: [],
  scope: {
    tenantId: 'tenant-default',
    branchIds: ['branch-default'],
    warehouseIds: ['warehouse-default'],
  },
};

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

describe('AppShell', () => {
  it('render sidebar, topbar, custom Branch/Warehouse selector và theme icon button', () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, {
        actor,
        currentRoute: 'dashboard',
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        theme: 'light',
        onLogout: () => undefined,
        onRouteChange: () => undefined,
        onScopeChange: () => undefined,
        onThemeToggle: () => undefined,
        children: createElement('div', null, 'Nội dung'),
      }),
    );

    expect(html).toContain('Cenio Sales');
    expect(html).toContain('Tổng quan');
    expect(html).toContain('Chi nhánh mặc định');
    expect(html).toContain('Kho mặc định');
    expect(html).toContain('aria-label="Chuyển sang giao diện tối"');
    expect(html).toContain('aria-label="Thu gọn sidebar"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="cn-sidebar-navigation"');
    expect(html).not.toContain('<select');
  });

  it('render sidebar thu gọn dạng icon-only nhưng vẫn giữ label trong DOM cho transition và aria-label điều hướng', () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, {
        actor,
        currentRoute: 'pos',
        initialSidebarCollapsed: true,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        theme: 'dark',
        onLogout: () => undefined,
        onRouteChange: () => undefined,
        onScopeChange: () => undefined,
        onThemeToggle: () => undefined,
        children: createElement('div', null, 'Nội dung'),
      }),
    );

    expect(html).toContain('cn-app-shell cn-app-shell-collapsed');
    expect(html).toContain('data-sidebar-collapsed="true"');
    expect(html).toContain('aria-label="Mở rộng sidebar"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Bán hàng"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('class="cn-nav-text">Bán hàng</span>');
    expect(html).toContain('class="cn-sidebar-brand-copy"');
    expect(html).toContain('Retail operations');
    expect(html).toContain('cn-sidebar-tooltip-trigger');
    expect(html).toContain('cn-sidebar-foot-compact');
    expect(html).not.toContain('class="cn-sidebar-foot"><span class="cn-sync-dot"></span>Đồng bộ cục bộ sẵn sàng');
  });

  it('render mobile drawer mở sẵn với dialog semantics và navigation expanded', () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, {
        actor,
        currentRoute: 'inventory',
        initialMobileSidebarOpen: true,
        initialSidebarCollapsed: true,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        theme: 'light',
        onLogout: () => undefined,
        onRouteChange: () => undefined,
        onScopeChange: () => undefined,
        onThemeToggle: () => undefined,
        children: createElement('div', null, 'Nội dung'),
      }),
    );

    expect(html).toContain('aria-label="Mở menu điều hướng"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Menu điều hướng');
    expect(html).toContain('cn-mobile-sidebar');
    expect(html).toContain('Kho');
    expect(html).toContain('aria-current="page"');
  });
});

describe('theme utilities', () => {
  it('resolve initial theme theo stored value trước system preference', () => {
    expect(resolveInitialTheme({ storedTheme: 'dark', prefersDark: false })).toBe('dark');
    expect(resolveInitialTheme({ storedTheme: undefined, prefersDark: true })).toBe('dark');
    expect(resolveInitialTheme({ storedTheme: undefined, prefersDark: false })).toBe('light');
  });

  it('toggle theme đổi light/dark', () => {
    expect(toggleTheme('light')).toBe('dark');
    expect(toggleTheme('dark')).toBe('light');
  });
});
