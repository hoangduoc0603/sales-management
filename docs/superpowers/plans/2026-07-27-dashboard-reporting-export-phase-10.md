# Dashboard, Reporting & Export Phase 10 Implementation Plan

> **For agentic workers:** Use TDD and execute task-by-task. Only tick checkboxes after targeted verification passes.

**Goal:** Triển khai nền Reporting backend cho Sales Dashboard và export baseline mà không cạnh tranh POS fast path.

**Architecture:** Reporting đọc projection/query model đã chuẩn bị, không scan ledger/document toàn kỳ khi mở dashboard. Backend trả metadata `generatedAt`, `asOf`, `partitionCoverage`, `archiveIncluded` và loại bỏ field sensitive trước khi response/export nếu actor thiếu quyền.

**Tech Stack:** TypeScript shared contracts/schemas, Apps Script service/repository in-memory seam, single RPC API gateway, React Dashboard UI nối với Approved Open Design artifact khi artifact lấy được.

## Global Constraints

- Tuân thủ `docs/product/srs/access-reporting.md` `SRS-ACC-003`, `SRS-ACC-007`, `SRS-ACC-009`, `SRS-ACC-010`.
- Tuân thủ `docs/architecture/modules/administration-reporting-operations.md` §4: query envelope, scope intersection, projection metadata, drill-down token revalidation.
- Không implement UI Dashboard nếu không lấy được artifact `app-shell-dashboard.html` qua Open Design.
- Không dùng Audit Log làm nguồn “Hoạt động gần đây”.

---

## Task 1: Reporting shared contracts and schemas

**Files:**
- Create: `shared/contracts/reporting/reporting.ts`
- Create: `shared/schemas/reporting/reporting.ts`
- Modify: `shared/contracts/platform/operations.ts`
- Test: `tests/shared/reporting-contracts.test.ts`

- [x] Add failing tests for operation registration, dashboard request, report query envelope and export request validation.
- [x] Implement DTOs: dashboard request/response, metadata, KPI, chart, decision queue, manual order queue, report query and export run.
- [x] Implement Zod parsers.
- [x] Register reporting operations.
- [x] Run `npm test -- tests/shared/reporting-contracts.test.ts`.

## Task 2: Reporting repository and service

**Files:**
- Create: `apps-script/src/repositories/reporting/reporting-repository.ts`
- Create: `apps-script/src/services/reporting/reporting-service.ts`
- Test: `tests/apps-script/reporting/reporting-service.test.ts`

- [x] Add failing tests for dashboard projection read, metadata coverage, sensitive COGS/profit removal and export run small/large routing.
- [x] Implement in-memory projection repository and service.
- [x] Implement `getSalesDashboard`, `queryReport`, `requestExport`, `getExportRun`.
- [x] Run `npm test -- tests/apps-script/reporting/reporting-service.test.ts`.

## Task 3: API composition and local fake backend

**Files:**
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Test: `tests/apps-script/reporting/reporting-composition.test.ts`
- Test: `tests/web/local-fake-backend.test.ts`

- [x] Add failing tests for `reporting.dashboard.get`, `reporting.report.query`, `reporting.export.request`, `reporting.export.getStatus`.
- [x] Wire API operations through authorization/action registry.
- [x] Add local fake responses with dashboard metadata and no sensitive values by default.
- [x] Run targeted API/local fake tests.

## Task 4: Dashboard UI gate

**Files:**
- Potential modify: `web/src/features/dashboard/dashboard-home.tsx`
- Test: `tests/web/sales-management-app.test.ts`

- [x] Retry Open Design connection and fetch `app-shell-dashboard.html`.
- [x] Previous blocker resolved: Open Design artifact is available again.
- [x] Connect Dashboard UI to `reporting.dashboard.get` while following Approved handoff.
- [x] Run `npm test -- tests/web/sales-management-app.test.ts`.

## Task 5: Verification and tracking

**Files:**
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`

- [x] Run `npm run verify`.
- [x] Tick only completed Phase 10 checklist items.
- [x] Record remaining gaps: worker-backed export and drill-down token full resolver are not implemented in this slice.
