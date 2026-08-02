# Sales Dashboard Design Handoff

## Trạng thái

- Status: `Approved`
- Ngày chốt: 2026-08-01
- Cập nhật correction: 2026-08-01 — loại bỏ ready/coverage/checklist UI khỏi ready viewport; header chỉ giữ `generatedAt`/`asOf` dạng text gọn.
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact chính: `app-shell-dashboard.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/app-shell-dashboard.html`
- Handoff trong Open Design: `brand-spec.md`

## Hash/state cần verify

- State chính: overview/dashboard mặc định.
- Panel/state bắt buộc kiểm khi implement: action queue, manual orders, collections, restricted/scope invalid/stale/retry và command-in-progress nếu xuất hiện trong artifact hoặc SRS.

## Tài liệu nghiệp vụ/kỹ thuật liên quan

- SRS: `docs/product/srs/access-reporting.md`
  - `SRS-ACC-003`
  - `SRS-ACC-009`
  - `SRS-ACC-010`
- Quy tắc nền tảng: `docs/product/srs/overview.md`
  - `SRS-OVR-004` (đồng thời, khóa và idempotency)
  - `SRS-OVR-011` (archive và dung lượng)
  - `SRS-OVR-014` (tác vụ đang xử lý và tra cứu kết quả)
  - `SRS-OVR-016` (không cam kết offline khi mất Internet)
  - `SRS-OVR-019` (vòng đời Branch và Warehouse)
- LLD nền tảng: `docs/architecture/detailed-design.md`
- LLD module: `docs/architecture/modules/administration-reporting-operations.md`
- Data dictionary: `docs/data-model/tables/operations-reporting.md`
- ADR liên quan:
  - `docs/decisions/0002-htmlservice-modular-monolith.md`
  - `docs/decisions/0003-storage-roles-partition-archive.md`
  - `docs/decisions/0004-performance-first-pos.md`
  - `docs/decisions/0009-single-rpc-api-gateway.md`

## Mục tiêu màn hình

Sales Dashboard là màn tổng quan vận hành hằng ngày cho quản lý cửa hàng/chi nhánh/vùng. Màn hình phải giúp người dùng quét nhanh tình hình bán hàng, dòng tiền phải thu và các việc cần xử lý trước, không nhồi card chỉ để đủ dashboard.

## Nội dung bắt buộc

### Header/AppShell

- Brand/app shell theo Cenio Sales.
- Workspace/company context.
- Bộ chọn chi nhánh.
- Bộ chọn kho.
- Thời điểm dữ liệu chính như `generatedAt`/`asOf` ở dạng text gọn; không dùng badge “Dữ liệu sẵn sàng” hoặc “Phủ dữ liệu” trong header để tránh nhiễu.
- Nút làm mới.
- Icon button chuyển light/dark theme ở header.
- Thông tin user/role.

#### Phạm vi Branch/Warehouse

- Phạm vi truy vấn là giao của `ActorContext`, Branch và Warehouse đang chọn; UI không được tự suy diễn hay fallback sang dữ liệu tenant-wide.
- Không có scope hợp lệ, Warehouse không thuộc Branch, hoặc backend từ chối scope: hiển thị trạng thái có CTA chọn lại phạm vi/liên hệ Admin; không giữ hay hiển thị dữ liệu cũ của phạm vi khác.
- Khi scope thay đổi: xoá context/view cache cũ, tải lại quyền và dữ liệu cho scope mới trước khi render kết quả.
- Bộ chọn là custom listbox theo Cenio Core, có keyboard/focus state và biểu thị rõ giá trị đang chọn.

#### Freshness và archive coverage

- Header hiển thị thời điểm dữ liệu chính theo metadata backend trả về ở dạng text gọn.
- `partitionCoverage` và `archiveIncluded` vẫn là metadata backend/report bắt buộc, nhưng không render thành badge thường trực trong header Dashboard.
- Kỳ dài có archive phải ghi rõ “gồm dữ liệu lưu trữ”; nếu chỉ có dữ liệu một phần, không được trình bày như báo cáo đầy đủ.

### KPI chính

Hiển thị đúng 4 KPI:

1. Doanh thu thuần
2. Đơn hoàn tất
3. Đã thu
4. Phải thu / quá hạn

Rule:

- KPI dùng tabular numbers.
- KPI không dùng top accent strip/line trang trí hoặc border highlight riêng; 4 KPI chính đồng nhất về border/elevation.
- Phân cấp KPI bằng typography, spacing, border, elevation và icon tint nhẹ.
- Trend/status dùng semantic badge, không dùng màu tùy tiện.

### Biểu đồ doanh thu

- Biểu đồ doanh thu theo thời gian.
- So sánh kỳ đang xem với kỳ trước.
- Có legend phân biệt kỳ hiện tại/kỳ trước.
- Có tóm tắt số và câu insight ngắn ngay trong summary.
- Không hiển thị block riêng “Tín hiệu quyết định” trong vùng biểu đồ.
- Có đường dẫn/mở báo cáo đầy đủ nếu cần drill-down.

### Việc cần quyết định

