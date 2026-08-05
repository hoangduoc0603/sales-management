import type { ApiErrorCode } from '@shared/contracts/errors';
import type { CatalogCreateProductRequest, InventoryMode, ProductType } from '@shared/contracts/catalog/catalog';
import { inventoryModes, productTypes } from '@shared/contracts/catalog/catalog';
import type {
  AttachmentAccessRequest,
  AttachmentAccessResponse,
  AttachmentCompleteRequest,
  AttachmentCompleteResponse,
  AttachmentDeleteRequest,
  AttachmentDeleteResponse,
  AttachmentListRequest,
  AttachmentListResponse,
  AttachmentUploadRequest,
  AttachmentUploadResponse,
  BackupListResponse,
  BackupManifestDTO,
  BackupRequest,
  BackupResponse,
  HealthCheckRequest,
  HealthCheckResponse,
  ImportCommitRequest,
  ImportCommitResponse,
  ImportSelectionMode,
  ImportStagingRowDTO,
  ImportTemplateRequest,
  ImportTemplateResponse,
  ImportUploadRequest,
  ImportUploadResponse,
  ImportValidateRequest,
  ImportValidateResponse,
  PartitionCapacityRequest,
  PartitionCapacityResponse,
  RestorePrepareRequest,
  RestorePrepareResponse,
  RestoreSwitchRequest,
  RestoreSwitchResponse,
  RuntimeCleanupRequest,
  RuntimeCleanupResponse,
} from '@shared/contracts/operations/operations';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { CatalogService } from '../catalog/catalog-service';
import { runImportCommitChunk } from './import-commit-worker';
import type {
  OperationsPartitionRecord,
  OperationsRepository,
  RuntimeRecord,
} from '../../repositories/operations/operations-repository';

type OperationsServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string } };

export interface OperationsService {
  getImportTemplate(input: { actor: ActorContextDTO; request: ImportTemplateRequest }): OperationsServiceResult<ImportTemplateResponse>;
  uploadImport(input: { actor: ActorContextDTO; request: ImportUploadRequest }): OperationsServiceResult<ImportUploadResponse>;
  validateImport(input: { actor: ActorContextDTO; request: ImportValidateRequest }): OperationsServiceResult<ImportValidateResponse>;
  commitImport(input: { actor: ActorContextDTO; request: ImportCommitRequest }): OperationsServiceResult<ImportCommitResponse>;
  uploadAttachment(input: { actor: ActorContextDTO; request: AttachmentUploadRequest }): OperationsServiceResult<AttachmentUploadResponse>;
  listAttachments(input: { actor: ActorContextDTO; request: AttachmentListRequest }): OperationsServiceResult<AttachmentListResponse>;
  completeAttachment(input: { actor: ActorContextDTO; request: AttachmentCompleteRequest }): OperationsServiceResult<AttachmentCompleteResponse>;
  downloadAttachment(input: { actor: ActorContextDTO; request: AttachmentAccessRequest }): OperationsServiceResult<AttachmentAccessResponse>;
  deleteAttachment(input: { actor: ActorContextDTO; request: AttachmentDeleteRequest }): OperationsServiceResult<AttachmentDeleteResponse>;
  requestBackup(input: { actor: ActorContextDTO; request: BackupRequest }): OperationsServiceResult<BackupResponse>;
  listBackups(input: { actor: ActorContextDTO }): OperationsServiceResult<BackupListResponse>;
  prepareRestore(input: { actor: ActorContextDTO; request: RestorePrepareRequest }): OperationsServiceResult<RestorePrepareResponse>;
  switchRestore(input: { actor: ActorContextDTO; request: RestoreSwitchRequest }): OperationsServiceResult<RestoreSwitchResponse>;
  checkHealth(input: { actor: ActorContextDTO; request: HealthCheckRequest }): OperationsServiceResult<HealthCheckResponse>;
  ensureNextPartition(input: { actor: ActorContextDTO; request: PartitionCapacityRequest }): OperationsServiceResult<PartitionCapacityResponse>;
  cleanupExpiredRuntimeData(input: { actor: ActorContextDTO; request: RuntimeCleanupRequest }): OperationsServiceResult<RuntimeCleanupResponse>;
}

