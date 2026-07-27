import type {
  AttachmentMetadataDTO,
  AuditEventDTO,
  BackgroundRunDTO,
  BackupRunDTO,
  CapacityAlertDTO,
  HealthCheckDTO,
  ImportBatchDTO,
  ImportStagingRowDTO,
  PartitionDTO,
  RestoreRunDTO,
} from '@shared/contracts/operations/operations';

export interface RuntimeRecord {
  recordId: string;
  recordType: string;
  expiresAt: string;
  evidence: boolean;
}

export interface OperationsPartitionRecord extends PartitionDTO {
  rowCount: number;
}

export interface OperationsRepository {
  saveImportBatch(batch: ImportBatchDTO): void;
  getImportBatch(batchId: string): ImportBatchDTO | undefined;
  saveImportRows(batchId: string, rows: readonly ImportStagingRowDTO[]): void;
  listImportRows(batchId: string): readonly ImportStagingRowDTO[];
  saveAttachment(attachment: AttachmentMetadataDTO): void;
  getAttachment(attachmentId: string): AttachmentMetadataDTO | undefined;
  saveAuditLog(event: AuditEventDTO): void;
  listAuditLogs(): readonly AuditEventDTO[];
  saveBackgroundRun(run: BackgroundRunDTO): void;
  getBackgroundRun(runId: string): BackgroundRunDTO | undefined;
  listBackgroundRuns(): readonly BackgroundRunDTO[];
  saveBackup(backup: BackupRunDTO): void;
  getBackup(backupRunId: string): BackupRunDTO | undefined;
  listBackups(): readonly BackupRunDTO[];
  replaceBackups(backups: readonly BackupRunDTO[]): void;
  saveRestore(restore: RestoreRunDTO): void;
  getRestore(restoreRunId: string): RestoreRunDTO | undefined;
  savePartition(partition: OperationsPartitionRecord): void;
  listPartitions(): readonly OperationsPartitionRecord[];
  saveHealthCheck(check: HealthCheckDTO): void;
  listHealthChecks(): readonly HealthCheckDTO[];
  saveCapacityAlert(alert: CapacityAlertDTO): void;
  listCapacityAlerts(): readonly CapacityAlertDTO[];
  saveRuntimeRecord(record: RuntimeRecord): void;
  listRuntimeRecords(): readonly RuntimeRecord[];
  replaceRuntimeRecords(records: readonly RuntimeRecord[]): void;
}

export function createInMemoryOperationsRepository(): OperationsRepository {
  const importBatches = new Map<string, ImportBatchDTO>();
  const importRows = new Map<string, ImportStagingRowDTO[]>();
  const attachments = new Map<string, AttachmentMetadataDTO>();
  const auditLogs = new Map<string, AuditEventDTO>();
  const backgroundRuns = new Map<string, BackgroundRunDTO>();
  const backups = new Map<string, BackupRunDTO>();
  const restores = new Map<string, RestoreRunDTO>();
  const partitions = new Map<string, OperationsPartitionRecord>();
  const healthChecks = new Map<string, HealthCheckDTO>();
  const capacityAlerts = new Map<string, CapacityAlertDTO>();
  let runtimeRecords: RuntimeRecord[] = [];

  return {
    saveImportBatch(batch) {
      importBatches.set(batch.batchId, clone(batch));
    },
    getImportBatch(batchId) {
      return cloneOptional(importBatches.get(batchId));
    },
    saveImportRows(batchId, rows) {
      importRows.set(batchId, clone(rows) as ImportStagingRowDTO[]);
    },
    listImportRows(batchId) {
      return clone(importRows.get(batchId) ?? []);
    },
    saveAttachment(attachment) {
      attachments.set(attachment.attachmentId, clone(attachment));
    },
    getAttachment(attachmentId) {
      return cloneOptional(attachments.get(attachmentId));
    },
    saveAuditLog(event) {
      auditLogs.set(event.eventId, clone(event));
    },
    listAuditLogs() {
      return clone([...auditLogs.values()]);
    },
    saveBackgroundRun(run) {
      backgroundRuns.set(run.runId, clone(run));
    },
    getBackgroundRun(runId) {
      return cloneOptional(backgroundRuns.get(runId));
    },
    listBackgroundRuns() {
      return clone([...backgroundRuns.values()]);
    },
    saveBackup(backup) {
      backups.set(backup.backupRunId, clone(backup));
    },
    getBackup(backupRunId) {
      return cloneOptional(backups.get(backupRunId));
    },
    listBackups() {
      return clone([...backups.values()]);
    },
    replaceBackups(nextBackups) {
      backups.clear();
      nextBackups.forEach((backup) => backups.set(backup.backupRunId, clone(backup)));
    },
    saveRestore(restore) {
      restores.set(restore.restoreRunId, clone(restore));
    },
    getRestore(restoreRunId) {
      return cloneOptional(restores.get(restoreRunId));
    },
    savePartition(partition) {
      partitions.set(`${partition.storageRole}:${partition.partitionKey}`, clone(partition));
    },
    listPartitions() {
      return clone([...partitions.values()]);
    },
    saveHealthCheck(check) {
      healthChecks.set(check.checkId, clone(check));
    },
    listHealthChecks() {
      return clone([...healthChecks.values()]);
    },
    saveCapacityAlert(alert) {
      capacityAlerts.set(alert.alertId, clone(alert));
    },
    listCapacityAlerts() {
      return clone([...capacityAlerts.values()]);
    },
    saveRuntimeRecord(record) {
      runtimeRecords.push(clone(record));
    },
    listRuntimeRecords() {
      return clone(runtimeRecords);
    },
    replaceRuntimeRecords(records) {
      runtimeRecords = clone(records) as RuntimeRecord[];
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneOptional<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : clone(value);
}
