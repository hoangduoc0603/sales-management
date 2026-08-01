import type {
  BootstrapInstallRequest,
  BootstrapInstallResponse,
  BootstrapStatusResponse,
} from '@shared/contracts/platform/bootstrap';
import type { BranchDTO, RoleDTO, TenantConfigVersionDTO, TenantDTO, WarehouseDTO } from '@shared/contracts/platform/administration';
import { createInMemoryAuthRepository, toActorContext, type AuthRepository } from '../../../repositories/platform/auth-repository';
import {
  createInMemoryAdministrationRepository,
  type AdministrationRepository,
} from '../../../repositories/platform/administration-repository';
import {
  createDeterministicPasswordServiceForTest,
  type PasswordService,
} from '../auth/password-service';

export interface BootstrapService {
  install(input: BootstrapInstallRequest): BootstrapInstallResponse;
  getStatus(): BootstrapStatusResponse;
}

interface BootstrapServiceDependencies {
  repository: AdministrationRepository;
  authRepository: AuthRepository;
  passwordService?: PasswordService;
}

export function createBootstrapService(deps: BootstrapServiceDependencies): BootstrapService {
  const passwordService = deps.passwordService ?? createDeterministicPasswordServiceForTest();

  return {
    install(input) {
      const existing = buildInstalledResponse(deps.repository, deps.authRepository);

      if (existing !== undefined) {
        return { ...existing, alreadyInstalled: true, adminTemporaryPasswordShownOnce: false };
      }

      const tenant = createTenant(input.tenantDisplayName ?? 'Cửa hàng mặc định');
      const branch = createBranch(tenant.tenantId);
      const warehouse = createWarehouse(tenant.tenantId, branch.branchId);
      const ownerRole = createRole(tenant.tenantId, 'Owner');
      const managerRole = createRole(tenant.tenantId, 'Manager');
      const configVersion = createTenantConfigVersion(tenant.tenantId);
      const adminUser = {
        userId: 'user-admin',
        loginId: input.adminLoginId ?? 'admin',
        displayName: 'Admin',
        tenantId: tenant.tenantId,
        authVersion: 1,
        disabled: false,
        passwordChangeRequired: input.adminPasswordChangeRequired ?? true,
        passwordVerifier: passwordService.createVerifier(input.temporaryPassword ?? 'admin123'),
        failedLoginCount: 0,
        actions: [
          'platform.auth.logout',
          'platform.auth.changeOwnPassword',
          'platform.session.view',
          'platform.command.view',
          'platform.registry.view',
          'platform.scope.view',
          'platform.warehouse.update',
          'catalog.product.configure',
          'catalog.pos.view',
          'catalog.quote.view',
          'crm.customer.create',
          'crm.customer.view',
          'inventory.balance.view',
          'inventory.movement.create',
          'inventory.reserve',
          'inventory.release',
          'inventory.return.process',
          'finance.shift.manage',
          'finance.payment.record',
          'finance.supplierPayment.record',
          'finance.payment.reverse',
          'finance.expense.approve',
          'finance.summary.view',
          'purchasing.supplier.manage',
          'purchasing.po.manage',
          'purchasing.receipt.manage',
          'purchasing.cost.adjust',
          'purchasing.supplierReturn.manage',
          'sales.draft.manage',
          'sales.pos.complete',
          'sales.order.view',
          'sales.online.manage',
          'sales.return.process',
          'sales.warranty.manage',
          'reporting.dashboard.view',
          'reporting.report.view',
          'reporting.export',
          'operations.import.manage',
          'operations.attachment.manage',
          'operations.attachment.view',
          'operations.audit.view',
          'operations.audit.deliver',
          'operations.backup.manage',
          'operations.restore.manage',
          'operations.health.view',
          'operations.partition.manage',
          'operations.runtime.cleanup',
        ],
        branchIds: [branch.branchId],
        warehouseIds: [warehouse.warehouseId],
      };

      deps.repository.saveTenant(tenant);
      deps.repository.saveBranch(branch);
      deps.repository.saveWarehouse(warehouse);
      deps.repository.saveRole(ownerRole);
      deps.repository.saveRole(managerRole);
      deps.repository.saveUserRole({
        userRoleId: 'user-role-admin-owner',
        userId: adminUser.userId,
        roleId: ownerRole.roleId,
        status: 'Active',
      });
      deps.repository.saveUserScope({
        userScopeId: 'user-scope-admin-tenant',
        userId: adminUser.userId,
        scopeType: 'tenant',
        scopeId: tenant.tenantId,
        status: 'Active',
      });
      deps.repository.saveUserScope({
        userScopeId: 'user-scope-admin-branch',
        userId: adminUser.userId,
        scopeType: 'branch',
        scopeId: branch.branchId,
        status: 'Active',
      });
      deps.repository.saveUserScope({
        userScopeId: 'user-scope-admin-warehouse',
        userId: adminUser.userId,
        scopeType: 'warehouse',
        scopeId: warehouse.warehouseId,
        status: 'Active',
      });
      deps.repository.saveTenantConfigVersion(configVersion);
      deps.authRepository.saveUser(adminUser);

      return {
        installed: true,
        alreadyInstalled: false,
        tenant,
        branch,
        warehouse,
        admin: toActorContext(adminUser),
        adminTemporaryPasswordShownOnce: true,
        roles: [ownerRole, managerRole],
        configVersion,
      };
    },
    getStatus() {
      const tenant = deps.repository.listTenants()[0];
      const branch = deps.repository.listBranches()[0];
      const warehouse = deps.repository.listWarehouses()[0];
      const configVersion = deps.repository.listTenantConfigVersions()[0];

      if (tenant === undefined || branch === undefined || warehouse === undefined || configVersion === undefined) {
        return { installed: false };
      }

      return { installed: true, tenant, branch, warehouse, configVersion };
    },
  };
}

