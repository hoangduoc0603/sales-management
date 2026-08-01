import { z } from 'zod';
import type {
  AttachmentAccessRequest,
  AttachmentCompleteRequest,
  AttachmentDeleteRequest,
  AttachmentListRequest,
  AttachmentUploadRequest,
  BackupRequest,
  HealthCheckRequest,
  ImportCommitRequest,
  ImportTemplateRequest,
  ImportUploadRequest,
  ImportValidateRequest,
  PartitionCapacityRequest,
  RestorePrepareRequest,
  RestoreSwitchRequest,
  RuntimeCleanupRequest,
} from '@shared/contracts/operations/operations';

const nonEmptyTrimmed = z.string().trim().min(1);
const isoDateTime = z.string().datetime();
const commandBaseSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
  })
  .strict();

const importTypeSchema = z.enum(['Catalog', 'Customer', 'Supplier', 'OpeningInventory']);
const importSelectionModeSchema = z.enum(['ValidRowsOnly', 'AllOrNothing']);
const backupTypeSchema = z.enum(['Daily', 'Manual']);
const storageRoleSchema = z.enum(['core', 'runtime', 'transaction']);

export const importTemplateRequestSchema = z
  .object({
    importType: importTypeSchema,
    schemaVersion: z.number().int().positive(),
  })
  .strict();

export function parseImportTemplateRequest(value: unknown): ImportTemplateRequest {
  return importTemplateRequestSchema.parse(value);
}

export const importUploadRequestSchema = commandBaseSchema.extend({
  importType: importTypeSchema,
  schemaVersion: z.number().int().positive(),
  fileName: nonEmptyTrimmed,
  checksum: nonEmptyTrimmed,
  scopeKey: nonEmptyTrimmed,
  rowCount: z.number().int().nonnegative(),
});

export function parseImportUploadRequest(value: unknown): ImportUploadRequest {
  return importUploadRequestSchema.parse(value);
}

const importValidateRowSchema = z
  .object({
    rowNumber: z.number().int().positive(),
    rowKey: nonEmptyTrimmed,
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export const importValidateRequestSchema = z
  .object({
    batchId: nonEmptyTrimmed,
    rows: z.array(importValidateRowSchema).min(1),
  })
  .strict();

export function parseImportValidateRequest(value: unknown): ImportValidateRequest {
  return importValidateRequestSchema.parse(value);
}

export const importCommitRequestSchema = commandBaseSchema.extend({
  batchId: nonEmptyTrimmed,
  selectionMode: importSelectionModeSchema,
});

export function parseImportCommitRequest(value: unknown): ImportCommitRequest {
  return importCommitRequestSchema.parse(value);
}

export const attachmentCompleteRequestSchema = commandBaseSchema.extend({
  objectType: nonEmptyTrimmed,
  objectId: nonEmptyTrimmed,
  branchId: nonEmptyTrimmed.optional(),
  warehouseId: nonEmptyTrimmed.optional(),
  driveFileId: nonEmptyTrimmed,
  fileName: nonEmptyTrimmed,
  mimeType: nonEmptyTrimmed,
  sizeBytes: z.number().int().nonnegative(),
  checksum: nonEmptyTrimmed,
});

export function parseAttachmentCompleteRequest(value: unknown): AttachmentCompleteRequest {
  return attachmentCompleteRequestSchema.parse(value);
}

export const attachmentUploadRequestSchema = commandBaseSchema.extend({
  objectType: nonEmptyTrimmed,
  objectId: nonEmptyTrimmed,
  branchId: nonEmptyTrimmed.optional(),
  warehouseId: nonEmptyTrimmed.optional(),
  fileName: nonEmptyTrimmed,
  mimeType: nonEmptyTrimmed,
  sizeBytes: z.number().int().nonnegative(),
  checksum: nonEmptyTrimmed,
  contentBase64: nonEmptyTrimmed,
});

export function parseAttachmentUploadRequest(value: unknown): AttachmentUploadRequest {
  return attachmentUploadRequestSchema.parse(value);
}

export const attachmentAccessRequestSchema = z
  .object({
    attachmentId: nonEmptyTrimmed,
    objectType: nonEmptyTrimmed,
    objectId: nonEmptyTrimmed,
  })
  .strict();

export function parseAttachmentAccessRequest(value: unknown): AttachmentAccessRequest {
  return attachmentAccessRequestSchema.parse(value);
}

export const attachmentListRequestSchema = z
  .object({
    objectType: nonEmptyTrimmed,
    objectId: nonEmptyTrimmed,
    branchId: nonEmptyTrimmed.optional(),
    warehouseId: nonEmptyTrimmed.optional(),
  })
  .strict();

export function parseAttachmentListRequest(value: unknown): AttachmentListRequest {
  return attachmentListRequestSchema.parse(value);
}

export const attachmentDeleteRequestSchema = commandBaseSchema.extend({
  attachmentId: nonEmptyTrimmed,
  objectType: nonEmptyTrimmed,
  objectId: nonEmptyTrimmed,
});

export function parseAttachmentDeleteRequest(value: unknown): AttachmentDeleteRequest {
  return attachmentDeleteRequestSchema.parse(value);
}

export const backupRequestSchema = commandBaseSchema.extend({
  backupType: backupTypeSchema,
});

export function parseBackupRequest(value: unknown): BackupRequest {
  return backupRequestSchema.parse(value);
}

export const restorePrepareRequestSchema = commandBaseSchema.extend({
  backupRunId: nonEmptyTrimmed,
  confirmationText: nonEmptyTrimmed,
});

export function parseRestorePrepareRequest(value: unknown): RestorePrepareRequest {
  return restorePrepareRequestSchema.parse(value);
}

export const restoreSwitchRequestSchema = commandBaseSchema.extend({
  restoreRunId: nonEmptyTrimmed,
  ownerConfirmationText: nonEmptyTrimmed,
});

export function parseRestoreSwitchRequest(value: unknown): RestoreSwitchRequest {
  return restoreSwitchRequestSchema.parse(value);
}

export const healthCheckRequestSchema = z
  .object({
    includeIntegrity: z.boolean().optional(),
  })
  .strict();

export function parseHealthCheckRequest(value: unknown): HealthCheckRequest {
  return healthCheckRequestSchema.parse(value);
}

export const partitionCapacityRequestSchema = z
  .object({
    storageRole: storageRoleSchema,
    thresholdPct: z.number().int().min(1).max(99),
  })
  .strict();

export function parsePartitionCapacityRequest(value: unknown): PartitionCapacityRequest {
  return partitionCapacityRequestSchema.parse(value);
}

export const runtimeCleanupRequestSchema = z
  .object({
    runId: nonEmptyTrimmed,
    now: isoDateTime,
  })
  .strict();

export function parseRuntimeCleanupRequest(value: unknown): RuntimeCleanupRequest {
  return runtimeCleanupRequestSchema.parse(value);
}
