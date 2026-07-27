import type { LockProvider } from '../platform/runtime';

export interface AppsScriptLockProviderDependencies {
  lockService: {
    getDocumentLock(): AppsScriptLockLike;
  };
  spreadsheetApp?: {
    flush(): void;
  };
  waitTimeoutMs?: number;
}

interface AppsScriptLockLike {
  waitLock(timeoutMs: number): void;
  releaseLock(): void;
}

export function createAppsScriptLockProvider(
  deps: AppsScriptLockProviderDependencies,
): LockProvider {
  const waitTimeoutMs = deps.waitTimeoutMs ?? 10_000;

  return {
    withLock(operation) {
      const lock = deps.lockService.getDocumentLock();
      lock.waitLock(waitTimeoutMs);
      try {
        const result = operation();
        deps.spreadsheetApp?.flush();
        return result;
      } finally {
        lock.releaseLock();
      }
    },
  };
}
