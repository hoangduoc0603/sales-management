import { describe, expect, it } from 'vitest';
import type { ApiMeta } from '@shared/contracts/api';
import { createApiClient } from '../../web/src/lib/api/client';

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
});
