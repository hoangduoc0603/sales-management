import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../web/src/lib/api/client';

type InstallStatusCheckModule = typeof import('../../web/src/app/install/install-status-check');

async function loadInstallStatusCheckModule(): Promise<InstallStatusCheckModule> {
  const module = await import('../../web/src/app/install/install-status-check').catch(
    () => undefined,
  );
  expect(module).toBeDefined();
  return module as InstallStatusCheckModule;
}

describe('checkInstallStatusWithTimeout', () => {
  it('trả check failure sau 15 giây khi RPC không phản hồi', async () => {
    vi.useFakeTimers();
    const { checkInstallStatusWithTimeout } = await loadInstallStatusCheckModule();
    const client: ApiClient = {
      invoke: () => new Promise(() => undefined),
    };

    const pending = checkInstallStatusWithTimeout(client, 'request-timeout');
    await vi.advanceTimersByTimeAsync(15_000);

    await expect(pending).resolves.toEqual({
      ok: false,
      message: 'Không thể kiểm tra trạng thái cài đặt sau 15 giây.',
    });
    vi.useRealTimers();
  });
});
