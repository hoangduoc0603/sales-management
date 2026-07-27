import type { StorageRole } from '@shared/contracts/operations/operations';
import type {
  OperationsPartitionRecord,
  OperationsRepository,
} from '../../repositories/operations/operations-repository';

export interface ArchiveWorkerDependencies {
  repository: Pick<OperationsRepository, 'listPartitions' | 'savePartition'>;
  now: () => Date;
}

export function ensureArchiveReadOnlyRouting(
  deps: ArchiveWorkerDependencies,
  input: {
    storageRole: StorageRole;
    partitionKey: string;
  },
): OperationsPartitionRecord {
  const partition = deps.repository
    .listPartitions()
    .find(
      (candidate) =>
        candidate.storageRole === input.storageRole &&
        candidate.partitionKey === input.partitionKey,
    );
  if (partition === undefined) {
    throw new Error('PartitionNotFound');
  }

  const archived: OperationsPartitionRecord = {
    ...partition,
    status: 'Archived',
    readOnly: true,
    archivedAt: partition.archivedAt ?? deps.now().toISOString(),
  };
  deps.repository.savePartition(archived);

  return archived;
}

export function selectPartitionsForDateRange(
  partitions: readonly OperationsPartitionRecord[],
  input: {
    storageRole: StorageRole;
    from: string;
    to: string;
  },
): readonly OperationsPartitionRecord[] {
  return partitions
    .filter((partition) => partition.storageRole === input.storageRole)
    .filter((partition) => partition.activeFrom <= input.to)
    .filter((partition) => partition.closedAt === undefined || partition.closedAt >= input.from)
    .sort((left, right) => left.activeFrom.localeCompare(right.activeFrom));
}