- Danh sách việc cần xử lý theo tác động, tuổi việc và hạn xử lý.
- Nội dung ưu tiên hiện tại:
  - Tồn thấp cần xử lý.
  - Lô/hàng sắp hết hạn cần luân chuyển; drill-down phải giữ Warehouse, SKU/lô, số lượng và hạn xử lý.
  - Đơn nhập tay quá SLA xác nhận.
  - Chênh lệch ca cần đối soát.
  - Công nợ quá hạn cần theo dõi.
- Không dùng vertical priority rail/line màu ở đầu từng item.
- Ưu tiên được thể hiện bằng icon semantic, copy rõ ràng và CTA.

### Đơn nhập tay cần xử lý

- Chỉ hiển thị đơn hợp lệ đang chờ thao tác.
- Không bao gồm nháp, từ chối hoặc đã hủy.
- Nguồn nhập tay được phép:
  - Điện thoại
  - Tin nhắn khách hàng
  - Khách đặt trước
  - Nhân viên tạo
- Không thêm nguồn online hoặc integration-specific nếu chưa có requirement.

### Theo dõi thứ cấp

- Các việc quan trọng nhưng không cạnh tranh với queue ưu tiên chính.
- Có restricted state cho dữ liệu giá vốn/lợi nhuận nếu vai trò không có quyền.
- Có tóm tắt “Hoạt động gần đây” gồm tối đa ba sự kiện, chỉ trong phạm vi người dùng được phép xem.

> **Điều kiện triển khai:** “Hoạt động gần đây” hiện là pattern thị giác trong handoff, chưa là requirement có projection/query và permission contract trong SRS/LLD. Không dùng Audit Log như nguồn thay thế. Chỉ implement dữ liệu thật sau khi nguồn dữ liệu và quyền truy cập được phê duyệt.

### State bắt buộc

- Loading
- Empty
- Error có thể thử lại
- Restricted/không có quyền
- Scope không hợp lệ/đã thay đổi, không có fallback dữ liệu rộng hơn.
- Dữ liệu cũ hoặc lỗi kết nối: hiển thị thời điểm dữ liệu và CTA thử lại; không cam kết ghi offline hay đồng bộ sau mất Internet.
- Archive chưa sẵn sàng: giữ bộ lọc/phạm vi/as-of, nêu rõ coverage đang có và cho thử lại tải partition lưu trữ.
- Command đang xử lý: giữ nguyên nhãn nút, chỉ thêm loading icon; ngăn submit trùng và tra cứu kết quả theo `commandId`/idempotency trước khi cho retry.

## Rule UI cần giữ khi code

- Không dùng native `<select>` cho bộ chọn chi nhánh/kho/khoảng thời gian.
- Theme toggle là một icon button ở header.
- Submit/loading button chỉ show loading icon, không đổi text nếu không có yêu cầu khác.
- Không dùng font mono cho số liệu; dùng Outfit với tabular numbers.
- Không tạo token/palette/radius/shadow cục bộ ngoài Cenio Core.
- Header ready-state chỉ hiển thị `generatedAt`/`asOf` dạng text gọn; không hiển thị badge thường trực về độ sẵn sàng hay coverage. Coverage chỉ xuất hiện khi kỳ có archive/partial coverage hoặc trong recovery state tương ứng.
- Ready view không hiển thị state gallery hay checklist benchmark. State/recovery phải được gọi theo tình huống.
- Queue count và các trạng thái cần xử lý dùng pattern contextual trong vùng nội dung, không dùng lại `data-state`/ready badge của header.
- Không hiển thị số liệu giá vốn/lợi nhuận nhạy cảm nếu user thiếu quyền.
- Không suy diễn dữ liệu tài chính, công nợ hoặc chênh lệch ca từ UI khi backend không trả quyền/row/field tương ứng.
- Không thêm nhãn/kênh: Website, Zalo OA, Sàn thương mại điện tử, Shopee, TikTok, Carrier, Bank.

## Acceptance checklist

- [ ] Đọc registry và artifact `app-shell-dashboard.html` trước khi code.
- [ ] Layout desktop bám theo artifact đã duyệt.
- [ ] Responsive tablet/mobile không vỡ AppShell, KPI, chart, queue và table.
- [ ] Light/dark theme hoạt động.
- [ ] Có đúng 4 KPI chính.
- [ ] KPI không có top accent strip hoặc border highlight riêng.
- [ ] Biểu đồ không có block “Tín hiệu quyết định”.
- [ ] Queue không có vertical priority rail/line màu.
- [ ] Không có native `<select>`.
- [ ] State loading/empty/error/restricted, scope, stale/retry, archive coverage và command đang xử lý được implement.
- [ ] Scope thay đổi xoá dữ liệu cũ và tải lại quyền/context trước khi render.
- [ ] Metadata thời điểm dữ liệu chính được hiển thị gọn trong header; không render badge “Dữ liệu sẵn sàng” hoặc “Phủ dữ liệu”.
- [ ] Không hiển thị dữ liệu sensitive khi thiếu quyền.
- [ ] Không implement dữ liệu “Hoạt động gần đây” trước khi có source/query và permission contract được phê duyệt.
- [ ] Không thêm nội dung ngoài SRS/LLD/handoff.
