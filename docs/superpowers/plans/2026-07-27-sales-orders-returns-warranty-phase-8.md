# Sales Orders, Returns & Warranty Phase 8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng baseline dùng được cho danh sách/detail đơn bán, vòng đời đơn online nhập tay, return theo đơn gốc/fast-return guard, warranty case và UI local theo artifact `sales-orders-returns.html`.

**Architecture:** Phase 8 mở rộng bounded context Sales hiện có, giữ Sales là owner chứng từ và gọi Inventory/Finance qua service contract cho reservation, issue, quarantine/restock và receivable. UI đặt trong `web/src/features/sales/`, chỉ gọi typed API qua `ApiClient`, không đọc Google Sheets/Drive trực tiếp.

**Tech Stack:** React, TypeScript, Vite, Tailwind/Cenio Core CSS, Google Apps Script service/repository seam, Zod schema, Vitest.

## Global Constraints

- Tài liệu và copy nghiệp vụ viết bằng tiếng Việt.
- Không thay đổi SRS/ADR/LLD/state machine/schema vật lý đã duyệt trong lúc code.
- Không code UI từ screenshot; registry và handoff `sales-orders-returns.html` đang `Approved`, local preview đã mở được qua `http://127.0.0.1:61609/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/sales-orders-returns.html`.
- Không dùng native `<select>` trong UI chính.
- Online order: `Draft → Confirmed → Packing → Shipped → Delivered`; cancel chỉ trước `Shipped`.
- `Confirmed` tạo reservation; `Shipped` giải phóng reservation tương ứng, issue tồn và tạo revenue/AR một lần; `Delivered` không tạo ledger lần hai.
- Return mặc định tham chiếu đơn gốc; fast return chỉ hợp lệ với quyền riêng.
- Mọi hạng mục master plan chỉ được check khi đã thực sự triển khai và verify.

---

## File Structure

- Modify `shared/contracts/sales/sales.ts`: thêm DTO/query/command cho order list/detail, online lifecycle, return và warranty.
- Modify `shared/schemas/sales/sales.ts`: thêm parser Zod tương ứng.
- Modify `shared/contracts/platform/operations.ts`: đăng ký operation/action mới.
- Modify `apps-script/src/repositories/sales/sales-repository.ts`: lưu/query return và warranty trong in-memory seam.
- Modify `apps-script/src/services/sales/sales-service.ts`: triển khai use case Phase 8 và orchestration Inventory/Finance.
- Modify `apps-script/src/bootstrap/create-api-composition.ts`: wire operation/parser/handler mới.
- Modify `apps-script/src/services/platform/bootstrap/bootstrap-service.ts` and/or `session-service.ts`: cấp permission Phase 8 cho local/admin baseline nếu cần.
- Modify `web/src/lib/api/local-fake-backend.ts`: fake API cho UI local và smoke test.
- Create `web/src/features/sales/sales-orders-returns-home.tsx`: UI shell theo handoff Approved.
- Modify `web/src/app/sales-management-app.tsx`: route `orders` tới Sales UI.
- Modify `web/src/styles/index.css`: thêm class/token cục bộ feature nếu cần, không tạo design system mới.
- Create/modify tests under `tests/shared`, `tests/apps-script/sales`, `tests/web`.
- Modify `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`: chỉ tick mục Phase 8 đã hoàn tất.

## Task 1: Shared contracts, schemas and operations

**Files:**
- Modify: `shared/contracts/sales/sales.ts`
- Modify: `shared/schemas/sales/sales.ts`
- Modify: `shared/contracts/platform/operations.ts`
- Test: `tests/shared/sales-contracts.test.ts`

**Interfaces:**
- Produces:
  - `SalesOrderListRequest`, `SalesOrderListResponse`
  - `SalesOrderDetailRequest`, `SalesOrderDetailResponse`
  - `SalesOnlineConfirmRequest`, `SalesOnlineTransitionRequest`, `SalesOnlineCancelRequest`
  - `SalesReturnCreateRequest`, `SalesReturnResolveRequest`
  - `SalesWarrantyOpenRequest`, `SalesWarrantyTransitionRequest`
  - parsers for all request types

- [x] Add failing shared contract tests for new operation names and parser validation.
- [x] Run `npm test -- tests/shared/sales-contracts.test.ts` and confirm failures are missing exports/operations/parsers.
- [x] Extend sales contract types and platform operation/action lists.
- [x] Extend Zod schemas and parser functions.
- [x] Run `npm test -- tests/shared/sales-contracts.test.ts` and confirm pass.

