import { describe, expect, it } from 'vitest';
import { createInMemoryOperationsRepository } from '../../../apps-script/src/repositories/operations/operations-repository';
import { runScheduledWorkerTick } from '../../../apps-script/src/services/platform/worker/scheduled-worker-runtime';

describe('Scheduled worker runtime', () => {
  it('runs enabled job handlers through BackgroundRunner lease/checkpoint/retry contract', () => {
    const repository = createInMemoryOperationsRepository();
    const executed: string[] = [];
    const result = runScheduledWorkerTick({
      repository,
      now: () => new Date('2026-07-27T09:00:00.000Z'),
      leaseMs: 60_000,
      maxAttempts: 2,
      jobs: [
        {
          runId: 'worker-audit-delivery',
          jobType: 'AuditDelivery',
          execute(checkpoint) {
            checkpoint('audit:10');
            executed.push('audit');
          },
        },
        {
          runId: 'worker-backup-daily',
          jobType: 'Backup',
          execute(checkpoint) {
            checkpoint('backup:done');
            executed.push('backup');
          },
        },
      ],
    });

    expect(executed).toEqual(['audit', 'backup']);
    expect(result.runs).toEqual([
      expect.objectContaining({ runId: 'worker-audit-delivery', status: 'Completed', checkpointKey: 'audit:10' }),
      expect.objectContaining({ runId: 'worker-backup-daily', status: 'Completed', checkpointKey: 'backup:done' }),
    ]);
  });

  it('does not execute a job while its previous lease is still active', () => {
    const repository = createInMemoryOperationsRepository();
    repository.saveBackgroundRun({
      runId: 'worker-archive',
      jobType: 'Archive',
      status: 'Running',
      attempt: 1,
      leaseUntil: '2026-07-27T09:05:00.000Z',
      startedAt: '2026-07-27T09:00:00.000Z',
    });
    let executed = false;

    const result = runScheduledWorkerTick({
      repository,
      now: () => new Date('2026-07-27T09:01:00.000Z'),
      jobs: [
        {
          runId: 'worker-archive',
          jobType: 'Archive',
          execute() {
            executed = true;
          },
        },
      ],
    });

    expect(executed).toBe(false);
    expect(result.runs).toEqual([expect.objectContaining({ runId: 'worker-archive', status: 'Running' })]);
  });
});
