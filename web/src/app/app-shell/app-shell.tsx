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
  id: string;
  label: string;
  items: readonly { route: AppRoute; label: string; icon: AppIconName; inventoryViewId?: string }[];
}[] = [
  {
    id: 'van-hanh',
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
    id: 'kho',
    label: 'Kho',
    items: [
      { route: 'inventory', label: 'Tồn kho', icon: 'inventory', inventoryViewId: 'overview' },
      { route: 'inventory', label: 'Nhập kho', icon: 'purchasing', inventoryViewId: 'receiving' },
      { route: 'inventory', label: 'Xuất kho', icon: 'orders', inventoryViewId: 'outbound' },
      { route: 'inventory', label: 'Điều chuyển', icon: 'refresh', inventoryViewId: 'transfer' },
      { route: 'inventory', label: 'Kiểm kê', icon: 'check', inventoryViewId: 'stocktake' },
      { route: 'inventory', label: 'Điều chỉnh', icon: 'fileAlert', inventoryViewId: 'adjustment' },
      { route: 'inventory', label: 'Báo cáo NXT', icon: 'reports', inventoryViewId: 'nxt' },
    ],
  },
  {
    id: 'kiem-soat',
    label: 'Kiểm soát',
    items: [
      { route: 'purchasing', label: 'Mua hàng', icon: 'purchasing' },
      { route: 'finance', label: 'Tài chính', icon: 'finance' },
      { route: 'reports', label: 'Báo cáo', icon: 'reports' },
    ],
  },
  {
    id: 'he-thong',
    label: 'Hệ thống',
    items: [{ route: 'admin', label: 'Quản trị', icon: 'admin' }],
  },
];

const sidebarCollapsedStorageKey = 'sales-management.sidebarCollapsed.v1';
const sidebarSectionsStorageKey = 'sales-management.sidebarSections.v1';

const inventorySubNavigation: readonly { viewId: string; label: string }[] = [
  { viewId: 'overview', label: 'Tồn kho' },
  { viewId: 'receiving', label: 'Nhập kho' },
  { viewId: 'outbound', label: 'Xuất kho' },
  { viewId: 'transfer', label: 'Điều chuyển' },
  { viewId: 'stocktake', label: 'Kiểm kê' },
  { viewId: 'adjustment', label: 'Điều chỉnh' },
  { viewId: 'nxt', label: 'Báo cáo NXT' },
];

const inventoryOverviewInternalViews = new Set([
  'alerts',
  'lot-serial',
  'reservation',
  'trace',
  'empty',
  'restricted',
  'scope-changed',
]);

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
  const [sidebarSectionState, setSidebarSectionState] = useState(() => readSidebarSectionPreference());
  const [activeInventoryView, setActiveInventoryView] = useState(() => readInventorySidebarView());
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

  const handleInventorySubRouteChange = useCallback(
    (viewId: string) => {
      writeInventorySidebarHash(viewId);
      setActiveInventoryView(viewId);
      onRouteChange('inventory');
    },
    [onRouteChange],
  );

  const handleMobileInventorySubRouteChange = useCallback(
    (viewId: string) => {
      handleInventorySubRouteChange(viewId);
      setIsMobileSidebarOpen(false);
    },
    [handleInventorySubRouteChange],
  );

  const handleSidebarSectionToggle = useCallback((sectionId: string) => {
    setSidebarSectionState((current) => {
      const next = {
        ...current,
        [sectionId]: !(current[sectionId] ?? true),
      };
      writeSidebarSectionPreference(next);
      return next;
    });
  }, []);

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

  useEffect(() => {
    const handleHashChange = () => setActiveInventoryView(readInventorySidebarView());
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div
      className={isSidebarCollapsed ? 'cn-app-shell cn-app-shell-collapsed' : 'cn-app-shell'}
      data-sidebar-collapsed={isSidebarCollapsed ? 'true' : undefined}
    >
      <SidebarPanel
        currentRoute={currentRoute}
        activeInventoryView={activeInventoryView}
        isCollapsed={isSidebarCollapsed}
        sectionState={sidebarSectionState}
        onInventorySubRouteChange={handleInventorySubRouteChange}
        onRouteChange={onRouteChange}
        onSidebarToggle={handleSidebarToggle}
        onSectionToggle={handleSidebarSectionToggle}
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
            activeInventoryView={activeInventoryView}
            isCollapsed={false}
            sectionState={sidebarSectionState}
            onInventorySubRouteChange={handleMobileInventorySubRouteChange}
            onRouteChange={handleMobileRouteChange}
            onSectionToggle={handleSidebarSectionToggle}
            showToggle={false}
          />
        </div>
      </Sheet>
    </div>
  );
}

