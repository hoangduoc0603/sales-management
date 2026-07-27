# UI Foundation, App Shell & Auth Flow Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay local runtime technical shell bằng frontend foundation thật: login nội bộ, bắt đổi mật khẩu lần đầu, AppShell theo Cenio Core, scope Branch/Warehouse, theme light/dark và dashboard placeholder để các module sau gắn vào.

**Architecture:** Frontend React/Vite vẫn gọi single API client, không gọi Google Apps Script trực tiếp ngoài `web/src/lib/api`. App root quản lý auth/session/scope ở `web/src/app`, component primitive dùng chung ở `web/src/components/ui`, Dashboard placeholder nằm trong `web/src/features/dashboard`. AppShell/Dashboard bám artifact Open Design `app-shell-dashboard.html`; Login/Change Password là functional baseline dùng Cenio Core token vì chưa có artifact riêng trong registry.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS entry, CSS variables Cenio Core v0.6, Vitest SSR tests.

## Global Constraints

- Tài liệu và thông điệp nghiệp vụ mặc định viết bằng tiếng Việt.
- Trước khi code đã đọc `AGENTS.md`, `docs/architecture/folder-structure.md`, `docs/architecture/lld-traceability-review.md`, `docs/architecture/detailed-design.md`, `docs/product/srs/overview.md`, `docs/product/srs/access-reporting.md`, `docs/architecture/modules/administration-reporting-operations.md`, `docs/data-model/tables/operations-reporting.md`.
- UI phải đọc `docs/design/README.md`, `docs/design/open-design-registry.md`, `docs/design/design-system.md`, `docs/design/implementation-rules.md`, `docs/design/screens/sales-dashboard.md`.
- AppShell/Dashboard chỉ lấy từ artifact `Approved`: project `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`, artifact `app-shell-dashboard.html`.
- Không dùng native `<select>` cho Branch/Warehouse.
- Theme toggle là icon button ở header.
- Button loading giữ nguyên label, chỉ thêm loading icon.
- Không dùng Google account làm identity ứng dụng; login dùng `loginId`/password nội bộ.
- Không hiển thị hoặc log password/session token trong UI output/debug.
- Không thêm reporting projection thật, POS nghiệp vụ thật hoặc domain operation ngoài Phase 3.

---

## File Structure

- Create `web/src/app/sales-management-app.tsx`: app root, auth/scope orchestration, route state.
- Create `web/src/app/auth/auth-flow.tsx`: login và change-password-required functional baseline.
- Create `web/src/app/auth/session-storage.ts`: session token storage wrapper có guard browser.
- Create `web/src/app/app-shell/app-shell.tsx`: sidebar, topbar, scope selectors, theme toggle, logout.
- Create `web/src/app/theme/theme.ts`: theme init/toggle utilities.
- Create `web/src/components/ui/button.tsx`: button/icon button loading rule.
- Create `web/src/components/ui/badge.tsx`: semantic badge.
- Create `web/src/components/ui/listbox.tsx`: custom listbox không dùng native select.
- Create `web/src/components/ui/panel.tsx`: panel/card primitives.
- Create `web/src/components/ui/table.tsx`: table primitive.
- Create `web/src/components/ui/tabs.tsx`: tabs primitive.
- Create `web/src/components/ui/dialog.tsx`: dialog primitive.
- Create `web/src/components/ui/toast.tsx`: toast primitive.
- Create `web/src/components/ui/skeleton.tsx`: skeleton primitive.
- Create `web/src/components/ui/state-block.tsx`: loading/empty/error/restricted/scope/archive/command states.
- Create `web/src/features/dashboard/dashboard-home.tsx`: dashboard shell placeholder bám 4 KPI/state handoff, không fake recent activity.
- Create `web/src/features/pos/pos-checkout-shell.tsx`: POS checkout shell placeholder bám artifact Approved, không nối nghiệp vụ thật.
- Modify `web/src/app/main.tsx`: mount `SalesManagementApp`.
- Modify `web/src/styles/index.css`: map Cenio Core v0.6 tokens và component classes.
- Modify/remove runtime shell tests to match new app.
- Add tests under `tests/web`.

## Task 1: UI Tokens and Primitives

**Files:**
- Modify: `web/src/styles/index.css`
- Create: `web/src/components/ui/button.tsx`
- Create: `web/src/components/ui/badge.tsx`
- Create: `web/src/components/ui/listbox.tsx`
- Create: `web/src/components/ui/panel.tsx`
- Create: `web/src/components/ui/state-block.tsx`
- Test: `tests/web/ui-foundation.test.tsx`

**Interfaces:**
- Produces `Button`, `IconButton`, `Badge`, `Listbox`, `Panel`, `StateBlock`.

- [x] **Step 1:** Write SSR tests proving button loading keeps label, listbox renders as button/listbox not native select, and state block renders recovery CTA.
- [x] **Step 2:** Run focused test and verify it fails because primitives are missing.
- [x] **Step 3:** Implement token CSS and primitives with Cenio Core classes.
- [x] **Step 4:** Run focused UI foundation tests and verify pass.

## Task 2: Auth Flow and Session Storage

