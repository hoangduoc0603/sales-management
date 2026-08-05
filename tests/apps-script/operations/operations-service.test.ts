import { describe, expect, it } from 'vitest';
import { createInMemoryCatalogRepository } from '../../../apps-script/src/repositories/catalog/catalog-repository';
import { createInMemoryOperationsRepository } from '../../../apps-script/src/repositories/operations/operations-repository';
import { createCatalogService } from '../../../apps-script/src/services/catalog/catalog-service';
import { createOperationsService } from '../../../apps-script/src/services/operations/operations-service';
import type { ActorContextDTO } from '../../../shared/contracts/platform/authorization';

describe('OperationsService', () => {
  it('validates import rows, commits valid rows only and keeps retry idempotent by batch row key', () => {
    const { service } = createFixture();

    const upload = service.uploadImport({
      actor: actor({ actions: ['operations.import.manage'] }),
      request: {
        importType: 'Catalog',
        schemaVersion: 1,
        fileName: 'catalog.csv',
        checksum: 'file-checksum-1',
        scopeKey: 'branch-default/warehouse-default',
        rowCount: 3,
        commandId: 'cmd-import-upload-1',
        idempotencyKey: 'idem-import-upload-1',
      },
    });
    if (!upload.ok) throw new Error(upload.error.message);

    const validation = service.validateImport({
      actor: actor({ actions: ['operations.import.manage'] }),
      request: {
        batchId: upload.data.batch.batchId,
        rows: [
          { rowNumber: 1, rowKey: 'SKU-001', payload: { sku: 'SKU-001', name: 'Sữa hạt' } },
          { rowNumber: 2, rowKey: 'SKU-002', payload: { sku: '', name: 'Thiếu SKU' } },
          { rowNumber: 3, rowKey: 'SKU-001', payload: { sku: 'SKU-001', name: 'Trùng SKU' } },
        ],
      },
    });
    if (!validation.ok) throw new Error(validation.error.message);

    expect(validation.data.batch).toMatchObject({
      status: 'AwaitingConfirmation',
      rowCount: 3,
      validCount: 1,
      invalidCount: 2,
    });
    expect(validation.data.rows.map((row) => row.validationStatus)).toEqual(['Valid', 'Invalid', 'Invalid']);

    const firstCommit = service.commitImport({
      actor: actor({ actions: ['operations.import.manage'] }),
      request: {
        batchId: upload.data.batch.batchId,
        selectionMode: 'ValidRowsOnly',
        commandId: 'cmd-import-commit-1',
        idempotencyKey: 'idem-import-commit-1',
      },
    });
    const retryCommit = service.commitImport({
      actor: actor({ actions: ['operations.import.manage'] }),
      request: {
        batchId: upload.data.batch.batchId,
        selectionMode: 'ValidRowsOnly',
        commandId: 'cmd-import-commit-1-retry',
        idempotencyKey: 'idem-import-commit-1-retry',
      },
    });

    expect(firstCommit).toMatchObject({
      ok: true,
      data: { batch: { status: 'Completed' }, committedRows: [{ rowKey: 'SKU-001', commitStatus: 'Committed' }] },
    });
    expect(retryCommit).toMatchObject({
      ok: true,
      data: { batch: { status: 'Completed' }, committedRows: [{ rowKey: 'SKU-001', commitStatus: 'Committed' }] },
    });
  });

  it('commits Catalog import create-only into Product/Default Variant and keeps retry idempotent', () => {
    const catalogRepository = createInMemoryCatalogRepository();
    const catalogService = createCatalogService({
      repository: catalogRepository,
      tenantId: 'tenant-default',
      now: () => new Date('2026-07-27T09:00:00.000Z'),
      newId: createSequentialId(),
    });
    const { service } = createFixture({ catalogImportService: catalogService });
    const permissions = actor({ actions: ['operations.import.manage'] });

    const upload = service.uploadImport({
      actor: permissions,
      request: {
        importType: 'Catalog',
        schemaVersion: 1,
        fileName: 'catalog.csv',
        checksum: 'file-checksum-catalog-create',
        scopeKey: 'branch-default/warehouse-default',
        rowCount: 1,
        commandId: 'cmd-import-upload-catalog-create',
        idempotencyKey: 'idem-import-upload-catalog-create',
      },
    });
    if (!upload.ok) throw new Error(upload.error.message);

    const validation = service.validateImport({
      actor: permissions,
      request: {
        batchId: upload.data.batch.batchId,
        rows: [
          {
            rowNumber: 1,
            rowKey: 'SKU-CATALOG-001',
            payload: {
              productCode: 'SP-CATALOG-001',
              name: 'Sản phẩm import Catalog',
              productType: 'Stocked',
              sku: 'SKU-CATALOG-001',
              barcode: '893777000001',
              defaultUnitId: 'cái',
              unitPriceVnd: 125000,
              inventoryMode: 'Tracked',
            },
          },
        ],
      },
    });
    if (!validation.ok) throw new Error(validation.error.message);

    const firstCommit = service.commitImport({
      actor: permissions,
      request: {
        batchId: upload.data.batch.batchId,
        selectionMode: 'ValidRowsOnly',
        commandId: 'cmd-import-commit-catalog-create',
        idempotencyKey: 'idem-import-commit-catalog-create',
      },
    });
    const retryCommit = service.commitImport({
      actor: permissions,
      request: {
        batchId: upload.data.batch.batchId,
        selectionMode: 'ValidRowsOnly',
        commandId: 'cmd-import-commit-catalog-create-retry',
        idempotencyKey: 'idem-import-commit-catalog-create-retry',
      },
    });

    expect(firstCommit).toMatchObject({
      ok: true,
      data: {
        batch: { status: 'Completed' },
        committedRows: [
          expect.objectContaining({
            rowKey: 'SKU-CATALOG-001',
            commitStatus: 'Committed',
            sourceObjectId: expect.stringMatching(/^product-/),
          }),
        ],
      },
    });
    expect(retryCommit).toMatchObject(firstCommit);
    expect(catalogService.listProducts({ query: 'sku-catalog-001' }).items).toEqual([
      expect.objectContaining({
        productCode: 'SP-CATALOG-001',
        displayName: 'Sản phẩm import Catalog',
        sku: 'SKU-CATALOG-001',
        barcode: '893777000001',
        unitPriceVnd: 125000,
      }),
    ]);
  });

  it('returns attachment access token without public URL and denies warehouse outside actor scope', () => {
    const { service, attachmentStorage } = createFixture();
    const uploaded = service.uploadAttachment({
      actor: actor({ actions: ['operations.attachment.manage'] }),
      request: {
        objectType: 'Expense',
        objectId: 'expense-1',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 4096,
        checksum: 'attachment-checksum-1',
        contentBase64: 'cmVjZWlwdC1jb250ZW50',
        commandId: 'cmd-attachment-upload-1',
        idempotencyKey: 'idem-attachment-upload-1',
      },
    });
    if (!uploaded.ok) throw new Error(uploaded.error.message);

    const access = service.downloadAttachment({
      actor: actor({ actions: ['operations.attachment.view'] }),
      request: {
        attachmentId: uploaded.data.attachment.attachmentId,
        objectType: 'Expense',
        objectId: 'expense-1',
      },
    });
    const denied = service.downloadAttachment({
      actor: actor({ actions: ['operations.attachment.view'], warehouseIds: ['warehouse-other'] }),
      request: {
        attachmentId: uploaded.data.attachment.attachmentId,
        objectType: 'Expense',
        objectId: 'expense-1',
      },
    });

    expect(attachmentStorage.savedFiles).toEqual([
      {
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        contentBase64: 'cmVjZWlwdC1jb250ZW50',
      },
    ]);
    expect(uploaded).toMatchObject({
      ok: true,
      data: { attachment: { driveFileId: 'drive-file-1', status: 'Available' } },
    });
    expect(access).toMatchObject({
      ok: true,
      data: {
        accessToken: 'attachment-access-token-1',
        contentBase64: 'cmVjZWlwdC1jb250ZW50',
        attachment: { status: 'Available' },
      },
    });
    expect(JSON.stringify(access)).not.toContain('https://drive.google.com');
    expect(denied).toMatchObject({ ok: false, error: { code: 'SCOPE_DENIED' } });

    const listed = service.listAttachments({
      actor: actor({ actions: ['operations.attachment.view'] }),
      request: { objectType: 'Expense', objectId: 'expense-1' },
    });
    expect(listed).toMatchObject({
      ok: true,
      data: { attachments: [{ attachmentId: uploaded.data.attachment.attachmentId, status: 'Available' }] },
    });

    const deleted = service.deleteAttachment({
      actor: actor({ actions: ['operations.attachment.manage'] }),
      request: {
        attachmentId: uploaded.data.attachment.attachmentId,
        objectType: 'Expense',
        objectId: 'expense-1',
        commandId: 'cmd-attachment-delete-1',
        idempotencyKey: 'idem-attachment-delete-1',
      },
    });
    expect(deleted).toMatchObject({ ok: true, data: { attachment: { status: 'Deleted' } } });
    expect(attachmentStorage.trashedFileIds).toEqual(['drive-file-1']);
    expect(
      service.downloadAttachment({
        actor: actor({ actions: ['operations.attachment.view'] }),
        request: {
          attachmentId: uploaded.data.attachment.attachmentId,
          objectType: 'Expense',
          objectId: 'expense-1',
        },
      }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('creates backup manifest with partitions, row counts and stable checksum', () => {
    const { service } = createFixture();

    const result = service.requestBackup({
      actor: actor({ actions: ['operations.backup.manage'] }),
      request: {
        backupType: 'Manual',
        commandId: 'cmd-backup-1',
        idempotencyKey: 'idem-backup-1',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        backup: {
          status: 'Completed',
          manifest: {
            appVersion: '0.1.0',
            schemaVersion: 1,
            partitions: [{ storageRole: 'transaction', partitionKey: 'FY2026-P01', rowCount: 42 }],
          },
        },
      },
    });
    if (!result.ok) throw new Error('Expected backup success.');
    expect(result.data.backup.manifest.checksum).toMatch(/^checksum-/);
  });

  it('prepares restore with write freeze and switches to replacement config after owner confirmation', () => {
    const { service } = createFixture();
    const backup = service.requestBackup({
      actor: actor({ actions: ['operations.backup.manage'] }),
      request: { backupType: 'Manual', commandId: 'cmd-backup-restore-1', idempotencyKey: 'idem-backup-restore-1' },
    });
    if (!backup.ok) throw new Error(backup.error.message);

    const prepared = service.prepareRestore({
      actor: actor({ actions: ['operations.restore.manage'] }),
      request: {
        backupRunId: backup.data.backup.backupRunId,
        confirmationText: `RESTORE ${backup.data.backup.backupRunId}`,
        commandId: 'cmd-restore-prepare-1',
        idempotencyKey: 'idem-restore-prepare-1',
      },
    });
    if (!prepared.ok) throw new Error(prepared.error.message);

    const switched = service.switchRestore({
      actor: actor({ actions: ['operations.restore.manage'] }),
      request: {
        restoreRunId: prepared.data.restore.restoreRunId,
        ownerConfirmationText: `SWITCH ${prepared.data.restore.restoreRunId}`,
        commandId: 'cmd-restore-switch-1',
        idempotencyKey: 'idem-restore-switch-1',
      },
    });

    expect(prepared).toMatchObject({ ok: true, data: { restore: { status: 'Prepared', writeFrozen: true } } });
    expect(switched).toMatchObject({
      ok: true,
      data: { restore: { status: 'Switched', newConfigVersion: 'runtime-config-restored-1', healthResult: 'Ok' } },
    });
  });

  it('creates next partition warning before active partition breaches capacity', () => {
    const { service } = createFixture();

    const result = service.ensureNextPartition({
      actor: actor({ actions: ['operations.partition.manage'] }),
      request: { storageRole: 'transaction', thresholdPct: 80 },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        activePartition: { partitionKey: 'FY2026-P01', capacityPct: 87 },
        nextPartition: { partitionKey: 'FY2026-P02', status: 'Active', readOnly: false },
        alert: { status: 'Warning' },
      },
    });
  });

  it('cleans expired technical runtime records without deleting retained business evidence', () => {
    const { repository, service } = createFixture();
    repository.saveRuntimeRecord({
      recordId: 'session-expired',
      recordType: 'SessionMetadata',
      expiresAt: '2026-07-26T00:00:00.000Z',
      evidence: false,
    });
    repository.saveRuntimeRecord({
      recordId: 'import-evidence',
      recordType: 'ImportBatch',
      expiresAt: '2026-07-26T00:00:00.000Z',
      evidence: true,
    });

    const result = service.cleanupExpiredRuntimeData({
      actor: actor({ actions: ['operations.runtime.cleanup'] }),
      request: {
        runId: 'run-cleanup-1',
        now: '2026-07-27T00:00:00.000Z',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: { deletedTechnicalRecordCount: 1, preservedEvidenceCount: 1 },
    });
    expect(repository.listRuntimeRecords().map((record) => record.recordId)).toEqual(['import-evidence']);
  });
});

function createFixture(input: { catalogImportService?: ReturnType<typeof createCatalogService> } = {}) {
  const repository = createInMemoryOperationsRepository();
  const attachmentStorage = {
    savedFiles: [] as Array<{ fileName: string; mimeType: string; contentBase64: string }>,
    trashedFileIds: [] as string[],
    contents: new Map<string, string>(),
    savePrivateAttachment(input: { fileName: string; mimeType: string; contentBase64: string }) {
      this.savedFiles.push(input);
      this.contents.set(`drive-file-${this.savedFiles.length}`, input.contentBase64);
      return {
        driveFileId: `drive-file-${this.savedFiles.length}`,
      };
    },
    readPrivateAttachment(input: { driveFileId: string }) {
      return { contentBase64: this.contents.get(input.driveFileId) ?? '' };
    },
    trashPrivateAttachment(input: { driveFileId: string }) {
      this.trashedFileIds.push(input.driveFileId);
    },
  };
  const service = createOperationsService({
    repository,
    tenantId: 'tenant-default',
    appVersion: '0.1.0',
    schemaVersion: 1,
    now: () => new Date('2026-07-27T09:00:00.000Z'),
    newId: createSequentialId(),
    attachmentStorage,
    catalogImportService: input.catalogImportService,
  });

  repository.savePartition({
    partitionId: 'partition-transaction-1',
    storageRole: 'transaction',
    partitionKey: 'FY2026-P01',
    status: 'Active',
    activeFrom: '2026-01-01',
    capacityPct: 87,
    readOnly: false,
    rowCount: 42,
  });

  return { repository, service, attachmentStorage };
}

function actor(input: {
  actions?: readonly string[];
  branchIds?: readonly string[];
  warehouseIds?: readonly string[];
} = {}): ActorContextDTO {
  return {
    userId: 'user-admin',
    loginId: 'admin',
    displayName: 'Admin',
    tenantId: 'tenant-default',
    authVersion: 1,
    actions: input.actions ?? [],
    scope: {
      tenantId: 'tenant-default',
      branchIds: input.branchIds ?? ['branch-default'],
      warehouseIds: input.warehouseIds ?? ['warehouse-default'],
    },
  };
}

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
