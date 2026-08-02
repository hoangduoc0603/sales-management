# Sales Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lập kế hoạch triển khai ứng dụng Sales Management thành các lát cắt có thể code, kiểm thử và nghiệm thu độc lập, bám theo PRD/SRS/ADR/LLD và design handoff đã duyệt.

**Architecture:** Triển khai theo modular monolith trên Google Apps Script, với React/Vite trong `HtmlService`, typed single RPC gateway, backend tách `api -> services -> repositories -> infrastructure`, và `shared/` làm hợp đồng thuần TypeScript. Thứ tự ưu tiên là platform/runtime trước, sau đó domain source-of-truth/projection, cuối cùng mới ghép UI theo Open Design artifact đã `Approved`.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Google Apps Script, Google Sheets, Google Drive, clasp, Vitest, ESLint.

## Global Constraints

- Tài liệu và thông điệp nghiệp vụ mặc định viết bằng tiếng Việt.
- Trước mọi task code phải đọc `AGENTS.md`, `docs/architecture/folder-structure.md`, `docs/architecture/lld-traceability-review.md`, `docs/architecture/detailed-design.md` và tài liệu domain liên quan.
- Thứ tự ưu tiên khi có mâu thuẫn: SRS -> ADR Accepted -> Solution/System Design -> LLD/data dictionary -> design handoff -> Open Design artifact -> code hiện có.
- Không tự thay đổi requirement, state machine, permission, source of truth, ledger, schema vật lý, partition/lifecycle hoặc performance policy trong lúc code.
- UI chỉ được implement từ màn hình có cả registry và handoff `Approved`; artifact `Review` chỉ được dùng để tham khảo kế hoạch, chưa dùng để code production UI.
- POS là luồng hiệu năng trọng yếu: scan/search/cart chạy từ browser cache; checkout là một command backend có idempotency, fresh-read và commit ngắn.
- Không hard-code Spreadsheet ID, Sheet name, header index, Drive folder ID, row number hoặc secret.
- Mọi mutation nghiệp vụ phải đi qua `CommandTransaction`, idempotency key, permission/scope backend, ledger/projection cần thiết và actor metadata trên record; baseline không ghi `AuditOutbox` theo ADR 0017.
- Mọi release ảnh hưởng POS phải có benchmark theo `SRS-OVR-024`; report/export/import/backup/archive không được cạnh tranh POS fast path.

---

## Scope Check

Toàn bộ ứng dụng gồm nhiều bounded context độc lập: Platform, Administration, Catalog/CRM, Inventory, Purchasing, Finance/Shifts, Sales/POS/Returns, Reporting/Operations. Vì vậy kế hoạch này là **master implementation plan**, không phải một plan code duy nhất cho toàn bộ app.

Mỗi phase dưới đây phải được tách thành implementation plan chi tiết riêng trước khi code nếu phase có nhiều task hoặc thay đổi nhiều module. Plan chi tiết phải chỉ rõ file tạo/sửa, test fail/pass, acceptance scenario và command verify.

## Implementation Tracking

| Phase | Trạng thái | Detailed plan / bằng chứng |
| --- | --- | --- |
| Phase 0 — Baseline Audit | Hoàn thành | `npm run verify` pass trong các phase sau; technical foundation đã có trước master plan. |
| Phase 1 — Platform Core | Hoàn thành theo slice in-memory/platform seam | [`2026-07-26-platform-core-phase-1.md`](2026-07-26-platform-core-phase-1.md) đã tick; verify pass. |
| Phase 2 — Tenant Bootstrap & Administration Minimum | Hoàn thành phần bootstrap/admin minimum; full user management còn thuộc phase sau | [`2026-07-27-tenant-bootstrap-administration-minimum-phase-2.md`](2026-07-27-tenant-bootstrap-administration-minimum-phase-2.md) đã tick; verify pass. |
| Phase 3 — UI Foundation | Hoàn thành AppShell/Auth, primitive UI nền và POS shell theo phạm vi foundation; domain POS thật thuộc các phase sau | [`2026-07-27-ui-foundation-app-shell-auth-phase-3.md`](2026-07-27-ui-foundation-app-shell-auth-phase-3.md) đã tick; verify pass. |
| Phase 4 — Catalog, CRM & Commercial Core | Hoàn thành core contracts/service/projection/cache/UI shell; checkout stale conflict chờ Sales checkout phase | [`2026-07-27-catalog-crm-commercial-core-phase-4.md`](2026-07-27-catalog-crm-commercial-core-phase-4.md) đã tick; `npm run verify` và local browser smoke pass. |
| Phase 5 — Inventory Ledger & Balance Core | Hoàn thành core movement/balance/reservation/return baseline; opening/lot/serial/transfer/stocktake còn là release scope gap | [`2026-07-27-inventory-ledger-balance-core-phase-5.md`](2026-07-27-inventory-ledger-balance-core-phase-5.md) đã tick; verify pass. |
| Phase 6 — Finance, Payment & Shift Core | Hoàn thành shift/payment/reversal/expense baseline; CashDrawer/PaymentMethod master và aging projection còn là release scope gap | [`2026-07-27-finance-payment-shift-core-phase-6.md`](2026-07-27-finance-payment-shift-core-phase-6.md) đã tick; verify pass. |
| Phase 7 — POS Checkout End-to-End | Hoàn thành POS local/UI/service baseline; orchestration/receipt/performance cần acceptance review Phase 12 | [`2026-07-27-pos-checkout-end-to-end-phase-7.md`](2026-07-27-pos-checkout-end-to-end-phase-7.md) đã tick; verify pass. |
| Phase 8 — Sales Orders, Returns & Warranty | Hoàn thành sales/return/exchange/warranty baseline; attachment Drive/policy reversal còn là release scope gap | [`2026-07-27-sales-orders-returns-warranty-phase-8.md`](2026-07-27-sales-orders-returns-warranty-phase-8.md) và [`2026-07-27-phase-8b-return-refund-exchange-completion.md`](2026-07-27-phase-8b-return-refund-exchange-completion.md) đã tick; verify pass. |
| Phase 9 — Purchasing & Supplier Operations | Hoàn thành purchasing backend baseline; purchasing UI/full production adapter thuộc release hardening | [`2026-07-27-purchasing-supplier-operations-phase-9.md`](2026-07-27-purchasing-supplier-operations-phase-9.md) đã tick; verify pass. |
| Phase 10 — Dashboard, Reporting & Export | Hoàn thành dashboard/report/export baseline; worker-backed export, drill-down resolver và archive coverage đã có local hardening; production export/archive drill còn là release gap | [`2026-07-27-dashboard-reporting-export-phase-10.md`](2026-07-27-dashboard-reporting-export-phase-10.md) đã tick; verify pass. |
| Phase 11 — Operations, Backup, Archive & Health | Hoàn thành operations local baseline và private Drive lifecycle baseline cho attachment; restore replacement/session revoke production và Apps Script dry-run còn là release hardening gap | [`2026-07-27-operations-backup-archive-health-phase-11.md`](2026-07-27-operations-backup-archive-health-phase-11.md) đã tick phần baseline; verify pass ở lát cắt đã triển khai. |
| Phase 12 — Release Hardening & Acceptance | Local hardening gates đã chạy; release vẫn Blocked vì còn thiếu production/dry-run evidence | [`2026-07-27-release-hardening-acceptance-phase-12.md`](2026-07-27-release-hardening-acceptance-phase-12.md), `docs/architecture/release-hardening.md`. |

