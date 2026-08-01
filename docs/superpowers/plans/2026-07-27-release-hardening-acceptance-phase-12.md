# Release Hardening & Acceptance Phase 12 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển baseline đã code qua các phase 1-11 thành release có thể nghiệm thu, benchmark, triển khai trên Google account khách và vận hành theo yêu cầu bán một lần.

**Architecture:** Phase 12 không mở rộng nghiệp vụ mới trước khi khóa release readiness. Trọng tâm là kiểm chứng cross-domain, lấp gap production adapter/worker/deployment, chứng nhận performance POS, chạy migration/backup/restore drill và tạo runbook giao khách. Mọi thay đổi code vẫn giữ ranh giới `web -> shared -> apps-script services -> repositories -> infrastructure`; backend Google Workspace adapter là nơi duy nhất gọi Apps Script API thật.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Google Apps Script, Google Sheets, Google Drive, clasp, Vitest, ESLint, local fake backend, Apps Script artifact build.

## Global Constraints

- Tài liệu và thông điệp nghiệp vụ mặc định viết bằng tiếng Việt.
- Trước mọi task code phải đọc `AGENTS.md`, `docs/architecture/folder-structure.md`, `docs/architecture/lld-traceability-review.md`, `docs/architecture/detailed-design.md` và tài liệu domain liên quan.
- Thứ tự ưu tiên khi có mâu thuẫn: SRS -> ADR Accepted -> Solution/System Design -> LLD/data dictionary -> design handoff -> Open Design artifact -> code hiện có.
- Không tự thay đổi requirement, state machine, permission, source of truth, ledger, schema vật lý, partition/lifecycle hoặc performance policy trong lúc hardening.
- POS là luồng hiệu năng trọng yếu: scan/search/cart chạy từ browser cache; checkout là command backend có idempotency, fresh-read và commit ngắn.
- Không hard-code Spreadsheet ID, Sheet name, header index, Drive folder ID, row number hoặc secret.
- Mọi release ảnh hưởng POS phải có benchmark theo `SRS-OVR-024`; report/export/import/backup/archive không được cạnh tranh POS fast path.
- UI chỉ được nghiệm thu từ `docs/design/open-design-registry.md` và handoff `Approved`; không code hoặc đánh giá UI production dựa trên screenshot.

---

## Initial Release Readiness Audit — 2026-07-27

### Kết luận ngắn

Baseline hiện đã có nhiều contract/service/repository in-memory, API composition, local fake backend và UI shell. Tuy nhiên release sellable chưa thể coi là sẵn sàng vì phần production Google Workspace adapter, worker thật, backup/restore drill, archive routing, POS performance benchmark và một số checklist nghiệp vụ trọng yếu vẫn còn mở ở master plan.

### Gap nhóm P0 — chặn release bán được

| Nhóm | Gap | Nguồn |
| --- | --- | --- |
| Persistence production | Hầu hết repository domain hiện là in-memory seam; chưa có SheetGateway/TableLocator/DriveGateway production đủ để tenant dùng dữ liệu thật lâu dài. | `SRS-OVR-003`, `SRS-OVR-008`, `SRS-OVR-023`, `sheet-schema-and-registry.md` |
| POS acceptance | Master checklist còn mở orchestration đầy đủ Sales -> Catalog -> Inventory -> Finance -> CRM, revalidate toàn bộ guard, receipt snapshot/in, timeout recovery và benchmark. Tracking Phase 7 đã có baseline nhưng cần audit code bằng acceptance tests end-to-end. | Phase 7 master, `SRS-OVR-004`, `SRS-OVR-013`, `runtime-and-performance.md` |
| Backup/restore | Phase 11 mới có baseline manifest/switch marker; chưa có Drive backup package, retention 30 bản, replacement-resource restore thật, revoke sessions thật và restore drill. | `SRS-OVR-010`, ADR 0007 |
| Worker thật | Audit delivery, import chunk, export large, backup, archive, rebuild/reconcile, runtime cleanup và health/capacity cần scheduled trigger/BackgroundRun/checkpoint/retry thật. | `SRS-OVR-021`, LLD Admin–Reporting–Operations §5 |
| Deployment/migration | Chưa có fresh tenant/upgrade tenant dry-run với backup bắt buộc, maintenance mode khi migration ảnh hưởng ghi, release runbook và customer installation checklist. | `SRS-OVR-023`, ADR 0006 |
| Security release review | Cần chứng minh password/token không log/export, scope không bypass, sensitive fields bị loại tại backend, session revoke khi reset/disable/role/scope change. | `SRS-OVR-005..008`, LLD test matrix |

