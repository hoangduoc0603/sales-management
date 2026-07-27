# Release Hardening Readiness

**Trạng thái:** Blocked — chưa đủ điều kiện release bán được  
**Nguồn:** SRS overview, LLD readiness review, runtime/performance, deployment lifecycle, master implementation plan và Phase 12 plan.

## 1. Mục tiêu

Tài liệu này là artifact đọc độc lập cho Phase 12. Nó ghi rõ release hiện đang bị chặn bởi gap nào, cần bằng chứng gì để gỡ chặn và gap nào phải xin quyết định scope trước khi code tiếp.

## 2. P0 gaps — chặn release

| ID | Gap | Nguồn | Evidence cần có để đóng |
| --- | --- | --- | --- |
| `production-persistence-adapters` | Thiếu production Google Workspace adapter cho Sheets/Drive/runtime config; repository domain hiện chủ yếu là in-memory seam. | `SRS-OVR-003`, `SRS-OVR-008`, `SRS-OVR-023`, `sheet-schema-and-registry.md` | SheetGateway/TableLocator/DriveGateway/RuntimeConfigStore có contract test với fake Apps Script globals; không hard-code ID/header/row; ít nhất sellable slice đọc/ghi qua adapter thật. |
| `pos-acceptance-benchmark` | Thiếu acceptance và benchmark cho POS sellable baseline. | `SRS-OVR-004`, `SRS-OVR-013`, `SRS-OVR-024`, `runtime-and-performance.md` | Cross-domain acceptance flow pass; POS scan/search/cart benchmark đạt p95; checkout local baseline có p95/p99; production Apps Script benchmark được ghi lại trước release thật. |
| `backup-restore-drill` | Thiếu backup/restore replacement-resource drill. | `SRS-OVR-010`, ADR 0007 | Backup manifest gồm partitions/resources/checksum; retention 30 daily; restore prepare tạo resource thay thế, verify, Owner switch, revoke session và health-check. |
| `scheduled-worker-runtime` | Thiếu scheduled worker runtime cho audit/import/export/backup/archive. | `SRS-OVR-021`, LLD Administration–Reporting–Operations §5 | BackgroundRun có lease/checkpoint/retry budget; worker không giữ ScriptLock trong việc nặng; audit delivery/import/export/backup/archive có test. |
| `deployment-migration-drill` | Thiếu deployment, migration và customer installation drill. | `SRS-OVR-023`, ADR 0006 | Deployment runbook; fresh tenant dry-run; upgraded tenant dry-run; backup trước migration; `.clasp.json` local-only. |

## 3. P1 gaps — cần chốt sellable scope

| ID | Gap | Nguồn | Hướng xử lý |
| --- | --- | --- | --- |
| `checkout-stale-conflict` | Price/promotion stale conflict cho checkout còn mở. | Phase 4, `SRS-OVR-020` | `MustFixBeforeRelease` nếu pricing/promotion cache được bật trong POS. |
| `inventory-opening-lot-serial-transfer-stocktake` | Opening balance/import-safe, lot/serial, transfer/stocktake và concurrency matrix còn mở. | Phase 5, `SRS-INV` | Opening balance và stocktake tối thiểu cần `MustFixBeforeRelease`; lot/serial/transfer có thể `CanShipDisabled` nếu UI bị khóa và backend reject rõ. |
| `finance-master-aging` | CashDrawer/PaymentMethod master và aging projection còn mở. | Phase 6, `SRS-FIN` | PaymentMethod/CashDrawer tối thiểu cần `MustFixBeforeRelease`; aging projection có thể chia theo scope công nợ release. |
| `sales-deposit-attachment-policy-reversal` | Deposit cancellation, attachment Drive flow và CRM policy reversal còn mở. | Phase 8, `SRS-SAL` | Cần quyết định có bật nhận cọc/file đính kèm ở release đầu không. |
| `reporting-drilldown-archive-worker-export` | Archive coverage, drill-down token permission và worker-backed export còn mở. | Phase 10, `SRS-ACC` | Drill-down permission và export worker cần trước production nếu UI hiển thị export/drill-down. |
| `operations-production-lifecycle` | Import/attachment/audit/backup/restore/archive production lifecycle còn mở. | Phase 11, `SRS-OVR-009..011` | Chia lát cắt production hardening; backup/restore/audit là phần trọng yếu. |

## 4. Evidence đã có trong Phase 12

