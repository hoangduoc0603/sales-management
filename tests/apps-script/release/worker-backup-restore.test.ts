import { describe, expect, it } from 'vitest';
import { createInMemoryOperationsRepository } from '../../../apps-script/src/repositories/operations/operations-repository';
import { createBackgroundRunner } from '../../../apps-script/src/services/platform/worker/background-runner';
import {
  runBackupChunk,
  runRestoreVerification,
  switchRestore,
} from '../../../apps-script/src/services/operations/backup-restore-worker';
import {
  ensureArchiveReadOnlyRouting,
  selectPartitionsForDateRange,
} from '../../../apps-script/src/services/operations/archive-worker';

describe('release worker, backup, restore and archive baseline', () => {
  it('claims background run with lease, stores checkpoint and respects retry budget', () => {
    const repository = createInMemoryOperationsRepository();
    let now = new Date('2026-07-27T00:00:00.000Z');
    const runner = createBackgroundRunner({
      repository,
      now: () => now,
    });

    const failed = runner.runBackgroundJob({
      runId: 'run-backup-1',
      jobType: 'Backup',
      leaseMs: 60_000,
      maxAttempts: 2,
      execute(checkpoint) {
        checkpoint('partition:FY2026-P01');
        throw new Error('Raw Google stack must not be persisted');
      },
    });
    expect(failed).toMatchObject({
      completed: false,
      run: {
        status: 'RetryScheduled',
        attempt: 1,
        checkpointKey: 'partition:FY2026-P01',
        errorCode: 'Error',
      },
    });
    expect(JSON.stringify(failed)).not.toContain('Raw Google stack');

    const locked = runner.runBackgroundJob({
      runId: 'run-backup-1',
      jobType: 'Backup',
      leaseMs: 60_000,
      maxAttempts: 2,
      execute() {
        throw new Error('should not run while retry is waiting');
      },
    });
    expect(locked.run.status).toBe('RetryScheduled');

    now = new Date('2026-07-27T00:02:00.000Z');
    const completed = runner.runBackgroundJob({
      runId: 'run-backup-1',
      jobType: 'Backup',
      leaseMs: 60_000,
      maxAttempts: 2,
      execute(checkpoint) {
        checkpoint('done');
      },
    });
    expect(completed).toMatchObject({
      completed: true,
      run: { status: 'Completed', attempt: 2, checkpointKey: 'done' },
    });
  });

  it('creates backup manifests with row counts/checksum and retains only 30 newest daily backups', () => {
    const repository = createRepositoryWithPartitions();
    const deps = workerDeps(repository);

    const manual = runBackupChunk(deps, {
      backupType: 'Manual',
      requestedBy: 'user-admin',
    });
    expect(manual).toMatchObject({
      status: 'Completed',
      backupType: 'Manual',
      manifest: {
        partitions: [
          { storageRole: 'transaction', partitionKey: 'FY2026-P01', status: 'Closed', rowCount: 50_000 },
          { storageRole: 'transaction', partitionKey: 'FY2026-P02', status: 'Active', rowCount: 42 },
        ],
      },
    });
    expect(manual.manifest.checksum).toMatch(/^checksum-/);

    for (let index = 0; index < 31; index += 1) {
      runBackupChunk(
        {
          ...deps,
          now: () => new Date(`2026-07-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
        },
        {
          backupType: 'Daily',
          requestedBy: 'system-worker',
        },
      );
    }

    const backups = repository.listBackups();
    expect(backups.filter((backup) => backup.backupType === 'Manual')).toHaveLength(1);
    expect(backups.filter((backup) => backup.backupType === 'Daily')).toHaveLength(30);
    expect(backups.some((backup) => backup.requestedAt === '2026-07-01T00:00:00.000Z')).toBe(false);
  });

  it('prepares replacement-resource restore, switches with health ok and records session revoke marker', () => {
    const repository = createRepositoryWithPartitions();
    const deps = workerDeps(repository);
    const backup = runBackupChunk(deps, {
      backupType: 'Manual',
      requestedBy: 'user-admin',
    });

    const prepared = runRestoreVerification(deps, {
      backupRunId: backup.backupRunId,
      requestedBy: 'user-admin',
    });
    expect(prepared).toMatchObject({
      status: 'Prepared',
      writeFrozen: true,
      oldConfigVersion: 'runtime-config-current',
      newConfigVersion: expect.stringContaining('runtime-config-replacement'),
      healthResult: 'Ok',
    });

    const switched = switchRestore(deps, {
      restoreRunId: prepared.restoreRunId,
      healthResult: 'Ok',
    });
    expect(switched).toMatchObject({
      status: 'Switched',
      writeFrozen: false,
      healthResult: 'Ok',
      newConfigVersion: prepared.newConfigVersion,
    });
  });

  it('archives closed partitions as read-only and selects historical partitions by date range', () => {
    const repository = createRepositoryWithPartitions();

    const archived = ensureArchiveReadOnlyRouting(
      {
        repository,
        now: () => new Date('2026-07-27T00:00:00.000Z'),
      },
      {
        storageRole: 'transaction',
        partitionKey: 'FY2026-P01',
      },
    );
    expect(archived).toMatchObject({
      partitionKey: 'FY2026-P01',
      status: 'Archived',
      readOnly: true,
      archivedAt: '2026-07-27T00:00:00.000Z',
    });

    const selected = selectPartitionsForDateRange(repository.listPartitions(), {
      storageRole: 'transaction',
      from: '2026-01-15',
      to: '2026-07-27',
    });
    expect(selected.map((partition) => partition.partitionKey)).toEqual(['FY2026-P01', 'FY2026-P02']);
    expect(selected[0]).toMatchObject({ status: 'Archived', readOnly: true });
  });
});

function createRepositoryWithPartitions() {
  const repository = createInMemoryOperationsRepository();
  repository.savePartition({
    partitionId: 'partition-transaction-1',
    storageRole: 'transaction',
    partitionKey: 'FY2026-P01',
    status: 'Closed',
    activeFrom: '2026-01-01',
    closedAt: '2026-06-30',
    capacityPct: 91,
    readOnly: true,
    rowCount: 50_000,
  });
  repository.savePartition({
    partitionId: 'partition-transaction-2',
    storageRole: 'transaction',
    partitionKey: 'FY2026-P02',
    status: 'Active',
    activeFrom: '2026-07-01',
    capacityPct: 12,
    readOnly: false,
    rowCount: 42,
  });

  return repository;
}

function workerDeps(repository: ReturnType<typeof createInMemoryOperationsRepository>) {
  let sequence = 0;
  return {
    repository,
    tenantId: 'tenant-default',
    appVersion: '0.1.0',
    schemaVersion: 1,
    now: () => new Date('2026-07-27T00:00:00.000Z'),
    newId(prefix: string) {
      sequence += 1;
      return `${prefix}-${sequence}`;
    },
  };
}