### Gap nhóm P1 — cần chốt trong sellable baseline hoặc tách thành known limitation có kiểm soát

| Phase | Gap còn mở | Nhận định release |
| --- | --- | --- |
| Phase 2 | Reset password/disable/role change revoke session test. | Cần có trước release vì liên quan security. |
| Phase 4 | Price/promotion stale conflict cho checkout. | Cần có nếu POS dùng pricing/promotion cache. |
| Phase 5 | Opening balance/import-safe flow, lot FEFO/serial guard, transfer/stocktake, concurrency/performance matrix. | Opening balance và stocktake gần như bắt buộc để cửa hàng bắt đầu dùng; lot/serial/transfer có thể bật theo cấu hình nhưng phải có guard rõ nếu UI cho phép. |
| Phase 6 | CashDrawer/PaymentMethod master, receivable/payable aging projection. | PaymentMethod/CashDrawer cần cho POS thực tế; aging projection cần cho công nợ bán được. |
| Phase 8 | Deposit credit/refund khi hủy đơn có đặt cọc; attachment Drive flow; CRM policy reversal đầy đủ. | Cần ít nhất policy rõ và test nếu cho nhận cọc. |
| Phase 10 | Archive coverage partial, drill-down token revalidates permission, worker-backed export không giữ ScriptLock. | Cần cho báo cáo/export production và bảo mật dữ liệu nhạy cảm. |
| Phase 11 | Import worker/chunk, attachment private Drive, backup retention, restore replacement, archive read-only routing. | Cần cho vận hành dài hạn; audit delivery đã superseded bởi ADR 0017. |

### Decision points cần user duyệt trong Phase 12

1. **Sellable baseline scope:** bản bán đầu có bắt buộc hỗ trợ lot/serial, chuyển kho, kiểm kê đầy đủ hay ghi là “đang khóa UI/không bật cho tenant nhỏ” cho đến khi implement xong?
2. **Production adapter cutover:** triển khai Sheet/Drive adapter thật toàn bộ domain ngay, hay làm theo lát cắt sellable trước: Platform/Auth/Config + Catalog/CRM + Inventory/Finance/Sales/POS + Reporting/Operations?
3. **Restore drill environment:** dùng một Apps Script test deployment riêng trên Google account khách/test account nào để chạy drill thật; `.clasp.json` không được commit.

## File Structure

