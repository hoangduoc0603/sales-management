import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import { CenioBrandMark } from '../../components/ui/brand-mark';
import { IconButton } from '../../components/ui/button';
import { AppIcon, type AppIconName } from '../../components/ui/icons';
import { Listbox } from '../../components/ui/listbox';
import { Sheet } from '../../components/ui/sheet';
import { TextAvatar } from '../../components/ui/text-avatar';
import { Tooltip } from '../../components/ui/tooltip';
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
  initialSidebarCollapsed?: boolean;
  initialMobileSidebarOpen?: boolean;
  onLogout(): void;
  onRouteChange(route: AppRoute): void;
  onScopeChange(input: { branchId?: string; warehouseId?: string }): void;
  onThemeToggle(): void;
}

const navigationGroups: readonly {
  label: string;
  items: readonly { route: AppRoute; label: string; icon: AppIconName }[];
}[] = [
  {
    label: 'Vận hành',
    items: [
      { route: 'dashboard', label: 'Tổng quan', icon: 'dashboard' },
      { route: 'pos', label: 'Bán hàng', icon: 'pos' },
      { route: 'orders', label: 'Đơn bán', icon: 'orders' },
      { route: 'catalog', label: 'Hàng hóa', icon: 'catalog' },
      { route: 'customers', label: 'Khách hàng', icon: 'customers' },
    ],
  },
  {
    label: 'Kiểm soát',
    items: [
      { route: 'inventory', label: 'Kho', icon: 'inventory' },
      { route: 'purchasing', label: 'Mua hàng', icon: 'purchasing' },
      { route: 'finance', label: 'Tài chính', icon: 'finance' },
      { route: 'reports', label: 'Báo cáo', icon: 'reports' },
    ],
  },
  {
    label: 'Hệ thống',
    items: [{ route: 'admin', label: 'Quản trị', icon: 'admin' }],
  },
];

const sidebarCollapsedStorageKey = 'sales-management.sidebarCollapsed.v1';

export function AppShell({
  actor,
  children,
  currentRoute,
  initialMobileSidebarOpen,
  initialSidebarCollapsed,
  onLogout,
  onRouteChange,
  onScopeChange,
  onThemeToggle,
  scope,
  selectedBranchId,
  selectedWarehouseId,
  theme,
}: AppShellProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(initialMobileSidebarOpen ?? false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => initialSidebarCollapsed ?? readSidebarCollapsedPreference(),
  );
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleSidebarToggle = useCallback(() => {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      writeSidebarCollapsedPreference(next);
      return next;
    });
  }, []);

  const handleMobileRouteChange = useCallback(
    (route: AppRoute) => {
      onRouteChange(route);
      setIsMobileSidebarOpen(false);
    },
    [onRouteChange],
  );

  useEffect(() => {
    if (!isUserMenuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (userMenuRef.current?.contains(event.target as Node)) return;
      setIsUserMenuOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isUserMenuOpen]);

  return (
    <div
      className={isSidebarCollapsed ? 'cn-app-shell cn-app-shell-collapsed' : 'cn-app-shell'}
      data-sidebar-collapsed={isSidebarCollapsed ? 'true' : undefined}
    >
      <SidebarPanel
        currentRoute={currentRoute}
        isCollapsed={isSidebarCollapsed}
        onRouteChange={onRouteChange}
        onSidebarToggle={handleSidebarToggle}
        showToggle
      />
      <div className="cn-app-main">
        <header className="cn-topbar">
          <div className="cn-topbar-left">
            <IconButton
              aria-haspopup="dialog"
              className="cn-mobile-nav-trigger"
              label="Mở menu điều hướng"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <AppIcon className="cn-topbar-icon" name="menu" />
            </IconButton>
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
              }))}
              value={selectedWarehouseId}
            />
          </div>
          <div className="cn-topbar-right">
            <IconButton
              label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              onClick={onThemeToggle}
            >
              <AppIcon className="cn-topbar-icon" name={theme === 'dark' ? 'sun' : 'moon'} />
            </IconButton>
            <IconButton label="Thông báo">
              <AppIcon className="cn-topbar-icon" name="bell" />
            </IconButton>
            <div className="cn-user-menu" ref={userMenuRef}>
              <button
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                className="cn-user-trigger"
                onClick={() => setIsUserMenuOpen((current) => !current)}
                type="button"
              >
                <TextAvatar initials={getInitials(actor.displayName)} label={actor.displayName} size="sm" />
                <span className="cn-user-copy">
                  <strong>{actor.displayName}</strong>
                  <span>{actor.loginId}</span>
                </span>
              </button>
              <div className="cn-user-popover" hidden={!isUserMenuOpen} role="menu">
                <div className="cn-user-popover-head">
                  <TextAvatar initials={getInitials(actor.displayName)} label={actor.displayName} size="md" />
                  <div>
                    <strong>{actor.displayName}</strong>
                    <span>{actor.loginId}</span>
                  </div>
                </div>
                <button className="cn-user-action danger" onClick={onLogout} role="menuitem" type="button">
                  <AppIcon className="cn-user-action-icon" name="logout" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="cn-page">
          {children}
        </main>
      </div>
      <Sheet
        description="Chọn module nghiệp vụ"
        isOpen={isMobileSidebarOpen}
        onOpenChange={setIsMobileSidebarOpen}
        side="left"
        title="Menu điều hướng"
      >
        <div className="cn-mobile-sidebar">
          <SidebarPanel
            currentRoute={currentRoute}
            isCollapsed={false}
            onRouteChange={handleMobileRouteChange}
            showToggle={false}
          />
        </div>
      </Sheet>
    </div>
  );
}