export interface OperationsServiceDependencies {
  repository: OperationsRepository;
  catalogImportService?: Pick<CatalogService, 'createProduct' | 'listProducts'>;
  attachmentStorage?: AttachmentStorage;
  tenantId: string;
  appVersion: string;
  schemaVersion: number;
  now: () => Date;
  newId(prefix: string): string;
}

export interface AttachmentStorage {
  savePrivateAttachment(input: {
    fileName: string;
    mimeType: string;
    contentBase64: string;
  }): {
    driveFileId: string;
  };
  readPrivateAttachment?(input: { driveFileId: string }): {
    contentBase64: string;
  };
  trashPrivateAttachment?(input: { driveFileId: string }): void;
}

const importTemplateColumns: Record<ImportTemplateRequest['importType'], readonly string[]> = {
  Catalog: [
    'productCode',
    'name',
    'productType',
    'sku',
    'barcode',
    'defaultUnitId',
    'unitPriceVnd',
    'inventoryMode',
    'lotTracking',
    'serialTracking',
  ],
  Customer: ['customerCode', 'displayName', 'phone'],
  Supplier: ['supplierCode', 'displayName', 'phone'],
  OpeningInventory: ['warehouseId', 'sku', 'quantity', 'unitCostVnd'],
};

export function createOperationsService(deps: OperationsServiceDependencies): OperationsService {
  return {
    getImportTemplate(input) {
      const permissionError = requireAction(input.actor, 'operations.import.manage');
      if (permissionError !== undefined) return permissionError;

      return {
        ok: true,
        data: {
          importType: input.request.importType,
          schemaVersion: input.request.schemaVersion,
          columns: importTemplateColumns[input.request.importType],
        },
      };
    },
    uploadImport(input) {
      const permissionError = requireAction(input.actor, 'operations.import.manage');
      if (permissionError !== undefined) return permissionError;

      const batch = {
        batchId: deps.newId('import-batch'),
        importType: input.request.importType,
        schemaVersion: input.request.schemaVersion,
        actorId: input.actor.userId,
        scopeKey: input.request.scopeKey,
        status: 'Uploaded' as const,
        rowCount: input.request.rowCount,
        validCount: 0,
        invalidCount: 0,
        sourceFileName: input.request.fileName,
        checksum: input.request.checksum,
      };
      deps.repository.saveImportBatch(batch);
      return { ok: true, data: { batch } };
    },
    validateImport(input) {
      const permissionError = requireAction(input.actor, 'operations.import.manage');
      if (permissionError !== undefined) return permissionError;
      const batch = deps.repository.getImportBatch(input.request.batchId);
      if (batch === undefined) return failure('INVALID_INPUT', 'Không tìm thấy import batch.');

      const seen = new Set<string>();
      const catalogImportLookup =
        batch.importType === 'Catalog' && deps.catalogImportService !== undefined
          ? createCatalogImportLookup(deps.catalogImportService)
          : undefined;
      const rows = input.request.rows.map((row) => {
        const errors: string[] = [];
        if (seen.has(row.rowKey)) errors.push('Dòng trùng khóa trong cùng batch.');
        seen.add(row.rowKey);
        for (const [key, value] of Object.entries(row.payload)) {
          if (typeof value === 'string' && value.trim() === '') {
            errors.push(`Cột ${key} không được rỗng.`);
          }
        }
        if (catalogImportLookup !== undefined) {
          errors.push(...validateCatalogImportPayload(row.payload, catalogImportLookup));
        }

        return {
          stagingRowId: deps.newId('import-row'),
          batchId: batch.batchId,
          rowNumber: row.rowNumber,
          rowKey: row.rowKey,
          validationStatus: errors.length === 0 ? 'Valid' as const : 'Invalid' as const,
          errors,
          commitStatus: 'Pending' as const,
          payload: row.payload,
        };
      });
      const validCount = rows.filter((row) => row.validationStatus === 'Valid').length;
      const invalidCount = rows.length - validCount;
      const updatedBatch = {
        ...batch,
        status: validCount > 0 ? 'AwaitingConfirmation' as const : 'FailedValidation' as const,
        rowCount: rows.length,
        validCount,
        invalidCount,
      };
      deps.repository.saveImportBatch(updatedBatch);
      deps.repository.saveImportRows(batch.batchId, rows);
      return { ok: true, data: { batch: updatedBatch, rows } };
    },
    commitImport(input) {
      const permissionError = requireAction(input.actor, 'operations.import.manage');
      if (permissionError !== undefined) return permissionError;
      const batch = deps.repository.getImportBatch(input.request.batchId);
      if (batch === undefined) return failure('INVALID_INPUT', 'Không tìm thấy import batch.');
      const existingRows = deps.repository.listImportRows(batch.batchId);
      const alreadyCommitted = batch.status === 'Completed';
      if (alreadyCommitted) {
        return {
          ok: true,
          data: {
            batch,
            committedRows: existingRows.filter((row) => row.commitStatus === 'Committed'),
          },
        };
      }
      if (input.request.selectionMode === 'AllOrNothing' && existingRows.some((row) => row.validationStatus === 'Invalid')) {
        return failure('INVALID_INPUT', 'Batch có dòng lỗi nên không thể commit theo chế độ AllOrNothing.');
      }

      if (batch.importType === 'Catalog' && deps.catalogImportService !== undefined) {
        const committed = commitCatalogImportRows({
          repository: deps.repository,
          catalogImportService: deps.catalogImportService,
          batchId: batch.batchId,
          selectionMode: input.request.selectionMode,
          now: deps.now,
        });
        const updatedBatch = deps.repository.getImportBatch(batch.batchId) ?? batch;
        return {
          ok: true,
          data: {
            batch: updatedBatch,
            committedRows: committed.filter((row) => row.commitStatus === 'Committed'),
          },
        };
      }

      runImportCommitChunk({
        repository: deps.repository,
        now: deps.now,
        newId: deps.newId,
        batchId: batch.batchId,
        selectionMode: input.request.selectionMode,
        maxRows: Number.MAX_SAFE_INTEGER,
      });
      const updatedBatch = deps.repository.getImportBatch(batch.batchId) ?? batch;
      const rows = deps.repository.listImportRows(batch.batchId);
      return {
        ok: true,
        data: {
          batch: updatedBatch,
          committedRows: rows.filter((row) => row.commitStatus === 'Committed'),
        },
      };
    },
    uploadAttachment(input) {
      const permissionError = requireAction(input.actor, 'operations.attachment.manage');
      if (permissionError !== undefined) return permissionError;
      const scopeError = requireScope(input.actor, input.request);
      if (scopeError !== undefined) return scopeError;
      if (deps.attachmentStorage === undefined) {
        return failure('INVALID_INPUT', 'Attachment storage chưa được cấu hình.');
      }

      const stored = deps.attachmentStorage.savePrivateAttachment({
        fileName: input.request.fileName,
        mimeType: input.request.mimeType,
        contentBase64: input.request.contentBase64,
      });
      const attachment = {
        attachmentId: deps.newId('attachment'),
        objectType: input.request.objectType,
        objectId: input.request.objectId,
        branchId: input.request.branchId,
        warehouseId: input.request.warehouseId,
        driveFileId: stored.driveFileId,
        fileName: input.request.fileName,
        mimeType: input.request.mimeType,
        sizeBytes: input.request.sizeBytes,
        checksum: input.request.checksum,
        status: 'Available' as const,
        uploadedBy: input.actor.userId,
        uploadedAt: deps.now().toISOString(),
      };
      deps.repository.saveAttachment(attachment);
      return { ok: true, data: { attachment } };
    },
    listAttachments(input) {
      const permissionError = requireAction(input.actor, 'operations.attachment.view');
      if (permissionError !== undefined) return permissionError;
      const scopeError = requireScope(input.actor, input.request);
      if (scopeError !== undefined) return scopeError;

      const attachments = deps.repository
        .listAttachments()
        .filter((attachment) => attachment.objectType === input.request.objectType)
        .filter((attachment) => attachment.objectId === input.request.objectId)
        .filter((attachment) => attachment.status !== 'Deleted')
        .filter((attachment) => input.request.branchId === undefined || attachment.branchId === input.request.branchId)
        .filter((attachment) => input.request.warehouseId === undefined || attachment.warehouseId === input.request.warehouseId)
        .filter((attachment) => requireScope(input.actor, attachment) === undefined);

      return { ok: true, data: { attachments } };
    },
    completeAttachment(input) {
      const permissionError = requireAction(input.actor, 'operations.attachment.manage');
      if (permissionError !== undefined) return permissionError;
      const scopeError = requireScope(input.actor, input.request);
      if (scopeError !== undefined) return scopeError;

      const attachment = {
        attachmentId: deps.newId('attachment'),
        objectType: input.request.objectType,
        objectId: input.request.objectId,
        branchId: input.request.branchId,
        warehouseId: input.request.warehouseId,
        driveFileId: input.request.driveFileId,
        fileName: input.request.fileName,
        mimeType: input.request.mimeType,
        sizeBytes: input.request.sizeBytes,
        checksum: input.request.checksum,
        status: 'Available' as const,
        uploadedBy: input.actor.userId,
        uploadedAt: deps.now().toISOString(),
      };
      deps.repository.saveAttachment(attachment);
      return { ok: true, data: { attachment } };
    },
    downloadAttachment(input) {
      const permissionError = requireAction(input.actor, 'operations.attachment.view');
      if (permissionError !== undefined) return permissionError;
      const attachment = deps.repository.getAttachment(input.request.attachmentId);
      if (attachment === undefined) return failure('INVALID_INPUT', 'Không tìm thấy file đính kèm.');
      if (attachment.objectType !== input.request.objectType || attachment.objectId !== input.request.objectId) {
        return failure('INVALID_INPUT', 'File đính kèm không khớp chứng từ nguồn.');
      }
      const scopeError = requireScope(input.actor, attachment);
      if (scopeError !== undefined) return scopeError;
      if (attachment.status !== 'Available') return failure('INVALID_INPUT', 'File đính kèm không khả dụng.');

      const content = deps.attachmentStorage?.readPrivateAttachment?.({ driveFileId: attachment.driveFileId });
      return {
        ok: true,
        data: {
          attachment,
          accessToken: `attachment-access-token-${lastSegment(attachment.attachmentId)}`,
          expiresAt: new Date(deps.now().getTime() + 5 * 60 * 1000).toISOString(),
          contentBase64: content?.contentBase64,
        },
      };
    },
    deleteAttachment(input) {
      const permissionError = requireAction(input.actor, 'operations.attachment.manage');
      if (permissionError !== undefined) return permissionError;
      const attachment = deps.repository.getAttachment(input.request.attachmentId);
      if (attachment === undefined) return failure('INVALID_INPUT', 'Không tìm thấy file đính kèm.');
      if (attachment.objectType !== input.request.objectType || attachment.objectId !== input.request.objectId) {
        return failure('INVALID_INPUT', 'File đính kèm không khớp chứng từ nguồn.');
      }
      const scopeError = requireScope(input.actor, attachment);
      if (scopeError !== undefined) return scopeError;
      if (attachment.status === 'Deleted') return { ok: true, data: { attachment } };

      deps.attachmentStorage?.trashPrivateAttachment?.({ driveFileId: attachment.driveFileId });
      const deleted = {
        ...attachment,
        status: 'Deleted' as const,
        deletedAt: deps.now().toISOString(),
      };
      deps.repository.saveAttachment(deleted);
      return { ok: true, data: { attachment: deleted } };
    },
    requestBackup(input) {
      const permissionError = requireAction(input.actor, 'operations.backup.manage');
      if (permissionError !== undefined) return permissionError;
      const generatedAt = deps.now().toISOString();
      const partitions = deps.repository.listPartitions().map((partition) => ({
        storageRole: partition.storageRole,
        partitionKey: partition.partitionKey,
        status: partition.status,
        rowCount: partition.rowCount,
      }));
      const resources = [
        {
          resourceKey: 'runtime-config',
          resourceId: `runtime-config-${deps.tenantId}`,
          checksum: 'checksum-runtime-config',
        },
      ];
      const manifestWithoutChecksum = {
        appVersion: deps.appVersion,
        schemaVersion: deps.schemaVersion,
        generatedAt,
        partitions,
        resources,
      };
      const manifest: BackupManifestDTO = {
        ...manifestWithoutChecksum,
        checksum: stableChecksum(manifestWithoutChecksum),
      };
      const backup = {
        backupRunId: deps.newId('backup'),
        status: 'Completed' as const,
        backupType: input.request.backupType,
        requestedBy: input.actor.userId,
        requestedAt: generatedAt,
        completedAt: generatedAt,
        manifest,
      };
      deps.repository.saveBackup(backup);
      return { ok: true, data: { backup } };
    },
    listBackups(input) {
      const permissionError = requireAction(input.actor, 'operations.backup.manage');
      if (permissionError !== undefined) return permissionError;
      return { ok: true, data: { backups: deps.repository.listBackups() } };
    },
    prepareRestore(input) {
      const permissionError = requireAction(input.actor, 'operations.restore.manage');
      if (permissionError !== undefined) return permissionError;
      const backup = deps.repository.getBackup(input.request.backupRunId);
      if (backup === undefined) return failure('INVALID_INPUT', 'Không tìm thấy backup.');
      if (input.request.confirmationText !== `RESTORE ${backup.backupRunId}`) {
        return failure('INVALID_INPUT', 'Xác nhận restore không khớp backup.');
      }
      const restore = {
        restoreRunId: deps.newId('restore'),
        backupRunId: backup.backupRunId,
        status: 'Prepared' as const,
        requestedBy: input.actor.userId,
        preparedAt: deps.now().toISOString(),
        oldConfigVersion: 'runtime-config-current',
        writeFrozen: true,
      };
      deps.repository.saveRestore(restore);
      return { ok: true, data: { restore } };
    },
    switchRestore(input) {
      const permissionError = requireAction(input.actor, 'operations.restore.manage');
      if (permissionError !== undefined) return permissionError;
      const restore = deps.repository.getRestore(input.request.restoreRunId);
      if (restore === undefined) return failure('INVALID_INPUT', 'Không tìm thấy restore run.');
      if (input.request.ownerConfirmationText !== `SWITCH ${restore.restoreRunId}`) {
        return failure('INVALID_INPUT', 'Xác nhận switch restore không khớp.');
      }
      const switched = {
        ...restore,
        status: 'Switched' as const,
        switchedAt: deps.now().toISOString(),
        newConfigVersion: `runtime-config-restored-${lastSegment(restore.backupRunId)}`,
        healthResult: 'Ok' as const,
        writeFrozen: false,
      };
      deps.repository.saveRestore(switched);
      return { ok: true, data: { restore: switched } };
    },
    checkHealth(input) {
      const permissionError = requireAction(input.actor, 'operations.health.view');
      if (permissionError !== undefined) return permissionError;
      const now = deps.now().toISOString();
      const checks = [
        {
          checkId: deps.newId('health'),
          checkType: input.request.includeIntegrity ? 'Integrity' : 'Readiness',
          status: 'Ok' as const,
          observedAt: now,
          resourceKey: 'runtime-config',
          message: 'Runtime config, trigger và storage baseline sẵn sàng.',
        },
      ];
      checks.forEach((check) => deps.repository.saveHealthCheck(check));
      const capacityAlerts = deps.repository.listCapacityAlerts();
      return { ok: true, data: { status: capacityAlerts.some((alert) => alert.status !== 'Ok') ? 'Warning' : 'Ok', checks, capacityAlerts } };
    },
    ensureNextPartition(input) {
      const permissionError = requireAction(input.actor, 'operations.partition.manage');
      if (permissionError !== undefined) return permissionError;
      const active = deps.repository
        .listPartitions()
        .find((partition) => partition.storageRole === input.request.storageRole && partition.status === 'Active');
      if (active === undefined) return failure('INVALID_INPUT', 'Không tìm thấy active partition.');
      if (active.capacityPct < input.request.thresholdPct) {
        return { ok: true, data: { activePartition: stripRowCount(active) } };
      }
      const nextPartition = createNextPartition(active, deps);
      deps.repository.savePartition(nextPartition);
      const alert = {
        alertId: deps.newId('capacity-alert'),
        alertType: 'ActivePartitionCapacity',
        status: 'Warning' as const,
        observedAt: deps.now().toISOString(),
        resourceKey: `${active.storageRole}:${active.partitionKey}`,
        threshold: input.request.thresholdPct,
        observedValue: active.capacityPct,
      };
      deps.repository.saveCapacityAlert(alert);
      return {
        ok: true,
        data: {
          activePartition: stripRowCount(active),
          nextPartition: stripRowCount(nextPartition),
          alert,
        },
      };
    },
    cleanupExpiredRuntimeData(input) {
      const permissionError = requireAction(input.actor, 'operations.runtime.cleanup');
      if (permissionError !== undefined) return permissionError;
      const now = input.request.now;
      const records = deps.repository.listRuntimeRecords();
      const kept: RuntimeRecord[] = [];
      let deletedTechnicalRecordCount = 0;
      let preservedEvidenceCount = 0;
      for (const record of records) {
        const expired = record.expiresAt <= now;
        if (expired && !record.evidence) {
          deletedTechnicalRecordCount += 1;
          continue;
        }
        if (expired && record.evidence) preservedEvidenceCount += 1;
        kept.push(record);
      }
      deps.repository.replaceRuntimeRecords(kept);
      return {
        ok: true,
        data: {
          runId: input.request.runId,
          deletedTechnicalRecordCount,
          preservedEvidenceCount,
        },
      };
    },
  };
}

