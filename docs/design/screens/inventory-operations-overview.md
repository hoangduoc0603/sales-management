# Inventory Operations Overview Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-02
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `inventory-operations-overview.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-operations-overview.html`
- Mở bằng Chrome: `open -a "Google Chrome" "/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-operations-overview.html"`

## Phạm vi

- Hash/state cần kiểm tra: `#overview`, `#alerts`, `#lot-serial`, `#reservation`, `#trace`, `#empty`, `#restricted`, `#scope-changed`.
- Tổng quan tồn theo biến thể, cảnh báo, lô/serial, giữ chỗ và truy xuất movement trong phạm vi Chi nhánh + Kho hiện hành.
- Bảo toàn nguyên tắc ledger bất biến, số dư chỉ đọc và khả dụng không bao gồm hàng đang chuyển hoặc quarantine.

## Handoff UI

- AppShell Cenio Core: global scope, breadcrumb, theme light/dark.
- Sidebar chính có section riêng `Kho`; các menu nghiệp vụ cấp 1 là `Tồn kho`, `Nhập kho`, `Xuất kho`, `Điều chuyển`, `Kiểm kê`, `Điều chỉnh`, `Báo cáo NXT`.
- Trong màn `Tồn kho`, các state `Cảnh báo`, `Lô & serial`, `Giữ chỗ`, `Truy xuất`, empty, restricted và scope changed là view nội bộ theo hash/state; không render tab ngang và không đưa thành menu cấp 1 riêng.
- Bảng desktop có tìm kiếm và custom listbox cho trạng thái, cảnh báo, theo dõi; mobile chuyển thành thẻ tồn, không tràn ngang viewport 390 px.
- Cảnh báo có tồn thấp, lô gần hạn, serial bất thường và di chuyển chậm.
- Trace là read-only; có bộ lọc chứng từ nguồn và không mở thao tác chỉnh số dư.
- Trạng thái restricted ẩn giá vốn/giá trị tồn; scope changed yêu cầu tải lại dữ liệu theo phạm vi mới.

## Kết quả kiểm tra

- Đã kiểm tra render desktop/mobile, 8 hash route, filter `Di chuyển chậm`, filter chứng từ nguồn và theme toggle.
- Mobile 390 px: root không tràn ngang, 5 tab hiển thị trực tiếp trong lưới 2 hàng.
