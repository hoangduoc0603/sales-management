import { describe, expect, it } from 'vitest';
import type {
  AttachmentMetadataDTO,
  AuditEventDTO,
  BackgroundRunDTO,
  BackupRunDTO,
  CapacityAlertDTO,
  HealthCheckDTO,
  ImportBatchDTO,
  ImportStagingRowDTO,
  RestoreRunDTO,
} from '../../../shared/contracts/operations/operations';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import {
  createSheetOperationsRepository,
  type OperationsPartitionRecord,
  type RuntimeRecord,
} from '../../../apps-script/src/repositories/operations/operations-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed OperationsRepository', () => {
  it('persists import, attachment, audit, worker and telemetry records through SheetGateway', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetOperationsRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
      auditPartitionKey: 'AUDIT-2026-07',
    });

    repository.saveImportBatch(importBatchFixture);
    repository.saveImportRows('batch-1', [importRowFixture]);
    repository.saveAttachment(attachmentFixture);
    repository.saveAuditLog(auditEventFixture);
    repository.saveBackgroundRun(backgroundRunFixture);
    repository.saveHealthCheck(healthCheckFixture);
    repository.saveCapacityAlert(capacityAlertFixture);

    expect(repository.getImportBatch('batch-1')).toEqual(importBatchFixture);
    expect(repository.listImportRows('batch-1')).toEqual([importRowFixture]);
    expect(repository.getAttachment('attachment-1')).toEqual(attachmentFixture);
    expect(repository.listAuditLogs()).toEqual([auditEventFixture]);
    expect(repository.getBackgroundRun('run-1')).toEqual(backgroundRunFixture);
    expect(repository.listHealthChecks()).toEqual([healthCheckFixture]);
    expect(repository.listCapacityAlerts()).toEqual([capacityAlertFixture]);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey, request.rows.length])).toEqual([
      ['ImportBatch', undefined, 1],
      ['ImportStagingRow', undefined, 1],
      ['AttachmentMetadata', 'FY2026-P01', 1],
      ['AuditLog', 'AUDIT-2026-07', 1],
      ['BackgroundRun', undefined, 1],
      ['HealthCheck', undefined, 1],
      ['CapacityAlert', undefined, 1],
    ]);
    expect(gateway.appendRequests.find((request) => request.tableName === 'ImportBatch')?.rows[0]).toMatchObject({
      id: 'batch-1:v1',
      schemaVersion: 1,
      recordVersion: 1,
      batchId: 'batch-1',
      checksum: 'checksum-1',
    });
    expect(gateway.appendRequests.find((request) => request.tableName === 'AuditLog')?.rows[0]).toMatchObject({
      id: 'audit-1',
      schemaVersion: 1,
      eventId: 'audit-1',
      summaryJson: { amountVnd: 100000 },
    });
  });

  it('reads latest versions and supports backup/runtime replacement sets', () => {
    const gateway = new FakeSheetGateway({
      BackgroundRun: [
        { ...backgroundRunFixture, id: 'run-1:v1', schemaVersion: 1, recordVersion: 1, status: 'Running' },
        { ...backgroundRunFixture, id: 'run-1:v2', schemaVersion: 1, recordVersion: 2, status: 'Completed' },
      ],
      BackupRun: [
        { ...toBackupRow(backupFixture), id: 'backup-1:v1:s1', schemaVersion: 1, recordVersion: 1, backupSetVersion: 1 },
      ],
    });
    const repository = createSheetOperationsRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
      auditPartitionKey: 'AUDIT-2026-07',
    });

    repository.saveRestore(restoreFixture);
    repository.savePartition(partitionFixture);
    repository.saveRuntimeRecord(runtimeRecordFixture);
    repository.replaceBackups([replacementBackupFixture]);
    repository.replaceRuntimeRecords([replacementRuntimeRecordFixture]);

    expect(repository.getBackgroundRun('run-1')).toMatchObject({ runId: 'run-1', status: 'Completed' });
    expect(repository.getRestore('restore-1')).toEqual(restoreFixture);
    expect(repository.listPartitions()).toEqual([partitionFixture]);
    expect(repository.listBackups()).toEqual([replacementBackupFixture]);
    expect(repository.listRuntimeRecords()).toEqual([replacementRuntimeRecordFixture]);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey, request.rows.length])).toEqual([
      ['RestoreRun', 'FY2026-P01', 1],
      ['PartitionRegistry', undefined, 1],
      ['RuntimeRecord', undefined, 1],
      ['BackupRun', 'FY2026-P01', 1],
      ['RuntimeRecord', undefined, 1],
    ]);
    expect(gateway.appendRequests.find((request) => request.tableName === 'RestoreRun')?.rows[0]).toMatchObject({
      id: 'restore-1:v1',
      backupRunId: 'backup-1',
      healthResult: 'Ok',
      writeFrozen: true,
    });
    expect(gateway.appendRequests.find((request) => request.tableName === 'BackupRun')?.rows[0]).toMatchObject({
      id: 'backup-2:v1:s2',
      backupSetVersion: 2,
      backupRunId: 'backup-2',
    });
    expect(gateway.appendRequests.filter((request) => request.tableName === 'RuntimeRecord')[1]?.rows[0]).toMatchObject({
      id: 'runtime-2:v1:s2',
      runtimeSetVersion: 2,
      recordId: 'runtime-2',
    });
  });
});

