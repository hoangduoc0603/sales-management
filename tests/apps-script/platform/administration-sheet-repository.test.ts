import { describe, expect, it } from 'vitest';
import { createSheetAdministrationRepository } from '../../../apps-script/src/repositories/platform/administration-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';

describe('SheetAdministrationRepository', () => {
  it('persists tenant, branch, warehouse, role, user assignment, scope and config metadata through registry tables', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetAdministrationRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
    });

    repository.saveTenant({
      tenantId: 'tenant-default',
      displayName: 'Cửa hàng mặc định',
      status: 'Active',
      timezone: 'Asia/Ho_Chi_Minh',
      activeConfigVersionId: 'config-default',
    });
    repository.saveBranch({
      branchId: 'branch-default',
      tenantId: 'tenant-default',
      branchCode: 'BR-DEFAULT',
      name: 'Chi nhánh mặc định',
      status: 'Active',
    });
    repository.saveWarehouse({
      warehouseId: 'warehouse-default',
      tenantId: 'tenant-default',
      branchId: 'branch-default',
      warehouseCode: 'WH-DEFAULT',
      name: 'Kho mặc định',
      status: 'Active',
      directSaleEnabled: true,
      negativeStockPolicy: 'Block',
      lotTrackingDefault: false,
      serialTrackingDefault: false,
    });
    repository.saveRole({
      roleId: 'role-owner',
      tenantId: 'tenant-default',
      name: 'Owner',
      status: 'Active',
    });
    repository.saveUserRole({
      userRoleId: 'user-role-admin-owner',
      userId: 'user-admin',
      roleId: 'role-owner',
      status: 'Active',
    });
    repository.saveUserScope({
      userScopeId: 'user-scope-admin-warehouse',
      userId: 'user-admin',
      scopeType: 'warehouse',
      scopeId: 'warehouse-default',
      status: 'Active',
    });
    repository.saveTenantConfigVersion({
      configVersionId: 'config-default',
      tenantId: 'tenant-default',
      configType: 'TenantBaseline',
      effectiveFrom: '2026-07-27T00:00:00.000+07:00',
      status: 'Published',
    });
    repository.saveWarehouse({
      warehouseId: 'warehouse-default',
      tenantId: 'tenant-default',
      branchId: 'branch-default',
      warehouseCode: 'WH-DEFAULT',
      name: 'Kho mặc định',
      status: 'Disabled',
      directSaleEnabled: false,
      negativeStockPolicy: 'Block',
      lotTrackingDefault: false,
      serialTrackingDefault: false,
    });

    expect(repository.listTenants()).toEqual([
      expect.objectContaining({ tenantId: 'tenant-default', displayName: 'Cửa hàng mặc định' }),
    ]);
    expect(repository.listBranches()).toEqual([
      expect.objectContaining({ branchId: 'branch-default', branchCode: 'BR-DEFAULT' }),
    ]);
    expect(repository.listWarehouses()).toEqual([
      expect.objectContaining({ warehouseId: 'warehouse-default', status: 'Disabled', directSaleEnabled: false }),
    ]);
    expect(repository.listRoles()).toEqual([expect.objectContaining({ roleId: 'role-owner', name: 'Owner' })]);
    expect(repository.listUserRoles()).toEqual([
      expect.objectContaining({ userRoleId: 'user-role-admin-owner', roleId: 'role-owner' }),
    ]);
    expect(repository.listUserScopes()).toEqual([
      expect.objectContaining({
        userScopeId: 'user-scope-admin-warehouse',
        scopeType: 'warehouse',
        scopeId: 'warehouse-default',
      }),
    ]);
    expect(repository.listTenantConfigVersions()).toEqual([
      expect.objectContaining({ configVersionId: 'config-default', configType: 'TenantBaseline' }),
    ]);
    expect(gateway.appendRequests.map((request) => request.tableName)).toEqual([
      'Tenant',
      'Branch',
      'Warehouse',
      'Role',
      'UserRole',
      'UserScope',
      'TenantConfigVersion',
      'Warehouse',
    ]);
  });

  it('uses id lookups for current scope records instead of reading full administration tables', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetAdministrationRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
    });

    repository.saveTenant({
      tenantId: 'tenant-default',
      displayName: 'Cửa hàng mặc định',
      status: 'Active',
      timezone: 'Asia/Ho_Chi_Minh',
      activeConfigVersionId: 'config-default',
    });
    repository.saveBranch({
      branchId: 'branch-default',
      tenantId: 'tenant-default',
      branchCode: 'BR-DEFAULT',
      name: 'Chi nhánh mặc định',
      status: 'Active',
    });
    repository.saveWarehouse({
      warehouseId: 'warehouse-default',
      tenantId: 'tenant-default',
      branchId: 'branch-default',
      warehouseCode: 'WH-DEFAULT',
      name: 'Kho mặc định',
      status: 'Active',
      directSaleEnabled: true,
      negativeStockPolicy: 'Block',
      lotTrackingDefault: false,
      serialTrackingDefault: false,
    });

    gateway.readRequests = [];
    gateway.findRequests = [];

    expect(repository.findTenantById('tenant-default')).toEqual(
      expect.objectContaining({ tenantId: 'tenant-default' }),
    );
    expect(repository.findBranchesByIds(['branch-default'])).toEqual([
      expect.objectContaining({ branchId: 'branch-default' }),
    ]);
    expect(repository.findWarehousesByIds(['warehouse-default'])).toEqual([
      expect.objectContaining({ warehouseId: 'warehouse-default' }),
    ]);

    expect(gateway.readRequests).toEqual([]);
    expect(gateway.findRequests.map((request) => [request.tableName, request.columnName, request.value])).toEqual([
      ['Tenant', 'tenantId', 'tenant-default'],
      ['Branch', 'branchId', 'branch-default'],
      ['Warehouse', 'warehouseId', 'warehouse-default'],
    ]);
  });

  it('caches current scope master records after the first lookup', () => {
    const gateway = new FakeSheetGateway();
    const cacheStore = new FakePlatformCacheStore();
    const repository = createSheetAdministrationRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      cacheStore,
    });

    repository.saveTenant({
      tenantId: 'tenant-default',
      displayName: 'Cửa hàng mặc định',
      status: 'Active',
      timezone: 'Asia/Ho_Chi_Minh',
      activeConfigVersionId: 'config-default',
    });
    repository.saveBranch({
      branchId: 'branch-default',
      tenantId: 'tenant-default',
      branchCode: 'BR-DEFAULT',
      name: 'Chi nhánh mặc định',
      status: 'Active',
    });
    repository.saveWarehouse({
      warehouseId: 'warehouse-default',
      tenantId: 'tenant-default',
      branchId: 'branch-default',
      warehouseCode: 'WH-DEFAULT',
      name: 'Kho mặc định',
      status: 'Active',
      directSaleEnabled: true,
      negativeStockPolicy: 'Block',
      lotTrackingDefault: false,
      serialTrackingDefault: false,
    });
    cacheStore.clear();

    gateway.findRequests = [];
    expect(repository.findTenantById('tenant-default')).toEqual(
      expect.objectContaining({ tenantId: 'tenant-default' }),
    );
    expect(repository.findBranchesByIds(['branch-default'])).toEqual([
      expect.objectContaining({ branchId: 'branch-default' }),
    ]);
    expect(repository.findWarehousesByIds(['warehouse-default'])).toEqual([
      expect.objectContaining({ warehouseId: 'warehouse-default' }),
    ]);
    expect(gateway.findRequests).toHaveLength(3);
    expect(cacheStore.ttls()).toEqual([21600, 21600, 21600]);

    gateway.findRequests = [];
    gateway.readRequests = [];
    expect(repository.findTenantById('tenant-default')).toEqual(
      expect.objectContaining({ tenantId: 'tenant-default' }),
    );
    expect(repository.findBranchesByIds(['branch-default'])).toEqual([
      expect.objectContaining({ branchId: 'branch-default' }),
    ]);
    expect(repository.findWarehousesByIds(['warehouse-default'])).toEqual([
      expect.objectContaining({ warehouseId: 'warehouse-default' }),
    ]);
    expect(gateway.findRequests).toEqual([]);
    expect(gateway.readRequests).toEqual([]);
  });
});

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  readRequests: Array<{ tableName: string; partitionKey?: string }> = [];
  findRequests: Array<{ tableName: string; columnName: string; value: string; partitionKey?: string }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  readTable(request: { table: TableDefinitionDTO; partitionKey?: string }): Record<string, unknown>[] {
    this.readRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey });
    return this.getRows(request.table.tableName).map(clone);
  }

  findRowsByColumn(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    columnName: string;
    value: string;
  }): Record<string, unknown>[] {
    this.findRequests.push({
      tableName: request.table.tableName,
      columnName: request.columnName,
      value: request.value,
      partitionKey: request.partitionKey,
    });
    return this.getRows(request.table.tableName)
      .filter((row) => String(row[request.columnName] ?? '') === request.value)
      .map(clone);
  }

  appendRows(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    rows: readonly Record<string, unknown>[];
  }): { appendedRowCount: number } {
    const rows = request.rows.map(clone);
    this.appendRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey, rows });
    this.getRows(request.table.tableName).push(...rows);
    return { appendedRowCount: rows.length };
  }

  private getRows(tableName: string): Record<string, unknown>[] {
    let rows = this.rowsByTable.get(tableName);
    if (rows === undefined) {
      rows = [];
      this.rowsByTable.set(tableName, rows);
    }
    return rows;
  }
}

class FakePlatformCacheStore {
  private readonly values = new Map<string, string>();
  private readonly ttlValues: number[] = [];

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  put(key: string, value: string, expirationInSeconds = 0): void {
    this.values.set(key, value);
    this.ttlValues.push(expirationInSeconds);
  }

  remove(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
    this.ttlValues.length = 0;
  }

  ttls(): number[] {
    return [...this.ttlValues];
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
