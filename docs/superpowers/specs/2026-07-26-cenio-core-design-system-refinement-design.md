# Cenio Core Design System Refinement

| Thuộc tính | Giá trị |
| --- | --- |
| Trạng thái | Chờ duyệt trước khi thực hiện trên Open Design |
| Ngày | 2026-07-26 |
| Phạm vi | Chỉnh sâu Design System hiện tại trong Open Design |
| Design System đích | `user:cenio-core-l-product-design-system-d-ng-chung-ch` |
| Project tham chiếu | `sale-management` prototype đang dùng Design System này |

## 1. Mục tiêu

Nâng cấp Cenio Core từ bộ Design System "functional B2B" thành bộ nền high-fidelity cho nhiều sản phẩm quản lý, mini ERP và Sales Management. Kết quả cần giúp Open Design Agent tạo màn hình đẹp, hiện đại, đồng bộ và ít cần sửa tay hơn.

Ưu tiên:

- Giao diện hiện đại, đẹp, rõ hierarchy, không nhạt nhòa.
- UX thân thiện với phần mềm quản lý dùng nhiều giờ mỗi ngày.
- Component đầy đủ, có visual states rõ, tránh dùng browser-native control cho UI chính.
- Foundation đủ mạnh để thiết kế dashboard, list/report, object detail, form dài và settings.
- Không cần giữ tương thích ngược với bản Design System cũ nếu phần cũ làm giảm chất lượng.

## 2. Nguồn tham khảo

Reference chính lấy từ `docs/product/ui-reference-research.md`, ưu tiên phần "Nguồn triển khai và visual reference trực tiếp":

- `shadcn/ui`: primitive/accessibility/component base cho React + Tailwind.
- `TailAdmin React`: visual direction gần stack hiện tại, dùng font Outfit, palette nhiều cấp, dashboard shell tốt.
- `Tailwind Plus Application UI`: benchmark layout, form, table, drawer, empty state và navigation.
- `Tremor / Tremor Raw`: metric card, dashboard, chart, legend, date filter.
- `Preline UI` và `Flowbite React`: tham khảo states, form, modal, dropdown, upload khi thiếu mẫu.
- `SAP Fiori`, `React-admin`, `TanStack Table`: hành vi enterprise cho table, filter, saved view, bulk action, object page.
- `SaaSFrame`: tham khảo flow thật, không copy asset/source/screenshot.

Không sao chép thương hiệu, source code, asset hoặc layout nguyên bản từ các nguồn trên. Chỉ chuyển thành token, component contract và page pattern riêng của Cenio Core.

## 3. Hiện trạng

Design System hiện tại có nền tốt:

- Có `DESIGN.md`, semantic tokens, `system/variables.css`, dark/compact tokens.
- Font đã là `Outfit`.
- Có component catalog với nhiều contract: primitives, form, overlay, data, dashboard.
- Có page patterns: AppShell, Dashboard, List/Report, Object Detail, Edit Form, Settings, State Gallery.

Các điểm chưa đạt:

- Visual foundation còn phẳng: `surface` và `surface-elevated` đều trắng; border/shadow/tint ít lớp.
- Primary/accent chưa có scale đầy đủ như `25/50/100/500/600/700/900`, làm UI khó có chiều sâu.
- Control đang quá basic; prototype còn dùng native `<select>`, nên dropdown mở theo UI hệ điều hành.
- Component catalog thiên về mô tả contract, chưa đủ specimen high-fidelity để Agent học visual.
- Table/filter/object page chưa đủ behavior enterprise: saved views, column chooser, advanced filter, row selection, bulk action, no-results.
- Dashboard còn quá trắng, card đều nhau, thiếu hierarchy giữa KPI, chart, attention list và insight.
- Một số artifact có thể gây nhiễu nếu còn dùng style chung chung hoặc không đồng nhất với Outfit/Cenio tokens.

## 4. Phạm vi chỉnh sửa

Thực hiện refinement sâu trên Design System hiện tại, cho phép xóa hoặc thay thế phần chưa hợp lý.

