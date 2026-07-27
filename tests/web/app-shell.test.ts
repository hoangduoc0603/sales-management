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
    expect(html).not.toContain('<select');
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
