import { describe, expect, it } from 'vitest';
import { parseApiRequest } from '@shared/schemas/api';

describe('parseApiRequest', () => {
  it('chấp nhận query envelope tối thiểu', () => {
    expect(parseApiRequest({ operation: 'platform.session.me', requestId: 'req-1', payload: {} })).toMatchObject({
      operation: 'platform.session.me',
      requestId: 'req-1',
      payload: {},
    });
  });

  it('từ chối command thiếu idempotency key', () => {
    expect(() =>
      parseApiRequest({
        operation: 'sales.complete',
        requestId: 'req-2',
        payload: {},
        command: { commandId: 'cmd-1' },
      }),
    ).toThrow();
  });
});
