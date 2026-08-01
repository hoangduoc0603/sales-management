# Apps Script Production Acceptance Drill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chứng minh baseline hiện tại chạy được trên Apps Script test project thật, xác định các lỗi production/runtime/performance còn chặn release và cập nhật evidence vào release hardening.

**Architecture:** Drill này không mở rộng nghiệp vụ mới. Trọng tâm là kiểm chứng Apps Script `/dev`, Google Sheets/Drive thật, install gate, login/logout, warm-up trigger, worker/health/backup và POS/dashboard fast path bằng evidence đo được. Mọi sửa code phát sinh phải giữ ranh giới `web -> shared -> apps-script services -> repositories -> infrastructure`.

**Tech Stack:** React, TypeScript, Vite, Google Apps Script, Google Sheets, Google Drive, clasp, Vitest, ESLint.

## Global Constraints

- Tài liệu và thông điệp nghiệp vụ mặc định viết bằng tiếng Việt.
- Không commit `.clasp.json`, `scriptId`, deployment ID, Drive folder ID, Spreadsheet ID, mật khẩu hoặc session token.
- `.clasp.json` local phải có `rootDir: "./dist"` và trỏ tới Apps Script test project hiện hành.
- Drill dùng `/dev` để debug code mới nhất, không tăng Apps Script version.
- Trước khi sửa code do lỗi drill, đọc tài liệu domain liên quan theo `AGENTS.md` và giữ thứ tự ưu tiên SRS -> ADR -> Solution/System Design -> LLD/data dictionary -> design handoff -> code.
- Không tick release gap nếu evidence chỉ là local/in-memory; phải ghi rõ local, Apps Script `/dev`, hoặc manual UI evidence.
- Không xóa dữ liệu thật tự động. Nếu cần reset test project, chỉ thực hiện khi user xác nhận mục tiêu reset cụ thể.

---

## File Structure

- `docs/superpowers/plans/2026-08-01-apps-script-production-acceptance-drill.md`: checklist drill đang chạy và evidence từng bước.
- `docs/architecture/release-hardening.md`: cập nhật kết quả production drill đọc độc lập.
- `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`: chỉ tick các checkbox master khi evidence production tương ứng đã có.
- `scripts/deploy-test.mjs`: dùng để build, verify, push và lấy `/dev` URL; chỉ sửa nếu phát hiện thiếu guard hoặc output phục vụ drill.
- `scripts/release-readiness.mjs`: dùng để xác định release còn `Blocked` hay `Ready`; chỉ sửa nếu rule không phản ánh release gate đã duyệt.

## Current test environment

| Item | Giá trị |
| --- | --- |
| Apps Script project | Local `.clasp.json`, không ghi ID trong tài liệu này |
| Debug URL | Lấy lại bằng `npm run deploy:test` |
| Test mode | `/dev`, editor-only |
| Current known baseline | Web App mở được, first-run setup đã chạy được, login/logout được, warm-up trigger `warmRuntime_` đã cài và có tỷ lệ lỗi 0% theo ảnh user cung cấp |

## Task 1: Repo and artifact preflight

**Files:**
- Read: `AGENTS.md`
- Read: `docs/architecture/folder-structure.md`
- Read: `docs/architecture/lld-traceability-review.md`
- Read: `docs/architecture/detailed-design.md`
- Read: `docs/architecture/deployment-runbook.md`
- Read: `docs/architecture/release-hardening.md`
- Modify: this plan file

**Interfaces:**
- Consumes: current repo state and release gate scripts.
- Produces: verified local baseline before pushing to Apps Script.

- [x] **Step 1:** Run `git status --short` and confirm `.clasp.json` is not staged/tracked.
  - Evidence 2026-08-01 10:25 ICT: command exit 0; `.clasp.json` không xuất hiện trong status output.
- [x] **Step 2:** Run `npm run release:readiness`.
  - Expected: exit non-zero with `status: "Blocked"` while production evidence gaps remain.
  - Evidence 2026-08-01 10:25 ICT: exit 1, `status: "Blocked"`; P0 gaps: `production-persistence-adapters`, `pos-acceptance-benchmark`, `backup-restore-drill`, `scheduled-worker-runtime`, `deployment-migration-drill`.
- [x] **Step 3:** Run targeted local release checks:

```bash
npm test -- tests/apps-script/release/acceptance-flow.test.ts tests/apps-script/release/security-review.test.ts tests/performance/pos-performance.test.ts tests/apps-script/platform/runtime-warmup-service.test.ts tests/apps-script/platform/warmup-trigger-manager.test.ts
```

  - Expected: pass. If fail, stop production drill and fix local regression first.
  - Evidence 2026-08-01 10:25 ICT: 5 test files passed, 16 tests passed.
- [x] **Step 4:** Run `npm run build && npm run check:artifact`.
  - Expected: Apps Script artifact contains global wrappers for `doGet`, `invoke`, `installWarmupTrigger`, `getWarmupTriggerStatus`, `warmRuntime_`, `scheduledWorker_` and no secret-like strings.
  - Evidence 2026-08-01 10:26 ICT: `npm run build` exit 0; `npm run check:artifact` exit 0, artifact hợp lệ.

