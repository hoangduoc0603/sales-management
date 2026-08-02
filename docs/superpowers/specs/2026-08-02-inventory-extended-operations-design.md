# Thiết Kế UI Vận Hành Kho Mở Rộng

## Mục tiêu

Hoàn thiện các bề mặt vận hành Kho còn thiếu bằng ba artifact Open Design, giữ nguyên ownership chứng từ và nguyên tắc `InventoryMovement` append-only.

## Phạm vi artifact

1. `inventory-receiving-inbound.html` (Inventory / Purchasing): nhận theo PO hoặc receipt trực tiếp, nhận một phần, lot/serial, chi phí nhập, validation, approval và truy vết `PurchaseReceipt`.
2. `inventory-fulfillment-outbound.html` (Inventory / Sales / Purchasing): hàng chờ pick, cấp phát FEFO/serial, ship đơn bán, xuất trả NCC/bảo hành, thiếu tồn, ngoại lệ âm và guard idempotency.
3. `inventory-return-quarantine-nxt.html` (Inventory / Sales / Reporting): return vào quarantine, inspection Restock/KeepQuarantine/Scrap, serial trace và báo cáo nhập-xuất-tồn/thẻ kho theo kỳ.

## Boundary bắt buộc

- Purchasing sở hữu PO, Receipt và Supplier Return. Sales sở hữu order fulfillment, return và warranty. Inventory chỉ ghi movement/balance sau command hợp lệ.
- Không tạo chứng từ “nhập kho” hoặc “xuất kho” chung để sửa trực tiếp tồn. Mọi mutation giữ state machine và approval theo SRS.
- Không thêm location/bin, carrier integration, marketplace hoặc workflow ngoài SRS.

## Yêu cầu UI

- Dùng Cenio Core v0.7, AppShell, custom listbox, semantic token, light/dark theme và responsive mobile không tràn ngang.
- Mỗi artifact phải có hash route cho primary, empty, validation/restricted và command-processing state; kèm dialog/sheet cần thiết.
- Mọi bề mặt hiển thị Branch/Warehouse scope, nguồn chứng từ, actor/approver khi có và guard tránh submit trùng.

## Bao phủ nghiệp vụ

- Inbound: `SRS-INV-005`, `SRS-INV-008`, `SRS-PUR-003..008`.
- Outbound: `SRS-INV-006..008`, `SRS-INV-010`, `SRS-PUR-009`, `SRS-SAL-009..011`, `SRS-SAL-015`.
- Return, quarantine và NXT: `SRS-INV-001..003`, `SRS-INV-012`, `SRS-INV-017`, `SRS-SAL-012..015`, `SRS-ACC-012`.

## Xác minh

- Kiểm tra trực tiếp artifact mới nhất trên Open Design ở desktop và mobile 390 px.
- Xác minh hash routes, light/dark, custom controls, validation, empty/restricted/processing, console không lỗi và không root overflow.
- Registry, handoff và coverage matrix phải dùng local path tuyệt đối; không dùng URL loopback.