- `docs/superpowers/plans/2026-07-27-release-hardening-acceptance-phase-12.md`: plan Phase 12 và audit release readiness.
- `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`: master tracking Phase 12 và trạng thái các phase.
- `scripts/release-readiness.mjs`: script kiểm tra checklist/gap release bằng dữ liệu trong repository.
- `tests/release/release-readiness.test.ts`: test rule phân loại gap và điều kiện chặn release.
- `tests/performance/pos-performance.test.ts`: benchmark harness POS cache/checkout ở môi trường Node/local fake.
- `tests/apps-script/platform/google-workspace-adapter.test.ts`: contract test cho Sheet/Drive/Properties/Lock adapter seam, dùng fake Apps Script globals.
- `apps-script/src/repositories/platform/sheet-record-repository.ts`: primitive append-only repository đọc/append typed records qua `SheetGateway`, dùng `TableDefinitionDTO` và partition key thay vì hard-code Sheet/header.
- `tests/apps-script/platform/sheet-record-repository.test.ts`: contract test cho primitive repository production seam, gồm defensive copy, primary key bắt buộc và duplicate guard.
- `tests/apps-script/platform/command-sheet-repository.test.ts`: contract test cho `createSheetCommandRepository`, lưu command journal dạng append-only version và query latest outcome.
- `apps-script/src/bootstrap/create-production-platform-repositories.ts`: factory wiring production cho platform repositories dùng `SheetGateway`, `TableDefinitionDTO[]` và active transaction partition.
- `tests/apps-script/platform/production-platform-repositories.test.ts`: contract test cho wiring factory, gồm fail-fast khi thiếu table definition.
- `tests/apps-script/catalog/catalog-sheet-repository.test.ts`: contract test cho `createSheetCatalogRepository`, ghi/đọc Product, Variant, VariantBarcode và UnitConversionVersion qua `SheetGateway` để phục vụ POS projection.
- `tests/apps-script/inventory/inventory-sheet-repository.test.ts`: contract test cho `createSheetInventoryRepository`, append InventoryMovement bất biến và lưu InventoryBalance projection dạng versioned qua `SheetGateway`.
- `tests/apps-script/finance/finance-sheet-repository.test.ts`: contract test cho `createSheetFinanceRepository`, ghi/đọc Shift, Payment, CashTransaction, PaymentAllocation, Obligation và finance master tối thiểu qua `SheetGateway`.
- `tests/apps-script/sales/sales-sheet-repository.test.ts`: contract test cho `createSheetSalesRepository`, ghi/đọc SaleOrder, line/tender replacement set, ReceiptSnapshot, SaleReturn/SaleReturnLine và WarrantyCase qua `SheetGateway`.
- `tests/apps-script/operations/operations-sheet-repository.test.ts`: contract test cho `createSheetOperationsRepository`, ghi/đọc ImportBatch/rows, AttachmentMetadata, BackgroundRun, BackupRun, RestoreRun, PartitionRegistry, HealthCheck, CapacityAlert và RuntimeRecord qua `SheetGateway`.
- `tests/apps-script/crm/customer-sheet-repository.test.ts`: contract test cho `createSheetCustomerRepository`, ghi/đọc Customer versioned và lookup phone/email normalized active qua `SheetGateway`.
- `tests/apps-script/purchasing/purchasing-sheet-repository.test.ts`: contract test cho `createSheetPurchasingRepository`, ghi/đọc Supplier, PurchaseOrder/Line, GoodsReceipt/Line, LandedCostAdjustment, PurchaseCostVariance, SupplierReturn/Line qua `SheetGateway`.
- `tests/apps-script/reporting/reporting-sheet-repository.test.ts`: contract test cho `createSheetReportingRepository`, ghi/đọc DashboardProjection, ReportRow replacement set và ReportingExportRun qua `SheetGateway`.
- `tests/apps-script/platform/production-repositories.test.ts`: contract test cho `createProductionRepositories`, wiring các repository sheet-backed đã cutover vào cùng `SheetGateway` và transaction partition.
- `tests/apps-script/release/acceptance-flow.test.ts`: acceptance tests cross-domain cho bootstrap -> POS -> return -> purchasing -> dashboard -> backup/restore baseline.
- `tests/apps-script/operations/import-commit-worker.test.ts`: worker test cho ImportBatch `Committing`, commit staging rows theo chunk và retry không duplicate source object.
- `tests/apps-script/operations/archive-worker.test.ts`: worker test cho archive closed transaction partition theo chunk, read-only routing và retry idempotency.
- `tests/apps-script/reporting/reporting-export-worker.test.ts`: worker test cho ReportingExportRun routing `LargeWorker`, hoàn tất export run với row count và fileId idempotent.
- `tests/apps-script/reporting/reporting-service.test.ts`: thêm coverage cho `reporting.drillDown.resolve`, revalidate scope và sensitive-field filtering theo quyền hiện tại của actor.
- `tests/apps-script/reporting/reporting-composition.test.ts`: kiểm drill-down resolver đi qua single API gateway với parser và permission `reporting.report.view`.
- `tests/apps-script/reporting/reporting-partition-coverage.test.ts`: kiểm report query coverage `Partial` khi date range chạm archived partition mà chưa include archive, và `Complete` khi include archive rõ ràng.
- `docs/architecture/release-hardening.md`: kết quả readiness audit có thể đọc độc lập ngoài implementation plan.
- `docs/architecture/deployment-runbook.md`: runbook triển khai/customer installation checklist.

