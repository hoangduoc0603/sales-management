# POS Checkout End-to-End Phase 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai POS Checkout end-to-end baseline: cart local-first, draft tường minh, checkout command backend revalidate/commit, receipt snapshot và UI chạy local theo artifact `app-pos-checkout.html`.

**Architecture:** Phase này bổ sung bounded context `sales` theo modular monolith hiện có. Frontend giữ scan/search/cart ở browser-local cache; backend sở hữu `sales.draft.*` và `sales.pos.complete`, điều phối Catalog quote, Inventory issue và Finance payment/receivable trong command idempotency. Slice này dùng in-memory repository/seam để chạy local và test, không hard-code Google Sheets/Drive.

**Tech Stack:** React, TypeScript, Vite, Tailwind/Cenio CSS tokens, Vitest, Google Apps Script service/repository seam.

## Global Constraints

- Tuân thủ thứ tự ưu tiên: SRS -> ADR Accepted -> Solution/System Design -> LLD/data dictionary -> design handoff -> Open Design artifact -> code hiện có.
- POS scan/search/add/change quantity không gọi RPC khi cache warm.
- `saveDraft`, `openDraft`, `cancelDraft` là action tường minh; không autosave cart.
- Checkout là một command backend có `commandId` và `idempotencyKey`; retry cùng key trả outcome cũ, không tạo duplicate.
- Backend revalidate scope, shift, quote, stock, tender total và idempotency trong commit.
- Conflict tối thiểu: `PRICE_CHANGED`, `PROMOTION_CHANGED`, `INSUFFICIENT_STOCK`, `VOUCHER_UNAVAILABLE`, `POINT_BALANCE_CHANGED`.
- Receipt snapshot trả về sau commit; print/reprint không tạo ledger.
- UI follow `docs/design/screens/pos-checkout.md` và artifact Approved `app-pos-checkout.html`.

---

## Files

- Create: `shared/contracts/sales/sales.ts`
- Create: `shared/schemas/sales/sales.ts`
- Create: `apps-script/src/repositories/sales/sales-repository.ts`
- Create: `apps-script/src/services/sales/sales-service.ts`
- Create: `web/src/features/pos/pos-cart-state.ts`
- Create: `tests/shared/sales-contracts.test.ts`
- Create: `tests/apps-script/sales/sales-service.test.ts`
- Create: `tests/apps-script/sales/sales-composition.test.ts`
- Create: `tests/web/pos-cart-state.test.ts`
- Modify: `shared/contracts/platform/operations.ts`
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `apps-script/src/services/platform/registry/table-registry.ts`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Modify: `web/src/features/pos/pos-checkout-shell.tsx`
- Modify: `web/src/styles/index.css`
- Modify: `docs/architecture/folder-structure.md`
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`

## Task 1: Sales contracts and schema

**Interfaces produced:**

- `SaleOrderDTO`, `SaleOrderLineDTO`, `SaleTenderDraftDTO`, `ReceiptSnapshotDTO`
- `SalesDraftSaveRequest`, `SalesDraftOpenRequest`, `SalesDraftCancelRequest`, `SalesPosCompleteRequest`
- `SalesDraftSaveResponse`, `SalesDraftListResponse`, `SalesPosCompleteResponse`
- Parsers `parseSalesDraftSaveRequest`, `parseSalesDraftOpenRequest`, `parseSalesDraftCancelRequest`, `parseSalesPosCompleteRequest`

- [x] Write failing contract/schema tests for draft save and POS complete payload validation.
- [x] Implement contracts and schemas.
- [x] Run targeted shared tests.

## Task 2: Sales repository and service

**Interfaces consumed:** Sales contracts, CatalogService, PricingService, InventoryService, FinanceService, CommandCoordinator.

**Interfaces produced:**

- `createInMemorySalesRepository()`
- `createSalesService({ repository, catalogService, inventoryService, financeService, commandCoordinator, tenantId, now, newId })`
- Service methods: `saveDraft`, `listDrafts`, `cancelDraft`, `completePosSale`

- [x] Write failing service tests for save/open/cancel draft.
- [x] Write failing service tests for full payment checkout, partial payment receivable, insufficient stock, stale quote conflict and idempotency duplicate prevention.
- [x] Implement repository and service minimal baseline.
- [x] Run targeted sales service tests.

## Task 3: API composition and registry

**Interfaces consumed:** Sales service and schemas.

**Operations produced:**

- `sales.draft.save`
- `sales.draft.list`
- `sales.draft.cancel`
- `sales.pos.complete`

- [x] Write failing composition tests for authenticated sales operations.
- [x] Add operation names/actions.
- [x] Wire sales repository/service in API composition.
- [x] Register Sales tables in TableRegistry.
- [x] Run composition/table registry tests.

## Task 4: POS local cart state and fake backend

**Interfaces produced:**

- `createPosCartState(projection)` with local scan/search/add/change/remove/quote/tender helpers.
- Local fake backend supports sales draft and checkout operations with command outcome cache.

- [x] Write failing web tests proving warm scan/search/cart change does not invoke API.
- [x] Write failing local fake tests for checkout success/conflict/idempotency.
- [x] Implement cart state helper and local fake backend operations.
- [x] Run targeted web tests.

## Task 5: POS UI wiring

**UI source:** `docs/design/screens/pos-checkout.md` + local preview `http://127.0.0.1:61609/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/app-pos-checkout.html`.

- [x] Replace static POS shell with interactive local cache/cart/tender/draft/checkout behavior while preserving approved layout hierarchy.
- [x] Keep submit button label stable and show only loading icon.
- [x] Show empty, no result, conflict, insufficient stock, missing shift and success/receipt states.
- [x] Run POS UI tests.

## Task 6: Verification and tracking

- [x] Update folder structure for `sales` folders.
- [x] Update master plan Phase 7 checkboxes only for completed scope.
- [x] Run `node scripts/verify-structure.mjs`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build && npm run check:artifact`.

## Known deferred items

- Full lot/serial selection service guard remains linked to Phase 5 open lot/serial work; Phase 7 can detect missing selection and return `SERIAL_REQUIRED`/`LOT_REQUIRED`, but cannot validate real serial availability until inventory lot/serial service exists.
- Benchmark p95/p99 with 10.000 SKU/variant is a Phase 12 hardening task unless Phase 7 reaches full dataset harness in this slice.
