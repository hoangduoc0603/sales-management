# Purchasing & Supplier Operations Phase 9 Implementation Plan

> **For agentic workers:** Use TDD and execute task-by-task. Only tick checkboxes after targeted verification passes.

**Goal:** Triển khai nền Purchasing dùng được cho Supplier, PO, Goods Receipt, landed cost/late cost, Supplier Return và Payable handoff.

**Architecture:** Purchasing sở hữu Supplier, PO, GoodsReceipt, LandedCostAdjustment, SupplierReturn và PurchaseCostVariance. Inventory sở hữu movement/balance/cost projection. Finance sở hữu Payable/PaymentAllocation/SupplierPrepayment. PO không tạo tồn/cost/payable; chỉ Approved GoodsReceipt/SupplierReturn/Adjustment tạo ledger đối ứng.

**Source docs:** `docs/product/srs/purchasing.md`, `docs/architecture/modules/purchasing.md`, `docs/architecture/modules/finance-shifts.md`, `docs/data-model/tables/purchasing-finance.md`, `docs/decisions/0015-late-purchase-cost-adjustment.md`.

**Known doc gap:** Master plan mentions `docs/architecture/modules/purchasing-finance.md`, but the actual approved data dictionary is `docs/data-model/tables/purchasing-finance.md`.

---

## Task 1: Supplier master and Purchasing contracts

**Files:**
- Create: `shared/contracts/purchasing/purchasing.ts`
- Create: `shared/schemas/purchasing/purchasing.ts`
- Modify: `shared/contracts/platform/operations.ts`
- Test: `tests/shared/purchasing-contracts.test.ts`

- [x] Add failing tests for Supplier, PO, GoodsReceipt, LandedCostAdjustment and SupplierReturn contracts.
- [x] Implement typed DTOs and Zod parsers.
- [x] Register operation names.
- [x] Run targeted shared contract tests.

## Task 2: Purchasing repository and Supplier/PO lifecycle

**Files:**
- Create: `apps-script/src/repositories/purchasing/purchasing-repository.ts`
- Create: `apps-script/src/services/purchasing/purchasing-service.ts`
- Test: `tests/apps-script/purchasing/purchasing-service.test.ts`

- [x] Add failing tests for supplier unique code/status and PO lifecycle no-ledger.
- [x] Implement in-memory repository and service methods.
- [x] Run targeted Purchasing service tests.

## Task 3: GoodsReceipt approval and Payable handoff

**Files:**
- Modify: `shared/contracts/finance/finance.ts`
- Modify: `apps-script/src/services/finance/finance-service.ts`
- Modify: `apps-script/src/services/purchasing/purchasing-service.ts`
- Test: `tests/apps-script/purchasing/purchasing-service.test.ts`
- Test: `tests/apps-script/finance/finance-service-payment.test.ts`

- [x] Add failing tests for partial receipt from PO, Inventory `PurchaseReceipt`, moving average cost and Payable creation.
- [x] Add Finance payable creation support if missing.
- [x] Implement receipt approval and PO received/completed projection.
- [x] Run targeted tests.

## Task 4: Landed cost and late cost adjustment

**Files:**
- Modify: `shared/contracts/inventory/inventory.ts`
- Modify: `apps-script/src/services/inventory/inventory-service.ts`
- Modify: `apps-script/src/services/purchasing/purchasing-service.ts`
- Test: `tests/apps-script/purchasing/purchasing-service.test.ts`
- Test: `tests/apps-script/inventory/inventory-service-cost-adjustment.test.ts`

- [x] Add failing tests for exact landed cost allocation.
- [x] Add failing tests for late cost split into remaining on-hand value and `PurchaseCostVariance`.
- [x] Implement adjustment evidence and Inventory value-only adjustment.
- [x] Run targeted tests.

## Task 5: SupplierReturn and API/local fake wiring

**Files:**
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Test: `tests/apps-script/purchasing/purchasing-composition.test.ts`
- Test: `tests/web/local-fake-backend.test.ts`

- [x] Add failing tests for SupplierReturn limit and payable reduction behavior.
- [x] Implement SupplierReturn approval with Inventory `PurchaseReturn` and Finance payable reduction handling.
- [x] Implement SupplierReturn `Refund`/`Replacement`/SupplierPrepayment behavior.
- [x] Superseded by ADR 0017: GoodsReceipt/SupplierReturn approval lưu `approvedBy/approvedAt`, không ghi `AuditOutbox`.
- [x] Wire Apps Script API and local fake backend.
- [x] Run targeted tests.

## Task 6: Verification and tracking

**Files:**
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`

- [x] Run `npm run verify`.
- [x] Tick only completed Phase 9 master-plan checkboxes.
- [x] Record remaining gaps: Purchasing UI remains gated by Approved design/handoff.
