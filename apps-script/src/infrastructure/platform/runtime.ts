export interface LockProvider {
  withLock<T>(operation: () => T): T;
}

export function createImmediateLockProvider(): LockProvider {
  return {
    withLock(operation) {
      return operation();
    },
  };
}