## Current Baseline

Đã có technical foundation deployable:

- `package.json`, build/test/lint/typecheck scripts và Apps Script artifact pipeline.
- `shared/contracts/api.ts`, `shared/schemas/api.ts`, API envelope/result/error cơ bản.
- `apps-script/src/api/invoke.ts`, `web-app.ts`, `web/src/lib/api/google-script-run.ts`.
- React runtime shell tối thiểu, chưa có UI nghiệp vụ.
- Test nền: API schema, Apps Script invoke, web API client và artifact verification.

Chưa có:

- operation registry, auth/session/permission, command coordinator, TableRegistry, Sheet/Drive adapter thực tế.
- tenant bootstrap/migration, Google Sheets physical registry, worker.
- domain service/repository/projection.
- UI production theo Open Design.

## Design Readiness

Đã kiểm tra registry, handoff và Open Design artifact ngày 2026-07-26.

| Screen | Artifact | Registry status | Dùng để code UI? | Ghi chú triển khai |
| --- | --- | --- | --- | --- |
| Sales Dashboard | `app-shell-dashboard.html` | `Approved` | Có | Có thể implement khi Reporting projection và scope metadata đủ contract. |
| POS Checkout | `app-pos-checkout.html` | `Approved` | Có | Ưu tiên UI đầu tiên sau khi Platform + Catalog + Inventory + Finance đủ để checkout thật. |
| Sales Orders / Returns / Warranty | `sales-orders-returns.html` | `Approved` | Có | Code UI theo handoff khi phase Sales/Returns triển khai. |
| Catalog / CRM / Commercial | `catalog-crm-commercial.html` | `Approved` | Có | Code UI theo handoff trong Phase 4 nếu cần surface local cho Catalog/CRM. |
| Inventory / Purchasing | `inventory-purchasing.html` | `Approved` | Có | Code UI theo handoff khi phase Inventory/Purchasing triển khai. |
| Finance / Shifts | `finance-shifts.html` | `Approved` | Có | Code UI theo handoff khi phase Finance/Shifts triển khai. |
| Reporting / Administration / Operations | `reporting-administration-operations.html` | `Approved` | Có | Code UI theo handoff khi phase Reporting/Admin/Operations triển khai. |

## Repository Placement

Triển khai theo ranh giới hiện có:

- `shared/contracts/`: operation names, DTO request/response, enums, command/result types.
- `shared/schemas/`: Zod schema cho envelope và payload operation.
- `shared/types/`: domain primitive/value object thuần TypeScript.
- `shared/constants/`: permission action, storage role, operation constants.
- `apps-script/src/api/`: `invoke`, operation registry, API context, error mapping.
- `apps-script/src/services/platform/`: auth/session, permission/scope, command coordinator, registry/migration, worker và actor metadata policy.
- `apps-script/src/services/<domain>/`: use case/state transition/orchestration domain.
- `apps-script/src/repositories/`: table-aware repository, partition-aware query/write.
- `apps-script/src/infrastructure/`: Sheets, Drive, Properties, Lock, Cache, Clock, ID, telemetry adapter.
- `web/src/app/`: router/provider/AppShell/auth shell/theme/scope provider.
- `web/src/components/`: reusable UI primitives mapped to Cenio Core/shadcn.
- `web/src/features/<feature>/`: screen/page/component/hook/state cho từng domain.
- `tests/`: unit/service/repository/integration/performance harness theo slice.

## Implementation Strategy

Triển khai theo **platform-first, POS-safe vertical slice**:

1. Hoàn thiện platform invariant trước khi có nghiệp vụ.
2. Tạo dữ liệu master tối thiểu để POS có cache thật.
3. Xây Inventory và Finance ledger/projection tối thiểu để checkout có nguồn sự thật.
4. Ghép POS end-to-end vì đây là luồng quyết định khả năng dùng thực tế.
5. Mở rộng sang đơn nhập tay, return, purchasing, reporting và operations.
6. Mỗi phase kết thúc bằng một trạng thái app chạy được, test được và không cần dữ liệu giả hard-code ngoài seed/test fixture.

## Phase 0: Baseline Audit

**Goal:** Chốt hiện trạng foundation đã chạy được trước khi thêm platform thật.

