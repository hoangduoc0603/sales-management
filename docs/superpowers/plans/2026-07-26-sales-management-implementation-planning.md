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
- Mọi mutation nghiệp vụ phải đi qua `CommandTransaction`, idempotency key, permission/scope backend, ledger/projection cần thiết và `AuditOutbox`.
- Mọi release ảnh hưởng POS phải có benchmark theo `SRS-OVR-024`; report/export/import/backup/archive không được cạnh tranh POS fast path.

---

## Scope Check

Toàn bộ ứng dụng gồm nhiều bounded context độc lập: Platform, Administration, Catalog/CRM, Inventory, Purchasing, Finance/Shifts, Sales/POS/Returns, Reporting/Operations. Vì vậy kế hoạch này là **master implementation plan**, không phải một plan code duy nhất cho toàn bộ app.

Mỗi phase dưới đây phải được tách thành implementation plan chi tiết riêng trước khi code nếu phase có nhiều task hoặc thay đổi nhiều module. Plan chi tiết phải chỉ rõ file tạo/sửa, test fail/pass, acceptance scenario và command verify.

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
| Sales Orders / Returns / Warranty | `sales-orders-returns.html` | `Review` | Chưa | Chỉ code UI sau khi user duyệt và registry/handoff đổi `Approved`. |
| Catalog / CRM / Commercial | `catalog-crm-commercial.html` | `Review` | Chưa | Backend/API có thể làm trước; UI chờ duyệt. |
| Inventory / Purchasing | `inventory-purchasing.html` | `Review` | Chưa | Backend/API có thể làm trước; UI chờ duyệt. |
| Finance / Shifts | `finance-shifts.html` | `Review` | Chưa | Backend/API có thể làm trước; UI chờ duyệt. |
| Reporting / Administration / Operations | `reporting-administration-operations.html` | `Review` | Chưa | Backend/API có thể làm trước; UI quản trị chờ duyệt trừ Dashboard đã Approved. |

## Repository Placement

Triển khai theo ranh giới hiện có:

- `shared/contracts/`: operation names, DTO request/response, enums, command/result types.
- `shared/schemas/`: Zod schema cho envelope và payload operation.
- `shared/types/`: domain primitive/value object thuần TypeScript.
- `shared/constants/`: permission action, storage role, operation constants.
- `apps-script/src/api/`: `invoke`, operation registry, API context, error mapping.
- `apps-script/src/services/platform/`: auth/session, permission/scope, command coordinator, registry/migration, worker, audit/outbox.
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

- [ ] Chạy `node scripts/verify-structure.mjs`.
- [ ] Chạy `npm run typecheck`.
- [ ] Chạy `npm run lint`.
- [ ] Chạy `npm test`.
- [ ] Chạy `npm run build && npm run check:artifact`.
- [ ] Ghi lại mọi lỗi nền tảng vào plan sửa riêng trước khi sang Phase 1.

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

- [ ] Viết operation registry với login public duy nhất; mọi operation khác yêu cầu session.
- [ ] Tạo `ActorContext` và permission/scope resolver backend, không để frontend làm security boundary.
- [ ] Implement session metadata: idle expiry 1 giờ, absolute expiry 8 giờ, revoke theo `authVersion`.
- [ ] Implement login lockout: khóa 15 phút sau 5 lần sai.
- [ ] Implement command journal: `Preparing`, `Committed`, `Failed`, retry cùng idempotency key trả outcome cũ.
- [ ] Implement TableRegistry/header mapping/migration append-only; không hard-code header index.
- [ ] Implement storage role + active partition locator cho Core/Runtime/Transaction/Audit.
- [ ] Implement `AuditOutbox` write contract cho command bắt buộc audit.
- [ ] Add sanitized telemetry meta: requestId, durationMs, stage timing, I/O summary.
- [ ] Test permission/scope denial trước repository, session expiry/revoke, idempotency duplicate, migration idempotent, missing header, partition routing.

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