interface SidebarPanelProps {
  currentRoute: AppRoute;
  isCollapsed: boolean;
  showToggle: boolean;
  onRouteChange(route: AppRoute): void;
  onSidebarToggle?: () => void;
}

function SidebarPanel({
  currentRoute,
  isCollapsed,
  onRouteChange,
  onSidebarToggle,
  showToggle,
}: SidebarPanelProps) {
  return (
    <aside className="cn-sidebar">
      <div className="cn-sidebar-brand">
        <CenioBrandMark />
        <div className="cn-sidebar-brand-copy">
          <strong>Cenio Sales</strong>
          <span>Retail operations</span>
        </div>
      </div>
      {showToggle && onSidebarToggle ? (
        <button
          aria-controls="cn-sidebar-navigation"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className="cn-sidebar-rail-toggle"
          onClick={onSidebarToggle}
          title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          type="button"
        >
          <span aria-hidden="true" className="cn-sidebar-rail-handle">
            <AppIcon name="chevronRight" />
          </span>
        </button>
      ) : null}
      <nav className="cn-nav" id={showToggle ? 'cn-sidebar-navigation' : undefined} aria-label="Điều hướng chính">
        {navigationGroups.map((group) => (
          <div className="cn-nav-group" key={group.label}>
            <p className="cn-nav-label">{group.label}</p>
            {group.items.map((item) => (
              <Tooltip disabled={!isCollapsed} key={item.route} label={item.label}>
                <button
                  aria-label={isCollapsed ? item.label : undefined}
                  aria-current={item.route === currentRoute ? 'page' : undefined}
                  className={
                    item.route === currentRoute
                      ? 'cn-nav-item cn-sidebar-tooltip-trigger active'
                      : 'cn-nav-item cn-sidebar-tooltip-trigger'
                  }
                  onClick={() => onRouteChange(item.route)}
                  type="button"
                >
                  <AppIcon className="cn-nav-icon" name={item.icon} />
                  <span className="cn-nav-text">{item.label}</span>
                </button>
              </Tooltip>
            ))}
          </div>
        ))}
      </nav>
      {!isCollapsed ? (
        <div className="cn-sidebar-foot">
          <span className="cn-sync-dot" />
          <span className="cn-sidebar-foot-text">Đồng bộ cục bộ sẵn sàng</span>
        </div>
      ) : (
        <Tooltip label="Đồng bộ cục bộ sẵn sàng">
          <div
            aria-label="Đồng bộ cục bộ sẵn sàng"
            className="cn-sidebar-foot-compact"
            title="Đồng bộ cục bộ sẵn sàng"
          >
            <span className="cn-sync-dot" />
          </div>
        </Tooltip>
      )}
    </aside>
  );
}

function readSidebarCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage?.getItem(sidebarCollapsedStorageKey) === 'true';
  } catch {
    return false;
  }
}

function writeSidebarCollapsedPreference(isCollapsed: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage?.setItem(sidebarCollapsedStorageKey, String(isCollapsed));
  } catch {
    // localStorage có thể bị chặn trong một số môi trường test/browser; UI vẫn hoạt động với state trong memory.
  }
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
