import { describe, expect, it } from 'vitest';
import { createPropertiesTenantSecretStore } from '../../../apps-script/src/infrastructure/google-workspace/tenant-secret-store';

describe('PropertiesTenantSecretStore', () => {
  it('caches credential and session peppers within one Apps Script invocation', () => {
    const properties = new FakeProperties([
      ['salesManagement.security.credentialPepper', 'credential-pepper'],
      ['salesManagement.security.sessionPepper', 'session-pepper'],
    ]);
    const store = createPropertiesTenantSecretStore({ properties });

    expect(store.getOrCreateCredentialPepper()).toBe('credential-pepper');
    expect(store.getOrCreateCredentialPepper()).toBe('credential-pepper');
    expect(store.getOrCreateSessionPepper()).toBe('session-pepper');
    expect(store.getOrCreateSessionPepper()).toBe('session-pepper');

    expect(properties.getCalls).toEqual([
      'salesManagement.security.credentialPepper',
      'salesManagement.security.sessionPepper',
    ]);
  });
});

class FakeProperties {
  readonly getCalls: string[] = [];
  private readonly values: Map<string, string>;

  constructor(seed: readonly (readonly [string, string])[] = []) {
    this.values = new Map(seed);
  }

  getProperty(key: string): string | null {
    this.getCalls.push(key);
    return this.values.get(key) ?? null;
  }

  setProperty(key: string, value: string): FakeProperties {
    this.values.set(key, value);
    return this;
  }
}
