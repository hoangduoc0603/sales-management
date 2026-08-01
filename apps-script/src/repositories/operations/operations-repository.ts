import type {
  AttachmentMetadataDTO,
  BackgroundRunDTO,
  BackupRunDTO,
  CapacityAlertDTO,
  HealthCheckDTO,
  ImportBatchDTO,
  ImportStagingRowDTO,
  PartitionDTO,
  RestoreRunDTO,
} from '@shared/contracts/operations/operations';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { AppendOnlySheetRecordGateway } from '../platform/sheet-record-repository';

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
  listImportBatches(): readonly ImportBatchDTO[];
  saveImportRows(batchId: string, rows: readonly ImportStagingRowDTO[]): void;
  listImportRows(batchId: string): readonly ImportStagingRowDTO[];
  saveAttachment(attachment: AttachmentMetadataDTO): void;
  getAttachment(attachmentId: string): AttachmentMetadataDTO | undefined;
  listAttachments(): readonly AttachmentMetadataDTO[];
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
    listImportBatches() {
      return clone([...importBatches.values()]);
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
    listAttachments() {
      return clone([...attachments.values()]);
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

export interface SheetOperationsRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  transactionPartitionKey: string;
}

export function createSheetOperationsRepository(deps: SheetOperationsRepositoryDependencies): OperationsRepository {
  const importBatches = createVersionedTable<ImportBatchDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'ImportBatch'),
    idField: 'batchId',
    fromRow: importBatchFromRow,
  });
  const importRows = createReplacementSetTable<ImportStagingRowDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'ImportStagingRow'),
    parentField: 'batchId',
    childIdField: 'stagingRowId',
    setVersionField: 'rowSetVersion',
    toRow: importRowToRow,
    fromRow: importRowFromRow,
  });
  const attachments = createVersionedTable<AttachmentMetadataDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'AttachmentMetadata'),
    idField: 'attachmentId',
    partitionKey: deps.transactionPartitionKey,
  });
  const backgroundRuns = createVersionedTable<BackgroundRunDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'BackgroundRun'),
    idField: 'runId',
  });
  const backups = createReplacementSetTable<BackupRunDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'BackupRun'),
    parentField: 'backupRetention',
    childIdField: 'backupRunId',
    setVersionField: 'backupSetVersion',
    partitionKey: deps.transactionPartitionKey,
    fixedParentId: 'active',
    toRow: backupToRow,
    fromRow: backupFromRow,
  });
  const restores = createVersionedTable<RestoreRunDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'RestoreRun'),
    idField: 'restoreRunId',
    partitionKey: deps.transactionPartitionKey,
  });
  const partitions = createVersionedTable<OperationsPartitionRecord>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'PartitionRegistry'),
    idField: 'partitionId',
  });
  const healthChecks = createVersionedTable<HealthCheckDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'HealthCheck'),
    idField: 'checkId',
  });
  const capacityAlerts = createVersionedTable<CapacityAlertDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'CapacityAlert'),
    idField: 'alertId',
  });
  const runtimeRecords = createReplacementSetTable<RuntimeRecord>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'RuntimeRecord'),
    parentField: 'runtimeScope',
    childIdField: 'recordId',
    setVersionField: 'runtimeSetVersion',
    fixedParentId: 'active',
  });

  return {
    saveImportBatch(batch) {
      importBatches.save(batch);
    },
    getImportBatch(batchId) {
      return importBatches.list().find((batch) => batch.batchId === batchId);
    },
    listImportBatches() {
      return importBatches.list();
    },
    saveImportRows(batchId, rows) {
      importRows.saveSet(batchId, rows);
    },
    listImportRows(batchId) {
      return importRows.listSet(batchId);
    },
    saveAttachment(attachment) {
      attachments.save(attachment);
    },
    getAttachment(attachmentId) {
      return attachments.list().find((attachment) => attachment.attachmentId === attachmentId);
    },
    listAttachments() {
      return attachments.list();
    },
    saveBackgroundRun(run) {
      backgroundRuns.save(run);
    },
    getBackgroundRun(runId) {
      return backgroundRuns.list().find((run) => run.runId === runId);
    },
    listBackgroundRuns() {
      return backgroundRuns.list();
    },
    saveBackup(backup) {
      backups.saveSet('active', [...backups.listSet('active'), backup]);
    },
    getBackup(backupRunId) {
      return backups.listSet('active').find((backup) => backup.backupRunId === backupRunId);
    },
    listBackups() {
      return backups.listSet('active');
    },
    replaceBackups(nextBackups) {
      backups.saveSet('active', nextBackups);
    },
    saveRestore(restore) {
      restores.save(restore);
    },
    getRestore(restoreRunId) {
      return restores.list().find((restore) => restore.restoreRunId === restoreRunId);
    },
    savePartition(partition) {
      partitions.save(partition);
    },
    listPartitions() {
      return partitions.list();
    },
    saveHealthCheck(check) {
      healthChecks.save(check);
    },
    listHealthChecks() {
      return healthChecks.list();
    },
    saveCapacityAlert(alert) {
      capacityAlerts.save(alert);
    },
    listCapacityAlerts() {
      return capacityAlerts.list();
    },
    saveRuntimeRecord(record) {
      runtimeRecords.saveSet('active', [...runtimeRecords.listSet('active'), record]);
    },
    listRuntimeRecords() {
      return runtimeRecords.listSet('active');
    },
    replaceRuntimeRecords(records) {
      runtimeRecords.saveSet('active', records);
    },
  };
}

