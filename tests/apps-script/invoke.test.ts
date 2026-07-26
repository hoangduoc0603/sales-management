import { describe, expect, it } from 'vitest';
import { createInvokeHandler } from '../../apps-script/src/api/invoke';

const invoke = createInvokeHandler({
  now: () => new Date('2026-07-26T00:00:00.000Z'),
});

describe('createInvokeHandler', () => {
  it('trả INVALID_REQUEST thay vì throw khi envelope không hợp lệ', () => {
    expect(invoke({ operation: '', requestId: '', payload: {} })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_REQUEST' },
    });
  });

  it('trả OPERATION_NOT_SUPPORTED cho operation hợp lệ nhưng chưa đăng ký', () => {
    expect(invoke({ operation: 'platform.session.me', requestId: 'req-1', payload: {} })).toMatchObject({
      ok: false,
      error: { code: 'OPERATION_NOT_SUPPORTED' },
      meta: { requestId: 'req-1', operation: 'platform.session.me' },
    });
  });

  it('không lộ token hoặc exception detail trong API result', () => {
    const result = invoke({
      operation: 'platform.session.me',
      requestId: 'req-2',
      payload: {},
      sessionToken: 'secret-session-token',
    });

    expect(JSON.stringify(result)).not.toContain('secret-session-token');
    expect(JSON.stringify(result)).not.toContain('stack');
    expect(JSON.stringify(result)).not.toContain('cause');
  });
});
