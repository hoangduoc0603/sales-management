# Inventory Receiving Inbound Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-02
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `inventory-receiving-inbound.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-receiving-inbound.html`
- Mở bằng Chrome: `open -a "Google Chrome" "/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-receiving-inbound.html"`

## Phạm vi

- Hash/state cần kiểm: `#inbound`, `#po-receipt`, `#direct-receipt`, `#partial-receipt`, `#lot-serial-required`, `#cost-unallocated`, `#pending-approval`, `#approved`, `#rejected`, `#restricted`, `#empty`, `#command-processing`.
- Receipt theo PO hoặc receipt trực tiếp có quyền; nhận một phần, lô/hạn dùng/serial, giá nhập, thuế, chi phí mua và đính kèm.
- Chỉ receipt `Approved` mới tạo `PurchaseReceipt`, tăng tồn và cập nhật giá vốn. PO, supplier và payable thuộc Purchasing.

## Handoff UI

- Queue nhận hàng và chứng từ đang mở đồng thời hiển thị scope Branch/Kho, nguồn PO/direct, phần đã nhận/còn mở và tác động sổ kho.
- Dòng receipt mở sheet chi tiết lô/serial; allocation reconciliation và quantity/trace validation chặn submit rõ ràng.
- Over-receipt cần lý do và Manager approval; rejected là snapshot chỉ đọc có actor/approver. Trạng thái empty, restricted và command-processing là surface riêng.

## Quy tắc triển khai

- Không biến artifact thành supplier master, supplier payment hoặc thao tác sửa trực tiếp `InventoryBalance`.
- Command gửi duyệt/phê duyệt phải idempotent, giữ nhãn action và chỉ có loading icon khi đang xử lý.
- Mobile 390 px chuyển line table thành thẻ; workflow gói dòng, không có root overflow.
