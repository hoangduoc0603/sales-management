import { describe, expect, it } from 'vitest';
import { createInMemoryOperationsRepository } from '../../../apps-script/src/repositories/operations/operations-repository';
import { runImportCommitChunk } from '../../../apps-script/src/services/operations/import-commit-worker';

describe('import commit worker', () => {
  it('commits valid staging rows by chunk and keeps retry idempotent by row key', () => {
    const repository = createInMemoryOperationsRepository();
    repository.saveImportBatch({
      batchId: 'batch-1',
      importType: 'Catalog',
      schemaVersion: 1,
      actorId: 'user-admin',
      scopeKey: 'branch-default/warehouse-default',
      status: 'AwaitingConfirmation',
      rowCount: 3,
      validCount: 2,
      invalidCount: 1,
    });
    repository.saveImportRows('batch-1', [
      validRow({ rowNumber: 1, rowKey: 'SKU-001' }),
      validRow({ rowNumber: 2, rowKey: 'SKU-002' }),
      {
        ...validRow({ rowNumber: 3, rowKey: 'SKU-003' }),
        validationStatus: 'Invalid',
        errors: ['Thiếu SKU.'],
      },
    ]);
    const nextId = createSequentialId();

    const first = runImportCommitChunk({
      repository,
      now: () => new Date('2026-07-27T09:00:00.000Z'),
      newId: nextId,
      batchId: 'batch-1',
      selectionMode: 'ValidRowsOnly',
      maxRows: 1,
    });
    expect(first).toEqual({
      batchId: 'batch-1',
      committedCount: 1,
      skippedCount: 0,
      completed: false,
      checkpointKey: 'batch-1:row:SKU-001',
    });
    expect(repository.getImportBatch('batch-1')).toMatchObject({ status: 'Committing' });

    const second = runImportCommitChunk({
      repository,
      now: () => new Date('2026-07-27T09:05:00.000Z'),
      newId: nextId,
      batchId: 'batch-1',
      selectionMode: 'ValidRowsOnly',
      maxRows: 10,
    });
    expect(second).toEqual({
      batchId: 'batch-1',
      committedCount: 1,
      skippedCount: 1,
      completed: true,
      checkpointKey: 'batch-1:completed',
    });
    expect(repository.getImportBatch('batch-1')).toMatchObject({
      status: 'Completed',
      selectionMode: 'ValidRowsOnly',
      committedAt: '2026-07-27T09:05:00.000Z',
    });
    const committedSourceIds = repository
      .listImportRows('batch-1')
      .filter((row) => row.commitStatus === 'Committed')
      .map((row) => row.sourceObjectId);
    expect(committedSourceIds).toEqual(['imported-catalog-1', 'imported-catalog-2']);

    const retry = runImportCommitChunk({
      repository,
      now: () => new Date('2026-07-27T09:10:00.000Z'),
      newId: nextId,
      batchId: 'batch-1',
      selectionMode: 'ValidRowsOnly',
      maxRows: 10,
    });
    expect(retry).toEqual({
      batchId: 'batch-1',
      committedCount: 0,
      skippedCount: 0,
      completed: true,
      checkpointKey: 'batch-1:completed',
    });
    expect(
      repository
        .listImportRows('batch-1')
        .filter((row) => row.commitStatus === 'Committed')
        .map((row) => row.sourceObjectId),
    ).toEqual(committedSourceIds);
  });
});

function validRow(input: { rowNumber: number; rowKey: string }) {
  return {
    stagingRowId: `row-${input.rowNumber}`,
    batchId: 'batch-1',
    rowNumber: input.rowNumber,
    rowKey: input.rowKey,
    validationStatus: 'Valid' as const,
    errors: [],
    commitStatus: 'Pending' as const,
    payload: { sku: input.rowKey, name: `Product ${input.rowNumber}` },
  };
}

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
