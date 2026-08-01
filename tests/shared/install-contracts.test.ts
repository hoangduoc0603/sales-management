import { describe, expect, it } from 'vitest';
import { operationNames } from '../../shared/contracts/platform/operations';
import { parseApiRequest } from '../../shared/schemas/api';
import { parseInstallRunRequest } from '../../shared/schemas/platform/install';

describe('first-run install shared contracts', () => {
  it('đăng ký operation install public cho first-run setup', () => {
    expect(operationNames).toEqual(
      expect.arrayContaining(['platform.install.getStatus', 'platform.install.run']),
    );
    expect(() =>
      parseApiRequest({ operation: 'platform.install.getStatus', requestId: 'req-install-status', payload: {} }),
    ).not.toThrow();
    expect(() =>
      parseApiRequest({
        operation: 'platform.install.run',
        requestId: 'req-install-run',
        payload: {
          tenantDisplayName: 'Cửa hàng An Nhiên',
          adminLoginId: 'owner',
          adminPassword: 'secure123',
          confirmAdminPassword: 'secure123',
        },
      }),
    ).not.toThrow();
  });

  it('validate payload install run cho admin khách tự tạo', () => {
    expect(
      parseInstallRunRequest({
        tenantDisplayName: '  Cửa hàng An Nhiên  ',
        adminLoginId: '  owner  ',
        adminPassword: 'secure123',
        confirmAdminPassword: 'secure123',
      }),
    ).toEqual({
      tenantDisplayName: 'Cửa hàng An Nhiên',
      adminLoginId: 'owner',
      adminPassword: 'secure123',
      confirmAdminPassword: 'secure123',
    });

    expect(() =>
      parseInstallRunRequest({
        tenantDisplayName: '',
        adminLoginId: 'owner',
        adminPassword: 'secure123',
        confirmAdminPassword: 'secure123',
      }),
    ).toThrow();
    expect(() =>
      parseInstallRunRequest({
        tenantDisplayName: 'Cửa hàng An Nhiên',
        adminLoginId: 'ad',
        adminPassword: 'secure123',
        confirmAdminPassword: 'secure123',
      }),
    ).toThrow();
    expect(() =>
      parseInstallRunRequest({
        tenantDisplayName: 'Cửa hàng An Nhiên',
        adminLoginId: 'owner',
        adminPassword: 'short',
        confirmAdminPassword: 'short',
      }),
    ).toThrow();
    expect(() =>
      parseInstallRunRequest({
        tenantDisplayName: 'Cửa hàng An Nhiên',
        adminLoginId: 'owner',
        adminPassword: 'secure123',
        confirmAdminPassword: 'different123',
      }),
    ).toThrow();
  });
});