Không triển khai vào code ứng dụng trong repo ở bước này. Kết quả là Design System trong Open Design tốt hơn để dùng cho các lần thiết kế UI tiếp theo.

## 5. Foundation mới

### 5.1 Typography

- Font mặc định: `Outfit`, fallback `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif`.
- Weight: `400`, `500`, `600`, `700`.
- Body/table/control: `14px / 1.45-1.5`.
- Label/metadata/table header: `12px` hoặc `13px`, weight `500-600`.
- Page title: `24-32px`, không dùng hero-scale trong app nghiệp vụ.
- Panel title: `16-18px`, compact và rõ.
- KPI: `26-32px`, tabular numbers, không quá to gây marketing feel.
- VND, quantity, SKU, date/time: luôn dùng tabular numbers.
- Không dùng negative letter spacing rộng rãi; display tracking tối đa nhẹ và có kiểm soát.

### 5.2 Color

Tạo palette giàu lớp hơn theo tinh thần TailAdmin:

- `primary-25/50/100/200/500/600/700/900`: blue-violet hiện đại, đủ tint cho active nav, selected row, chips, focus.
- `gray-25/50/100/200/300/500/700/900`: neutral hơi lạnh, dùng cho app canvas/table/border/text.
- `accent-teal`: dùng cho chart chính, insight tích cực hoặc định hướng phụ.
- `success`, `warning`, `danger`, `info`: có foreground, subtle background, border.
- `chart-1..8`: đủ series cho dashboard, không chỉ 5 màu.

Semantic tokens cần có:

- `canvas`, `surface`, `surface-subtle`, `surface-raised`, `surface-elevated`, `surface-inset`.
- `border`, `border-subtle`, `border-strong`.
- `control-bg`, `control-border`, `control-hover`, `control-active`.
- `table-head`, `row-hover`, `row-selected`.
- `active-nav-bg`, `active-nav-border`, `active-nav-text`.
- `focus`, `focus-ring`.

### 5.3 Shape, shadow, density

- Radius control: `6px`.
- Radius card/panel/dialog/popover: `8px`.
- Không dùng bo góc lớn cho dashboard/card.
- Control height mặc định: `40px`; compact: `34-36px`.
- Table row mặc định: `44px`; compact: `36-38px`.
- Shadow có 3 mức: `xs`, `sm/raised`, `md/popover`; dùng tiết chế nhưng rõ hơn hiện tại.
- Border vẫn là phân tách chính, shadow chỉ cho overlay/elevated/interactable card.

## 6. Component System

Mỗi component cần có contract và specimen trực quan với states chính: default, hover, focus-visible, active/open, selected, disabled, loading, error, empty/read-only nếu phù hợp.

### 6.1 Primitives

Bao gồm tối thiểu:

- Button: primary, secondary, outline, ghost, destructive, loading, icon-leading/trailing.
- IconButton: tooltip/aria-label bắt buộc, trạng thái pressed.
- Link, Badge, StatusBadge, Avatar, Tooltip, Kbd, Divider, Card, Tabs, Breadcrumb, Pagination.
- SegmentedControl và ToggleGroup cho mode/view switching.

### 6.2 Form controls

Form controls phải theo shadcn/Radix-style, không dùng native UI cho control chính:

- TextInput, Textarea, NumberInput, CurrencyInput.
- Select: trigger riêng, chevron, placeholder, selected value, grouped items, disabled item, error state.
- Combobox/SearchableSelect: search, empty, async/loading, grouped results.
- MultiSelect: chips, checklist popover, select all, clear.
- DatePicker/DateRangePicker: presets, custom range, restricted dates, mobile sheet.
- Checkbox, Radio, Switch.
- FileUpload: button picker, dropzone, progress, retry/error.
- FormSection, FieldGroup, FieldError, ErrorSummary, StickyFormActions.

### 6.3 Overlay & feedback

Bao gồm:

