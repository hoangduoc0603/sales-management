import { describe, expect, it } from 'vitest';
import type { ApiRequest, ApiResult } from '@shared/contracts/api';
import { createGoogleScriptRunInvoker } from '../../web/src/lib/api/google-script-run';

describe('google.script.run invoker', () => {
  it('chờ Apps Script bridge xuất hiện ngắn hạn trước khi trả transport error', async () => {
    const calls: ApiRequest[] = [];
    const fakeRun = {
      withSuccessHandler<T>(handler: (result: ApiResult<T>) => void) {
        this.successHandler = handler as (result: ApiResult<unknown>) => void;
        return this;
      },
      withFailureHandler() {
        return this;
      },
      invoke(request: ApiRequest) {
        calls.push(request);
        this.successHandler({
          ok: true,
          data: { source: 'apps-script' },
          meta: {
            requestId: request.requestId,
            operation: request.operation,
            serverTime: '2026-08-01T00:00:00.000Z',
            durationMs: 12,
            stages: {},
            io: {},
          },
        });
      },
      successHandler: () => undefined,
    };
    let attempts = 0;
    const invoker = createGoogleScriptRunInvoker({
      getRun: () => {
        attempts += 1;
        return attempts >= 2 ? fakeRun : undefined;
      },
      sleep: async () => undefined,
      bridgeTimeoutMs: 100,
      pollIntervalMs: 10,
      now: () => attempts * 10,
    });

    await expect(
      invoker.invoke({
        operation: 'platform.session.me',
        requestId: 'req-wait-bridge',
        payload: {},
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { source: 'apps-script' },
    });
    expect(calls).toHaveLength(1);
  });
});
