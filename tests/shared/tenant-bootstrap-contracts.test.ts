import { describe, expect, it } from 'vitest';
import { operationNames } from '@shared/contracts/platform/operations';
import { parseAuthChangeOwnPasswordRequest } from '@shared/schemas/platform/auth';
import { parseBootstrapInstallRequest } from '@shared/schemas/platform/bootstrap';
import { parseApiRequest } from '@shared/schemas/api';

describe('tenant bootstrap shared contracts', () => {
  it('đăng ký operation Phase 2 trong allowlist shared', () => {
    expect(operationNames).toContain('platform.bootstrap.install');
    expect(operationNames).toContain('platform.bootstrap.getStatus');
    expect(operationNames).toContain('platform.auth.changeOwnPassword');
    expect(operationNames).toContain('platform.scope.getCurrent');
    expect(operationNames).toContain('platform.warehouse.disable');
    expect(() =>
      parseApiRequest({ operation: 'platform.bootstrap.install', requestId: 'req-1', payload: {} }),
    ).not.toThrow();
  });

  it('parse bootstrap install payload với tên tenant và credential admin tạm', () => {
    expect(
      parseBootstrapInstallRequest({
        tenantDisplayName: 'Cửa hàng An Nhiên',
        adminLoginId: 'admin',
        temporaryPassword: 'admin123',
      }),
    ).toMatchObject({
      tenantDisplayName: 'Cửa hàng An Nhiên',
      adminLoginId: 'admin',
    });
  });

  it('không chấp nhận đổi mật khẩu nếu mật khẩu mới rỗng', () => {
    expect(() =>
      parseAuthChangeOwnPasswordRequest({ currentPassword: 'admin123', newPassword: '' }),
    ).toThrow();
  });
});
