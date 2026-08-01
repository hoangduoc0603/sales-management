# Inventory Transfer & Stocktake Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện baseline Inventory bắt buộc cho cửa hàng dùng thật: nhập đầu kỳ an toàn, chuyển kho có trạng thái, kiểm kho có snapshot/variance và UI workbench theo Open Design Approved.

**Architecture:** Giữ `InventoryMovement` là source of truth append-only và `InventoryBalance` là projection hot path. `StockTransfer` và `StocktakeSession` là document/state record; chỉ transition được duyệt mới tạo movement/projection. API đi qua single operation registry, scope/permission do backend kiểm.

**Tech Stack:** TypeScript, Google Apps Script service/repository, Google Sheets adapter qua `SheetGateway`, React/Tailwind, Vitest.

## Global Constraints

- Không sửa số tồn trực tiếp; mọi thay đổi tồn phải qua `InventoryMovement`.
- Không thêm AuditLog/AuditOutbox; record phải có actor metadata trực tiếp theo ADR 0017.
- Không thêm full ledger scan vào POS checkout fast path.
- UI phải bám `inventory-stocktake-transfer-adjustment-workbench.html` và Cenio Core v0.7; hỗ trợ light/dark và responsive.

---

## Task 1: Contracts, schemas and operation registry

**Files:**
- Modify: `shared/contracts/inventory/inventory.ts`
- Modify: `shared/schemas/inventory/inventory.ts`
- Modify: `shared/contracts/platform/operations.ts`
- Modify: `tests/shared/inventory-contracts.test.ts`

**Steps:**

- [x] Add DTOs for stock transfer create/approve/ship/receive, stocktake open/submit/approve and response summaries.
- [x] Add Zod parsers for the new request DTOs.
- [x] Register operations:
  - `inventory.transfer.create`
  - `inventory.transfer.approve`
  - `inventory.transfer.ship`
  - `inventory.transfer.receive`
  - `inventory.stocktake.open`
  - `inventory.stocktake.submit`
  - `inventory.stocktake.approve`
- [x] Add shared contract tests for valid payloads and rejected invalid same-warehouse transfer.

## Task 2: Inventory repository and service

**Files:**
- Modify: `apps-script/src/repositories/inventory/inventory-repository.ts`
- Modify: `apps-script/src/services/inventory/inventory-service.ts`
- Create/modify: `tests/apps-script/inventory/inventory-service-transfer-stocktake.test.ts`
- Modify: `tests/apps-script/inventory/inventory-sheet-repository.test.ts`

**Steps:**

- [x] Add repository methods for `StockTransfer`, `StockTransferLine`, `StocktakeSession`, `StocktakeLine`.
- [x] Implement in-memory repository support.
- [x] Implement sheet-backed support using versioned document/replacement-set rows if existing primitive helpers allow it.
- [x] Implement transfer state:
  `Draft -> PendingApproval -> Approved -> Shipped -> PartiallyReceived | Received`, cancel excluded from this baseline if no UI path triggers it.
- [x] `ship` creates `TransferShip` movements: source on-hand/available decrease, source in-transit increase.
- [x] `receive` creates `TransferReceive` movements: source in-transit decrease, destination on-hand/available increase; partial receive keeps remaining in-transit.
- [x] Implement stocktake state:
  `Draft -> InProgress -> Submitted -> Approved`.
- [x] Opening stocktake snapshots current balances and records movement-after-snapshot count; approval creates `CountAdjustment` movements for approved variance only.
- [x] Add tests for partial transfer and stocktake with movement after snapshot.

## Task 3: API composition and local fake backend

**Files:**
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Modify: `tests/apps-script/inventory/inventory-composition.test.ts`

**Steps:**

- [x] Wire new parsers and service handlers through operation registry.
- [x] Assign permission `inventory.movement.create` for mutation operations.
- [x] Add local fake backend responses for UI/demo flow without extra Apps Script calls.
- [x] Add composition tests for transfer create/approve/ship/receive and stocktake open/submit/approve.

## Task 4: Inventory workbench UI alignment

**Files:**
- Modify: `web/src/features/inventory/inventory-home.tsx`
- Modify/add tests under `tests/web/`

**Steps:**

- [x] Replace placeholder transfer/stocktake cards with a workbench matching `inventory-stocktake-transfer-adjustment-workbench.html`.
- [x] Preserve existing AppShell; implement hash states `#transfer`, `#stocktake`, `#adjustment`, `#scrap`, `#negative-cost`, `#trace`.
- [x] Add responsive table overflow on mobile and semantic state blocks for approval/negative-cost/restricted cost.
- [x] Add web tests for hash navigation and critical labels.

## Task 5: Verification and tracking

**Files:**
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`
- Modify: this plan

**Steps:**

- [x] Run targeted tests.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm run build && npm run check:artifact`.
- [x] Check completed items in this plan and update master plan tracking for Phase 5.
