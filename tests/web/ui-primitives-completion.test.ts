import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Dialog } from '../../web/src/components/ui/dialog';
import { Sheet } from '../../web/src/components/ui/sheet';
import { Skeleton } from '../../web/src/components/ui/skeleton';
import { Table } from '../../web/src/components/ui/table';
import { Tabs } from '../../web/src/components/ui/tabs';
import { Tooltip } from '../../web/src/components/ui/tooltip';
import { Toast } from '../../web/src/components/ui/toast';

describe('remaining UI foundation primitives', () => {
  it('Table render header/body và empty state theo Cenio class', () => {
    const html = renderToStaticMarkup(
      createElement(Table, {
        columns: [
          { key: 'code', header: 'Mã' },
          { key: 'status', header: 'Trạng thái' },
        ],
        emptyMessage: 'Không có dữ liệu',
        getRowKey: (row) => String(row.code),
        rows: [{ code: 'SO-001', status: 'Completed' }],
      }),
    );

    expect(html).toContain('cn-table');
    expect(html).toContain('<th');
    expect(html).toContain('SO-001');
    expect(html).not.toContain('Không có dữ liệu');
  });

  it('Tabs render tablist, tab và selected panel', () => {
    const html = renderToStaticMarkup(
      createElement(Tabs, {
        items: [
          { id: 'loading', label: 'Đang tải', content: 'Loading state' },
          { id: 'empty', label: 'Không có dữ liệu', content: 'Empty state' },
        ],
        selectedId: 'empty',
        onChange: () => undefined,
      }),
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Empty state');
    expect(html).not.toContain('Loading state');
  });

  it('Dialog, Toast và Skeleton có accessibility/state markup cơ bản', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(Dialog, {
          isOpen: true,
          title: 'Chi tiết chứng từ',
          description: 'Nội dung được giữ trong scope hiện tại.',
          onClose: () => undefined,
          children: 'Dialog body',
        }),
        createElement(Toast, { tone: 'success', message: 'Đã lưu nháp' }),
        createElement(Skeleton, { lines: 3 }),
      ),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('cn-skeleton-line');
  });

  it('Sheet và Tooltip expose semantics cần cho mobile drawer và collapsed navigation', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(
          Sheet,
          {
            isOpen: true,
            title: 'Menu điều hướng',
            description: 'Chọn module nghiệp vụ',
            side: 'left',
            onOpenChange: () => undefined,
          },
          createElement('nav', { 'aria-label': 'Điều hướng chính' }, 'Bán hàng'),
        ),
        createElement(Tooltip, { label: 'Bán hàng' }, createElement('button', { type: 'button' }, 'POS')),
      ),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('data-side="left"');
    expect(html).toContain('Menu điều hướng');
    expect(html).toContain('Chọn module nghiệp vụ');
    expect(html).toContain('data-tooltip-label="Bán hàng"');
  });
});
