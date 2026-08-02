# Inventory Operations Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved inventory operations overview UI in React/Tailwind so the inventory route exposes all handoff states for overview, alerts, lot/serial, reservation, trace, empty, restricted and scope-changed.

**Architecture:** Keep this slice frontend-only and read-only. `InventoryHome` renders typed demo/read-model data shaped from existing `InventoryBalanceSummaryRowDTO`; no new backend command/query, ledger mutation, schema, permission model or source-of-truth behavior is introduced in this task.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Cenio Core tokens, existing UI primitives.

## Global Constraints

- Tài liệu mặc định viết bằng tiếng Việt.
- InventoryMovement remains append-only source of truth; UI must not expose direct balance editing.
- `InventoryBalance`, lot balance and serial state are read projections; quarantine and in-transit are not available stock.
- Registry and handoff for `inventory-operations-overview.html` are `Approved`.
- Open Design artifact: project `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`, entry `inventory-operations-overview.html`.
- Local preview path: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-operations-overview.html`.

## Performance Intake

| Field | Decision |
| --- | --- |
| Path class | Browser-local interaction for a read-only UI shell. |
| User/SRS budget | Not on POS fast path; no new RPC. UI must avoid horizontal overflow on 390 px viewport and render from bounded demo/projection arrays. |
| Read/write set | Reads only props/local typed fixtures in this slice. No Google Sheets, Drive, partition or ledger I/O. |
| Cache | No new browser cache. Existing POS cache and backend source-of-truth semantics are unchanged. |
| Lock | No command path and no lock. |
| Worker | No worker. |
| Telemetry | No new telemetry because no API path is added. Future live query should report `generatedAt`, scope and coverage from backend. |
| Evidence | `tests/web/inventory-home.test.ts`, `npm run test -- tests/web/inventory-home.test.ts`, `npm run typecheck`, `npm run build`, and browser screenshot comparison against the local Open Design file path. |

---

### Task 1: Approval Gate And Tests

**Files:**
- Modify: `docs/design/open-design-registry.md`
- Modify: `docs/design/screens/inventory-operations-overview.md`
- Modify: `tests/web/inventory-home.test.ts`

**Interfaces:**
- Consumes: `InventoryHome` props from `web/src/features/inventory/inventory-home.tsx`.
- Produces: failing tests for approved hash states and read-only guard copy.

- [x] **Step 1: Mark the approved design gate**

Set the screen status to `Approved` in both registry and handoff because the user approved this design in the current session.

- [ ] **Step 2: Write the failing tests**

Replace legacy Inventory/Purchasing expectations with assertions for:

```typescript
expect(renderInventory('#overview')).toContain('Tổng quan tồn kho');
expect(renderInventory('#alerts')).toContain('Cảnh báo cần xử lý');
expect(renderInventory('#lot-serial')).toContain('Lô và serial cần theo dõi');
expect(renderInventory('#reservation')).toContain('Giữ chỗ theo nguồn');
expect(renderInventory('#trace')).toContain('Truy xuất biến động kho');
expect(renderInventory('#empty')).toContain('Chưa có biến thể trong phạm vi này');
expect(renderInventory('#restricted')).toContain('Phạm vi xem tồn kho bị giới hạn');
expect(renderInventory('#scope-changed')).toContain('Phạm vi kho đã thay đổi');
```

- [ ] **Step 3: Run test to verify RED**

Run: `npm run test -- tests/web/inventory-home.test.ts`
Expected: FAIL because `InventoryHome` still renders the older inventory/purchasing workbench states.

### Task 2: Overview UI Implementation

**Files:**
- Modify: `web/src/features/inventory/inventory-home.tsx`
- Modify: `web/src/styles/index.css`

**Interfaces:**
- Consumes: existing `InventoryHomeProps`, `InventoryHomeRow`, `Badge`, `Button`, `Panel`, `StateBlock`, `Listbox` and `Table` primitives.
- Produces: hash-routed read-only overview UI with stable route ids `overview`, `alerts`, `lot-serial`, `reservation`, `trace`, `empty`, `restricted`, `scope-changed`.

- [ ] **Step 1: Implement state routing**

Map `window.location.hash` to the approved route ids and render `#overview` by default. Unknown hashes must fall back to overview.

- [ ] **Step 2: Implement overview data surface**

Render metrics, toolbar/search/listbox controls, desktop table, mobile cards and a stock detail summary. Keep filters browser-local and bounded to the local rows for this slice.

- [ ] **Step 3: Implement secondary states**

Render the alerts, lot/serial, reservation, trace, empty, restricted and scope-changed panels with the exact handoff semantics: read-only trace, no direct balance edit, cost/value hidden in restricted state, and scope-changed requiring reload.

- [ ] **Step 4: Style with Cenio Core tokens**

Use existing `--cn-*` variables, 8 px controls, 12 px panels, custom listbox controls and responsive rules. Mobile 390 px must use cards or one-column layouts without horizontal page overflow.

- [ ] **Step 5: Run targeted GREEN**

Run: `npm run test -- tests/web/inventory-home.test.ts`
Expected: PASS.

### Task 3: Verification

**Files:**
- Verify: `web/src/features/inventory/inventory-home.tsx`
- Verify: `web/src/styles/index.css`
- Verify: Open Design local file path above.

**Interfaces:**
- Consumes: built Vite app and Open Design artifact.
- Produces: evidence that implementation matches the approved handoff.

- [ ] **Step 1: Run static checks**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Visual QA**

Open the built app and compare inventory route against the local Open Design file path for desktop, mobile 390 px, light/dark theme and required hash states.
