import type { CredentialVerifierStore } from '../../repositories/platform/auth-repository';

const credentialVerifierKeyPrefix = 'salesManagement.credentialVerifier.';

export interface PropertiesCredentialVerifierStoreDependencies {
  properties: {
    getProperty(key: string): string | null;
    setProperty(key: string, value: string): unknown;
  };
}

export function createPropertiesCredentialVerifierStore(
  deps: PropertiesCredentialVerifierStoreDependencies,
): CredentialVerifierStore {
  return {
    getVerifier(userId) {
      return deps.properties.getProperty(toCredentialVerifierKey(userId)) ?? undefined;
    },
    saveVerifier(userId, verifier) {
      deps.properties.setProperty(toCredentialVerifierKey(userId), verifier);
    },
  };
}

export function toCredentialVerifierKey(userId: string): string {
  return `${credentialVerifierKeyPrefix}${userId}`;
}
