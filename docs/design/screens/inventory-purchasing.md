# Inventory & Purchasing Design Handoff

## Trạng thái

- Status: `Approved` — đã được người dùng duyệt, được dùng làm nguồn triển khai UI.
- Ngày thiết kế: 2026-07-26
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `inventory-purchasing.html`

## Hash/state cần verify

- `#inventory`
- `#transfer`
- `#purchase`

## Phạm vi artifact

- Tổng quan tồn, stock card/movement, lot/serial/hạn dùng và trạng thái unavailable theo Branch/Warehouse scope.
- Điều chỉnh, scrap, âm kho có lý do/attachment/approval; transfer và stocktake theo state machine, gồm partial receive và movement sau snapshot.
- Supplier, PO, Goods Receipt, landed cost, late-cost variance và Return NCC với liên kết chứng từ/thanh toán.

## Quy tắc bắt buộc khi triển khai

- Theo `SRS-INV-001..017`, `SRS-PUR-001..011`, `SRS-FIN-004..006` cùng LLD Inventory/Purchasing/Finance.
- `InventoryMovement` và Cash/Payable ledger là bất biến; approval mới tạo movement/balance/payable. Không sửa trực tiếp số tồn, giá vốn hoặc công nợ.
- Cost/payable chỉ render từ projection backend đã lọc quyền. Custom listbox, theme icon, semantic tokens Core v0.7 và loading icon-only theo rule chung.

## Kiểm tra thiết kế đã thực hiện

- Dark selected/subtle 9.22:1; dark filled primary 5.94:1.
- Không native select hay nguồn/integration ngoài phạm vi.
- Có state loading/empty/error/restricted/scope/command; SVG và render desktop đã được kiểm tra.
