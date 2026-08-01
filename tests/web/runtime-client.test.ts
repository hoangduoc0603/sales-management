import { describe, expect, it } from 'vitest';
import { createRuntimeApiClient, detectRuntimeApiMode } from '../../web/src/lib/api/runtime-client';

describe('runtime api client', () => {
  it('fallback sang local fake backend khi không có google.script.run', async () => {
    expect(detectRuntimeApiMode({ hasGoogleScriptRun: () => false })).toBe('local-fake');

    const client = createRuntimeApiClient({ hasGoogleScriptRun: () => false });
    const result = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-local-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    expect(result).toMatchObject({ ok: true });
  });

  it('không fallback local fake khi đang chạy trong Apps Script HtmlService dù bridge chưa sẵn sàng tại mount', () => {
    expect(
      detectRuntimeApiMode({
        hasGoogleScriptRun: () => false,
        isAppsScriptRuntime: () => true,
      }),
    ).toBe('apps-script');
  });

  it('ưu tiên Apps Script client khi google.script.run tồn tại', async () => {
    const client = createRuntimeApiClient({
      hasGoogleScriptRun: () => true,
      appsScriptClient: {
        invoke: async (request) => ({
          ok: false,
          error: { code: 'TRANSPORT_ERROR', message: `apps-script:${request.requestId}` },
          meta: {
            requestId: request.requestId,
            operation: request.operation,
            serverTime: '2026-07-27T00:00:00.000Z',
            durationMs: 0,
            stages: {},
            io: {},
          },
        }),
      },
    });

    await expect(
      client.invoke({
        operation: 'platform.session.me',
        requestId: 'req-apps-script',
        payload: {},
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { message: 'apps-script:req-apps-script' },
    });
  });
});
