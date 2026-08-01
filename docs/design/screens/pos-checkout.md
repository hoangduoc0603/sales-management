# POS Checkout Design Handoff

## Trạng thái

- Status: `Approved`
- Ngày chốt: 2026-08-01
- Cập nhật triển khai: 2026-07-28 — POS chạy trong AppShell/Header chung khi truy cập từ ứng dụng chính.
- Cập nhật correction: 2026-08-01 — user chip/avatar dùng selector scoped; màn ready bắt đầu bằng ô quét/tìm ngay sau AppShell, không có page-level POS header riêng.
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact chính: `app-pos-checkout.html`
- Handoff trong Open Design: `brand-spec.md`

## Hash/state cần verify

- State chính: checkout ready/default.
- Recovery/state bắt buộc kiểm khi implement: empty cart, scan no result/multiple result, lot/serial required, permission restricted, stale cache, checkout timeout, complete success và receipt preview nếu state nằm trong artifact liên quan.

## Tài liệu nghiệp vụ/kỹ thuật liên quan

- SRS nền tảng: `docs/product/srs/overview.md`
  - `SRS-OVR-002`
  - `SRS-OVR-004`
  - `SRS-OVR-013` đến `SRS-OVR-017`
  - `SRS-OVR-020`
  - `SRS-OVR-024`
- SRS Sales: `docs/product/srs/sales-orders.md`
  - `SRS-SAL-001` đến `SRS-SAL-010`
  - `SRS-SAL-016`, `SRS-SAL-017`
- SRS Catalog/CRM: `docs/product/srs/customers-promotions.md`
  - `SRS-CRM-002` đến `SRS-CRM-005`
  - `SRS-CRM-009` đến `SRS-CRM-013`
- SRS Inventory: `docs/product/srs/inventory.md`
  - `SRS-INV-006`, `SRS-INV-008`, `SRS-INV-010`
- SRS Finance: `docs/product/srs/finance.md`
  - `SRS-FIN-003`, `SRS-FIN-005`, `SRS-FIN-007` đến `SRS-FIN-010`
- LLD module: `docs/architecture/modules/sales-pos-returns.md`
- LLD liên quan: `docs/architecture/modules/catalog-crm.md`, `docs/architecture/modules/inventory.md`, `docs/architecture/modules/finance-shifts.md`
- Data dictionary: `docs/data-model/tables/sales-inventory.md`, `docs/data-model/tables/catalog-crm.md`, `docs/data-model/tables/purchasing-finance.md`
- ADR liên quan:
  - `docs/decisions/0004-performance-first-pos.md`
  - `docs/decisions/0005-command-journal-idempotency-short-lock.md`
  - `docs/decisions/0009-single-rpc-api-gateway.md`
  - `docs/decisions/0011-variant-as-transactional-unit.md`
  - `docs/decisions/0012-quote-then-commit-commercial-policy.md`
  - `docs/decisions/0013-explicit-save-pos-draft.md`
  - `docs/decisions/0014-scaled-quantity-integer-inventory-value.md`

## Mục tiêu màn hình

POS Checkout là màn bán hàng tại quầy, ưu tiên tốc độ thao tác cho thu ngân. Người dùng phải quét/tìm hàng, xử lý giỏ, chọn thông tin giao dịch và hoàn tất thanh toán trong một workspace desktop rõ ràng; các lỗi kiểm tra nghiệp vụ phải chỉ đúng điểm cần xử lý mà không làm mất giỏ.

Màn này không bao gồm danh sách/chi tiết đơn, đơn online nhập tay, trả/đổi hàng hoặc cấu hình/mở–đóng ca. Các luồng đó cần artifact và handoff riêng trước khi code.

## Nội dung và hierarchy bắt buộc

### Header và AppShell

