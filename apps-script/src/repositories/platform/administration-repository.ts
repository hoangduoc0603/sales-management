import type {
  BranchDTO,
  RoleDTO,
  TenantConfigVersionDTO,
  TenantDTO,
  WarehouseDTO,
} from '@shared/contracts/platform/administration';

export interface UserRoleRecord {
  userRoleId: string;
  userId: string;
  roleId: string;
  status: 'Active' | 'Disabled';
}

export interface UserScopeRecord {
  userScopeId: string;
  userId: string;
  scopeType: 'tenant' | 'branch' | 'warehouse';
  scopeId: string;
  status: 'Active' | 'Disabled';
}

export interface AdministrationRepository {
  listTenants(): readonly TenantDTO[];
  listBranches(): readonly BranchDTO[];
  listWarehouses(): readonly WarehouseDTO[];
  listRoles(): readonly RoleDTO[];
  listUserRoles(): readonly UserRoleRecord[];
  listUserScopes(): readonly UserScopeRecord[];
  listTenantConfigVersions(): readonly TenantConfigVersionDTO[];
  saveTenant(record: TenantDTO): void;
  saveBranch(record: BranchDTO): void;
  saveWarehouse(record: WarehouseDTO): void;
  saveRole(record: RoleDTO): void;
  saveUserRole(record: UserRoleRecord): void;
  saveUserScope(record: UserScopeRecord): void;
  saveTenantConfigVersion(record: TenantConfigVersionDTO): void;
}

export function createInMemoryAdministrationRepository(): AdministrationRepository {
  const tenants = new Map<string, TenantDTO>();
  const branches = new Map<string, BranchDTO>();
  const warehouses = new Map<string, WarehouseDTO>();
  const roles = new Map<string, RoleDTO>();
  const userRoles = new Map<string, UserRoleRecord>();
  const userScopes = new Map<string, UserScopeRecord>();
  const configVersions = new Map<string, TenantConfigVersionDTO>();

  return {
    listTenants: () => [...tenants.values()].map(clone),
    listBranches: () => [...branches.values()].map(clone),
    listWarehouses: () => [...warehouses.values()].map(clone),
    listRoles: () => [...roles.values()].map(clone),
    listUserRoles: () => [...userRoles.values()].map(clone),
    listUserScopes: () => [...userScopes.values()].map(clone),
    listTenantConfigVersions: () => [...configVersions.values()].map(clone),
    saveTenant(record) {
      tenants.set(record.tenantId, clone(record));
    },
    saveBranch(record) {
      branches.set(record.branchId, clone(record));
    },
    saveWarehouse(record) {
      warehouses.set(record.warehouseId, clone(record));
    },
    saveRole(record) {
      roles.set(record.roleId, clone(record));
    },
    saveUserRole(record) {
      userRoles.set(record.userRoleId, clone(record));
    },
    saveUserScope(record) {
      userScopes.set(record.userScopeId, clone(record));
    },
    saveTenantConfigVersion(record) {
      configVersions.set(record.configVersionId, clone(record));
    },
  };
}

function clone<T>(value: T): T {
  return { ...value };
}
