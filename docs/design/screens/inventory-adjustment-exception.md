# Inventory Adjustment & Exception Handoff

## Trạng thái

- Status: `Review`
- Ngày thiết kế: 2026-08-02
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `inventory-adjustment-exception.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-adjustment-exception.html`

## Phạm vi

- Hash/state cần kiểm tra: `#opening-balance`, `#adjustment-draft`, `#pending-approval`, `#rejected`, `#scrap`, `#negative-stock`, `#temporary-cost`, `#permission-restricted`, `#attachment-required`, `#command-processing`.
- Điều chỉnh là chứng từ có lý do, bằng chứng và phân tách người tạo/người duyệt; không có UI chỉnh số dư trực tiếp.
- Số dư đầu kỳ là luồng đặc quyền, có baseline và xác nhận rủi ro cao; không thay thế điều chỉnh vận hành.

## Handoff UI

- Workbench gồm document header, dòng điều chỉnh, dự báo tồn trước/sau, summary rail, bằng chứng/bình luận và sheet chi tiết dòng.
- Dòng giảm gây âm tồn bị chặn trước khi gửi. Dòng lot/serial thiếu mã bị chặn theo validation.
- Chờ duyệt là snapshot chỉ đọc, người tạo không tự duyệt; rejected chuyển sang tạo bản chỉnh sửa có truy vết.
- Scrap yêu cầu bằng chứng; giá vốn tạm tính chỉ là trạng thái, restricted không hiển thị giá vốn/giá trị tồn.
- Mọi listbox là popover custom, có dialog xác nhận số dư đầu kỳ, theme light/dark và responsive thẻ dòng ở 390 px.

## Kết quả kiểm tra

- Đã kiểm tra 10 hash route, dialog xác nhận số dư đầu kỳ, mobile 390 px, theme toggle và console browser không lỗi.
- Mobile không tràn root viewport và vẫn giữ command/chốt chặn nghiệp vụ quan trọng.
