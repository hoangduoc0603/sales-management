import { describe, expect, it } from 'vitest';
import { createHmacSha256PasswordService } from '../../../apps-script/src/services/platform/auth/password-service';

describe('HmacSha256PasswordService', () => {
  it('creates salted HMAC verifier and validates only matching password', () => {
    const service = createHmacSha256PasswordService({
      randomSalt: () => 'salt-fixed',
      getPepper: () => 'tenant-pepper-fixed',
      hmacSha256: ({ password, salt, pepper }) => `hmac-${password}-${salt}-${pepper}`,
    });

    const verifier = service.createVerifier('admin123');

    expect(verifier).toBe('hmac-sha256-v1:salt-fixed:hmac-admin123-salt-fixed-tenant-pepper-fixed');
    expect(service.verifyPassword({ password: 'admin123', verifier })).toBe(true);
    expect(service.verifyPassword({ password: 'wrong', verifier })).toBe(false);
    expect(service.verifyPassword({ password: 'admin123', verifier: 'malformed' })).toBe(false);
    expect(
      service.verifyPassword({
        password: 'admin123',
        verifier: 'pbkdf2-sha256:120000:32:salt:legacy-derived',
      }),
    ).toBe(false);
  });
});
