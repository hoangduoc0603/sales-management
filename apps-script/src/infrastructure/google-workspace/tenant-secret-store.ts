const credentialPepperKey = 'salesManagement.security.credentialPepper';
const sessionPepperKey = 'salesManagement.security.sessionPepper';

export interface TenantSecretStore {
  getOrCreateCredentialPepper(): string;
  getOrCreateSessionPepper(): string;
}

export interface TenantSecretStoreDependencies {
  properties: {
    getProperty(key: string): string | null;
    setProperty(key: string, value: string): unknown;
  };
  randomSecret?(): string;
}

export function createPropertiesTenantSecretStore(
  deps: TenantSecretStoreDependencies,
): TenantSecretStore {
  const randomSecret = deps.randomSecret ?? defaultRandomSecret;
  const secretCache = new Map<string, string>();

  return {
    getOrCreateCredentialPepper() {
      return getOrCreateSecret(deps.properties, credentialPepperKey, randomSecret, secretCache);
    },
    getOrCreateSessionPepper() {
      return getOrCreateSecret(deps.properties, sessionPepperKey, randomSecret, secretCache);
    },
  };
}

function getOrCreateSecret(
  properties: TenantSecretStoreDependencies['properties'],
  key: string,
  randomSecret: () => string,
  cache: Map<string, string>,
): string {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const current = properties.getProperty(key);
  if (current !== null && current.trim() !== '') {
    cache.set(key, current);
    return current;
  }

  const created = randomSecret();
  properties.setProperty(key, created);
  cache.set(key, created);
  return created;
}

function defaultRandomSecret(): string {
  return `${Utilities.getUuid()}${Utilities.getUuid()}`.replace(/-/g, '');
}
