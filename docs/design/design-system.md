# Design System

## Nguồn chuẩn

- Design System: Cenio Core v0.7
- Open Design project: `brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209`
- Canonical references trong Open Design:
  - `DESIGN.md`
  - `system/variables.css`
  - `system/variables.dark.css`
  - `system/tokens.default.json`
  - `system/tokens.dark.json`
  - `system/COMPONENT-CATALOG.md`
  - `system/component-catalog.html`
  - `system/patterns/`

## Nguyên tắc áp dụng

- Dùng token Cenio Core làm nguồn chuẩn cho màu, typography, spacing, radius, shadow và focus state.
- Cenio Core v0.7 theo hướng TailAdmin-inspired: dense dashboard, border/subtle shadow, icon button rõ, custom listbox, theme light/dark và primary indigo Cenio.
- Không tạo palette, font, radius, shadow hoặc spacing system cục bộ nếu Cenio Core đã có token tương ứng.
- Component phải ưu tiên mapping sang shadcn/ui/Tailwind nhưng visual output phải bám theo Cenio Core.
- Tất cả màn hình nghiệp vụ phải hỗ trợ light/dark theme.
- Số liệu tài chính, số lượng và KPI dùng tabular numbers.
- V0.7 dùng canvas cool-neutral, surface trắng, indigo Cenio và teal cho dữ liệu/vận hành; mọi màu component phải đi qua token semantic `--cn-*`.
- Control có radius 8px, container/panel có radius 12px. Active navigation chỉ dùng tint cùng icon/text primary, không dùng rail, viền chọn hoặc fill đậm.
- Không dùng gradient, glassmorphism, neon, shadow nặng, KPI accent strip hoặc mono typography cho dữ liệu nghiệp vụ.

## Component rule chính

| Nhóm | Rule triển khai |
| --- | --- |
| App shell | Giữ cấu trúc sidebar/header/content theo design handoff của từng màn hình; context scope, freshness/coverage và trạng thái xử lý phải dùng pattern semantic đã duyệt. |
| Button | Submit/loading button chỉ hiển thị loading icon; không đổi text nếu handoff không yêu cầu. |
| Button/IconButton | Primary filled dùng cặp `--cn-primary`/`--cn-primary-foreground`; trạng thái selected/subtle dùng cặp `--cn-primary-subtle`/`--cn-primary-subtle-foreground`. |
| Select/Listbox | Không dùng native `<select>` cho UI chính; dùng custom select/listbox hoặc shadcn Select được style theo Cenio Core. |
| Metric/KPI card | Không dùng top accent strip trang trí. Phân cấp bằng spacing, border, elevation, icon tint và typography. |
| Badge/Status | Dùng semantic variants `success`, `warning`, `danger`, `info`; không dùng màu ngẫu nhiên theo từng màn. Trạng thái không được chỉ phân biệt bằng màu: kèm icon/copy và focus/contrast đạt chuẩn. |
| Table | Header, density, row hover, empty/error/loading state phải theo pattern đã duyệt. |
| Sensitive data | Không che số liệu nhạy cảm chỉ bằng UI. Nếu không có quyền, backend/API phải trả permission-restricted state. |

## Khi Cenio Core thay đổi

1. Rà soát `docs/design/design-system.md`.
2. Rà soát `docs/design/open-design-registry.md` để xác định màn hình bị ảnh hưởng.
3. Cập nhật handoff từng màn nếu token/component/pattern thay đổi.
4. Chỉ code theo design mới sau khi màn hình tương ứng được duyệt lại hoặc xác nhận không bị ảnh hưởng.
