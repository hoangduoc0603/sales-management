import { describe, expect, it } from 'vitest';
import { resolveSalesManagementAppStage } from '../../web/src/app/sales-management-app-stage';
import * as salesManagementAppModule from '../../web/src/app/sales-management-app';

describe('resolveSalesManagementAppStage', () => {
  it('ưu tiên trạng thái install trước auth khi web app chưa được khởi tạo', () => {
    expect(
      resolveSalesManagementAppStage({
        actorReady: false,
        authMode: 'login',
        bootstrapping: false,
        installReadiness: 'checking',
        scopeReady: false,
        sessionReady: false,
      }),
    ).toBe('install-checking');

    expect(
      resolveSalesManagementAppStage({
        actorReady: false,
        authMode: 'login',
        bootstrapping: false,
        installReadiness: 'required',
        scopeReady: false,
        sessionReady: false,
      }),
    ).toBe('install-required');
  });

  it('giữ màn installing khi first-run setup đang chạy', () => {
    expect(
      resolveSalesManagementAppStage({
        actorReady: false,
        authMode: 'login',
        bootstrapping: false,
        installReadiness: 'installing',
        scopeReady: false,
        sessionReady: false,
      }),
    ).toBe('installing');
  });

  it('tách lỗi kiểm tra install khỏi lỗi setup thật để không mở nhầm form khởi tạo', () => {
    expect(
      resolveSalesManagementAppStage({
        actorReady: false,
        authMode: 'login',
        bootstrapping: false,
        installReadiness: 'check-failed' as never,
        scopeReady: false,
        sessionReady: false,
      }),
    ).toBe('install-check-failed');
  });

  it('fresh check install lỗi phải chuyển sang recovery thay vì tiếp tục spinner', () => {
    const resolveInstallReadiness = (
      salesManagementAppModule as unknown as {
        resolveInstallReadiness?: (
          installStatus: unknown,
          isInstalling: boolean,
          installCheckFailure?: string,
        ) => string;
      }
    ).resolveInstallReadiness;

    expect(resolveInstallReadiness).toBeDefined();
    expect(resolveInstallReadiness?.(undefined, false, 'timeout')).toBe('check-failed');
  });

  it('ưu tiên form đổi mật khẩu lần đầu thay vì workspace loading khi login trả passwordChangeRequired', () => {
    expect(
      resolveSalesManagementAppStage({
        actorReady: true,
        authMode: 'change-password-required',
        bootstrapping: false,
        installReadiness: 'installed',
        scopeReady: false,
        sessionReady: true,
      }),
    ).toBe('auth');
  });
});
