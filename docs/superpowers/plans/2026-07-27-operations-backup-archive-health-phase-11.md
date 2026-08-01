# Operations, Backup, Archive & Health Phase 11 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai baseline vận hành dài hạn cho import, attachment, backup/restore, partition/archive, runtime TTL cleanup và health/capacity để ứng dụng có câu chuyện dữ liệu đủ an toàn cho khách mua một lần. Audit delivery/search trong bản kế hoạch gốc đã bị superseded bởi ADR 0017; baseline không lưu audit riêng.

**Architecture:** Operations là bounded context riêng trong `apps-script/src/services/operations/`, sở hữu runtime/evidence records và không ghi trực tiếp ledger/domain source-of-truth. Shared contracts/schemas định nghĩa operation API; repository in-memory là seam test/local, sau này thay bằng Sheet/Drive adapter. API composition chỉ expose command/query qua single RPC gateway, mọi quyền/scope vẫn do backend kiểm tra.

**Tech Stack:** TypeScript shared contracts/schemas, Zod, Google Apps Script service/repository seam, single RPC API gateway, React local fake backend.

## Global Constraints

- Tuân thủ `SRS-OVR-009`, `SRS-OVR-010`, `SRS-OVR-011`, `SRS-OVR-021`, `SRS-OVR-023`, `SRS-OVR-024`.
- Tuân thủ `SRS-ACC-005`, `SRS-ACC-006`, `SRS-ACC-008`, `SRS-ACC-015`, `SRS-ACC-016`, `SRS-ACC-018`.
- Tuân thủ ADR `0006`, `0007`, `0017`: customer-owned deployment, manifest-first backup, replacement-resource restore và không lưu audit nghiệp vụ riêng.
- Không public Drive URL; download/export/attachment chỉ trả metadata hoặc token nội bộ đã được backend xác thực.
- Restore không overwrite production; chỉ `restore.switch` mới đổi active runtime config sau prepare/health check.
- Worker/import/export/backup/archive không giữ ScriptLock hoặc cạnh tranh POS fast path trong baseline.
- Runtime TTL cleanup chỉ xóa technical expired data; không xóa business/ledger/document history.

---

## File Structure

- `shared/contracts/operations/operations.ts`: DTO import, attachment, backup/restore, partition/archive, health và worker run.
- `shared/schemas/operations/operations.ts`: Zod parser cho request Phase 11.
- `apps-script/src/repositories/operations/operations-repository.ts`: in-memory store cho ImportBatch, ImportStagingRow, AttachmentMetadata, BackupRun, RestoreRun, PartitionRuntime, HealthCheck, CapacityAlert và runtime technical records.
- `apps-script/src/services/operations/operations-service.ts`: use case, state transition, idempotency baseline, manifest checksum, permission/scope filtering cơ bản.
- `apps-script/src/bootstrap/create-api-composition.ts`: wire operations service vào single RPC gateway.
- `web/src/lib/api/local-fake-backend.ts`: local fake operations responses để UI/test chạy local.
- `apps-script/src/services/platform/registry/table-registry.ts`: bổ sung table definitions operations còn thiếu.
- Tests:
  - `tests/shared/operations-contracts.test.ts`
  - `tests/apps-script/operations/operations-service.test.ts`
  - `tests/apps-script/operations/operations-composition.test.ts`
  - update `tests/web/local-fake-backend.test.ts`

## Task 1: Shared operations contracts and schemas

**Files:**
- Create: `shared/contracts/operations/operations.ts`
- Create: `shared/schemas/operations/operations.ts`
- Modify: `shared/contracts/platform/operations.ts`
- Test: `tests/shared/operations-contracts.test.ts`

**Interfaces:**
- Produces request/response DTOs and parser functions consumed by API composition and local fake backend.

- [x] Add failing tests that assert operation registration and parser behavior for import validate/commit, attachment complete/download, backup request, restore prepare/switch, health check, partition capacity and runtime cleanup. Audit operation checks were removed by ADR 0017.
- [x] Implement DTOs:
  - `ImportTemplateRequest/Response`
  - `ImportUploadRequest/Response`
  - `ImportValidateRequest/Response`
  - `ImportCommitRequest/Response`
  - `AttachmentUploadRequest`, `AttachmentCompleteRequest`, `AttachmentAccessRequest`, `AttachmentMetadataDTO`
  - `BackupRequest/Response`, `BackupListResponse`
  - `RestorePrepareRequest/Response`, `RestoreSwitchRequest/Response`
  - `HealthCheckRequest/Response`
  - `PartitionCapacityRequest/Response`, `RuntimeCleanupRequest/Response`
- [x] Implement Zod parsers with required fields, enum validation and array shape validation.
- [x] Register operation names/actions:
  - `operations.import.template`
  - `operations.import.upload`
  - `operations.import.validate`
  - `operations.import.commit`
  - `operations.attachment.upload`
  - `operations.attachment.list`
  - `operations.attachment.complete`
  - `operations.attachment.download`
  - `operations.attachment.delete`
  - `operations.backup.request`
  - `operations.backup.list`
  - `operations.restore.prepare`
  - `operations.restore.switch`
  - `operations.health.check`
  - `operations.partition.ensureNext`
  - `operations.runtime.cleanupExpired`
