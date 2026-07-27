import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SalesManagementApp } from '../../web/src/app/sales-management-app';

describe('SalesManagementApp runtime entry', () => {
  it('hiển thị app auth gate thay cho technical runtime shell', () => {
    const html = renderToStaticMarkup(createElement(SalesManagementApp, { runtimeMode: 'local-fake' }));

    expect(html).toContain('Đăng nhập nội bộ');
    expect(html).toContain('Cenio Sales');
    expect(html).not.toContain('Local runtime test shell');
  });
});
