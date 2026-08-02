# Inventory UI Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tao bon Open Design artifact va handoff Approved bao phu day du UI nghiep vu Kho theo `SRS-INV-001..017`.

**Architecture:** Giu Open Design project `sale-management` la nguon visual, tao bon artifact theo ownership nghiep vu: overview, adjustment, transfer va stocktake. Registry va handoff la contract de code UI sau nay; luong POS, fulfillment va return chi duoc reference den artifact chu so huu, khong tao UI lap lai.

**Tech Stack:** Open Design desktop project, Cenio Core v0.7, Markdown handoff va registry trong repository.

## Global Constraints

- Khong sua SRS, LLD, ADR, schema, API, permission, state machine, source of truth, ledger, idempotency hoac policy hieu nang.
- Dung Cenio Core v0.7: Outfit, tabular figures, semantic token, custom listbox/combobox, radius va density theo `docs/design/design-system.md`.
- Khong dung native `<select>`, gradient, glassmorphism, neon, mono font cho gia tri nghiep vu, state gallery tren ready view hoac card chong card.
- Branch/Warehouse la global context tu AppShell; artifact khong fallback sang scope rong hon va khong hien data nhay cam khi backend tu choi quyen.
- Handoff va registry chi dung duong dan file Open Design tuyet doi; khong dung `127.0.0.1` hay localhost URL.
- Khong sua hoac revert cac thay doi khong lien quan dang co trong worktree; khong commit tu dong tren worktree dang dirty.

---

## File and Artifact Map

| Location | Responsibility |
| --- | --- |
| Open Design project `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | Project `sale-management`, chua bon artifact moi. |
| `inventory-operations-overview.html` | Read model ton, alert, lot/serial, reservation va trace. |
| `inventory-adjustment-exception.html` | Opening balance, adjustment, scrap va negative-stock exception. |
| `inventory-transfer-receive.html` | Transfer document, pick/ship, partial receive va variance. |
| `inventory-stocktake.html` | Stocktake session, count workbench va variance approval. |
| `docs/design/open-design-registry.md` | Dang ky artifact moi voi duong dan file tuyet doi, khong URL localhost. |
| `docs/design/screens/inventory-operations-overview.md` | Handoff overview. |
| `docs/design/screens/inventory-adjustment-exception.md` | Handoff adjustment/exception. |
| `docs/design/screens/inventory-transfer-receive.md` | Handoff transfer/receive. |
| `docs/design/screens/inventory-stocktake.md` | Handoff stocktake. |
| `docs/design/ui-coverage-gap-analysis.md` | Chot coverage `SRS-INV-001..017` va artifact superseded. |

## Task 1: Establish Open Design Baseline

**Files:**
- Read: `docs/superpowers/specs/2026-08-02-inventory-ui-completion-design.md`
- Read: `docs/design/README.md`
- Read: `docs/design/open-design-registry.md`
- Read: `docs/design/design-system.md`
- Read: `docs/design/implementation-rules.md`
- Read: `docs/product/srs/inventory.md`
- Read: `docs/architecture/modules/inventory.md`
- Read: existing `inventory-purchasing.html` and `inventory-stocktake-transfer-adjustment-workbench.html` from the local Open Design project directory.

**Consumes:** Approved inventory UI design specification.

**Produces:** Verified local project path, Core v0.7 rules and a non-mutating baseline of the two legacy inventory artifacts.

- [ ] **Step 1: Verify the project identity and local directory**

Run:

```bash
curl -fsS http://127.0.0.1:54014/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b
find "/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b" -maxdepth 1 -type f | sort
```

Expected: project name is `sale-management`; both legacy inventory files exist locally.

- [ ] **Step 2: Open both legacy inventory artifacts for comparison**

Open local files:

```text
/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-purchasing.html
/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-stocktake-transfer-adjustment-workbench.html
```

Record which visual detail can be reused and confirm that Purchasing content will not be moved into the four new artifacts.

- [ ] **Step 3: Confirm readiness gate**

Stop this task if Cenio Core v0.7 or the local project path cannot be opened. Do not substitute a screenshot or a localhost URL into a handoff.

## Task 2: Design Operations Overview

**Files:**
- Create in Open Design: `inventory-operations-overview.html`
- Create: `docs/design/screens/inventory-operations-overview.md`
- Later modify: `docs/design/open-design-registry.md`, `docs/design/ui-coverage-gap-analysis.md`

**Consumes:** `SRS-INV-001`, `SRS-INV-002`, `SRS-INV-003`, `SRS-INV-007`, `SRS-INV-008`, `SRS-INV-009`, `SRS-INV-017`; existing POS/fulfillment/return handoffs.

**Produces:** A read-first inventory workspace with no direct balance edit and explicit routes for alerts, lot/serial, reservations and trace.

- [ ] **Step 1: Create the artifact in Open Design**

Use the project `sale-management` to create `inventory-operations-overview.html` with this required content:

```text
Create a high-fidelity Cenio Core v0.7 Inventory Operations Overview for a dense B2B sales-management app. Use the shared AppShell; Branch/Warehouse is global context and must not be duplicated as a page selector. No purchasing workspace.