**Files:** Không tạo source mới nếu audit không phát hiện lỗi. Có thể cập nhật plan chi tiết nếu phát hiện thiếu gate.

- [x] Chạy `node scripts/verify-structure.mjs`.
- [x] Chạy `npm run typecheck`.
- [x] Chạy `npm run lint`.
- [x] Chạy `npm test`.
- [x] Chạy `npm run build && npm run check:artifact`.
- [x] Ghi lại mọi lỗi nền tảng vào plan sửa riêng trước khi sang Phase 1.

**Exit gate:** `npm run verify` pass hoặc có danh sách lỗi nền tảng rõ ràng đã được xử lý.

## Phase 1: Platform Core

**Goal:** Có runtime platform đủ để mọi domain đi qua cùng API pipeline, session, permission, command và Sheet registry.

**Primary docs:** `platform-technical-design.md`, `security-and-access.md`, `sheet-schema-and-registry.md`, `storage-partitioning-and-lifecycle.md`, ADR `0001`, `0003`, `0005`, `0008`, `0009`, `0010`.

**Create/modify:**

- `shared/contracts/platform/*`: `OperationName`, `ApiContextDTO`, auth/session DTO, command status DTO, permission/scope DTO.
- `shared/schemas/platform/*`: schema login, command status, scope selection, registry/bootstrap.
- `apps-script/src/api/operation-registry.ts`: typed operation allowlist.
- `apps-script/src/api/api-context.ts`: request context, actor context, scope metadata.
- `apps-script/src/services/platform/auth/*`: password hashing seam, login/change password/logout/session revoke.
- `apps-script/src/services/platform/authorization/*`: permission action, scope intersection, sensitive field capability.
- `apps-script/src/services/platform/command/*`: `CommandCoordinator`, idempotency check, command status lookup.
- `apps-script/src/services/platform/registry/*`: `TableRegistry`, schema migration, partition routing.
- `apps-script/src/infrastructure/*`: fakeable adapters cho Sheets, Drive, Properties, Lock, Cache, Clock, ID, telemetry.
- `tests/apps-script/platform/*`: unit/service tests và fake Apps Script harness.

**Steps:**

- [x] Viết operation registry với login public duy nhất; mọi operation khác yêu cầu session.
- [x] Tạo `ActorContext` và permission/scope resolver backend, không để frontend làm security boundary.
- [x] Implement session metadata: idle expiry 1 giờ, absolute expiry 8 giờ, revoke theo `authVersion`.
- [x] Implement login lockout: khóa 15 phút sau 5 lần sai.
- [x] Implement command journal: `Preparing`, `Committed`, `Failed`, retry cùng idempotency key trả outcome cũ.
- [x] Implement TableRegistry/header mapping/migration append-only; không hard-code header index.
- [x] Implement storage role + active partition locator cho Core/Runtime/Transaction/Audit ở mức registry/seam in-memory của Phase 1.
- [x] Superseded by ADR 0017: bỏ `AuditOutbox` write contract khỏi baseline, dùng actor metadata trên record.
- [x] Add sanitized telemetry meta: requestId, durationMs, stage timing, I/O summary.
- [x] Test permission/scope denial trước repository, session expiry/revoke, idempotency duplicate, migration idempotent, missing header, partition routing.

**Exit gate:** Có thể login bằng user seed trong fake repository, gọi query/mutation mẫu qua operation registry, command retry không duplicate, và toàn bộ test platform pass.

## Phase 2: Tenant Bootstrap & Administration Minimum

**Goal:** Cài app lần đầu tạo tenant, Branch, Warehouse, role, admin mặc định và cấu hình tối thiểu để vào app bằng tài khoản nội bộ.

**Primary docs:** `SRS-OVR-001`, `SRS-OVR-005..008`, `SRS-OVR-019`, `deployment-and-lifecycle.md`, `administration-reporting-operations.md`, `operations-reporting.md`.

**Create/modify:**

- `apps-script/src/services/platform/bootstrap/*`: tenant installer, default admin, default branch/warehouse.
- `apps-script/src/services/administration/*`: user/role/scope/config/branch/warehouse use cases tối thiểu.
- `apps-script/src/repositories/platform/*`: Tenant, Branch, Warehouse, User, Role, RolePermission, UserRole, UserScope, TenantConfigVersion.
- `web/src/app/auth/*`: login shell, password-change-required flow.
- `web/src/app/scope/*`: current Branch/Warehouse provider.

**Steps:**

- [x] Tạo bootstrap command idempotent cho tenant mới: một Branch và một Warehouse mặc định.
- [x] Tạo admin mặc định với mật khẩu tạm một lần, bắt buộc đổi mật khẩu lần đầu.
- [x] Tạo role/permission baseline theo actor trong SRS.
- [x] Tạo login UI tối thiểu, không dùng Google account làm identity.
- [x] Tạo session provider, logout, auto idle timeout và absolute timeout.
- [x] Tạo Branch/Warehouse scope provider và chặn scope không hợp lệ.
- [x] Test không disable Warehouse khi còn blocker bằng fake blocker service.
- [x] Test reset password/disable/role change revoke session.

**Exit gate:** App có thể bootstrap tenant, login admin, đổi mật khẩu, xem scope mặc định, logout và revoke session đúng.

## Phase 3: UI Foundation

**Goal:** Tạo component/system layer production để các màn Approved có thể code nhất quán với Cenio Core v0.6.

**Primary docs:** `docs/design/design-system.md`, `docs/design/implementation-rules.md`, Open Design `DESIGN.md`.

**Create/modify:**

- `web/src/styles/index.css`: Cenio Core tokens light/dark.
- `web/src/components/ui/*`: Button, IconButton, Select/Listbox, Badge, Panel, Table, Tabs, Dialog, Toast, Skeleton, StateBlock.
- `web/src/app/app-shell/*`: topbar/sidebar/theme toggle/scope selectors.
- `web/src/app/router/*`: route registry và protected route.

