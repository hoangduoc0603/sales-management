import type { ApiClient } from '../lib/api/client';
import { createRuntimeApiClient, detectRuntimeApiMode, type RuntimeApiMode } from '../lib/api/runtime-client';
import type { AuthLoginResponse } from '@shared/contracts/platform/auth';
import { useCallback, useMemo, useState } from 'react';

export interface RuntimeShellProps {
  runtimeMode?: RuntimeApiMode;
  apiClient?: ApiClient;
}

export function RuntimeShell({ runtimeMode, apiClient }: RuntimeShellProps) {
  const client = useMemo(() => apiClient ?? createRuntimeApiClient(), [apiClient]);
  const mode = runtimeMode ?? detectRuntimeApiMode();
  const [sessionToken, setSessionToken] = useState<string>();
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<unknown>({
    message: 'Sẵn sàng test local flow.',
    localCredential: { loginId: 'admin', password: 'admin123' },
  });

  const runLogin = useCallback(async () => {
    setIsRunning(true);
    const result = await client.invoke<AuthLoginResponse>({
      operation: 'platform.auth.login',
      requestId: createRequestId('login'),
      payload: { loginId: 'admin', password: 'admin123' },
    });

    if (result.ok) {
      setSessionToken(result.data.sessionToken);
    }

    setOutput(result);
    setIsRunning(false);
  }, [client]);

  const runSessionMe = useCallback(async () => {
    setIsRunning(true);
    const result = await client.invoke({
      operation: 'platform.session.me',
      requestId: createRequestId('me'),
      sessionToken,
      payload: {},
    });
    setOutput(result);
    setIsRunning(false);
  }, [client, sessionToken]);

  const runRegistry = useCallback(async () => {
    setIsRunning(true);
    const result = await client.invoke({
      operation: 'platform.registry.getTableDefinitions',
      requestId: createRequestId('registry'),
      sessionToken,
      payload: {},
    });
    setOutput(result);
    setIsRunning(false);
  }, [client, sessionToken]);

  const runLogout = useCallback(async () => {
    setIsRunning(true);
    const result = await client.invoke({
      operation: 'platform.auth.logout',
      requestId: createRequestId('logout'),
      sessionToken,
      payload: {},
    });
    setSessionToken(undefined);
    setOutput(result);
    setIsRunning(false);
  }, [client, sessionToken]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100" data-runtime="sales-management">
      <section className="mx-auto flex max-w-5xl flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-300">Sales Management</p>
          <h1 className="text-3xl font-semibold">Local runtime test shell</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">
            Shell kỹ thuật để kiểm tra Vite local, fake backend và API flow trước khi triển khai các màn
            nghiệp vụ theo Open Design.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard label="Backend mode" value={mode === 'local-fake' ? 'Local fake backend' : 'Apps Script'} />
          <InfoCard label="Session" value={sessionToken ? 'Đã đăng nhập' : 'Chưa đăng nhập'} />
          <InfoCard label="Credential local" value="admin / admin123" />
        </div>

        <div className="flex flex-wrap gap-3">
          <button className={buttonClassName} disabled={isRunning} onClick={runLogin} type="button">
            Login admin local
          </button>
          <button className={buttonClassName} disabled={isRunning} onClick={runSessionMe} type="button">
            Gọi session.me
          </button>
          <button className={buttonClassName} disabled={isRunning} onClick={runRegistry} type="button">
            Gọi registry
          </button>
          <button className={secondaryButtonClassName} disabled={isRunning || !sessionToken} onClick={runLogout} type="button">
            Logout
          </button>
        </div>

        <pre className="max-h-[480px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-200">
          {JSON.stringify(output, null, 2)}
        </pre>
      </section>
    </main>
  );
}

const buttonClassName =
  'rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClassName =
  'rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60';

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function createRequestId(scope: string): string {
  return `local-${scope}-${Date.now()}`;
}
