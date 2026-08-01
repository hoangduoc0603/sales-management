import type {
  BranchDTO,
  RoleDTO,
  TenantConfigVersionDTO,
  TenantDTO,
  WarehouseDTO,
} from '@shared/contracts/platform/administration';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { PlatformCacheStore } from '../../infrastructure/platform/cache';
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
  findTenantById(tenantId: string): TenantDTO | undefined;
  listBranches(): readonly BranchDTO[];
  findBranchesByIds(branchIds: readonly string[]): readonly BranchDTO[];
  listWarehouses(): readonly WarehouseDTO[];
  findWarehousesByIds(warehouseIds: readonly string[]): readonly WarehouseDTO[];
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
  cacheStore?: PlatformCacheStore;
  currentScopeCacheTtlSeconds?: number;
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
    findTenantById: (tenantId) => cloneOptional(tenants.get(tenantId)),
    listBranches: () => [...branches.values()].map(clone),
    findBranchesByIds: (branchIds) => branchIds.map((branchId) => branches.get(branchId)).filter(isDefined).map(clone),
    listWarehouses: () => [...warehouses.values()].map(clone),
    findWarehousesByIds: (warehouseIds) =>
      warehouseIds.map((warehouseId) => warehouses.get(warehouseId)).filter(isDefined).map(clone),
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

function cloneOptional<T extends object>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : clone(value);
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
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
  const cachedTenants = createCachedVersionedSheetTable({
    table: tenants,
    cacheStore: deps.cacheStore,
    cachePrefix: 'salesManagement.admin.tenant',
    ttlSeconds: deps.currentScopeCacheTtlSeconds ?? 21600,
    getId: (record) => record.tenantId,
  });
  const cachedBranches = createCachedVersionedSheetTable({
    table: branches,
    cacheStore: deps.cacheStore,
    cachePrefix: 'salesManagement.admin.branch',
    ttlSeconds: deps.currentScopeCacheTtlSeconds ?? 21600,
    getId: (record) => record.branchId,
  });
  const cachedWarehouses = createCachedVersionedSheetTable({
    table: warehouses,
    cacheStore: deps.cacheStore,
    cachePrefix: 'salesManagement.admin.warehouse',
    ttlSeconds: deps.currentScopeCacheTtlSeconds ?? 21600,
    getId: (record) => record.warehouseId,
  });

  return {
    listTenants: () => tenants.list(),
    findTenantById: (tenantId) => cachedTenants.findById(tenantId),
    listBranches: () => branches.list(),
    findBranchesByIds: (branchIds) => cachedBranches.findByIds(branchIds),
    listWarehouses: () => warehouses.list(),
    findWarehousesByIds: (warehouseIds) => cachedWarehouses.findByIds(warehouseIds),
    listRoles: () => roles.list(),
    listUserRoles: () => userRoles.list(),
    listUserScopes: () => userScopes.list(),
    listTenantConfigVersions: () => configVersions.list(),
    saveTenant(record) {
      tenants.save(record);
      cachedTenants.put(record);
    },
    saveBranch(record) {
      branches.save(record);
      cachedBranches.put(record);
    },
    saveWarehouse(record) {
      warehouses.save(record);
      cachedWarehouses.put(record);
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

interface CachedVersionedSheetTableDependencies<TRecord extends object> {
  table: VersionedSheetTable<TRecord>;
  cacheStore?: PlatformCacheStore;
  cachePrefix: string;
  ttlSeconds: number;
  getId: (record: TRecord) => string;
}

interface CachedVersionedSheetTable<TRecord extends object> {
  findById(recordId: string): TRecord | undefined;
  findByIds(recordIds: readonly string[]): TRecord[];
  put(record: TRecord): void;
}

function createCachedVersionedSheetTable<TRecord extends object>(
  deps: CachedVersionedSheetTableDependencies<TRecord>,
): CachedVersionedSheetTable<TRecord> {
  function key(recordId: string): string {
    return `${deps.cachePrefix}.${recordId}`;
  }

  function getCached(recordId: string): TRecord | undefined {
    if (deps.cacheStore === undefined) return undefined;
    const raw = deps.cacheStore.get(key(recordId));
    if (raw === undefined) return undefined;
    try {
      return cloneJson(JSON.parse(raw) as TRecord);
    } catch {
      deps.cacheStore.remove(key(recordId));
      return undefined;
    }
  }

  function put(record: TRecord): void {
    if (deps.cacheStore === undefined) return;
    deps.cacheStore.put(key(deps.getId(record)), JSON.stringify(record), deps.ttlSeconds);
  }

  return {
    findById(recordId) {
      return this.findByIds([recordId])[0];
    },
    findByIds(recordIds) {
      const found = new Map<string, TRecord>();
      const misses: string[] = [];
      for (const recordId of uniqueRecordIds(recordIds)) {
        const cached = getCached(recordId);
        if (cached === undefined) {
          misses.push(recordId);
        } else {
          found.set(recordId, cached);
        }
      }

      for (const record of deps.table.findByIds(misses)) {
        put(record);
        found.set(deps.getId(record), record);
      }

      return uniqueRecordIds(recordIds)
        .map((recordId) => found.get(recordId))
        .filter(isDefined)
        .map(cloneJson);
    },
    put,
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
  findById(recordId: string): TRecord | undefined;
  findByIds(recordIds: readonly string[]): TRecord[];
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
  const maxTargetedLookups = 5;

  function readRows(): VersionedSheetRow[] {
    return deps.gateway.readTable({ table: deps.table }).map((row) => cloneJson(row) as VersionedSheetRow);
  }

  function readRowsById(recordId: string): VersionedSheetRow[] {
    const rows = deps.gateway.findRowsByColumn?.({
      table: deps.table,
      columnName: deps.idField,
      value: recordId,
    }) ?? deps.gateway.readTable({ table: deps.table });
    return rows.map((row) => cloneJson(row) as VersionedSheetRow);
  }

  function latestRowsFrom(rows: readonly VersionedSheetRow[]): VersionedSheetRow[] {
    const latestByRecordId = new Map<string, VersionedSheetRow>();
    for (const row of rows) {
      const recordId = String(row[deps.idField] ?? '');
      if (recordId === '') continue;
      const current = latestByRecordId.get(recordId);
      if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) {
        latestByRecordId.set(recordId, row);
      }
    }
    return [...latestByRecordId.values()];
  }

  function latestRows(): VersionedSheetRow[] {
    return latestRowsFrom(readRows());
  }

  function toRecord(row: VersionedSheetRow): TRecord {
    const stripped = stripSheetMetadata(row);
    return deps.fromRow === undefined ? (stripped as TRecord) : deps.fromRow(stripped);
  }

  return {
    list() {
      return latestRows().map(toRecord);
    },
    findById(recordId) {
      return this.findByIds([recordId])[0];
    },
    findByIds(recordIds) {
      const ids = uniqueRecordIds(recordIds);
      if (ids.length === 0) return [];

      const latest =
        deps.gateway.findRowsByColumn !== undefined && ids.length <= maxTargetedLookups
          ? latestRowsFrom(ids.flatMap((recordId) => readRowsById(recordId)))
          : latestRows().filter((row) => ids.includes(String(row[deps.idField] ?? '')));
      const latestById = new Map(latest.map((row) => [String(row[deps.idField] ?? ''), row]));

      return ids
        .map((recordId) => latestById.get(recordId))
        .filter(isDefined)
        .map(toRecord);
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

function uniqueRecordIds(recordIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const recordId of recordIds) {
    const normalized = recordId.trim();
    if (normalized === '' || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
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
