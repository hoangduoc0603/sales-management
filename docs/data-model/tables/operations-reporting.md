# Table Dictionary — Administration, Reporting và Operations

**Trạng thái:** Đã hoàn thiện LLD  
**Nguồn:** [LLD Administration–Reporting–Operations](../../architecture/modules/administration-reporting-operations.md), [Sheet schema](../sheet-schema-and-registry.md), `SRS-ACC-001` đến `SRS-ACC-018`

Các bảng có base columns của registry (`id`, `tenantId`, `schemaVersion`, `recordVersion`, lifecycle time/actor, `commandId` khi mutation). Credential verifier, password, pepper, opaque session token, public Drive URL và raw error không được xuất hiện trong bất kỳ Sheet nào.

## 1. Core Data — organization, access và configuration

| Table | Lifecycle / storage | Cột typed chính | JSON/versioned và quy tắc |
| --- | --- | --- | --- |
| `Tenant` | master / core | `tenantId`, `displayName`, `status`, `timezone`, `appVersion`, `activeConfigVersionId` | business profile; một tenant per deployment. |
| `Branch` | master / core | `branchId`, `branchCode`, `name`, `status`, `address`, `phone`, `taxCode` | print/profile snapshot source; deactivate, never hard delete. |
| `Warehouse` | master / core | `warehouseId`, `branchId`, `warehouseCode`, `name`, `status`, `directSaleEnabled`, `negativeStockPolicy`, `lotTrackingDefault`, `serialTrackingDefault` | approval/min-stock policy; immutable `branchId` after reference. |
| `User` | master / core | `userId`, `loginIdNormalized`, `displayName`, `status`, `authVersion`, `lockedUntil`, `lastLoginAt` | contact/profile only; no credential material. |
| `Role` | master / core | `roleId`, `name`, `status`, `isSystemRole`, `version` | description. |
| `RolePermission` | master / core | `rolePermissionId`, `roleId`, `resource`, `action`, `sensitiveCapability`, `status` | no wildcard that bypasses backend scope. |
| `UserRole` / `UserScope` | master / core | IDs, `userId`, `roleId` or `scopeType`, `scopeId`, `status`, `effectiveFrom`, `effectiveTo` | `scopeType` is `tenant|branch|warehouse`; history retained. |
| `TenantConfigVersion` | master/versioned / core | `configVersionId`, `configType`, `effectiveFrom`, `effectiveTo`, `status`, `publishedBy` | policy/numbering/VAT/payment/print/approval data; half-open effective interval. |

`loginIdNormalized` is tenant-unique and revalidated under command lock. `User` records remain for historical actor display. Branch/Warehouse scope and status are typed lookup fields, so authorization never derives scope from display names.

## 2. Runtime Data — session, command and background work

| Table | Lifecycle / storage | Cột typed chính | JSON/versioned và retention |
| --- | --- | --- | --- |
| `SessionMetadata` | runtime / runtime | `sessionId`, `sessionFingerprint`, `userId`, `authVersion`, `issuedAt`, `idleExpiresAt`, `absoluteExpiresAt`, `lastSeenAt`, `revokedAt`, `status` | scope/permission snapshot hash only; TTL after revoke/expiry. |
| `ImportBatch` | runtime/evidence / runtime | `batchId`, `importType`, `schemaVersion`, `actorId`, `scopeKey`, `status`, `rowCount`, `validCount`, `invalidCount`, `selectionMode`, `committedAt` | source file metadata, actor metadata, error/result manifest; preserved per retention policy. |
| `ImportStagingRow` | runtime / runtime | `stagingRowId`, `batchId`, `rowNumber`, `rowKey`, `validationStatus`, `errorCount`, `commitStatus`, `sourceObjectId` | sanitized parsed payload and validation errors; unique `(batchId,rowKey)`, TTL only after retained result window. |
| `ExportRun` | runtime/evidence / runtime | `exportRunId`, `reportId`, `actorId`, `scopeFingerprint`, `status`, `requestedAt`, `startedAt`, `completedAt`, `expiresAt`, `fileId`, `rowCount`, `runId` | frozen filter/column/as-of manifest; file is private and cleanup is idempotent. |
| `BackgroundRun` | runtime / runtime | `runId`, `jobType`, `status`, `attempt`, `leaseUntil`, `checkpointKey`, `startedAt`, `endedAt`, `errorCode` | sanitized progress/checkpoint; bounded retry and TTL. |
| `HealthCheck` / `CapacityAlert` | runtime/telemetry / runtime | IDs, `checkType`/`alertType`, `status`, `observedAt`, `resourceKey`, `threshold`, `observedValue`, `acknowledgedAt` | no secret/raw Google exception; history retained to operational policy. |

`CommandTransaction`, partition registry and `SchemaMigration` remain platform tables specified by [Sheet schema](../sheet-schema-and-registry.md). A domain import uses the single canonical `ImportBatch`/`ImportStagingRow`, not a duplicate table per module.

## 3. Transaction Data — files, backup and restore

| Table | Lifecycle / storage | Cột typed chính | JSON/versioned và routing |
| --- | --- | --- | --- |
| `AttachmentMetadata` | document / transaction | `attachmentId`, `partitionKey`, `objectType`, `objectId`, `branchId`, `warehouseId`, `driveFileId`, `fileName`, `mimeType`, `sizeBytes`, `checksum`, `status`, `uploadedBy`, `uploadedAt`, `deletedAt` | access classification/version metadata; logical delete/unavailable preserves source reference; Drive file stays private and API never stores/returns public URL. |
| `BackupRun` | document/evidence / transaction | `backupRunId`, `status`, `requestedBy`, `startedAt`, `completedAt`, `manifestFileId`, `appVersion`, `schemaVersion`, `checksum`, `retentionUntil` | manifest with partition/resource/attachment metadata; 30 newest daily retained. |
| `RestoreRun` | document/evidence / transaction | `restoreRunId`, `backupRunId`, `status`, `requestedBy`, `preparedAt`, `switchedAt`, `oldConfigVersion`, `newConfigVersion`, `healthResult` | verification/freeze/replacement/switch evidence; never points to overwritten production. |
| `ReportProjectionState` | projection / transaction | `projectionId`, `reportId`, `branchId`, `warehouseId`, `dateBucket`, `asOf`, `sourcePartitionKey`, `buildVersion`, `status` | aggregate values/snapshot hash only; rebuildable from source ledger/document. |

`AttachmentMetadata` follows its source document partition. `ReportProjectionState` never replaces ledger truth and stores only dimensions/metrics permitted for its projection class; sensitive values remain backend permission-gated. Actor metadata lives on the source record itself.

## 4. Lookup, integrity và migration

- Hot access lookup: `loginIdNormalized`, active `UserRole`/`UserScope`, `sessionFingerprint`, `batchId`, `runId`, `eventId`, `objectId` plus partition key. Reports use date/Branch/Warehouse projection keys; no whole-history Sheet scan on dashboard/POS path.
- One command changing access/config writes the master version, actor metadata and `CommandTransaction` in one commit. Session cache invalidation occurs after commit and before success response.
- File IDs/config resource IDs are opaque metadata and never client authority. Server checks current object permission/scope again before file download, export download, report drill-down or restore switch.
- All new columns are append-only migrations; state/enum expansion requires parser backward compatibility. Runtime cleanup may remove only expired technical rows/files after their evidence retention period, never ledger/business document history.
