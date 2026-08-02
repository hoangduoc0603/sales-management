# Inventory Transfer & Receive Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-02
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `inventory-transfer-receive.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-transfer-receive.html`
- Mở bằng Chrome: `open -a "Google Chrome" "/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-transfer-receive.html"`

## Phạm vi

- Hash/state cần kiểm tra: `#draft`, `#pending-approval`, `#approved`, `#pick-ship`, `#partially-received`, `#received`, `#variance`, `#cancel-guard`, `#lot-serial-required`, `#restricted`.
- Điều chuyển theo chứng từ: nháp, duyệt, pick/ship, đang chuyển, nhận một phần, nhận đủ và chênh lệch.
- Hàng đã ship ở trạng thái đang chuyển, không khả dụng để bán và chưa làm tăng tồn thực tế tại kho nhận.

## Handoff UI

- Document header có kho nguồn/đích, workflow stepper, bảng dòng với khả dụng nguồn, yêu cầu, đã ship, đã nhận, đang chuyển và mã truy vết.
- Pending approval hiển thị snapshot chỉ đọc và phân tách người tạo/người duyệt.
- Pick/ship có dialog xác nhận và bằng chứng giao hàng; khoá gửi trùng sau khi ship.
- Partially received và variance đối soát số ship/nhận/còn đang chuyển, có bằng chứng và quyết định xử lý rõ ràng.
- Cancel guard chỉ cho huỷ ở mốc hợp lệ; sau khi có movement dùng chứng từ điều chỉnh, không xoá lịch sử.
- Lot/serial thiếu bắt buộc chặn ship/receive; restricted không hiển thị chi phí/giá trị tồn.

## Kết quả kiểm tra

- Đã kiểm tra đủ 10 hash route, render mobile 390 px, cấu trúc thẻ dòng mobile và console browser không lỗi.
- Mobile không tràn root viewport. Workflow stepper chuyển thành lưới gói dòng để hiển thị đủ mốc mà không có scrollbar nội bộ.
