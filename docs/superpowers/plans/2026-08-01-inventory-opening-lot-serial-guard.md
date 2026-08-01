# Inventory Opening, Lot & Serial Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện phần Phase 5 còn mở: OpeningBalance không ghi đè dữ liệu đã vận hành, lot balance có FEFO/expiry guard và serial state không được xuất trùng hoặc xuất khi không saleable.

**Architecture:** `InventoryMovement` vẫn là source of truth append-only; `InventoryBalance`, `InventoryLotBalance` và `SerialState` là projection đọc nhanh. Receive/opening/return/issue cập nhật projection trong cùng command seam. Guard chạy trên projection trước khi append movement để không phải scan ledger trong hot path.

**Tech Stack:** TypeScript, Zod, Google Apps Script repository/service, Google Sheets adapter, Vitest.

## Global Constraints

- Không sửa số dư trực tiếp; mọi thay đổi tồn phải qua `InventoryMovement`.
- Không thêm AuditLog/AuditOutbox; record phải có actor metadata trực tiếp theo ADR 0017.
- Không thêm full ledger scan vào POS checkout fast path.
- OpeningBalance chỉ hợp lệ khi Warehouse + Variant chưa có movement trước đó.
- Lot hết hạn không được xuất nếu không có ngoại lệ được duyệt; serial chỉ được xuất khi `Saleable` và đúng Warehouse/Variant.

---

## File Structure

- Modify `shared/contracts/inventory/inventory.ts`: thêm lot/serial DTO, metadata trên command line hiện có.
- Modify `shared/schemas/inventory/inventory.ts`: parse `lotId`, `lotCode`, `expiryDate`, `serialId`.
- Modify `apps-script/src/repositories/inventory/inventory-repository.ts`: thêm in-memory và sheet-backed methods cho `InventoryLotBalance` và `SerialState`.
- Modify `apps-script/src/services/inventory/inventory-service.ts`: thêm opening guard, lot/serial projection updates và issue guard.
- Modify `apps-script/src/services/platform/registry/table-registry.ts`: chuẩn hóa header lot/serial projection có tenant/schema/version/partition.
- Modify tests under `tests/shared`, `tests/apps-script/inventory`, `tests/apps-script/platform`.

## Task 1: Contract and schema surface

**Files:**
- Modify: `shared/contracts/inventory/inventory.ts`
- Modify: `shared/schemas/inventory/inventory.ts`
- Test: `tests/shared/inventory-contracts.test.ts`

**Steps:**

- [x] Add `InventoryLotBalanceDTO`, `SerialStateDTO`, `SerialStateStatus`, `lotId/lotCode/expiryDate/serialId` to receive/issue/return requests.
- [x] Add Zod parser support for optional lot/serial fields and valid ISO date strings for expiry.
- [x] Add shared tests proving receive accepts lot/serial metadata and rejects invalid expiry date.

## Task 2: Repository projection support

**Files:**
- Modify: `apps-script/src/repositories/inventory/inventory-repository.ts`
- Modify: `apps-script/src/services/platform/registry/table-registry.ts`
- Test: `tests/apps-script/inventory/inventory-repository.test.ts`
- Test: `tests/apps-script/inventory/inventory-sheet-repository.test.ts`
- Test: `tests/apps-script/platform/table-registry.test.ts`

**Steps:**

- [x] Add repository methods `getLotBalance`, `listLotBalances`, `applyLotProjection`, `getSerialState`, `saveSerialState`.
- [x] Implement in-memory projection maps.
- [x] Implement sheet-backed versioned projection rows for lot and serial.
- [x] Normalize table registry headers for `InventoryLotBalance` and `SerialState` with tenant/schema/version metadata.
- [x] Add repository tests for latest lot/serial projection reads.

## Task 3: Service guards and projection updates

**Files:**
- Modify: `apps-script/src/services/inventory/inventory-service.ts`
- Test: `tests/apps-script/inventory/inventory-service-opening-lot-serial.test.ts`

**Steps:**

- [x] Add failing tests for OpeningBalance after existing movement rejection.
- [x] Add failing tests for lot receive, expired-lot issue rejection and FEFO-safe lot issue.
- [x] Add failing tests for serial receive uniqueness and serial issue state transition.
- [x] Implement opening guard using existing movement list for the exact Warehouse + Variant.
- [x] Implement lot projection update on receive/issue/return restock/scrap.
- [x] Implement serial projection update on receive/issue/return quarantine/restock/scrap.
- [x] Run focused inventory service tests.

## Task 4: API/local/backend verification and tracking

**Files:**
- Modify: `web/src/lib/api/local-fake-backend.ts` if parser payload shape requires local demo update.
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`
- Modify: this plan

**Steps:**

- [x] Run `npm test -- tests/shared/inventory-contracts.test.ts tests/apps-script/inventory tests/apps-script/platform/table-registry.test.ts`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm run build && npm run check:artifact`.
- [x] Run `npm run verify`.
- [x] Check completed tasks in this plan and update Phase 5 tracking.

## Self-Review

- Spec coverage: covers SRS-INV-003, SRS-INV-008 and Phase 5 remaining opening/lot/serial guard at baseline level. Full UI forms/import wizard remain outside this slice.
- Placeholder scan: no TODO/TBD placeholders.
- Type consistency: DTO/method names are defined before use and follow existing inventory naming.
