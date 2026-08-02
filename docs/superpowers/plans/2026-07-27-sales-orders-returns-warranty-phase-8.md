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
- [x] Bổ sung local fake backend `sales.return.create` và `sales.return.resolve` để UI local test được return by source + resolve disposition.
- [x] Bổ sung local fake backend `sales.warranty.open` và `sales.warranty.transition` để UI local test được warranty by source order/line.
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

## Task 4B: Sales Orders UI API Wiring Extension

**Bối cảnh:** Sau UI shell baseline, route `Đơn bán` vẫn còn dùng dữ liệu tĩnh trong component. Extension này nối màn vào API/local fake đã có để danh sách/detail/lifecycle online dùng được trên app thật.

**Files:**
- Modify: `web/src/features/sales/sales-orders-returns-home.tsx`
- Modify: `web/src/app/sales-management-app.tsx`
- Test: `tests/web/sales-orders-returns-home.test.ts`

- [x] Viết failing render test cho search input thật, empty-state copy và loại bỏ marker `Artifact Approved`.
- [x] Nối `sales.order.list` theo Branch/Warehouse/source/status/query.
- [x] Nối action lifecycle online `confirm`, `startPacking`, `ship`, `deliver` bằng command/idempotency key mới.
- [x] Giữ fallback local/demo cho SSR/local khi không truyền API client.
- [x] Chạy focused test, typecheck và lint.

## Task 4C: Manual Fulfillment Detail UI Extension

**Bối cảnh:** Artifact `manual-order-fulfillment-detail.html` đã `Approved`, nhưng UI React chỉ có detail chứng từ tối thiểu trong màn `Đơn bán`. Extension này bổ sung vùng detail fulfillment để thể hiện reservation, khách nhận, nghĩa vụ thanh toán, kiểm tra trước xác nhận, bàn giao và cancel guard theo state backend.

**Files:**
- Modify: `web/src/features/sales/sales-orders-returns-home.tsx`
- Modify: `web/src/styles/index.css`
- Test: `tests/web/sales-orders-returns-home.test.ts`
- Test: `tests/web/local-fake-backend.test.ts`

- [x] Đọc handoff `manual-order-fulfillment-detail.md` và artifact mới nhất trên Open Design/local project.
- [x] Viết failing render test cho các khối fulfillment detail bắt buộc.
- [x] Bổ sung `Giao thành công` và nối `sales.online.deliver`.
- [x] Nối `Hủy trước Shipped` vào `sales.online.cancel` với reason và deposit treatment mặc định an toàn.
- [x] Bổ sung vùng `Chi tiết đơn nhập tay & fulfillment`: timeline, reservation, khách nhận, nghĩa vụ thanh toán, pre-confirm checks, bàn giao và cancel guard.
- [x] Bổ sung CSS `.sr-only` và layout fulfillment responsive theo token Cenio Core.
- [x] Bổ sung local fake backend regression cho fulfillment `confirm -> packing -> ship -> deliver` và cancel sau shipped bị chặn.
- [x] Chạy focused tests, typecheck và lint.

## Task 4D: Manual Order Composer UI Extension

**Bối cảnh:** Artifact `sales-orders-returns.html` trạng thái `#manual` yêu cầu form “Tạo / sửa đơn nhập tay” có explicit save, không autosave, nguồn nhập tay nội bộ, khách nhận, thông tin giao/nhận, kho xuất/reservation và payment option. Backend/fake backend đã có `catalog.pos.getProjection` và `sales.draft.save`; UI cần nối vào API mà không preload catalog khi mở màn.

**Files:**
- Modify: `web/src/features/sales/sales-orders-returns-home.tsx`
- Modify: `web/src/styles/index.css`
- Test: `tests/web/sales-orders-returns-home.test.ts`

- [x] Đọc handoff `sales-orders-returns.md` và artifact `sales-orders-returns.html` trạng thái `#manual`.
- [x] Viết failing render test cho composer explicit-save, nguồn nhập tay, khách nhận, SĐT, địa chỉ, kho xuất/reservation, payment options và không dùng native select.
- [x] Bổ sung `ManualOrderComposer` dùng `Listbox`, input/textarea token Cenio Core, segmented payment và Button loading giữ nguyên label.
- [x] Nối `Lưu nháp đơn` vào `catalog.pos.getProjection` lazy-on-click rồi `sales.draft.save` với `source: ManualOnline`; không gọi backend khi người dùng chỉ nhập liệu.
- [x] Bổ sung guard `Lưu nháp trước khi xác nhận` và nối `Xác nhận đơn` tới `sales.online.confirm` cho draft vừa lưu.
- [x] Giữ fallback demo khi không có `ApiClient/sessionToken`.
- [x] Bổ sung CSS responsive cho composer ở desktop/tablet/mobile.
- [x] Chạy focused test, typecheck và lint.

## Task 4E: Source Return UI/API Wiring Extension

**Bối cảnh:** Panel `Trả hàng theo đơn gốc` trong UI React còn là nội dung tĩnh. Sau khi local fake backend đã hỗ trợ `sales.return.create/resolve`, màn `Đơn bán` cần có entry point tạo phiếu trả từ đơn được chọn, đưa hàng vào Quarantine và hoàn tất kiểm hàng theo disposition.