- DropdownMenu, ContextMenu, Popover, CommandPalette, Dialog, AlertDialog, Sheet/Drawer.
- Toast, InlineAlert, Banner.
- Skeleton, Progress, Spinner.
- EmptyState, NoResultsState, ErrorState, PermissionState, ContextMismatchState.

Overlay phải có focus management, ESC/close rule, focus return, z-index và mobile behavior.

### 6.4 Data-heavy UI

Đây là phần bắt buộc phải mạnh vì Cenio làm phần mềm quản lý:

- DataTable: sticky header, sortable header, row hover, selected row, right-aligned numeric columns, long text strategy.
- TableToolbar: search, filters, saved view, column chooser, density, export/import/action.
- FilterBar: basic inline filters, advanced filters in Sheet, active filter chips, reset.
- SavedView: personal/default/shared-ready contract.
- ColumnChooser: show/hide/reorder, mandatory columns.
- Sort controls: aria-sort, single/multi-sort rule.
- RowSelection + BulkActionBar: selected count, select page/all results, destructive confirm.
- Pagination: page size, result range, cursor/numbered variants.
- NoResults vs Empty vs Error phải tách rõ.

### 6.5 Dashboard UI

Bao gồm:

- MetricCard: value, label, comparison, sparkline optional, action state.
- TrendIndicator: up/down/flat/unavailable, có baseline text.
- ChartContainer: title, subtitle, legend, tooltip contract, empty/error/loading.
- ChartLegend: static/interactive.
- DashboardDateFilter: preset/custom/compare-to.
- InsightCallout: insight + evidence + action.
- AttentionList, ActivityFeed, PriorityQueue.

Dashboard phải có hierarchy rõ: KPI scan nhanh, chart là insight chính, side panel là việc cần làm.

## 7. Page Patterns

Tạo hoặc làm lại các pattern sau bằng visual mới:

- AppShell: sidebar, topbar, workspace switcher, global search, notification, user menu, responsive collapsed/mobile nav.
- Dashboard: KPI, chart, attention list, activity, state panels.
- List/Report: page header, toolbar, saved view, filters, table, bulk action, pagination.
- Object Detail: object header, status, key facts, tabs/sections, related records, activity, dangerous actions.
- Create/Edit Form: sectioned form, validation, error summary, sticky actions, side nav for long form.
- Settings/Admin: setting rows, permission/account controls, audit-sensitive actions.
- Auth/Login optional: only if useful for app ecosystem.
- State Gallery: loading, empty, no-results, error, permission, context mismatch.

## 8. Open Design Execution Prompt

Khi thực hiện trên Open Design, dùng prompt sau:

