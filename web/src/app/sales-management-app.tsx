import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type {
  AuthChangeOwnPasswordResponse,
  AuthLoginResponse,
  SessionMeResponse,
} from '@shared/contracts/platform/auth';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { ApiClient } from '../lib/api/client';
import { createRuntimeApiClient, type RuntimeApiMode } from '../lib/api/runtime-client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StateBlock } from '../components/ui/state-block';
import { AuthFlow, type ChangePasswordInput, type LoginInput } from './auth/auth-flow';
import { createSessionStorage } from './auth/session-storage';
import { AppShell, type AppRoute } from './app-shell/app-shell';
import { resolveSalesManagementAppStage } from './sales-management-app-stage';
import { applyBrowserTheme, readBrowserTheme, toggleTheme, type AppTheme } from './theme/theme';
import { DashboardHome } from '../features/dashboard/dashboard-home';
import { CatalogCrmHome } from '../features/catalog/catalog-crm-home';
import { FinanceHome } from '../features/finance/finance-home';
import { InventoryHome } from '../features/inventory/inventory-home';
import { PosCheckoutShell } from '../features/pos/pos-checkout-shell';
import { ReportingAdministrationOperationsHome } from '../features/reporting/reporting-administration-operations-home';
import { SalesOrdersReturnsHome } from '../features/sales/sales-orders-returns-home';

export interface SalesManagementAppProps {
  runtimeMode?: RuntimeApiMode;
  apiClient?: ApiClient;
  initialSessionToken?: string;
  initialActor?: ActorContextDTO;
  initialScope?: CurrentScopeResponse;
}

