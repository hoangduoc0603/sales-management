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
    expect(html).toContain('Quản lý bán hàng');
    expect(html).toContain('loginId');
    expect(html).toContain('Mật khẩu');
    expect(html).toContain('Không dùng tài khoản Google làm danh tính ứng dụng');
    expect(html).not.toContain('Retail operations');
  });

  it('hiển thị lựa chọn ghi nhớ đăng nhập 7 ngày trên thiết bị này', () => {
    const html = renderToStaticMarkup(
      createElement(AuthFlow, {
        isSubmitting: false,
        mode: 'login',
        onChangePassword: async () => undefined,
        onLogin: async () => undefined,
      }),
    );

    expect(html).toContain('Ghi nhớ đăng nhập trên thiết bị này trong 7 ngày');
    expect(html).toContain('Chỉ dùng trên thiết bị cá nhân');
    expect(html).toContain('name="rememberSession"');
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

  it('đọc remembered token từ local storage khi session storage không có token', () => {
    const tabValues = new Map<string, string>();
    const deviceValues = new Map<string, string>();
    const storageForFirstTab = createSessionStorage({
      session: {
        getItem: (key) => tabValues.get(key) ?? null,
        setItem: (key, value) => tabValues.set(key, value),
        removeItem: (key) => tabValues.delete(key),
      },
      persistent: {
        getItem: (key) => deviceValues.get(key) ?? null,
        setItem: (key, value) => deviceValues.set(key, value),
        removeItem: (key) => deviceValues.delete(key),
      },
    });

    storageForFirstTab.write('session-remembered', { rememberSession: true });

    const storageForReopenedTab = createSessionStorage({
      session: {
        getItem: () => null,
        setItem: (key, value) => tabValues.set(key, value),
        removeItem: (key) => tabValues.delete(key),
      },
      persistent: {
        getItem: (key) => deviceValues.get(key) ?? null,
        setItem: (key, value) => deviceValues.set(key, value),
        removeItem: (key) => deviceValues.delete(key),
      },
    });

    expect(storageForReopenedTab.read()).toBe('session-remembered');
    storageForReopenedTab.clear();
    expect(storageForReopenedTab.read()).toBeUndefined();
  });
});
