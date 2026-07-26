# Sales Dashboard Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the existing Open Design Sales Dashboard into a permission-aware operational command center using Cenio Core v0.5.

**Architecture:** The only consumer artifact changes are within the Open Design project `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`, whose primary artifact is `app-shell-dashboard.html`. One Open Design Agent run will replace the dashboard visual/interaction prototype while importing a one-to-one bridge to Cenio Core `--cn-*` tokens. A post-run audit verifies SRS-shaped content, custom controls, accessibility contracts and absence of consumer-local visual foundations.

**Tech Stack:** Open Design Desktop/MCP; Cenio Core v0.5; React + TypeScript + Vite + Tailwind + shadcn/ui as the later implementation target. This task changes no React source code.

## Global Constraints

- Target only project `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` and `app-shell-dashboard.html`; never modify Cenio Core, SRS, LLD, schema or application source code.
- Follow `docs/superpowers/specs/2026-07-26-sales-dashboard-command-center-design.md` exactly.
- Use Cenio Core v0.5 semantic `--cn-*` tokens or a documented one-to-one bridge. Do not add consumer-local palette, font, radius, shadow or spacing foundations.
- Use Outfit, tabular numerals for financial/operational values, 8px controls and 12px containers.
- Use custom shadcn/Radix-style Select visual; native `<select>` is prohibited as the main visual control.
- Respect scope/permission/data semantics: data is projection-based, filtered by Branch/Warehouse/time, timestamped, drill-down authorized, and sensitive margin/COGS is restricted rather than masked.
- No Git commit is possible because this workspace is not a Git repository; record verification evidence in this plan/run result instead.

---

### Task 1: Capture the existing consumer baseline and contracts

**Files:**
- Read (Open Design): `sale-management/app-shell-dashboard.html`
- Read (Open Design): Cenio Core `DESIGN.md`, `system/variables.css`, `system/component-catalog.html`, `system/patterns/dashboard.html`, `system/patterns/app-shell.html`
- Reference: `docs/superpowers/specs/2026-07-26-sales-dashboard-command-center-design.md`

**Interfaces:**
- Consumes: approved dashboard spec and Cenio Core v0.5.
- Produces: exact project identity, a pre-redesign artifact snapshot and verification assertions for Task 3.

- [x] **Step 1: Confirm the target is the existing Sales prototype**

Call Open Design `list_files({ project: "7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b" })`.

Expected: `app-shell-dashboard.html` is present and primary; do not operate on Design System project `brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209`.

- [x] **Step 2: Record the component mapping that the artifact must use**

Read the five Core files listed above and record these mandatory mappings:

```text
App shell → AppShell + --cn-canvas / --cn-active-nav-bg
Header/filter → PageHeader + custom Select + Button/IconButton
KPI → MetricCard + StatusBadge + cn-tabular
Trend → ChartContainer + ChartLegend + --cn-chart-1/--cn-chart-2
Action queue → AttentionList/PriorityQueue
Orders → DataTable/List + row state tokens
Restricted/loading/error → State gallery contract
```

Expected: all dashboard sections can be composed from an existing Cenio primitive or pattern.

- [x] **Step 3: Capture a visual baseline**

Open/export the existing `app-shell-dashboard.html` preview at desktop width before the redesign run.

Expected: visual comparison is possible after Task 3; this step makes no changes.

### Task 2: Redesign the Open Design dashboard

**Files:**
- Modify (Open Design Agent): `app-shell-dashboard.html`
- Modify only if necessary (Open Design Agent): `brand-spec.md` as a short consumer handoff note; do not create unrelated artifacts.

**Interfaces:**
- Consumes: approved dashboard spec and Cenio Core mappings from Task 1.
- Produces: an interactive, desktop-first Sales Dashboard prototype with named Cenio mapping and visible states.

- [x] **Step 1: Start exactly one Open Design Agent run**

Call `start_run` with project `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`, selected Design System `user:cenio-core-l-product-design-system-d-ng-chung-ch`, agent `codex`, model `gpt-5.6-terra`, and this prompt:

