import { afterEach, describe, expect, it, vi } from 'vitest';
import { invoke_ } from '../../../apps-script/src/api/web-app';

describe('Apps Script Web App entrypoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('trả lỗi setup rõ ràng thay vì throw khi tenant chưa bootstrap runtime config', () => {
    vi.stubGlobal('PropertiesService', {
      getScriptProperties: () => ({
        getProperty: () => null,
        setProperty: () => undefined,
      }),
    });

    const result = invoke_({
      operation: 'platform.auth.login',
      requestId: 'req-login-not-bootstrapped',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'RUNTIME_NOT_INSTALLED',
        message: 'Hệ thống chưa được khởi tạo. Vui lòng chạy bootstrap tenant mặc định trước khi đăng nhập.',
      },
      meta: {
        requestId: 'req-login-not-bootstrapped',
        operation: 'platform.auth.login',
      },
    });
  });
});
