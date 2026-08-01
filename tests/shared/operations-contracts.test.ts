import { describe, expect, it } from 'vitest';
import { operationNames } from '../../shared/contracts/platform/operations';
import {
  parseAttachmentAccessRequest,
  parseAttachmentDeleteRequest,
  parseAttachmentListRequest,
  parseAttachmentUploadRequest,
  parseBackupRequest,
  parseHealthCheckRequest,
  parseImportCommitRequest,
  parseImportValidateRequest,
  parsePartitionCapacityRequest,
  parseRestorePrepareRequest,
  parseRestoreSwitchRequest,
  parseRuntimeCleanupRequest,
} from '../../shared/schemas/operations/operations';
import type { AttachmentAccessResponse, AttachmentUploadResponse } from '../../shared/contracts/operations/operations';

describe('operations contracts', () => {
  it('registers operations required for import, attachment, backup, restore, health and runtime lifecycle', () => {
    expect(operationNames).toEqual(
      expect.arrayContaining([
        'operations.import.template',
        'operations.import.upload',
        'operations.import.validate',
        'operations.import.commit',
        'operations.attachment.upload',
        'operations.attachment.list',
        'operations.attachment.complete',
        'operations.attachment.download',
        'operations.attachment.delete',
        'operations.backup.request',
        'operations.backup.list',
        'operations.restore.prepare',
        'operations.restore.switch',
        'operations.health.check',
        'operations.partition.ensureNext',
        'operations.runtime.cleanupExpired',
      ]),
    );
  });

  it('validates import row validation and commit requests with explicit selection mode', () => {
    const validateRequest = parseImportValidateRequest({
      batchId: 'batch-1',
      rows: [
        { rowNumber: 1, rowKey: 'SKU-001', payload: { sku: 'SKU-001', name: 'Sữa hạt' } },
        { rowNumber: 2, rowKey: 'SKU-002', payload: { sku: '', name: 'Thiếu SKU' } },
      ],
    });

    expect(validateRequest.rows).toHaveLength(2);
    expect(() =>
      parseImportCommitRequest({
        batchId: 'batch-1',
        selectionMode: 'InvalidMode',
        commandId: 'cmd-import-1',
        idempotencyKey: 'idem-import-1',
      }),
    ).toThrow();

    expect(
      parseImportCommitRequest({
        batchId: 'batch-1',
        selectionMode: 'ValidRowsOnly',
        commandId: 'cmd-import-1',
        idempotencyKey: 'idem-import-1',
      }),
    ).toMatchObject({ selectionMode: 'ValidRowsOnly' });
  });

  it('validates attachment access without exposing public Drive URL in the response contract', () => {
    const uploadRequest = parseAttachmentUploadRequest({
      objectType: 'Expense',
      objectId: 'expense-1',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      fileName: 'receipt.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      checksum: 'checksum-1',
      contentBase64: 'cmVjZWlwdA==',
      commandId: 'cmd-attachment-upload-1',
      idempotencyKey: 'idem-attachment-upload-1',
    });
    expect(uploadRequest).toMatchObject({ objectType: 'Expense', fileName: 'receipt.pdf' });

    expect(
      parseAttachmentListRequest({
        objectType: 'Expense',
        objectId: 'expense-1',
      }),
    ).toMatchObject({ objectId: 'expense-1' });
    expect(
      parseAttachmentAccessRequest({
        attachmentId: 'att-1',
        objectType: 'Expense',
        objectId: 'expense-1',
      }),
    ).toMatchObject({ attachmentId: 'att-1' });
    expect(
      parseAttachmentDeleteRequest({
        attachmentId: 'att-1',
        objectType: 'Expense',
        objectId: 'expense-1',
        commandId: 'cmd-attachment-delete-1',
        idempotencyKey: 'idem-attachment-delete-1',
      }),
    ).toMatchObject({ attachmentId: 'att-1' });

    const uploadResponse: AttachmentUploadResponse = {
      attachment: {
        attachmentId: 'att-1',
        objectType: 'Expense',
        objectId: 'expense-1',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        driveFileId: 'drive-file-1',
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        checksum: 'checksum-1',
        status: 'Available',
        uploadedBy: 'user-admin',
        uploadedAt: '2026-07-27T00:00:00.000Z',
      },
    };
    const response: AttachmentAccessResponse = {
      attachment: {
        attachmentId: 'att-1',
        objectType: 'Expense',
        objectId: 'expense-1',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        driveFileId: 'drive-file-1',
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        checksum: 'checksum-1',
        status: 'Available',
        uploadedBy: 'user-admin',
        uploadedAt: '2026-07-27T00:00:00.000Z',
      },
      accessToken: 'internal-download-token',
      expiresAt: '2026-07-27T00:05:00.000Z',
      contentBase64: 'cmVjZWlwdA==',
    };

    expect(JSON.stringify(uploadResponse)).not.toContain('https://drive.google.com');
    expect(JSON.stringify(uploadResponse)).not.toContain('publicUrl');
    expect(JSON.stringify(response)).not.toContain('https://drive.google.com');
    expect(JSON.stringify(response)).not.toContain('publicUrl');
  });

  it('validates backup, restore, health, partition and cleanup requests', () => {
    expect(
      parseBackupRequest({
        backupType: 'Manual',
        commandId: 'cmd-backup-1',
        idempotencyKey: 'idem-backup-1',
      }),
    ).toMatchObject({ backupType: 'Manual' });

    expect(
      parseRestorePrepareRequest({
        backupRunId: 'backup-1',
        confirmationText: 'RESTORE backup-1',
        commandId: 'cmd-restore-prepare-1',
        idempotencyKey: 'idem-restore-prepare-1',
      }),
    ).toMatchObject({ backupRunId: 'backup-1' });

    expect(
      parseRestoreSwitchRequest({
        restoreRunId: 'restore-1',
        ownerConfirmationText: 'SWITCH restore-1',
        commandId: 'cmd-restore-switch-1',
        idempotencyKey: 'idem-restore-switch-1',
      }),
    ).toMatchObject({ restoreRunId: 'restore-1' });

    expect(parseHealthCheckRequest({ includeIntegrity: true })).toMatchObject({ includeIntegrity: true });
    expect(parsePartitionCapacityRequest({ storageRole: 'transaction', thresholdPct: 80 })).toMatchObject({
      thresholdPct: 80,
    });
    expect(parseRuntimeCleanupRequest({ runId: 'run-cleanup-1', now: '2026-07-27T00:00:00.000Z' })).toMatchObject({
      runId: 'run-cleanup-1',
    });
  });
});
