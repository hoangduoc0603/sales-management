# Cenio Core Design System Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing Cenio Core Design System in Open Design into a high-fidelity, polished, reusable B2B/mini-ERP design system.

**Architecture:** This plan does not change application source code. It commissions Open Design to update the existing Design System project, then audits generated files and requests a cleanup/polish pass if the result still contains weak visual artifacts.

**Tech Stack:** Open Design Desktop + Open Design MCP, HTML/CSS design artifacts, React/Tailwind/shadcn-oriented design contracts.

## Global Constraints

- Target Design System: `user:cenio-core-l-product-design-system-d-ng-chung-ch`.
- Target Open Design project: `brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209`.
- Keep `Outfit` as the only UI font.
- Do not preserve backward compatibility if old artifacts reduce visual quality.
- Do not implement application code in `web/`, `apps-script/`, or `shared/` in this plan.
- Do not copy brand, source code, asset, screenshot, marketing copy, or proprietary layout from references.
- Main implementation base remains React + TypeScript + Vite + Tailwind CSS + shadcn/ui.
- Main design references: shadcn/ui, TailAdmin React, Tailwind Plus Application UI, Tremor/Tremor Raw, SAP Fiori, React-admin, TanStack Table, Preline, Flowbite, SaaSFrame.

---

### Task 1: Open Design Preflight

**Files:**
- Read: `docs/superpowers/specs/2026-07-26-cenio-core-design-system-refinement-design.md`
- Read via Open Design MCP: `DESIGN.md`
- Read via Open Design MCP: `system/variables.css`
- Read via Open Design MCP: `system/component-catalog.html`
- Read via Open Design MCP: `system/patterns/patterns.css`

**Interfaces:**
- Consumes: Approved refinement spec.
- Produces: Confirmed target project id and current artifact baseline for the refinement run.

- [ ] **Step 1: Confirm target project exists**

Run Open Design `list_projects`.

Expected: project `brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209` exists and has designSystemId `user:cenio-core-l-product-design-system-d-ng-chung-ch`.

- [ ] **Step 2: Read current core files**

Read these Open Design files from the target project:

```text
DESIGN.md
system/variables.css
system/component-catalog.html
system/patterns/patterns.css
```

Expected: current files are readable and confirm existing Outfit-based but visually flat foundation.

- [ ] **Step 3: Confirm execution mode**

Use Open Design Agent through `start_run`, not manual direct file rewrites, because the required output is a generated/refined design system with coordinated visual artifacts.

Expected: ready to start a refinement run against the existing Design System project.

### Task 2: Commission Open Design Refinement Run

**Files:**
- Modify via Open Design Agent: `DESIGN.md`
- Modify via Open Design Agent: `system/variables.css`
- Modify via Open Design Agent: `system/tokens.default.json`
- Modify via Open Design Agent: `system/tokens.dark.json`
- Modify via Open Design Agent: `system/component-catalog.html`
- Modify via Open Design Agent: `system/page-patterns.html`
- Modify via Open Design Agent: `system/patterns/*`

**Interfaces:**
- Consumes: Execution prompt from approved spec section 8.
- Produces: Updated Open Design System artifacts.

- [ ] **Step 1: Start refinement run**

Call Open Design `start_run` on project `brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209` with the execution prompt from the approved spec.

Expected: Open Design returns a `runId`.

- [ ] **Step 2: Poll until terminal status**

Poll Open Design `get_run` every 30-60 seconds until status is `succeeded`, `failed`, or `canceled`.

Expected: status becomes `succeeded`; if failed, capture the error and stop for diagnosis.

- [ ] **Step 3: Record generated preview**

If the run succeeds, capture `previewUrl` and the agent message.

Expected: preview is available or agent message explains output files.

### Task 3: Audit Refined Design System

**Files:**
- Read via Open Design MCP: `DESIGN.md`
- Read via Open Design MCP: `system/variables.css`
- Read via Open Design MCP: `system/component-catalog.html`
- Read via Open Design MCP: `system/page-patterns.html`
- Read via Open Design MCP: relevant `system/patterns/*`