function requireAction(actor: ActorContextDTO, action: string): OperationsServiceResult<never> | undefined {
  return actor.actions.includes(action)
    ? undefined
    : failure<never>('PERMISSION_DENIED', 'Bạn không có quyền thực hiện thao tác vận hành này.');
}

interface CatalogImportLookup {
  existingSkus: ReadonlySet<string>;
  existingBarcodes: ReadonlySet<string>;
  batchSkus: Set<string>;
  batchBarcodes: Set<string>;
}

function createCatalogImportLookup(
  catalogImportService: Pick<CatalogService, 'listProducts'>,
): CatalogImportLookup {
  const items = catalogImportService.listProducts({ status: 'All', limit: 1000 }).items;
  return {
    existingSkus: new Set(items.map((item) => normalizeCatalogImportLookup(item.sku))),
    existingBarcodes: new Set(
      items
        .map((item) => item.barcode)
        .filter((barcode): barcode is string => barcode !== undefined)
        .map(normalizeCatalogImportLookup),
    ),
    batchSkus: new Set<string>(),
    batchBarcodes: new Set<string>(),
  };
}

function validateCatalogImportPayload(
  payload: Record<string, unknown>,
  lookup: CatalogImportLookup,
): string[] {
  const parsed = parseCatalogImportCreateRequest(payload);
  const errors = parsed.ok ? [] : parsed.errors;
  const sku = readTrimmedString(payload, 'sku');
  if (sku !== undefined) {
    const normalizedSku = normalizeCatalogImportLookup(sku);
    if (lookup.existingSkus.has(normalizedSku)) errors.push('SKU đã tồn tại trong Catalog.');
    if (lookup.batchSkus.has(normalizedSku)) errors.push('SKU trùng trong cùng batch.');
    lookup.batchSkus.add(normalizedSku);
  }

  const barcode = readTrimmedString(payload, 'barcode');
  if (barcode !== undefined) {
    const normalizedBarcode = normalizeCatalogImportLookup(barcode);
    if (lookup.existingBarcodes.has(normalizedBarcode)) errors.push('Barcode đã tồn tại trong Catalog.');
    if (lookup.batchBarcodes.has(normalizedBarcode)) errors.push('Barcode trùng trong cùng batch.');
    lookup.batchBarcodes.add(normalizedBarcode);
  }
  return errors;
}

