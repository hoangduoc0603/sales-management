import type {
  CurrentScopeResponse,
  DisableWarehouseRequest,
  DisableWarehouseResponse,
  WarehouseDisableBlockerDTO,
} from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { PlatformCacheStore } from '../../infrastructure/platform/cache';
import type { AdministrationRepository } from '../../repositories/platform/administration-repository';

export type WarehouseDisableBlockerProvider = (
  input: DisableWarehouseRequest,
) => readonly WarehouseDisableBlockerDTO[];

export interface AdministrationService {
  getCurrentScope(actor: ActorContextDTO): CurrentScopeResponse;
  disableWarehouse(input: DisableWarehouseRequest): DisableWarehouseResponse;
}

interface AdministrationServiceDependencies {
  repository: AdministrationRepository;
  warehouseDisableBlockerProvider?: WarehouseDisableBlockerProvider;
  cacheStore?: PlatformCacheStore;
  currentScopeCacheTtlSeconds?: number;
}

export function createAdministrationService(deps: AdministrationServiceDependencies): AdministrationService {
  const getBlockers = deps.warehouseDisableBlockerProvider ?? (() => []);
  const currentScopeCacheTtlSeconds = deps.currentScopeCacheTtlSeconds ?? 300;

  return {
    getCurrentScope(actor) {
      const cached = readCachedCurrentScope(deps.cacheStore, actor);
      if (cached !== undefined) return cached;

      const tenant = deps.repository.findTenantById(actor.tenantId);
      const branches = deps.repository.findBranchesByIds(actor.scope.branchIds);
      const warehouses = deps.repository.findWarehousesByIds(actor.scope.warehouseIds);

      if (tenant === undefined || branches[0] === undefined || warehouses[0] === undefined) {
        throw new Error('Current scope is not configured for actor.');
      }

      const scope = {
        tenant,
        branches,
        warehouses,
        activeBranchId: branches[0].branchId,
        activeWarehouseId: warehouses[0].warehouseId,
      };
      cacheCurrentScope(deps.cacheStore, actor, scope, currentScopeCacheTtlSeconds);
      return scope;
    },
    disableWarehouse(input) {
      const blockers = getBlockers(input);

      if (blockers.length > 0) {
        return { disabled: false, blockers };
      }

      const warehouse = deps.repository.findWarehousesByIds([input.warehouseId])[0];

      if (warehouse === undefined) {
        throw new Error('Warehouse does not exist.');
      }

      deps.repository.saveWarehouse({ ...warehouse, status: 'Disabled' });

      return { disabled: true, blockers: [] };
    },
  };
}

function cacheCurrentScope(
  cacheStore: PlatformCacheStore | undefined,
  actor: ActorContextDTO,
  scope: CurrentScopeResponse,
  ttlSeconds: number,
): void {
  if (cacheStore === undefined) return;
  cacheStore.put(currentScopeCacheKey(actor), JSON.stringify(scope), ttlSeconds);
}

function readCachedCurrentScope(
  cacheStore: PlatformCacheStore | undefined,
  actor: ActorContextDTO,
): CurrentScopeResponse | undefined {
  if (cacheStore === undefined) return undefined;
  const key = currentScopeCacheKey(actor);
  const raw = cacheStore.get(key);
  if (raw === undefined) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<CurrentScopeResponse>;
    if (
      parsed.tenant?.tenantId !== actor.tenantId ||
      parsed.branches?.[0]?.branchId !== actor.scope.branchIds[0] ||
      parsed.warehouses?.[0]?.warehouseId !== actor.scope.warehouseIds[0] ||
      parsed.activeBranchId !== parsed.branches[0].branchId ||
      parsed.activeWarehouseId !== parsed.warehouses[0].warehouseId
    ) {
      cacheStore.remove(key);
      return undefined;
    }
    return JSON.parse(JSON.stringify(parsed)) as CurrentScopeResponse;
  } catch {
    cacheStore.remove(key);
    return undefined;
  }
}

function currentScopeCacheKey(actor: ActorContextDTO): string {
  return [
    'salesManagement.admin.currentScope.v1',
    actor.tenantId,
    actor.userId,
    String(actor.authVersion),
    actor.scope.branchIds.join(','),
    actor.scope.warehouseIds.join(','),
  ].join(':');
}
