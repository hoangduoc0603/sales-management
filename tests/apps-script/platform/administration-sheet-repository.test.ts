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
});

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  readTable(request: { table: TableDefinitionDTO; partitionKey?: string }): Record<string, unknown>[] {
    return this.getRows(request.table.tableName).map(clone);
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