function commitCatalogImportRows(input: {
  repository: Pick<OperationsRepository, 'getImportBatch' | 'saveImportBatch' | 'listImportRows' | 'saveImportRows'>;
  catalogImportService: Pick<CatalogService, 'createProduct'>;
  batchId: string;
  selectionMode: ImportSelectionMode;
  now: () => Date;
}): readonly ImportStagingRowDTO[] {
  const batch = input.repository.getImportBatch(input.batchId);
  if (batch === undefined) throw new Error('ImportBatchNotFound');
  const rows = input.repository.listImportRows(batch.batchId);
  if (batch.status === 'Completed') return rows;

  let failedCount = 0;
  const finalRows = rows.map((row): ImportStagingRowDTO => {
    if (row.validationStatus === 'Invalid' && row.commitStatus === 'Pending') {
      return { ...row, commitStatus: 'Skipped' };
    }
    if (row.validationStatus !== 'Valid' || row.commitStatus !== 'Pending') return row;

    const parsed = parseCatalogImportCreateRequest(row.payload);
    if (!parsed.ok) {
      failedCount += 1;
      return { ...row, commitStatus: 'Failed', errors: [...row.errors, ...parsed.errors] };
    }
    const created = input.catalogImportService.createProduct(parsed.request);
    if (!created.ok) {
      failedCount += 1;
      return { ...row, commitStatus: 'Failed', errors: [...row.errors, created.error.message] };
    }
    return { ...row, commitStatus: 'Committed', sourceObjectId: created.data.product.productId };
  });

  input.repository.saveImportRows(batch.batchId, finalRows);
  input.repository.saveImportBatch({
    ...batch,
    status: failedCount > 0 ? 'Failed' : 'Completed',
    selectionMode: input.selectionMode,
    committedAt: failedCount > 0 ? batch.committedAt : input.now().toISOString(),
  });
  return finalRows;
}

