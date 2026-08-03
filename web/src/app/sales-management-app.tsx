import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type {
  AuthChangeOwnPasswordResponse,
  AuthLoginResponse,
  SessionBootstrapResponse,
} from '@shared/contracts/platform/auth';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type {
  InstallRunResponse,
  InstallStatusResponse,
} from '@shared/contracts/platform/install';
import type { ApiClient } from '../lib/api/client';
import { createRuntimeApiClient, type RuntimeApiMode } from '../lib/api/runtime-client';
import {
  createLocalDebugActor,
  createLocalDebugScope,
  LOCAL_DEBUG_SESSION_TOKEN,
} from '../lib/api/local-fake-backend';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CenioBrandMark } from '../components/ui/brand-mark';
import { SkeletonCard } from '../components/ui/skeleton';
import { StateBlock } from '../components/ui/state-block';
import { AuthFlow, type ChangePasswordInput, type LoginInput } from './auth/auth-flow';
import { createSessionStorage } from './auth/session-storage';
import { InstallCheckingScreen, InstallFlow, type InstallFormInput } from './install/install-flow';
import { createInstallReadinessStorage } from './install/install-readiness-storage';
import { checkInstallStatusWithTimeout } from './install/install-status-check';
import { AppShell, type AppRoute } from './app-shell/app-shell';
import { resolveSalesManagementAppStage, type InstallReadiness } from './sales-management-app-stage';
import { applyBrowserTheme, readBrowserTheme, toggleTheme, type AppTheme } from './theme/theme';
import { DashboardHome } from '../features/dashboard/dashboard-home';
import { CatalogCrmHome } from '../features/catalog/catalog-crm-home';
import { FinanceHome } from '../features/finance/finance-home';
import { InventoryHome } from '../features/inventory/inventory-home';
import { PosCheckoutShell } from '../features/pos/pos-checkout-shell';
import { ReportingAdministrationOperationsHome } from '../features/reporting/reporting-administration-operations-home';
import { SalesOrdersReturnsHome } from '../features/sales/sales-orders-returns-home';
import {
  buildPosCatalogCacheNamespace,
  clearCachedPosCatalogProjectionNamespace,
} from '../features/pos/catalog-cache/load-pos-catalog-projection';

export interface SalesManagementAppProps {
  runtimeMode?: RuntimeApiMode;
  apiClient?: ApiClient;
  initialSessionToken?: string;
  initialActor?: ActorContextDTO;
  initialRoute?: AppRoute;
  initialScope?: CurrentScopeResponse;
  initialInstallStatus?: InstallStatusResponse;
}