- [ ] Tạo bootstrap command idempotent cho tenant mới: một Branch và một Warehouse mặc định.
- [ ] Tạo admin mặc định với mật khẩu tạm một lần, bắt buộc đổi mật khẩu lần đầu.
- [ ] Tạo role/permission baseline theo actor trong SRS.
- [ ] Tạo login UI tối thiểu, không dùng Google account làm identity.
- [ ] Tạo session provider, logout, auto idle timeout và absolute timeout.
- [ ] Tạo Branch/Warehouse scope provider và chặn scope không hợp lệ.
- [ ] Test không disable Warehouse khi còn blocker bằng fake blocker service.
- [ ] Test reset password/disable/role change revoke session.

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

- [ ] Map token Cenio Core v0.6 vào CSS variables/Tailwind setup; không tạo palette cục bộ.
- [ ] Implement custom Select/Listbox keyboard/focus state; không dùng native visual select.
- [ ] Implement button loading rule: giữ label, chỉ thêm loading icon.
- [ ] Implement theme toggle icon button ở header.
- [ ] Implement restricted/loading/empty/error/scope/stale/archive/command state components.
- [ ] Add UI tests cho theme, select interaction, command button no duplicate.
- [ ] Chạy visual review cục bộ với artifact Approved trước khi dùng cho màn thật.

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

- [ ] Implement Variant là transaction unit duy nhất; product đơn giản tự có Default Variant.
- [ ] Implement SKU/barcode normalized unique check trong command lock.
- [ ] Implement UnitConversionVersion và effective range.
- [ ] Implement PriceList/PriceRule publish guard chống conflict.
- [ ] Implement deterministic quote: product price -> branch price -> customer group price -> one best automatic promotion -> voucher/point.
- [ ] Implement `CatalogPosProjection` theo Branch/Warehouse/version, không chứa cost/supplier/secret.
- [ ] Implement customer quick create, duplicate warning và customer group snapshot source.
- [ ] Test scan/search no backend per keystroke khi cache warm.
- [ ] Test price/promotion stale conflict cho checkout.

**Exit gate:** POS có thể tải cache catalog 10.000 SKU/variant trong profile test, scan/search local đạt budget, quote trả kết quả deterministic và conflict code ổn định.

## Phase 5: Inventory Ledger & Balance Core

**Goal:** Có `InventoryMovement` và projection đủ cho tồn đầu kỳ, receipt, sale issue, reservation, lot/serial, transfer và stocktake baseline.

**Primary docs:** `inventory.md`, `inventory.md` LLD, `sales-inventory.md`, ADR `0014`.

**Create/modify:**

- `shared/contracts/inventory/*`, `shared/schemas/inventory/*`.
- `apps-script/src/services/inventory/*`: movement, balance, reservation, lot/serial, transfer, stocktake.
- `apps-script/src/repositories/inventory/*`.

**Steps:**

- [ ] Implement quantity milli-unit và value VND integer.
- [ ] Implement moving weighted average cost theo Warehouse + Variant.
- [ ] Implement `InventoryMovement` append-only và `InventoryBalance` projection batch update.
- [ ] Implement opening balance/import-safe flow; không ghi trực tiếp balance.
- [ ] Implement `issueForSale`, `reserve`, `release`, `receive`, `return.receive/resolve`.
- [ ] Implement lot FEFO và serial state guard.
- [ ] Implement transfer state và stocktake state.
- [ ] Test two receipts average cost, issue value rounding, concurrent last stock, expired lot, serial uniqueness, negative stock approval.

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

- [ ] Implement CashDrawer/PaymentMethod master.
- [ ] Implement `finance.shift.open/close/lock` và policy một cashier/một drawer.
- [ ] Implement `finance.payment.record` với nhiều allocation.
- [ ] Implement receivable/payable obligation ledger và aging projection.
- [ ] Implement payment reversal/counter-transaction, không sửa payment gốc.
- [ ] Implement expense approval tạo disbursement/cash transaction.
- [ ] Test POS thiếu ca bị chặn, partial payment tạo receivable, overpayment tạo credit, reversal không sửa nguồn.

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

