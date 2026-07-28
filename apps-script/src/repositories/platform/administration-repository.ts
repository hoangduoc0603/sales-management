import type {
  BranchDTO,
  RoleDTO,
  TenantConfigVersionDTO,
  TenantDTO,
  WarehouseDTO,
} from '@shared/contracts/platform/administration';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { AppendOnlySheetRecordGateway } from './sheet-record-repository';

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

export interface SheetAdministrationRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
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

export function createSheetAdministrationRepository(
  deps: SheetAdministrationRepositoryDependencies,
): AdministrationRepository {
  const tenants = createVersionedSheetTable<TenantDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'Tenant'),
    idField: 'tenantId',
  });
  const branches = createVersionedSheetTable<BranchDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'Branch'),
    idField: 'branchId',
  });
  const warehouses = createVersionedSheetTable<WarehouseDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'Warehouse'),
    idField: 'warehouseId',
  });
  const roles = createVersionedSheetTable<RoleDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'Role'),
    idField: 'roleId',
  });
  const userRoles = createVersionedSheetTable<UserRoleRecord>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'UserRole'),
    idField: 'userRoleId',
  });
  const userScopes = createVersionedSheetTable<UserScopeRecord>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'UserScope'),
    idField: 'userScopeId',
    toRow: (record) => ({
      ...record,
      tenantId: record.scopeType === 'tenant' ? record.scopeId : undefined,
      effectiveFrom: undefined,
      effectiveTo: undefined,
    }),
    fromRow: (row) => ({
      userScopeId: String(row.userScopeId),
      userId: String(row.userId),
      scopeType: scopeTypeValue(row.scopeType),
      scopeId: String(row.scopeId),
      status: statusValue(row.status),
    }),
  });
  const configVersions = createVersionedSheetTable<TenantConfigVersionDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'TenantConfigVersion'),
    idField: 'configVersionId',
  });

  return {
    listTenants: () => tenants.list(),
    listBranches: () => branches.list(),
    listWarehouses: () => warehouses.list(),
    listRoles: () => roles.list(),
    listUserRoles: () => userRoles.list(),
    listUserScopes: () => userScopes.list(),
    listTenantConfigVersions: () => configVersions.list(),
    saveTenant(record) {
      tenants.save(record);
    },
    saveBranch(record) {
      branches.save(record);
    },
    saveWarehouse(record) {
      warehouses.save(record);
    },
    saveRole(record) {
      roles.save(record);
    },
    saveUserRole(record) {
      userRoles.save(record);
    },
    saveUserScope(record) {
      userScopes.save(record);
    },
    saveTenantConfigVersion(record) {
      configVersions.save(record);
    },
  };
}

interface VersionedSheetTableDependencies<TRecord extends object> {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  idField: keyof TRecord & string;
  toRow?: (record: TRecord) => Record<string, unknown>;
  fromRow?: (row: Record<string, unknown>) => TRecord;
}

interface VersionedSheetTable<TRecord extends object> {
  list(): TRecord[];
  save(record: TRecord): void;
}

interface VersionedSheetRow extends Record<string, unknown> {
  id: string;
  schemaVersion: number;
  recordVersion: number;
}

function createVersionedSheetTable<TRecord extends object>(
  deps: VersionedSheetTableDependencies<TRecord>,
): VersionedSheetTable<TRecord> {
  function readRows(): VersionedSheetRow[] {
    return deps.gateway.readTable({ table: deps.table }).map((row) => cloneJson(row) as VersionedSheetRow);
  }

  function latestRows(): VersionedSheetRow[] {
    const latestByRecordId = new Map<string, VersionedSheetRow>();
    for (const row of readRows()) {
      const recordId = String(row[deps.idField] ?? '');
      if (recordId === '') continue;
      const current = latestByRecordId.get(recordId);
      if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) {
        latestByRecordId.set(recordId, row);
      }
    }
    return [...latestByRecordId.values()];
  }

  return {
    list() {
      return latestRows().map((row) => {
        const stripped = stripSheetMetadata(row);
        return deps.fromRow === undefined ? (stripped as TRecord) : deps.fromRow(stripped);
      });
    },
    save(record) {
      const recordData = deps.toRow === undefined ? cloneJson(record) as Record<string, unknown> : deps.toRow(record);
      const recordId = String((record as Record<string, unknown>)[deps.idField] ?? '');
      if (recordId.trim() === '') {
        throw new Error(`MissingRecordId:${deps.table.tableName}.${deps.idField}`);
      }
      const nextVersion =
        readRows()
          .filter((row) => String(row[deps.idField] ?? '') === recordId)
          .reduce((max, row) => Math.max(max, getRecordVersion(row)), 0) + 1;
      deps.gateway.appendRows({
        table: deps.table,
        rows: [
          {
            ...recordData,
            id: `${recordId}:v${nextVersion}`,
            schemaVersion: deps.table.schemaVersion,
            recordVersion: nextVersion,
          },
        ],
      });
    },
  };
}

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) {
    throw new Error(`Missing administration table definition: ${tableName}`);
  }
  return table;
}

function getRecordVersion(row: VersionedSheetRow): number {
  if (typeof row.recordVersion === 'number') return row.recordVersion;
  const parsedRecordVersion = Number(row.recordVersion);
  if (Number.isFinite(parsedRecordVersion) && parsedRecordVersion > 0) return parsedRecordVersion;
  const match = /:v(\d+)$/.exec(row.id);
  return match === null ? 0 : Number(match[1]);
}

function stripSheetMetadata(row: VersionedSheetRow): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key !== 'id' && key !== 'schemaVersion' && key !== 'recordVersion') {
      record[key] = value;
    }
  }
  return cloneJson(record);
}

function scopeTypeValue(value: unknown): UserScopeRecord['scopeType'] {
  return value === 'tenant' || value === 'branch' || value === 'warehouse' ? value : 'tenant';
}

function statusValue(value: unknown): 'Active' | 'Disabled' {
  return value === 'Disabled' ? 'Disabled' : 'Active';
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