## Task 1: Release readiness audit artifact and gating script

**Files:**
- Create: `scripts/release-readiness.mjs`
- Create: `tests/release/release-readiness.test.ts`
- Create: `docs/architecture/release-hardening.md`
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`

**Interfaces:**
- Consumes: master implementation plan markdown and Phase 12 initial audit in this file.
- Produces: `collectReleaseReadiness({ rootDir }): ReleaseReadinessResult` in `scripts/release-readiness.mjs`.

- [x] Write failing test `tests/release/release-readiness.test.ts` that asserts P0 gaps are detected from the master plan.

```ts
import { describe, expect, it } from 'vitest';
import { collectReleaseReadiness } from '../../scripts/release-readiness.mjs';

describe('release readiness gate', () => {
  it('marks release blocked while P0 production gaps remain open', () => {
    const result = collectReleaseReadiness({ rootDir: process.cwd() });

    expect(result.status).toBe('Blocked');
    expect(result.p0Gaps.map((gap) => gap.id)).toEqual(
      expect.arrayContaining([
        'production-persistence-adapters',
        'pos-acceptance-benchmark',
        'backup-restore-drill',
        'scheduled-worker-runtime',
        'deployment-migration-drill',
        'security-release-review',
      ]),
    );
  });
});
```

- [x] Run `npm test -- tests/release/release-readiness.test.ts` and verify it fails because `scripts/release-readiness.mjs` does not export `collectReleaseReadiness`.
- [x] Implement `scripts/release-readiness.mjs` with `collectReleaseReadiness({ rootDir })`, returning:

```ts
type ReleaseReadinessResult = {
  status: 'Ready' | 'Blocked';
  p0Gaps: { id: string; title: string; source: string }[];
  p1Gaps: { id: string; title: string; source: string }[];
};
```

- [x] Add `release:readiness` script to `package.json`:

```json
"release:readiness": "node scripts/release-readiness.mjs"
```

- [x] Write `docs/architecture/release-hardening.md` with P0/P1 gap matrix, decision points and required evidence per gate.
- [x] Run `npm test -- tests/release/release-readiness.test.ts`.
- [x] Run `npm run release:readiness`; expected status is `Blocked` until P0 gaps are closed.

## Task 2: Production Google Workspace adapter readiness

**Files:**
- Create: `apps-script/src/infrastructure/google-workspace/sheet-gateway.ts`
- Create: `apps-script/src/infrastructure/google-workspace/drive-gateway.ts`
- Create: `apps-script/src/infrastructure/google-workspace/runtime-config-store.ts`
- Create: `apps-script/src/infrastructure/google-workspace/apps-script-lock-provider.ts`
- Create: `tests/apps-script/platform/google-workspace-adapter.test.ts`
- Modify: `apps-script/src/infrastructure/platform/runtime.ts`

**Interfaces:**
- Consumes: `TableDefinitionDTO`, `PartitionRegistry`, runtime config from `deployment-and-lifecycle.md`.
- Produces:
  - `SheetGateway.readTable(request): TableReadResult`
  - `SheetGateway.appendRows(request): TableWriteResult`
  - `DriveGateway.createTenantFolders(request): TenantFolderManifest`
  - `RuntimeConfigStore.getActiveConfig(): RuntimeConfigDTO`
  - `AppsScriptLockProvider.withLock(operation): T`

- [x] Write failing tests using fake `SpreadsheetApp`, `DriveApp`, `PropertiesService` and `LockService` globals. Tests must assert no hard-coded spreadsheet ID, no header index contract, and no public Drive URL.
- [x] Run `npm test -- tests/apps-script/platform/google-workspace-adapter.test.ts`; expected failure is missing adapter modules.
- [x] Implement adapter seams with dependency-injected Apps Script global wrappers. Do not call adapters from domain services in this task.
- [x] Add serialization helpers for primitive/json cells according to `sheet-schema-and-registry.md`.
- [x] Run adapter tests.
- [x] Run `npm run typecheck && npm run lint`.

**Follow-up evidence — 2026-07-27; updated by ADR 0017:** đã thêm primitive append-only Sheet record repository để domain document/ledger có đường cutover production an toàn qua `SheetGateway`, đồng thời thêm `createSheetCommandRepository` cho command journal append-only và factory `createProductionPlatformRepositories` để wiring repository này bằng active transaction partition. AuditOutbox path trong ghi chú gốc đã bị superseded; baseline dùng actor metadata trên record. Đây chưa đóng P0 `production-persistence-adapters` vì các repository Sales/Catalog/Inventory/Finance/Operations trọng yếu chưa cutover, production Apps Script composition đầy đủ chưa wiring và chưa chạy drill trên Apps Script test project.

**Follow-up evidence — 2026-07-27:** đã thêm `createSheetCatalogRepository` cho Product/Variant/VariantBarcode/UnitConversionVersion, đồng thời bổ sung registry headers POS-critical (`tenantId`, `schemaVersion`, `recordVersion`, `sku`, `unitPriceVnd`, `barcode`, `unitName`) để SheetGateway không làm mất dữ liệu khi POS projection đọc từ Sheets. Đây là domain sellable cutover đầu tiên nhưng P0 vẫn mở vì Inventory/Finance/Sales/Operations repository, production composition wiring và Apps Script test-project drill chưa hoàn tất.

**Follow-up evidence — 2026-07-27:** đã thêm `createSheetInventoryRepository` cho InventoryMovement và InventoryBalance. Movement đi active transaction partition theo append-only ledger; Balance là versioned projection đọc latest theo `warehouseId + variantId`. Đây là domain sellable cutover thứ hai cho POS stock path nhưng P0 vẫn mở vì Finance/Sales/Operations repository, production composition wiring và Apps Script test-project drill chưa hoàn tất.

**Follow-up evidence — 2026-07-27:** đã thêm `createSheetFinanceRepository` cho CashDrawer, PaymentMethod, Shift, Payment, ReceivableLedger, PayableLedger, CustomerCredit, SupplierPrepayment, CashTransaction và PaymentAllocation. CashTransaction/PaymentAllocation là append-only ledger; Shift/Payment/Obligation là versioned latest-read. Đây là domain sellable cutover thứ ba cho POS payment/shift path nhưng P0 vẫn mở vì Sales/Operations repository, production composition wiring và Apps Script test-project drill chưa hoàn tất.

**Follow-up evidence — 2026-07-27:** đã thêm `createSheetSalesRepository` cho SaleOrder, SaleOrderLine, SaleTenderDraft, ReceiptSnapshot, SaleReturn/SaleReturnLine và WarrantyCase. SaleOrder/Receipt/Return/Warranty là versioned latest-read; line/tender/return-line dùng replacement-set version và marker cho set rỗng để draft update không giữ child row cũ. Registry đã bổ sung đầy đủ bảng/headers Sales/POS/Return/Warranty. Đây là domain sellable cutover thứ tư cho POS order/receipt/return path nhưng P0 vẫn mở vì Operations repository, production composition wiring và Apps Script test-project drill chưa hoàn tất.

**Follow-up evidence — 2026-07-27; updated by ADR 0017:** đã thêm `createSheetOperationsRepository` cho ImportBatch, ImportStagingRow, AttachmentMetadata, BackgroundRun, BackupRun, RestoreRun, PartitionRegistry, HealthCheck, CapacityAlert và RuntimeRecord. Metadata có thể cập nhật dùng versioned latest-read; ImportStagingRow/BackupRun retention/RuntimeRecord dùng replacement-set version. AuditLog không còn thuộc baseline. Registry đã bổ sung bảng/headers Operations runtime/evidence. P0 `production-persistence-adapters` vẫn mở cho tới khi production composition wiring và Apps Script test-project drill chứng minh đọc/ghi trên tài nguyên thật.

**Follow-up evidence — 2026-07-27:** đã thêm `createSheetCustomerRepository`, `createSheetPurchasingRepository` và `createSheetReportingRepository`. CRM customer là versioned latest-read với lookup normalized active; Purchasing dùng versioned documents, replacement-set line tables và append-only `PurchaseCostVariance`; Reporting dùng versioned dashboard/export và replacement-set report rows. Registry đã bổ sung bảng/headers CRM/Purchasing/Reporting tương ứng.

**Follow-up evidence — 2026-07-27; updated by ADR 0017:** đã mở rộng `createProductionRepositories` làm aggregate wiring seam cho CommandTransaction, Catalog, CRM, Inventory, Purchasing, Finance, Sales, Reporting và Operations sheet-backed repositories. Factory nhận `SheetGateway`, `TableDefinitionDTO[]` và active transaction partition; test chứng minh các repository route đúng partition và fail-fast khi thiếu bảng trọng yếu. AuditOutbox/audit partition không còn thuộc baseline. P0 vẫn mở vì `createApiComposition` production/runtime config chưa cutover và chưa có Apps Script test-project drill.

## Task 3: Sellable scope audit for unchecked domain gaps

**Files:**
- Create: `docs/architecture/release-scope-baseline.md`
- Create: `tests/release/sellable-scope.test.ts`
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`