**Files:**
- Modify: `web/src/features/sales/sales-orders-returns-home.tsx`
- Modify: `web/src/styles/index.css`
- Test: `tests/web/sales-orders-returns-home.test.ts`

- [x] Viết failing render test cho source-return workbench, điều kiện đơn hợp lệ, trạng thái chờ kiểm và action resolve.
- [x] Bổ sung `SourceReturnPanel` thay panel tĩnh, hiển thị đơn đang chọn, guard `Completed/Shipped/Delivered`, fast-return restricted state.
- [x] Nối `Tạo phiếu trả` vào `sales.order.get` lazy-on-click rồi `sales.return.create`; không fetch detail khi chỉ mở màn.
- [x] Nối `Restock`, `KeepQuarantine`, `Scrap` vào `sales.return.resolve` cho return đang chờ kiểm.
- [x] Giữ fallback demo khi không có `ApiClient/sessionToken`.
- [x] Bổ sung CSS responsive/theme-safe cho vùng action trả hàng.
- [x] Chạy focused test và typecheck.

## Task 4F: Warranty UI/API Wiring Extension

**Bối cảnh:** Panel `Bảo hành theo serial` trong UI React còn là nội dung tĩnh. Sau khi Apps Script production service đã có `sales.warranty.open/transition`, local fake backend và UI cần nối đủ để test local/AppScript theo source order, line, serial/IMEI và lifecycle ca bảo hành.

**Files:**
- Modify: `web/src/features/sales/sales-orders-returns-home.tsx`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Modify: `web/src/styles/index.css`
- Test: `tests/web/sales-orders-returns-home.test.ts`
- Test: `tests/web/local-fake-backend.test.ts`

- [x] Viết failing render test cho warranty workbench, Serial/IMEI, mô tả lỗi và action lifecycle.
- [x] Viết failing local fake backend test cho `sales.warranty.open` và `sales.warranty.transition`.
- [x] Bổ sung local fake backend open/transition warranty, idempotency và lưu vào `SalesOrderDetailResponse.warrantyCases`.
- [x] Bổ sung `WarrantyPanel` thay panel tĩnh, nhập serial/issue, hiển thị source order và active warranty status.
- [x] Nối `Mở bảo hành` vào `sales.order.get` lazy-on-click rồi `sales.warranty.open`; không fetch detail khi chỉ render màn.
- [x] Nối `Chuyển InReview` và `Đóng bảo hành` vào `sales.warranty.transition`.
- [x] Giữ fallback demo khi không có `ApiClient/sessionToken`.
- [x] Bổ sung CSS responsive/theme-safe cho vùng warranty.
- [x] Chạy focused tests.

## Task 4G: Exchange UI/API Wiring Extension

**Bối cảnh:** Panel `Đổi hàng & thanh toán chênh lệch` trong UI React còn là placeholder trong khi Phase 8B đã có `sales.exchange.create`. Màn `Đơn bán` cần có entry point tạo đổi hàng từ đơn gốc, quote hàng đổi mới và gọi command exchange lazy-on-click.

**Files:**
- Modify: `web/src/features/sales/sales-orders-returns-home.tsx`
- Modify: `web/src/styles/index.css`
- Test: `tests/web/sales-orders-returns-home.test.ts`

- [x] Viết failing render test để bắt lỗi panel exchange bị giữ static placeholder.
- [x] Bổ sung `ExchangePanel` hiển thị source order, hàng nhận lại, hàng đổi mới, thu/hoàn chênh lệch và action tạo đơn đổi hàng.
- [x] Nối `Tạo đơn đổi hàng` vào `sales.order.get`, `catalog.pos.getProjection`, `catalog.quote.preview` và `sales.exchange.create` lazy-on-click.
- [x] Giữ guard `Completed/Shipped/Delivered` và fallback demo khi không có `ApiClient/sessionToken`.
- [x] Bổ sung CSS theme-safe cho vùng exchange.
- [x] Chạy focused tests.

## Task 5: Full verification and tracking

**Files:**
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`
- Modify: this plan file

- [x] Run `npm run verify`.
- [x] Run local browser smoke: login local, open Đơn bán, verify table/detail/action areas render without console errors in light/dark.
- [x] Tick only completed Phase 8 master-plan checkboxes.
- [x] Record open gaps in final response.

## Self-Review

- Spec coverage: covers list/detail, online lifecycle baseline, reservation/issue/AR/deliver no duplicate ledger, cancel deposit credit/refund, return by source/fast-return guard/restock, warranty case baseline and UI shell. Task 4B nối UI list/lifecycle vào API thật/local fake thay vì chỉ render dữ liệu tĩnh. Phase 8B bổ sung return refund/customer credit, KeepQuarantine/Scrap và exchange net settlement.
- Intentional gaps: attachment upload/download and full CRM policy reversal remain open for later slices.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: service method and operation names use the `sales.<area>.<verb>` convention already used by Phase 7.
