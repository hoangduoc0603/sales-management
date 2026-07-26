import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

const composition = createApiComposition({
  now: () => new Date('2026-07-26T00:00:00.000Z'),
});

describe('platform API pipeline', () => {
  it('cho phép gọi login public không cần session', () => {
    const result = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    expect(result).toMatchObject({ ok: true });
    expect(JSON.stringify(result)).not.toContain('admin123');
  });

  it('chặn protected operation khi thiếu session', () => {
    const result = composition.invoke({
      operation: 'platform.session.me',
      requestId: 'req-me',
      payload: {},
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'SESSION_REQUIRED' },
      meta: { requestId: 'req-me', operation: 'platform.session.me' },
    });
  });
});