function parseCatalogImportCreateRequest(
  payload: Record<string, unknown>,
): { ok: true; request: CatalogCreateProductRequest } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const sku = readTrimmedString(payload, 'sku');
  const name = readTrimmedString(payload, 'name');
  const productCode = readTrimmedString(payload, 'productCode') ?? sku;
  const defaultUnitId = readTrimmedString(payload, 'defaultUnitId') ?? readTrimmedString(payload, 'unit');
  const productType = readCatalogProductType(payload.productType ?? 'Stocked', errors);
  const inventoryMode = readCatalogInventoryMode(payload.inventoryMode, errors);
  const unitPriceVnd = readCatalogMoney(payload.unitPriceVnd, 'unitPriceVnd', errors);

  if (sku === undefined) errors.push('SKU là bắt buộc.');
  if (name === undefined) errors.push('Tên hàng là bắt buộc.');
  if (defaultUnitId === undefined) errors.push('Đơn vị bán là bắt buộc.');

  if (errors.length > 0 || sku === undefined || name === undefined || productCode === undefined || defaultUnitId === undefined) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    request: {
      productCode,
      name,
      productType,
      sku,
      barcode: readTrimmedString(payload, 'barcode'),
      defaultUnitId,
      unitPriceVnd,
      inventoryMode,
      lotTracking: readBoolean(payload.lotTracking),
      serialTracking: readBoolean(payload.serialTracking),
    },
  };
}