Ready view: compact page header with freshness metadata and icon-only refresh, plus permission-aware "Tao chung tu kho" action menu. Show four compact metrics: available, reserved, in-transit and quarantine. The main DataTable has variant, SKU, on-hand, available, reserved, in-transit, quarantine, alert status and last movement. Add search, stock-state, alert-type and tracking-mode filters; add saved view, density and column chooser controls. Use right-aligned tabular numbers.

Implement hash views #overview, #alerts, #lot-serial, #reservation and #trace. Row detail opens a sheet with stock card, movement summary, lot/serial summary, reservation source and permission-aware source drill-down. Alerts cover low stock, slow moving, near/expired lot and anomalous serial. Trace is immutable/read-only and filters date, Branch, Warehouse, variant, lot, serial, movement type and source document. Never present in-transit as sellable stock. Never allow direct balance editing.

Also model conditional #empty, #restricted and #scope-changed states outside ready view. Cost/COGS/valuation is absent when restricted. Use no native select, gradients, glass, neon, card nesting or state gallery in ready view. Verify light/dark, desktop/tablet/mobile, keyboard focus and accessible labels.
```

- [ ] **Step 2: Run visual QA**

At 1440px, 1024px and 390px in light/dark verify: table numeric alignment; metrics remain operational rather than marketing; alert row opens a scoped prefiltered view; mobile row retains variant, available, status and alert; all five ready hashes expose their intended content.

- [ ] **Step 3: Correct failed visual behavior**

For each failed condition, issue one artifact-only correction that names the exact hash, viewport and observed defect. Re-open the same viewport/state after the correction.

- [ ] **Step 4: Write the handoff after visual approval**

Create `docs/design/screens/inventory-operations-overview.md` with: `Approved` status only after user approval; project ID; artifact name; exact local file path; all eight hashes; SRS/LLD references; layout hierarchy; scope/security/cost restrictions; responsive rules; and acceptance checklist.

## Task 3: Design Adjustment and Exception Workspace

**Files:**
- Create in Open Design: `inventory-adjustment-exception.html`
- Create: `docs/design/screens/inventory-adjustment-exception.md`
- Later modify: `docs/design/open-design-registry.md`, `docs/design/ui-coverage-gap-analysis.md`

**Consumes:** `SRS-INV-004`, `SRS-INV-005`, `SRS-INV-010`, `SRS-INV-011`; LLD Inventory adjustment and opening-balance guards.

**Produces:** A document-first adjustment workspace whose forms make approval, evidence and negative stock restrictions visible.

- [ ] **Step 1: Create the artifact in Open Design**

Use the project `sale-management` to create `inventory-adjustment-exception.html` with this required content:

```text
Create a high-fidelity Cenio Core v0.7 Adjustment and Exception workspace. Use shared AppShell and global Branch/Warehouse. Present an adjustment-document list and detail workspace; desktop has a section navigator and desktop action footer, mobile uses a full-screen sheet with accessible back and submit actions.