```text
Refine the existing Cenio Core Design System deeply. You may delete, replace, or rebuild parts that are visually weak or inconsistent. Do not preserve backward compatibility if it reduces quality.

Goal:
Create the best high-fidelity B2B/mini-ERP design system for Cenio products: modern, polished, friendly, data-dense, accessible, and reusable for Sales Management, CRM, Inventory, Purchasing, Finance, Reporting, and future mini ERP apps.

References to absorb as rules, not to copy:
- shadcn/ui for accessible React/Tailwind primitives and interaction model.
- TailAdmin React for the visual direction: Outfit font, polished admin dashboard feel, rich brand/gray scales, clear app shell, dashboard card rhythm.
- Tailwind Plus Application UI for high-quality app shell, page headers, tables, forms, drawers, empty states, settings layouts.
- Tremor / Tremor Raw for dashboard, metric cards, chart containers, legends, date filters and data visualization polish.
- SAP Fiori, React-admin, and TanStack Table for enterprise data UX: table personalization, filters, saved views, column chooser, row selection, bulk actions, object pages and error states.
- Preline, Flowbite and SaaSFrame only as secondary visual/flow references.

Do not copy any brand, source code, asset, screenshot, marketing copy, or proprietary layout from these references. Convert good ideas into Cenio's own tokens, components and page patterns.

Mandatory foundation changes:
- Keep Outfit as the only UI font.
- Body/table/control text should feel like TailAdmin: compact, crisp, readable, mostly 14px.
- Build a richer token system: primary scale, gray scale, accent teal, semantic subtle backgrounds, chart palette, surface-subtle, surface-raised, surface-elevated, surface-inset, table-head, row-hover, row-selected, active-nav-bg, focus-ring, shadow-xs/sm/md.
- Keep radius restrained: 6px controls, 8px cards/panels/popovers/dialogs.
- Make the UI more polished and less flat than the current system while staying professional for B2B software.

Mandatory component changes:
- Do not use native browser select as the main visual Select. Define and demonstrate custom shadcn/Radix-style Select with trigger, chevron, content, item, selected item, group, disabled item, error, loading/empty where relevant.
- Add high-fidelity specimens for Button, IconButton, Input, Textarea, Select, Combobox, MultiSelect, DatePicker, DateRangePicker, CurrencyInput, Checkbox, Radio, Switch, FileUpload, Badge, StatusBadge, Tooltip, DropdownMenu, Popover, CommandPalette, Dialog, AlertDialog, Sheet, Toast, InlineAlert, Skeleton, Progress, EmptyState, NoResultsState, ErrorState, PermissionState.
- Add data-heavy components: DataTable, TableToolbar, FilterBar, FilterChip, SavedView, ColumnChooser, SortControl, RowSelection, BulkActionBar, Pagination, TableDensity.
- Add dashboard components: MetricCard, TrendIndicator, ChartContainer, ChartLegend, DashboardDateFilter, InsightCallout, AttentionList, ActivityFeed, PriorityQueue.
- Every component must show states and content rules, not just a written description.

Mandatory page patterns:
- Rebuild AppShell, Dashboard, List/Report, Object Detail, Create/Edit Form, Settings/Admin and State Gallery using the upgraded tokens and components.
- The Dashboard must be more visually compelling than the current version: stronger hierarchy, richer surfaces, polished KPI cards, better chart panel, better side attention panels, and no bland native controls.
- The List/Report pattern must demonstrate enterprise table UX: search, filters, saved views, column chooser, density, row selection, sticky bulk action, no-results/error/loading.
- The Object Detail pattern must demonstrate entity header, status, key facts, tabs/sections, related table/list and activity.
- The Form pattern must demonstrate sectioned long forms, validation, error summary and sticky actions.

Output:
- Update DESIGN.md to describe the refined system clearly.
- Update tokens and CSS variables.
- Update component catalog with high-fidelity visual specimens.
- Update page pattern previews.
- Remove or replace artifacts that conflict with the refined Cenio Core style.
- Keep the result self-contained and ready to use as default context for future Open Design projects.
```

## 9. Kiểm tra sau khi Open Design chạy

Sau khi Agent hoàn tất, cần rà lại:

- `DESIGN.md` có phản ánh đúng foundation mới không.
- `system/variables.css` có đầy đủ token mới không.
- Component catalog có specimen thật, không chỉ text contract.
- Không còn native select trong pattern chính trừ khi ghi rõ là fallback.
- Dashboard nhìn rõ hơn bản hiện tại: có hierarchy, depth, polish.
- List/Report có đủ toolbar/filter/table/bulk/pagination/state.
- Object Detail và Form đủ dùng cho mini ERP.
- Font vẫn là Outfit.
- Không copy nguyên brand/source/asset từ reference.

## 10. Rủi ro và quyết định

- Rủi ro Open Design Agent tạo quá nhiều artifact phụ hoặc style không nhất quán. Cách xử lý: sau run đầu, audit lại và yêu cầu pass polish/cleanup thứ hai nếu cần.
- Rủi ro system quá rộng. Cách xử lý: vẫn giữ component đầy đủ, nhưng page pattern ưu tiên B2B/ERP, không thêm marketing/landing pattern.
- Quyết định: chấp nhận xóa/thay thế phần cũ nếu làm giảm chất lượng visual.
- Quyết định: chưa triển khai code ứng dụng; chỉ chỉnh Design System trong Open Design.

