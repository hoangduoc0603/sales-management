import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

describe('operations API composition', () => {
  it('serves operations lifecycle through the single API gateway', () => {
    const api = createApiComposition({ now: () => new Date('2026-07-27T09:00:00.000Z') });
    const login = api.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-operations',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    expect(login).toMatchObject({ ok: true });
    if (!login.ok) throw new Error('login failed');

    const upload = api.invoke({
      operation: 'operations.import.upload',
      requestId: 'req-import-upload',
      sessionToken: login.data.sessionToken,
      payload: {
        importType: 'Catalog',
        schemaVersion: 1,
        fileName: 'catalog.csv',
        checksum: 'file-checksum',
        scopeKey: 'branch-default/warehouse-default',
        rowCount: 2,
        commandId: 'cmd-import-upload-api',
        idempotencyKey: 'idem-import-upload-api',
      },
    });
    if (!upload.ok) throw new Error(JSON.stringify(upload.error));
    expect(upload).toMatchObject({ ok: true, data: { batch: { status: 'Uploaded' } } });

    expect(
      api.invoke({
        operation: 'operations.import.validate',
        requestId: 'req-import-validate',
        sessionToken: login.data.sessionToken,
        payload: {
          batchId: upload.data.batch.batchId,
          rows: [
            { rowNumber: 1, rowKey: 'SKU-001', payload: { sku: 'SKU-001', name: 'Sữa hạt' } },
            { rowNumber: 2, rowKey: 'SKU-002', payload: { sku: '', name: 'Thiếu SKU' } },
          ],
        },
      }),
    ).toMatchObject({ ok: true, data: { batch: { validCount: 1, invalidCount: 1 } } });

    const attachment = api.invoke({
      operation: 'operations.attachment.complete',
      requestId: 'req-attachment-complete',
      sessionToken: login.data.sessionToken,
      payload: {
        objectType: 'Expense',
        objectId: 'expense-api-1',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        driveFileId: 'drive-file-api-1',
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        checksum: 'attachment-checksum-api',
        commandId: 'cmd-attachment-api',
        idempotencyKey: 'idem-attachment-api',
      },
    });
    expect(attachment).toMatchObject({ ok: true, data: { attachment: { status: 'Available' } } });
    if (!attachment.ok) throw new Error('attachment failed');

    const uploadedAttachment = api.invoke({
      operation: 'operations.attachment.upload',
      requestId: 'req-attachment-upload',
      sessionToken: login.data.sessionToken,
      payload: {
        objectType: 'Expense',
        objectId: 'expense-api-2',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        fileName: 'receipt-upload.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512,
        checksum: 'attachment-upload-checksum-api',
        contentBase64: 'cmVjZWlwdA==',
        commandId: 'cmd-attachment-upload-api',
        idempotencyKey: 'idem-attachment-upload-api',
      },
    });
    expect(uploadedAttachment).toMatchObject({
      ok: true,
      data: { attachment: { status: 'Available', driveFileId: expect.stringContaining('drive-file') } },
    });
    if (!uploadedAttachment.ok) throw new Error('attachment upload failed');

    expect(
      api.invoke({
        operation: 'operations.attachment.list',
        requestId: 'req-attachment-list',
        sessionToken: login.data.sessionToken,
        payload: {
          objectType: 'Expense',
          objectId: 'expense-api-2',
        },
      }),
    ).toMatchObject({
      ok: true,
      data: { attachments: [{ attachmentId: uploadedAttachment.data.attachment.attachmentId, status: 'Available' }] },
    });

    expect(
      api.invoke({
        operation: 'operations.attachment.delete',
        requestId: 'req-attachment-delete',
        sessionToken: login.data.sessionToken,
        payload: {
          attachmentId: uploadedAttachment.data.attachment.attachmentId,
          objectType: 'Expense',
          objectId: 'expense-api-2',
          commandId: 'cmd-attachment-delete-api',
          idempotencyKey: 'idem-attachment-delete-api',
        },
      }),
    ).toMatchObject({
      ok: true,
      data: { attachment: { attachmentId: uploadedAttachment.data.attachment.attachmentId, status: 'Deleted' } },
    });

    expect(
      api.invoke({
        operation: 'operations.attachment.download',
        requestId: 'req-attachment-download',
        sessionToken: login.data.sessionToken,
        payload: {
          attachmentId: attachment.data.attachment.attachmentId,
          objectType: 'Expense',
          objectId: 'expense-api-1',
        },
      }),
    ).toMatchObject({ ok: true, data: { accessToken: expect.stringContaining('attachment-access-token') } });

    const backup = api.invoke({
      operation: 'operations.backup.request',
      requestId: 'req-backup',
      sessionToken: login.data.sessionToken,
      payload: {
        backupType: 'Manual',
        commandId: 'cmd-backup-api',
        idempotencyKey: 'idem-backup-api',
      },
    });
    expect(backup).toMatchObject({ ok: true, data: { backup: { status: 'Completed' } } });
    if (!backup.ok) throw new Error('backup failed');

    const prepared = api.invoke({
      operation: 'operations.restore.prepare',
      requestId: 'req-restore-prepare',
      sessionToken: login.data.sessionToken,
      payload: {
        backupRunId: backup.data.backup.backupRunId,
        confirmationText: `RESTORE ${backup.data.backup.backupRunId}`,
        commandId: 'cmd-restore-prepare-api',
        idempotencyKey: 'idem-restore-prepare-api',
      },
    });
    expect(prepared).toMatchObject({ ok: true, data: { restore: { status: 'Prepared', writeFrozen: true } } });

    expect(
      api.invoke({
        operation: 'operations.health.check',
        requestId: 'req-health',
        sessionToken: login.data.sessionToken,
        payload: { includeIntegrity: true },
      }),
    ).toMatchObject({ ok: true, data: { status: 'Ok' } });

    expect(
      api.invoke({
        operation: 'operations.partition.ensureNext',
        requestId: 'req-partition',
        sessionToken: login.data.sessionToken,
        payload: { storageRole: 'transaction', thresholdPct: 80 },
      }),
    ).toMatchObject({ ok: true, data: { nextPartition: { partitionKey: 'FY2026-P02' } } });

    expect(
      api.invoke({
        operation: 'operations.audit.search' as never,
        requestId: 'req-audit-disabled',
        sessionToken: login.data.sessionToken,
        payload: {
          dateRange: { from: '2026-07-27', to: '2026-07-27' },
          pageSize: 50,
        },
      }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
  });
});
