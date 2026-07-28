import type {
  BackgroundJobType,
  BackgroundRunDTO,
} from '@shared/contracts/operations/operations';
import type { OperationsRepository } from '../../../repositories/operations/operations-repository';
import { createBackgroundRunner } from './background-runner';

export interface ScheduledWorkerJob {
  runId: string;
  jobType: BackgroundJobType;
  execute(checkpoint: (checkpointKey: string) => void): void;
}

export interface ScheduledWorkerTickDependencies {
  repository: Pick<OperationsRepository, 'getBackgroundRun' | 'saveBackgroundRun'>;
  now: () => Date;
  jobs: readonly ScheduledWorkerJob[];
  leaseMs?: number;
  maxAttempts?: number;
}

export interface ScheduledWorkerTickResult {
  runs: readonly BackgroundRunDTO[];
}

export function runScheduledWorkerTick(deps: ScheduledWorkerTickDependencies): ScheduledWorkerTickResult {
  const runner = createBackgroundRunner({
    repository: deps.repository,
    now: deps.now,
  });
  const runs = deps.jobs.map((job) =>
    runner.runBackgroundJob({
      runId: job.runId,
      jobType: job.jobType,
      leaseMs: deps.leaseMs ?? 5 * 60 * 1000,
      maxAttempts: deps.maxAttempts ?? 3,
      execute: job.execute,
    }).run,
  );

  return { runs };
}
