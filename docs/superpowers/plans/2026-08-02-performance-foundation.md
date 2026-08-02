# Nền tảng hiệu năng toàn ứng dụng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa performance-first thành quy tắc bắt buộc toàn app và đưa POS/Google Sheets command path về đúng lock, cache và telemetry contract đã Accepted.

**Architecture:** `runtime-and-performance.md` và ADR 0004/0005/0016/0017 giữ vai trò policy. Platform nhận flush hook và đo lock; Sales tách preflight khỏi command critical section; Catalog/Inventory cung cấp narrow read; browser POS dùng IndexedDB versioned. Mutation vẫn server-authoritative và command journal vẫn là retry fallback.

**Tech Stack:** TypeScript, React, Vite, Vitest, Google Apps Script, Google Sheets Advanced Service, IndexedDB, clasp.

## Global Constraints

- Không đổi SRS, state machine, permission, source of truth, ledger ownership, physical schema, partition/lifecycle hoặc SLO.
- Cache không quyết định tồn, tiền, công nợ, permission hoặc commit; cache miss/unavailable phải fallback an toàn.
- POS commit lock không gọi `getPosProjection`, không scan transaction/history, không Drive/PDF/export/report/notification.
- Document, ledger, projection và `CommandTransaction Committed` phải được batch flush trước success và trước release lock.
- Giữ ADR 0016 single-commit: flush lỗi đi qua error path hiện có; retry/tra cứu dùng cùng idempotency key, không thêm `Preparing` recovery hay state mới.
- Không lưu raw token, password, verifier, secret hoặc PII ngoài contract vào cache, telemetry hoặc fixture.
- Benchmark `/dev` mới là evidence production; local benchmark chỉ là regression.

---

### Task 1: Performance policy và mandatory intake

**Files:**
- Create: `docs/architecture/performance-playbook.md`
- Modify: `AGENTS.md`
- Modify: `docs/architecture/README.md`
- Modify: `docs/architecture/detailed-design.md`
- Modify: `docs/architecture/lld-traceability-review.md`
- Modify: `docs/architecture/runtime-and-performance.md`
- Modify: `docs/architecture/release-hardening.md`

**Interfaces:**
- Produces a mandatory intake table for API, Sheets/Drive, cache, worker, large-read-model and fast-path changes.

- [ ] **Step 1: Write the playbook**

Create sections `Classify path`, `Read/cache`, `Command/write`, `Worker`, `Telemetry`, and `Tests/evidence`; require this record in implementation plans:

```md
| Field | Decision |
| --- | --- |
| Path class | Query / Command / Worker |
| SLO and budget | Exact SRS target or non-fast-path rationale |
| Sheets I/O | Tables, lookup keys, estimated reads/writes/flushes |
| Cache | Key, TTL, invalidation, stale fallback, sensitive-data review |
| Lock | Preflight work, in-lock revalidation, writes, flush point |
| Evidence | Unit/integration/performance tests and production sample count |
```

- [ ] **Step 2: Make it mandatory**

Require the playbook in `AGENTS.md` before changes touching API, Apps Script/Sheets/Drive, command/query, cache, worker, payload/read model or performance-sensitive UI. Link it from Architecture README. Detailed Design and LLD traceability must require the intake table and benchmark rule.

- [ ] **Step 3: Align terminology**

Document actual `ApiMeta.durationMs`, `stages` and `io`; define `command.lockWaitMs` and `command.lockHoldMs`. Require release evidence to state sample count, environment, p50/p95/p99/max. Fewer than 20 samples are smoke evidence.

- [ ] **Step 4: Verify and commit**

Run: `node scripts/verify-structure.mjs`  
Expected: `Cấu trúc thư mục base hợp lệ.`

```bash
git add AGENTS.md docs/architecture docs/superpowers/specs docs/superpowers/plans
git commit -m "docs(performance): add mandatory optimization playbook"
```

### Task 2: Lock timing and command flush primitive