- [ ] Implement browser cart local state; scan/search/add/change quantity không RPC khi cache warm.
- [ ] Implement explicit `saveDraft`, `openDraft`, `cancelDraft`; không autosave.
- [ ] Implement POS checkout command with Sales -> Catalog -> Inventory -> Finance -> CRM orchestration.
- [ ] Revalidate scope, shift, quote, stock, lot/serial, credit, tender total và idempotency trong commit.
- [ ] Return structured conflict: `PRICE_CHANGED`, `PROMOTION_CHANGED`, `INSUFFICIENT_STOCK`, `VOUCHER_UNAVAILABLE`, `POINT_BALANCE_CHANGED`.
- [ ] Return immutable receipt snapshot for K80/A4 browser print; print/reprint không tạo ledger.
- [ ] Implement POS UI from `app-pos-checkout.html` only after opening artifact/local preview.
- [ ] Test full payment, partial payment, insufficient stock, missing serial, quote conflict, timeout retry, duplicate prevention, print no-ledger.
- [ ] Benchmark warm scan/search/cart and checkout p95/p99 theo `SRS-OVR-013`.

**Exit gate:** Một cửa hàng nhỏ có thể bán POS từ cache, checkout tạo SaleOrder Completed + InventoryMovement + Payment/AR + policy ledger + AuditOutbox một lần, receipt in được và retry không duplicate.

## Phase 8: Sales Orders, Manual Online, Return & Warranty

**Goal:** Hoàn thiện vòng đời chứng từ bán ngoài POS và hậu mãi.

**Primary docs:** `sales-orders.md`, `sales-orders-returns.md`, `sales-pos-returns.md`.

**UI gate:** Không implement UI từ `sales-orders-returns.html` cho tới khi registry và handoff là `Approved`.

**Steps:**

- [ ] Implement SaleOrder list/detail query theo Branch/Warehouse/status/date partition.
- [ ] Implement online manual lifecycle: Draft -> Confirmed -> Packing -> Shipped -> Delivered.
- [ ] Implement reservation ở Confirmed, issue/revenue/AR ở Shipped, Delivered không ledger lần hai.
- [ ] Implement cancel trước Shipped và deposit credit/refund behavior.
- [ ] Implement return by source, fast return permission, inspection Quarantine/Restock/Scrap.
- [ ] Implement exchange as Return + new SaleOrder linked.
- [ ] Implement WarrantyCase lifecycle and attachment references.
- [ ] Test online reservation/cancel/ship/deliver, return max quantity, fast return denial, exchange net settlement, warranty serial trace.

**Exit gate:** Chứng từ bán và hậu mãi giữ bất biến lịch sử, mọi sửa sai đi qua return/reversal/adjustment.

## Phase 9: Purchasing & Supplier Operations

**Goal:** Có PO, Goods Receipt, landed cost, late invoice/cost adjustment, supplier return và payable handoff.

**Primary docs:** `purchasing.md`, `purchasing.md` LLD, `purchasing-finance.md`, ADR `0015`.

**UI gate:** Không implement UI từ `inventory-purchasing.html` cho tới khi registry và handoff là `Approved`.

**Steps:**

- [ ] Implement Supplier master và supplier status.
- [ ] Implement PO lifecycle; PO không tạo tồn/cost/payable.
- [ ] Implement GoodsReceipt approval tạo Inventory receive + Payable + AuditOutbox.
- [ ] Implement landed cost allocation exact reconciliation.
- [ ] Implement late cost split: on-hand allocated value và `PurchaseCostVariance` cho phần đã bán.
- [ ] Implement SupplierReturn limit by receipt less returned quantity.
- [ ] Test partial receipt, lot/serial receipt rejection, late cost split, supplier return settlement, payment allocation multi-receipt.

**Exit gate:** Nhập hàng và chi phí mua thay đổi tồn/cost/payable bằng chứng từ duyệt, không sửa receipt hoặc COGS lịch sử.

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

- [ ] Implement report query envelope: reportId, dateField, date range, scope, filters, cursor/page size, asOf.
- [ ] Implement DashboardProjection theo Branch/date bucket; không quét ledger/document toàn kỳ khi mở dashboard.
- [ ] Implement metadata `generatedAt`, `asOf`, `partitionCoverage`, `archiveIncluded`.
- [ ] Backend loại sensitive COGS/profit trước projection/export khi thiếu permission.
- [ ] Implement export small/large routing: small sync ngoài lock, large worker/checkpoint.
- [ ] Implement Sales Dashboard UI từ `app-shell-dashboard.html`, không thêm recent activity thật nếu chưa có query/projection contract.
- [ ] Test scope denial, archive coverage partial, sensitive field removed, drill-down token revalidates permission, export không giữ ScriptLock.