**Steps:**

- [x] Map token Cenio Core v0.6 vào CSS variables/Tailwind setup; không tạo palette cục bộ.
- [x] Implement custom Select/Listbox keyboard/focus state; không dùng native visual select.
- [x] Implement button loading rule: giữ label, chỉ thêm loading icon.
- [x] Implement theme toggle icon button ở header.
- [x] Implement restricted/loading/empty/error/scope/stale/archive/command state components ở mức primitive `StateBlock`; state nghiệp vụ cụ thể sẽ gắn theo từng màn/module.
- [x] Add UI tests cho theme, select interaction, command button no duplicate ở mức primitive/app shell.
- [x] Đối chiếu artifact Approved trước khi dựng shell màn thật: Dashboard `app-shell-dashboard.html`, POS `app-pos-checkout.html`; visual QA chi tiết vẫn thực hiện theo từng màn domain khi nối dữ liệu thật.

**Exit gate:** Component layer có thể dựng AppShell, Dashboard skeleton và POS shell theo Cenio Core ở light/dark.

## Phase 4: Catalog, CRM & Commercial Core

**Goal:** Có master data và POS read model đủ cho scan/search/cart local, pricing quote và customer quick lookup.

**Primary docs:** `customers-promotions.md`, `catalog-crm.md`, `catalog-crm.md` table dictionary, ADR `0011`, `0012`.

**Create/modify:**

- `shared/contracts/catalog/*`, `shared/schemas/catalog/*`.
- `apps-script/src/services/catalog/*`: product/variant/barcode/unit/bundle, price, promotion, quote.
- `apps-script/src/services/crm/*`: customer, duplicate policy, quick customer, customer group.
- `apps-script/src/repositories/catalog/*`, `apps-script/src/repositories/crm/*`.
- `web/src/features/catalog/*`: chỉ code UI khi artifact `catalog-crm-commercial.html` được Approved.
- `web/src/features/pos/catalog-cache/*`: cache namespace, version, barcode index, local search.

**Steps:**

- [x] Implement Variant là transaction unit duy nhất; product đơn giản tự có Default Variant.
- [x] Implement SKU/barcode normalized unique check trong command lock.
- [x] Implement UnitConversionVersion và effective range.
- [x] Implement PriceList/PriceRule publish guard chống conflict.
- [x] Implement deterministic quote: product price -> branch price -> customer group price -> one best automatic promotion -> voucher/point.
- [x] Implement `CatalogPosProjection` theo Branch/Warehouse/version, không chứa cost/supplier/secret.
- [x] Implement customer quick create, duplicate warning và customer group snapshot source.
- [x] Test scan/search no backend per keystroke khi cache warm.
- [x] Test price/promotion stale conflict cho checkout.
- [x] Product/Variant CRUD completion extension: list/search/filter, create, update Product Type/Inventory Mode/Default Unit/SKU/barcode/giá, ngừng bán/kích hoạt lại; Apps Script API + local fake backend + màn Hàng hóa nối theo Approved Open Design artifact mới nhất.
- [x] Customer workspace completion extension: tìm kiếm khách hàng, tạo nhanh, cảnh báo trùng, nhóm khách bằng segmented control; UI không tải công nợ/hạn mức nhạy cảm.

**Exit gate:** POS có thể tải cache catalog 10.000 SKU/variant trong profile test, scan/search local đạt budget, quote trả kết quả deterministic và conflict code ổn định.

## Phase 5: Inventory Ledger & Balance Core

**Goal:** Có `InventoryMovement` và projection đủ cho tồn đầu kỳ, receipt, sale issue, reservation, lot/serial, transfer và stocktake baseline.

**Primary docs:** `inventory.md`, `inventory.md` LLD, `sales-inventory.md`, ADR `0014`.

**Create/modify:**

- `shared/contracts/inventory/*`, `shared/schemas/inventory/*`.
- `apps-script/src/services/inventory/*`: movement, balance, reservation, lot/serial, transfer, stocktake.
- `apps-script/src/repositories/inventory/*`.

**Steps:**

- [x] Implement quantity milli-unit và value VND integer.
- [x] Implement moving weighted average cost theo Warehouse + Variant.
- [x] Implement `InventoryMovement` append-only và `InventoryBalance` projection batch update.
- [x] Implement opening balance/import-safe flow; không ghi trực tiếp balance.
- [x] Implement `issueForSale`, `reserve`, `release`, `receive`, `return.receive/resolve`.
- [x] Implement lot FEFO và serial state guard.
- [x] Implement transfer state và stocktake state.
- [x] Test two receipts average cost, issue value rounding, concurrent last stock, expired lot, serial uniqueness, negative stock approval.

**Tracking hiện tại:** Core receive/issue/reserve/release/return quarantine/restock, table registry, API composition, local fake backend và Inventory/Purchasing UI shell đã triển khai trong [`2026-07-27-inventory-ledger-balance-core-phase-5.md`](2026-07-27-inventory-ledger-balance-core-phase-5.md). Transfer/stocktake baseline, API composition, sheet-backed persistence và workbench UI đã triển khai trong [`2026-08-01-inventory-transfer-stocktake-baseline.md`](2026-08-01-inventory-transfer-stocktake-baseline.md). Opening/import-safe, `InventoryLotBalance`, `SerialState`, expired-lot guard, serial saleable guard và local test matrix average-cost/rounding/last-stock/negative-stock đã triển khai trong [`2026-08-01-inventory-opening-lot-serial-guard.md`](2026-08-01-inventory-opening-lot-serial-guard.md).

**Exit gate:** Backend có thể tăng/giảm/reserve tồn qua command, balance đối soát được từ movement, không có đường sửa số dư trực tiếp.

## Phase 6: Finance, Payment & Shift Core

**Goal:** Có Payment/CashTransaction/Receivable/Payable/Allocation/Shift đủ để POS checkout và công nợ vận hành.

