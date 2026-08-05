import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import { AppShell } from '../../web/src/app/app-shell/app-shell';
import { Button } from '../../web/src/components/ui/button';
import { Listbox } from '../../web/src/components/ui/listbox';
import { PosCheckoutShell } from '../../web/src/features/pos/pos-checkout-shell';

const repositoryRoot = process.cwd();

const approvedScreenShells: Record<string, { sourcePath: string; routeEvidence: readonly string[] }> = {
  'Auth và First-run setup': {
    sourcePath: 'web/src/app/install/install-flow.tsx',
    routeEvidence: ['stage === \'install-check-failed\'', '<InstallCheckingScreen', '<AuthFlow'],
  },
  'Sales Dashboard': {
    sourcePath: 'web/src/features/dashboard/dashboard-home.tsx',
    routeEvidence: ['route === \'dashboard\'', '<DashboardHome'],
  },
  'POS tại quầy — Checkout': {
    sourcePath: 'web/src/features/pos/pos-checkout-shell.tsx',
    routeEvidence: ['route === \'pos\'', '<PosCheckoutShell'],
  },
  'POS cache, conflict, receipt và print': {
    sourcePath: 'web/src/features/pos/pos-checkout-shell.tsx',
    routeEvidence: ['route === \'pos\'', '<PosCheckoutShell'],
  },
  'Đơn bán, đơn nhập tay, trả/đổi và bảo hành': {
    sourcePath: 'web/src/features/sales/sales-orders-returns-home.tsx',
    routeEvidence: ['route === \'orders\'', '<SalesOrdersReturnsHome'],
  },
  'Manual order fulfillment detail': {
    sourcePath: 'web/src/features/sales/sales-orders-returns-home.tsx',
    routeEvidence: ['route === \'orders\'', '<SalesOrdersReturnsHome'],
  },
  'Return inspection, refund và exchange': {
    sourcePath: 'web/src/features/sales/sales-orders-returns-home.tsx',
    routeEvidence: ['route === \'orders\'', '<SalesOrdersReturnsHome'],
  },
  'Catalog, khách hàng và commercial policy': {
    sourcePath: 'web/src/features/catalog/catalog-crm-home.tsx',
    routeEvidence: ['route === \'catalog\' || route === \'customers\'', '<CatalogCrmHome'],
  },
  'Hàng hóa và biến thể': {
    sourcePath: 'web/src/features/catalog/catalog-crm-home.tsx',
    routeEvidence: ['route === \'catalog\' || route === \'customers\'', '<CatalogCrmHome'],
  },
  'Catalog product editor và policy builder': {
    sourcePath: 'web/src/features/catalog/catalog-crm-home.tsx',
    routeEvidence: ['route === \'catalog\' || route === \'customers\'', '<CatalogCrmHome'],
  },
  'Tồn kho và mua hàng': {
    sourcePath: 'web/src/features/inventory/inventory-home.tsx',
    routeEvidence: ['route === \'inventory\' || route === \'purchasing\'', '<InventoryHome'],
  },
  'Inventory stocktake, transfer và adjustment workbench': {
    sourcePath: 'web/src/features/inventory/inventory-home.tsx',
    routeEvidence: ['route === \'inventory\' || route === \'purchasing\'', '<InventoryHome'],
  },
  'Tổng quan vận hành tồn kho': {
    sourcePath: 'web/src/features/inventory/inventory-home.tsx',
    routeEvidence: ['route === \'inventory\' || route === \'purchasing\'', '<InventoryHome'],
  },
  'Purchasing receipt, costing và supplier return': {
    sourcePath: 'web/src/features/inventory/inventory-home.tsx',
    routeEvidence: ['route === \'inventory\' || route === \'purchasing\'', '<InventoryHome'],
  },
  'Điều chỉnh kho và ngoại lệ': {
    sourcePath: 'web/src/features/inventory/inventory-home.tsx',
    routeEvidence: ['route === \'inventory\' || route === \'purchasing\'', '<InventoryHome'],
  },
  'Điều chuyển và nhận kho': {
    sourcePath: 'web/src/features/inventory/inventory-home.tsx',
    routeEvidence: ['route === \'inventory\' || route === \'purchasing\'', '<InventoryHome'],
  },
  'Kiểm kê kho': {
    sourcePath: 'web/src/features/inventory/inventory-home.tsx',
    routeEvidence: ['route === \'inventory\' || route === \'purchasing\'', '<InventoryHome'],
  },
  'Nhập kho và tiếp nhận hàng': {
    sourcePath: 'web/src/features/inventory/inventory-home.tsx',
    routeEvidence: ['route === \'inventory\' || route === \'purchasing\'', '<InventoryHome'],
  },
  'Xuất kho và fulfillment theo nguồn': {
    sourcePath: 'web/src/features/inventory/inventory-home.tsx',
    routeEvidence: ['route === \'inventory\' || route === \'purchasing\'', '<InventoryHome'],
  },
  'Hoàn trả, quarantine và báo cáo NXT': {
    sourcePath: 'web/src/features/inventory/inventory-home.tsx',
    routeEvidence: ['route === \'inventory\' || route === \'purchasing\'', '<InventoryHome'],
  },
  'Tài chính và ca bán': {
    sourcePath: 'web/src/features/finance/finance-home.tsx',
    routeEvidence: ['route === \'finance\'', '<FinanceHome'],
  },
  'Finance payment allocation và reversal': {
    sourcePath: 'web/src/features/finance/finance-home.tsx',
    routeEvidence: ['route === \'finance\'', '<FinanceHome'],
  },
  'Shift close reconciliation': {
    sourcePath: 'web/src/features/finance/finance-home.tsx',
    routeEvidence: ['route === \'finance\'', '<FinanceHome'],
  },
  'Báo cáo, quản trị và vận hành': {
    sourcePath: 'web/src/features/reporting/reporting-administration-operations-home.tsx',
    routeEvidence: ['route === \'reports\' || route === \'admin\'', '<ReportingAdministrationOperationsHome'],
  },
  'Admin access, config và lifecycle': {
    sourcePath: 'web/src/features/reporting/reporting-administration-operations-home.tsx',
    routeEvidence: ['route === \'reports\' || route === \'admin\'', '<ReportingAdministrationOperationsHome'],
  },
  'Operations run center': {
    sourcePath: 'web/src/features/reporting/reporting-administration-operations-home.tsx',
    routeEvidence: ['route === \'reports\' || route === \'admin\'', '<ReportingAdministrationOperationsHome'],
  },
  'Report builder và drilldown': {
    sourcePath: 'web/src/features/reporting/reporting-administration-operations-home.tsx',
    routeEvidence: ['route === \'reports\' || route === \'admin\'', '<ReportingAdministrationOperationsHome'],
  },
  'Auth security và session states': {
    sourcePath: 'web/src/app/auth/auth-flow.tsx',
    routeEvidence: ['<AuthFlow'],
  },
};

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

