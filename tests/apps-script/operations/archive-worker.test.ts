import { describe, expect, it } from 'vitest';
import { createInMemoryOperationsRepository } from '../../../apps-script/src/repositories/operations/operations-repository';
import { runArchiveChunk } from '../../../apps-script/src/services/operations/archive-worker';

describe('archive worker', () => {
  it('archives closed transaction partitions by chunk and is idempotent when retried', () => {
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

    const first = runArchiveChunk({
      repository,
      now: () => new Date('2026-07-27T09:00:00.000Z'),
      storageRole: 'transaction',
      maxPartitions: 1,
    });

    expect(first).toEqual({
      archivedCount: 1,
      checkpointKey: 'archive:transaction:FY2026-P01',
    });
    expect(repository.listPartitions()).toEqual([
      expect.objectContaining({
        partitionKey: 'FY2026-P01',
        status: 'Archived',
        readOnly: true,
        archivedAt: '2026-07-27T09:00:00.000Z',
      }),
      expect.objectContaining({
        partitionKey: 'FY2026-P02',
        status: 'Active',
        readOnly: false,
      }),
    ]);

    const retry = runArchiveChunk({
      repository,
      now: () => new Date('2026-07-27T09:05:00.000Z'),
      storageRole: 'transaction',
      maxPartitions: 1,
    });

    expect(retry).toEqual({
      archivedCount: 0,
      checkpointKey: undefined,
    });
    expect(repository.listPartitions()[0]).toEqual(
      expect.objectContaining({ partitionKey: 'FY2026-P01', archivedAt: '2026-07-27T09:00:00.000Z' }),
    );
  });
});
