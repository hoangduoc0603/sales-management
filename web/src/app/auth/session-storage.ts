export interface BrowserStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SessionStoragePort {
  read(): string | undefined;
  write(sessionToken: string): void;
  clear(): void;
}

const sessionTokenKey = 'sales-management.sessionToken.v1';

export function createSessionStorage(adapter?: BrowserStorageAdapter): SessionStoragePort {
  const storage = adapter ?? getBrowserSessionStorage();

  return {
    read() {
      const value = storage?.getItem(sessionTokenKey)?.trim();
      return value && value.length > 0 ? value : undefined;
    },
    write(sessionToken) {
      storage?.setItem(sessionTokenKey, sessionToken);
    },
    clear() {
      storage?.removeItem(sessionTokenKey);
    },
  };
}

function getBrowserSessionStorage(): BrowserStorageAdapter | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.sessionStorage;
}