**Files:**
- Modify: `apps-script/src/infrastructure/platform/runtime.ts`
- Modify: `apps-script/src/infrastructure/google-workspace/apps-script-lock-provider.ts`
- Modify: `apps-script/src/services/platform/command/command-coordinator.ts`
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `apps-script/src/bootstrap/create-production-api-composition.ts`
- Modify: `apps-script/src/bootstrap/pos-acceptance-drill.ts`
- Test: `tests/apps-script/platform/command-coordinator.test.ts`
- Test: `tests/apps-script/platform/google-workspace-adapter.test.ts`

**Interfaces:**
- Produces `CommandCoordinator` dependency `flushPendingWrites?: () => void`.
- Keeps `LockProvider.withLock<T>(operation: () => T): T`, while recording wait and hold stages.

- [ ] **Step 1: Write failing ordering tests**

Use a fake lock/flush event list and assert:

```ts
expect(events).toEqual([
  'waitLock:3000', 'handler', 'appendCommitted',
  'flushPendingWrites', 'spreadsheetFlush', 'releaseLock',
]);
expect(performance.stages['command.lockWaitMs']).toBeGreaterThanOrEqual(0);
expect(performance.stages['command.lockHoldMs']).toBeGreaterThanOrEqual(0);
```

Add a flush-throwing case asserting `releaseLock` still occurs and `run()` throws rather than returning success. Do not add a new command status or recovery state.

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/apps-script/platform/command-coordinator.test.ts tests/apps-script/platform/google-workspace-adapter.test.ts`  
Expected: FAIL because the flush dependency and lock stages do not exist.

- [ ] **Step 3: Implement minimal boundary**

Call injected `flushPendingWrites()` after `appendNew(Committed)` inside the `withLock` callback and record `command.flushPendingWritesMs`. Inject `sheetGateway.flushPendingAppends` only in production composition. Keep `afterInvoke` as best-effort cleanup for non-command paths. Time `waitLock()` and hold through `SpreadsheetApp.flush()` in the Apps Script lock adapter.

- [ ] **Step 4: Verify green and commit**

Run: `npm test -- tests/apps-script/platform/command-coordinator.test.ts tests/apps-script/platform/google-workspace-adapter.test.ts`  
Expected: PASS; test event order proves Advanced Sheets flush occurs before Spreadsheet flush and unlock.

```bash
git add apps-script/src/infrastructure apps-script/src/services/platform/command apps-script/src/bootstrap tests/apps-script/platform
git commit -m "perf(platform): flush command batches before lock release"
```

### Task 3: Narrow Catalog contract for POS revalidation

**Files:**
- Modify: `apps-script/src/repositories/catalog/catalog-repository.ts`
- Modify: `apps-script/src/services/catalog/catalog-service.ts`
- Test: `tests/apps-script/catalog/catalog-sheet-repository.test.ts`
- Test: `tests/apps-script/catalog/catalog-service.test.ts`

**Interfaces:**
- Produces `CatalogRepository.findVariantsByIds(variantIds: readonly string[]): readonly VariantDTO[]`.
- Produces internal `CatalogService.quotePosLines({ branchId, warehouseId, customerId?, lines }): CommerceQuote`.

- [ ] **Step 1: Write failing narrow-read tests**

With a fake Sheet gateway representing 10,000 variants, request two IDs and assert no `readTable` call:

```ts
const quote = service.quotePosLines({ branchId: 'branch-default', warehouseId: 'warehouse-default', lines });
expect(quote.lines).toHaveLength(2);
expect(gateway.readRequests).toEqual([]);
expect(gateway.findRequests.map((request) => request.value)).toEqual(['variant-1', 'variant-2']);
```

Also assert inactive/missing variants produce the existing `PRICE_CHANGED`-compatible failure, not a full projection.

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/apps-script/catalog/catalog-sheet-repository.test.ts tests/apps-script/catalog/catalog-service.test.ts`  
Expected: FAIL because the narrow repository/service contracts do not exist.

- [ ] **Step 3: Implement and verify green**

Deduplicate IDs; use `findRowsByColumn` through the existing gateway targeted lookup path; retain cache/fallback behavior. Quote only requested active variants and requested active sale unit versions. Do not register a new RPC operation and do not change `getPosProjection`.