Implement #opening-balance as a guarded wizard with Warehouse, variant, lot/serial, quantity, actual unit cost and mandatory opening record. It must show a backend preflight guard that opening balance is unavailable once movement history exists. Implement #adjustment-draft, #pending-approval, #rejected and #scrap as document states, never direct balance edits. The form includes type, reason code, note, variant, lot/serial, signed quantity, value only when applicable, source reference and attachment/evidence. Show visible labels, inline validation and an error summary only when errors exist.

Implement #negative-stock and #temporary-cost to compare requested/available, show required reason, approved exception, temporary cost and reconciliation marker. A restricted actor sees #permission-restricted and cannot assign approver client-side. Model #attachment-required and #command-processing outside ready view. Dangerous discard/cancel uses AlertDialog. Do not invent an approval transition; only render state and actions returned by backend.
```

- [ ] **Step 2: Run visual QA**

At desktop verify field sections, evidence and approval state can be scanned without scrolling horizontally. At mobile verify footer never covers the final required field. Verify a validation error is adjacent to its field and is announced; verify restricted state omits value/cost data rather than masking it.

- [ ] **Step 3: Correct failed visual behavior**

Issue one correction per observed artifact-only defect and repeat the exact failed state/viewport QA.

- [ ] **Step 4: Write the handoff after visual approval**

Create `docs/design/screens/inventory-adjustment-exception.md` with the exact local artifact path, ten hashes, document lifecycle, field/evidence rules, permission restrictions, responsive form behavior and SRS/LLD references.

## Task 4: Design Transfer and Receive Workspace

**Files:**
- Create in Open Design: `inventory-transfer-receive.html`
- Create: `docs/design/screens/inventory-transfer-receive.md`
- Later modify: `docs/design/open-design-registry.md`, `docs/design/ui-coverage-gap-analysis.md`

**Consumes:** `SRS-INV-013`, `SRS-INV-014`; LLD transfer state and in-transit accounting rules.

**Produces:** A transfer document workspace that distinguishes shipped, received and partially received stock without silently reconciling variance.

- [ ] **Step 1: Create the artifact in Open Design**

Use the project `sale-management` to create `inventory-transfer-receive.html` with this required content:

```text
Create a high-fidelity Cenio Core v0.7 Transfer and Receive workspace. Keep Branch/Warehouse scope in shared AppShell. Render a transfer list with status, source, destination, expected/received quantity, age and owner; filters include state, Warehouse and exception.

Implement #draft, #pending-approval, #approved, #pick-ship, #partially-received and #received. The create/edit document uses custom comboboxes for distinct source/destination warehouses, reason, variant lines, quantity, lot/serial allocation and evidence. Inline validate same-source-and-destination. Object detail shows a readable lifecycle, pick list, immutable shipped quantity, in-transit impact and receive table.

Implement #variance with partial receive quantity per line. Missing, excess or damaged quantities require reason, note and attachment when backend policy requires. State clearly that submit does not rebalance source and destination. #cancel-guard is available only before Shipped; after shipment show return-transfer or approved-adjustment source action only where backend permits. Include #lot-serial-required and #restricted conditional states. Use AlertDialog for destructive cancellation and do not invent approval or variance rules.
```

- [ ] **Step 2: Run visual QA**

At desktop verify source/destination, in-transit and partial quantities are simultaneously readable; at tablet verify the receive table is still operable; at mobile verify variance reason and attachment cannot be skipped or obscured. Check every lifecycle hash in light/dark.

- [ ] **Step 3: Correct failed visual behavior**

Issue one correction per observed artifact-only defect and repeat the exact failed state/viewport QA.

- [ ] **Step 4: Write the handoff after visual approval**

Create `docs/design/screens/inventory-transfer-receive.md` with the local artifact path, ten hashes, lifecycle/guard mapping, line/allocation behavior, variance/evidence rules, responsive behavior and SRS/LLD references.

## Task 5: Design Stocktake Workspace

**Files:**
- Create in Open Design: `inventory-stocktake.html`
- Create: `docs/design/screens/inventory-stocktake.md`
- Later modify: `docs/design/open-design-registry.md`, `docs/design/ui-coverage-gap-analysis.md`

**Consumes:** `SRS-INV-015`, `SRS-INV-016`; LLD snapshot and separation-of-duties rules.

**Produces:** A count workbench that separates snapshot, later movements, count variance and approval authority.

- [ ] **Step 1: Create the artifact in Open Design**

Use the project `sale-management` to create `inventory-stocktake.html` with this required content:

```text
Create a high-fidelity Cenio Core v0.7 Stocktake workspace. Use shared AppShell and global Branch/Warehouse scope. Include a stocktake list with Warehouse, scope, owner/counter, status, snapshot time, variance count and last update.