export function SalesManagementApp({
  apiClient,
  initialActor,
  initialInstallStatus,
  initialRoute,
  initialScope,
  initialSessionToken,
  runtimeMode,
}: SalesManagementAppProps) {
  const localDebugAuthEnabled = useMemo(() => shouldUseLocalDebugAuth(runtimeMode), [runtimeMode]);
  const client = useMemo(
    () =>
      apiClient ??
      createRuntimeApiClient(
        runtimeMode ? { hasGoogleScriptRun: () => runtimeMode === 'apps-script' } : undefined,
      ),
    [apiClient, runtimeMode],
  );
  const sessionStorage = useMemo(() => createSessionStorage(), []);
  const installReadinessStorage = useMemo(() => createInstallReadinessStorage(), []);
  const localDebugActor = useMemo(
    () => (localDebugAuthEnabled ? createLocalDebugActor() : undefined),
    [localDebugAuthEnabled],
  );
  const localDebugScope = useMemo(
    () => (localDebugAuthEnabled ? createLocalDebugScope() : undefined),
    [localDebugAuthEnabled],
  );
  const effectiveInitialScope = initialScope ?? localDebugScope;
  const preAuthenticated = Boolean(initialSessionToken && initialActor && effectiveInitialScope);
  const hasInitialInstalledMarker = useMemo(
    () =>
      !localDebugAuthEnabled &&
      initialInstallStatus === undefined &&
      installReadinessStorage.readInstalled(),
    [initialInstallStatus, installReadinessStorage, localDebugAuthEnabled],
  );
  const effectiveInitialInstallStatus =
    initialInstallStatus ??
    (localDebugAuthEnabled || preAuthenticated || hasInitialInstalledMarker
      ? createInstalledStatus(effectiveInitialScope)
      : undefined);
  const [theme, setTheme] = useState<AppTheme>('light');
  const [installStatus, setInstallStatus] = useState<InstallStatusResponse | undefined>(
    effectiveInitialInstallStatus,
  );
  const [sessionToken, setSessionToken] = useState<string | undefined>(
    initialSessionToken ?? (localDebugAuthEnabled ? LOCAL_DEBUG_SESSION_TOKEN : sessionStorage.read()),
  );
  const [actor, setActor] = useState<ActorContextDTO | undefined>(initialActor ?? localDebugActor);
  const [scope, setScope] = useState<CurrentScopeResponse | undefined>(effectiveInitialScope);
  const [authMode, setAuthMode] = useState<'login' | 'change-password-required'>('login');
  const [notice, setNotice] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [installCheckFailure, setInstallCheckFailure] = useState<string>();
  const [installStatusCheckAttempt, setInstallStatusCheckAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(sessionToken && !actor));
  const [route, setRoute] = useState<AppRoute>(initialRoute ?? 'dashboard');
  const [selectedBranchId, setSelectedBranchId] = useState(effectiveInitialScope?.activeBranchId);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(effectiveInitialScope?.activeWarehouseId);

  useEffect(() => {
    const nextTheme = readBrowserTheme();
    setTheme(nextTheme);
    applyBrowserTheme(nextTheme);
  }, []);

  useEffect(() => {
    if (localDebugAuthEnabled || initialInstallStatus !== undefined) {
      return;
    }

    let isActive = true;
    setInstallCheckFailure(undefined);
    if (!hasInitialInstalledMarker) {
      setInstallStatus(undefined);
    }

    void checkInstallStatusWithTimeout(client, createRequestId('install-status'))
      .then((result) => {
        if (!isActive) return;

        if (!result.ok) {
          setInstallCheckFailure(result.message);
          return;
        }

        setInstallStatus(result.data);
        setInstallCheckFailure(undefined);

        if (result.data.installed || result.data.status === 'Installed') {
          installReadinessStorage.markInstalled();
          return;
        }

        installReadinessStorage.clearInstalled();
        sessionStorage.clear();
        setSessionToken(undefined);
        setActor(undefined);
        setScope(undefined);
        setSelectedBranchId(undefined);
        setSelectedWarehouseId(undefined);
        setAuthMode('login');
      });

    return () => {
      isActive = false;
    };
  }, [
    client,
    hasInitialInstalledMarker,
    initialInstallStatus,
    installReadinessStorage,
    installStatusCheckAttempt,
    localDebugAuthEnabled,
    sessionStorage,
  ]);

  const clearSession = useCallback(() => {
    if (actor !== undefined) {
      void clearCachedPosCatalogProjectionNamespace({
        cacheNamespace: buildPosCatalogCacheNamespace({
          tenantId: actor.tenantId,
          userId: actor.userId,
          authVersion: actor.authVersion,
          appVersion: installStatus?.appVersion ?? '0.1.0',
          schemaVersion: installStatus?.schemaVersion ?? 1,
        }),
      });
    }
    sessionStorage.clear();

    if (localDebugAuthEnabled && localDebugActor && localDebugScope) {
      setSessionToken(LOCAL_DEBUG_SESSION_TOKEN);
      setActor(localDebugActor);
      setScope(localDebugScope);
      setSelectedBranchId(localDebugScope.activeBranchId);
      setSelectedWarehouseId(localDebugScope.activeWarehouseId);
      setAuthMode('login');
      return;
    }

    setSessionToken(undefined);
    setActor(undefined);
    setScope(undefined);
    setSelectedBranchId(undefined);
    setSelectedWarehouseId(undefined);
    setAuthMode('login');
  }, [actor, installStatus?.appVersion, installStatus?.schemaVersion, localDebugActor, localDebugAuthEnabled, localDebugScope, sessionStorage]);

  const applyScope = useCallback((nextScope: CurrentScopeResponse) => {
    setScope(nextScope);
    setSelectedBranchId(nextScope.activeBranchId);
    setSelectedWarehouseId(nextScope.activeWarehouseId);
  }, []);

  useEffect(() => {
    if (!sessionToken || actor) {
      return;
    }

    let isActive = true;
    setIsBootstrapping(true);
    void client
      .invoke<SessionBootstrapResponse>({
        operation: 'platform.session.bootstrap',
        requestId: createRequestId('session-bootstrap'),
        sessionToken,
        payload: {},
      })
      .then((result) => {
        if (!isActive) return;

        if (!result.ok) {
          clearSession();
          return;
        }

        setActor(result.data.actor);
        applyScope(result.data.currentScope);
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
  }, [actor, applyScope, clearSession, client, sessionToken]);

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
      applyScope(result.data.currentScope);

      if (result.data.passwordChangeRequired) {
        setAuthMode('change-password-required');
        setNotice('Bạn cần đổi mật khẩu tạm trước khi vào ứng dụng.');
        setIsSubmitting(false);
        return;
      }

      sessionStorage.write(result.data.sessionToken, {
        rememberSession: input.rememberSession === true,
      });
      setNotice(undefined);
      setIsSubmitting(false);
    },
    [applyScope, client, sessionStorage],
  );

  const handleInstall = useCallback(
    async (input: InstallFormInput) => {
      setIsInstalling(true);
      setErrorMessage(undefined);
      const result = await client.invoke<InstallRunResponse>({
        operation: 'platform.install.run',
        requestId: createRequestId('install-run'),
        payload: input,
      });

      if (!result.ok) {
        setErrorMessage(result.error.message);
        setInstallStatus((current) => ({
          status: 'Failed',
          installed: false,
          canRetry: true,
          appVersion: current?.appVersion ?? '0.1.0',
          schemaVersion: current?.schemaVersion ?? 1,
          tenantDisplayName: input.tenantDisplayName,
          lastErrorMessage: result.error.message,
        }));
        setIsInstalling(false);
        return;
      }

      setSessionToken(undefined);
      setActor(undefined);
      setScope(undefined);
      setSelectedBranchId(undefined);
      setSelectedWarehouseId(undefined);
      sessionStorage.clear();
      installReadinessStorage.markInstalled();
      setInstallStatus({
        status: 'Installed',
        installed: true,
        canRetry: false,
        appVersion: installStatus?.appVersion ?? '0.1.0',
        schemaVersion: installStatus?.schemaVersion ?? 1,
        tenantDisplayName: result.data.tenantDisplayName,
        completedAt: new Date().toISOString(),
      });
      setNotice('Đã khởi tạo hệ thống. Vui lòng đăng nhập bằng tài khoản admin vừa tạo.');
      setIsInstalling(false);
    },
    [
      client,
      installReadinessStorage,
      installStatus?.appVersion,
      installStatus?.schemaVersion,
      sessionStorage,
    ],
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

  const handleInstallStatusRetry = useCallback(() => {
    setInstallStatusCheckAttempt((current) => current + 1);
  }, []);

  const stage = resolveSalesManagementAppStage({
    actorReady: actor !== undefined,
    authMode,
    bootstrapping: isBootstrapping,
    installReadiness: resolveInstallReadiness(installStatus, isInstalling, installCheckFailure),
    scopeReady: scope !== undefined && selectedBranchId !== undefined && selectedWarehouseId !== undefined,
    sessionReady: sessionToken !== undefined,
  });

  if (stage === 'install-checking') {
    return <InstallCheckingScreen />;
  }

  if (stage === 'install-check-failed') {
    return (
      <InstallCheckingScreen
        errorMessage={installCheckFailure}
        mode="failed"
        onRetry={handleInstallStatusRetry}
      />
    );
  }

  if (stage === 'install-required' || stage === 'installing') {
    return (
      <InstallFlow
        errorMessage={errorMessage}
        isSubmitting={isInstalling || installStatus?.status === 'Installing'}
        onInstall={handleInstall}
        status={
          installStatus ?? {
            status: 'Installing',
            installed: false,
            canRetry: false,
            appVersion: '0.1.0',
            schemaVersion: 1,
          }
        }
      />
    );
  }

  if (stage === 'auth') {
    return (
      <AuthFlow
        errorMessage={errorMessage}
        installWarning={
          installCheckFailure && (installStatus?.installed || installStatus?.status === 'Installed')
            ? { message: installCheckFailure, onRetry: handleInstallStatusRetry }
            : undefined
        }
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
      <main className="cn-auth-page">
        <section className="cn-auth-card cn-install-check-card" aria-labelledby="workspace-loading-title">
          <div className="cn-auth-brand">
            <CenioBrandMark />
            <div>
              <strong>Cenio Sales</strong>
              <span>Quản lý bán hàng</span>
            </div>
          </div>
          <div className="cn-install-check-content">
            <div>
              <p className="cn-eyebrow">Đang tải dữ liệu</p>
              <h1 id="workspace-loading-title">Đang chuẩn bị màn hình làm việc</h1>
            </div>
            <SkeletonCard
              bodyLines={4}
              className="cn-skeleton-auth-card"
              label="Đang chuẩn bị màn hình làm việc"
              titleLines={1}
            />
          </div>
        </section>
      </main>
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
          actor={actor}
          appVersion={installStatus?.appVersion}
          apiClient={client}
          schemaVersion={installStatus?.schemaVersion}
          scope={scope}
          selectedBranchId={selectedBranchId}
          selectedWarehouseId={selectedWarehouseId}
          sessionToken={sessionToken}
          shellMode="embedded"
          theme={theme}
          onSessionExpired={clearSession}
        />
      ) : route === 'orders' ? (
        <SalesOrdersReturnsHome
          actorId={actor.userId}
          apiClient={client}
          scope={scope}
          selectedBranchId={selectedBranchId}
          selectedWarehouseId={selectedWarehouseId}
          sessionToken={sessionToken}
        />
      ) : route === 'catalog' || route === 'customers' ? (
        <CatalogCrmHome apiClient={client} route={route} sessionToken={sessionToken} />
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

export function resolveInstallReadiness(
  installStatus: InstallStatusResponse | undefined,
  isInstalling: boolean,
  installCheckFailure?: string,
): InstallReadiness {
  if (isInstalling || installStatus?.status === 'Installing') {
    return 'installing';
  }

  if (installStatus && (installStatus.installed || installStatus.status === 'Installed')) {
    return 'installed';
  }

  if (installCheckFailure) {
    return 'check-failed';
  }

  if (!installStatus) {
    return 'checking';
  }

  return 'required';
}

function createInstalledStatus(scope: CurrentScopeResponse | undefined): InstallStatusResponse {
  return {
    status: 'Installed',
    installed: true,
    canRetry: false,
    appVersion: '0.1.0',
    schemaVersion: 1,
    tenantDisplayName: scope?.tenant.displayName,
  };
}

function shouldUseLocalDebugAuth(runtimeMode: RuntimeApiMode | undefined): boolean {
  if (runtimeMode !== undefined) {
    return runtimeMode === 'local-fake';
  }

  return (
    typeof window !== 'undefined' &&
    window.google?.script?.run === undefined
  );
}
