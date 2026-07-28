import { describe, expect, it } from 'vitest';
import { createPbkdf2PasswordService } from '../../../apps-script/src/services/platform/auth/password-service';

describe('Pbkdf2PasswordService', () => {
  it('creates salted PBKDF2 verifier and validates only matching password', () => {
    const service = createPbkdf2PasswordService({
      iterations: 12,
      keyLengthBytes: 32,
      randomSalt: () => 'salt-fixed',
      deriveKey: ({ password, salt, iterations, keyLengthBytes }) =>
        `derived-${password}-${salt}-${iterations}-${keyLengthBytes}`,
    });

    const verifier = service.createVerifier('admin123');

    expect(verifier).toBe(
      'pbkdf2-sha256:12:32:salt-fixed:derived-admin123-salt-fixed-12-32',
    );
    expect(service.verifyPassword({ password: 'admin123', verifier })).toBe(true);
    expect(service.verifyPassword({ password: 'wrong', verifier })).toBe(false);
    expect(service.verifyPassword({ password: 'admin123', verifier: 'malformed' })).toBe(false);
  });
});