**Primary docs:** `finance.md`, `finance-shifts.md`, `purchasing-finance.md`.

**Create/modify:**

- `shared/contracts/finance/*`, `shared/schemas/finance/*`.
- `apps-script/src/services/finance/*`: payment, allocation, AR/AP, credit/prepayment, cash drawer, shift, expense.
- `apps-script/src/repositories/finance/*`.
- `web/src/features/finance/*`: chỉ code UI khi artifact `finance-shifts.html` được Approved.

**Steps:**

- [x] Implement CashDrawer/PaymentMethod master.
- [x] Implement `finance.shift.open/close/lock` và policy một cashier/một drawer.
- [x] Implement `finance.payment.record` với nhiều allocation.
- [x] Implement receivable/payable obligation ledger và aging projection.
- [x] Implement payment reversal/counter-transaction, không sửa payment gốc.
- [x] Implement expense approval tạo disbursement/cash transaction.
- [x] Test POS thiếu ca bị chặn, partial payment tạo receivable, overpayment tạo credit, reversal không sửa nguồn.

**Tracking hiện tại:** Shift open/close/lock, payment record multi-allocation, receivable partial/settled, payable obligation, overpayment customer credit, reversal, expense cash transaction, POS missing-shift integration test, TableRegistry, API composition, local fake backend và Finance/Shifts UI shell đã triển khai trong [`2026-07-27-finance-payment-shift-core-phase-6.md`](2026-07-27-finance-payment-shift-core-phase-6.md), Phase 7 và slice Finance master/aging ngày 2026-08-02. CashDrawer/PaymentMethod master commands, `finance.master.get`, `finance.aging.get`, due-date aging buckets và local fake backend parity đã có test. Finance performance/concurrency matrix vẫn để mở cho các slice hardening sau.

**Exit gate:** POS command có thể gọi Finance để ghi payment/AR/shift an toàn trong cùng command.

## Phase 7: POS Checkout End-to-End

**Goal:** Có luồng bán tại quầy thật, usable cho cửa hàng nhỏ, bám artifact POS `Approved`.

**Primary docs:** `sales-orders.md`, `pos-checkout.md`, `sales-pos-returns.md`, ADR `0004`, `0005`, `0012`, `0013`, `0014`.

**Create/modify:**

- `shared/contracts/sales/*`, `shared/schemas/sales/*`.
- `apps-script/src/services/sales/*`: draft, complete POS, receipt snapshot.
- `apps-script/src/repositories/sales/*`.
- `web/src/features/pos/*`: route/page/components/hooks/cache/cart/tender/receipt.
- `tests/web/pos/*`, `tests/apps-script/sales/*`, `tests/performance/pos/*`.

**Steps:**

- [x] Implement browser cart local state; scan/search/add/change quantity không RPC khi cache warm.
- [x] Implement explicit `saveDraft`, `openDraft`, `cancelDraft`; không autosave.
- [x] Implement POS checkout command with Sales -> Catalog -> Inventory -> Finance orchestration; CRM policy ledger chưa phát sinh vì loyalty/promotion usage ledger chưa thuộc release baseline đang code.
- [x] Revalidate scope qua API permission/scope, shift, quote, stock, tender total và idempotency trong commit; lot/serial guard đầy đủ bám Phase 5 lot/serial slice và UI chặn thiếu selection.
- [x] Return structured conflict tối thiểu đã dùng trong baseline: `PRICE_CHANGED`, `INSUFFICIENT_STOCK`; các mã `PROMOTION_CHANGED`, `VOUCHER_UNAVAILABLE`, `POINT_BALANCE_CHANGED` giữ trong contract để bật khi promotion/voucher/point ledger được triển khai đủ.
- [x] Return immutable receipt snapshot for K80/A4 browser print; print/reprint không tạo ledger.
- [x] Implement POS UI from `app-pos-checkout.html` only after opening artifact/local preview.
- [x] Test full payment, partial payment, insufficient stock, quote conflict, timeout command-status recovery, duplicate prevention và print no-ledger; missing serial được UI guard, serial availability backend thuộc Phase 5 lot/serial test matrix.
- [x] Benchmark warm scan/search/cart and checkout p95/p99 theo `SRS-OVR-013`.

**Exit gate:** Một cửa hàng nhỏ có thể bán POS từ cache, checkout tạo SaleOrder Completed + InventoryMovement + Payment/AR + policy ledger + actor metadata + CommandTransaction một lần, receipt in được và retry không duplicate.

**Tracking hiện tại:** Phase 7 baseline đã triển khai trong [`2026-07-27-pos-checkout-end-to-end-phase-7.md`](2026-07-27-pos-checkout-end-to-end-phase-7.md): Sales contracts/schema, in-memory repository/service, API operations, TableRegistry Sales, local cart state, local fake backend Sales, POS UI interactive, full payment, partial receivable, insufficient stock, missing shift, price stale conflict, idempotency duplicate prevention, receipt snapshot và print/reprint UI action không tạo ledger. Baseline hiện chưa bật voucher/points/promotion budget nên `PROMOTION_CHANGED`, `VOUCHER_UNAVAILABLE`, `POINT_BALANCE_CHANGED` là disabled policy cho tới khi module tương ứng được bật. CRM policy ledger, lot/serial backend guard đầy đủ, credit policy, timeout recovery và benchmark p95/p99 vẫn để mở.

## Phase 8: Sales Orders, Manual Online, Return & Warranty

**Goal:** Hoàn thiện vòng đời chứng từ bán ngoài POS và hậu mãi.

**Primary docs:** `sales-orders.md`, `sales-orders-returns.md`, `sales-pos-returns.md`.

**UI gate:** Không implement UI từ `sales-orders-returns.html` cho tới khi registry và handoff là `Approved`.

**Steps:**

