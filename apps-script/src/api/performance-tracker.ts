interface PerformanceSnapshot {
  stages: Record<string, number>;
  io: Record<string, number>;
}

let activeSnapshot: PerformanceSnapshot | undefined;

export function withPerformanceTracker<T>(operation: () => T): T {
  const previous = activeSnapshot;
  activeSnapshot = { stages: {}, io: {} };
  try {
    return operation();
  } finally {
    if (previous !== undefined && activeSnapshot !== undefined) {
      for (const [key, value] of Object.entries(activeSnapshot.stages)) {
        previous.stages[key] = (previous.stages[key] ?? 0) + value;
      }
      for (const [key, value] of Object.entries(activeSnapshot.io)) {
        previous.io[key] = (previous.io[key] ?? 0) + value;
      }
    }
    activeSnapshot = previous;
  }
}

export function recordStage(name: string, durationMs: number): void {
  if (activeSnapshot === undefined) return;
  activeSnapshot.stages[name] = (activeSnapshot.stages[name] ?? 0) + Math.max(0, Math.round(durationMs));
}

export function recordIo(name: string, count = 1): void {
  if (activeSnapshot === undefined) return;
  activeSnapshot.io[name] = (activeSnapshot.io[name] ?? 0) + count;
}

export function readPerformanceSnapshot(): PerformanceSnapshot {
  return {
    stages: { ...(activeSnapshot?.stages ?? {}) },
    io: { ...(activeSnapshot?.io ?? {}) },
  };
}