function readTrimmedString(payload: Record<string, unknown>, field: string): string | undefined {
  const value = payload[field];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function readCatalogProductType(value: unknown, errors: string[]): ProductType {
  if (typeof value === 'string' && productTypes.includes(value as ProductType)) return value as ProductType;
  errors.push('Loại hàng không hợp lệ.');
  return 'Stocked';
}

function readCatalogInventoryMode(value: unknown, errors: string[]): InventoryMode | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string' && inventoryModes.includes(value as InventoryMode)) return value as InventoryMode;
  errors.push('Chế độ tồn kho không hợp lệ.');
  return undefined;
}

function readCatalogMoney(value: unknown, field: string, errors: string[]): number {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : Number.NaN;
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    errors.push(`Cột ${field} phải là số không âm.`);
    return 0;
  }
  return Math.round(numberValue);
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLocaleLowerCase('vi-VN');
  if (['true', '1', 'yes', 'y', 'có'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'không'].includes(normalized)) return false;
  return undefined;
}

function normalizeCatalogImportLookup(value: string): string {
  return value.trim().toLocaleUpperCase('vi-VN');
}

function requireScope(
  actor: ActorContextDTO,
  scope: { branchId?: string; warehouseId?: string },
): OperationsServiceResult<never> | undefined {
  if (scope.branchId !== undefined && !actor.scope.branchIds.includes(scope.branchId)) {
    return failure<never>('SCOPE_DENIED', 'Bạn không có quyền truy cập chi nhánh này.');
  }
  if (scope.warehouseId !== undefined && !actor.scope.warehouseIds.includes(scope.warehouseId)) {
    return failure<never>('SCOPE_DENIED', 'Bạn không có quyền truy cập kho này.');
  }
  return undefined;
}