**Interfaces:**
- Consumes: unchecked master plan items and SRS IDs.
- Produces: `release-scope-baseline.md` classifying each open item as `MustFixBeforeRelease`, `CanShipDisabled`, or `PostRelease`.

- [x] Write failing test that reads `docs/architecture/release-scope-baseline.md` and asserts every unchecked master item appears exactly once with a classification.
- [x] Run `npm test -- tests/release/sellable-scope.test.ts`; expected failure is missing document.
- [x] Write classification for Phase 2, 4, 5, 6, 7, 8, 10 and 11 gaps listed in the Initial Release Readiness Audit.
- [x] Mark UI-disabled items explicitly; for example, if lot/serial or transfer is not in sellable baseline, document which UI entry point is disabled and which backend operation rejects it.
- [x] Add a `Decision required` section for items requiring user approval.
- [x] Run `npm test -- tests/release/sellable-scope.test.ts`.

## Task 4: Cross-domain acceptance flow harness

**Files:**
- Create: `tests/apps-script/release/acceptance-flow.test.ts`
- Modify: `apps-script/src/bootstrap/create-api-composition.ts` only if composition lacks required operation wiring.
- Modify: domain services only when acceptance tests expose a gap already allowed by SRS/LLD.

**Interfaces:**
- Consumes: `createApiComposition()`, operation names in `shared/contracts/platform/operations.ts`, local/in-memory repositories.
- Produces: executable acceptance tests for release-critical flows.

