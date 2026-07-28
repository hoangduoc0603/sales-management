import { describe, expect, it } from 'vitest';
import type { ReportingExportRunDTO } from '../../../shared/contracts/reporting/reporting';
import { createInMemoryReportingRepository } from '../../../apps-script/src/repositories/reporting/reporting-repository';
import { runReportingExportChunk } from '../../../apps-script/src/services/reporting/reporting-export-worker';

describe('Reporting export worker', () => {
  it('completes requested LargeWorker export runs idempotently with file evidence metadata', () => {
    const repository = createInMemoryReportingRepository();
    repository.saveReportRows('sales-summary', [
      { branchId: 'branch-default', netRevenueVnd: 100_000 },
      { branchId: 'branch-default', netRevenueVnd: 200_000 },
    ]);
    repository.saveExportRun(requestedExport);

    const first = runReportingExportChunk({
      repository,
      now: () => new Date('2026-07-27T10:00:00.000Z'),
      newFileId: (run) => `export-file-${run.runId}`,
      maxRuns: 5,
    });
    const second = runReportingExportChunk({
      repository,
      now: () => new Date('2026-07-27T10:05:00.000Z'),
      newFileId: (run) => `export-file-${run.runId}`,
      maxRuns: 5,
    });

    expect(first).toEqual({ completedCount: 1, failedCount: 0, checkpointKey: 'export-1' });
    expect(second).toEqual({ completedCount: 0, failedCount: 0, checkpointKey: undefined });
    expect(repository.getExportRun('export-1')).toEqual({
      ...requestedExport,
      status: 'Completed',
      completedAt: '2026-07-27T10:00:00.000Z',
      rowCount: 2,
      fileId: 'export-file-export-1',
    });
  });
});

const requestedExport: ReportingExportRunDTO = {
  runId: 'export-1',
  tenantId: 'tenant-default',
  requestedBy: 'user-admin',
  status: 'Requested',
  format: 'CSV',
  query: {
    reportId: 'sales-summary',
    dateField: 'completedOrShippedAt',
    dateRange: { from: '2026-07-27', to: '2026-07-27' },
    scope: { branchId: 'branch-default' },
    pageSize: 500,
  },
  requestedAt: '2026-07-27T09:00:00.000Z',
  routing: 'LargeWorker',
};
