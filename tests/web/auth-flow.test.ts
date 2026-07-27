import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AuthFlow } from '../../web/src/app/auth/auth-flow';
import { createSessionStorage } from '../../web/src/app/auth/session-storage';

describe('AuthFlow', () => {
  it('hiển thị login nội bộ, không dùng Google identity', () => {
    const html = renderToStaticMarkup(
      createElement(AuthFlow, {
        isSubmitting: false,
        mode: 'login',
        onChangePassword: async () => undefined,
        onLogin: async () => undefined,
      }),
    );

    expect(html).toContain('Đăng nhập nội bộ');
    expect(html).toContain('loginId');
    expect(html).toContain('Mật khẩu');
    expect(html).toContain('Không dùng tài khoản Google làm danh tính ứng dụng');
  });

  it('hiển thị form bắt buộc đổi mật khẩu lần đầu', () => {
    const html = renderToStaticMarkup(
      createElement(AuthFlow, {
        isSubmitting: false,
        mode: 'change-password-required',
        onChangePassword: async () => undefined,
        onLogin: async () => undefined,
      }),
    );

    expect(html).toContain('Đổi mật khẩu lần đầu');
    expect(html).toContain('Mật khẩu hiện tại');
    expect(html).toContain('Mật khẩu mới');
  });
});

describe('createSessionStorage', () => {
  it('read/write/clear session token qua storage adapter', () => {
    const values = new Map<string, string>();
    const storage = createSessionStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    });

    expect(storage.read()).toBeUndefined();
    storage.write('session-1');
    expect(storage.read()).toBe('session-1');
    storage.clear();
    expect(storage.read()).toBeUndefined();
  });
});