- [x] Write failing acceptance test `bootstrap -> login -> change password -> load scope -> load POS catalog -> save draft -> complete POS -> query order -> dashboard`.
- [x] Write failing acceptance test for `manual online order -> confirm -> ship -> payment/receivable -> return/refund`.
- [x] Write failing acceptance test for `supplier -> PO -> goods receipt -> payable -> payment allocation`.
- [x] Write failing acceptance test for `backup request -> restore prepare -> restore switch -> health check`.
- [x] Run `npm test -- tests/apps-script/release/acceptance-flow.test.ts`.
- [x] Fix only gaps that are implementation-incomplete against existing SRS/LLD. If a test requires changing state machine or requirement, stop and record a decision point instead of coding.
- [x] Run acceptance tests and existing targeted domain tests.

## Task 5: POS performance benchmark harness

**Files:**
- Create: `tests/performance/pos-performance.test.ts`
- Create: `tests/performance/fixtures/pos-seed.ts`
- Modify: `web/src/features/pos/catalog-cache/*` only if benchmark exposes a regression against existing cache contract.
- Modify: `apps-script/src/services/sales/*` only if checkout benchmark exposes unnecessary I/O or command path regression.

**Interfaces:**
- Consumes: POS catalog cache loader/search helpers, Sales checkout local fake/API composition.
- Produces: repeatable p95/p99 assertions for SRS baseline profile.