## Task 2: Sales repository and service baseline

**Files:**
- Modify: `apps-script/src/repositories/sales/sales-repository.ts`
- Modify: `apps-script/src/services/sales/sales-service.ts`
- Test: `tests/apps-script/sales/sales-service.test.ts`

**Interfaces:**
- Consumes Task 1 request/response types.
- Produces service methods:
  - `listOrders(input)`
  - `getOrder(input)`
  - `confirmOnline(input)`
  - `startPackingOnline(input)`
  - `shipOnline(input)`
  - `deliverOnline(input)`
  - `cancelOnline(input)`
  - `createReturn(input)`
  - `resolveReturn(input)`
  - `openWarranty(input)`
  - `transitionWarranty(input)`

- [x] Add failing tests for order list/detail by Branch/Warehouse/status.
- [x] Add failing tests for online confirm reservation, cancel release, ship issue/AR and deliver no extra ledger.
- [x] Add failing tests for return max quantity, fast-return denial and restock from quarantine.
- [x] Add failing test for warranty serial trace.
- [x] Run `npm test -- tests/apps-script/sales/sales-service.test.ts` and confirm failures are missing service methods.
- [x] Implement repository storage/query for return and warranty.
- [x] Implement Sales service methods with command coordinator and existing Inventory/Finance service calls.
- [x] Run `npm test -- tests/apps-script/sales/sales-service.test.ts` and confirm pass.

## Task 3: API composition and local fake backend

**Files:**
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Test: `tests/apps-script/sales/sales-composition.test.ts`
- Test: `tests/web/local-fake-backend.test.ts`

**Interfaces:**
- Consumes Task 1 parsers and Task 2 service methods.
- Produces API operations:
  - `sales.order.list`
  - `sales.order.get`
  - `sales.online.confirm`
  - `sales.online.startPacking`
  - `sales.online.ship`
  - `sales.online.deliver`
  - `sales.online.cancel`
  - `sales.return.create`
  - `sales.return.resolve`
  - `sales.warranty.open`
  - `sales.warranty.transition`

- [x] Add failing composition tests for operation registration and auth action.
- [x] Add failing local fake backend tests for list/detail and one online transition.
- [x] Run targeted tests and confirm failures.
- [x] Wire Apps Script composition and permissions.
- [x] Implement local fake backend seeded orders/returns/warranty and mutation behavior.
- [x] Run targeted tests and confirm pass.

## Task 4: Sales Orders / Returns UI shell

**Files:**
- Create: `web/src/features/sales/sales-orders-returns-home.tsx`
- Modify: `web/src/app/sales-management-app.tsx`
- Modify: `web/src/styles/index.css`
- Test: `tests/web/sales-orders-returns-home.test.ts`
- Test: `tests/web/sales-management-app.test.ts`

**Interfaces:**
- Consumes Task 3 local fake API operations.
- Produces `SalesOrdersReturnsHome` React component.

- [x] Add failing render tests checking core handoff content, custom controls, no native select and dark/light-safe semantic classes.
- [x] Run targeted tests and confirm failures.
- [x] Implement feature UI shell: summary, filters, order queue/table, immutable detail, online lifecycle actions, return panel, warranty panel, loading/empty/error/restricted states.
- [x] Route AppShell `orders` to `SalesOrdersReturnsHome`.
- [x] Run targeted tests and confirm pass.

## Task 5: Full verification and tracking

**Files:**
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`
- Modify: this plan file

- [x] Run `npm run verify`.
- [x] Run local browser smoke: login local, open Đơn bán, verify table/detail/action areas render without console errors in light/dark.
- [x] Tick only completed Phase 8 master-plan checkboxes.
- [x] Record open gaps in final response.

## Self-Review

- Spec coverage: covers list/detail, online lifecycle baseline, reservation/issue/AR/deliver no duplicate ledger, return by source/fast-return guard/restock, warranty case baseline and UI shell. Phase 8B bổ sung return refund/customer credit, KeepQuarantine/Scrap và exchange net settlement.
- Intentional gaps: deposit credit/refund behavior khi hủy đơn có đặt cọc, attachment upload/download and full CRM policy reversal remain open for later slices.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: service method and operation names use the `sales.<area>.<verb>` convention already used by Phase 7.
