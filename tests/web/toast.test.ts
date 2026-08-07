import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Toast, ToastProvider } from '../../web/src/components/ui/toast';

describe('Toast', () => {
  it('render thông báo thành công có live region lịch sự và nút đóng', () => {
    const html = renderToStaticMarkup(
      createElement(Toast, {
        message: 'Đã kích hoạt biến thể.',
        onDismiss: () => undefined,
        tone: 'success',
      }),
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Đã kích hoạt biến thể.');
    expect(html).toContain('aria-label="Đóng thông báo"');
  });

  it('render thông báo lỗi là alert và ToastProvider có vùng hiển thị toàn cục', () => {
    const toastHtml = renderToStaticMarkup(createElement(Toast, { message: 'Không thể lưu đơn.', tone: 'danger' }));
    const providerHtml = renderToStaticMarkup(
      createElement(ToastProvider, null, createElement('main', null, 'Nội dung ứng dụng')),
    );

    expect(toastHtml).toContain('role="alert"');
    expect(toastHtml).toContain('aria-live="assertive"');
    expect(providerHtml).toContain('aria-label="Thông báo"');
  });
});