describe('release UI acceptance from Approved Open Design handoffs', () => {
  it('mỗi Approved handoff có shell/route tương ứng hoặc CanShipDisabled decision rõ ràng', () => {
    const approvedScreens = readApprovedScreens();
    const appSource = readText('web/src/app/sales-management-app.tsx');
    const releaseScopeBaseline = readText('docs/architecture/release-scope-baseline.md');

    expect(approvedScreens.length).toBeGreaterThan(0);

    for (const screen of approvedScreens) {
      const shell = approvedScreenShells[screen.name];
      const handoffPath = screen.handoffPath;
      const handoff = readText(handoffPath);

      expect(handoff, `${screen.name} handoff must be Approved`).toContain('Status: `Approved`');

      const hasShell =
        shell !== undefined &&
        fs.existsSync(path.join(repositoryRoot, shell.sourcePath)) &&
        shell.routeEvidence.every((marker) => appSource.includes(marker));
      const hasDisabledDecision =
        releaseScopeBaseline.includes(screen.name) && releaseScopeBaseline.includes('CanShipDisabled');

      expect(
        hasShell || hasDisabledDecision,
        `${screen.name} must have route/shell evidence or CanShipDisabled release decision`,
      ).toBe(true);
    }
  });

  it('custom Listbox, POS scan, command buttons và theme toggle có keyboard/ARIA baseline', () => {
    const listboxHtml = renderToStaticMarkup(
      createElement(Listbox, {
        label: 'Chi nhánh',
        value: 'branch-default',
        options: [
          { value: 'branch-default', label: 'Chi nhánh mặc định' },
          { value: 'branch-2', label: 'Chi nhánh 2' },
        ],
        onChange: () => undefined,
      }),
    );
    const listboxSource = readText('web/src/components/ui/listbox.tsx');
    const appShellSource = readText('web/src/app/app-shell/app-shell.tsx');
    const dashboardSource = readText('web/src/features/dashboard/dashboard-home.tsx');
    const posCheckoutSource = readText('web/src/features/pos/pos-checkout-shell.tsx');
    const globalCss = readText('web/src/styles/index.css');
    const posSource = readText('web/src/features/pos/pos-checkout-shell.tsx');
    const loadingButtonHtml = renderToStaticMarkup(
      createElement(Button, { isLoading: true, variant: 'primary' }, 'Hoàn tất bán hàng'),
    );
    const appShellHtml = renderToStaticMarkup(
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
    const posHtml = renderToStaticMarkup(
      createElement(PosCheckoutShell, {
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
      }),
    );

    expect(listboxHtml).toContain('aria-haspopup="listbox"');
    expect(listboxHtml).toContain('aria-expanded="false"');
    expect(listboxHtml).toContain('role="listbox"');
    expect(listboxHtml).toContain('role="option"');
    expect(listboxSource).toContain('onKeyDown');
    expect(listboxSource).toContain('ArrowDown');
    expect(listboxSource).toContain('ArrowUp');
    expect(listboxSource).toContain('Escape');
    expect(listboxSource).toContain("document.addEventListener('pointerdown'");

    expect(posHtml).toContain('aria-label="Quét mã vạch, SKU hoặc tên hàng"');
    expect(posSource).toContain('autoFocus');
    expect(posSource).toContain('event.key === \'Enter\'');

    expect(loadingButtonHtml).toContain('aria-busy="true"');
    expect(loadingButtonHtml).toContain('cn-spinner');
    expect(loadingButtonHtml).toContain('Hoàn tất bán hàng');

    expect(appShellHtml).toContain('aria-label="Chuyển sang giao diện tối"');
    expect(appShellHtml).toContain('cenio-icon-128.png');
    expect(appShellHtml).toContain('cn-text-avatar-sm');
    expect(appShellHtml).toContain('cn-text-avatar-md');
    expect(appShellHtml).not.toContain('cn-user-chevron');
    expect(globalCss).toMatch(/\.cn-user-popover-head \.cn-text-avatar\s*\{[^}]*color: #ffffff;[^}]*font-size: 13px;/s);
    expect(globalCss).toMatch(/\.cn-user-copy,\s*\.cn-user-popover-head div\s*\{[^}]*justify-items: start;[^}]*text-align: left;/s);
    expect(appShellHtml).not.toContain('<select');
    expect(appShellHtml).toContain('aria-haspopup="menu"');
    expect(appShellHtml).not.toContain('cn-logout');
    expect(appShellSource).not.toMatch(/[▦▣▤⬡◌◇▧▭▥⚙☀☾◔]/u);
    expect(dashboardSource).not.toMatch(/[▣▤▧◇◷△↗]/u);
    expect(posCheckoutSource).not.toMatch(/[◇]/u);
  });
});

function readApprovedScreens(): Array<{ name: string; handoffPath: string }> {
  const registry = readText('docs/design/open-design-registry.md');
  return registry
    .split('\n')
    .filter((line) => line.startsWith('|') && line.includes('`Approved`') && line.includes('docs/design/screens/'))
    .map((line) => {
      const columns = line.split('|').map((column) => column.trim());
      const handoffMatch = columns[6]?.match(/`([^`]+)`/);
      return {
        name: columns[1] ?? '',
        handoffPath: handoffMatch?.[1] ?? '',
      };
    });
}

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}