type OperationsRow = Record<string, unknown>;

interface VersionedTableDependencies<TRecord extends object> {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  idField: keyof TRecord & string;
  partitionKey?: string;
  toRow?(record: TRecord): OperationsRow;
  fromRow?(row: OperationsRow): TRecord;
}

interface VersionedTable<TRecord extends object> {
  list(): TRecord[];
  save(record: TRecord): void;
}

function createVersionedTable<TRecord extends object>(
  deps: VersionedTableDependencies<TRecord>,
): VersionedTable<TRecord> {
  const toRow = deps.toRow ?? ((record: TRecord) => clone(record) as OperationsRow);
  const fromRow = deps.fromRow ?? ((row: OperationsRow) => stripTechnicalFields(row) as TRecord);

  function readRows(): OperationsRow[] {
    return deps.gateway
      .readTable({ table: deps.table, partitionKey: deps.partitionKey })
      .map((row) => clone(row) as OperationsRow);
  }

  return {
    list() {
      return latestRowsBy(readRows(), deps.idField).map((row) => clone(fromRow(row)));
    },
    save(record) {
      const row = toRow(record);
      const recordId = String(row[deps.idField] ?? '');
      if (recordId.trim() === '') throw new Error(`MissingRecordId:${deps.table.tableName}.${deps.idField}`);
      const nextVersion =
        readRows()
          .filter((current) => String(current[deps.idField] ?? '') === recordId)
          .reduce((max, current) => Math.max(max, getRecordVersion(current)), 0) + 1;
      deps.gateway.appendRows({
        table: deps.table,
        partitionKey: deps.partitionKey,
        rows: [
          {
            ...row,
            id: `${recordId}:v${nextVersion}`,
            schemaVersion: deps.table.schemaVersion,
            recordVersion: nextVersion,
          },
        ],
      });
    },
  };
}

interface ReplacementSetTableDependencies<TRecord extends object> {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  parentField: string;
  childIdField: keyof TRecord & string;
  setVersionField: string;
  partitionKey?: string;
  fixedParentId?: string;
  toRow?(record: TRecord): OperationsRow;
  fromRow?(row: OperationsRow): TRecord;
}

interface ReplacementSetTable<TRecord extends object> {
  listSet(parentId: string): TRecord[];
  saveSet(parentId: string, records: readonly TRecord[]): void;
}

function createReplacementSetTable<TRecord extends object>(
  deps: ReplacementSetTableDependencies<TRecord>,
): ReplacementSetTable<TRecord> {
  const toRow = deps.toRow ?? ((record: TRecord) => clone(record) as OperationsRow);
  const fromRow = deps.fromRow ?? ((row: OperationsRow) => stripReplacementSetFields(row, deps) as TRecord);

  function readRows(): OperationsRow[] {
    return deps.gateway
      .readTable({ table: deps.table, partitionKey: deps.partitionKey })
      .map((row) => clone(row) as OperationsRow);
  }

  function listRowsForSet(parentId: string): OperationsRow[] {
    const scope = deps.fixedParentId ?? parentId;
    return readRows().filter((row) => String(row[deps.parentField] ?? parentId) === scope || String(row[deps.parentField] ?? '') === parentId);
  }

  return {
    listSet(parentId) {
      const rows = listRowsForSet(parentId);
      const latestSetVersion = rows.reduce((max, row) => Math.max(max, getPositiveInteger(row[deps.setVersionField])), 0);
      const candidateRows =
        latestSetVersion === 0 ? latestRowsBy(rows, deps.childIdField) : rows.filter((row) => getPositiveInteger(row[deps.setVersionField]) === latestSetVersion);
      if (candidateRows.some((row) => row.setIsEmpty === true)) return [];
      return latestRowsBy(candidateRows, deps.childIdField).map((row) => clone(fromRow(row)));
    },
    saveSet(parentId, records) {
      const scope = deps.fixedParentId ?? parentId;
      const setVersion =
        listRowsForSet(parentId).reduce((max, row) => Math.max(max, getPositiveInteger(row[deps.setVersionField])), 0) + 1;
      const rows =
        records.length === 0
          ? [
              {
                id: `${scope}:${deps.setVersionField}:s${setVersion}:empty`,
                [deps.parentField]: scope,
                [deps.setVersionField]: setVersion,
                setIsEmpty: true,
                schemaVersion: deps.table.schemaVersion,
              },
            ]
          : records.map((record) => {
              const row = toRow(record);
              const childId = String(row[deps.childIdField] ?? '');
              if (childId.trim() === '') throw new Error(`MissingRecordId:${deps.table.tableName}.${deps.childIdField}`);
              const childVersion =
                readRows()
                  .filter((current) => String(current[deps.childIdField] ?? '') === childId)
                  .reduce((max, current) => Math.max(max, getRecordVersion(current)), 0) + 1;
              return {
                ...row,
                [deps.parentField]: scope,
                id: `${childId}:v${childVersion}:s${setVersion}`,
                schemaVersion: deps.table.schemaVersion,
                recordVersion: childVersion,
                [deps.setVersionField]: setVersion,
              };
            });
      deps.gateway.appendRows({ table: deps.table, partitionKey: deps.partitionKey, rows });
    },
  };
}