**Exit gate:** Dashboard hiển thị đúng 4 KPI, chart, queue, manual order table, metadata freshness/coverage và restricted state từ backend.

## Phase 11: Import, Attachment, Audit, Backup, Restore, Archive & Health

**Goal:** Hoàn thiện vận hành dữ liệu để khách dùng lâu dài trên Google Workspace của họ.

**Primary docs:** `access-reporting.md`, `administration-reporting-operations.md`, `storage-partitioning-and-lifecycle.md`, `deployment-and-lifecycle.md`, ADR `0006`, `0007`, `0008`.

**Steps:**

- [ ] Implement ImportBatch/ImportStagingRow canonical flow: template, upload, validate, confirm, commit by worker/chunk.
- [ ] Implement attachment metadata and private Drive access; không trả public URL.
- [ ] Implement AuditOutbox delivery worker to AuditLog with idempotency.
- [ ] Implement daily/manual backup manifest with checksums and retention 30 newest daily.
- [ ] Implement restore prepare -> replacement resources -> Owner switch -> revoke sessions -> health check; không overwrite production.
- [ ] Implement active partition capacity alert, create next partition, archive read-only routing.
- [ ] Implement runtime TTL cleanup only for technical expired data, never business/audit/ledger history.
- [ ] Test import retry no duplicate, attachment permission, audit pending+delivered search, backup manifest checksum, restore switch, archive query routing.

**Exit gate:** App có backup/restore/archive/health story đủ để bán một lần và vận hành dài hạn.

## Phase 12: Full Release Hardening

**Goal:** Chuẩn hóa performance, security, migration, deployment và nghiệm thu sellable baseline.

**Steps:**

- [ ] Seed representative dataset: 1 Branch, 1 Warehouse, 1 cashier, 10.000 SKU/variant, transaction mix đại diện.
- [ ] Benchmark POS cold/warm cache, scan, search, cart change, simple/complex checkout, timeout retry, concurrent checkout, report/export song song.
- [ ] Run security review: session token not logged, password not stored/exported, scope cannot be bypassed, sensitive fields backend-gated.
- [ ] Run migration dry-run on fresh tenant and upgraded tenant with backup before migration.
- [ ] Run restore drill with replacement resources.
- [ ] Run accessibility/keyboard checks for approved UI screens.
- [ ] Run `npm run verify` and Apps Script artifact check.
- [ ] Prepare deployment runbook and customer installation checklist.

**Exit gate:** Baseline release đạt SRS acceptance trọng yếu, POS performance budget và deployment/restore drill thành công.

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
- Mỗi mutation có command/idempotency test, permission/scope test, retry/duplicate test, audit test và failure recovery test.
- Mỗi projection có source ledger/document trace, rebuild path và permission/sensitive-field test.
- Mỗi UI screen đọc registry/handoff/artifact trước code, kiểm light/dark, loading/empty/error/restricted/scope/stale/command states.
- Mỗi POS-impacting release có performance benchmark và không thêm RPC vào scan/search/cart warm path.

## Open Decisions Before Specific Phases

Không có blocker cho Implementation Planning tổng thể. Các quyết định sau chỉ cần chốt đúng thời điểm trước khi code phase tương ứng:

- UI các artifact đang `Review` phải được user duyệt và cập nhật registry/handoff sang `Approved` trước khi code UI production.
- Profile seed/performance đại diện cần chốt dữ liệu mẫu cụ thể trước Phase 12.
- Deployment thật cần `.clasp.json` cục bộ và Apps Script project của tenant/test tenant; không lưu `scriptId` trong source.

## First Next Action

Bước code đầu tiên nên là tạo plan chi tiết `platform-core`, rồi triển khai Phase 1. Không nên bắt đầu từ POS UI hoặc Dashboard UI vì hiện backend chưa có auth/session/permission/registry/command/projection để cấp dữ liệu thật.
