import type { InstallStatusResponse } from '@shared/contracts/platform/install';
import type { ApiClient } from '../../lib/api/client';

export type InstallStatusCheckResult =
  | { ok: true; data: InstallStatusResponse }
  | { ok: false; message: string };

const installStatusTimeoutMs = 15_000;
const installStatusTimeoutMessage = 'Không thể kiểm tra trạng thái cài đặt sau 15 giây.';

export async function checkInstallStatusWithTimeout(
  client: ApiClient,
  requestId: string,
): Promise<InstallStatusCheckResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<InstallStatusCheckResult>((resolve) => {
    timeoutId = setTimeout(() => resolve({ ok: false, message: installStatusTimeoutMessage }), installStatusTimeoutMs);
  });

  try {
    return await Promise.race([
      client
        .invoke<InstallStatusResponse>({
          operation: 'platform.install.getStatus',
          requestId,
          payload: {},
        })
        .then((result): InstallStatusCheckResult => {
          if (!result.ok) {
            return { ok: false, message: result.error.message };
          }

          return { ok: true, data: result.data };
        })
        .catch((): InstallStatusCheckResult => ({
          ok: false,
          message: 'Không thể kiểm tra trạng thái cài đặt.',
        })),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
