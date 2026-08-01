# SRS — Truy cập, báo cáo và vận hành dữ liệu

**Phụ thuộc:** [`overview.md`](overview.md), tất cả mô-đun nghiệp vụ trong `docs/product/srs/`  
**Tiền tố yêu cầu:** `SRS-ACC`

## 1. Tài khoản và phân quyền

### SRS-ACC-001 — Tài khoản nội bộ

Tài khoản ứng dụng dùng `loginId` do Admin/Owner tạo; `loginId` có thể có dạng tên tài khoản hoặc email, nhưng không liên kết Google identity. User có trạng thái `Active`, `Locked`, `Disabled` hoặc `PasswordChangeRequired`. Admin phải đặt tên hiển thị, một hoặc nhiều role, scope Branch/Warehouse khi tạo user; mật khẩu tạm chỉ hiển thị một lần cho Admin và bắt buộc đổi ở lần đăng nhập đầu.

### SRS-ACC-002 — Role và permission action

Permission phải cấp theo resource và action tối thiểu `view`, `create`, `update-draft`, `submit`, `approve`, `cancel`, `reverse`, `print`, `export`, `configure`. Role mẫu ở `overview.md` là điểm khởi đầu; Owner có thể tạo role tùy chỉnh bằng cách tổ hợp permission và scope. Backend phải từ chối yêu cầu không có permission/scope kể cả khi UI bị sửa bằng công cụ trình duyệt.

### SRS-ACC-003 — Quyền nhạy cảm tách biệt

Các quyền sau phải tách khỏi quyền xem/sửa đơn thông thường: xem giá vốn, xem lợi nhuận, xem/sửa công nợ, xem/sửa quỹ/két, export, quản lý user/role, backup/restore và thay đổi chính sách/approval threshold. Cấp quyền cao hơn không được tự động làm lộ giá vốn/lợi nhuận khi tenant không gán quyền đó.

### SRS-ACC-004 — Thay đổi quyền và user

Tạo/disable/reset password/gán role/đổi scope user phải lưu actor metadata trên record user/role/scope và lý do nếu cấu hình. Disable user hoặc giảm scope phải vô hiệu hóa phiên đang hoạt động ngay. User bị disable không đăng nhập/tạo giao dịch mới nhưng lịch sử actor vẫn phải hiển thị.

## 2. Audit, import, export và tệp đính kèm

### SRS-ACC-005 — Audit truy vấn được

Baseline không có màn hình hoặc API audit riêng. Truy vết thao tác dùng lịch sử chứng từ/ledger/source record và actor metadata tại `SRS-OVR-009`. Khi cần xem ai tạo/sửa/duyệt/hủy, UI phải lấy từ field `createdBy`, `updatedBy`, `approvedBy`, `cancelledBy` hoặc field `...By` tương ứng trên record nguồn.

### SRS-ACC-006 — Import nghiệp vụ

Import hỗ trợ tối thiểu danh mục, khách hàng, NCC và tồn đầu kỳ. Mỗi import phải đi qua: tải mẫu → upload/staging → validate schema/quy tắc nghiệp vụ/quyền → xem lỗi theo dòng → người dùng xác nhận → ghi theo batch id → báo cáo kết quả. Batch phải idempotent: gửi lại cùng batch không tạo bản ghi trùng. Tồn đầu kỳ chỉ import khi Warehouse chưa vận hành hoặc qua flow điều chỉnh có duyệt; không được đè trực tiếp số tồn.

### SRS-ACC-007 — Export dữ liệu

User có quyền export có thể xuất dữ liệu màn hình/báo cáo ở CSV hoặc XLSX, theo bộ lọc và scope quyền hiện tại. File export phải ghi thời điểm, người tạo, phạm vi/bộ lọc và không chứa cột nhạy cảm khi user thiếu quyền tương ứng. Export lớn phải chạy tác vụ nền có `runId`, trạng thái, lỗi có thể hiểu, retry an toàn và lưu `requestedBy`; export không giữ lock hoặc cạnh tranh với POS fast path.

### SRS-ACC-008 — Tệp đính kèm

File đính kèm của chứng từ, return, kiểm kho, chi phí và bảo hành được lưu ở Google Drive của tenant, với object ID, loại file, Drive file ID, người tải, thời điểm và trạng thái. User chỉ mở/tải file khi có quyền xem chứng từ và scope tương ứng; không cấp URL Drive công khai hoặc share quyền edit trực tiếp cho user nội bộ. Xóa file phải theo quyền, lưu `deletedBy/deletedAt` trên metadata và không làm mất liên kết lịch sử; nếu file bị xóa vật lý, chứng từ phải hiển thị trạng thái file không khả dụng.

## 3. Dashboard và báo cáo

### SRS-ACC-009 — Quy tắc báo cáo chung

Mọi dashboard/báo cáo phải có bộ lọc tối thiểu thời gian và scope Branch; báo cáo kho thêm Warehouse khi cần. Báo cáo phải hiển thị thời điểm tạo/số liệu, trạng thái dữ liệu/archive và tôn trọng snapshot lịch sử. Chỉ dùng dữ liệu đã hiệu lực theo trạng thái chứng từ; Draft/Rejected/Cancelled không được tính trừ khi báo cáo ghi rõ đang theo dõi chứng từ mở.

### SRS-ACC-010 — Dashboard vận hành

Dashboard phải cung cấp KPI trong scope: doanh thu, doanh thu thuần, số đơn, giá trị trả hàng, đã thu, phải thu/quá hạn, giá vốn/lợi nhuận gộp nếu có quyền, tồn, tồn dưới mức tối thiểu, hàng sắp hết hạn và chênh ca mở. KPI phải drill-down đến báo cáo/chứng từ nguồn theo permission.