```text
Redesign only the existing Sales Dashboard prototype (`app-shell-dashboard.html`) as the approved Cenio Sales Command Center for a Branch/Regional Manager. Use the project’s selected Cenio Core v0.5 design system. Do not modify the Cenio Core project, application source code, SRS, LLD or data model. Do not create a parallel dashboard artifact.

Read the current artifact and Cenio Core DESIGN.md, variables, component catalog, AppShell and Dashboard patterns before editing. Use --cn-* tokens directly or a clearly documented 1:1 bridge only. Never create a local palette/font/radius/shadow/spacing system. Use Outfit; business values use tabular figures, never monospace. Keep the screen Vietnamese.

Build a polished, soft but data-dense operational command center:
- AppShell owns workspace, global Branch and Warehouse scope, notification and user menu. Do not repeat Branch/Warehouse in the page header.
- PageHeader contains breadcrumb, “Tổng quan vận hành”, generated-at/data state, a page-level date-range custom Select, and Refresh. State must make it clear data is ready, loading, stale or failed.
- First content row has at most four primary MetricCards: Doanh thu thuần, Đơn hoàn tất, Đã thu, Phải thu/quá hạn. Each has a 44px icon tile, label, tabular value, non-color-only delta/status, supporting copy and a visible drill-down affordance. Do not combine unrelated numbers with '/'.
- Below it, use a two-column decision area: revenue trend vs prior period (indigo current + teal dashed prior, quiet grid, legend, text summary and tooltip/data-table contract) plus a prioritised action queue for low/expiring stock, online orders waiting, and open shift discrepancy. Each queue item states reason, age/deadline, scope/module and drill-down CTA.
- Include a compact data-rich “Đơn online cần xử lý” list/table with order/source, customer, age, status, value and action. Place secondary return/credit/shift follow-up only where it does not compete with primary actions.
- Sensitive COGS/profit must use a clear restricted/unavailable state; never display blurred or invented numbers. Include loading, empty, error and retry recovery examples or a state panel consistent with Cenio Core.
- Keep custom shadcn/Radix-style Select/listbox behavior and semantic focus/ARIA. Icon-only buttons have aria-labels. Status must combine icon/text, not color only. Keep responsive behavior documented: collapse navigation, stack decision area and retain essential state/action on mobile.
- Visual quality: cool neutral canvas, white surfaces, light borders, Cenio indigo #465FFF and teal operational accent, 8px controls, 12px containers, subtle elevation; no gradient, glass, neon, heavy outlines, heavy rail, heavy shadow or TailAdmin copying.

At handoff, report component-to-Cenio mappings, modified artifacts and a preview URL.
```

Expected: a single run ID tied to the Sales prototype, with no modification request aimed at the Cenio Core project.

- [x] **Step 2: Wait for the existing run without replacing it**

Call `get_run(runId)` every 30–60 seconds until it is `succeeded`, `failed` or `canceled`.

Expected: terminal status `succeeded`. If it fails, preserve its full error and stop; do not manually rewrite the generated HTML as a substitute.

- [x] **Step 3: Record generated output**

Call `list_files` and `get_artifact({ project: "7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b" })` after success.

Expected: primary artifact remains `app-shell-dashboard.html`, and the run returns a preview URL plus a component mapping summary.

### Task 3: Audit the redesigned prototype

**Files:**
- Read/Search (Open Design): `app-shell-dashboard.html`, optional `brand-spec.md`
- Inspect (Open Design preview): `app-shell-dashboard.html`

**Interfaces:**
- Consumes: Task 2 generated artifact.
- Produces: pass/fail evidence for the visual, semantic, interaction and handoff acceptance criteria.

- [x] **Step 1: Run mechanical contract checks**

Search the primary artifact for these assertions:

```text
Outfit or --cn-font-sans; tabular-nums or cn-tabular;
--cn-canvas, --cn-primary, --cn-accent, --cn-radius-control, --cn-radius-container;
custom Select/listbox trigger/content/items; aria-label; focus-visible;
loading; empty; error; retry; restricted or unavailable;
MetricCard/KPI equivalents; trend/chart; action queue; online order list.
```

Also search for forbidden visual foundations:

```text
<select; ui-monospace; font-family: monospace; local --brand-/--cenio-/--bg-/--radius-/--shadow- declarations; linear-gradient; glass/backdrop-filter.
```

Expected: required signals are present; prohibited signals are absent except a clearly documented one-to-one `--cn-*` bridge if an external import cannot be resolved in the Open Design project.

- [x] **Step 2: Inspect the preview at desktop and narrow layouts**

Use the Open Design preview/render at desktop and narrow widths. Evaluate:

```text
four or fewer primary KPIs; hierarchy and soft rhythm match Cenio Core;
global scope is not duplicated; values are readable and tabular;
action queue is more prominent than secondary analytics;
line chart distinguishes periods without color-only meaning;
data state/asOf is visible; restricted content is truthful;
sidebar/control density remains operational and responsive.
```

Expected: every criterion passes, with no source-code modification.

- [x] **Step 3: Decide whether a polish run is needed**

If all Task 3 checks pass, accept the artifact. If a clear visual or contract defect remains, write one artifact-specific follow-up prompt and run one additional Open Design Agent pass; do not make manual HTML edits.

### Task 4: Create durable handoff

**Files:**
- Modify only if Task 2 did not already update it (Open Design): `brand-spec.md`
- Reference: `docs/superpowers/specs/2026-07-26-sales-dashboard-command-center-design.md`

**Interfaces:**
- Consumes: accepted artifact and audit evidence.
- Produces: a concise next-session instruction preserving visual and semantic decisions.

- [x] **Step 1: Ensure project handoff records the canonical rules**

Verify `brand-spec.md` states that this dashboard is the approved consumer benchmark, identifies Cenio Core v0.5 as the source of truth, and requires future screens to use `--cn-*`, custom Select, Outfit/tabular values, 8px/12px radius and component-to-Cenio mapping.

Expected: an independent Codex session can read the Open Design project and continue the same visual language.

- [x] **Step 2: Report the completed redesign**

Return: run status, clickable preview URL, changes, audit evidence, no-source-code statement, and an exact handoff prompt for the prior session.

Expected: user can resume other UI screen design in another session without losing decisions.
