import type {
  ImportSelectionMode,
  ImportStagingRowDTO,
} from '@shared/contracts/operations/operations';
import type { OperationsRepository } from '../../repositories/operations/operations-repository';

export interface ImportCommitChunkResult {
  batchId: string;
  committedCount: number;
  skippedCount: number;
  completed: boolean;
  checkpointKey: string;
}

export interface ImportCommitChunkDependencies {
  repository: Pick<OperationsRepository, 'getImportBatch' | 'saveImportBatch' | 'listImportRows' | 'saveImportRows'>;
  now: () => Date;
  newId(prefix: string): string;
  batchId: string;
  selectionMode: ImportSelectionMode;
  maxRows: number;
}

export function runImportCommitChunk(deps: ImportCommitChunkDependencies): ImportCommitChunkResult {
  const batch = deps.repository.getImportBatch(deps.batchId);
  if (batch === undefined) throw new Error('ImportBatchNotFound');

  const rows = deps.repository.listImportRows(batch.batchId);
  if (batch.status === 'Completed') {
    return {
      batchId: batch.batchId,
      committedCount: 0,
      skippedCount: 0,
      completed: true,
      checkpointKey: `${batch.batchId}:completed`,
    };
  }

  if (deps.selectionMode === 'AllOrNothing' && rows.some((row) => row.validationStatus === 'Invalid')) {
    throw new Error('ImportBatchInvalidForAllOrNothing');
  }

  const validPendingRows = rows
    .filter((row) => row.validationStatus === 'Valid')
    .filter((row) => row.commitStatus !== 'Committed')
    .slice(0, Math.max(0, deps.maxRows));
  const validPendingIds = new Set(validPendingRows.map((row) => row.stagingRowId));
  let committedCount = 0;
  let skippedCount = 0;
  let checkpointKey = `${batch.batchId}:no-pending`;

  const nextRows = rows.map((row) => {
    if (validPendingIds.has(row.stagingRowId)) {
      committedCount += 1;
      checkpointKey = `${batch.batchId}:row:${row.rowKey}`;
      return commitRow(row, batch.importType.toLowerCase(), deps.newId);
    }
    return row;
  });

  const hasMoreValidPending = nextRows.some((row) => row.validationStatus === 'Valid' && row.commitStatus !== 'Committed');
  const completed = !hasMoreValidPending;
  const finalRows = completed
    ? nextRows.map((row) => {
        if (row.validationStatus === 'Invalid' && row.commitStatus === 'Pending') {
          skippedCount += 1;
          return { ...row, commitStatus: 'Skipped' as const };
        }
        return row;
      })
    : nextRows;

  deps.repository.saveImportRows(batch.batchId, finalRows);
  deps.repository.saveImportBatch({
    ...batch,
    status: completed ? 'Completed' : 'Committing',
    selectionMode: deps.selectionMode,
    committedAt: completed ? deps.now().toISOString() : batch.committedAt,
  });

  return {
    batchId: batch.batchId,
    committedCount,
    skippedCount,
    completed,
    checkpointKey: completed ? `${batch.batchId}:completed` : checkpointKey,
  };
}

function commitRow(
  row: ImportStagingRowDTO,
  importTypeKey: string,
  newId: (prefix: string) => string,
): ImportStagingRowDTO {
  return {
    ...row,
    commitStatus: 'Committed',
    sourceObjectId: row.sourceObjectId ?? newId(`imported-${importTypeKey}`),
  };
}