### SRS-ACC-011 — Báo cáo bán hàng và khách hàng

Hệ thống phải báo cáo doanh thu gộp/thuần, giảm giá, thuế, số đơn, AOV, hàng trả, payment, COD, công nợ, nhân viên bán, khách hàng, nguồn đơn, nhóm hàng/product/variant và Branch/Warehouse. Báo cáo phải phân biệt rõ ngày tạo đơn, ngày Completed/Shipped, ngày Delivered và ngày thu tiền; người dùng chọn loại ngày trước khi lọc.

### SRS-ACC-012 — Báo cáo tồn, mua và NCC

Hệ thống phải báo cáo tồn hiện tại, nhập–xuất–tồn, thẻ kho, reserved/in-transit/quarantine, tồn theo lô/serial, hàng dưới định mức, tồn lâu, gần hết hạn, chênh kiểm, chuyển kho, PO, receipt, return NCC, giá nhập, payable và lịch thanh toán. Báo cáo giá vốn/lợi nhuận chỉ có cho permission riêng.

### SRS-ACC-013 — Báo cáo tiền và ca bán

Hệ thống phải báo cáo sổ quỹ/tài khoản, thu–chi theo loại/Branch/phương thức, payment allocation, receivable/payable aging, customer credit, chi phí, mở/đóng ca, expected/actual/variance và người phụ trách. Số liệu phải drill-down đến CashTransaction/shift/source document.

### SRS-ACC-014 — Hiệu suất và hoa hồng

Hệ thống phải báo cáo theo nhân viên: doanh thu gộp/thuần, số đơn, hàng trả, giảm giá, đã thu, công nợ phát sinh và hoa hồng snapshot/đã duyệt. Không được hiển thị giá vốn/lợi nhuận cho role không có quyền, kể cả qua export hoặc biểu đồ drill-down.

## 4. Backup, restore và vận hành quota

### SRS-ACC-015 — Vận hành backup/restore

Giao diện Owner phải hiển thị danh sách backup hằng ngày/thủ công, thời điểm, kích thước/trạng thái, actor, manifest app/schema version, danh sách partition và kết quả kiểm tra. Restore phải chạy theo `SRS-OVR-010`: freeze ghi, xác nhận backup cụ thể, tạo bộ tài nguyên phục hồi riêng, lưu `requestedBy/switchedBy`, kiểm tra tham chiếu trước/sau khi switch runtime config và thông báo trạng thái. Hệ thống không tự khôi phục khi chưa có Owner xác nhận.

### SRS-ACC-016 — Theo dõi quota và archive

Hệ thống phải ghi các lỗi/quota Apps Script, Google Sheets và Drive theo event ID/correlation ID, thời điểm, actor và tác vụ, không ghi secret. Khi đạt ngưỡng dung lượng/hiệu năng định nghĩa trong cấu hình vận hành, Owner phải nhận cảnh báo trong ứng dụng để tạo partition tiếp theo, archive hoặc xử lý; không tự xóa dữ liệu lịch sử. Cảnh báo phải gồm tối thiểu active partition capacity, backup freshness, worker backlog/failure, quota và integrity check.

### SRS-ACC-017 — Cấu hình tenant

Owner/Admin trong quyền được cấu hình thông tin doanh nghiệp, logo, địa chỉ, mã số thuế, mẫu đánh số, VAT, Branch/Warehouse, quỹ/tài khoản, phương thức thanh toán, thời hạn trả hàng, ngưỡng duyệt, chính sách nợ, policy reservation, bảng giá/promotion và mẫu in. Mọi thay đổi cấu hình phải có effective date khi tác động giá/thuế/policy giao dịch, lưu `createdBy/updatedBy` và không tính lại chứng từ lịch sử.

### SRS-ACC-018 — Khu vực Owner vận hành

Owner phải xem được app/schema/deployment version, trạng thái runtime config/folder/Spreadsheet/trigger, active/archive partition, backup gần nhất, worker lỗi, quota/capacity warning và integrity status. Khu vực này chỉ cảnh báo và hướng dẫn/khởi tạo flow được quyền; không tự xóa lịch sử hoặc tự restore dữ liệu.

## 5. Tiêu chí nghiệm thu trọng yếu

| Mã | Kịch bản kiểm thử | Kết quả bắt buộc |
| --- | --- | --- |
| ACC-AT-01 | User chỉ có Warehouse A gọi API xem tồn Warehouse B. | Backend từ chối, không trả số lượng/tên hàng ngoài scope. |
| ACC-AT-02 | Admin reset mật khẩu hoặc disable user đang đăng nhập. | Tất cả phiên của user bị thu hồi; record user/session có actor metadata nhưng không có mật khẩu. |
| ACC-AT-03 | Cashier export báo cáo bán. | File chỉ có Branch/số liệu được phép, không có COGS/lợi nhuận nếu thiếu permission; ExportRun lưu người yêu cầu. |
| ACC-AT-04 | Import danh mục có ba dòng sai và hai dòng đúng. | Hiển thị lỗi từng dòng; user chọn import dòng hợp lệ hoặc hủy batch; không có bản ghi trùng khi gửi lại batch. |
| ACC-AT-05 | Owner khôi phục backup. | Ghi bị freeze, yêu cầu xác nhận bản backup, RestoreRun lưu người yêu cầu/người switch và kết quả kiểm tra tham chiếu. |
| ACC-AT-06 | Viewer mở dashboard lợi nhuận qua URL/báo cáo. | KPI/cột lợi nhuận bị từ chối ở backend, không chỉ bị ẩn UI. |
