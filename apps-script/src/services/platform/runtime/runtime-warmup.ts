import type { RuntimeConfigDTO } from '../../../infrastructure/google-workspace/runtime-config-store';
import type { AdministrationRepository } from '../../../repositories/platform/administration-repository';
import type { AuthRepository } from '../../../repositories/platform/auth-repository';

export type RuntimeWarmupStatus = 'Ok' | 'SkippedNotInstalled' | 'SkippedBudgetExceeded' | 'Failed';

export interface RuntimeWarmupResult {
  status: RuntimeWarmupStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  reason?: string;
  warmed: {
    userProfile: boolean;
    tenant: boolean;
    branches: number;
    warehouses: number;
  };
}

export interface RuntimeWarmupDependencies {
  runtimeConfig?: RuntimeConfigDTO;
  authRepository?: Pick<AuthRepository, 'findUserByLoginId'>;
  administrationRepository?: Pick<AdministrationRepository, 'findTenantById' | 'findBranchesByIds' | 'findWarehousesByIds'>;
  now?: () => Date;
  nowMs?: () => number;
  adminLoginId?: string;
  maxDurationMs?: number;
}

const defaultAdminLoginId = 'admin';
const defaultMaxDurationMs = 1500;

export function warmRuntime(deps: RuntimeWarmupDependencies): RuntimeWarmupResult {
  const now = deps.now ?? (() => new Date());
  const nowMs = deps.nowMs ?? (() => Date.now());
  const startedAt = now();
  const startedMs = nowMs();
  const warmed: RuntimeWarmupResult['warmed'] = {
    userProfile: false,
    tenant: false,
    branches: 0,
    warehouses: 0,
  };

  function finish(status: RuntimeWarmupStatus, reason?: string): RuntimeWarmupResult {
    const completedAt = now();
    return {
      status,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: Math.max(0, nowMs() - startedMs),
      reason,
      warmed,
    };
  }

  function budgetExceeded(): boolean {
    return nowMs() - startedMs > (deps.maxDurationMs ?? defaultMaxDurationMs);
  }

  if (deps.runtimeConfig === undefined) {
    return finish('SkippedNotInstalled');
  }

  if (budgetExceeded()) {
    return finish('SkippedBudgetExceeded', 'Warm-up budget exceeded before auth profile.');
  }

  const user = deps.authRepository?.findUserByLoginId(deps.adminLoginId ?? defaultAdminLoginId);
  warmed.userProfile = user !== undefined;

  if (budgetExceeded()) {
    return finish('SkippedBudgetExceeded', 'Warm-up budget exceeded after auth profile.');
  }

  const tenant = deps.administrationRepository?.findTenantById(deps.runtimeConfig.tenantId);
  warmed.tenant = tenant !== undefined;

  if (budgetExceeded()) {
    return finish('SkippedBudgetExceeded', 'Warm-up budget exceeded after tenant.');
  }

  if (user !== undefined) {
    warmed.branches = deps.administrationRepository?.findBranchesByIds(user.branchIds).length ?? 0;

    if (budgetExceeded()) {
      return finish('SkippedBudgetExceeded', 'Warm-up budget exceeded after branches.');
    }

    warmed.warehouses = deps.administrationRepository?.findWarehousesByIds(user.warehouseIds).length ?? 0;
  }

  return finish('Ok');
}
