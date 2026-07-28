import { describe, expect, it } from 'vitest';
import {
  createBootstrapService,
  createBootstrapServiceForTest,
} from '../../../apps-script/src/services/platform/bootstrap/bootstrap-service';
import { createInMemoryAdministrationRepository } from '../../../apps-script/src/repositories/platform/administration-repository';
import { createInMemoryAuthRepository } from '../../../apps-script/src/repositories/platform/auth-repository';

describe('BootstrapService', () => {
  it('install idempotent tạo một tenant, branch, warehouse và admin mặc định', () => {
    const fixture = createBootstrapServiceForTest();

    const first = fixture.service.install({
      tenantDisplayName: 'Cửa hàng An Nhiên',
      adminLoginId: 'admin',
      temporaryPassword: 'admin123',
    });
    const second = fixture.service.install({
      tenantDisplayName: 'Tên gọi lại không được ghi đè',
      adminLoginId: 'other-admin',
      temporaryPassword: 'other-password',
    });

    expect(first).toMatchObject({
      installed: true,
      alreadyInstalled: false,
      tenant: { displayName: 'Cửa hàng An Nhiên', status: 'Active' },
      branch: { name: 'Chi nhánh mặc định', status: 'Active' },
      warehouse: { name: 'Kho mặc định', directSaleEnabled: true, status: 'Active' },
      admin: { loginId: 'admin' },
      adminTemporaryPasswordShownOnce: true,
    });
    expect(second).toMatchObject({
      installed: true,
      alreadyInstalled: true,
      tenant: { displayName: 'Cửa hàng An Nhiên' },
      adminTemporaryPasswordShownOnce: false,
    });
    expect(fixture.repository.listTenants()).toHaveLength(1);
    expect(fixture.repository.listBranches()).toHaveLength(1);
    expect(fixture.repository.listWarehouses()).toHaveLength(1);
    expect(fixture.authRepository.findUserByLoginId('admin')).toMatchObject({
      passwordChangeRequired: true,
      loginId: 'admin',
    });
  });

  it('getStatus trả installed=false trước khi bootstrap', () => {
    const fixture = createBootstrapServiceForTest();

    expect(fixture.service.getStatus()).toEqual({ installed: false });
  });

  it('tạo verifier admin qua PasswordService được inject thay vì hard-code verifier test', () => {
    const repository = createInMemoryAdministrationRepository();
    const authRepository = createInMemoryAuthRepository([]);
    const service = createBootstrapService({
      repository,
      authRepository,
      passwordService: {
        verifyPassword: () => false,
        createVerifier: (password) => `custom-verifier:${password}`,
      },
    });

    service.install({
      tenantDisplayName: 'Cửa hàng An Nhiên',
      adminLoginId: 'admin',
      temporaryPassword: 'temporary-secret',
    });

    expect(authRepository.findUserByLoginId('admin')?.passwordVerifier).toBe(
      'custom-verifier:temporary-secret',
    );
  });
});
