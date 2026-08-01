# Cenio TailAdmin-Inspired Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Cenio Core v0.7 and the Sales Dashboard and POS Checkout benchmark artifacts in Open Design so their visual quality approaches TailAdmin React while preserving Cenio branding and all approved business contracts.

**Architecture:** Open Design is the only implementation surface. Rebuild reusable Cenio Core first, then make `app-shell-dashboard.html` and `app-pos-checkout.html` consume it. Update registry and handoff documents only after preview review and explicit user approval.

**Tech Stack:** Open Design Desktop/MCP, Cenio Core, React + TypeScript + Vite + Tailwind CSS + shadcn/ui as the later implementation target, TailAdmin React as a visual-quality reference only.

## Global Constraints

- Use TailAdmin React only to study visual quality; never copy its source, screenshot, asset, copy, trademark or a concrete page layout.
- Do not modify React source, SRS, LLD, ADR, schema, data dictionary, permission, state machine, source of truth, idempotency or POS performance policy.
- Keep Cenio branding and create a TailAdmin-adjacent design system, not a TailAdmin clone.
- Preserve Branch/Warehouse scope, sensitive-data restrictions, archive/stale/retry handling and command-in-progress behavior.
- Use Outfit, tabular figures for business values, custom select/listbox patterns, semantic status with icon plus copy, 8px controls and 12px containers.
- Do not use native select, gradient, glassmorphism, neon, heavy outline, KPI top-accent strip, priority rail or mono font for business values.
- Review every changed artifact at desktop, tablet and mobile widths in light and dark themes before marking it approved.

---

## File and Artifact Map

| Location | Responsibility |
| --- | --- |
| Open Design Core `brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209` | Canonical v0.7 token, component and page-pattern source. |
| Core `DESIGN.md`, `system/variables*.css`, `system/tokens.*.json` | Brand rules and canonical light/dark tokens. |
| Core `system/component-catalog.html`, `system/patterns/` | Executable component and page specimens. |
| Open Design Sales `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | Sales Management design consumers. |
| Sales `app-shell-dashboard.html` | Sales Dashboard benchmark. |
| Sales `app-pos-checkout.html` | POS Checkout benchmark. |
| `docs/design/open-design-registry.md` | Approved artifact/version references. |
| `docs/design/design-system.md` | Cenio Core version and global visual rules. |
| `docs/design/screens/sales-dashboard.md` | Dashboard handoff. |
| `docs/design/screens/pos-checkout.md` | POS handoff. |

### Task 1: Audit Current Open Design Artifacts

**Files:**
- Read: `docs/product/ui-reference-research.md`
- Read: `docs/design/open-design-registry.md`
- Read: `docs/design/design-system.md`
- Read: `docs/design/implementation-rules.md`
- Read: `docs/design/screens/sales-dashboard.md`
- Read: `docs/design/screens/pos-checkout.md`
- Read: Core `DESIGN.md`, token files, component catalog and AppShell/Dashboard patterns.
- Read: Sales `app-shell-dashboard.html` and `app-pos-checkout.html`.

**Consumes:** The approved redesign spec at `docs/superpowers/specs/2026-08-01-cenio-tailadmin-inspired-redesign-design.md`.

**Produces:** A read-only baseline of the exact current artifact revisions and a defect list used for corrective design runs.

- [ ] **Step 1: Verify project identities**

Call `mcp__open_design__get_project` for exact projects `brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209` and `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`. Stop if either resolves to an unexpected project.

- [ ] **Step 2: Pull complete artifacts**

Call `mcp__open_design__get_artifact` with `include: "all"` for Core. Call it with `entry: "app-shell-dashboard.html"` and `entry: "app-pos-checkout.html"` for the Sales project. Record returned artifact identity and mtime before mutation.

- [ ] **Step 3: Verify baseline defects visually**

Open the existing Core catalog, Dashboard and POS at 1440px, 1024px and 390px in both themes. Record only observable failures from this list: heavy surface treatments; active navigation with excessive signals; incomplete component states; Dashboard equal-weight panels/state gallery/priority rail; weak POS scan-to-payment hierarchy; Outfit or tabular-number failures.

- [ ] **Step 4: Review gate**

No repository files are changed in this task. Proceed only when the Core and two consumer artifacts are available for inspection.

### Task 2: Rebuild Cenio Core v0.7

**Files:**
- Modify in Open Design Core: `DESIGN.md`, `system/variables.css`, `system/variables.dark.css`, `system/tokens.default.json`, `system/tokens.dark.json`.
- Modify in Open Design Core: `system/component-catalog.html`, `system/page-patterns.html`, `system/patterns/app-shell.html`, `system/patterns/dashboard.html`, `system/patterns/patterns.css`.
- Later modify: `docs/design/design-system.md`, `docs/design/open-design-registry.md`.

**Consumes:** Task 1 baseline and sections 2-3 of the approved redesign spec.

**Produces:** A v0.7 Core whose canonical `--cn-*` tokens and rendered specimens can be consumed without local visual tokens.

- [ ] **Step 1: Commission one Core-only Open Design run**

Call `mcp__open_design__start_run` for Core with this prompt:

```text
Rebuild the existing Cenio Core design system as v0.7. Preserve Cenio as an independent brand and use TailAdmin React only as a quality reference; do not copy TailAdmin code, assets, text, trademark or a concrete layout. Change only the current Design System project, not Sales Management artifacts or repository source.

