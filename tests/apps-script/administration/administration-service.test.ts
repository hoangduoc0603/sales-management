import { describe, expect, it } from 'vitest';
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
