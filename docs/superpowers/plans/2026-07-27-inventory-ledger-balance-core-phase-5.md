# Inventory Ledger & Balance Core Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây InventoryMovement append-only và InventoryBalance projection đủ cho opening/receipt, sale issue, reservation/release, return quarantine/restock, transfer baseline và stocktake approval seam.

**Architecture:** InventoryMovement là source of truth; InventoryBalance/lot/serial là projection rebuildable nhưng cập nhật trong cùng command seam. Quantity dùng milli-unit, value/cost dùng VND integer theo ADR 0014. Phase này dùng in-memory repository/test seam và single RPC operations; Sheets adapter vật lý giữ theo registry để thay sau.

**Tech Stack:** TypeScript, Zod, Google Apps Script service seam, Vitest.

## Global Constraints

- Bám `SRS-INV-001..017`, LLD `inventory.md`, data dictionary `sales-inventory.md`, ADR `0014`.
- Không sửa trực tiếp balance để thay movement.
- Mọi quantity chuẩn là `quantityMilli`; mọi value/cost là integer VND.
- Moving weighted average cost theo `Warehouse + Variant`.
- Issue giảm tồn snapshot cost hiện hành; nhập sau không tính lại issue cũ.
- Mặc định chặn âm on-hand/available; ngoại lệ âm kho phải explicit approval/temporary cost.
- Lot/serial/transfer/stocktake state đầy đủ sẽ mở rộng theo task riêng, không làm sai ledger core.

---

## File Structure

- Create `shared/contracts/inventory/inventory.ts`: movement, balance, receive/issue/reserve/release contracts.
- Create `shared/schemas/inventory/inventory.ts`: parser quantity/value/command requests.
- Modify `shared/contracts/platform/operations.ts`: thêm inventory operations/actions.
- Create `apps-script/src/repositories/inventory/inventory-repository.ts`: in-memory movement/balance repository.
- Create `apps-script/src/services/inventory/inventory-service.ts`: receive, issue, reserve, release, return quarantine/restock.
- Modify `apps-script/src/services/platform/registry/table-registry.ts`: thêm InventoryMovement/Balance/Lot/Serial/Transfer/Stocktake table definitions.
- Modify `apps-script/src/bootstrap/create-api-composition.ts`: wire inventory operations.
- Modify `web/src/lib/api/local-fake-backend.ts`: local inventory summary if cần cho UI smoke.
- Create `web/src/features/inventory/inventory-home.tsx`: shell Inventory theo approved handoff.
- Add tests under `tests/shared`, `tests/apps-script/inventory`, `tests/web`.

## Task 1: Shared Contracts and Schemas

**Files:**
- Create: `shared/contracts/inventory/inventory.ts`
- Create: `shared/schemas/inventory/inventory.ts`
- Modify: `shared/contracts/platform/operations.ts`
- Test: `tests/shared/inventory-contracts.test.ts`

- [x] **Step 1:** Write failing tests for inventory operations, positive milli quantity, integer value and required source document.
- [x] **Step 2:** Run focused test and verify fail.
- [x] **Step 3:** Implement contracts/parsers.
- [x] **Step 4:** Run focused shared test and verify pass.

## Task 2: Movement Repository, Balance Projection and Registry

**Files:**
- Create: `apps-script/src/repositories/inventory/inventory-repository.ts`
- Modify: `apps-script/src/services/platform/registry/table-registry.ts`
- Test: `tests/apps-script/inventory/inventory-repository.test.ts`
- Test: `tests/apps-script/platform/table-registry.test.ts`

- [x] **Step 1:** Write failing tests proving movement append-only and balance cannot be mutated without service-owned movement.
- [x] **Step 2:** Write failing registry test for InventoryMovement/InventoryBalance/Lot/Serial/Transfer/Stocktake tables.
- [x] **Step 3:** Implement in-memory repository and registry definitions.
- [x] **Step 4:** Run focused tests and verify pass.

## Task 3: Receive and Moving Weighted Average

**Files:**
- Create: `apps-script/src/services/inventory/inventory-service.ts`
- Test: `tests/apps-script/inventory/inventory-service-receive.test.ts`

- [x] **Step 1:** Write failing test: nhập 10 × 100.000 rồi 10 × 120.000 cho cùng Warehouse/Variant; average cost effective là 110.000.
- [x] **Step 2:** Run focused receive test and verify fail.
- [x] **Step 3:** Implement `receive` with `InventoryMovement` append and `InventoryBalance` projection update.
- [x] **Step 4:** Run focused receive test and verify pass.

## Task 4: Sale Issue, Negative Stock Guard and Cost Snapshot

**Files:**
- Modify: `apps-script/src/services/inventory/inventory-service.ts`
- Test: `tests/apps-script/inventory/inventory-service-issue.test.ts`

- [x] **Step 1:** Write failing tests: issue snapshots current average cost, blocks available negative by default, approved negative requires temporary cost/reason.
- [x] **Step 2:** Run focused issue test and verify fail.
- [x] **Step 3:** Implement `issueForSale`.
- [x] **Step 4:** Run focused issue test and verify pass.

## Task 5: Reservation and Release

**Files:**
- Modify: `apps-script/src/services/inventory/inventory-service.ts`
- Test: `tests/apps-script/inventory/inventory-service-reservation.test.ts`

- [x] **Step 1:** Write failing tests: reserve reduces available/increases reserved without changing on-hand/value; release reverses.
- [x] **Step 2:** Run focused reservation test and verify fail.
- [x] **Step 3:** Implement `reserve` and `release`.
- [x] **Step 4:** Run focused reservation test and verify pass.

## Task 6: Return Quarantine and Restock

**Files:**
- Modify: `apps-script/src/services/inventory/inventory-service.ts`
- Test: `tests/apps-script/inventory/inventory-service-return.test.ts`

- [x] **Step 1:** Write failing tests: return receive increases quarantine only; restock moves to available and updates weighted average.
- [x] **Step 2:** Run focused return test and verify fail.
- [x] **Step 3:** Implement `receiveReturnToQuarantine` and `restockReturn`.
- [x] **Step 4:** Run focused return test and verify pass.

## Task 7: API Composition and Local Inventory UI Shell

**Files:**
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Create: `web/src/features/inventory/inventory-home.tsx`
- Modify: `web/src/app/sales-management-app.tsx`
- Test: `tests/apps-script/inventory/inventory-composition.test.ts`
- Test: `tests/web/inventory-home.test.ts`

- [x] **Step 1:** Fetch/open approved `inventory-purchasing.html` artifact.
- [x] **Step 2:** Write failing API/UI tests for inventory balance summary and movement state copy.
- [x] **Step 3:** Wire operations and implement shell from approved design.
- [x] **Step 4:** Run focused API/UI tests and verify pass.

## Task 8: Phase Verification and Tracking

**Files:**
- Modify: `docs/superpowers/plans/2026-07-27-inventory-ledger-balance-core-phase-5.md`
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`

- [x] **Step 1:** Run `npm run verify`.
- [x] **Step 2:** Run local browser smoke: login, open Kho, verify inventory shell and no console error.
- [x] **Step 3:** Mark only completed Phase 5 items in child/master plan.
- [x] **Step 4:** Report verification evidence and remaining dependencies for Purchasing/Sales checkout.

## Self-Review

- Spec coverage: tasks cover movement, balance, weighted average, issue, reservation, return quarantine/restock and UI shell. Full lot/serial FEFO, transfer partial receive and stocktake approval can be extended after core service is green, because they share the same movement/balance foundation.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: operation and DTO names are introduced before use.