function lastSegment(value: string): string {
  const parts = value.split('-');
  return parts[parts.length - 1] ?? '1';
}

function createNextPartition(
  active: OperationsPartitionRecord,
  deps: Pick<OperationsServiceDependencies, 'now' | 'newId'>,
): OperationsPartitionRecord {
  const nextKey = active.partitionKey.endsWith('P01')
    ? active.partitionKey.replace(/P01$/, 'P02')
    : `${active.partitionKey}-NEXT`;
  return {
    partitionId: deps.newId('partition'),
    storageRole: active.storageRole,
    partitionKey: nextKey,
    status: 'Active',
    activeFrom: deps.now().toISOString().slice(0, 10),
    capacityPct: 0,
    readOnly: false,
    rowCount: 0,
  };
}

function stripRowCount(partition: OperationsPartitionRecord) {
  return {
    partitionId: partition.partitionId,
    storageRole: partition.storageRole,
    partitionKey: partition.partitionKey,
    status: partition.status,
    activeFrom: partition.activeFrom,
    closedAt: partition.closedAt,
    archivedAt: partition.archivedAt,
    capacityPct: partition.capacityPct,
    readOnly: partition.readOnly,
  };
}

function stableChecksum(value: unknown): string {
  const json = stableStringify(value);
  let hash = 0;
  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 31 + json.charCodeAt(index)) >>> 0;
  }
  return `checksum-${hash.toString(16)}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function failure<T>(code: ApiErrorCode, message: string): OperationsServiceResult<T> {
  return { ok: false, error: { code, message } };
}
