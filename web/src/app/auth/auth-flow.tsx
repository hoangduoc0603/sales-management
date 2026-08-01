import type { FormEvent } from 'react';
import { useState } from 'react';
import { CenioBrandMark } from '../../components/ui/brand-mark';
import { Button } from '../../components/ui/button';

export type AuthFlowMode = 'login' | 'change-password-required';

export interface LoginInput {
  loginId: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AuthFlowProps {
  mode: AuthFlowMode;
  isSubmitting: boolean;
  errorMessage?: string;
  installWarning?: AuthInstallWarning;
  notice?: string;
  onLogin(input: LoginInput): Promise<void> | void;
  onChangePassword(input: ChangePasswordInput): Promise<void> | void;
}

export interface AuthInstallWarning {
  message: string;
  onRetry(): void;
}

export function AuthFlow({
  errorMessage,
  installWarning,
  isSubmitting,
  mode,
  notice,
  onChangePassword,
  onLogin,
}: AuthFlowProps) {
  return (
    <main className="cn-auth-page">
      <section className="cn-auth-card" aria-labelledby="auth-title">
        <div className="cn-auth-brand">
          <CenioBrandMark />
          <div>
            <strong>Cenio Sales</strong>
            <span>Retail operations</span>
          </div>
        </div>
        {mode === 'login' ? (
          <LoginForm
            errorMessage={errorMessage}
            installWarning={installWarning}
            isSubmitting={isSubmitting}
            notice={notice}
            onLogin={onLogin}
          />
        ) : (
          <ChangePasswordForm
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            notice={notice}
            onChangePassword={onChangePassword}
          />
        )}
      </section>
    </main>
  );
}

interface LoginFormProps {
  isSubmitting: boolean;
  errorMessage?: string;
  installWarning?: AuthInstallWarning;
  notice?: string;
  onLogin(input: LoginInput): Promise<void> | void;
}

function LoginForm({ errorMessage, installWarning, isSubmitting, notice, onLogin }: LoginFormProps) {
  const [loginId, setLoginId] = useState('admin');
  const [password, setPassword] = useState('admin123');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onLogin({ loginId, password });
  };

  return (
    <form className="cn-auth-form" onSubmit={submit}>
      <div>
        <p className="cn-eyebrow">Sales Management</p>
        <h1 id="auth-title">Đăng nhập nội bộ</h1>
        <p className="cn-auth-copy">
          Không dùng tài khoản Google làm danh tính ứng dụng. Tài khoản được kiểm tra bằng
          loginId và mật khẩu nội bộ.
        </p>
      </div>
      {installWarning ? <InstallWarning warning={installWarning} /> : null}
      <AuthMessage errorMessage={errorMessage} notice={notice} />
      <label className="cn-field">
        <span>loginId</span>
        <input
          autoComplete="username"
          name="loginId"
          onChange={(event) => setLoginId(event.currentTarget.value)}
          value={loginId}
        />
      </label>
      <label className="cn-field">
        <span>Mật khẩu</span>
        <input
          autoComplete="current-password"
          name="password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          type="password"
          value={password}
        />
      </label>
      <Button isLoading={isSubmitting} type="submit" variant="primary">
        Đăng nhập
      </Button>
    </form>
  );
}

function InstallWarning({ warning }: { warning: AuthInstallWarning }) {
  return (
    <div className="cn-auth-message cn-auth-notice">
      <span>{warning.message}</span>
      <button className="cn-auth-inline-action" onClick={warning.onRetry} type="button">
        Thử lại
      </button>
    </div>
  );
}

interface ChangePasswordFormProps {
  isSubmitting: boolean;
  errorMessage?: string;
  notice?: string;
  onChangePassword(input: ChangePasswordInput): Promise<void> | void;
}

function ChangePasswordForm({
  errorMessage,
  isSubmitting,
  notice,
  onChangePassword,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('admin123');
  const [newPassword, setNewPassword] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onChangePassword({ currentPassword, newPassword });
  };

  return (
    <form className="cn-auth-form" onSubmit={submit}>
      <div>
        <p className="cn-eyebrow">Bảo mật tài khoản</p>
        <h1 id="auth-title">Đổi mật khẩu lần đầu</h1>
        <p className="cn-auth-copy">
          Admin mặc định phải đổi mật khẩu tạm trước khi truy cập dữ liệu vận hành.
        </p>
      </div>
      <AuthMessage errorMessage={errorMessage} notice={notice} />
      <label className="cn-field">
        <span>Mật khẩu hiện tại</span>
        <input
          autoComplete="current-password"
          name="currentPassword"
          onChange={(event) => setCurrentPassword(event.currentTarget.value)}
          type="password"
          value={currentPassword}
        />
      </label>
      <label className="cn-field">
        <span>Mật khẩu mới</span>
        <input
          autoComplete="new-password"
          name="newPassword"
          onChange={(event) => setNewPassword(event.currentTarget.value)}
          type="password"
          value={newPassword}
        />
      </label>
      <Button isLoading={isSubmitting} type="submit" variant="primary">
        Đổi mật khẩu
      </Button>
    </form>
  );
}

function AuthMessage({ errorMessage, notice }: { errorMessage?: string; notice?: string }) {
  if (errorMessage) {
    return <p className="cn-auth-message cn-auth-error">{errorMessage}</p>;
  }

  if (notice) {
    return <p className="cn-auth-message cn-auth-notice">{notice}</p>;
  }

  return null;
}
