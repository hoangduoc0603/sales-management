import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Badge } from '../../web/src/components/ui/badge';
import { Button, IconButton } from '../../web/src/components/ui/button';
import { Listbox } from '../../web/src/components/ui/listbox';
import { Panel } from '../../web/src/components/ui/panel';
import { StateBlock } from '../../web/src/components/ui/state-block';

describe('UI foundation primitives', () => {
  it('button loading giữ nguyên label và chỉ thêm loading indicator', () => {
    const html = renderToStaticMarkup(
      createElement(Button, { isLoading: true }, 'Hoàn tất'),
    );

    expect(html).toContain('Hoàn tất');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('cn-spinner');
  });

  it('listbox không render native select và có role listbox/option', () => {
    const html = renderToStaticMarkup(
      createElement(Listbox, {
        label: 'Chi nhánh',
        value: 'branch-default',
        options: [{ value: 'branch-default', label: 'Chi nhánh mặc định' }],
        onChange: () => undefined,
      }),
    );

    expect(html).not.toContain('<select');
    expect(html).toContain('role="listbox"');
    expect(html).toContain('role="option"');
    expect(html).toContain('Chi nhánh mặc định');
  });

  it('state block hiển thị recovery CTA khi có action', () => {
    const html = renderToStaticMarkup(
      createElement(StateBlock, {
        tone: 'danger',
        title: 'Không tải được dữ liệu',
        description: 'Có thể thử lại.',
        actionLabel: 'Thử lại',
        onAction: () => undefined,
      }),
    );

    expect(html).toContain('Không tải được dữ liệu');
    expect(html).toContain('Thử lại');
  });

  it('badge, icon button và panel dùng class Cenio Core', () => {
    const html = renderToStaticMarkup(
      createElement(Panel, {
        title: 'Tổng quan',
        children: createElement(
          'div',
          null,
          createElement(Badge, { tone: 'success' }, 'Dữ liệu sẵn sàng'),
          createElement(IconButton, { label: 'Chuyển theme' }, '☾'),
        ),
      }),
    );

    expect(html).toContain('cn-panel');
    expect(html).toContain('cn-badge');
    expect(html).toContain('aria-label="Chuyển theme"');
  });
});