| Ngày | Gate | Evidence | Trạng thái |
| --- | --- | --- | --- |
| 2026-07-27 | Release readiness gate | `scripts/release-readiness.mjs`, `tests/release/release-readiness.test.ts`, `npm run release:readiness` trả `Blocked` với P0/P1 gaps. | Hoàn thành gate, release vẫn blocked. |
| 2026-07-27 | Sellable scope classification | `docs/architecture/release-scope-baseline.md`, `tests/release/sellable-scope.test.ts`. | Hoàn thành classification draft, cần user duyệt decision items. |
| 2026-07-27 | Production adapter seam | `SheetGateway`, `DriveGateway`, `RuntimeConfigStore`, `AppsScriptLockProvider` và `tests/apps-script/platform/google-workspace-adapter.test.ts`. | Adapter seam pass contract tests; P0 `production-persistence-adapters` vẫn mở cho tới khi sellable repositories cutover và chạy drill với tài nguyên thật. |
| 2026-07-27 | Cross-domain acceptance harness | `tests/apps-script/release/acceptance-flow.test.ts` chạy qua `createApiComposition().invoke(...)`: bootstrap/auth/scope/POS/order/dashboard, online/receivable/return refund, purchasing/payable/supplier payment và backup/restore/health. | Acceptance harness pass local in-memory; P0 `pos-acceptance-benchmark` vẫn mở cho tới khi có POS benchmark và Apps Script production evidence. |
| 2026-07-27 | POS performance local baseline | `tests/performance/pos-performance.test.ts` và `tests/performance/fixtures/pos-seed.ts` seed 10.000 variants, đo warm scan/search/cart trong browser-local cache và checkout qua local in-memory `createApiComposition()`. | Node benchmark pass các ngưỡng SRS p95/p99; chưa thay thế Apps Script production benchmark trước release thật. |
| 2026-07-27 | Security release review | `tests/apps-script/release/security-review.test.ts` kiểm reset/disable/access change revoke session bằng `authVersion`, không lộ token/password trong API/audit/export, chặn bypass Warehouse scope và loại sensitive fields khỏi dashboard/report/export. | Security review local pass; P0 `security-release-review` có executable evidence cho session/scope/sensitive baseline. |
| 2026-07-27 | Worker/backup/restore/archive baseline | `apps-script/src/services/platform/worker/background-runner.ts`, `apps-script/src/services/operations/backup-restore-worker.ts`, `apps-script/src/services/operations/archive-worker.ts` và `tests/apps-script/release/worker-backup-restore.test.ts`. | Local worker baseline pass cho lease/checkpoint/retry, manifest/checksum/30 daily retention, replacement restore switch và archive read-only routing; production Drive/Sheets drill vẫn cần deployment evidence. |
| 2026-07-27 | UI accessibility và Approved screen acceptance | `tests/web/release-ui-acceptance.test.ts` kiểm mọi handoff `Approved` có route/shell hoặc `CanShipDisabled`, custom Listbox có ARIA/keyboard source, POS scan input có `aria-label`/Enter/auto-focus, command button giữ label và có `aria-busy`, theme toggle là icon button. Bổ sung `web/src/features/reporting/reporting-administration-operations-home.tsx` cho artifact Reporting/Administration/Operations đã Approved. | Targeted UI acceptance pass. Open Design MCP trả `Transport closed` và Local Preview `127.0.0.1:61609` không truy cập được tại thời điểm kiểm tra, nên visual/manual comparison light/dark với artifact hiện được ghi pending, không suy diễn từ screenshot. |
| 2026-07-27 | Deployment runbook/customer installation checklist | `docs/architecture/deployment-runbook.md` mô tả prerequisite Google account khách, `.clasp.json` local-only, `npm run deploy:push`, versioned deployment, tenant bootstrap, admin handoff, health/readiness, backup trước upgrade, emergency restore và evidence cần lưu ngoài Git. `scripts/deploy-push.mjs` có guard chặn push khi thiếu `scriptId` hoặc `rootDir` khác `./dist`; `tests/release/deploy-push-safety.test.ts` giữ regression này. | Runbook baseline và safety guard pass targeted test; production deployment/migration/restore drill trên Apps Script test project vẫn là P0 evidence pending trước khi release `Ready`. |
| 2026-07-27 | Final release gate — local evidence | `npm run verify` pass với structure, typecheck, lint, 72 test files/212 tests, build và Apps Script artifact check. `npm test -- tests/performance/pos-performance.test.ts` pass. `npm run release:readiness` trả `Blocked` với 5 P0 còn mở: production persistence adapters, POS Apps Script production evidence, backup/restore drill, scheduled worker runtime/drill và deployment/migration drill. `npm run deploy:push` chạy verify pass rồi dừng an toàn vì `.clasp.json` local không tồn tại. | Release vẫn `Blocked`; không tick deployment dry-run hoặc restore drill cho tới khi có Apps Script test project và evidence thật theo runbook. |

## 5. Decision required

1. Bản bán đầu có bắt buộc hỗ trợ lot/serial, chuyển kho và kiểm kê đầy đủ không, hay khóa UI/operation cho tenant nhỏ cho tới phase sau?
2. Production adapter nên cutover toàn bộ domain ngay hay theo lát cắt sellable trước: Platform/Auth/Config + Catalog/CRM + Inventory/Finance/Sales/POS + Reporting/Operations?
3. Restore drill sẽ chạy trên Apps Script test project nào; `.clasp.json` và `scriptId` phải nằm ngoài Git.

## 6. Gate rule

Release status chỉ được chuyển từ `Blocked` sang `Ready` khi:

- `npm run release:readiness` không còn P0 gap.
- `npm run verify` pass.
- POS benchmark có evidence.
- Deployment/migration/restore drill có evidence.
- Mọi P1 gap được phân loại trong `docs/architecture/release-scope-baseline.md` và được user duyệt.