export function createBootstrapServiceForTest() {
  const repository = createInMemoryAdministrationRepository();
  const authRepository = createInMemoryAuthRepository([]);
  const service = createBootstrapService({ repository, authRepository });

  return { service, repository, authRepository };
}

function buildInstalledResponse(
  repository: AdministrationRepository,
  authRepository: AuthRepository,
): Omit<BootstrapInstallResponse, 'alreadyInstalled' | 'adminTemporaryPasswordShownOnce'> | undefined {
  const tenant = repository.listTenants()[0];
  const branch = repository.listBranches()[0];
  const warehouse = repository.listWarehouses()[0];
  const configVersion = repository.listTenantConfigVersions()[0];
  const adminUser = authRepository.findUserByLoginId('admin');

  if (tenant === undefined || branch === undefined || warehouse === undefined || configVersion === undefined || adminUser === undefined) {
    return undefined;
  }

  return {
    installed: true,
    tenant,
    branch,
    warehouse,
    admin: toActorContext(adminUser),
    roles: repository.listRoles(),
    configVersion,
  };
}

function createTenant(displayName: string): TenantDTO {
  return {
    tenantId: 'tenant-default',
    displayName,
    status: 'Active',
    timezone: 'Asia/Ho_Chi_Minh',
    activeConfigVersionId: 'config-default',
  };
}

function createBranch(tenantId: string): BranchDTO {
  return {
    tenantId,
    branchId: 'branch-default',
    branchCode: 'BR-DEFAULT',
    name: 'Chi nhánh mặc định',
    status: 'Active',
  };
}

function createWarehouse(tenantId: string, branchId: string): WarehouseDTO {
  return {
    tenantId,
    branchId,
    warehouseId: 'warehouse-default',
    warehouseCode: 'WH-DEFAULT',
    name: 'Kho mặc định',
    status: 'Active',
    directSaleEnabled: true,
    negativeStockPolicy: 'Block',
    lotTrackingDefault: false,
    serialTrackingDefault: false,
  };
}

function createRole(tenantId: string, name: string): RoleDTO {
  return {
    tenantId,
    roleId: `role-${name.toLowerCase()}`,
    name,
    status: 'Active',
  };
}

function createTenantConfigVersion(tenantId: string): TenantConfigVersionDTO {
  return {
    tenantId,
    configVersionId: 'config-default',
    configType: 'TenantBaseline',
    effectiveFrom: '2026-07-27T00:00:00.000+07:00',
    status: 'Published',
  };
}