- [x] Run `npm test -- tests/shared/operations-contracts.test.ts`.

## Task 2: Operations repository and service

**Files:**
- Create: `apps-script/src/repositories/operations/operations-repository.ts`
- Create: `apps-script/src/services/operations/operations-service.ts`
- Test: `tests/apps-script/operations/operations-service.test.ts`

**Interfaces:**
- Consumes shared operations DTOs.
- Produces `createOperationsService()` used by API composition and local fake backend parity.

- [x] Add failing tests:
  - Import validation returns row-level errors and `ValidRowsOnly` commit is idempotent by `batchId/rowKey`.
  - Attachment upload writes through private attachment storage; download returns no public URL and denies branch/warehouse outside actor scope.
  - Backup manifest includes app/schema version, partitions, row counts and deterministic checksum.
  - Restore prepare freezes writes and switch creates replacement config marker and health result.
  - Partition ensure-next creates next partition before capacity threshold breach.
  - Runtime cleanup removes only expired technical records and keeps business evidence.
- [x] Implement repository clone-safe in-memory maps/lists.
- [x] Implement baseline service state transitions:
  - Import: `Uploaded -> AwaitingConfirmation|FailedValidation -> Completed`
  - Attachment: `Available|Unavailable|Deleted`
  - Backup: `Requested -> Running -> Completed|Failed`
  - Restore: `Prepared -> Switched|Failed`
  - Partition: active capacity alert and next active partition creation
- [x] Implement checksum using deterministic JSON + simple stable hash; no crypto dependency required for baseline tests.
- [x] Implement actor scope guard helpers for branch/warehouse where records carry scope.
- [x] Implement `AttachmentStorage` seam so production can write/read/trash uploaded content in private Google Drive while service persists only metadata.
- [x] Run `npm test -- tests/apps-script/operations/operations-service.test.ts`.

## Task 3: API composition and local fake backend

**Files:**
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Test: `tests/apps-script/operations/operations-composition.test.ts`
- Test update: `tests/web/local-fake-backend.test.ts`

**Interfaces:**
- Consumes parser functions from Task 1 and `operationsService` from Task 2.

- [x] Add failing composition tests that invoke operations through the single RPC gateway with session and action authorization.
- [x] Wire operations service dependencies in `createApiComposition()`.
- [x] Register handlers for all Phase 11 operation names.
- [x] Add local fake backend handlers with same response shape and no public Drive URL, including `operations.attachment.upload/list/delete/download`.
- [x] Run `npm test -- tests/apps-script/operations/operations-composition.test.ts tests/web/local-fake-backend.test.ts`.

## Task 4: TableRegistry and operational table definitions

**Files:**
- Modify: `apps-script/src/services/platform/registry/table-registry.ts`
- Test update: `tests/apps-script/platform/table-registry.test.ts`

**Interfaces:**
- Produces registry definitions required by future Sheet adapters.

- [x] Add failing registry expectations for `ImportBatch`, `ImportStagingRow`, `ExportRun`, `BackgroundRun`, `HealthCheck`, `CapacityAlert`, `AttachmentMetadata`, `BackupRun`, `RestoreRun`, `ReportProjectionState`. `AuditLog` registry expectation was removed by ADR 0017.
- [x] Implement table definitions matching `docs/data-model/tables/operations-reporting.md`.
- [x] Run `npm test -- tests/apps-script/platform/table-registry.test.ts`.

## Task 5: Tracking, verification and remaining gaps

**Files:**
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`
- Modify: this plan file

**Interfaces:**
- Produces accurate checklist state for the next session.

- [x] Run targeted tests for operations/shared/composition/local fake/registry.
- [x] Run `npm run verify`.
- [x] Tick only completed Phase 11 checklist items.
- [x] Record remaining gaps if any: scheduled trigger runner, physical replacement resources, full UI Owner operations screen.

## Remaining gaps after Phase 11 baseline

- Attachment private Drive lifecycle baseline đã có `DriveGateway.savePrivateAttachment/readPrivateAttachment/trashPrivateAttachment()`; `operations.attachment.upload/list/delete/download` kiểm quyền/scope, logical delete và không public URL. Sales/Warranty/Expense UI tích hợp attachment theo source object vẫn là scope của domain UI/feature tương ứng.
- Scheduled trigger/worker runner cho import/export/audit/backup/archive; baseline hiện chạy synchronous qua service/local fake.
- Backup retention 30 newest daily và manifest file thật trên Drive.
- Restore physical replacement resources, Owner switch gắn runtime config thật, revoke active sessions thật và restore drill.
- Full archive close/read-only routing và archived partition query routing.
- Owner/admin UI cho import, backup/restore, health, capacity và audit operations.