export function SalesManagementApp({
  apiClient,
  initialActor,
  initialScope,
  initialSessionToken,
  runtimeMode,
}: SalesManagementAppProps) {
  const client = useMemo(
    () =>
      apiClient ??
      createRuntimeApiClient(
        runtimeMode ? { hasGoogleScriptRun: () => runtimeMode === 'apps-script' } : undefined,
      ),
    [apiClient, runtimeMode],
  );
  const sessionStorage = useMemo(() => createSessionStorage(), []);
  const [theme, setTheme] = useState<AppTheme>('light');
  const [sessionToken, setSessionToken] = useState<string | undefined>(
    initialSessionToken ?? sessionStorage.read(),
  );
  const [actor, setActor] = useState<ActorContextDTO | undefined>(initialActor);
  const [scope, setScope] = useState<CurrentScopeResponse | undefined>(initialScope);
  const [authMode, setAuthMode] = useState<'login' | 'change-password-required'>('login');
  const [notice, setNotice] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(sessionToken && !actor));
  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [selectedBranchId, setSelectedBranchId] = useState(initialScope?.activeBranchId);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(initialScope?.activeWarehouseId);

  useEffect(() => {
    const nextTheme = readBrowserTheme();
    setTheme(nextTheme);
    applyBrowserTheme(nextTheme);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.clear();
    setSessionToken(undefined);
    setActor(undefined);
    setScope(undefined);
    setSelectedBranchId(undefined);
    setSelectedWarehouseId(undefined);
    setAuthMode('login');
  }, [sessionStorage]);

  const loadScope = useCallback(
    async (token: string) => {
      const scopeResult = await client.invoke<CurrentScopeResponse>({
        operation: 'platform.scope.getCurrent',
        requestId: createRequestId('scope'),
        sessionToken: token,
        payload: {},
      });

      if (!scopeResult.ok) {
        throw new Error(scopeResult.error.message);
      }

      setScope(scopeResult.data);
      setSelectedBranchId(scopeResult.data.activeBranchId);
      setSelectedWarehouseId(scopeResult.data.activeWarehouseId);
    },
    [client],
  );

  useEffect(() => {
    if (!sessionToken || actor) {
      return;
    }

    let isActive = true;
    setIsBootstrapping(true);
    void client
      .invoke<SessionMeResponse>({
        operation: 'platform.session.me',
        requestId: createRequestId('session-me'),
        sessionToken,
        payload: {},
      })
      .then(async (result) => {
        if (!isActive) return;

        if (!result.ok) {
          clearSession();
          return;
        }

        setActor(result.data.actor);
        await loadScope(sessionToken);
      })
      .catch(() => {
        if (isActive) clearSession();
      })
      .finally(() => {
        if (isActive) setIsBootstrapping(false);
      });

    return () => {
      isActive = false;
    };
  }, [actor, clearSession, client, loadScope, sessionToken]);

  const handleLogin = useCallback(
    async (input: LoginInput) => {
      setIsSubmitting(true);
      setErrorMessage(undefined);
      const result = await client.invoke<AuthLoginResponse>({
        operation: 'platform.auth.login',
        requestId: createRequestId('login'),
        payload: input,
      });

      if (!result.ok) {
        setErrorMessage(result.error.message);
        setIsSubmitting(false);
        return;
      }

      setSessionToken(result.data.sessionToken);
      setActor(result.data.actor);

      if (result.data.passwordChangeRequired) {
        setAuthMode('change-password-required');
        setNotice('Bạn cần đổi mật khẩu tạm trước khi vào ứng dụng.');
        setIsSubmitting(false);
        return;
      }

      sessionStorage.write(result.data.sessionToken);
      await loadScope(result.data.sessionToken);
      setNotice(undefined);
      setIsSubmitting(false);
    },
    [client, loadScope, sessionStorage],
  );

  const handleChangePassword = useCallback(
    async (input: ChangePasswordInput) => {
      if (!sessionToken) {
        setErrorMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        setAuthMode('login');
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(undefined);
      const result = await client.invoke<AuthChangeOwnPasswordResponse>({
        operation: 'platform.auth.changeOwnPassword',
        requestId: createRequestId('change-password'),
        sessionToken,
        payload: input,
      });

      if (!result.ok) {
        setErrorMessage(result.error.message);
        setIsSubmitting(false);
        return;
      }

      clearSession();
      setNotice('Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.');
      setIsSubmitting(false);
    },
    [clearSession, client, sessionToken],
  );

  const handleLogout = useCallback(() => {
    if (sessionToken) {
      void client.invoke({
        operation: 'platform.auth.logout',
        requestId: createRequestId('logout'),
        sessionToken,
        payload: {},
      });
    }

    clearSession();
    setNotice('Đã đăng xuất.');
  }, [clearSession, client, sessionToken]);

  const handleThemeToggle = useCallback(() => {
    setTheme((current) => {
      const next = toggleTheme(current);
      applyBrowserTheme(next);
      return next;
    });
  }, []);

  const stage = resolveSalesManagementAppStage({
    actorReady: actor !== undefined,
    authMode,
    bootstrapping: isBootstrapping,
    scopeReady: scope !== undefined && selectedBranchId !== undefined && selectedWarehouseId !== undefined,
    sessionReady: sessionToken !== undefined,
  });

  if (stage === 'auth') {
    return (
      <AuthFlow
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        mode={authMode}
        notice={notice}
        onChangePassword={handleChangePassword}
        onLogin={handleLogin}
      />
    );
  }

  if (stage === 'bootstrapping') {
    return (
      <div className="cn-auth-page">
        <StateBlock
          description="Đang xác thực session và tải scope Branch/Warehouse từ backend."
          title="Đang chuẩn bị không gian làm việc"
          tone="info"
        />
      </div>
    );
  }

  if (!actor || !scope || !selectedBranchId || !selectedWarehouseId) {
    throw new Error('Trạng thái ứng dụng không hợp lệ sau khi xác thực.');
  }

  return (
    <AppShell
      actor={actor}
      currentRoute={route}
      onLogout={handleLogout}
      onRouteChange={setRoute}
      onScopeChange={({ branchId, warehouseId }) => {
        if (branchId) setSelectedBranchId(branchId);
        if (warehouseId) setSelectedWarehouseId(warehouseId);
      }}
      onThemeToggle={handleThemeToggle}
      scope={scope}
      selectedBranchId={selectedBranchId}
      selectedWarehouseId={selectedWarehouseId}
      theme={theme}
    >
      {route === 'dashboard' ? (
        <DashboardHome
          apiClient={client}
          scope={scope}
          selectedBranchId={selectedBranchId}
          selectedWarehouseId={selectedWarehouseId}
          sessionToken={sessionToken}
        />
      ) : route === 'pos' ? (
        <PosCheckoutShell
          apiClient={client}
          scope={scope}
          sessionToken={sessionToken}
          selectedBranchId={selectedBranchId}
          selectedWarehouseId={selectedWarehouseId}
        />
      ) : route === 'orders' ? (
        <SalesOrdersReturnsHome
          scope={scope}
          selectedBranchId={selectedBranchId}
          selectedWarehouseId={selectedWarehouseId}
        />
      ) : route === 'catalog' || route === 'customers' ? (
        <CatalogCrmHome route={route} />
      ) : route === 'inventory' || route === 'purchasing' ? (
        <InventoryHome route={route} />
      ) : route === 'finance' ? (
        <FinanceHome />
      ) : route === 'reports' || route === 'admin' ? (
        <ReportingAdministrationOperationsHome route={route} />
      ) : (
        <StateBlock
          description="Route đã có vị trí trong AppShell. Module nghiệp vụ sẽ được nối ở phase tương ứng sau khi backend/API slice sẵn sàng."
          title="Màn hình đang chờ triển khai module"
          tone="neutral"
        />
      )}
    </AppShell>
  );
}

function createRequestId(scope: string): string {
  return `web-${scope}-${Date.now()}`;
}
