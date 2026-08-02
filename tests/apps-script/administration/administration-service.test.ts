import { describe, expect, it } from 'vitest';
import type {
  BranchDTO,
  RoleDTO,
  TenantConfigVersionDTO,
  TenantDTO,
  WarehouseDTO,
} from '../../../shared/contracts/platform/administration';
import type { ActorContextDTO } from '../../../shared/contracts/platform/authorization';
import type { PlatformCacheStore } from '../../../apps-script/src/infrastructure/platform/cache';
import type {
  AdministrationRepository,
  UserRoleRecord,
  UserScopeRecord,
} from '../../../apps-script/src/repositories/platform/administration-repository';
import { createBootstrapServiceForTest } from '../../../apps-script/src/services/platform/bootstrap/bootstrap-service';
import { createAdministrationService } from '../../../apps-script/src/services/administration/administration-service';

describe('AdministrationService', () => {
  it('trả current scope theo tenant, branch và warehouse của actor', () => {
    const { service: bootstrap, repository } = createBootstrapServiceForTest();
    const installed = bootstrap.install({
      tenantDisplayName: 'Công ty Cenio Retail',
      adminLoginId: 'admin',
      temporaryPassword: 'admin123',
    });
    const service = createAdministrationService({ repository });

    const scope = service.getCurrentScope(installed.admin);

    expect(scope.tenant.displayName).toBe('Công ty Cenio Retail');
    expect(scope.branches).toHaveLength(1);
    expect(scope.warehouses).toHaveLength(1);
    expect(scope.activeBranchId).toBe('branch-default');
    expect(scope.activeWarehouseId).toBe('warehouse-default');
  });

  it('cache current scope theo actor để login/bootstrap không lookup tenant, branch, warehouse lặp lại', () => {
    const repository = new CountingAdministrationRepository();
    const cacheStore = new FakePlatformCacheStore();
    const service = createAdministrationService({
      repository,
      cacheStore,
      currentScopeCacheTtlSeconds: 300,
    });

    expect(service.getCurrentScope(actorFixture).activeWarehouseId).toBe('warehouse-default');
    expect(service.getCurrentScope(actorFixture).activeWarehouseId).toBe('warehouse-default');

    expect(repository.calls).toEqual({
      tenant: 1,
      branches: 1,
      warehouses: 1,
    });
    expect(cacheStore.ttls()).toEqual([300]);
  });

  it('không disable warehouse khi blocker service báo còn ràng buộc nghiệp vụ', () => {
    const { service: bootstrap, repository } = createBootstrapServiceForTest();
    bootstrap.install({ adminLoginId: 'admin', temporaryPassword: 'admin123' });
    const service = createAdministrationService({
      repository,
      warehouseDisableBlockerProvider: () => [
        {
          type: 'OnHandStock',
          objectId: 'stock-1',
          message: 'Kho còn tồn hàng.',
        },
      ],
    });

    const result = service.disableWarehouse({
      warehouseId: 'warehouse-default',
      reason: 'Ngừng dùng kho mặc định',
    });

    expect(result).toEqual({
      disabled: false,
      blockers: [
        {
          type: 'OnHandStock',
          objectId: 'stock-1',
          message: 'Kho còn tồn hàng.',
        },
      ],
    });
    expect(repository.listWarehouses()[0]?.status).toBe('Active');
  });

  it('disable warehouse khi không có blocker', () => {
    const { service: bootstrap, repository } = createBootstrapServiceForTest();
    bootstrap.install({ adminLoginId: 'admin', temporaryPassword: 'admin123' });
    const service = createAdministrationService({ repository });

    const result = service.disableWarehouse({
      warehouseId: 'warehouse-default',
      reason: 'Ngừng dùng kho mặc định',
    });

    expect(result).toEqual({ disabled: true, blockers: [] });
    expect(repository.listWarehouses()[0]?.status).toBe('Disabled');
  });
});

const tenantFixture: TenantDTO = {
  tenantId: 'tenant-default',
  displayName: 'Cửa hàng Cenio',
  status: 'Active',
  timezone: 'Asia/Ho_Chi_Minh',
  activeConfigVersionId: 'config-default',
};

const branchFixture: BranchDTO = {
  branchId: 'branch-default',
  tenantId: 'tenant-default',
  branchCode: 'BR-DEFAULT',
  name: 'Chi nhánh mặc định',
  status: 'Active',
};

const warehouseFixture: WarehouseDTO = {
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
};

const actorFixture: ActorContextDTO = {
  userId: 'user-admin',
  loginId: 'admin',
  displayName: 'Admin',
  tenantId: 'tenant-default',
  authVersion: 1,
  actions: ['platform.scope.view'],
  scope: {
    tenantId: 'tenant-default',
    branchIds: ['branch-default'],
    warehouseIds: ['warehouse-default'],
  },
};

class CountingAdministrationRepository implements AdministrationRepository {
  readonly calls = {
    tenant: 0,
    branches: 0,
    warehouses: 0,
  };

  listTenants(): readonly TenantDTO[] {
    return [tenantFixture];
  }

  findTenantById(tenantId: string): TenantDTO | undefined {
    this.calls.tenant += 1;
    return tenantId === tenantFixture.tenantId ? { ...tenantFixture } : undefined;
  }

  listBranches(): readonly BranchDTO[] {
    return [branchFixture];
  }

  findBranchesByIds(branchIds: readonly string[]): readonly BranchDTO[] {
    this.calls.branches += 1;
    return branchIds.includes(branchFixture.branchId) ? [{ ...branchFixture }] : [];
  }

  listWarehouses(): readonly WarehouseDTO[] {
    return [warehouseFixture];
  }

  findWarehousesByIds(warehouseIds: readonly string[]): readonly WarehouseDTO[] {
    this.calls.warehouses += 1;
    return warehouseIds.includes(warehouseFixture.warehouseId) ? [{ ...warehouseFixture }] : [];
  }

  listRoles(): readonly RoleDTO[] {
    return [];
  }

  listUserRoles(): readonly UserRoleRecord[] {
    return [];
  }

  listUserScopes(): readonly UserScopeRecord[] {
    return [];
  }

  listTenantConfigVersions(): readonly TenantConfigVersionDTO[] {
    return [];
  }

  saveTenant(): void {}

  saveBranch(): void {}

  saveWarehouse(): void {}

  saveRole(): void {}

  saveUserRole(): void {}

  saveUserScope(): void {}

  saveTenantConfigVersion(): void {}
}

class FakePlatformCacheStore implements PlatformCacheStore {
  private readonly entries = new Map<string, { value: string; ttl: number }>();

  get(key: string): string | undefined {
    return this.entries.get(key)?.value;
  }

  put(key: string, value: string, expirationInSeconds: number): void {
    this.entries.set(key, { value, ttl: expirationInSeconds });
  }

  remove(key: string): void {
    this.entries.delete(key);
  }

  ttls(): number[] {
    return [...this.entries.values()].map((entry) => entry.ttl);
  }
}