- [x] Implement SaleOrder list/detail query theo Branch/Warehouse/status/date partition.
- [x] Implement online manual lifecycle: Draft -> Confirmed -> Packing -> Shipped -> Delivered.
- [x] Implement reservation ở Confirmed, issue/revenue/AR ở Shipped, Delivered không ledger lần hai.
- [x] Implement cancel trước Shipped.
- [x] Implement deposit credit/refund behavior khi hủy đơn có đặt cọc.
- [x] Implement return by source, fast return permission, inspection Quarantine/Restock/Scrap.
- [x] Implement exchange as Return + new SaleOrder linked.
- [x] Implement WarrantyCase lifecycle and attachment references.
- [x] Test online reservation/cancel/ship/deliver, return max quantity, fast return denial, exchange net settlement, warranty serial trace.

**Exit gate:** Chứng từ bán và hậu mãi giữ bất biến lịch sử, mọi sửa sai đi qua return/reversal/adjustment.

**Tracking hiện tại:** Phase 8 baseline đã triển khai trong [`2026-07-27-sales-orders-returns-warranty-phase-8.md`](2026-07-27-sales-orders-returns-warranty-phase-8.md), bổ sung Phase 8B trong [`2026-07-27-phase-8b-return-refund-exchange-completion.md`](2026-07-27-phase-8b-return-refund-exchange-completion.md): Sales order list/detail query, online `Draft -> Confirmed -> Packing -> Shipped -> Delivered`, reservation ở Confirmed, release+issue+receivable ở Shipped, Delivered không tạo ledger lần hai, cancel trước Shipped baseline, deposit cancel giữ `CustomerCredit` hoặc ghi refund counter-payment theo lựa chọn, return theo đơn gốc vào Quarantine/Restock/KeepQuarantine/Scrap, return refund/customer credit, fast-return denial, exchange = Return + SaleOrder mới liên kết với net settlement, WarrantyCase open/transition kèm attachment IDs, API/local fake backend và UI `orders` đã nối list/lifecycle vào API theo handoff Approved. UI đã bổ sung vùng `Manual fulfillment detail` theo artifact Approved mới nhất gồm timeline, reservation, khách nhận, nghĩa vụ thanh toán, pre-confirm checks, bàn giao và cancel guard. UI đã bổ sung composer “Tạo / sửa đơn nhập tay” theo trạng thái `#manual`, explicit save, lazy-load catalog khi bấm lưu và gọi `sales.draft.save`; không autosave khi nhập liệu. UI đã nối panel `Trả hàng theo đơn gốc` vào `sales.order.get`, `sales.return.create` và `sales.return.resolve` lazy-on-click, có guard `Completed/Shipped/Delivered` và fast-return restricted state. UI đã nối panel `Bảo hành theo serial` vào `sales.order.get`, `sales.warranty.open` và `sales.warranty.transition` lazy-on-click, có Serial/IMEI, issue, attachment reference và lifecycle `Open -> InReview -> Resolved`. UI đã nối panel `Đổi hàng & thanh toán chênh lệch` vào `sales.order.get`, `catalog.pos.getProjection`, `catalog.quote.preview` và `sales.exchange.create` lazy-on-click, có hàng nhận lại, hàng đổi mới và net settlement. Attachment Drive flow, CRM policy reversal đầy đủ và performance benchmark vẫn để mở.

## Phase 9: Purchasing & Supplier Operations

**Goal:** Có PO, Goods Receipt, landed cost, late invoice/cost adjustment, supplier return và payable handoff.

**Primary docs:** `purchasing.md`, `purchasing.md` LLD, `purchasing-finance.md`, ADR `0015`.

**UI gate:** Không implement UI từ `inventory-purchasing.html` cho tới khi registry và handoff là `Approved`.

**Steps:**

- [x] Implement Supplier master và supplier status.
- [x] Implement PO lifecycle; PO không tạo tồn/cost/payable.
- [x] Implement GoodsReceipt approval tạo Inventory receive + Payable.
- [x] Implement landed cost allocation exact reconciliation.
- [x] Implement late cost split: on-hand allocated value và `PurchaseCostVariance` cho phần đã bán.
- [x] Implement SupplierReturn limit by receipt less returned quantity.
- [x] Implement SupplierReturn `ReducePayable`, `Refund`, `Replacement` và SupplierPrepayment behavior.
- [x] Superseded by ADR 0017: GoodsReceipt/SupplierReturn approval lưu `approvedBy/approvedAt`, không ghi AuditOutbox.
- [x] Test partial receipt, lot/serial receipt rejection, late cost split, supplier return ReducePayable settlement, payment allocation multi-receipt.

**Exit gate:** Nhập hàng và chi phí mua thay đổi tồn/cost/payable bằng chứng từ duyệt, không sửa receipt hoặc COGS lịch sử.

**Tracking hiện tại:** Phase 9 backend đã triển khai trong [`2026-07-27-purchasing-supplier-operations-phase-9.md`](2026-07-27-purchasing-supplier-operations-phase-9.md): Supplier master/status, PO lifecycle no-ledger, GoodsReceipt approval tạo Inventory `PurchaseReceipt` + Finance Payable + `approvedBy/approvedAt`, landed cost snapshot, late cost split theo ADR 0015, SupplierReturn `ReducePayable` tạo Inventory `PurchaseReturn` + giảm payable, SupplierReturn `Refund` tạo SupplierPrepayment, SupplierReturn `Replacement` không chỉnh payable/prepayment, SupplierReturn approval lưu `approvedBy/approvedAt`, lot/serial receipt rejection, supplier payment allocation nhiều receipt, API composition và local fake backend đã có contract/service/test. Purchasing UI chưa triển khai do còn chờ UI gate theo design/handoff Approved.

## Phase 10: Dashboard, Reporting & Export

**Goal:** Có dashboard vận hành được duyệt và nền báo cáo/export không cạnh tranh POS.

**Primary docs:** `access-reporting.md`, `sales-dashboard.md`, `administration-reporting-operations.md`, `operations-reporting.md`.

