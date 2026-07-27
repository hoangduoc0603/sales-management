import type {
  CurrentScopeResponse,
  DisableWarehouseRequest,
  DisableWarehouseResponse,
  WarehouseDisableBlockerDTO,
} from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
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
}

export function createAdministrationService(deps: AdministrationServiceDependencies): AdministrationService {
  const getBlockers = deps.warehouseDisableBlockerProvider ?? (() => []);

  return {
    getCurrentScope(actor) {
      const tenant = deps.repository
        .listTenants()
        .find((candidate) => candidate.tenantId === actor.tenantId);
      const branches = deps.repository
        .listBranches()
        .filter((branch) => actor.scope.branchIds.includes(branch.branchId));
      const warehouses = deps.repository
        .listWarehouses()
        .filter((warehouse) => actor.scope.warehouseIds.includes(warehouse.warehouseId));

      if (tenant === undefined || branches[0] === undefined || warehouses[0] === undefined) {
        throw new Error('Current scope is not configured for actor.');
      }

      return {
        tenant,
        branches,
        warehouses,
        activeBranchId: branches[0].branchId,
        activeWarehouseId: warehouses[0].warehouseId,
      };
    },
    disableWarehouse(input) {
      const blockers = getBlockers(input);

      if (blockers.length > 0) {
        return { disabled: false, blockers };
      }

      const warehouse = deps.repository
        .listWarehouses()
        .find((candidate) => candidate.warehouseId === input.warehouseId);

      if (warehouse === undefined) {
        throw new Error('Warehouse does not exist.');
      }

      deps.repository.saveWarehouse({ ...warehouse, status: 'Disabled' });

      return { disabled: true, blockers: [] };
    },
  };
}
