# Inventory Stocktake Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-02
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `inventory-stocktake.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-stocktake.html`
- Mở bằng Chrome: `open -a "Google Chrome" "/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-stocktake.html"`

## Phạm vi

- Hash/state cần kiểm tra: `#draft`, `#in-progress`, `#count-entry`, `#movement-after-snapshot`, `#variance-reason-required`, `#submitted`, `#approval-restricted`, `#approved`, `#rejected`, `#cancelled`, `#lot-serial-count`, `#empty-scope`.
- Kiểm kê theo snapshot phạm vi cố định; movement phát sinh sau snapshot phải được đối soát, không tự ghi đè kết quả đếm.
- Ledger reconciliation chỉ được ghi thêm sau phê duyệt độc lập.

## Handoff UI

- Workbench có scope snapshot, workflow stepper, bảng dòng kỳ vọng/đếm/chênh lệch/lý do/bằng chứng, summary rail và sheet chi tiết dòng.
- Count entry và variance reason hiển thị chặn gửi rõ ràng; lot/serial có validation thiếu hoặc trùng mã.
- Movement sau snapshot là overlay độc lập để người dùng recheck trước khi gửi duyệt.
- Submitted là payload chỉ đọc; approval restricted không có cách vượt quyền; approved chỉ rõ reconciliation đã post vào sổ kho bất biến.
- Rejected và cancelled giữ lịch sử chứng từ. Empty scope mô tả hành động tiếp theo phụ thuộc quyền.

## Kết quả kiểm tra

- Đã kiểm tra 12 hash route, rule thẻ dòng mobile, 5 custom listbox, parse script và console browser không lỗi.
- Mobile 390 px không tràn root viewport; workflow stepper chuyển thành lưới gói dòng và các command, trạng thái kiểm kê chính vẫn hiển thị.
