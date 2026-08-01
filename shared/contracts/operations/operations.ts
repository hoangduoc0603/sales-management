export type ImportType = 'Catalog' | 'Customer' | 'Supplier' | 'OpeningInventory';
export type ImportBatchStatus =
  | 'Uploaded'
  | 'Validated'
  | 'AwaitingConfirmation'
  | 'Committing'
  | 'Completed'
  | 'Failed'
  | 'FailedValidation';
export type ImportSelectionMode = 'ValidRowsOnly' | 'AllOrNothing';
export type ImportValidationStatus = 'Valid' | 'Invalid';
export type ImportCommitStatus = 'Pending' | 'Committed' | 'Skipped' | 'Failed';

export type AttachmentStatus = 'PendingUpload' | 'Available' | 'Unavailable' | 'Deleted';
export type BackupType = 'Daily' | 'Manual';
export type BackupStatus = 'Requested' | 'Running' | 'Completed' | 'Failed';
export type RestoreStatus = 'Prepared' | 'Switched' | 'Failed';
export type HealthStatus = 'Ok' | 'Warning' | 'Error';
export type StorageRole = 'core' | 'runtime' | 'transaction';
export type PartitionStatus = 'Active' | 'Closed' | 'Archived';
export type BackgroundJobType =
  | 'Import'
  | 'Export'
  | 'ReportProjection'
  | 'Backup'
  | 'Archive'
  | 'RuntimeCleanup'
  | 'HealthCheck';
export type BackgroundRunStatus = 'Running' | 'Completed' | 'RetryScheduled' | 'Failed';

export interface OperationsCommandBase {
  commandId: string;
  idempotencyKey: string;
}

export interface ImportTemplateRequest {
  importType: ImportType;
  schemaVersion: number;
}

export interface ImportTemplateResponse {
  importType: ImportType;
  schemaVersion: number;
  columns: readonly string[];
}

export interface ImportUploadRequest extends OperationsCommandBase {
  importType: ImportType;
  schemaVersion: number;
  fileName: string;
  checksum: string;
  scopeKey: string;
  rowCount: number;
}

export interface ImportBatchDTO {
  batchId: string;
  importType: ImportType;
  schemaVersion: number;
  actorId: string;
  scopeKey: string;
  status: ImportBatchStatus;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  selectionMode?: ImportSelectionMode;
  committedAt?: string;
  sourceFileName?: string;
  checksum?: string;
}

export interface ImportUploadResponse {
  batch: ImportBatchDTO;
}

export interface ImportValidateRowInput {
  rowNumber: number;
  rowKey: string;
  payload: Record<string, unknown>;
}

export interface ImportValidateRequest {
  batchId: string;
  rows: readonly ImportValidateRowInput[];
}

export interface ImportStagingRowDTO {
  stagingRowId: string;
  batchId: string;
  rowNumber: number;
  rowKey: string;
  validationStatus: ImportValidationStatus;
  errors: readonly string[];
  commitStatus: ImportCommitStatus;
  sourceObjectId?: string;
  payload: Record<string, unknown>;
}

export interface ImportValidateResponse {
  batch: ImportBatchDTO;
  rows: readonly ImportStagingRowDTO[];
}

export interface ImportCommitRequest extends OperationsCommandBase {
  batchId: string;
  selectionMode: ImportSelectionMode;
}

export interface ImportCommitResponse {
  batch: ImportBatchDTO;
  committedRows: readonly ImportStagingRowDTO[];
}

export interface AttachmentCompleteRequest extends OperationsCommandBase {
  objectType: string;
  objectId: string;
  branchId?: string;
  warehouseId?: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}

export interface AttachmentAccessRequest {
  attachmentId: string;
  objectType: string;
  objectId: string;
}

export interface AttachmentMetadataDTO {
  attachmentId: string;
  objectType: string;
  objectId: string;
  branchId?: string;
  warehouseId?: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  status: AttachmentStatus;
  uploadedBy: string;
  uploadedAt: string;
  deletedAt?: string;
}

export interface AttachmentCompleteResponse {
  attachment: AttachmentMetadataDTO;
}

export interface AttachmentAccessResponse {
  attachment: AttachmentMetadataDTO;
  accessToken: string;
  expiresAt: string;
}

export interface OperationsDateRangeDTO {
  from: string;
  to: string;
}

export interface BackupRequest extends OperationsCommandBase {
  backupType: BackupType;
}

export interface BackupManifestDTO {
  appVersion: string;
  schemaVersion: number;
  generatedAt: string;
  partitions: readonly {
    storageRole: StorageRole;
    partitionKey: string;
    status: PartitionStatus;
    rowCount: number;
  }[];
  resources: readonly {
    resourceKey: string;
    resourceId: string;
    checksum: string;
  }[];
  checksum: string;
}

export interface BackupRunDTO {
  backupRunId: string;
  status: BackupStatus;
  backupType: BackupType;
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  manifest: BackupManifestDTO;
}

export interface BackupResponse {
  backup: BackupRunDTO;
}

export interface BackupListResponse {
  backups: readonly BackupRunDTO[];
}

export interface RestorePrepareRequest extends OperationsCommandBase {
  backupRunId: string;
  confirmationText: string;
}

export interface RestoreRunDTO {
  restoreRunId: string;
  backupRunId: string;
  status: RestoreStatus;
  requestedBy: string;
  preparedAt: string;
  switchedAt?: string;
  oldConfigVersion: string;
  newConfigVersion?: string;
  healthResult?: HealthStatus;
  writeFrozen: boolean;
}

export interface RestorePrepareResponse {
  restore: RestoreRunDTO;
}

export interface RestoreSwitchRequest extends OperationsCommandBase {
  restoreRunId: string;
  ownerConfirmationText: string;
}

export interface RestoreSwitchResponse {
  restore: RestoreRunDTO;
}

export interface HealthCheckRequest {
  includeIntegrity?: boolean;
}

export interface HealthCheckDTO {
  checkId: string;
  checkType: string;
  status: HealthStatus;
  observedAt: string;
  resourceKey: string;
  message: string;
}

export interface CapacityAlertDTO {
  alertId: string;
  alertType: string;
  status: HealthStatus;
  observedAt: string;
  resourceKey: string;
  threshold: number;
  observedValue: number;
  acknowledgedAt?: string;
}

export interface HealthCheckResponse {
  status: HealthStatus;
  checks: readonly HealthCheckDTO[];
  capacityAlerts: readonly CapacityAlertDTO[];
}

export interface PartitionCapacityRequest {
  storageRole: StorageRole;
  thresholdPct: number;
}

export interface PartitionDTO {
  partitionId: string;
  storageRole: StorageRole;
  partitionKey: string;
  status: PartitionStatus;
  activeFrom: string;
  closedAt?: string;
  archivedAt?: string;
  capacityPct: number;
  readOnly: boolean;
}

export interface PartitionCapacityResponse {
  activePartition: PartitionDTO;
  nextPartition?: PartitionDTO;
  alert?: CapacityAlertDTO;
}

export interface RuntimeCleanupRequest {
  runId: string;
  now: string;
}

export interface RuntimeCleanupResponse {
  runId: string;
  deletedTechnicalRecordCount: number;
  preservedEvidenceCount: number;
}

export interface BackgroundRunDTO {
  runId: string;
  jobType: BackgroundJobType;
  status: BackgroundRunStatus;
  attempt: number;
  leaseUntil: string;
  checkpointKey?: string;
  startedAt: string;
  endedAt?: string;
  errorCode?: string;
}
