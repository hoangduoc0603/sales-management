# Thiết kế Sales Dashboard — Command Center vận hành

**Trạng thái:** Chờ người dùng duyệt spec  
**Phạm vi:** Chỉ redesign prototype Open Design `sale-management` / `app-shell-dashboard.html`; không sửa mã nguồn ứng dụng, SRS, schema hay nghiệp vụ.

## 1. Mục tiêu

Sales Dashboard phục vụ **Quản lý chi nhánh/vùng** theo dõi và điều phối vận hành trong ngày. Màn hình phải giúp người dùng trả lời nhanh: kinh doanh hôm nay thế nào, việc nào có rủi ro, và cần mở đúng báo cáo/chứng từ nào để xử lý.

Visual cần kế thừa Cenio Core v0.5: nền cool-neutral, Outfit, primary indigo `--cn-primary`, teal vận hành, control radius 8px, panel radius 12px, border nhẹ và shadow tinh tế. Không sao chép TailAdmin; chỉ học nhịp visual SaaS mềm, thoáng, dễ quét.

## 2. Cơ sở nghiệp vụ và giới hạn dữ liệu

| Nguồn | Quy tắc áp dụng cho Dashboard |
| --- | --- |
| `SRS-ACC-009` | Có lọc thời gian và Branch; thêm Warehouse khi nội dung cần. Hiển thị thời điểm tạo số liệu, `asOf`/trạng thái dữ liệu và coverage archive. Chỉ tính dữ liệu chứng từ đã hiệu lực. |
| `SRS-ACC-010` | Có KPI doanh thu, số đơn, trả hàng, đã thu, phải thu/quá hạn, giá vốn/lợi nhuận theo quyền, tồn và tồn thấp/gần hết hạn, chênh ca mở. KPI drill-down theo permission. |
| `SRS-ACC-003`, `SRS-ACC-014` | Giá vốn/lợi nhuận là sensitive: backend projection loại bỏ khi user không có quyền; UI hiển thị trạng thái restricted, không dùng số giả. |
| LLD Reporting §4 | Query mang date range, scope, `asOf` và drill-down token; DashboardProjection là projection theo Branch/date, không quét ledger lúc mở màn hình. Draft/Rejected/Cancelled loại trừ mặc định. |
| SRS Sales/Inventory/Finance | Đơn mở, tồn thấp/hết hạn, công nợ quá hạn và chênh ca là các queue hành động, luôn drill-down về nguồn dữ liệu trong scope. |

## 3. Cấu trúc thông tin đã duyệt

```text
AppShell
├── Global scope: workspace, Branch, Warehouse, notification, user
└── Dashboard page
    ├── PageHeader: breadcrumb, title, generatedAt/data-status, date range, Refresh
    ├── Primary KPI row (tối đa 4): Doanh thu thuần | Đơn hoàn tất | Đã thu | Phải thu/quá hạn
    ├── Decision area
    │   ├── Revenue trend: revenue vs prior period, legend, tooltip/text summary, link report
    │   └── Action queue: tồn thấp/gần hết hạn, đơn online chờ thao tác, chênh ca mở
    └── Operational follow-up
        ├── Đơn online cần xử lý (table/list có status, age, value, drill-down)
        └── Optional compact cards: trả hàng chờ duyệt, cảnh báo công nợ/ca theo quyền
```

## 4. Hành vi và thành phần

### 4.1 Scope và thời gian

- Branch/Warehouse chỉ nằm tại AppShell, không lặp trong PageHeader.
- PageHeader chỉ có date range custom Select theo Cenio, Refresh và trạng thái `Dữ liệu sẵn sàng` / loading / stale / error.
- Khi đổi scope hoặc khoảng thời gian, giữ cấu trúc trang và hiển thị skeleton theo vùng; không để trang trống hoặc số cũ không có nhãn `asOf`.

### 4.2 KPI chính

| KPI | Nội dung phụ | Hành động |
| --- | --- | --- |
| Doanh thu thuần | Delta với kỳ trước, định nghĩa ngày dữ liệu | Mở báo cáo doanh thu theo cùng filter |
| Đơn hoàn tất | POS và đơn online đã hiệu lực | Mở danh sách đơn đã hoàn tất/shipped |
| Đã thu | Tỷ lệ trên doanh thu thuần, trạng thái payment | Mở báo cáo thu/Payment |
| Phải thu / quá hạn | Tổng và số quá hạn có text/icon cảnh báo | Mở receivable aging |

