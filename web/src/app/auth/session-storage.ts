export interface BrowserStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SessionStoragePort {
  read(): string | undefined;
  write(sessionToken: string, options?: { rememberSession?: boolean }): void;
  clear(): void;
}

export interface BrowserSessionStorageAdapters {
  session: BrowserStorageAdapter;
  persistent?: BrowserStorageAdapter;
}

const sessionTokenKey = 'sales-management.sessionToken.v1';
const rememberedSessionTokenKey = 'sales-management.rememberedSessionToken.v1';

export function createSessionStorage(
  adapter?: BrowserStorageAdapter | BrowserSessionStorageAdapters,
): SessionStoragePort {
  const storage = toStorageAdapters(adapter);

  return {
    read() {
      return readToken(storage.session, sessionTokenKey) ?? readToken(storage.persistent, rememberedSessionTokenKey);
    },
    write(sessionToken, options) {
      if (options?.rememberSession) {
        storage.session?.removeItem(sessionTokenKey);
        storage.persistent?.setItem(rememberedSessionTokenKey, sessionToken);
        return;
      }

      storage.persistent?.removeItem(rememberedSessionTokenKey);
      storage.session?.setItem(sessionTokenKey, sessionToken);
    },
    clear() {
      storage.session?.removeItem(sessionTokenKey);
      storage.persistent?.removeItem(rememberedSessionTokenKey);
    },
  };
}

function toStorageAdapters(
  adapter?: BrowserStorageAdapter | BrowserSessionStorageAdapters,
): { session?: BrowserStorageAdapter; persistent?: BrowserStorageAdapter } {
  if (adapter !== undefined && 'session' in adapter) {
    return adapter;
  }

  return {
    session: adapter ?? getBrowserSessionStorage(),
    persistent: getBrowserPersistentStorage(),
  };
}

function readToken(storage: BrowserStorageAdapter | undefined, key: string): string | undefined {
  const value = storage?.getItem(key)?.trim();
  return value && value.length > 0 ? value : undefined;
}

function getBrowserSessionStorage(): BrowserStorageAdapter | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.sessionStorage;
}

function getBrowserPersistentStorage(): BrowserStorageAdapter | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage;
}
