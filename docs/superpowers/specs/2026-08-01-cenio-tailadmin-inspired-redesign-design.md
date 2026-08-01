# Cenio Core v0.7 va Sales Management Visual Redesign

| Thuoc tinh | Gia tri |
| --- | --- |
| Trang thai | Da duoc user duyet design direction; cho duyet spec truoc khi lap ke hoach |
| Ngay | 2026-08-01 |
| Pham vi dot 1 | Cenio Core, Sales Dashboard va POS Checkout tren Open Design |
| Khong thuoc pham vi | React source, SRS, LLD, ADR, schema, permission, state machine va data contract |
| Huong tham chieu | TailAdmin React ve visual quality; Cenio giu brand rieng |

## 1. Muc tieu

Lam lai visual language cua Cenio de dat cam giac polished admin SaaS gan TailAdmin React: sang, sach, data-dense, de quet va co dark mode hoan chinh. Cenio khong sao chep code, asset, copy, trademark hay layout cu the cua TailAdmin.

Dot 1 tao design system su dung duoc va hai man consumer benchmark. Dashboard kiem chung hierarchy cho quan ly van hanh; POS kiem chung thao tac nhanh va do ro rang giao dich cho thu ngan.

## 2. Nguyen tac khong thay doi

- Cenio giu brand rieng, semantic color rieng va component mapping sang shadcn/ui/Tailwind o giai doan code sau.
- Giu nguyen SRS, ADR Accepted, LLD, data dictionary, source of truth, permission, Branch/Warehouse scope, state machine, idempotency va policy hieu nang POS.
- Khong dua UI state demo vao runtime happy path. Loading, empty, error, restricted, stale, archive va command-in-progress chi hien thi khi state tuong ung xay ra.
- Khong dung native select, gradient, glassmorphism, neon, heavy outline, top accent strip KPI, priority rail, mono font cho so lieu kinh doanh hoac chinh sach offline write khong co trong SRS.

## 3. Cenio Core v0.7

### Visual foundation

- Canvas cool neutral rat nhe; surface trang; surface inset va border nhat quan theo nhieu cap de tao chieu sau tinh te.
- Primary Cenio la indigo rieng; blue va teal dung cho thao tac/series van hanh; success, warning, danger, info la semantic token co icon va copy, khong chi phan biet bang mau.
- Outfit la UI font duy nhat. Body/control/table dung 14px; label/metadata 12-13px; page title 28-32px; section title 18px. Tien, quantity, percent, date/time dung tabular figures.
- Control radius 8px; card, panel, dropdown, popover, dialog va sheet radius 12px. Shadow dung phan cap: xs cho selected/raised surface, sm cho interactive card, md cho overlay.

### App shell

- Sidebar co brand ro rang, section label nho, item compact. Active state dung brand tint va text/icon primary; khong ket hop rail mau, outer border va tint dam.
- Header phang gon, tach ro global context (workspace, Branch, Warehouse), search, notification, theme toggle va user menu. Page filter khong lap lai global scope.
- Light/dark la hai visual mode hoan chinh, giu semantic meaning, focus-visible, disabled, hover va pressed state.

### Component catalog can lam lai

- Button/IconButton, input, textarea, Select/Combobox/MultiSelect, date range, checkbox, radio, segmented control, tabs.
- Status badge, avatar, toast, tooltip, dropdown, popover, modal/dialog, drawer, empty/loading/error/restricted states.
- DataTable compact/comfortable, bulk action, filter bar, pagination, row hover/selected, toolbar va responsive fallback.
- MetricCard, Panel variants, chart container/legend/tooltip/text alternative, attention list va object/action header.
- Moi specimen phai co light/dark, interactive states va usage guidance; khong chi liet ke contract text.

## 4. Sales Dashboard benchmark

### Hierarchy

1. AppShell global context.
2. Page header: title, generatedAt/asOf, custom date range va refresh.
3. Duy nhat bon KPI: Doanh thu thuan, Don hoan tat, Da thu, Phai thu/qua han.
4. Decision area: revenue trend rong ben trai va action queue ben phai.
5. Don nhap tay can xu ly (table/list), sau do la theo doi thu cap.

