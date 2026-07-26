import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RuntimeShell } from '../../web/src/app/runtime-shell';

describe('RuntimeShell', () => {
  it('hiển thị dev shell để test local backend và API flow', () => {
    const html = renderToStaticMarkup(createElement(RuntimeShell, { runtimeMode: 'local-fake' }));

    expect(html).toContain('Local fake backend');
    expect(html).toContain('Login admin local');
    expect(html).toContain('Gọi session.me');
    expect(html).toContain('Gọi registry');
  });
});
