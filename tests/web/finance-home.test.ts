import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FinanceHome } from '../../web/src/features/finance/finance-home';

describe('FinanceHome', () => {
  it('renders finance and shifts shell according to approved handoff', () => {
    const html = renderToStaticMarkup(
      createElement(FinanceHome, {
        summary: {
          generatedAt: '2026-07-27T09:00:00.000Z',
          openShiftCount: 1,
          cashInVnd: 9_420_000,
          cashOutVnd: 760_000,
          receivableOpenVnd: 2_160_000,
          payableOpenVnd: 0,
        },
      }),
    );

    expect(html).toContain('Tài chính &amp; ca thu ngân');
    expect(html).toContain('Sổ quỹ &amp; payment');
    expect(html).toContain('Cash drawer &amp; tài khoản');
    expect(html).toContain('Phương thức thanh toán');
    expect(html).toContain('Bị giới hạn theo quyền');
    expect(html).not.toContain('<select');
  });

  it('renders shift and expense workspaces', () => {
    const html = renderToStaticMarkup(createElement(FinanceHome));

    expect(html).toContain('Ca thu ngân');
    expect(html).toContain('Đóng ca &amp; khóa sổ');
    expect(html).toContain('Chi phí vận hành');
  });
});
