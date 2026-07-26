# LLD — Inventory, lô/serial, chuyển kho và kiểm kho

**Trạng thái:** Đã phê duyệt  
**Nguồn:** `SRS-INV-001` đến `SRS-INV-017`, `SRS-SAL-011` đến `SRS-SAL-015`, [LLD Sales](sales-pos-returns.md)

## 1. Ledger và projection

`InventoryMovement` là nguồn sự thật append-only. `InventoryBalance` là projection hot-path duy nhất, khóa `warehouseId + variantId`; không tính tồn bằng full ledger scan. Hàng lô dùng `InventoryLotBalance`; serial dùng record `SerialState` duy nhất tenant. Command batch-append movement và batch-update mọi projection cùng commit; chỉ dữ liệu command `Committed` có hiệu lực.

Balance có `onHandMilli`, `availableMilli`, `reservedMilli`, `inTransitMilli`, `quarantineMilli`, `inventoryValueVnd`, `asOfMovementId`. `available` chỉ gồm lượng bán được. Quarantine/in-transit/serial khóa không bán được.

## 2. Giá vốn bình quân gia quyền di động

Quantity chuẩn hóa thành `quantityMilli` (tối đa ba số lẻ); value tồn là VND integer. Khi receipt/restock/approved increase:

```text
newValue = valueBefore + actualIncreaseValueVnd
newQuantityMilli = quantityBeforeMilli + increaseMilli
averageCost = newValue / (newQuantityMilli / 1000)
```

Khi issue, `issueValueVnd = round(issueMilli × valueBefore / quantityBeforeMilli)`. Balance giảm đúng `issueMilli` và `issueValueVnd`; movement/order snapshot giá trị đó. Nhập sau không tính lại issue cũ. Âm kho cần approval và temporary cost/reconciliation flag theo SRS.

## 3. Command/state ownership

| Command | Guard và hậu quả |
| --- | --- |
| `inventory.issueForSale` | available/lot/serial/negative-stock exception; tạo `SaleIssue`, giảm on-hand/available, snapshot cost. |
| `inventory.reserve/release` | Online `Confirmed`/cancel/expiry; chỉ đổi reserved/available, không đổi on-hand/value. |
| `inventory.receive` | receipt/opening/restock; tăng on-hand/value và cập nhật moving average. |
| `inventory.return.receive/resolve` | Return vào Quarantine; Restock/Scrap theo inspection, không bán trước Restock. |
| `inventory.transfer.ship/receive` | Ship giảm nguồn/tăng in-transit; receive giảm in-transit/tăng đích; partial giữ phần thiếu in-transit. |
| `inventory.adjust/stocktake.approve` | approval, reason/attachment; chỉ approval tạo adjustment movement. |

Transfer state: `Draft → PendingApproval → Approved → Shipped → Received | PartiallyReceived`; cancel chỉ trước Shipped. Stocktake: `Draft → InProgress → Submitted → Approved | Rejected | Cancelled`; snapshot system quantity lúc mở, movement sau snapshot hiển thị riêng.

## 4. Lot/serial và query

Lot allocation bắt buộc đủ quantity, mặc định FEFO khi bật; lot hết hạn/serial không Saleable bị chặn trừ exception audited. Serial state/warehouse thay đổi trong cùng command movement; serial return không Saleable cho đến Restock. Inventory query luôn scope Branch/Warehouse và route active/historical partition theo date/reference; không lộ balance ngoài scope.

## 5. Test matrix

Test: moving average two receipts; decimal quantity/value conservation; last stock concurrent checkout; reservation expiry; FEFO/expired lot; serial uniqueness/state; approved negative stock; partial transfer; stocktake with later movement; quarantine return; ledger-to-balance reconciliation and command retry.
