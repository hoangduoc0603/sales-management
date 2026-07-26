import { describe, expect, it } from 'vitest';
import { operationNames } from '@shared/contracts/platform/operations';
import { parseApiRequest } from '@shared/schemas/api';
import { parseAuthLoginRequest } from '@shared/schemas/platform/auth';

describe('platform shared contracts', () => {
  it('chỉ chấp nhận operation nằm trong allowlist shared', () => {
    expect(operationNames).toContain('platform.auth.login');
    expect(() =>
      parseApiRequest({ operation: 'raw.sheet.query', requestId: 'req-1', payload: {} }),
    ).toThrow();
  });

  it('parse login request không nhận password rỗng', () => {
    expect(parseAuthLoginRequest({ loginId: 'admin', password: 'secret' })).toEqual({
      loginId: 'admin',
      password: 'secret',
    });
    expect(() => parseAuthLoginRequest({ loginId: 'admin', password: '' })).toThrow();
  });
});