## Task 2: Push latest artifact to Apps Script `/dev`

**Files:**
- Read: `.clasp.json` local-only
- Use: `scripts/deploy-test.mjs`
- Modify: this plan file

**Interfaces:**
- Consumes: passing local artifact from Task 1.
- Produces: `/dev` Web App URL running latest code.

- [x] **Step 1:** Run `npm run deploy:test`.
  - Expected: verify pass, clasp push pass, command prints a `/dev` URL using deployment ID dạng `AKfy...`.
  - Evidence 2026-08-01 10:26 ICT: `npm run deploy:test` exit 0; full `npm run verify` pass; clasp reports script already up to date; `/dev` URL printed.
- [x] **Step 2:** Record only sanitized evidence:
  - command exit code;
  - deploy mode `/dev`;
  - timestamp;
  - no scriptId/deploymentId in repo docs.
  - Evidence 2026-08-01 10:26 ICT: command output contained deployment URL in terminal only; plan records sanitized result without deployment ID.
- [x] **Step 3:** If `deploy:test` fails due auth/deployment missing, stop and report exact `clasp` error. Do not switch to `/exec` unless user explicitly asks.
  - Evidence 2026-08-01 10:26 ICT: not applicable; deploy test succeeded.

## Task 3: First-run/install and auth smoke on `/dev`

**Files:**
- Use Web App `/dev`
- Modify: this plan file
- Modify only if bug found: `web/src/app/install/*`, `web/src/app/auth/*`, `apps-script/src/services/platform/bootstrap/*`, `apps-script/src/bootstrap/first-run-install.ts`

**Interfaces:**
- Consumes: `/dev` URL from Task 2.
- Produces: manual/console evidence that install/auth baseline works on Apps Script.

- [ ] **Step 1:** Open `/dev` in Chrome with DevTools Console visible.
  - Evidence 2026-08-01 10:28 ICT: Chrome mở `/dev` nhưng Google trả trang “Bạn cần có quyền truy cập”; Chrome đang đăng nhập bằng account không có quyền editor/test deployment. Không bấm “Yêu cầu quyền truy cập”.
- [ ] **Step 2:** If app shows first-run setup, complete setup with:
  - tenant display name: `Cửa hàng cenio test`;
  - admin loginId: `admin`;
  - admin password: user-supplied test password;
  - confirm admin password: same password.
- [ ] **Step 3:** If app already installed, open login screen directly and login with current admin credential.
- [ ] **Step 4:** Copy sanitized console debug response for `platform.auth.login` into this plan or chat:
  - keep `clientDurationMs`;
  - keep `response.meta.durationMs`;
  - keep `response.meta.stages`;
  - redact `sessionToken`, password and IDs if present.
- [ ] **Step 5:** Logout and login again once.
  - Expected: no session error, no password/token in console, UI returns to dashboard.
  - Blocker: cần mở `/dev` bằng đúng Google account owner/editor của Apps Script project, hoặc cấu hình deployment/test access phù hợp. Khi chưa qua access gate, không thể thu login/dashboard/POS timing từ browser trong session này.

## Task 4: Runtime performance baseline on Apps Script `/dev`

**Files:**
- Use Web App `/dev`
- Modify: this plan file
- Modify only if bottleneck found: API/repository/runtime files identified by `response.meta.stages`

**Interfaces:**
- Consumes: console response logs enabled by debug mode.
- Produces: cold/warm timing table for production-like Apps Script.

- [ ] **Step 1:** Run three login attempts after a fresh open and record:

| Attempt | clientDurationMs | server durationMs | handler/stage bottleneck | Notes |
| --- | ---: | ---: | --- | --- |
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |

- [ ] **Step 2:** Wait at least 6 minutes after warm-up trigger has run, reopen `/dev`, run one login, and record timing.
- [ ] **Step 3:** Acceptance threshold for current debug baseline:
  - warm login server duration should normally be below 1.5s;
  - warm login client duration should normally be around 3s or less;
  - any repeated warm login above 5s needs bottleneck analysis before code thêm tính năng.
- [ ] **Step 4:** If repeated warm login still exceeds threshold, classify bottleneck:
  - `sheet.*` stage: optimize Sheets access/cache/repository;
  - `login.verifyMs`: optimize credential verifier path without weakening security policy already approved;
  - `compositionMs`/`parseAndRegistryMs`: reduce per-request composition overhead;
  - client-only gap: improve AppScript bridge/UI loading state but do not claim backend slow.

## Task 5: Dashboard and POS smoke on `/dev`

**Files:**
- Use Web App `/dev`
- Modify: this plan file
- Modify only if bug found: `web/src/features/dashboard/*`, `web/src/features/pos/*`, relevant backend service/repository.

**Interfaces:**
- Consumes: authenticated session from Task 3.
- Produces: evidence that two sellable entry points render and call expected APIs.

