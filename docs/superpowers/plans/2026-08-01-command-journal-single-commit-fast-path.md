# Command Journal Single-Commit Fast Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảm I/O đồng bộ của mọi mutation command trên Apps Script bằng single-commit fast path, trong khi vẫn giữ idempotency, ledger source-of-truth và AuditOutbox bền vững trước success.

**Architecture:** Command Coordinator kiểm tra idempotency trong lock; nếu chưa có `Committed resultJson`, handler ghi document/ledger/projection bắt buộc, append `AuditOutbox`, rồi append một `CommandTransaction Committed` kèm response snapshot. Repository có `appendNew()` để append command version `v1` không preflight version lookup.

**Tech Stack:** TypeScript, Vitest, Google Apps Script, Google Sheets, clasp.

## Global Constraints

- Không chuyển POS ledger, InventoryMovement, Finance ledger, materialized balance hoặc AuditOutbox sang worker.
- Không ghi secret/token/password vào `CommandTransaction`, audit, telemetry hoặc test fixture.
- Không dùng full-table scan trong fast path nếu gateway đã có lookup/cache hẹp.
- Tài liệu thay đổi command protocol phải được cập nhật cùng code.

---

### Task 1: Command repository append-new fast path

**Files:**
- Modify: `apps-script/src/repositories/platform/command-repository.ts`
- Test: `tests/apps-script/platform/command-sheet-repository.test.ts`

**Interfaces:**
- Produces: `CommandRepository.appendNew(record: CommandTransactionRecord): void`

- [x] **Step 1: Write failing test**

```ts
repository.appendNew({
  commandId: 'cmd-fast-commit-1',
  idempotencyKey: 'idem-fast-commit-1',
  status: 'Committed',
  resultJson: '{"receiptId":"receipt-fast-1"}',
  createdAt: '2026-07-27T00:00:00.000Z',
  updatedAt: '2026-07-27T00:00:01.000Z',
});

expect(gateway.readCount).toBe(0);
expect(gateway.findRequests).toEqual([]);
```

- [x] **Step 2: Verify red**

Run: `npm test -- tests/apps-script/platform/command-coordinator.test.ts tests/apps-script/platform/command-sheet-repository.test.ts`  
Expected before implementation: FAIL with `repository.appendNew is not a function`.

- [x] **Step 3: Implement minimal code**

Add `appendNew()` to in-memory and sheet-backed `CommandRepository`. Sheet-backed repository appends `commandId:v1` directly through `gateway.appendRows()`.

- [x] **Step 4: Verify green**

Run: `npm test -- tests/apps-script/platform/command-coordinator.test.ts tests/apps-script/platform/command-sheet-repository.test.ts`  
Expected: PASS.

### Task 2: Command coordinator single-commit flow

**Files:**
- Modify: `apps-script/src/services/platform/command/command-coordinator.ts`
- Test: `tests/apps-script/platform/command-coordinator.test.ts`

**Interfaces:**
- Consumes: `CommandRepository.appendNew(record)`
- Produces stage timings: `command.appendCommittedMs`, `command.appendFailedMs`

- [x] **Step 1: Write failing test**

```ts
expect(performance.stages['command.appendCommittedMs']).toBeGreaterThanOrEqual(0);
expect(performance.stages).not.toHaveProperty('command.savePreparingMs');
```

- [x] **Step 2: Verify red**

Run: `npm test -- tests/apps-script/platform/command-coordinator.test.ts tests/apps-script/platform/command-sheet-repository.test.ts`  
Expected before implementation: FAIL because `command.appendCommittedMs` is missing.

- [x] **Step 3: Implement minimal code**

Remove default `savePreparingMs` path. After handler and AuditOutbox append, call `commandRepository.appendNew({ status: 'Committed', resultJson })`. On thrown handler error, append sanitized `Failed`.

- [x] **Step 4: Verify green**

Run: `npm test -- tests/apps-script/platform/command-coordinator.test.ts tests/apps-script/platform/command-sheet-repository.test.ts`  
Expected: PASS.

### Task 3: Documentation and ADR traceability

**Files:**
- Create: `docs/decisions/0016-command-journal-single-commit-fast-path.md`
- Modify: `docs/decisions/README.md`
- Modify: `docs/decisions/0005-command-journal-idempotency-short-lock.md`
- Modify: `docs/product/srs/overview.md`
- Modify: `docs/architecture/runtime-and-performance.md`
- Modify: `docs/architecture/platform-technical-design.md`
- Modify: `docs/architecture/application-architecture.md`
- Modify: `docs/data-model/logical-data-model.md`

- [x] **Step 1: Add ADR 0016**

Document accepted single-commit fast path and explicit non-goals: no async ledger, no async AuditOutbox.

- [x] **Step 2: Update SRS/architecture references**

Keep `Preparing` as supported schema state, but make direct `Committed` append the default fast path.

### Task 4: Regression and Apps Script benchmark

**Files:**
- Existing tests and deploy scripts.

- [x] **Step 1: Run full local verification**

Run: `npm test`.

- [x] **Step 2: Build and push test deployment**

Run: `npm run deploy:test`.

- [x] **Step 3: Run Apps Script POS acceptance drill**

Run `runPosAcceptanceDrill` in Apps Script and compare `checkoutMs`, command stages, and append/read counts against the previous benchmark.
