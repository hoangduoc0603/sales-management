import { describe, expect, it } from 'vitest';
import { createPropertiesCredentialVerifierStore } from '../../../apps-script/src/infrastructure/google-workspace/credential-verifier-store';

describe('PropertiesCredentialVerifierStore', () => {
  it('stores credential verifiers under per-user Script Properties keys', () => {
    const properties = new FakeProperties();
    const store = createPropertiesCredentialVerifierStore({ properties });

    store.saveVerifier('user-admin', 'pbkdf2:verifier');

    expect(store.getVerifier('user-admin')).toBe('pbkdf2:verifier');
    expect(properties.keys()).toEqual(['salesManagement.credentialVerifier.user-admin']);
  });
});

class FakeProperties {
  private readonly values = new Map<string, string>();

  getProperty(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setProperty(key: string, value: string): FakeProperties {
    this.values.set(key, value);
    return this;
  }

  keys(): string[] {
    return [...this.values.keys()];
  }
}
