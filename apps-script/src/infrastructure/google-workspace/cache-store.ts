import type { PlatformCacheStore } from '../platform/cache';

export interface AppsScriptCacheStoreDependencies {
  cacheService: {
    getScriptCache(): {
      get(key: string): string | null;
      put(key: string, value: string, expirationInSeconds: number): unknown;
      remove(key: string): unknown;
    };
  };
}

export function createAppsScriptCacheStore(deps: AppsScriptCacheStoreDependencies): PlatformCacheStore {
  return {
    get(key) {
      return deps.cacheService.getScriptCache().get(key) ?? undefined;
    },
    put(key, value, expirationInSeconds) {
      deps.cacheService.getScriptCache().put(key, value, expirationInSeconds);
    },
    remove(key) {
      deps.cacheService.getScriptCache().remove(key);
    },
  };
}

