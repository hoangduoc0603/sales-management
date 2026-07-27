# Phase 8B Return Refund Exchange Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện phần còn mở của Phase 8 liên quan deposit cancel, return refund/credit, inspection Scrap/KeepQuarantine và exchange net settlement.

**Architecture:** Sales tiếp tục sở hữu chứng từ Return/Exchange và điều phối Inventory/Finance qua service contract. Inventory bổ sung command Scrap từ Quarantine; Finance bổ sung refund/customer credit command dùng source document bất biến. UI Phase 8 shell chỉ cần cập nhật copy/state nếu contract mới cần hiển thị.

**Tech Stack:** TypeScript, Google Apps Script service/repository seam, Zod, Vitest, React/Vite local shell.

## Global Constraints

- Không đổi SRS/ADR/LLD/state machine đã duyệt.
- Return/refund không sửa Payment gốc; tạo chứng từ đối ứng.
- Exchange phải là Return + SaleOrder mới liên kết hai chiều.
- `Scrap` giảm Quarantine/on-hand/value; `KeepQuarantine` giữ hàng trong Quarantine.
- Test đỏ trước production code; chỉ tick master plan khi verify đầy đủ.

---

## Task 1: Finance and Inventory support commands

**Files:**
- Modify: `shared/contracts/finance/finance.ts`
- Modify: `apps-script/src/services/finance/finance-service.ts`
- Modify: `shared/contracts/inventory/inventory.ts`
- Modify: `apps-script/src/services/inventory/inventory-service.ts`
- Test: `tests/apps-script/finance/finance-service-payment.test.ts`
- Test: `tests/apps-script/inventory/inventory-service-return.test.ts`

- [x] Add failing tests for `finance.recordRefund`, `finance.createCustomerCreditFromSource` and `inventory.scrapReturn`.
- [x] Implement Finance refund/credit and Inventory scrap.
- [x] Run targeted tests.

## Task 2: Sales return resolve refund/credit and inspection completion

**Files:**
- Modify: `shared/contracts/sales/sales.ts`
- Modify: `shared/schemas/sales/sales.ts`
- Modify: `apps-script/src/services/sales/sales-service.ts`
- Test: `tests/shared/sales-contracts.test.ts`
- Test: `tests/apps-script/sales/sales-service.test.ts`

- [x] Add failing tests for return resolve refund, customer credit, Scrap and KeepQuarantine.
- [x] Extend `SalesReturnResolveRequest/Response`.
- [x] Implement Sales orchestration to Finance/Inventory.
- [x] Run targeted tests.

## Task 3: Exchange command and API/local fake wiring

**Files:**
- Modify: `shared/contracts/sales/sales.ts`
- Modify: `shared/schemas/sales/sales.ts`
- Modify: `shared/contracts/platform/operations.ts`
- Modify: `apps-script/src/services/sales/sales-service.ts`
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Test: `tests/apps-script/sales/sales-service.test.ts`
- Test: `tests/apps-script/sales/sales-composition.test.ts`
- Test: `tests/web/local-fake-backend.test.ts`

- [x] Add failing tests for `sales.exchange.create` net settlement.
- [x] Implement exchange command creating linked Return and SaleOrder.
- [x] Wire API/local fake backend.
- [x] Run targeted tests.

## Task 4: Verification and tracking

**Files:**
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`
- Modify: `docs/superpowers/plans/2026-07-27-sales-orders-returns-warranty-phase-8.md`

- [x] Run `npm run verify`.
- [x] Update master/checklist only for completed scope.
- [x] Record remaining Phase 8C warranty attachment/traceability gaps.

## Self-Review

- Spec coverage: return refund/credit, inspection Restock/KeepQuarantine/Scrap and exchange net settlement.
- Intentional gap after this plan: deposit credit/refund thật khi hủy đơn có đặt cọc, Drive attachment flow and deeper CRM reversal/loyalty/promotion/commission entries remain for Phase 8C.
