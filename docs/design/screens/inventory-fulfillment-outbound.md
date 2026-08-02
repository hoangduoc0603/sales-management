# Inventory Fulfillment Outbound Handoff

## Trạng thái

- Status: `Review`
- Ngày thiết kế: 2026-08-02
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `inventory-fulfillment-outbound.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-fulfillment-outbound.html`
- Mở bằng Chrome: `open -a "Google Chrome" "/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-fulfillment-outbound.html"`

## Phạm vi

- Hash/state cần kiểm: `#pick-queue`, `#pick-detail`, `#lot-fefo`, `#serial-required`, `#ready-to-ship`, `#shipped`, `#insufficient-stock`, `#negative-stock-exception`, `#supplier-return`, `#warranty-issue`, `#restricted`, `#empty`, `#command-processing`.
- Pick/pack/ship đơn bán, FEFO/serial, thiếu tồn, ngoại lệ âm, trả NCC và xuất bảo hành theo chứng từ nguồn.
- SaleIssue chỉ có khi đơn Sales `Shipped`; PurchaseReturn chỉ có khi Supplier Return `Approved`. Không có form tạo “Xuất kho” chung.

## Handoff UI

- Pick queue cho biết chứng từ nguồn, SLA, reservation, số yêu cầu/đã pick/đã xuất; pick detail hỗ trợ scan, gợi ý FEFO, override có lý do và chọn serial.
- Ship confirmation, attachment, trạng thái đã xuất và duplicate guard là các surface tách biệt.
- Thiếu tồn chặn command; ngoại lệ âm yêu cầu lý do chuẩn, người duyệt Manager/Owner và chi phí tạm khi Warehouse không có giá vốn hợp lệ.

## Quy tắc triển khai

- Supplier Return/Warranty Issue luôn hiển thị nguồn, giới hạn số lượng và trace trước khi chuyển command tương ứng.
- Không hiển thị hoặc suy diễn giá vốn khi user thiếu quyền; backend trả restricted state.
- Mobile 390 px dùng card lines/workflow gói dòng, không tràn root viewport.
