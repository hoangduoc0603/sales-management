# Cenio Core v0.5 Visual Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tinh chỉnh Cenio Core trên Open Design thành một soft-enterprise design system có visual hierarchy mềm mại hơn, đồng thời thiết lập token adoption contract cho các design project tiếp theo.

**Architecture:** Open Design Agent cập nhật đồng bộ DESIGN.md, token CSS/JSON, component specimens và page patterns trong project Design System. Không sửa source code ứng dụng hoặc Sales Dashboard prototype trong lần chạy này; dashboard chỉ được dùng làm tiêu chí consumer test ở bước kế tiếp.

**Tech Stack:** Open Design Desktop + Open Design MCP; HTML/CSS/JSON design artifacts; React + TypeScript + Vite + Tailwind CSS + shadcn/ui là implementation target.

## Global Constraints

- Target Design System: `user:cenio-core-l-product-design-system-d-ng-chung-ch`.
- Target project: `brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209`.
- Không sửa project `sale-management` (`7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`) trong plan này.
- Không sao chép source, asset, screenshot, copy, brand hoặc layout độc quyền từ TailAdmin hay reference khác.
- Giữ shadcn/ui/Radix là component base và giữ semantic token của Cenio Core là nguồn duy nhất.
- Mọi UI font là Outfit; mono chỉ dùng cho Kbd/code/technical identifier có lý do.
- Không dùng native `<select>` làm visual control chính.
- Không thay đổi requirement, state machine, permission hoặc nghiệp vụ Sales Management.
- Workspace hiện không có Git repository; không tạo commit.

---

### Task 1: Preflight và snapshot audit

**Files:**
- Read (Open Design): `DESIGN.md`
- Read (Open Design): `system/variables.css`, `system/variables.dark.css`
- Read (Open Design): `system/patterns/patterns.css`
- Read (Open Design): `system/component-catalog.html`, `system/patterns/dashboard.html`, `system/patterns/app-shell.html`

**Interfaces:**
- Consumes: spec `docs/superpowers/specs/2026-07-26-cenio-core-visual-calibration-design.md`.
- Produces: baseline artifact list và các assertion để kiểm tra sau run.

- [ ] **Step 1: Xác nhận đúng project Design System**

Call Open Design `list_projects` and match exact project ID `brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209` and designSystemId `user:cenio-core-l-product-design-system-d-ng-chung-ch`.

Expected: project exists; do not use `sale-management` prototype as target.

- [ ] **Step 2: Ghi nhận foundation hiện tại**

Call Open Design `get_file` for `DESIGN.md`, `system/variables.css`, `system/variables.dark.css` and `system/patterns/patterns.css`.

Expected: capture current `--cn-*` conventions, dark token mapping, radius, shadow, font, density and component CSS before calibration.

- [ ] **Step 3: Ghi nhận visual baseline**

Open `system/patterns/dashboard.html` and `system/patterns/app-shell.html`, then export or inspect a preview screenshot.

Expected: baseline is available for visual comparison; no generated content is changed in this task.

### Task 2: Commission Visual Calibration run

**Files:**
- Modify (Open Design Agent): `DESIGN.md`
- Modify (Open Design Agent): `system/variables.css`, `system/variables.dark.css`, `system/tokens.default.json`, `system/tokens.dark.json`
- Modify (Open Design Agent): `system/patterns/patterns.css`
- Modify (Open Design Agent): `system/component-catalog.html`, `system/page-patterns.html`
- Modify (Open Design Agent): `system/patterns/app-shell.html`, `system/patterns/dashboard.html`
- Modify (Open Design Agent): `system/kit.html`, `system/kit.dark.html`, `brand.html`
- Modify if necessary (Open Design Agent): `system/scripts/refine-cenio-core.mjs`

**Interfaces:**
- Consumes: v0.5 approved spec and existing Cenio Core artifacts.
- Produces: cohesive Cenio Core v0.5 visual system and rendered pattern specimens.

- [ ] **Step 1: Start exactly one Open Design Agent run**

Call `list_agents`, then `start_run` with an available agent and this prompt:

