# Sales Orders, Returns & Warranty Design Handoff

## Trạng thái

- Status: `Approved` — đã được người dùng duyệt, được dùng làm nguồn triển khai UI.
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `sales-orders-returns.html`

## Phạm vi artifact

- Workspace danh sách đơn với filter/search theo scope, nguồn `POS`/`ManualOnline`, trạng thái đơn/thanh toán và bulk action chỉ cho chứng từ Draft.
- Detail chứng từ bất biến: header, dòng snapshot, payment/allocation, tham chiếu ledger, audit summary, preview/in/in lại/export. COGS/lợi nhuận dùng restricted state từ backend permission.
- Đơn nhập tay theo lifecycle `Draft → Confirmed → Packing → Shipped → Delivered`; chỉ hủy trước `Shipped`, hiển thị reservation, recipient/fulfillment snapshot và COD/deposit phù hợp.
- Return theo đơn gốc, fast return có permission/approval riêng, inspection `Quarantine`/`Restock`/`Scrap`, refund/credit đối ứng và exchange liên kết Return với Sale Order mới.
- Warranty list/case theo serial, đơn gốc, attachment và lifecycle xử lý.
- State demo POS còn thiếu: chọn/tạo khách, đơn vị, lô/serial, price override, promotion/voucher/points, tender, draft rõ ràng, conflict/idempotency, receipt K80/A4/reprint.

## Quy tắc bắt buộc khi triển khai

- Đọc SRS `sales-orders.md`, `customers-promotions.md`, `inventory.md`, `finance.md`; LLD `sales-pos-returns.md`, `catalog-crm.md`, `inventory.md`, `finance-shifts.md` và ADR được POS handoff dẫn chiếu.
- Không sửa trực tiếp chứng từ `Completed`/`Shipped`, Payment hay ledger; return/reversal là chứng từ đối ứng.
- Không dùng native `<select>`; dùng custom listbox theo Cenio Core. Theme icon ở header và các cặp semantic token light/dark phải giữ đúng contract v0.7.
- Visual theo hướng TailAdmin-inspired: AppShell dark/light đồng bộ, sidebar/top tabs có deep link hash cho các workspace đơn bán, đơn nhập tay, trả/đổi và bảo hành theo artifact.
- Loading command giữ nhãn action và chỉ hiển thị icon loading. UI không được suy diễn quyền, scope, tồn, giá, promotion hay kết quả command.
- Không thêm kênh/integration ngoài phạm vi; nguồn đơn nhập tay chỉ gồm Điện thoại, Tin nhắn khách hàng, Khách đặt trước và Nhân viên tạo.

## Kiểm tra thiết kế đã thực hiện

- Dark selected/subtle: 9.22:1; dark filled primary: 5.94:1.
- Không có native select, gradient, selector user rộng hay nguồn/integration cấm trong artifact.
- Có loading, empty, error, restricted, scope invalid, stale/retry, archive coverage và command-in-progress.
- State lab ẩn khỏi ready view; render desktop, SVG references và script parse đã được kiểm tra bởi Open Design/verification cục bộ.