function importRowToRow(row: ImportStagingRowDTO): OperationsRow {
  const { errors, payload, ...rest } = clone(row);
  return { ...rest, errorsJson: errors, payloadJson: payload };
}

function importBatchFromRow(row: OperationsRow): ImportBatchDTO {
  return {
    batchId: String(row.batchId),
    importType: row.importType as ImportBatchDTO['importType'],
    schemaVersion: Number(row.schemaVersion),
    actorId: String(row.actorId),
    scopeKey: String(row.scopeKey),
    status: row.status as ImportBatchDTO['status'],
    rowCount: Number(row.rowCount),
    validCount: Number(row.validCount),
    invalidCount: Number(row.invalidCount),
    selectionMode: row.selectionMode as ImportBatchDTO['selectionMode'] | undefined,
    committedAt: optionalString(row.committedAt),
    sourceFileName: optionalString(row.sourceFileName),
    checksum: optionalString(row.checksum),
  };
}

function importRowFromRow(row: OperationsRow): ImportStagingRowDTO {
  return {
    stagingRowId: String(row.stagingRowId),
    batchId: String(row.batchId),
    rowNumber: Number(row.rowNumber),
    rowKey: String(row.rowKey),
    validationStatus: row.validationStatus as ImportStagingRowDTO['validationStatus'],
    errors: clone((row.errorsJson ?? []) as string[]),
    commitStatus: row.commitStatus as ImportStagingRowDTO['commitStatus'],
    sourceObjectId: optionalString(row.sourceObjectId),
    payload: clone((row.payloadJson ?? {}) as Record<string, unknown>),
  };
}

function backupToRow(backup: BackupRunDTO): OperationsRow {
  const { manifest, ...row } = clone(backup);
  return { ...row, manifestJson: manifest };
}

function backupFromRow(row: OperationsRow): BackupRunDTO {
  return {
    backupRunId: String(row.backupRunId),
    status: row.status as BackupRunDTO['status'],
    backupType: row.backupType as BackupRunDTO['backupType'],
    requestedBy: String(row.requestedBy),
    requestedAt: String(row.requestedAt),
    completedAt: optionalString(row.completedAt),
    manifest: clone(row.manifestJson as BackupRunDTO['manifest']),
  };
}

function latestRowsBy(rows: readonly OperationsRow[], idField: string): OperationsRow[] {
  const latestById = new Map<string, OperationsRow>();
  for (const row of rows) {
    const recordId = String(row[idField] ?? '');
    if (recordId === '') continue;
    const current = latestById.get(recordId);
    if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) latestById.set(recordId, row);
  }
  return [...latestById.values()];
}

function stripTechnicalFields(row: OperationsRow): OperationsRow {
  const cloneRow = clone(row);
  delete cloneRow.id;
  delete cloneRow.schemaVersion;
  delete cloneRow.recordVersion;
  return cloneRow;
}

function stripReplacementSetFields<TRecord extends object>(
  row: OperationsRow,
  deps: Pick<ReplacementSetTableDependencies<TRecord>, 'parentField' | 'setVersionField' | 'fixedParentId'>,
): OperationsRow {
  const cloneRow = stripTechnicalFields(row);
  delete cloneRow[deps.setVersionField];
  delete cloneRow.setIsEmpty;
  if (deps.fixedParentId !== undefined) delete cloneRow[deps.parentField];
  return cloneRow;
}

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) throw new Error(`Missing operations table definition: ${tableName}`);
  return table;
}

function getRecordVersion(row: OperationsRow): number {
  return getPositiveInteger(row.recordVersion) || getVersionFromId(row.id);
}

function getPositiveInteger(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getVersionFromId(value: unknown): number {
  const match = /:v(\d+)/.exec(String(value ?? ''));
  return match === null ? 0 : Number(match[1]);
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value);
}
