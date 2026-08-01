import { describe, expect, it } from 'vitest';
import type { RuntimeConfigDTO } from '../../../apps-script/src/infrastructure/google-workspace/runtime-config-store';
import { warmRuntime } from '../../../apps-script/src/services/platform/runtime/runtime-warmup';
import type { UserAccountRecord } from '../../../apps-script/src/repositories/platform/auth-repository';
import type { BranchDTO, TenantDTO, WarehouseDTO } from '../../../shared/contracts/platform/administration';

describe('runtime warm-up service', () => {
  it('bỏ qua nhẹ nhàng khi tenant chưa được khởi tạo', () => {
    const authRepository = new CountingAuthRepository();
    const administrationRepository = new CountingAdministrationRepository();

    const result = warmRuntime({
      authRepository,
      administrationRepository,
      now: () => new Date('2026-07-31T05:00:00.000Z'),
      nowMs: () => 100,
    });

    expect(result).toMatchObject({
      status: 'SkippedNotInstalled',
      warmed: {
        userProfile: false,
        tenant: false,
        branches: 0,
        warehouses: 0,
      },
    });
    expect(authRepository.calls).toEqual([]);
    expect(administrationRepository.calls).toEqual([]);
  });

  it('làm ấm đúng auth profile và current scope cache nhưng không tạo session/audit', () => {
    const authRepository = new CountingAuthRepository(adminUser);
    const administrationRepository = new CountingAdministrationRepository();

    const result = warmRuntime({
      runtimeConfig,
      authRepository,
      administrationRepository,
      now: () => new Date('2026-07-31T05:00:00.000Z'),
      nowMs: () => 100,
      maxDurationMs: 1500,
    });

    expect(result).toMatchObject({
      status: 'Ok',
      warmed: {
        userProfile: true,
        tenant: true,
        branches: 1,
        warehouses: 1,
      },
    });
    expect(authRepository.calls).toEqual(['findUserByLoginId:admin']);
    expect(authRepository.saveSessionCalls).toBe(0);
    expect(administrationRepository.calls).toEqual([
      'findTenantById:tenant-default',
      'findBranchesByIds:branch-default',
      'findWarehousesByIds:warehouse-default',
    ]);
  });

  it('dừng trước khi đọc dữ liệu nếu đã vượt ngân sách thời gian', () => {
    const authRepository = new CountingAuthRepository(adminUser);
    const administrationRepository = new CountingAdministrationRepository();
    const nowValues = [0, 2000];

    const result = warmRuntime({
      runtimeConfig,
      authRepository,
      administrationRepository,
      now: () => new Date('2026-07-31T05:00:00.000Z'),
      nowMs: () => nowValues.shift() ?? 2000,
      maxDurationMs: 1500,
    });

    expect(result).toMatchObject({
      status: 'SkippedBudgetExceeded',
      reason: 'Warm-up budget exceeded before auth profile.',
    });
    expect(authRepository.calls).toEqual([]);
    expect(administrationRepository.calls).toEqual([]);
  });
});

const runtimeConfig: RuntimeConfigDTO = {
  tenantId: 'tenant-default',
  appVersion: '0.1.0',
  schemaVersion: 1,
  driveRootFolderId: 'folder-default',
  storage: {
    core: { spreadsheetId: 'core-default' },
    runtime: { spreadsheetId: 'runtime-default' },
    transaction: { activePartitionKey: 'FY2026-P07', spreadsheetId: 'txn-default' },
    audit: { activePartitionKey: 'AUDIT-2026-07', spreadsheetId: 'audit-default' },
  },
  maintenanceMode: false,
};

const adminUser: UserAccountRecord = {
  userId: 'user-admin',
  loginId: 'admin',
  displayName: 'Admin',
  tenantId: 'tenant-default',
  authVersion: 1,
  disabled: false,
  passwordChangeRequired: false,
  passwordVerifier: '',
  failedLoginCount: 0,
  actions: ['platform.session.view'],
  branchIds: ['branch-default'],
  warehouseIds: ['warehouse-default'],
};

class CountingAuthRepository {
  readonly calls: string[] = [];
  saveSessionCalls = 0;

  constructor(private readonly user?: UserAccountRecord) {}

  findUserByLoginId(loginId: string): UserAccountRecord | undefined {
    this.calls.push(`findUserByLoginId:${loginId}`);
    return this.user;
  }

  saveSession(): void {
    this.saveSessionCalls += 1;
  }
}

class CountingAdministrationRepository {
  readonly calls: string[] = [];

  findTenantById(tenantId: string): TenantDTO | undefined {
    this.calls.push(`findTenantById:${tenantId}`);
    return {
      tenantId,
      displayName: 'Cửa hàng cenio',
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'Active',
      activeConfigVersionId: 'config-default',
    };
  }

  findBranchesByIds(branchIds: readonly string[]): readonly BranchDTO[] {
    this.calls.push(`findBranchesByIds:${branchIds.join(',')}`);
    return branchIds.map((branchId) => ({
      branchId,
      tenantId: 'tenant-default',
      branchCode: 'BR-DEFAULT',
      name: 'Chi nhánh mặc định',
      status: 'Active',
    }));
  }

  findWarehousesByIds(warehouseIds: readonly string[]): readonly WarehouseDTO[] {
    this.calls.push(`findWarehousesByIds:${warehouseIds.join(',')}`);
    return warehouseIds.map((warehouseId) => ({
      warehouseId,
      tenantId: 'tenant-default',
      branchId: 'branch-default',
      warehouseCode: 'WH-DEFAULT',
      name: 'Kho mặc định',
      status: 'Active',
      directSaleEnabled: true,
      negativeStockPolicy: 'Block',
      lotTrackingDefault: 'false',
      serialTrackingDefault: 'false',
    }));
  }
}