Create a polished data-dense admin SaaS system: cool neutral canvas, white surfaces, multi-level subtle borders/elevation, Cenio indigo primary, blue/teal operational accents, semantic status colors, Outfit with tabular figures, 8px controls and 12px containers. Light and dark themes must be complete and accessible.

Rebuild executable specimens for AppShell/sidebar/topbar; buttons/icon buttons; inputs/textareas; Select/Combobox/MultiSelect/date range; checkbox/radio/segmented/tabs; badges, avatar, toast, tooltip, dropdown, dialog and drawer; DataTable compact/comfortable with filters, pagination and bulk action; MetricCard, Panel variants, charts, attention lists and loading/empty/error/restricted states. Show hover, focus-visible, disabled and loading state when relevant.

Use canonical --cn-* semantic tokens in DESIGN.md, CSS and JSON. Do not use native select, gradients, glassmorphism, neon, heavy outlines, rails, KPI accent strips or mono typography for business data. Sidebar active state is a restrained tint plus primary icon/text, not a rail/border/dense-fill combination. Return a component-to-token mapping and rendered verification checklist.
```

- [ ] **Step 2: Poll the Core run**

Call `mcp__open_design__get_run` every 30-60 seconds using the returned `runId` until it is `succeeded`, `failed` or `canceled`. Do not cancel a running design job unless the user requests it.

- [ ] **Step 3: Inspect token and component deliverables**

Use `mcp__open_design__get_artifact` with Core `entry: "DESIGN.md"`, `include: "all"`. Confirm: v0.7 and Outfit are declared; light/dark files contain `--cn-canvas`, `--cn-surface`, `--cn-border`, `--cn-primary`, semantic statuses, radius and layered shadows; catalog is rendered rather than contract-only; AppShell covers selected/focus/collapsed states.

- [ ] **Step 4: Run Core visual QA**

Open `system/component-catalog.html`, `system/patterns/app-shell.html` and `system/patterns/dashboard.html` at 1440px, 1024px and 390px in light/dark. Pass only if type, focus, selected nav, table density, overlay elevation and semantic contrast are clear and prohibited treatments are absent.

- [ ] **Step 5: Repair any Core failure**

If Step 3 or 4 fails, commission one Core-only correction with this prompt:

```text
Repair Cenio Core v0.7 only against the exact failed QA findings in this run. Do not touch Sales Management consumer artifacts. Preserve Cenio branding, light/dark semantics, Outfit, 8px controls, 12px containers and the prohibition on native select, gradients, glass, neon, rails, KPI accent strips and mono business typography.
```

Re-poll and repeat Steps 3-4.

- [ ] **Step 6: Obtain user approval before documentation mutation**

Present the complete Core preview to the user. Only after approval update `docs/design/design-system.md` and `docs/design/open-design-registry.md` to v0.7, run `git diff --check`, and commit with `docs(design): approve Cenio Core v0.7`.

### Task 3: Redesign Sales Dashboard

**Files:**
- Modify in Open Design Sales project: `app-shell-dashboard.html` and its directly imported local files.
- Later modify: `docs/design/screens/sales-dashboard.md`, `docs/design/open-design-registry.md`.

**Consumes:** User-approved Core v0.7; approved Dashboard SRS/LLD constraints; specification section 4.

**Produces:** A responsive, permission-aware command-center artifact with strong chart/queue hierarchy.

- [ ] **Step 1: Commission a Dashboard-only Open Design run**

Call `mcp__open_design__start_run` with Sales project and this prompt:

```text
Redesign only app-shell-dashboard.html as the Cenio Sales Dashboard consumer benchmark for approved Cenio Core v0.7. Do not modify app-pos-checkout.html, repository source, SRS, LLD, permission, scope, state machine or data contract. Preserve Cenio branding and use TailAdmin React only as a quality reference, never as a source to copy.