const importBatchFixture: ImportBatchDTO = {
  batchId: 'batch-1',
  importType: 'Catalog',
  schemaVersion: 1,
  actorId: 'user-admin',
  scopeKey: 'tenant-default',
  status: 'Validated',
  rowCount: 1,
  validCount: 1,
  invalidCount: 0,
  selectionMode: 'ValidRowsOnly',
  committedAt: '2026-07-27T08:00:00.000Z',
  sourceFileName: 'catalog.xlsx',
  checksum: 'checksum-1',
};

const importRowFixture: ImportStagingRowDTO = {
  stagingRowId: 'staging-1',
  batchId: 'batch-1',
  rowNumber: 2,
  rowKey: 'SKU-001',
  validationStatus: 'Valid',
  errors: [],
  commitStatus: 'Pending',
  sourceObjectId: 'variant-1',
  payload: { sku: 'SKU-001' },
};

const attachmentFixture: AttachmentMetadataDTO = {
  attachmentId: 'attachment-1',
  objectType: 'SaleReturn',
  objectId: 'return-1',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  driveFileId: 'drive-file-1',
  fileName: 'return.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  checksum: 'checksum-file',
  status: 'Available',
  uploadedBy: 'user-admin',
  uploadedAt: '2026-07-27T08:00:00.000Z',
};

const auditEventFixture: AuditEventDTO = {
  eventId: 'audit-1',
  action: 'sales.pos.complete',
  objectType: 'SaleOrder',
  objectId: 'sale-1',
  actorId: 'cashier-1',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  occurredAt: '2026-07-27T08:00:00.000Z',
  result: 'Committed',
  summary: { amountVnd: 100000 },
};

const backgroundRunFixture: BackgroundRunDTO = {
  runId: 'run-1',
  jobType: 'Backup',
  status: 'Running',
  attempt: 1,
  leaseUntil: '2026-07-27T08:05:00.000Z',
  checkpointKey: 'chunk-1',
  startedAt: '2026-07-27T08:00:00.000Z',
};

const backupFixture: BackupRunDTO = {
  backupRunId: 'backup-1',
  status: 'Completed',
  backupType: 'Daily',
  requestedBy: 'user-admin',
  requestedAt: '2026-07-26T00:00:00.000Z',
  completedAt: '2026-07-26T00:01:00.000Z',
  manifest: {
    appVersion: '0.1.0',
    schemaVersion: 1,
    generatedAt: '2026-07-26T00:01:00.000Z',
    partitions: [],
    resources: [],
    checksum: 'backup-checksum-1',
  },
};

const replacementBackupFixture: BackupRunDTO = {
  ...backupFixture,
  backupRunId: 'backup-2',
  requestedAt: '2026-07-27T00:00:00.000Z',
  completedAt: '2026-07-27T00:01:00.000Z',
  manifest: { ...backupFixture.manifest, generatedAt: '2026-07-27T00:01:00.000Z', checksum: 'backup-checksum-2' },
};

const restoreFixture: RestoreRunDTO = {
  restoreRunId: 'restore-1',
  backupRunId: 'backup-1',
  status: 'Switched',
  requestedBy: 'owner-1',
  preparedAt: '2026-07-27T08:00:00.000Z',
  switchedAt: '2026-07-27T08:05:00.000Z',
  oldConfigVersion: 'config-v1',
  newConfigVersion: 'config-v2',
  healthResult: 'Ok',
  writeFrozen: true,
};

const partitionFixture: OperationsPartitionRecord = {
  partitionId: 'partition-1',
  storageRole: 'transaction',
  partitionKey: 'FY2026-P01',
  status: 'Active',
  activeFrom: '2026-07-01T00:00:00.000Z',
  capacityPct: 10,
  readOnly: false,
  rowCount: 100,
};

const healthCheckFixture: HealthCheckDTO = {
  checkId: 'check-1',
  checkType: 'BackupFreshness',
  status: 'Ok',
  observedAt: '2026-07-27T08:00:00.000Z',
  resourceKey: 'backup',
  message: 'Backup trong ngưỡng',
};

const capacityAlertFixture: CapacityAlertDTO = {
  alertId: 'alert-1',
  alertType: 'TransactionPartition',
  status: 'Warning',
  observedAt: '2026-07-27T08:00:00.000Z',
  resourceKey: 'FY2026-P01',
  threshold: 80,
  observedValue: 72,
};

const runtimeRecordFixture: RuntimeRecord = {
  recordId: 'runtime-1',
  recordType: 'SessionCache',
  expiresAt: '2026-07-27T09:00:00.000Z',
  evidence: false,
};

const replacementRuntimeRecordFixture: RuntimeRecord = {
  ...runtimeRecordFixture,
  recordId: 'runtime-2',
};

function toBackupRow(backup: BackupRunDTO): Record<string, unknown> {
  const { manifest, ...row } = backup;
  return {
    ...row,
    manifestJson: manifest,
  };
}

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  constructor(seed: Record<string, Record<string, unknown>[]> = {}) {
    for (const [tableName, rows] of Object.entries(seed)) {
      this.rowsByTable.set(tableName, rows.map(clone));
    }
  }

  readTable(request: { table: TableDefinitionDTO }): Record<string, unknown>[] {
    return this.getRows(request.table.tableName).map(clone);
  }

  appendRows(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    rows: readonly Record<string, unknown>[];
  }): { appendedRowCount: number } {
    const rows = request.rows.map(clone);
    this.appendRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey, rows });
    this.getRows(request.table.tableName).push(...rows);
    return { appendedRowCount: rows.length };
  }

  private getRows(tableName: string): Record<string, unknown>[] {
    let rows = this.rowsByTable.get(tableName);
    if (rows === undefined) {
      rows = [];
      this.rowsByTable.set(tableName, rows);
    }
    return rows;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
