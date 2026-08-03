import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { InstallStatusResponse } from '@shared/contracts/platform/install';
import { InstallCheckingScreen, InstallFlow } from '../../web/src/app/install/install-flow';

const notInstalledStatus: InstallStatusResponse = {
  status: 'NotInstalled',
  installed: false,
  canRetry: true,
  appVersion: '0.1.0',
  schemaVersion: 1,
};

describe('InstallFlow', () => {
  it('render form khởi tạo lần đầu với tenant và admin nội bộ', () => {
    const html = renderToStaticMarkup(
      createElement(InstallFlow, {
        errorMessage: undefined,
        isSubmitting: false,
        onInstall: () => undefined,
        status: notInstalledStatus,
      }),
    );

    expect(html).toContain('Khởi tạo hệ thống lần đầu');
    expect(html).toContain('Quản lý bán hàng');
    expect(html).toContain('Tên cửa hàng');
    expect(html).toContain('loginId admin');
    expect(html).toContain('Mật khẩu admin');
    expect(html).toContain('Xác nhận mật khẩu');
    expect(html).toContain('Khởi tạo hệ thống');
    expect(html).not.toContain('Retail operations');
  });

  it('hiển thị lỗi setup trước đó để admin có thể thử lại', () => {
    const html = renderToStaticMarkup(
      createElement(InstallFlow, {
        errorMessage: undefined,
        isSubmitting: false,
        onInstall: () => undefined,
        status: {
          ...notInstalledStatus,
          status: 'Failed',
          lastErrorMessage: 'Không tạo được Core Data.',
        },
      }),
    );

    expect(html).toContain('Lần khởi tạo trước chưa hoàn tất.');
    expect(html).toContain('Không tạo được Core Data.');
  });
});

describe('InstallCheckingScreen', () => {
  it('render skeleton chung khi đang kiểm tra cài đặt', () => {
    const html = renderToStaticMarkup(createElement(InstallCheckingScreen));

    expect(html).toContain('Đang kiểm tra cài đặt');
    expect(html).toContain('cn-skeleton-auth-card');
    expect(html).toContain('aria-label="Đang kiểm tra cài đặt"');
    expect(html).not.toContain('cn-install-spinner');
    expect(html).not.toContain('Kiểm tra runtime config');
  });

  it('render trạng thái phục hồi có retry khi fresh check install bị lỗi', () => {
    const html = renderToStaticMarkup(
      createElement(InstallCheckingScreen, {
        errorMessage: 'Không thể kiểm tra trạng thái cài đặt sau 15 giây.',
        mode: 'failed',
        onRetry: () => undefined,
      } as never),
    );

    expect(html).toContain('Chưa kiểm tra được cài đặt');
    expect(html).toContain('Quản lý bán hàng');
    expect(html).toContain('Không thể kiểm tra trạng thái cài đặt sau 15 giây.');
    expect(html).toContain('Thử lại');
    expect(html).not.toContain('Khởi tạo hệ thống lần đầu');
    expect(html).not.toContain('Retail operations');
  });
});
