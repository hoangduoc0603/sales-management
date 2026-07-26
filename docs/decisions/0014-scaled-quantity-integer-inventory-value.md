# ADR 0014 — Quantity milli-unit và inventory value VND integer

**Trạng thái:** Accepted  
**Liên quan:** [LLD Inventory](../architecture/modules/inventory.md), `SRS-INV-003`

## Bối cảnh

SRS cho phép quantity ba số lẻ, giá trị tiền VND nguyên đồng và yêu cầu giá vốn bình quân đối soát được. JavaScript/Sheets floating point dễ tạo chênh lệch ledger/balance.

## Quyết định

Lưu quantity ở scale 1.000 (`quantityMilli`) và giá trị tồn/issue bằng VND integer. Issue value làm tròn từ tỷ lệ value/quantity trước issue; balance giảm chính issue value đã snapshot.

## Hệ quả

Giá vốn hiển thị có thể là tỷ lệ dẫn xuất, nhưng mọi movement/order/report dùng total VND snapshot. Không dùng floating amount không rõ scale trong inventory ledger.

## Phương án không chọn

Floating point trực tiếp hoặc decimal/rational framework toàn hệ thống: phương án đầu không đối soát ổn định, phương án sau quá phức tạp cho baseline Apps Script.