```text
Refine the existing Cenio Core Design System to v0.5 — Visual Calibration. Work only in this Design System project; do not touch the Sales Management prototype.

You must preserve Cenio as its own design system. Use TailAdmin only as a quality reference for soft enterprise visual rhythm; never copy TailAdmin source, screenshot, brand, asset, copy or proprietary layout.

Read and follow the current DESIGN.md, system/variables.css, component catalog and page patterns first. Update all affected artifacts coherently, including the reproducible generation script if it produces the artifacts.

Foundation requirements:
- Keep Outfit as the only UI font and load it with display=swap. Use weights 400/500/600/700 only.
- Financial, KPI, table and time values use Outfit with font-variant-numeric: tabular-nums. Do not use a mono font for business values; mono is only for Kbd/code/technical identifiers.
- Shift the light canvas to a clean cool neutral near #F8FAFC. Keep white surfaces. Make default border and divider materially lighter than today, close to a gray-200 relationship; preserve WCAG contrast for text and focus.
- Calibrate primary to a brighter modern Cenio indigo in the #465FFF–#4B5FD4 family. Add complete tint/hover/active semantic mappings. Keep teal as an operational/chart secondary accent.
- Active navigation must use a soft primary tint + primary text/icon. Remove the current heavy combination of outer border, fill and left rail; at most use a restrained rail.
- Use 8px radius for controls, buttons, Select and active navigation; use 12px radius for card, panel, popover, dropdown, dialog and sheet; pills only for badge/chip.
- Card default uses subtle border and optionally shadow-xs; Metric/interactive raised cards use shadow-sm; popovers/dialogs use shadow-md. Do not use glass, gradients, neon or heavy shadows.
- Preserve comfortable/compact density contracts.

Component/pattern requirements:
- Rebuild visual specimens, not only written contracts, for Card variants, MetricCard, attention item/list, Button, IconButton, Select/Combobox, SegmentedControl, Dropdown/Popover/Dialog and ChartContainer.
- MetricCard must support icon tile 40–48px, label, primary value, delta/status badge, supporting copy, loading, restricted and unavailable state. Do not make all dashboard cards identical.
- ChartContainer must demonstrate a primary indigo series, a teal supporting series, subtle grid lines, near legend, text summary/tooltip contract and loading/empty/error states.
- Rework AppShell and Dashboard pattern so they read as polished ERP/SaaS: canvas is quiet, sidebar and topbar are light, controls have breathing room, selection is light and clear, card hierarchy is deliberate.
- Dashboard first row must show at most four primary KPIs. Secondary operational metrics belong in an attention/summary section. Never combine unrelated metrics as one value separated by '/'.
- Global branch/warehouse scope belongs in AppShell. Dashboard page header must not repeat global scope; it should contain only page-specific date range and a clear primary action.
- Keep custom shadcn/Radix-style Select; do not introduce native <select> as the primary visual control.

Token adoption contract:
- DESIGN.md must require all future Open Design project artifacts to import/use --cn-* tokens, or a documented one-to-one bridge stylesheet sourced from variables.css.
- Do not create local palette/font/radius/shadow/spacing values in consumer designs where a Cenio semantic token exists.
- Future design runs must state their component-to-Cenio mapping at handoff.

Output requirements:
- Update DESIGN.md, light/dark CSS and JSON tokens, pattern CSS, component catalog, Foundation Kit, AppShell and Dashboard previews.
- Keep all state, accessibility and responsive guidance already present; improve it where the new visual treatment requires it.
- Return a concise list of changed artifacts and preview URL when finished.
```

Expected: Open Design returns a `runId` tied to the Design System project.

- [ ] **Step 2: Poll without replacing the Agent run**

Call `get_run(runId)` every 30–60 seconds until `succeeded`, `failed`, or `canceled`.

Expected: `succeeded`. If failed, preserve the returned error and stop for diagnosis; do not substitute manual file rewrites.

- [ ] **Step 3: Capture run result**

Record the terminal run message, preview URL, changed artifacts and duration.

Expected: enough information to retrieve generated files and audit them.

### Task 3: Mechanical token and contract audit

**Files:**
- Read (Open Design): `DESIGN.md`
- Read (Open Design): `system/variables.css`, `system/variables.dark.css`
- Read (Open Design): `system/tokens.default.json`, `system/tokens.dark.json`
- Read/Search (Open Design): `system/patterns/*`, `system/component-catalog.html`, `system/patterns/patterns.css`

