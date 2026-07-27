# Tenant Bootstrap & Administration Minimum Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây lát cắt tenant bootstrap và administration tối thiểu để app có tenant, Branch, Warehouse, admin nội bộ, role/permission/scope baseline và cấu hình tenant đầu tiên trước khi triển khai UI/domain nghiệp vụ.

**Architecture:** Phase này mở rộng Platform Core bằng contract `bootstrap`/`administration`, service bootstrap idempotent và in-memory repository seam. Backend Apps Script composition dùng cùng repository để bootstrap admin local/test, còn frontend local fake backend mô phỏng cùng operation contract để chạy Vite local. UI sản phẩm thật, AppShell theo Open Design và quản trị đầy đủ thuộc Phase 3+.

**Tech Stack:** TypeScript, Zod, Vitest, React/Vite local runtime, Google Apps Script type definitions.

## Global Constraints

- Tài liệu và thông điệp nghiệp vụ mặc định viết bằng tiếng Việt.
- Trước mọi task code phải đọc `AGENTS.md`, `docs/architecture/folder-structure.md`, `docs/architecture/lld-traceability-review.md`, `docs/architecture/detailed-design.md`, `docs/product/srs/overview.md`, `docs/product/srs/access-reporting.md`, `docs/architecture/deployment-and-lifecycle.md`, `docs/architecture/modules/administration-reporting-operations.md`, `docs/data-model/tables/operations-reporting.md`.
- Không dùng Google account làm identity ứng dụng; `loginId`/password nội bộ là identity.
- Bootstrap tạo đúng một tenant mặc định, một Branch mặc định và một Warehouse mặc định theo `SRS-OVR-001`.
- Admin mặc định dùng mật khẩu tạm một lần và `passwordChangeRequired=true` cho đến khi đổi mật khẩu theo `SRS-OVR-007`.
- Mật khẩu/token không xuất hiện trong audit, telemetry, export hoặc source secret. Mật khẩu local seed chỉ là fixture/dev value.
- Thay đổi mật khẩu, role, scope hoặc disable user phải tăng `authVersion` để revoke session theo `SRS-OVR-008`.
- Branch/Warehouse không hard-delete. Disable Warehouse phải bị chặn khi có blocker theo `SRS-OVR-019`; Phase 2 dùng fake blocker service để giữ contract.
- Không tạo adapter Google Sheets/Drive thật trong Phase 2; physical adapter thuộc phase riêng sau khi bootstrap contract ổn định.

---

## File Structure

- Create `shared/contracts/platform/bootstrap.ts`: DTO bootstrap install/status response.
- Create `shared/contracts/platform/administration.ts`: Tenant/Branch/Warehouse/Role/User/Scope/config DTO tối thiểu.
- Modify `shared/contracts/platform/auth.ts`: thêm `ChangeOwnPasswordRequest/Response`.
- Modify `shared/contracts/platform/operations.ts`: thêm operation Phase 2.
- Create `shared/schemas/platform/bootstrap.ts`: schema install/status payload.
- Modify `shared/schemas/platform/auth.ts`: schema đổi mật khẩu.
- Create `apps-script/src/repositories/platform/administration-repository.ts`: in-memory repository cho Tenant/Branch/Warehouse/Role/UserRole/UserScope/TenantConfigVersion.
- Create `apps-script/src/services/platform/bootstrap/bootstrap-service.ts`: bootstrap idempotent tạo tenant/admin/scope/config.
- Create `apps-script/src/services/administration/administration-service.ts`: get current scope/config và disable warehouse guard tối thiểu.
- Modify `apps-script/src/services/platform/auth/password-service.ts`: thêm tạo verifier cho mật khẩu mới.
- Modify `apps-script/src/services/platform/auth/session-service.ts`: thêm `changeOwnPassword`.
- Modify `apps-script/src/bootstrap/create-api-composition.ts`: wire bootstrap/admin operations.
- Modify `web/src/lib/api/local-fake-backend.ts`: hỗ trợ bootstrap/admin/scope operations ở local.
- Modify `web/src/app/runtime-shell.tsx`: thêm nút bootstrap/status/change password/scope nếu cần để kiểm thử local.
- Add tests under `tests/apps-script/platform`, `tests/apps-script/administration`, `tests/shared`, `tests/web`.

## Task 1: Shared Contracts and Schemas