**Create/modify:**

- `shared/contracts/reporting/*`, `shared/schemas/reporting/*`.
- `apps-script/src/services/reporting/*`: dashboard projection, report query, drill-down token, export run.
- `apps-script/src/repositories/reporting/*`.
- `web/src/features/dashboard/*`: được code ngay vì Dashboard Approved.
- `web/src/features/reporting/*`: UI còn lại chờ artifact Approved.

**Steps:**

- [x] Implement report query envelope: reportId, dateField, date range, scope, filters, cursor/page size, asOf.
- [x] Implement DashboardProjection theo Branch/date bucket; không quét ledger/document toàn kỳ khi mở dashboard.
- [x] Implement metadata `generatedAt`, `asOf`, `partitionCoverage`, `archiveIncluded`.
- [x] Backend loại sensitive COGS/profit trước projection/export khi thiếu permission.
- [x] Implement export small/large routing: small sync ngoài lock, large worker/checkpoint baseline.
- [x] Implement Sales Dashboard UI từ `app-shell-dashboard.html`, không thêm recent activity thật nếu chưa có query/projection contract.
- [x] Test scope denial, sensitive field removed, API/local fake reporting operations và export routing baseline.
- [x] Test archive coverage partial, drill-down token revalidates permission, worker-backed export không giữ ScriptLock.

**Exit gate:** Dashboard hiển thị đúng 4 KPI, chart, queue, manual order table, metadata freshness/coverage và restricted state từ backend.

**Tracking hiện tại:** Phase 10A đã triển khai trong [`2026-07-27-dashboard-reporting-export-phase-10.md`](2026-07-27-dashboard-reporting-export-phase-10.md): shared Reporting contracts/schema, `reporting.dashboard.get`, `reporting.report.query`, `reporting.export.request`, `reporting.export.getStatus`, in-memory DashboardProjection/ExportRun repository, service scope guard, sensitive-field filtering, API composition, local fake backend, và Sales Dashboard UI nối `reporting.dashboard.get` theo artifact Approved. Đã bổ sung local worker-backed export baseline (`runReportingExportChunk`) và scheduled worker wiring cho `LargeWorker` export run; đã bổ sung `reporting.drillDown.resolve` revalidate actor scope/quyền sensitive từ token qua single API gateway; đã bổ sung partition coverage resolver để report query trả `Partial` khi chạm archived partition mà chưa include archive. Phase 10 local baseline đã đủ checklist; Drive export production drill vẫn theo dõi ở Phase 12/release-hardening.

## Phase 11: Import, Attachment, Audit, Backup, Restore, Archive & Health

**Goal:** Hoàn thiện vận hành dữ liệu để khách dùng lâu dài trên Google Workspace của họ.

**Primary docs:** `access-reporting.md`, `administration-reporting-operations.md`, `storage-partitioning-and-lifecycle.md`, `deployment-and-lifecycle.md`, ADR `0006`, `0007`, `0008`.

**Steps:**

- [x] Implement ImportBatch/ImportStagingRow canonical flow: template, upload, validate, confirm, commit by worker/chunk.
- [x] Implement attachment metadata and private Drive access; không trả public URL.
  - [x] `operations.attachment.upload` ghi file vào thư mục Drive Attachments riêng tư qua `DriveGateway.savePrivateAttachment`, lưu metadata và không trả public URL.
  - [x] `operations.attachment.list/delete/download` kiểm quyền/scope, logical delete, trả content base64 qua backend khi storage hỗ trợ và không trả public URL.
- [x] Superseded by ADR 0017: AuditOutbox delivery worker không còn là baseline cần release.
- [x] Implement daily/manual backup manifest with checksums and retention 30 newest daily.
- [ ] Implement restore prepare -> replacement resources -> Owner switch -> revoke sessions -> health check; không overwrite production.
- [x] Implement active partition capacity alert, create next partition, archive read-only routing.
- [x] Implement runtime TTL cleanup only for technical expired data, never business/ledger history.
- [x] Test import retry no duplicate, attachment permission, backup manifest checksum, restore switch, archive query routing; audit search superseded by ADR 0017.

**Exit gate:** App có backup/restore/archive/health story đủ để bán một lần và vận hành dài hạn.

**Tracking hiện tại:** Phase 11 baseline đã triển khai trong [`2026-07-27-operations-backup-archive-health-phase-11.md`](2026-07-27-operations-backup-archive-health-phase-11.md): shared Operations contracts/schema, in-memory operations repository/service, API composition, local fake backend handlers, TableRegistry definitions cho Import/Attachment/Backup/Restore/Health/Capacity/ReportProjection, import validate/commit baseline, attachment internal access token không public URL, backup manifest checksum, restore prepare/switch marker, partition capacity alert + next partition và runtime TTL cleanup. Audit delivery/search đã bị superseded bởi ADR 0017 và không còn là baseline. Đã bổ sung `runImportCommitChunk` để commit import theo chunk/idempotent và scheduled worker wiring cho batch `Committing`; đã bổ sung `runArchiveChunk` và scheduled archive job cho closed transaction partition. Đã bổ sung `operations.attachment.upload/list/delete/download` + `DriveGateway.save/read/trashPrivateAttachment` để ghi, đọc và logical delete file trong thư mục Drive Attachments riêng tư trên production, không trả public URL. Các checkbox master còn mở vì cần backup/restore replacement resources, session revoke thật khi restore switch và Apps Script drill trên tài nguyên Google thật.

## Phase 12: Full Release Hardening

**Goal:** Chuẩn hóa performance, security, migration, deployment và nghiệm thu sellable baseline.

**Steps:**