- Mỗi MetricCard dùng icon tile 44px, label, Outfit tabular number, delta/status có text và icon, supporting copy, hover/focus drill-down affordance.
- Không gộp hai metric không cùng đơn vị vào một giá trị bằng dấu `/`.
- Giá vốn/lợi nhuận chỉ xuất hiện trong secondary section khi backend trả permission. Nếu thiếu quyền dùng state `Không có quyền xem` + mô tả, không dùng value bị che mờ.

### 4.3 Decision area

- `ChartContainer`: một line indigo cho doanh thu hiện tại và một line teal/dashed cho kỳ trước; grid rất nhẹ, legend sát biểu đồ, summary bằng văn bản và tooltip contract. Có tabular data alternative/link report trong handoff.
- `AttentionList`: phân cấp theo thời hạn và tác động. Mỗi item nêu reason, quantity/value, deadline/age, module và CTA drill-down; màu không là tín hiệu duy nhất.
- Các queue phải ưu tiên action thực: tồn thấp/sắp hết hạn, đơn online chờ xử lý, chênh ca đang mở. Không dùng chart hoặc card trang trí thay cho danh sách xử lý.

### 4.4 States và accessibility

- Có visual/contract cho loading skeleton, empty có phạm vi và next step, error có retry, stale có thời điểm, restricted có giải thích và yêu cầu quyền khi phù hợp.
- Dùng custom shadcn/Radix-style Select, không dùng native browser Select làm visual chính.
- Icon-only controls có `aria-label`; focus-visible Cenio; heading theo thứ tự; status dùng icon + text; chart có `role=img`, text summary và fallback table/report.
- Desktop: sidebar + grid 12 cột. Tablet: decision area về một cột. Mobile: sidebar collapse/sheet, KPI scroll/sắp thành grid hợp lý, action queue trước bảng rộng; không ẩn thông tin trạng thái quan trọng.

## 5. Mapping bắt buộc đến Cenio Core v0.5

| Vùng Dashboard | Cenio Core pattern/component/token |
| --- | --- |
| Khung chung | AppShell, `--cn-canvas`, `--cn-surface`, `--cn-border`, `--cn-active-nav-bg` |
| Header/filter | PageHeader, custom Select, Button/IconButton, `--cn-radius-control` |
| KPI | MetricCard, StatusBadge, `--cn-shadow-sm`, `--cn-tabular` |
| Trend | ChartContainer, ChartLegend, `--cn-chart-1`, `--cn-chart-2` |
| Việc cần xử lý | AttentionList/PriorityQueue, semantic success/warning/danger/info tokens |
| Danh sách đơn | DataTable/List pattern, row hover/selected tokens, StatusBadge |
| State | State gallery: loading, empty, error, permission-denied/restricted |

Mọi CSS của artifact phải import `--cn-*` từ Cenio Core hoặc dùng bridge stylesheet mapping một-một, không tạo palette/font/radius/shadow local.

## 6. Tiêu chí chấp nhận

1. Đọc được bốn KPI chính, trạng thái dữ liệu và item cần xử lý trong một lượt quét desktop; bốn KPI không vượt quá hàng đầu.
2. Mọi KPI/queue/action có đích drill-down mô tả rõ, đồng thời tuân permission/scope.
3. Visual mềm, có hierarchy và đủ data-dense; không có gradient, glass/neon, border nặng, mono cho tiền/KPI hoặc active nav boxed/rail nặng.
4. Không có native Select ở visual chính; states và accessibility nêu ở §4.4 được thể hiện trong artifact.
5. Prototype Sales Dashboard dùng Cenio Core v0.5; không thay đổi source code hay logic nghiệp vụ.

## 7. Ngoài phạm vi

- Không tạo API/report query/data model mới, không đổi date semantics, source of truth, permission hoặc drill-down authorization.
- Không thiết kế chi tiết các trang báo cáo/chứng từ đích; chỉ chỉ rõ đích điều hướng.
- Không thay thế hay chỉnh System Design Cenio Core trong task này.
