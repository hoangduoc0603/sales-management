import type { FormEvent } from 'react';
import { useState } from 'react';
import type {
  InstallRunRequest,
  InstallStatusResponse,
} from '@shared/contracts/platform/install';
import { CenioBrandMark } from '../../components/ui/brand-mark';
import { Button } from '../../components/ui/button';

export type InstallFormInput = InstallRunRequest;

export interface InstallFlowProps {
  status: InstallStatusResponse;
  isSubmitting: boolean;
  errorMessage?: string;
  onInstall(input: InstallFormInput): Promise<void> | void;
}

export function InstallFlow({
  errorMessage,
  isSubmitting,
  onInstall,
  status,
}: InstallFlowProps) {
  const [tenantDisplayName, setTenantDisplayName] = useState(status.tenantDisplayName ?? '');
  const [adminLoginId, setAdminLoginId] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onInstall({
      adminLoginId,
      adminPassword,
      confirmAdminPassword,
      tenantDisplayName,
    });
  };

  return (
    <main className="cn-auth-page">
      <section className="cn-auth-card cn-install-card" aria-labelledby="install-title">
        <div className="cn-auth-brand">
          <CenioBrandMark />
          <div>
            <strong>Cenio Sales</strong>
            <span>Quản lý bán hàng</span>
          </div>
        </div>
        <form className="cn-auth-form" onSubmit={submit}>
          <div>
            <p className="cn-eyebrow">First-run setup</p>
            <h1 id="install-title">Khởi tạo hệ thống lần đầu</h1>
            <p className="cn-auth-copy">
              Tạo cấu trúc Drive, Google Sheets dữ liệu và tài khoản admin nội bộ trên tài khoản
              Google đang triển khai Web App.
            </p>
          </div>

          {status.status === 'Failed' && status.lastErrorMessage ? (
            <p className="cn-auth-message cn-auth-error">
              Lần khởi tạo trước chưa hoàn tất. {status.lastErrorMessage}
            </p>
          ) : null}
          {errorMessage ? <p className="cn-auth-message cn-auth-error">{errorMessage}</p> : null}

          <label className="cn-field">
            <span>Tên cửa hàng</span>
            <input
              autoComplete="organization"
              name="tenantDisplayName"
              onChange={(event) => setTenantDisplayName(event.currentTarget.value)}
              placeholder="Ví dụ: Cửa hàng An Nhiên"
              required
              value={tenantDisplayName}
            />
          </label>
          <label className="cn-field">
            <span>loginId admin</span>
            <input
              autoComplete="username"
              name="adminLoginId"
              onChange={(event) => setAdminLoginId(event.currentTarget.value)}
              required
              value={adminLoginId}
            />
          </label>
          <label className="cn-field">
            <span>Mật khẩu admin</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="adminPassword"
              onChange={(event) => setAdminPassword(event.currentTarget.value)}
              required
              type="password"
              value={adminPassword}
            />
          </label>
          <label className="cn-field">
            <span>Xác nhận mật khẩu</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirmAdminPassword"
              onChange={(event) => setConfirmAdminPassword(event.currentTarget.value)}
              required
              type="password"
              value={confirmAdminPassword}
            />
          </label>
          <Button isLoading={isSubmitting} type="submit" variant="primary">
            Khởi tạo hệ thống
          </Button>
        </form>
      </section>
    </main>
  );
}

export interface InstallCheckingScreenProps {
  mode?: 'checking' | 'failed';
  errorMessage?: string;
  onRetry?(): void;
}

export function InstallCheckingScreen({
  errorMessage,
  mode = 'checking',
  onRetry,
}: InstallCheckingScreenProps) {
  const failed = mode === 'failed';

  return (
    <main className="cn-auth-page">
      <section className="cn-auth-card cn-install-check-card" aria-labelledby="install-check-title">
        <div className="cn-auth-brand">
          <CenioBrandMark />
          <div>
            <strong>Cenio Sales</strong>
            <span>Quản lý bán hàng</span>
          </div>
        </div>
        <div className="cn-install-check-content" role="status" aria-live="polite">
          {failed ? null : <span aria-hidden="true" className="cn-install-spinner" />}
          <div>
            <p className="cn-eyebrow">First-run setup</p>
            <h1 id="install-check-title">
              {failed ? 'Chưa kiểm tra được cài đặt' : 'Đang kiểm tra cài đặt'}
            </h1>
            <p className="cn-auth-copy">
              {failed
                ? 'Giữ nguyên màn phục hồi và thử lại. Ứng dụng chỉ mở setup khi backend xác nhận NotInstalled.'
                : 'Ứng dụng đang xác định hệ thống đã được khởi tạo hay cần mở luồng setup lần đầu.'}
            </p>
          </div>
          {failed ? (
            <>
              {errorMessage ? <p className="cn-auth-message cn-auth-error">{errorMessage}</p> : null}
              <Button onClick={onRetry} type="button" variant="primary">
                Thử lại
              </Button>
            </>
          ) : (
            <ol className="cn-install-check-list" aria-label="Các bước kiểm tra">
              <li>Kiểm tra runtime config</li>
              <li>Đọc trạng thái dữ liệu</li>
              <li>Chuẩn bị màn đăng nhập hoặc setup</li>
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