- Khi POS được mở từ navigation chính, màn hình phải dùng AppShell/Header chung của ứng dụng: brand, sidebar, Branch/Warehouse selector, theme toggle, notification và user menu không được dựng lại trong POS.
- Không thêm badge/header riêng kiểu “Ca POS đang mở” hoặc “Dữ liệu quầy sẵn sàng” trên header chung chỉ để phục vụ POS. Trạng thái ca/két tiền và cache POS nếu cần phải nằm trong nội dung POS hoặc recovery state theo đúng mức ưu tiên nghiệp vụ.
- Chế độ header POS standalone chỉ phục vụ preview/debug độc lập của artifact POS; không dùng cho route `Bán hàng` trong app chính.
- Không cho đổi sang Branch/Warehouse ngoài scope; Warehouse không bán trực tiếp không được là context tạo đơn.

### Bố cục

- Desktop có hai vùng: workspace quét/tìm và xử lý hàng ở bên trái; panel checkout sticky ở bên phải.
- Trên màn hẹp, ô quét/tìm vẫn là điểm vào đầu tiên; giỏ, tổng tiền và CTA hoàn tất luôn truy cập được, không bị che khuất.

### Vùng thao tác hàng hóa

- Ô quét/tìm nổi bật, nhận barcode scanner như keyboard và tìm theo barcode, SKU hoặc tên.
- Danh sách kết quả/gợi ý hiển thị rõ tên variant, SKU/barcode, đơn vị, giá và thông tin tồn tham khảo khi có.
- Phân biệt hàng có lô/hạn dùng hoặc serial/IMEI để mở bước chọn bắt buộc trước khi hoàn tất.
- Có vị trí cho tạo/chọn khách nhanh, nhân viên bán, ghi chú và phí giao hàng khi user có quyền.

### Giỏ và checkout

- Giỏ hiển thị dòng hàng, đơn vị giao dịch, số lượng, đơn giá, giảm giá và tổng dòng; cho phép tăng/giảm số lượng và chỉnh trong quyền.
- Có vùng promotion, voucher và điểm; hiển thị policy áp dụng hoặc lý do không áp dụng theo dữ liệu server/cache.
- Tổng kết gồm tạm tính, giảm giá, VAT, phí giao hàng, tổng phải trả, đã nhận và còn phải thu/tiền thừa.
- Tender hỗ trợ tiền mặt, chuyển khoản thủ công, QR hiển thị, thẻ và bán chịu theo cấu hình; có thể có nhiều khoản/phương thức trong một đơn.
- Action rõ ràng: lưu nháp, mở nháp, hủy giỏ và hoàn tất. Loading của nút hoàn tất chỉ thêm icon loading, không đổi text.

### States và recovery

- Chưa mở ca hoặc ca/két không phù hợp khi policy bắt buộc ca.
- Giỏ trống.
- Barcode/từ khóa không có kết quả hoặc có nhiều kết quả: không tự thêm sai hàng.
- Tồn không đủ, lô/serial bắt buộc, giá/giảm giá vượt quyền hoặc chờ duyệt ngoại lệ.
- Checkout timeout: tra cứu `commandId`/gửi lại cùng idempotency key, không tạo đơn hoặc khoản thu thứ hai.
- Dữ liệu cache thay đổi: hiển thị conflict giá, promotion hoặc tồn và yêu cầu thu ngân xác nhận dữ liệu mới trước command mới.
- Hoàn tất thành công: trả receipt snapshot; xem trước/in/in lại là action riêng, không tạo ledger mới.

## Ranh giới nghiệp vụ và hiệu năng

- Scan, tìm hàng, thêm hàng, chỉnh quantity và tính giỏ chạy từ read-only browser cache đã version hóa sau khi POS sẵn sàng. Không gọi Apps Script cho từng thao tác này.
- `saveDraft` là action tường minh; không autosave giỏ. Reload có thể mất giỏ chưa lưu nhưng Draft đã lưu mở lại được trong scope Branch/Warehouse.
- `complete` gửi một command có `commandId`/idempotency key; backend phải revalidate scope, giá, promotion, tồn, lô/serial, credit, ca bán và tổng tender trước commit atomic.
- Tender trong giỏ là dữ liệu tạm. Payment/CashTransaction, receivable, InventoryMovement và receipt bất biến chỉ được tạo khi checkout thành công.
- Đơn `Completed` không sửa hoặc hủy trực tiếp; sửa sai qua return/reversal theo nghiệp vụ.