interface SidebarPanelProps {
  activeInventoryView: string;
  currentRoute: AppRoute;
  isCollapsed: boolean;
  sectionState: Record<string, boolean>;
  showToggle: boolean;
  onInventorySubRouteChange(viewId: string): void;
  onRouteChange(route: AppRoute): void;
  onSectionToggle(sectionId: string): void;
  onSidebarToggle?: () => void;
}

function SidebarPanel({
  activeInventoryView,
  currentRoute,
  isCollapsed,
  sectionState,
  onInventorySubRouteChange,
  onRouteChange,
  onSectionToggle,
  onSidebarToggle,
  showToggle,
}: SidebarPanelProps) {
  return (
    <aside className="cn-sidebar">
      <div className="cn-sidebar-brand">
        <CenioBrandMark />
        <div className="cn-sidebar-brand-copy">
          <strong>Cenio Sales</strong>
          <span>Quản lý bán hàng</span>
        </div>
      </div>
      <nav className="cn-nav" id={showToggle ? 'cn-sidebar-navigation' : undefined} aria-label="Điều hướng chính">
        {navigationGroups.map((group) => {
          const isSectionOpen = isCollapsed || (sectionState[group.id] ?? true);
          const sectionContentId = `cn-nav-section-${group.id}`;

          return (
            <div className="cn-nav-group" key={group.id}>
              {isCollapsed ? (
                <p className="cn-nav-label">{group.label}</p>
              ) : (
                <button
                  aria-controls={sectionContentId}
                  aria-expanded={isSectionOpen}
                  className="cn-nav-group-trigger"
                  onClick={() => onSectionToggle(group.id)}
                  type="button"
                >
                  <span>{group.label}</span>
                </button>
              )}
              <div
                aria-hidden={!isSectionOpen}
                className="cn-nav-group-content"
                data-state={isSectionOpen ? 'open' : 'closed'}
                id={sectionContentId}
              >
                <div className="cn-nav-group-content-inner">
                  {group.items.map((item) => {
                    const isActive =
                      item.inventoryViewId && currentRoute === 'inventory'
                        ? activeInventoryView === item.inventoryViewId
                        : item.route === currentRoute;

                    return (
                      <div className="cn-nav-item-block" key={`${item.route}:${item.inventoryViewId ?? item.label}`}>
                        <Tooltip disabled={!isCollapsed} label={item.label}>
                          <button
                            aria-label={isCollapsed ? item.label : undefined}
                            aria-current={isActive ? 'page' : undefined}
                            className={
                              isActive
                                ? 'cn-nav-item cn-sidebar-tooltip-trigger active'
                                : 'cn-nav-item cn-sidebar-tooltip-trigger'
                            }
                            onClick={() => {
                              if (item.inventoryViewId) {
                                onInventorySubRouteChange(item.inventoryViewId);
                                return;
                              }

                              onRouteChange(item.route);
                            }}
                            tabIndex={isSectionOpen ? undefined : -1}
                            type="button"
                          >
                            <AppIcon className="cn-nav-icon" name={item.icon} />
                            <span className="cn-nav-text">{item.label}</span>
                          </button>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
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

function readSidebarSectionPreference(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};

  try {
    const rawValue = window.localStorage?.getItem(sidebarSectionsStorageKey);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
    );
  } catch {
    return {};
  }
}

function writeSidebarSectionPreference(sectionState: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage?.setItem(sidebarSectionsStorageKey, JSON.stringify(sectionState));
  } catch {
    // localStorage có thể bị chặn; disclosure vẫn hoạt động trong memory.
  }
}

function readInventorySidebarView(): string {
  if (typeof window === 'undefined') return 'overview';

  const hash = window.location?.hash?.replace('#', '') ?? '';
  if (inventoryOverviewInternalViews.has(hash)) return 'overview';

  return inventorySubNavigation.some((item) => item.viewId === hash) ? hash : 'overview';
}

function writeInventorySidebarHash(viewId: string): void {
  if (typeof window === 'undefined') return;

  if (window.location.hash === `#${viewId}`) return;
  window.history.replaceState(null, '', `#${viewId}`);
  window.dispatchEvent(new Event('hashchange'));
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