**Files:**
- Create: `web/src/app/auth/auth-flow.tsx`
- Create: `web/src/app/auth/session-storage.ts`
- Test: `tests/web/auth-flow.test.tsx`

**Interfaces:**
- Produces `AuthFlow`, `createSessionStorage`.

- [x] **Step 1:** Write SSR/unit tests for internal login copy, password-change-required copy and session storage read/write/clear.
- [x] **Step 2:** Run focused test and verify fail.
- [x] **Step 3:** Implement auth form baseline with login/change password states and safe session storage helper.
- [x] **Step 4:** Run focused auth tests and verify pass.

## Task 3: AppShell, Scope and Theme

**Files:**
- Create: `web/src/app/app-shell/app-shell.tsx`
- Create: `web/src/app/theme/theme.ts`
- Test: `tests/web/app-shell.test.tsx`

**Interfaces:**
- Produces `AppShell`, `resolveInitialTheme`, `toggleTheme`.

- [x] **Step 1:** Write SSR/unit tests for sidebar/header, custom Branch/Warehouse scope selectors and theme toggle icon button.
- [x] **Step 2:** Run focused test and verify fail.
- [x] **Step 3:** Implement AppShell from approved Dashboard artifact structure and theme utilities.
- [x] **Step 4:** Run focused AppShell tests and verify pass.

## Task 4: App Root and Dashboard Placeholder

**Files:**
- Create: `web/src/app/sales-management-app.tsx`
- Create: `web/src/features/dashboard/dashboard-home.tsx`
- Modify: `web/src/app/main.tsx`
- Modify: `tests/web/runtime-shell.test.ts`
- Test: `tests/web/sales-management-app.test.tsx`

**Interfaces:**
- Produces `SalesManagementApp` as frontend root.

- [x] **Step 1:** Write SSR tests that root starts at internal login, and authenticated view can render AppShell/Dashboard placeholder with 4 KPI labels.
- [x] **Step 2:** Run focused app tests and verify fail.
- [x] **Step 3:** Implement app root orchestration against existing API client and local fake backend.
- [x] **Step 4:** Run focused web tests and verify pass.

## Task 5: Verification and Plan Closure

**Files:**
- Modify: `docs/superpowers/plans/2026-07-27-ui-foundation-app-shell-auth-phase-3.md`

- [x] **Step 1:** Run `npm run verify`.
- [x] **Step 2:** Mark completed plan items only after evidence exists.
- [x] **Step 3:** Report exact verification evidence and known limitations.

## Task 6: Remaining UI Primitives and POS Shell

**Files:**
- Create: `web/src/components/ui/table.tsx`
- Create: `web/src/components/ui/tabs.tsx`
- Create: `web/src/components/ui/dialog.tsx`
- Create: `web/src/components/ui/toast.tsx`
- Create: `web/src/components/ui/skeleton.tsx`
- Create: `web/src/features/pos/pos-checkout-shell.tsx`
- Modify: `web/src/app/sales-management-app.tsx`
- Modify: `web/src/styles/index.css`
- Test: `tests/web/ui-primitives-completion.test.ts`
- Test: `tests/web/pos-checkout-shell.test.ts`
- Test: `tests/web/sales-management-app-auth-stage.test.ts`

**Interfaces:**
- Produces remaining Cenio Core primitives and a routeable POS checkout shell for the approved POS artifact.

- [x] **Step 1:** Write focused tests for remaining UI primitives and POS shell handoff content.
- [x] **Step 2:** Run focused test and verify fail because modules are missing.
- [x] **Step 3:** Implement Table/Tabs/Dialog/Toast/Skeleton and POS checkout shell without domain checkout logic.
- [x] **Step 4:** Wire route `pos` in `SalesManagementApp`.
- [x] **Step 5:** Run focused UI/POS/AppShell tests and verify pass.

## Task 7: Local Auth Gate Smoke Fix

**Files:**
- Modify: `web/src/app/sales-management-app.tsx`
- Test: `tests/web/sales-management-app-auth-stage.test.ts`

**Interfaces:**
- Produces `resolveSalesManagementAppStage(input): 'auth' | 'bootstrapping' | 'workspace'`.

- [x] **Step 1:** Reproduce local bug after login: backend returns `passwordChangeRequired=true`, app incorrectly renders workspace loading because `actor/sessionToken` exist but `scope` is not loaded.
- [x] **Step 2:** Write failing regression test proving `change-password-required` must render auth flow before workspace loading.
- [x] **Step 3:** Implement app-stage resolver and use it in `SalesManagementApp`.
- [x] **Step 4:** Verify browser local flow: login `admin/admin123`, show đổi mật khẩu lần đầu, đổi sang `new-admin-123`, login lại, open Dashboard and POS route without console error.

## Self-Review

- Spec coverage: covers internal auth, password-change-required gate, session token frontend storage, scope provider, theme toggle, AppShell, dashboard placeholder, remaining UI primitives, POS checkout shell and local post-login smoke gate. Excludes production report projection, POS checkout/domain logic and full user management.
- Placeholder scan: no TBD/TODO implementation placeholders in plan.
- Type consistency: component and operation names match existing shared contracts and Phase 2 API operations.
