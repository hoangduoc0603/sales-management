export interface LockTimingObserver {
  onAcquired(waitMs: number): void;
  onReleased(holdMs: number): void;
}

export interface LockProvider {
  withLock<T>(operation: () => T, timing?: LockTimingObserver): T;
}

export function createImmediateLockProvider(): LockProvider {
  return {
    withLock(operation, timing) {
      timing?.onAcquired(0);
      try {
        return operation();
      } finally {
        timing?.onReleased(0);
      }
    },
  };
}