Run: `npm test -- tests/apps-script/catalog/catalog-sheet-repository.test.ts tests/apps-script/catalog/catalog-service.test.ts`  
Expected: PASS and no full-table read in the new test.

```bash
git add apps-script/src/repositories/catalog apps-script/src/services/catalog tests/apps-script/catalog
git commit -m "perf(catalog): add narrow POS revalidation lookup"
```

### Task 4: POS preflight and short command critical section

**Files:**
- Modify: `apps-script/src/services/sales/sales-service.ts`
- Test: `tests/apps-script/sales/sales-service.test.ts`
- Test: `tests/apps-script/sales/sales-composition.test.ts`

**Interfaces:**
- Consumes `CatalogService.quotePosLines`, `InventoryService.checkAvailability`, `FinanceRepository.getShift` and CommandCoordinator flush hook.
- Produces unchanged `SalesService.completePosSale(input): SalesServiceResult<SalesPosCompleteResponse>`.

- [ ] **Step 1: Write failing lock-boundary tests**

Use a recording lock provider and catalog fake. Assert initial `getPosProjection` runs outside lock, `quotePosLines` runs inside it, and retry still creates one order:

```ts
expect(events).toContain('preflight:getPosProjection');
expect(events).toContain('inLock:quotePosLines');
expect(events).not.toContain('inLock:getPosProjection');
expect(retryResult).toEqual(firstResult);
expect(repository.orders()).toHaveLength(1);
```

Cover stale quote, closed shift and multi-line insufficient stock.

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/apps-script/sales/sales-service.test.ts tests/apps-script/sales/sales-composition.test.ts`  
Expected: FAIL because checkout currently calls `getPosProjection` in its locked handler.

- [ ] **Step 3: Implement two phases**

Build candidate snapshots and non-authoritative quote outside `commandCoordinator.run`. The locked closure uses only narrow quote lookup, direct `shiftId` validation, aggregate multi-line stock check and current Inventory/Finance/Sales writes. Preserve current receipt, conflict codes, idempotency and single-line no-double-stock-precheck behavior.

- [ ] **Step 4: Verify green and commit**

Run: `npm test -- tests/apps-script/sales/sales-service.test.ts tests/apps-script/sales/sales-composition.test.ts tests/apps-script/platform/command-coordinator.test.ts`  
Expected: PASS with original retry/conflict behavior.

```bash
git add apps-script/src/services/sales tests/apps-script/sales
git commit -m "perf(pos): move checkout preflight outside command lock"
```

### Task 5: IndexedDB-backed POS projection cache

**Files:**
- Create: `web/src/features/pos/catalog-cache/indexed-db-pos-catalog-store.ts`
- Modify: `web/src/features/pos/catalog-cache/load-pos-catalog-projection.ts`
- Modify: `web/src/features/pos/pos-checkout-shell.tsx`
- Modify: `web/src/app/sales-management-app.tsx`
- Test: `tests/web/load-pos-catalog-projection.test.ts`
- Test: `tests/web/pos-checkout-shell.test.ts`
- Test: `tests/web/auth-flow.test.ts`

**Interfaces:**
- Produces `PosCatalogProjectionStore.read(key)`, `write(key, entry)`, `clearNamespace(namespace)` returning `Promise`.
- Produces a key with installation, tenant, user, auth version, app/schema version, Branch/Warehouse and projection version.

- [ ] **Step 1: Write failing asynchronous cache tests**

Use an injected in-memory IndexedDB-compatible store. Assert distinct key dimensions, corrupt cleanup, unavailable fallback, logout cleanup and no session token:

```ts
await store.write(key, { cachedAt: '2026-08-02T00:00:00.000Z', projection });
await expect(store.read({ ...key, authVersion: 2 })).resolves.toBeUndefined();
await store.clearNamespace(namespace);
await expect(store.read(key)).resolves.toBeUndefined();
```

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/web/load-pos-catalog-projection.test.ts tests/web/pos-checkout-shell.test.ts tests/web/auth-flow.test.ts`  
Expected: FAIL because loader persistence is synchronous `localStorage`.

