import { describe, expect, it, vi } from 'vitest';
import type { ApiMeta } from '@shared/contracts/api';
import {
  createApiClient,
  shouldLogApiResponsesForUrl,
  sanitizeApiResponseForDebug,
} from '../../web/src/lib/api/client';

const meta: ApiMeta = {
  requestId: 'req-1',
  operation: 'platform.session.me',
  serverTime: '2026-07-26T00:00:00.000Z',
  durationMs: 0,
  stages: {},
  io: {},
};

describe('createApiClient', () => {
  it('chỉ gửi request qua invoker invoke', async () => {
    const calls: unknown[] = [];
    const client = createApiClient({
      invoke: async (request) => {
        calls.push(request);
        return {
          ok: false,
          error: {
            code: 'OPERATION_NOT_SUPPORTED',
            message: 'Thao tác chưa được hỗ trợ.',
          },
          meta,
        };
      },
    });

    await expect(
      client.invoke({
        operation: 'platform.session.me',
        requestId: 'req-1',
        payload: {},
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'OPERATION_NOT_SUPPORTED' } });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ operation: 'platform.session.me', requestId: 'req-1' });
  });

  it('log response đã sanitize khi bật debug API', async () => {
    const log = vi.fn();
    const client = createApiClient(
      {
        invoke: async () => ({
          ok: true,
          data: {
            sessionToken: 'raw-session-token',
            nested: { token: 'nested-token', value: 1 },
          },
          meta,
        }),
      },
      {
        debug: {
          enabled: () => true,
          log,
          now: () => 1000,
        },
      },
    );

    await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'secret' },
    });

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toBe('[api] platform.auth.login req-login');
    expect(JSON.stringify(log.mock.calls[0])).toContain('"clientDurationMs":0');
    expect(JSON.stringify(log.mock.calls[0])).toContain('<redacted>');
    expect(JSON.stringify(log.mock.calls[0])).not.toContain('raw-session-token');
    expect(JSON.stringify(log.mock.calls[0])).not.toContain('secret');
  });

  it('default debug logger dùng console.log để hiện ở Chrome Default levels', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const client = createApiClient(
      {
        invoke: async () => ({
          ok: true,
          data: { ok: true },
          meta,
        }),
      },
      {
        debug: {
          enabled: () => true,
          now: () => 1000,
        },
      },
    );

    await client.invoke({
      operation: 'platform.session.me',
      requestId: 'req-log-visible',
      payload: {},
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('bật log ở Vite dev, Apps Script /dev hoặc query debugApi=1', () => {
    expect(shouldLogApiResponsesForUrl('http://localhost:5173/', true)).toBe(true);
    expect(shouldLogApiResponsesForUrl('https://script.google.com/macros/s/AKfy/dev', false)).toBe(true);
    expect(
      shouldLogApiResponsesForUrl(
        'https://n-abcd-script.googleusercontent.com/userCodeAppPanel',
        false,
        'https://script.google.com/macros/s/AKfy/dev',
      ),
    ).toBe(true);
    expect(shouldLogApiResponsesForUrl('https://script.google.com/macros/s/AKfy/exec?debugApi=1', false)).toBe(true);
    expect(shouldLogApiResponsesForUrl('https://script.google.com/macros/s/AKfy/dev?debugApi=0', true)).toBe(false);
    expect(
      shouldLogApiResponsesForUrl(
        'https://n-abcd-script.googleusercontent.com/userCodeAppPanel',
        true,
        'https://script.google.com/macros/s/AKfy/dev?debugApi=0',
      ),
    ).toBe(false);
    expect(shouldLogApiResponsesForUrl('https://script.google.com/macros/s/AKfy/exec', false)).toBe(false);
  });

  it('bật log khi Apps Script inject boot config debugApi vào iframe', () => {
    expect(
      shouldLogApiResponsesForUrl(
        'https://n-abcd-script.googleusercontent.com/userCodeAppPanel',
        false,
        undefined,
        true,
      ),
    ).toBe(true);
    expect(
      shouldLogApiResponsesForUrl(
        'https://n-abcd-script.googleusercontent.com/userCodeAppPanel',
        true,
        'https://script.google.com/macros/s/AKfy/dev',
        false,
      ),
    ).toBe(false);
  });

  it('sanitize response debug không để lộ các khóa secret phổ biến', () => {
    expect(
      sanitizeApiResponseForDebug({
        ok: true,
        data: {
          sessionToken: 'session',
          password: 'password',
          refresh_token: 'refresh',
          safe: 'visible',
        },
        meta,
      }),
    ).toMatchObject({
      ok: true,
      data: {
        sessionToken: '<redacted>',
        password: '<redacted>',
        refresh_token: '<redacted>',
        safe: 'visible',
      },
    });
  });
});
