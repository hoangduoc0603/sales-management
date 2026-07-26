# Cenio Core v0.5 — Visual Calibration

| Thuộc tính | Giá trị |
| --- | --- |
| Trạng thái | Đã duyệt, sẵn sàng thực hiện |
| Ngày | 26/07/2026 |
| Phạm vi | Chỉnh lớp visual foundation, component specimen và page pattern trong Open Design |
| Design System đích | `user:cenio-core-l-product-design-system-d-ng-chung-ch` |
| Không thuộc phạm vi | Mã nguồn ứng dụng, thay đổi requirement/nghiệp vụ, sao chép UI/source/asset TailAdmin |

## 1. Bối cảnh và kết luận audit

Cenio Core v0.4 đã có token semantic, component coverage và pattern B2B/ERP tốt, nhưng visual output hiện quá strict và phẳng so với mục tiêu "hiện đại, mềm mại, đẹp". Sales Dashboard prototype có cấu trúc nghiệp vụ, accessibility và responsive state tốt, nhưng dùng token cục bộ (`--cenio-*`, `--bg`, `--surface`) thay vì token chuẩn `--cn-*` của Cenio Core. Vì vậy mỗi project có thể drift visual dù cùng designSystemId.

Các nguyên nhân tạo cảm giác cứng:

- Canvas hơi ấm/xám và border có tương phản quá cao, xuất hiện gần như ở mọi vùng.
- Primary indigo hiện tại quá tối ở active state; selected nav có cả tint, viền bao và thanh trái nên nặng.
- Radius control 6px/card 8px và card chỉ dựa vào border làm dashboard giống hệ thống kỹ thuật hơn là SaaS polished.
- Dashboard prototype dùng `ui-monospace` cho KPI, VND, thời gian và nhiều số liệu. Cenio Core chỉ cần tabular figures, không cần mono font cho dữ liệu kinh doanh.
- MetricCard chưa có hierarchy visual riêng: quá nhiều KPI đồng cấp, icon trần, value và delta chưa được nhóm theo visual rhythm.
- Artifact dashboard không tự nạp web font Outfit, do đó không bảo đảm typography nhất quán trên mọi máy.

TailAdmin được dùng để học quality bar, không sao chép: Outfit, gray/brand scale nhiều cấp, background gray-50 nhẹ, active navigation brand tint, card padding rộng, icon tile và elevation tinh tế.

## 2. Mục tiêu

Nâng Cenio Core thành một "soft enterprise" design system: vẫn data-dense, rõ ràng và đáng tin cho ERP, nhưng bớt cảm giác viền cứng, có chiều sâu nhẹ, visual hierarchy và affordance tốt hơn.

Tiêu chí chấp nhận:

1. App canvas, surface, border, selection, focus và elevation tạo cảm giác sáng, sạch, mềm nhưng vẫn đạt tương phản đọc tốt.
2. Outfit là font UI duy nhất; dữ liệu số dùng Outfit với `font-variant-numeric: tabular-nums`, không dùng mono ngoại trừ code/KBD/technical identifier khi có lý do.
3. Card/panel/control/overlay có shape và elevation nhất quán, không trở thành rounded marketing UI hoặc glassmorphism.
4. Navigation, Select, SegmentedControl, MetricCard, ChartContainer và attention panel có specimen high-fidelity để Open Design Agent tham chiếu chính xác.
5. Project mới phải có cơ chế dùng token `--cn-*` thay vì tự dựng local palette/tokens.
6. Không giảm accessibility, responsive behavior, state coverage hoặc density cần thiết cho ERP.

## 3. Quyết định visual

### 3.1 Color và surface

- Giữ Cenio indigo + teal, nhưng tinh chỉnh theo hướng sáng/cool hơn TailAdmin: primary 500 quanh `#465FFF` đến `#4B5FD4`; primary 50 là tint xanh rất nhạt; hover/active dùng 600/700 thay vì dùng primary tối cho mọi state.
- Canvas light dùng cool neutral, ưu tiên khoảng `#F8FAFC`; không dùng tint vàng/xanh lục có thể nhận thấy ở nền chính.
- Surface vẫn trắng; surface subtle/inset dùng neutral blue-gray rất nhạt.
- Border mặc định nhẹ, gần gray-200; `border-subtle` nhẹ hơn. Chỉ selected, focus, danger và structural divider cần border nổi bật hơn.
- Selected navigation dùng `primary-50` background + `primary-500` text/icon. Không dùng outer border bao toàn item; thanh active mảnh là tùy chọn, không kết hợp cả ba tín hiệu mạnh.
- Teal là accent vận hành và chart series phụ; success/warning/danger tiếp tục phải đi cùng icon/copy, không chỉ màu.

### 3.2 Typography và numeric data

- Nạp Outfit qua web font có `display=swap`; chỉ dùng weight 400/500/600/700.
- Body/control/table: 14px/20px. Label/metadata: 12px hoặc 13px/18px. Page title: 28–32px/38px, section title 18px/26px.
- KPI value: 28–32px/36px, weight 700 tối đa; không dùng 750 hoặc mono font.
- `tabular-nums` áp dụng cho tiền, quantity, percent, date/time, SKU/record ID trong bảng khi cần thẳng hàng. Mono bị giới hạn cho Kbd/code hoặc technical value thật sự cần phân biệt ký tự.