## Rule UI cần giữ khi code

- Bám AppShell, component, token, typography và semantic color của Cenio Core v0.7; không tạo palette, radius, shadow hay spacing system cục bộ.
- Ready view dùng AppShell/Header chung; không hiển thị header POS riêng, badge ca/cache "sẵn sàng" hoặc state gallery. State ca, giỏ trống, conflict, timeout và receipt mở theo context/recovery tương ứng.
- Ô quét/tìm là entry đầu tiên trong nội dung sau AppShell; không đặt title/header nội dung POS phía trên ô quét. Các hành động phụ như trạng thái ca hoặc phiếu vừa hoàn tất nằm trong scan panel hoặc contextual recovery.
- User chip phải scope text layout vào `.user-copy` hoặc component tương đương; avatar initials không được kế thừa selector rộng kiểu `.user span` làm lệch căn giữa.
- Desktop-first, ưu tiên vùng scan/tìm và checkout dễ thao tác; responsive không được làm mất CTA hay che giỏ/tổng tiền.
- Không dùng native `<select>`; dùng custom select/listbox hoặc shadcn Select style theo Cenio Core.
- Theme toggle là icon button ở AppShell header chung; light/dark theme phải hoạt động.
- Các button submit/loading giữ nguyên label và chỉ thêm loading icon.
- Số lượng và tiền dùng tabular numbers với Outfit, không dùng mono font.
- Không hiển thị giá vốn, lợi nhuận hoặc dữ liệu ngoài quyền. Không dùng UI để thay cho permission check backend.
- Không thêm kênh bán/tích hợp ngoài phạm vi: Website, Zalo OA, sàn thương mại điện tử, Shopee, TikTok, carrier hoặc bank integration.
- Tên hàng, khách, kho, mã ca, danh mục, số tiền, số lượng card và các phương thức tender minh họa trong prototype không phải requirement cố định; lấy từ dữ liệu và cấu hình thực tế trong scope user.

## Acceptance checklist

- [ ] Đọc registry và artifact `app-pos-checkout.html` trước khi code.
- [ ] Route POS trong ứng dụng chính dùng AppShell/Header chung; không render header POS riêng hoặc badge header riêng “Ca POS đang mở”, “Dữ liệu quầy sẵn sàng”.
- [ ] POS giữ desktop checkout shell: vùng scan/tìm hàng, workspace giỏ và tổng kết/hoàn tất.
- [ ] Scan/tìm/thay đổi giỏ không phát sinh RPC từng thao tác khi cache sẵn sàng.
- [ ] Có Branch/Warehouse đúng scope từ AppShell; trạng thái ca bán/két tiền hiển thị trong nội dung POS/recovery khi nghiệp vụ yêu cầu.
- [ ] Có custom select/listbox, không có native `<select>`.
- [ ] Có tạo/chọn khách, đơn vị, lô/serial, giá/giảm, promotion/voucher/điểm theo quyền và dữ liệu nghiệp vụ.
- [ ] Có payment/tender, bán chịu, tiền thừa hoặc còn phải thu theo cấu hình.
- [ ] Có action tường minh lưu/mở/hủy Draft; không autosave giỏ.
- [ ] Checkout xử lý loading, lỗi validation, timeout/idempotency và cache conflict không tạo chứng từ trùng.
- [ ] Hoàn tất trả receipt snapshot; print/reprint là action riêng.
- [ ] Light/dark theme hoạt động; không hiển thị COGS/lợi nhuận nếu thiếu quyền.
- [ ] Responsive tablet/mobile không che ô scan, giỏ, tổng tiền hoặc CTA hoàn tất.
