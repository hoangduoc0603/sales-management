import { describe, expect, it } from 'vitest';
import { resolveSalesManagementAppStage } from '../../web/src/app/sales-management-app-stage';

describe('resolveSalesManagementAppStage', () => {
  it('ưu tiên form đổi mật khẩu lần đầu thay vì workspace loading khi login trả passwordChangeRequired', () => {
    expect(
      resolveSalesManagementAppStage({
        actorReady: true,
        authMode: 'change-password-required',
        bootstrapping: false,
        scopeReady: false,
        sessionReady: true,
      }),
    ).toBe('auth');
  });
});