- [ ] Seed representative dataset: 1 Branch, 1 Warehouse, 1 cashier, 10.000 SKU/variant, transaction mix đại diện.
- [ ] Benchmark POS cold/warm cache, scan, search, cart change, simple/complex checkout, timeout retry, concurrent checkout, report/export song song.
- [x] Run security review: session token not logged, password not stored/exported, scope cannot be bypassed, sensitive fields backend-gated.
- [ ] Run migration dry-run on fresh tenant and upgraded tenant with backup before migration.
- [ ] Run restore drill with replacement resources.
- [x] Run accessibility/keyboard checks for approved UI screens.
- [x] Run `npm run verify` and Apps Script artifact check.
- [x] Prepare deployment runbook and customer installation checklist.

**Exit gate:** Baseline release đạt SRS acceptance trọng yếu, POS performance budget và deployment/restore drill thành công.

**Tracking hiện tại:** Detailed plan Phase 12 đã tạo trong [`2026-07-27-release-hardening-acceptance-phase-12.md`](2026-07-27-release-hardening-acceptance-phase-12.md). Task 1 và Task 3 đã triển khai: `npm run release:readiness` hiện trả `Blocked` với P0/P1 gaps rõ ràng; `docs/architecture/release-hardening.md` và `docs/architecture/release-scope-baseline.md` đã phân loại gap release. Task 2 đã triển khai production adapter seam `SheetGateway`/`DriveGateway`/`RuntimeConfigStore`/`AppsScriptLockProvider` với contract tests; platform, Catalog, CRM, Inventory, Purchasing, Finance, Sales, Reporting và Operations repository đã có sheet-backed cutover bằng targeted tests; `createProductionRepositories` đã gom các repository sheet-backed vào một factory nhận `SheetGateway`/partition. P0 persistence vẫn mở cho tới khi `createApiComposition` production/runtime config cutover và drill với tài nguyên thật hoàn tất. Task 4 đã triển khai cross-domain acceptance harness qua `createApiComposition().invoke(...)` cho bootstrap/auth/POS/dashboard, online/receivable/return, purchasing/payable/payment và backup/restore/health. Task 5 đã triển khai POS performance local baseline cho 10.000 variants, warm scan/search/cart và checkout local in-memory. Task 6 đã triển khai security review baseline cho authVersion revoke, secret sanitization, scope và sensitive-field filtering. Task 7 đã triển khai worker/backup/restore/archive local baseline cho lease/checkpoint/retry, backup retention, replacement restore và archive read-only routing. Task 8 đã triển khai UI accessibility/Approved screen acceptance. Task 9 đã tạo deployment runbook/customer installation checklist và safety guard cho `.clasp.json`. Task 10 đã chạy `npm run verify`, `npm run release:readiness` và POS benchmark targeted; release vẫn `Blocked` do thiếu production/dry-run evidence: production composition wiring, Apps Script POS benchmark, scheduled trigger/Drive-Sheets drill, deployment migration dry-run và restore replacement-resource drill.

## Recommended Execution Order

| Order | Plan cần tạo trước khi code | Lý do |
| --- | --- | --- |
| 1 | `platform-core` | Mọi domain phụ thuộc API/session/permission/command/registry. |
| 2 | `tenant-bootstrap-administration-minimum` | Cần đăng nhập nội bộ và scope mặc định trước khi dùng app. |
| 3 | `ui-foundation-cenio-core` | Tránh mỗi màn tự tạo component/token riêng. |
| 4 | `catalog-crm-commercial-core` | POS cần variant/barcode/unit/price/promotion/customer. |
| 5 | `inventory-ledger-balance-core` | POS cần tồn/giá vốn/lot/serial/source of truth. |
| 6 | `finance-payment-shift-core` | POS cần ca, payment, AR và cash ledger. |
| 7 | `pos-checkout-end-to-end` | Luồng bán tại quầy là lát cắt sellable đầu tiên. |
| 8 | `sales-orders-returns-warranty` | Mở rộng sau POS, gồm online manual và hậu mãi. |
| 9 | `purchasing-supplier-operations` | Hoàn thiện vòng nhập hàng/cost/payable. |
| 10 | `dashboard-reporting-export` | Dùng projection từ domain đã có, không dựng số giả. |
| 11 | `operations-backup-archive-health` | Bảo đảm vận hành dài hạn trên tài khoản khách. |
| 12 | `release-hardening` | Benchmark, migration, restore drill và checklist bán hàng. |

## Cross-Phase Quality Gates

- Mỗi operation mới có `OperationName`, input/output schema, permission action, scope resolver, handler và error contract.
- Mỗi table mới có TableRegistry definition, headers, owner, storage role, lifecycle, primary key, lookup key và migration test.
- Mỗi mutation có command/idempotency test, permission/scope test, retry/duplicate test, actor metadata test và failure recovery test.
- Mỗi projection có source ledger/document trace, rebuild path và permission/sensitive-field test.
- Mỗi UI screen đọc registry/handoff/artifact trước code, kiểm light/dark, loading/empty/error/restricted/scope/stale/command states.
- Mỗi POS-impacting release có performance benchmark và không thêm RPC vào scan/search/cart warm path.

## Open Decisions Before Specific Phases

Không có blocker cho Implementation Planning tổng thể. Các quyết định sau chỉ cần chốt đúng thời điểm trước khi code phase tương ứng:

- UI các artifact đang `Review` phải được user duyệt và cập nhật registry/handoff sang `Approved` trước khi code UI production.
- Profile seed/performance đại diện cần chốt dữ liệu mẫu cụ thể trước Phase 12.
- Deployment thật cần `.clasp.json` cục bộ và Apps Script project của tenant/test tenant; không lưu `scriptId` trong source.

## First Next Action

Bước tiếp theo nên là tạo Apps Script test project local-only (`.clasp.json` không commit), rồi chạy deployment dry-run và restore drill theo [`deployment-runbook.md`](../../architecture/deployment-runbook.md). Nếu chưa có test project, tiếp tục code phần cutover production repositories/scheduled trigger để gỡ các P0 còn lại trước khi dry-run.