- [ ] **Step 1:** Open Dashboard.
  - Expected: AppShell visible, scope selector visible, 4 KPI cards, chart/decision queue/manual order section renders, no native select in visible AppShell selectors.
- [ ] **Step 2:** Click Refresh on Dashboard and copy sanitized `reporting.dashboard.get` response timing.
- [ ] **Step 3:** Open POS route.
  - Expected: common AppShell/Header remains visible, scan/search input visible, cart panel visible, no POS-specific duplicate header badges.
- [ ] **Step 4:** Add one product from suggested products if fixture data exists.
  - Expected: cart updates locally without RPC per quantity change.
- [ ] **Step 5:** If checkout is enabled, run one simple checkout with idempotency and record sanitized `sales.pos.complete` response timing. If checkout cannot run because data seed/payment/shift missing, record exact blocker instead of forcing data.

## Task 6: Worker, warm-up, health and backup smoke

**Files:**
- Use Apps Script editor and Web App `/dev`
- Modify: this plan file
- Modify only if bug found: `apps-script/src/bootstrap/runtime-warmup.ts`, `apps-script/src/services/platform/worker/*`, `apps-script/src/services/operations/*`

**Interfaces:**
- Consumes: installed tenant/runtime config.
- Produces: evidence for scheduled trigger and operations health path.

- [ ] **Step 1:** In Apps Script editor, run `getWarmupTriggerStatus`.
  - Expected: one trigger for `warmRuntime_`, `lastStatus: "Ok"` or equivalent successful status, no `lastError`.
  - Evidence 2026-08-01 10:29 ICT: thử `npx clasp run getWarmupTriggerStatus` trả `Script function not found. Please make sure script is deployed as API executable.` CLI `scripts.run` chưa dùng được trên project hiện tại; kiểm tra function status cần thực hiện trong Apps Script editor hoặc tạo API executable riêng.
- [ ] **Step 2:** Confirm Apps Script Triggers page shows:
  - function `warmRuntime_`;
  - time-driven;
  - error rate `0%`.
- [ ] **Step 3:** From Web App or debug API, call `operations.health.check` with `{ "includeIntegrity": true }`.
  - Expected: response is sanitized, no token/password, identifies runtime config/Drive/Sheets/trigger status.
- [ ] **Step 4:** Request a manual backup through `operations.backup.request` if UI/API path is available.
  - Expected: backup run/manifest created or clear blocked reason if Drive backup production drill is still incomplete.
- [ ] **Step 5:** Do not run restore switch on an active test tenant without explicit confirmation. For this drill, record whether restore prepare/replacement-resource flow is available.

## Task 7: Update release evidence and next blockers

**Files:**
- Modify: `docs/architecture/release-hardening.md`
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md` only if a master checkbox now has production evidence.
- Modify: this plan file

**Interfaces:**
- Consumes: evidence from Tasks 1-6.
- Produces: clear release status and next work item.

- [ ] **Step 1:** Add a dated evidence row to `docs/architecture/release-hardening.md` with:
  - Apps Script `/dev` deployment result;
  - install/auth status;
  - warm-up trigger status;
  - key timings;
  - remaining blockers.
- [x] **Step 2:** Run `npm run release:readiness`.
  - Expected: still `Blocked` unless all P0 evidence strings have been intentionally resolved.
- [ ] **Step 3:** Do not mark release `Ready` if any of these remain unproven on Apps Script:
  - POS checkout timing/evidence;
  - backup/restore replacement drill;
  - scheduled worker production drill beyond warm-up;
  - migration/fresh tenant dry-run.
- [ ] **Step 4:** Report concise result to user:
  - what passed with evidence;
  - what failed with exact bottleneck/error;
  - next recommended fix.

## Evidence log

| Date/time | Gate | Environment | Result | Evidence / next action |
| --- | --- | --- | --- | --- |
| 2026-08-01 10:24 ICT | Plan created | Repo | Done | Drill checklist created. |
| 2026-08-01 10:25 ICT | Release readiness | Local repo | Blocked as expected | P0 gaps remain: production persistence, POS Apps Script benchmark, backup/restore, scheduled worker, deployment/migration drill. |
| 2026-08-01 10:25 ICT | Targeted tests | Local repo | Pass | 5 files passed, 16 tests passed. |
| 2026-08-01 10:26 ICT | Build/artifact | Local repo | Pass | Build exit 0; artifact check exit 0. |
| 2026-08-01 10:26 ICT | Deploy test | Apps Script /dev | Pass | `npm run deploy:test` exit 0; full verify pass; code pushed to /dev without creating version. |
| 2026-08-01 10:28 ICT | Browser `/dev` access | Chrome | Blocked | Google trả “Bạn cần có quyền truy cập”; Chrome account hiện tại không phải editor/owner của Apps Script test deployment. |
| 2026-08-01 10:29 ICT | CLI function smoke | clasp run | Blocked | `npx clasp run getWarmupTriggerStatus` báo project chưa có API executable deployment cho `scripts.run`. |
