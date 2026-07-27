import type { ReactNode } from 'react';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import { Badge } from '../../components/ui/badge';
import { IconButton } from '../../components/ui/button';
import { Listbox } from '../../components/ui/listbox';
import type { AppTheme } from '../theme/theme';

export type AppRoute = 'dashboard' | 'pos' | 'orders' | 'catalog' | 'customers' | 'inventory' | 'purchasing' | 'finance' | 'reports' | 'admin';

export interface AppShellProps {
  actor: ActorContextDTO;
  currentRoute: AppRoute;
  scope: CurrentScopeResponse;
  selectedBranchId: string;
  selectedWarehouseId: string;
  theme: AppTheme;
  children: ReactNode;
  onLogout(): void;
  onRouteChange(route: AppRoute): void;
  onScopeChange(input: { branchId?: string; warehouseId?: string }): void;
  onThemeToggle(): void;
}

const navigationGroups: readonly {
  label: string;
  items: readonly { route: AppRoute; label: string; icon: string }[];
}[] = [
  {
    label: 'Vận hành',
    items: [
      { route: 'dashboard', label: 'Tổng quan', icon: '▦' },
      { route: 'pos', label: 'Bán hàng', icon: '▣' },
      { route: 'orders', label: 'Đơn bán', icon: '▤' },
      { route: 'catalog', label: 'Hàng hóa', icon: '⬡' },
      { route: 'customers', label: 'Khách hàng', icon: '◌' },
    ],
  },
  {
    label: 'Kiểm soát',
    items: [
      { route: 'inventory', label: 'Kho', icon: '◇' },
      { route: 'purchasing', label: 'Mua hàng', icon: '▧' },
      { route: 'finance', label: 'Tài chính', icon: '▭' },
      { route: 'reports', label: 'Báo cáo', icon: '▥' },
    ],
  },
  {
    label: 'Hệ thống',
    items: [{ route: 'admin', label: 'Quản trị', icon: '⚙' }],
  },
];

export function AppShell({
  actor,
  children,
  currentRoute,
  onLogout,
  onRouteChange,
  onScopeChange,
  onThemeToggle,
  scope,
  selectedBranchId,
  selectedWarehouseId,
  theme,
}: AppShellProps) {
  return (
    <div className="cn-app-shell">
      <aside className="cn-sidebar">
        <div className="cn-sidebar-brand">
          <span className="cn-brand-mark">C</span>
          <div>
            <strong>Cenio Sales</strong>
            <span>Retail operations</span>
          </div>
        </div>
        <nav className="cn-nav" aria-label="Điều hướng chính">
          {navigationGroups.map((group) => (
            <div className="cn-nav-group" key={group.label}>
              <p className="cn-nav-label">{group.label}</p>
              {group.items.map((item) => (
                <button
                  aria-current={item.route === currentRoute ? 'page' : undefined}
                  className={item.route === currentRoute ? 'cn-nav-item active' : 'cn-nav-item'}
                  key={item.route}
                  onClick={() => onRouteChange(item.route)}
                  type="button"
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="cn-sidebar-foot">
          <span className="cn-sync-dot" />
          Đồng bộ cục bộ sẵn sàng
        </div>
      </aside>
      <div className="cn-app-main">
        <header className="cn-topbar">
          <div className="cn-topbar-left">
            <div className="cn-workspace">
              <strong>{scope.tenant.displayName}</strong>
              <span>Không gian quản lý</span>
            </div>
            <Listbox
              className="cn-scope-control"
              label="Chi nhánh"
              onChange={(branchId) => onScopeChange({ branchId })}
              options={scope.branches.map((branch) => ({
                value: branch.branchId,
                label: branch.name,
                description: branch.branchCode,
              }))}
              value={selectedBranchId}
            />
            <Listbox
              className="cn-scope-control"
              label="Kho"
              onChange={(warehouseId) => onScopeChange({ warehouseId })}
              options={scope.warehouses.map((warehouse) => ({
                value: warehouse.warehouseId,
                label: warehouse.name,
                description: warehouse.warehouseCode,
              }))}
              value={selectedWarehouseId}
            />
          </div>
          <div className="cn-topbar-right">
            <IconButton
              label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              onClick={onThemeToggle}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </IconButton>
            <IconButton label="Thông báo">◔</IconButton>
            <div className="cn-user-menu">
              <span className="cn-avatar">{getInitials(actor.displayName)}</span>
              <div>
                <strong>{actor.displayName}</strong>
                <span>{actor.loginId}</span>
              </div>
            </div>
            <button className="cn-logout" onClick={onLogout} type="button">
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="cn-page">
          <div className="cn-page-context">
            <Badge tone="success">Dữ liệu sẵn sàng</Badge>
            <span>Scope backend xác thực · không dùng Google identity</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

function getInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';
}
