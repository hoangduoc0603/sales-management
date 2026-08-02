import { readFileSync } from 'node:fs';
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
    expect(html).toContain('cn-sidebar-rail-toggle');
    expect(html).toContain('cn-sidebar-rail-handle');
    expect(html).not.toContain('cn-sidebar-toggle');
    expect(html.indexOf('cn-sidebar-rail-toggle')).toBeGreaterThan(html.indexOf('</nav>'));
    expect(html.indexOf('cn-sidebar-rail-toggle')).toBeLessThan(html.indexOf('cn-sidebar-foot'));
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
    expect(html).toContain('cn-sidebar-rail-toggle');
    expect(html).toContain('cn-sidebar-rail-handle');
    expect(html).not.toContain('cn-sidebar-toggle');
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

  it('desktop collapse trigger dùng edge rail handle gần footer thay vì nút nổi phía trên brand', () => {
    const css = readFileSync('web/src/styles/index.css', 'utf8');

    expect(css).toContain('.cn-sidebar-rail-toggle');
    expect(css).toContain('.cn-sidebar-rail-handle');
    expect(css).not.toContain('.cn-sidebar-toggle');
    expect(css).toMatch(/\.cn-sidebar-rail-toggle\s*\{[^}]*top:\s*0;[^}]*height:\s*100%;[^}]*align-items:\s*flex-end;[^}]*padding:\s*0 0 68px;/s);
    expect(css).not.toMatch(/\.cn-sidebar-rail-toggle\s*\{[^}]*bottom:\s*68px;[^}]*height:\s*38px;/s);
    expect(css).toMatch(/\.cn-sidebar-rail-handle\s*\{[^}]*border-radius:\s*999px;/s);
  });

  it('sidebar collapsed giữ vùng logo cao 64px và không để brand text ẩn kéo lệch border', () => {
    const css = readFileSync('web/src/styles/index.css', 'utf8');

    expect(css).toMatch(/\.cn-app-shell-collapsed\s+\.cn-sidebar-brand\s*\{[^}]*height:\s*64px;[^}]*min-height:\s*64px;[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.cn-app-shell-collapsed\s+\.cn-sidebar-brand-copy\s*\{[^}]*flex:\s*0 0 0;[^}]*max-height:\s*0;[^}]*overflow:\s*hidden;/s);
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