- [x] Write failing benchmark test that seeds 10,000 variants and measures scan/search/cart operations in-process.
- [x] Assert browser-local operations meet SRS thresholds under Node benchmark budget:
  - scan/add p95 <= 150 ms
  - search p95 <= 250 ms
  - cart change p95 <= 100 ms
- [x] Add checkout benchmark as an executable local/in-memory service measurement; mark result as local baseline, not Apps Script production evidence.
- [x] Run `npm test -- tests/performance/pos-performance.test.ts`.
- [x] Optimize only measured bottlenecks; do not add caching that changes checkout source-of-truth.
- [x] Add result summary to `docs/architecture/release-hardening.md`.

## Task 6: Security and permission release review

**Files:**
- Create: `tests/apps-script/release/security-review.test.ts`
- Modify: `apps-script/src/services/platform/auth/*`
- Modify: `apps-script/src/services/platform/authorization/*`
- Modify: `apps-script/src/services/reporting/*`
- Modify: `apps-script/src/services/operations/*`

**Interfaces:**
- Consumes: auth/session service, authorization service, reporting sensitive filtering, attachment/export operations.
- Produces: tests proving security release gates.

- [x] Write failing tests for reset password, disable user, role/scope change revoking sessions via `authVersion`.
- [x] Write tests asserting session token/password do not appear in API meta, export payload or error messages.
- [x] Write tests asserting Warehouse scope cannot be bypassed by payload edits.
- [x] Write tests asserting sensitive fields are removed in dashboard/report/export/drill-down resolver when actor lacks permission.
- [x] Run `npm test -- tests/apps-script/release/security-review.test.ts`.
- [x] Implement missing revoke/security behavior inside Platform/Reporting/Operations services.
- [x] Run `npm test -- tests/apps-script/release/security-review.test.ts tests/apps-script/platform/auth-session.test.ts tests/apps-script/reporting/reporting-service.test.ts tests/apps-script/operations/operations-service.test.ts`.

## Task 7: Worker, backup, restore and archive production drill baseline