Use the Core v0.7 AppShell. Global Branch/Warehouse stays in the shell. The header contains title, compact generatedAt/asOf, custom date range and refresh. The first row has exactly four KPI cards: net revenue, completed orders, collected amount and receivables/overdue. Each has an icon tile, one primary value, contextual delta and drill-down; no accent strip or custom border.

Create a decision area with a wide current-vs-prior revenue chart on the left and an action queue on the right. Current is Cenio primary, prior is teal; use subtle gridlines, adjacent legend, text summary and report drill-down. Queue items have semantic icon, title, reason, quantity/value, age/deadline, source module and CTA. No colored vertical rail.

Below render manual orders needing action, then visually subordinate follow-up. Do not show a state gallery in ready state. Preserve loading, empty, error, restricted, invalid scope, stale/archive/retry and command-in-progress states. At tablet stack chart and queue; at mobile prioritize queue, KPI and navigable orders. Use only Core v0.7 tokens and no native select, gradient, glass, neon, heavy outline or mono business typography.
```

- [ ] **Step 2: Poll and retrieve Dashboard**

Poll `mcp__open_design__get_run` every 30-60 seconds. On success pull `app-shell-dashboard.html` with `mcp__open_design__get_artifact` and `include: "auto"`.

- [ ] **Step 3: Verify Desktop Dashboard**

At 1440px verify exactly four primary KPI cards are visible before the decision area; the chart is wider than follow-up; queue items have icon, reason, metadata and CTA without a rail; manual orders omit Draft/Rejected/Cancelled; ready view has no state gallery; scope, freshness and restricted states remain explicit when invoked.

- [ ] **Step 4: Verify responsive Dashboard**

At 1024px, chart and queue must stack without clipping. At 390px, queue must precede wide order content and status/metadata must stay reachable. In dark mode status, charts, inputs, selected nav and focus-visible must be legible.

- [ ] **Step 5: Repair any Dashboard failure**

If Step 3 or 4 fails, start a Sales-project run with:

```text
Repair only app-shell-dashboard.html against the exact failed QA finding in this run. Preserve Core v0.7, dashboard hierarchy, all scope/permission/state contracts and Cenio branding. Remove clutter instead of adding decorative cards or badges. Do not change POS or business requirements.
```

Re-poll and rerun Steps 3-4.

- [ ] **Step 6: Obtain user approval before Dashboard handoff update**

After preview approval, update the Dashboard handoff to Cenio Core v0.7 and its new behavior, update its registry row, run `git diff --check`, then commit the documentation using `docs(design): approve Cenio v0.7 dashboard`.

### Task 4: Redesign POS Checkout

**Files:**
- Modify in Open Design Sales project: `app-pos-checkout.html` and its directly imported local files.
- Later modify: `docs/design/screens/pos-checkout.md`, `docs/design/open-design-registry.md`.

**Consumes:** User-approved Core v0.7; approved POS SRS/LLD/ADR constraints; specification section 5.

**Produces:** A responsive scan-to-payment artifact with hierarchy for high-speed checkout and recovery.

- [ ] **Step 1: Commission a POS-only Open Design run**

Call `mcp__open_design__start_run` with Sales project and this prompt:

```text
Redesign only app-pos-checkout.html as the POS Checkout consumer benchmark for approved Cenio Core v0.7. Do not alter app-shell-dashboard.html, repository source, SRS, LLD, ADR, permission, Branch/Warehouse scope, command idempotency, explicit draft-save behavior or POS cache performance policy. Preserve Cenio branding. Use TailAdmin React only as a quality reference; do not copy source, assets, copy or exact layouts.

Use shared Core AppShell, not a POS header. Create desktop-first two columns: scan/search and basket left; sticky checkout right. Scan/search is primary with scanner affordance and clear focus. Results are compact and show variant, SKU/barcode, price and reference stock.

Basket rows are compact but touch-friendly with tabular quantity, price, discount and total. Batch/serial, promotion and price overrides open contextual panels. Checkout prioritizes amount due, tender, received and change/receivable, keeping completion continuously available. Save draft, open draft and cancel basket are subordinate.

