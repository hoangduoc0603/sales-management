import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { SalesManagementApp } from '../../web/src/app/sales-management-app';

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

describe('SalesManagementApp runtime entry', () => {
  it('bypass auth gate và vào workspace ngay khi chạy local fake để debug UI', () => {
    const html = renderToStaticMarkup(createElement(SalesManagementApp, { runtimeMode: 'local-fake' }));

    expect(html).toContain('Cenio Sales');
    expect(html).toContain('Tổng quan');
    expect(html).not.toContain('Đăng nhập nội bộ');
    expect(html).not.toContain('Local runtime test shell');
  });

  it('bypass auth gate khi chạy trong browser local không có google.script.run', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        google: undefined,
        sessionStorage: {
          getItem: () => null,
          removeItem: () => undefined,
          setItem: () => undefined,
        },
      },
    });

    const html = renderToStaticMarkup(createElement(SalesManagementApp));

    expect(html).toContain('Cenio Sales');
    expect(html).toContain('Tổng quan');
    expect(html).not.toContain('Đăng nhập nội bộ');
  });
});