**Interfaces:**
- Consumes: Updated Open Design artifacts from Task 2.
- Produces: Audit result: pass, needs polish pass, or failed.

- [ ] **Step 1: Verify foundation**

Check that:

```text
Outfit remains the UI font.
Primary and gray scales exist.
surface-subtle, surface-raised, surface-elevated, surface-inset exist.
table-head, row-hover, row-selected exist.
focus-ring and shadow-xs/sm/md exist.
```

Expected: all foundation requirements are present.

- [ ] **Step 2: Verify component coverage**

Search/read catalog for:

```text
Button, IconButton, Input, Select, Combobox, MultiSelect, DatePicker, DateRangePicker,
CurrencyInput, Checkbox, Radio, Switch, FileUpload, DropdownMenu, Popover,
CommandPalette, Dialog, AlertDialog, Sheet, Toast, InlineAlert, EmptyState,
NoResultsState, ErrorState, PermissionState, DataTable, TableToolbar, FilterBar,
SavedView, ColumnChooser, BulkActionBar, MetricCard, ChartContainer
```

Expected: all required components are present with visual specimen/state guidance.

- [ ] **Step 3: Verify no native select in main patterns**

Search main pattern files for native `<select>`.

Expected: no native `<select>` in primary visual examples, except an explicit fallback note if Open Design generated one intentionally.

- [ ] **Step 4: Verify page patterns**

Read or inspect:

```text
AppShell
Dashboard
List/Report
Object Detail
Create/Edit Form
Settings/Admin
State Gallery
```

Expected: patterns use upgraded tokens, richer visual hierarchy, and B2B/ERP-focused composition.

- [ ] **Step 5: Decide audit outcome**

If all checks pass, mark refinement accepted. If there are small visual inconsistencies or old artifacts remain, run Task 4. If core files are missing or the run failed, stop and report the blocker.

### Task 4: Optional Polish/Cleanup Pass

**Files:**
- Modify via Open Design Agent: files identified as weak by Task 3.

**Interfaces:**
- Consumes: Specific audit findings from Task 3.
- Produces: Cleaner final Design System.

- [ ] **Step 1: Build targeted polish prompt**

Write a concise prompt naming each failed audit item exactly, for example:

```text
Fix these remaining issues in the Cenio Core Design System:
1. Replace native select examples in system/patterns/dashboard.html and list-report.html with custom Select trigger/content specimens.
2. Add missing row-selected and table-head tokens to variables.css.
3. Make Dashboard KPI cards visually stronger with surface-raised, subtle icon container, and clearer comparison text.
4. Remove or restyle artifacts that still use generic white card/border-only treatment.
Do not change the approved visual direction or font.
```

Expected: prompt is specific to actual audit findings, not generic.

- [ ] **Step 2: Start polish run**

Call Open Design `start_run` on the same project with the targeted polish prompt.

Expected: Open Design returns a `runId`.

- [ ] **Step 3: Poll until terminal status**

Poll Open Design `get_run` every 30-60 seconds until terminal status.

Expected: status becomes `succeeded`; if failed, report the exact error.

- [ ] **Step 4: Re-run audit checks**

Repeat Task 3 checks for only the failed areas.

Expected: no remaining blocking issues.

### Task 5: Final Handoff

**Files:**
- Read via Open Design MCP: final changed core files as needed for summary.

**Interfaces:**
- Consumes: Accepted audit outcome.
- Produces: User-facing summary and next recommended action.

- [ ] **Step 1: Summarize result**

Report:

```text
Run status
Preview URL if available
Files/artifacts changed at a high level
Audit pass/fail result
Any remaining risks
```

Expected: user knows whether the refined Design System is ready to use.

- [ ] **Step 2: Recommend next use**

Recommend creating a new Sales Management screen prototype using the refined Design System before coding UI.

Expected: next step is design validation, not immediate app code implementation.

