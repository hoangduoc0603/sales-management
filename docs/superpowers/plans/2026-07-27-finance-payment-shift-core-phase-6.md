# Finance, Payment & Shift Core Phase 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây Finance core đủ để POS checkout phase sau có thể kiểm ca mở, ghi payment/cash transaction, tạo receivable/credit và reversal ở mức service seam.

**Architecture:** Payment/CashTransaction/Receivable/Payable/Allocation/Credit/Shift là evidence bất biến hoặc state có transition rõ. Balance/aging/expected cash là projection/read model từ evidence Approved/Committed, không có đường sửa số dư trực tiếp. Phase này dùng in-memory repository/test seam và typed RPC operations; Sheets adapter vật lý giữ theo TableRegistry.

**Tech Stack:** TypeScript, Zod, Google Apps Script service seam, Vitest, React UI shell.

## Global Constraints

- Bám `SRS-FIN-001..013`, LLD `finance-shifts.md`, data dictionary `purchasing-finance.md`.
- Không sửa/xóa Payment/CashTransaction/Allocation Approved; reversal tạo counter transaction/allocation.
- POS khi policy bắt buộc ca phải có Shift `Open` đúng Branch/Warehouse/Cashier.
- Overpayment tạo CustomerCredit/SupplierPrepayment; không biểu diễn công nợ âm.
- Expense Approved tạo Disbursement/Expense cash transaction; landed cost vẫn thuộc Purchasing phase.

## File Structure

- Create `shared/contracts/finance/finance.ts`: cash drawer/payment method, shift, payment, obligation, allocation, credit contracts.
- Create `shared/schemas/finance/finance.ts`: parsers for shift/payment/reversal/summary.
- Modify `shared/contracts/platform/operations.ts`: thêm finance operations/actions.
- Create `apps-script/src/repositories/finance/finance-repository.ts`: in-memory repository.
- Create `apps-script/src/services/finance/finance-service.ts`: shift, payment, allocation, credit, reversal, expense approve.
- Modify `apps-script/src/services/platform/registry/table-registry.ts`: thêm Finance table definitions.
- Modify `apps-script/src/bootstrap/create-api-composition.ts`: wire finance operations.
- Modify `web/src/lib/api/local-fake-backend.ts`: local finance summary.
- Create `web/src/features/finance/finance-home.tsx`: shell Finance/Shifts theo approved handoff.
- Add tests under `tests/shared`, `tests/apps-script/finance`, `tests/web`.

## Task 1: Shared Contracts and Schemas

- [x] **Step 1:** Write failing tests for finance operations, integer VND amount, required source document and shift state inputs.
- [x] **Step 2:** Run focused test and verify fail.
- [x] **Step 3:** Implement DTOs/parsers and operation/action names.
- [x] **Step 4:** Run focused shared test and verify pass.

## Task 2: Repository and Table Registry

- [x] **Step 1:** Write failing tests for append-only cash transaction/payment allocation and no direct balance mutation.
- [x] **Step 2:** Write failing registry test for CashDrawer, PaymentMethod, Payment, CashTransaction, ReceivableLedger, PayableLedger, PaymentAllocation, CustomerCredit, SupplierPrepayment, Shift and Expense.
- [x] **Step 3:** Implement in-memory repository and registry definitions.
- [x] **Step 4:** Run focused tests and verify pass.

## Task 3: Shift Open/Close/Lock

- [x] **Step 1:** Write failing tests for one cashier/one drawer open policy and close variance requiring reason.
- [x] **Step 2:** Run focused shift test and verify fail.
- [x] **Step 3:** Implement `finance.shift.open`, `finance.shift.close`, `finance.shift.lock`.
- [x] **Step 4:** Run focused shift tests and verify pass.

## Task 4: Payment Record, Allocation, Receivable and Credit

- [x] **Step 1:** Write failing tests for multi-allocation, partial payment receivable, overpayment customer credit and allocation limit.
- [x] **Step 2:** Run focused payment test and verify fail.
- [x] **Step 3:** Implement payment record with CashTransaction, allocation, obligation and credit ledger.
- [x] **Step 4:** Run focused payment tests and verify pass.

## Task 5: Payment Reversal and Expense Approval

- [x] **Step 1:** Write failing tests proving reversal creates counter records and expense approval creates disbursement.
- [x] **Step 2:** Run focused reversal/expense test and verify fail.
- [x] **Step 3:** Implement reversal and expense approval.
- [x] **Step 4:** Run focused tests and verify pass.

## Task 6: API Composition and Local Finance UI Shell

- [x] **Step 1:** Fetch/open approved `finance-shifts.html` artifact.
- [x] **Step 2:** Write failing API/UI tests for finance summary, shift state and restricted balance copy.
- [x] **Step 3:** Wire operations/local fake and implement Finance shell from approved design.
- [x] **Step 4:** Run focused API/UI tests and verify pass.

## Task 7: Phase Verification and Tracking

- [x] **Step 1:** Run `npm run verify`.
- [x] **Step 2:** Run local browser smoke: login, open Tài chính, verify finance shell and no console error.
- [x] **Step 3:** Mark only completed Phase 6 items in child/master plan.
- [x] **Step 4:** Report verification evidence and remaining dependencies for POS checkout.