**Files:**
- Create: `apps-script/src/services/platform/worker/background-runner.ts`
- Create: `apps-script/src/services/operations/backup-restore-worker.ts`
- Create: `apps-script/src/services/operations/archive-worker.ts`
- Create: `tests/apps-script/release/worker-backup-restore.test.ts`
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`

**Interfaces:**
- Consumes: `OperationsRepository`, runtime config store, DriveGateway and SheetGateway from Task 2.
- Produces:
  - `runBackgroundJob(input): BackgroundRunResult`
  - `requestBackup/runBackupChunk`
  - `prepareRestore/runRestoreVerification/switchRestore`
  - `ensureArchiveReadOnlyRouting`

- [x] Write failing tests for BackgroundRun lease/checkpoint/retry budget.
- [x] Write failing tests for daily/manual backup manifest with row count/checksum and 30 newest daily retention.
- [x] Write failing tests for replacement-resource restore: freeze write, verify, Owner switch, session revoke marker, health check.
- [x] Write failing tests for archive read-only routing and historical query partition selection.
- [x] Run `npm test -- tests/apps-script/release/worker-backup-restore.test.ts`.
- [x] Implement worker baseline outside POS fast path; do not hold ScriptLock during Drive/export/backup/archive work.
- [x] Run targeted tests for operations/reporting/platform worker.
- [x] Superseded by ADR 0017: local AuditOutbox delivery worker and scheduled tick wiring are no longer baseline.
- [x] Add local worker-backed ReportingExportRun baseline and scheduled tick wiring.

## Task 8: UI accessibility and approved screen acceptance

**Files:**
- Create: `tests/web/release-ui-acceptance.test.ts`
- Modify: `web/src/features/*` only where current implementation diverges from Approved handoff already implemented.
- Modify: `docs/architecture/release-hardening.md`

**Interfaces:**
- Consumes: `docs/design/open-design-registry.md`, handoff files in `docs/design/screens/`, app shell and feature UI exports.
- Produces: tests and manual checklist for light/dark, keyboard, loading/empty/error/restricted/scope/stale/command states.

- [x] Write tests asserting every Approved handoff has a corresponding route/shell or an explicit `CanShipDisabled` decision in `release-scope-baseline.md`.
- [x] Write tests for keyboard focus on custom Listbox, POS scan input, command buttons and theme toggle.
- [x] Run `npm test -- tests/web/release-ui-acceptance.test.ts`.
- [x] Fix UI implementation only when registry + handoff are `Approved`; if Open Design local preview is unavailable, record manual verification pending instead of guessing visual details.
- [x] Update `docs/architecture/release-hardening.md` with UI acceptance evidence.

## Task 9: Deployment runbook and customer installation checklist

**Files:**
- Create: `docs/architecture/deployment-runbook.md`
- Modify: `.clasp.json.example` only if documented deployment fields are missing.
- Modify: `scripts/deploy-push.mjs` only if safety checks do not match runbook.

**Interfaces:**
- Consumes: `scripts/build.mjs`, `scripts/deploy-push.mjs`, `.clasp.json.example`, `deployment-and-lifecycle.md`.
- Produces: checklist a deployment session can follow without relying on chat context.

- [x] Write runbook sections:
  - prerequisites on customer Google account;
  - create Apps Script project and local `.clasp.json`;
  - run `npm run verify`;
  - push with clasp;
  - run tenant bootstrap;
  - record tenant Drive root/runtime config;
  - create first admin password handoff;
  - run health check;
  - backup before upgrade;
  - emergency restore procedure.
- [x] Ensure runbook states `.clasp.json` and `scriptId` are local-only and never committed.
- [x] Run `node scripts/verify-structure.mjs`.

## Task 10: Final release gate

**Files:**
- Modify: `docs/architecture/release-hardening.md`
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`
- Modify: this plan file

**Interfaces:**
- Consumes: evidence from Tasks 1-9.
- Produces: final release gate status.

- [x] Run `npm run verify`.
- [x] Run `npm run release:readiness`; expected status is `Ready` only when no P0 gap remains.
- [x] Run targeted performance command for POS benchmark.
- [ ] Run deployment dry-run checklist on a test Apps Script project; do not commit `.clasp.json`.
- [ ] Run restore drill and record evidence in `docs/architecture/release-hardening.md`.
- [x] Tick only completed master plan checkboxes with evidence.
- [x] If any P0 remains open, mark release as `Blocked` with exact next task.

## Recommended execution split

Do not implement all Phase 12 tasks in one coding pass. Execute in this order:

1. Task 1 + Task 3: readiness audit/gating and sellable scope decision.
2. Task 2: production Google Workspace adapter seam.
3. Task 4 + Task 6: acceptance/security tests to expose behavior gaps.
4. Task 5: POS performance benchmark.
5. Task 7: worker/backup/restore/archive production baseline.
6. Task 8: UI acceptance.
7. Task 9 + Task 10: deployment runbook and final release gate.

This split keeps each pass reviewable and prevents hardening from turning into uncontrolled feature work.
