export interface PlatformCacheStore {
  get(key: string): string | undefined;
  put(key: string, value: string, expirationInSeconds: number): void;
  remove(key: string): void;
}

