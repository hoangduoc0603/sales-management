import { describe, expect, it } from 'vitest';
import { createInMemoryOperationsRepository } from '../../../apps-script/src/repositories/operations/operations-repository';
import { createInMemoryAuditOutboxRepository } from '../../../apps-script/src/repositories/platform/audit-outbox-repository';
import { createInMemoryReportingRepository } from '../../../apps-script/src/repositories/reporting/reporting-repository';
import { runProductionScheduledWorkerTick } from '../../../apps-script/src/bootstrap/run-production-scheduled-worker';

describe('Production scheduled worker tick', () => {
  it('runs health and daily backup jobs with BackgroundRun evidence', () => {
    const repository = createInMemoryOperationsRepository();
    const auditOutboxRepository = createInMemoryAuditOutboxRepository();
    const reportingRepository = createInMemoryReportingRepository();
    auditOutboxRepository.append({
      eventId: 'audit-1',
      commandId: 'cmd-1',
      actorId: 'user-admin',
      action: 'sales.checkout.complete',
      status: 'Pending',
      createdAt: '2026-07-27T08:59:00.000Z',
    });
    repository.savePartition({
      partitionId: 'partition-transaction-0',
      storageRole: 'transaction',
      partitionKey: 'FY2026-P00',
      status: 'Closed',
      activeFrom: '2025-07-01',
      closedAt: '2025-12-31',
      capacityPct: 91,
      readOnly: true,
      rowCount: 50_000,
    });
    repository.savePartition({
      partitionId: 'partition-transaction-1',
      storageRole: 'transaction',
      partitionKey: 'FY2026-P01',
      status: 'Active',
      activeFrom: '2026-01-01',
      capacityPct: 12,
      readOnly: false,
      rowCount: 42,
    });
    reportingRepository.saveReportRows('sales-summary', [{ branchId: 'branch-default', netRevenueVnd: 100_000 }]);
    reportingRepository.saveExportRun({
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
      requestedAt: '2026-07-27T08:58:00.000Z',
      routing: 'LargeWorker',
    });
    repository.saveImportBatch({
      batchId: 'batch-1',
      importType: 'Catalog',
      schemaVersion: 1,
      actorId: 'user-admin',
      scopeKey: 'branch-default/warehouse-default',
      status: 'Committing',
      rowCount: 1,
      validCount: 1,
      invalidCount: 0,
      selectionMode: 'ValidRowsOnly',
    });
    repository.saveImportRows('batch-1', [
      {
        stagingRowId: 'row-1',
        batchId: 'batch-1',
        rowNumber: 1,
        rowKey: 'SKU-001',
        validationStatus: 'Valid',
        errors: [],
        commitStatus: 'Pending',
        payload: { sku: 'SKU-001', name: 'Sữa hạt' },
      },
    ]);

    const result = runProductionScheduledWorkerTick({
      repository,
      auditOutboxRepository,
      reportingRepository,
      tenantId: 'tenant-default',
      appVersion: '0.1.0',
      schemaVersion: 1,
      now: () => new Date('2026-07-27T09:00:00.000Z'),
      newId: (prefix) => `${prefix}-1`,
    });

    expect(result.runs).toEqual([
      expect.objectContaining({ runId: 'scheduled-audit-delivery', status: 'Completed' }),
      expect.objectContaining({ runId: 'scheduled-reporting-export', status: 'Completed' }),
      expect.objectContaining({ runId: 'scheduled-import-commit', status: 'Completed' }),
      expect.objectContaining({ runId: 'scheduled-archive-transaction', status: 'Completed' }),
      expect.objectContaining({ runId: 'scheduled-health-check', status: 'Completed' }),
      expect.objectContaining({ runId: 'scheduled-backup-daily-2026-07-27', status: 'Completed' }),
    ]);
    expect(repository.listAuditLogs()).toEqual([
      expect.objectContaining({ eventId: 'audit-1', result: 'Delivered' }),
    ]);
    expect(repository.listHealthChecks()).toEqual([
      expect.objectContaining({ checkType: 'ScheduledWorker', status: 'Ok' }),
    ]);
    expect(repository.listBackups()).toEqual([
      expect.objectContaining({
        backupRunId: 'backup-1',
        backupType: 'Daily',
        status: 'Completed',
      }),
    ]);
    expect(reportingRepository.getExportRun('export-1')).toEqual(
      expect.objectContaining({ status: 'Completed', fileId: 'export-file-export-1', rowCount: 1 }),
    );
    expect(repository.getImportBatch('batch-1')).toEqual(expect.objectContaining({ status: 'Completed' }));
    expect(repository.listImportRows('batch-1')).toEqual([
      expect.objectContaining({ rowKey: 'SKU-001', commitStatus: 'Committed', sourceObjectId: 'imported-catalog-1' }),
    ]);
    expect(repository.listPartitions()).toEqual([
      expect.objectContaining({ partitionKey: 'FY2026-P00', status: 'Archived', archivedAt: '2026-07-27T09:00:00.000Z' }),
      expect.objectContaining({ partitionKey: 'FY2026-P01', status: 'Active' }),
    ]);
  });
});