### 3.3 Shape, elevation và density

- Control, Button, Select, input, active nav: radius 8px.
- Card, panel, dropdown, popover, dialog, sheet: radius 12px.
- Badge/chip giữ pill; không bo góc lớn cho bảng hoặc dashboard canvas.
- Card default dùng border-subtle + shadow-xs hoặc không shadow; raised metric/interactive panel dùng shadow-sm; overlay dùng shadow-md.
- Giữ density `comfortable` mặc định và `compact` cho List/Report. Không giảm table row dưới 36px, không pha trộn density trong cùng page.

## 4. Component refinement bắt buộc

### 4.1 App shell và navigation

- AppShell có background canvas nhẹ, sidebar và topbar surface trắng rõ nhưng border tinh tế.
- Navigation active, hover, focus-visible, collapsed/mobile state được làm lại theo quyết định 3.1.
- Global context (workspace, branch, warehouse) có một source of truth. Page filter không được lặp branch/warehouse nếu nó đã là global scope.
- Theme/segmented control dùng container subtle; option active là surface raised + shadow-xs, không dùng nhiều viền đen.

### 4.2 Controls và overlays

- Select/Combobox/MultiSelect giữ shadcn/Radix behavior; trigger có 40px comfortable / 36px compact, radius 8px, border subtle và hover/focus rõ.
- Dropdown/popover/dialog dùng radius 12px, shadow-md, padding rộng vừa đủ; overlay không làm nặng bằng border đậm.
- Button primary dùng indigo mới; secondary/outline/ghost có contrast và pressed state rõ.

### 4.3 Card, MetricCard, attention và chart

- Tách `Card` thành default, metric, attention, interactive và inset usage; không dùng một white-card style cho mọi content.
- `MetricCard` specimen bắt buộc: optional icon tile 40–48px, label, value, delta/status badge, supporting copy, loading, restricted và empty/unavailable state.
- Icon tile là surface-inset hoặc primary-50 tùy hierarchy; không dùng icon trần trên mọi KPI.
- `ChartContainer` dùng primary làm series trọng tâm, teal làm series vận hành/phụ, gridline mảnh, legend gần chart, tooltip/equivalent content, loading/empty/error state.
- `AttentionList` phân cấp theo severity và deadline, nhưng không dùng màu như tín hiệu duy nhất.

## 5. Token adoption contract

Mọi project Open Design dùng Cenio Core phải:

1. Đọc `DESIGN.md`, `system/variables.css`, component catalog và page pattern trước khi tạo UI.
2. Dùng `--cn-*` trực tiếp hoặc tạo alias một-một chỉ trong một bridge stylesheet được dẫn chiếu rõ từ `variables.css`.
3. Không tạo palette local, font local, radius/shadow/spacing local hoặc hard-code raw color nếu một semantic token tương đương đã có.
4. Nạp Outfit đúng contract; không tin vào font được cài sẵn ở máy local.
5. Báo cáo mapping giữa page component và Cenio Core component/pattern khi hoàn tất design run.

## 6. Điều chỉnh bắt buộc cho Dashboard pattern của Core

- Dashboard Core minh họa tối đa bốn KPI primary ở first row; secondary operational metrics nằm ở attention/summary hoặc section sau.
- Không biểu diễn hai chỉ số khác nghĩa bằng một value có dấu `/`; tách metric hoặc dùng comparison label rõ.
- Header chỉ giữ context thuộc page, date range và một primary action. Global branch/warehouse thuộc AppShell.
- Chart là hero insight; attention panel là operational action; card có hierarchy khác nhau thay vì mọi vùng đồng cấp.
- Dashboard cần minh họa full states, responsive collapse và chart accessibility summary.

## 7. Artifact cần cập nhật trong Open Design

- `DESIGN.md`
- `system/variables.css`, `system/variables.dark.css`, `system/tokens.default.json`, `system/tokens.dark.json`
- `system/patterns/patterns.css`
- `system/component-catalog.html`
- `system/page-patterns.html`
- `system/patterns/app-shell.html`
- `system/patterns/dashboard.html`
- `system/kit.html`, `system/kit.dark.html`, `brand.html`
- Script tái tạo system nếu `system/scripts/refine-cenio-core.mjs` vẫn là source tạo artifact.

Không sửa Sales Dashboard project trong pass này; dashboard sẽ là consumer test sau khi v0.5 được audit.

## 8. Audit sau thay đổi

- Token visual mới có trong CSS, JSON, DESIGN.md và specimen; light/dark mapping không mất semantic roles.
- Không có native `<select>` trong main patterns.
- Component catalog hiển thị visual specimen có states, không chỉ contract text.
- Tất cả pattern dùng `--cn-*`.
- Font UI là Outfit; KPI/financial/table number không khai báo mono font.
- Screenshot của dashboard pattern có canvas cool neutral, active navigation nhẹ, metric hierarchy rõ, card/panel mềm hơn nhưng vẫn B2B.
- Kiểm tra contrast, focus-visible, keyboard/ARIA contract, responsive breakpoint và chart text summary.