### Visual va behavior

- KPI co icon tile nhe, mot gia tri chinh, supporting copy, delta co text/icon va CTA drill-down. Khong co top accent strip hay border highlight rieng.
- Chart la hero insight: primary cho ky hien tai, teal cho ky truoc, gridline manh, legend sat chart, summary van ban va duong dan bao cao day du.
- Action queue dung icon severity, title, ly do, quantity/value, age/deadline, module nguon va CTA. Khong dung vertical priority rail.
- State gallery khong nam tren ready view. Cac state bat buoc van phai ton tai o artifact/flow de implement dung khi phat sinh.
- Tablet stack chart va queue. Mobile uu tien queue, sau do KPI va danh sach don co the mo chi tiet; khong an status, scope hay metadata quan trong.

## 5. POS Checkout benchmark

### Layout va hierarchy

- POS trong app chinh dung AppShell chung; khong co header POS rieng.
- Desktop chia hai cot: scan/search va gio ben trai; checkout sticky ben phai.
- Scan/search la primary entry, co scanner affordance, focus state ro va ket qua compact theo variant/SKU/barcode/gia/ton tham khao.
- Gio dung row compact; quantity control de bam; gia, giam gia va total thang hang bang tabular figures. Batch/serial/promotion dung contextual panel.
- Checkout panel uu tien tong phai tra, tender, da nhan va tien thua/phai thu. CTA Hoan tat luon truy cap duoc.

### States va responsive

- Luu/mo nhap va huy gio la secondary action, khong canh tranh voi CTA hoan tat.
- Ton, gia hoac promotion conflict hien tai vung bi anh huong va giu gio. Timeout/idempotency recovery khong lam mat gio va khong tao chung tu trung.
- Tablet/mobile giu thu tu scan, gio, tong tien va thanh toan; khong de scan input, total hay CTA bi che.

## 6. Deliverable tren Open Design

1. Nang version Cenio Core thanh v0.7: DESIGN.md, token light/dark, component catalog, app-shell/page patterns va visual verification.
2. Lam lai `app-shell-dashboard.html` tren project Sales Management de tieu thu Cenio Core v0.7.
3. Lam lai `app-pos-checkout.html` tren cung project theo Cenio Core v0.7.
4. Cap nhat `docs/design/open-design-registry.md`, `docs/design/design-system.md` va hai handoff man hinh trong cung dot thay doi, chi sau khi artifact moi dat duoc review.

## 7. Acceptance criteria

- Visual cua Core, Dashboard va POS co nhiet do, rhythm, surface hierarchy, typography, sidebar/header/controls/table/chart polish gan TailAdmin React nhung nhan dien Cenio rieng.
- Khong vi pham boundary nghiep vu, permission, scope, state, idempotency va performance policy da duyet.
- Dashboard khong co white-panel soup, state gallery runtime hoac priority rail; hero chart va action queue doc ro trong mot luot quet desktop.
- POS giu scan/search, gio, total va checkout CTA ro rang o desktop/tablet/mobile.
- Component catalog va ca hai benchmark co light/dark, loading, empty, error, restricted va focus/keyboard behavior can thiet.
- Khong copy source, screenshot, asset, copy, trademark hay layout cu the tu TailAdmin.

## 8. Thu tu thuc hien

1. Audit va remake Cenio Core v0.7.
2. Review visual Core va chot consumer mapping.
3. Remake Dashboard va POS trong Open Design.
4. Chay visual QA desktop/tablet/mobile va light/dark; doi chieu handoff, SRS va LLD.
5. Cap nhat registry/handoff sang artifact moi sau khi user duyet.

## 9. References

- TailAdmin React demo: https://react-demo.tailadmin.com/
- TailAdmin React source: https://github.com/TailAdmin/free-react-tailwind-admin-dashboard
- Cenio registry: `docs/design/open-design-registry.md`
- Cenio implementation rules: `docs/design/implementation-rules.md`
- Dashboard handoff: `docs/design/screens/sales-dashboard.md`
- POS handoff: `docs/design/screens/pos-checkout.md`