Show inline treatment for insufficient stock, required lot/serial, price/promotion conflict and permission validation; preserve basket on timeout/idempotency recovery. Include empty basket, missing/open-shift, no-result/multiple-result and receipt snapshot states. At tablet/mobile preserve scan, basket, total, tender and completion CTA. Use Core v0.7 tokens only; no native select, gradients, glass, neon, heavy outlines or mono business typography.
```

- [ ] **Step 2: Poll and retrieve POS**

Poll `mcp__open_design__get_run` every 30-60 seconds. On success pull `app-pos-checkout.html` with `mcp__open_design__get_artifact` and `include: "auto"`.

- [ ] **Step 3: Verify Desktop POS**

At 1440px verify the shared AppShell has no duplicate POS header; scan/search is the first visual entry; basket rows align quantity/unit price/discount/total; checkout remains sticky and prioritizes due/completion; draft/open/cancel are secondary; inline validation preserves the basket.

- [ ] **Step 4: Verify responsive POS**

At 1024px and 390px verify scan, basket, total, tender and completion remain reachable without clipping. In both themes verify search, active product, tender selection, disabled checkout, error copy and focus-visible contrast. Verify all recovery states listed in Step 1 have a discoverable artifact representation.

- [ ] **Step 5: Repair any POS failure**

If Step 3 or 4 fails, start a Sales-project run with:

```text
Repair only app-pos-checkout.html against the exact failed QA finding in this run. Preserve Core v0.7, shared AppShell, scan-to-payment hierarchy, all POS transaction/recovery contracts and Cenio branding. Do not alter Dashboard or introduce decorative UI that competes with checkout completion.
```

Re-poll and rerun Steps 3-4.

- [ ] **Step 6: Obtain user approval before POS handoff update**

After preview approval, update the POS handoff to Cenio Core v0.7 and its new behavior, update its registry row, run `git diff --check`, then commit documentation using `docs(design): approve Cenio v0.7 POS`.

### Task 5: Final Cross-Artifact Review and Documentation Gate

**Files:**
- Modify: `docs/design/design-system.md`
- Modify: `docs/design/open-design-registry.md`
- Modify: `docs/design/screens/sales-dashboard.md`
- Modify: `docs/design/screens/pos-checkout.md`
- Read: `docs/design/README.md`, `docs/design/implementation-rules.md`.

**Consumes:** The user-approved Core, Dashboard and POS outputs from Tasks 2-4.

**Produces:** Consistent approved registry and handoffs for later code agents.

- [ ] **Step 1: Confirm artifact and documentation alignment**

Verify the Design System document says v0.7. Verify Dashboard and POS handoffs use their exact existing Open Design project and artifact names and retain `Approved` only after user preview approval.

- [ ] **Step 2: Run final visual matrix**

| Artifact | 1440px light/dark | 1024px light/dark | 390px light/dark |
| --- | --- | --- | --- |
| Core catalog/AppShell | type, hierarchy, focus, semantic contrast | collapse and table density | navigation and control fit |
| Dashboard | four KPI and chart/queue hierarchy | decision area stack | queue, KPI and orders reachable |
| POS | scan/basket/checkout hierarchy | sticky checkout usable | scan, total and CTA reachable |

- [ ] **Step 3: Confirm contract guardrails**

Verify Dashboard retains scope, generatedAt/asOf, restricted data, archive/stale/retry and no priority rail. Verify POS retains shared AppShell, explicit draft actions, cache-first item interactions, idempotent checkout recovery and separate receipt/reprint semantics.

- [ ] **Step 4: Validate repository documentation**

Run:

```bash
git diff --check
npm run lint
```

Expected: no `git diff --check` output and `npm run lint` exits 0.

- [ ] **Step 5: Commit final approved documentation**

Run:

```bash
git add docs/design/design-system.md docs/design/open-design-registry.md docs/design/screens/sales-dashboard.md docs/design/screens/pos-checkout.md
git commit -m "docs(design): approve Cenio v0.7 consumer benchmarks"
```

## Plan Self-Review

- Spec coverage: Task 2 implements Core v0.7; Task 3 implements Dashboard; Task 4 implements POS; Task 5 verifies all themes, breakpoints, contracts and documentation.
- No-placeholder check: project IDs, artifact names, design prompts, repair prompts, visual checks and documentation updates are explicit.
- Consistency check: both consumer artifacts wait for Core v0.7; every registry/handoff update waits for user approval; no task changes production source or business contracts.