Implement #draft and #in-progress with a start form for Warehouse, product/lot/serial scope, counters and start time. Explain clearly that snapshot does not lock later sale/receipt/issue movements. Implement #count-entry as a searchable/scannable row workbench grouped by product, lot and serial where needed. Each row has system snapshot, counted input, movements after snapshot in a separate column, variance and reason. Do not let later movement appear as the stocktake variance itself.

Implement #movement-after-snapshot, #variance-reason-required, #submitted, #approval-restricted, #approved, #rejected, #cancelled, #lot-serial-count and #empty-scope. Submit requires a reason for every variance. Approval view exposes evidence and later movements. When the current actor is the counter, approval is restricted according to backend state; approved creates CountAdjustment only as backend outcome. No native select, no direct balance edit and no self-approval bypass in UI.
```

- [ ] **Step 2: Run visual QA**

At desktop verify counted input, snapshot, later movement and variance are distinguishable in one row. At tablet/mobile verify scan/search, count input, variance reason and submit CTA remain reachable. Verify approval restricted and rejected/cancelled states are distinct, and verify all twelve hashes in light/dark.

- [ ] **Step 3: Correct failed visual behavior**

Issue one correction per observed artifact-only defect and repeat the exact failed state/viewport QA.

- [ ] **Step 4: Write the handoff after visual approval**

Create `docs/design/screens/inventory-stocktake.md` with the local artifact path, twelve hashes, snapshot/count/approval hierarchy, separation-of-duties restrictions, responsive behavior and SRS/LLD references.

## Task 6: Register Approved Artifacts and Close Coverage

**Files:**
- Modify: `docs/design/open-design-registry.md`
- Modify: `docs/design/ui-coverage-gap-analysis.md`
- Modify: `docs/design/screens/inventory-purchasing.md`
- Modify: `docs/design/screens/inventory-stocktake-transfer-adjustment-workbench.md`
- Read: four new inventory handoffs.

**Consumes:** Four user-approved artifacts and handoffs from Tasks 2-5.

**Produces:** A registry with absolute file paths and complete, non-overlapping Inventory coverage.

- [ ] **Step 1: Replace localhost column with local-path contract**

Rename the registry column `Mở local` to `Đường dẫn file Open Design`. Every registry row must use its corresponding absolute path under:

```text
/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/<project-id>/<artifact>.html
```

Do not change project IDs, artifact ownership or approval state for unrelated screens.

- [ ] **Step 2: Add the four Inventory rows**

Register the four artifacts with their matching handoff files and `Approved` only after user approval. Mark legacy inventory artifacts as superseded reference, retaining their absolute local paths and excluding Purchasing from the new Inventory scope.

- [ ] **Step 3: Update coverage analysis**

Replace the single broad Inventory workbench claim with the four-artifact mapping and explicit links to POS (`INV-006`), fulfillment (`INV-007`) and return inspection (`INV-012`). Confirm every `SRS-INV-001..017` appears exactly once as an owner or a cross-artifact reference.

- [ ] **Step 4: Validate documentation**

Run:

```bash
git diff --check
rg -n '127\.0\.0\.1|http://localhost|https?://localhost' docs/design
```

Expected: no diff-check output and no localhost URL in design registry or handoffs. Any unrelated pre-existing localhost reference must be reported without editing it.

## Plan Self-Review

- Spec coverage: Task 2 covers `INV-001..003`, `007..009`, `017`; Task 3 covers `004..005`, `010..011`; Task 4 covers `013..014`; Task 5 covers `015..016`; cross-artifact links cover `006`, `007` command ownership and `012` inspection ownership.
- Placeholder check: every artifact, local path pattern, state/hash, SRS mapping, QA condition and documentation target is named explicitly.
- Consistency check: all documentation uses the local file-path convention; no task changes source code, business contracts or approved state machines.
