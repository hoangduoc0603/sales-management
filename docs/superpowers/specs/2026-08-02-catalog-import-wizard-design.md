# Catalog Import Wizard Design

## Mục tiêu

Thiết kế luồng nhập hàng loạt Product/Variant an toàn, dễ kiểm tra và không làm gián đoạn vận hành. Luồng chỉ tạo mới danh mục; SKU hoặc barcode đã tồn tại phải là lỗi theo dòng và không được ghi đè.

## Phạm vi

- Điểm vào là CTA `Nhập dữ liệu` tại màn `Hàng hóa & biến thể`.
- Chỉ import `Catalog` (Product/Variant). Customer, Supplier và OpeningInventory là luồng import độc lập.
- Hỗ trợ CSV và XLSX; file được đưa vào staging riêng tư trước khi tạo dữ liệu nghiệp vụ.
- Không bao gồm bulk-update/upsert, ghi đè Product/Variant hiện có, hoặc cập nhật tồn kho trực tiếp.

## Luồng và trạng thái

### 1. Chọn tệp

- Mở modal rộng trên desktop và full-screen sheet trên mobile, tiêu đề `Nhập danh mục hàng hóa`.
- Copy bắt buộc: `Chỉ tạo mới. SKU hoặc barcode đã tồn tại sẽ được báo lỗi và không ghi đè.`
- Có CTA phụ `Tải file mẫu` và dropzone chọn CSV/XLSX.
- Phần trợ giúp chỉ liệt kê các nhóm cột: thông tin Product, Variant/SKU, giá/đơn vị và cấu hình tồn/truy vết. Không hiển thị bảng schema dài khi chưa cần.
- Các state: chưa chọn file, drag-over, đang tải file, file không hỗ trợ hoặc upload thất bại.

### 2. Kiểm tra staging

- Sau upload, backend validate schema, required field, type/rule domain, quyền/scope, duplicate nội bộ batch và duplicate với Catalog hiện có.
- Modal hiển thị stepper không-clickable: `1. Chọn tệp` → `2. Kiểm tra` → `3. Xác nhận`.
- Khu vực summary có total row count, valid count và invalid count bằng semantic badge; không dùng màu đơn lẻ để truyền nghĩa.
- Preview mặc định ưu tiên lỗi. Có custom filter `Tất cả`, `Lỗi`, `Hợp lệ`.
- Desktop dùng bảng row number, product/variant identifier, field và message; mobile dùng card theo dòng, không tạo horizontal scroll.
- Có CTA `Tải báo cáo lỗi`, `Chọn tệp khác` và quay lại bước trước. Khi không có lỗi, state success phải vẫn cho xem summary nhưng không chiếm diện tích bằng bảng trống.

### 3. Xác nhận

- Với batch có lỗi, radio choice có hai mode kỹ thuật: `Chỉ nhập <validCount> dòng hợp lệ` (enabled/default) và `Nhập toàn bộ` (disabled, helper giải thích còn lỗi).
- Với batch không lỗi, chỉ hiển thị summary `Sẵn sàng nhập <rowCount> dòng` và CTA chính `Nhập <rowCount> dòng`.
- Trước khi commit, người dùng được `Hủy batch`; hủy không sửa Catalog.
- CTA commit giữ nguyên nhãn và chỉ thêm loading icon trong khi gọi command.

### 4. Commit nền và kết quả

- Sau xác nhận, modal thể hiện tiến độ `Đang nhập x/y dòng`, progress bar, batch ID và copy rằng có thể đóng sheet; worker tiếp tục theo batch/checkpoint.
- Không đặt CTA cancel sau khi batch đã vào `Committing`, tránh hiểu sai về atomicity. Có CTA `Đóng` an toàn.
- State hoàn tất phân biệt số committed/skipped/failed; cung cấp `Xem hàng hóa` và `Tải báo cáo kết quả`.
- State lỗi có message đã sanitize, batch ID và CTA `Thử lại` idempotent; không khuyến khích upload lại file chỉ để retry batch cũ.

### 5. Phân quyền và khả năng truy cập

- Người không có `operations.import.manage` không được khởi chạy hoặc commit import; hiển thị restricted state có lý do, không trả schema/file/batch detail.
- Tất cả action có focus, keyboard và `Escape` chỉ đóng popover/dialog khi chưa commit.
- Touch target tối thiểu 44px, error đặt gần dòng lỗi, contrast dùng token semantic Cenio Core v0.7 ở light/dark theme.

## Mapping dữ liệu và ranh giới

- UI dùng `ImportBatch` + `ImportStagingRow`; backend là nguồn xác định valid/invalid và trạng thái commit.
- Import Catalog tạo Product/Variant qua service nghiệp vụ domain, không ghi Sheet/cân bằng tồn trực tiếp.
- Mỗi commit record phải có actor metadata. Retry cùng batch/row key không tạo bản ghi trùng.
- Tồn đầu kỳ chỉ đi qua flow Inventory được phép, ngoài wizard này.

## Responsive

- Desktop: modal utility mở rộng có stepper ngang, bảng lỗi cuộn trong phần body riêng, footer cố định trong modal.
- Mobile: sheet toàn màn hình, stepper rút gọn, summary theo stack, preview lỗi card-list, footer safe-area.
- Không có bảng hay control bắt buộc scroll ngang trên mobile.

## Acceptance criteria

- Có đủ các state chọn file, upload lỗi, validation lỗi, validation pass, xác nhận, committing, completed, retryable error và restricted.
- Duplicate SKU/barcode luôn được trình bày là lỗi theo dòng; UI không có copy hoặc action ghi đè.
- Import không tạo dữ liệu nghiệp vụ trước khi người dùng xác nhận batch.
- Người dùng có thể chỉ nhập các dòng hợp lệ và nhận lại kết quả có thể tải.
- Design dùng Cenio Core v0.7, light/dark, keyboard và mobile responsive.

## Nguồn

- `docs/product/srs/access-reporting.md` — SRS-ACC-006.
- `docs/product/srs/customers-promotions.md` — SRS-CRM-006.
- `docs/architecture/modules/administration-reporting-operations.md` §3.
- `docs/architecture/modules/catalog-crm.md` §2.
- `docs/data-model/tables/operations-reporting.md` §2.