**Files:**
- Create: `shared/contracts/platform/bootstrap.ts`
- Create: `shared/contracts/platform/administration.ts`
- Modify: `shared/contracts/platform/auth.ts`
- Modify: `shared/contracts/platform/operations.ts`
- Create: `shared/schemas/platform/bootstrap.ts`
- Modify: `shared/schemas/platform/auth.ts`
- Test: `tests/shared/tenant-bootstrap-contracts.test.ts`

**Interfaces:**
- Produces: `BootstrapInstallRequest`, `BootstrapInstallResponse`, `BootstrapStatusResponse`, `CurrentScopeResponse`, `ChangeOwnPasswordRequest`.

- [x] **Step 1: Write failing tests for operation allowlist and schema validation.**
- [x] **Step 2: Run `npx vitest run tests/shared/tenant-bootstrap-contracts.test.ts` and verify it fails.**
- [x] **Step 3: Implement contracts and schemas with exact Phase 2 operations.**
- [x] **Step 4: Run focused shared tests and verify pass.**

## Task 2: Bootstrap Service and Administration Repository

**Files:**
- Create: `apps-script/src/repositories/platform/administration-repository.ts`
- Create: `apps-script/src/services/platform/bootstrap/bootstrap-service.ts`
- Test: `tests/apps-script/platform/bootstrap-service.test.ts`

**Interfaces:**
- Produces: `BootstrapService.install`, `BootstrapService.getStatus`, `createBootstrapServiceForTest`.

- [x] **Step 1: Write failing tests for idempotent install creating tenant, branch, warehouse and admin user once.**
- [x] **Step 2: Run focused test and verify it fails because service is missing.**
- [x] **Step 3: Implement in-memory admin repository and bootstrap service.**
- [x] **Step 4: Run focused bootstrap tests and verify pass.**

## Task 3: Change Own Password and Session Revoke

**Files:**
- Modify: `apps-script/src/services/platform/auth/password-service.ts`
- Modify: `apps-script/src/services/platform/auth/session-service.ts`
- Test: `tests/apps-script/platform/change-password.test.ts`

**Interfaces:**
- Produces: `SessionService.changeOwnPassword(sessionToken, input)`.

- [x] **Step 1: Write failing tests proving first-login admin can change password and old session becomes invalid.**
- [x] **Step 2: Run focused test and verify it fails.**
- [x] **Step 3: Implement verifier creation, password update, `passwordChangeRequired=false`, `authVersion+1`.**
- [x] **Step 4: Run auth tests and verify pass.**

## Task 4: Administration Minimum Service

**Files:**
- Create: `apps-script/src/services/administration/administration-service.ts`
- Test: `tests/apps-script/administration/administration-service.test.ts`

**Interfaces:**
- Produces: `AdministrationService.getCurrentScope`, `AdministrationService.disableWarehouse`.

- [x] **Step 1: Write failing tests for current scope and disable Warehouse blocker.**
- [x] **Step 2: Run focused test and verify it fails.**
- [x] **Step 3: Implement current scope/config projection and blocker-based disable guard.**
- [x] **Step 4: Run focused administration tests and verify pass.**

## Task 5: Composition and Local Fake Backend

**Files:**
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Modify: `web/src/app/runtime-shell.tsx`
- Test: `tests/apps-script/platform/tenant-bootstrap-composition.test.ts`
- Test: `tests/web/local-fake-backend.test.ts`
- Test: `tests/web/runtime-shell.test.ts`

**Interfaces:**
- Produces operations: `platform.bootstrap.getStatus`, `platform.bootstrap.install`, `platform.auth.changeOwnPassword`, `platform.scope.getCurrent`, `platform.warehouse.disable`.

- [x] **Step 1: Write failing composition/local tests for bootstrap status, current scope and change password operation.**
- [x] **Step 2: Run focused tests and verify fail.**
- [x] **Step 3: Wire operations in Apps Script composition and local fake backend.**
- [x] **Step 4: Run focused web/platform tests and verify pass.**

## Task 6: Full Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-27-tenant-bootstrap-administration-minimum-phase-2.md`

- [x] **Step 1: Mark completed plan items after evidence exists.**
- [x] **Step 2: Run `npm run verify`.**
- [x] **Step 3: If verify passes, report exact test/build evidence and remaining out-of-scope work.**

## Self-Review

- Spec coverage: covers tenant/Branch/Warehouse bootstrap, admin default, password-change-required, role/scope baseline, current scope and warehouse disable blocker. It intentionally excludes real Google Drive/Sheets resource creation, scheduled worker, production admin UI and full user management.
- Placeholder scan: clear; each task has files, interfaces and focused verification command.
- Type consistency: operation and service names match across contracts, schemas, composition and tests.