**Interfaces:**
- Consumes: generated v0.5 artifacts.
- Produces: auditable pass/fail evidence for foundation, components and patterns.

- [ ] **Step 1: Check foundation tokens**

Search/read the artifacts for these required roles:

```text
--cn-canvas, --cn-surface, --cn-surface-subtle, --cn-surface-raised,
--cn-surface-elevated, --cn-surface-inset, --cn-border, --cn-border-subtle,
--cn-primary, --cn-primary-hover, --cn-primary-active, --cn-focus,
--cn-shadow-xs, --cn-shadow-sm, --cn-shadow-md,
--cn-radius-control, --cn-radius-container, --cn-font-sans
```

Expected: all roles are present in light and dark mappings where relevant; light canvas is cool neutral, controls map to 8px and containers map to 12px.

- [ ] **Step 2: Check typography contract**

Search for `Outfit`, `font-variant-numeric: tabular-nums`, font loads and `ui-monospace`.

Expected: Outfit load uses `display=swap`; KPIs/financial/table pattern values use tabular figures and do not assign mono font; mono only appears in Kbd/code/technical specimen context.

- [ ] **Step 3: Check component and pattern coverage**

Search component catalog and pattern files for:

```text
MetricCard, icon tile, restricted, unavailable, Select, Combobox,
SegmentedControl, ChartContainer, AttentionList, AppShell, Dashboard,
loading, empty, error, focus-visible
```

Expected: visual specimens and state guidance exist, not merely a textual component list.

- [ ] **Step 4: Check prohibited output**

Search main current pattern files (excluding historical snapshots) for `<select` and raw custom local token declarations that duplicate `--cn-*`.

Expected: no native select and no unapproved consumer-style local palette in Cenio Core patterns.

### Task 4: Visual and accessibility audit

**Files:**
- Inspect (Open Design preview): `system/patterns/app-shell.html`, `system/patterns/dashboard.html`, `system/component-catalog.html`, `system/kit.html`

**Interfaces:**
- Consumes: artifacts passing Task 3.
- Produces: visual acceptance decision and targeted polish findings, if any.

- [ ] **Step 1: Inspect the Dashboard and AppShell previews**

Compare the new previews against the v0.4 baseline using these criteria:

```text
Canvas reads neutral/cool rather than yellow-gray.
Cards have 12px visual softness without marketing-style rounding.
Default borders recede; overlays and raised cards show controlled depth.
Active navigation is a soft tint, not a heavy outlined box.
The first dashboard row has no more than four primary KPI cards.
Metric cards have hierarchy via padding, icon tile, value and delta/status.
Primary indigo and operational teal are distinct and restrained.
```

Expected: each criterion passes without weakening data density.

- [ ] **Step 2: Inspect accessibility and responsive affordances**

Confirm in artifacts: visible focus treatment, icon button labels, custom Select ARIA/listbox guidance, chart text summary, color+text/icon status treatment, loading/empty/error/restricted states, and mobile/collapsed navigation rules.

Expected: all prior essential behavior remains documented and visually represented.

- [ ] **Step 3: Decide result**

If every Task 3 and Task 4 assertion passes, accept v0.5. If only visual issues remain, write a numbered, artifact-specific polish prompt and run one additional Open Design Agent pass. If any foundation/contract item is missing, stop and report the exact issue.

### Task 5: Handoff and consumer-test recommendation

**Files:**
- Read (Open Design): final `DESIGN.md` and changed artifact list
- Reference: `docs/superpowers/specs/2026-07-26-cenio-core-visual-calibration-design.md`

**Interfaces:**
- Consumes: accepted v0.5 audit result.
- Produces: user-facing readiness report and the next Sales Dashboard redesign brief.

- [ ] **Step 1: Report result with evidence**

Provide run status, preview URL, artifacts changed, audit checks passed/failed and any remaining risk.

Expected: user can open the design system and understand if it is ready.

- [ ] **Step 2: Prepare next consumer test**

Recommend a separate Sales Dashboard redesign run that imports `--cn-*` tokens and maps each screen area to AppShell, MetricCard, ChartContainer, AttentionList and state patterns.

Expected: no source code is changed; the next action validates adoption in a real product screen.

