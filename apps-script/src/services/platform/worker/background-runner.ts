import type {
  BackgroundJobType,
  BackgroundRunDTO,
} from '@shared/contracts/operations/operations';
import type { OperationsRepository } from '../../../repositories/operations/operations-repository';

export interface BackgroundRunResult {
  run: BackgroundRunDTO;
  completed: boolean;
}

export interface BackgroundRunnerDependencies {
  repository: Pick<OperationsRepository, 'getBackgroundRun' | 'saveBackgroundRun'>;
  now: () => Date;
}

export interface BackgroundJobInput {
  runId: string;
  jobType: BackgroundJobType;
  leaseMs: number;
  maxAttempts: number;
  execute: (checkpoint: (checkpointKey: string) => void) => void;
}

export function createBackgroundRunner(deps: BackgroundRunnerDependencies) {
  return {
    runBackgroundJob(input: BackgroundJobInput): BackgroundRunResult {
      const existing = deps.repository.getBackgroundRun(input.runId);
      const now = deps.now();

      if (existing?.status === 'Completed') {
        return { run: existing, completed: true };
      }

      if (
        (existing?.status === 'Running' || existing?.status === 'RetryScheduled') &&
        new Date(existing.leaseUntil).getTime() > now.getTime()
      ) {
        return { run: existing, completed: false };
      }

      const started: BackgroundRunDTO = {
        runId: input.runId,
        jobType: input.jobType,
        status: 'Running',
        attempt: (existing?.attempt ?? 0) + 1,
        leaseUntil: new Date(now.getTime() + input.leaseMs).toISOString(),
        checkpointKey: existing?.checkpointKey,
        startedAt: existing?.startedAt ?? now.toISOString(),
      };
      deps.repository.saveBackgroundRun(started);

      let checkpointKey = started.checkpointKey;
      try {
        input.execute((nextCheckpointKey) => {
          checkpointKey = nextCheckpointKey;
          deps.repository.saveBackgroundRun({
            ...started,
            checkpointKey,
          });
        });
      } catch (error) {
        const failed: BackgroundRunDTO = {
          ...started,
          status: started.attempt >= input.maxAttempts ? 'Failed' : 'RetryScheduled',
          checkpointKey,
          endedAt: deps.now().toISOString(),
          errorCode: sanitizeErrorCode(error),
        };
        deps.repository.saveBackgroundRun(failed);
        return { run: failed, completed: false };
      }

      const completed: BackgroundRunDTO = {
        ...started,
        status: 'Completed',
        checkpointKey,
        endedAt: deps.now().toISOString(),
      };
      deps.repository.saveBackgroundRun(completed);

      return { run: completed, completed: true };
    },
  };
}

function sanitizeErrorCode(error: unknown): string {
  if (error instanceof Error && error.name.trim().length > 0) {
    return error.name;
  }

  return 'WORKER_ERROR';
}
