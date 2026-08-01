import type { BrowserStorageAdapter } from '../auth/session-storage';

export const INSTALL_READINESS_STORAGE_KEY = 'cenio-sales.installation-readiness.v1';

interface InstallReadinessMarker {
  version: 1;
  status: 'Installed';
}

export interface InstallReadinessStorage {
  readInstalled(): boolean;
  markInstalled(): void;
  clearInstalled(): void;
}

export function createInstallReadinessStorage(
  adapter: BrowserStorageAdapter | undefined = getBrowserLocalStorage(),
): InstallReadinessStorage {
  return {
    readInstalled() {
      const rawValue = adapter?.getItem(INSTALL_READINESS_STORAGE_KEY);
      if (!rawValue) return false;

      try {
        const marker = JSON.parse(rawValue) as Partial<InstallReadinessMarker>;
        return marker.version === 1 && marker.status === 'Installed';
      } catch {
        return false;
      }
    },
    markInstalled() {
      const marker: InstallReadinessMarker = { version: 1, status: 'Installed' };
      adapter?.setItem(INSTALL_READINESS_STORAGE_KEY, JSON.stringify(marker));
    },
    clearInstalled() {
      adapter?.removeItem(INSTALL_READINESS_STORAGE_KEY);
    },
  };
}

function getBrowserLocalStorage(): BrowserStorageAdapter | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage;
}