- [ ] **Step 3: Implement and verify green**

Implement one IndexedDB object store plus injected test adapter. Loader renders current memory state, awaits cache, then remote-refreshes by TTL/version. Construct namespace from runtime installation/app/schema plus actor/scope; clear actor namespace on logout; delete corrupt/incompatible entry; remove POS projection localStorage path. Keep memory barcode/search and remote fallback.

Run: `npm test -- tests/web/load-pos-catalog-projection.test.ts tests/web/pos-checkout-shell.test.ts tests/web/auth-flow.test.ts tests/web/pos-catalog-cache.test.ts`  
Expected: PASS; warm scan/search still have no RPC.

```bash
git add web/src/features/pos web/src/app/sales-management-app.tsx tests/web
git commit -m "perf(pos): persist versioned projection in indexeddb"
```

### Task 6: Telemetry, benchmark and production evidence

**Files:**
- Modify: `apps-script/src/api/performance-tracker.ts`
- Modify: `apps-script/src/api/api-context.ts`
- Modify: `apps-script/src/infrastructure/google-workspace/sheet-gateway.ts`
- Modify: `apps-script/src/bootstrap/pos-acceptance-drill.ts`
- Modify: `tests/performance/pos-performance.test.ts`
- Modify: `tests/apps-script/platform/google-workspace-adapter.test.ts`
- Modify: `docs/architecture/release-hardening.md`

**Interfaces:**
- Produces command lock/flush stages and existing gateway full-scan/batch counters in `ApiMeta`.
- Produces drill summary `{ sampleCount, p50Ms, p95Ms, p99Ms, maxMs, certified }`.

- [ ] **Step 1: Write failing telemetry tests**

```ts
expect(meta.stages['command.lockHoldMs']).toBeGreaterThanOrEqual(0);
expect(meta.stages['command.flushPendingWritesMs']).toBeGreaterThanOrEqual(0);
expect(meta.io.sheetFindFullScanCount ?? 0).toBe(0);
expect(summarizeSamples([1, 2, 3]).certified).toBe(false);
```

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/performance/pos-performance.test.ts tests/apps-script/platform/google-workspace-adapter.test.ts`  
Expected: FAIL because certification summary and command metrics are absent.

- [ ] **Step 3: Implement and verify green**

Record counters only at command/gateway boundaries. Export a pure percentile summary helper; local benchmark labels itself regression only. Do not persist normal-success telemetry.

Run: `npm test -- tests/performance/pos-performance.test.ts tests/apps-script/platform/google-workspace-adapter.test.ts`  
Expected: PASS with existing local SRS assertions retained.

- [ ] **Step 4: Full verification and evidence**

Run: `npm run verify`  
Expected: structure, typecheck, lint, tests, build and Apps Script artifact checks pass.

Run: `npm run deploy:test`  
Expected: verified artifact is pushed to `/dev`, no production version is created.

In the authorized test tenant, collect at least 20 cold and 20 warm checkout samples covering 10,000 variants, single/multi-line, retry, concurrency and report/export background load. Record environment, percentiles/max, stages and I/O in `release-hardening.md`; do not mark release Ready unless every P0 gate is closed.

```bash
git add apps-script/src/api apps-script/src/infrastructure/google-workspace apps-script/src/bootstrap tests/performance tests/apps-script/platform docs/architecture/release-hardening.md
git commit -m "perf(platform): add certified benchmark evidence"
```

## Plan self-review

- Spec coverage: Task 1 is playbook/gate; Task 2 is flush/lock; Tasks 3–4 are narrow revalidation/preflight; Task 5 is IndexedDB/invalidation; Task 6 is telemetry/evidence.
- Type consistency: `flushPendingWrites` is CommandCoordinator-only; `quotePosLines` is internal Catalog-to-Sales; `PosCatalogProjectionStore` isolates browser APIs from `shared/`.
- Scope: all changes are shared primitive, POS fast path or its regression evidence; no new business capability is introduced.
