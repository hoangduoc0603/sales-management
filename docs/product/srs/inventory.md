# SRS — Kho, tồn và giá vốn

**Phụ thuộc:** [`overview.md`](overview.md), [`sales-orders.md`](sales-orders.md), [`purchasing.md`](purchasing.md)  
**Tiền tố yêu cầu:** `SRS-INV`

## 1. Phạm vi và nguyên tắc

Mô-đun quản lý tồn theo Warehouse, variant/đơn vị cơ bản, lô và serial khi được bật. `InventoryMovement` là nguồn sự thật bất biến; số tồn tổng hợp chỉ là dữ liệu đọc nhanh. Không nghiệp vụ nào được sửa trực tiếp một ô số lượng để thay thế movement.

## 2. Sổ cái, trạng thái tồn và giá vốn

### SRS-INV-001 — InventoryMovement

Mỗi biến động tồn đã có hiệu lực phải tạo ít nhất một InventoryMovement có ID, loại movement, thời điểm hiệu lực, Warehouse nguồn/đích khi có, product/variant, lô/serial khi có, số lượng dấu, đơn vị giao dịch, số lượng cơ bản, giá vốn đơn vị snapshot, tổng giá vốn, chứng từ nguồn, actor, người duyệt nếu có và idempotency key.

Loại movement tối thiểu gồm `OpeningBalance`, `PurchaseReceipt`, `PurchaseReturn`, `SaleIssue`, `SaleReturnReceive`, `SaleReturnRestock`, `TransferShip`, `TransferReceive`, `CountAdjustment`, `ManualAdjustment`, `Scrap`, `WarrantyIssue` và `WarrantyReturn`. Một movement đã duyệt không được sửa/xóa; đảo/điều chỉnh tạo movement mới liên kết nguồn.

### SRS-INV-002 — Các số dư kho

Hệ thống phải tính và hiển thị theo từng Warehouse/variant: on-hand, available, reserved, in-transit, quarantine và số lượng theo lô/serial. Available chỉ bao gồm hàng có thể bán; Quarantine, Scrap, serial khóa và in-transit không được tính available. Báo cáo cấp tenant/Branch chỉ được cộng số dư cùng trạng thái, không được coi in-transit là tồn bán được ở kho đích.

### SRS-INV-003 — Giá vốn bình quân gia quyền di động

Phương pháp giá vốn mặc định và duy nhất bản đầu là **bình quân gia quyền di động** theo variant và Warehouse. Khi một movement tăng tồn có giá trị (`OpeningBalance`, `PurchaseReceipt`, `SaleReturnRestock` hoặc điều chỉnh tăng có giá được duyệt) có hiệu lực, hệ thống tính:

```text
newAverageCost = (quantityBefore × averageCostBefore + quantityIncrease × actualUnitCostIncrease)
                 / (quantityBefore + quantityIncrease)
```

`actualUnitCostIncrease` bao gồm giá mua/giá trả lại snapshot và phần chi phí mua được phân bổ hợp lệ. Khi movement giảm tồn có hiệu lực, hệ thống snapshot `averageCost` hiện hành vào movement và vào chứng từ nguồn; nhập sau đó không làm tính lại giá vốn/dòng lợi nhuận lịch sử. FEFO là thứ tự chọn lô, không thay thế phương pháp giá vốn.

### SRS-INV-004 — Trường hợp không có giá vốn hợp lệ

Hệ thống chặn giảm tồn khi quantity không đủ theo `SRS-INV-010`. Nếu Manager/Owner duyệt âm kho nhưng variant/Warehouse không có average cost hợp lệ, user phải nhập giá vốn tạm và lý do; hệ thống snapshot giá đó, đánh dấu chênh lệch giá vốn cần đối soát. Nhập hàng về sau không được sửa lại bút toán bán cũ; Manager/Owner chỉ có thể tạo chứng từ điều chỉnh giá vốn có actor metadata.

## 3. Nhập, xuất và reservation

### SRS-INV-005 — Tăng tồn

Tăng tồn chỉ có hiệu lực khi receipt/return/điều chỉnh đã được duyệt. Receipt từ PO hoặc nhập trực tiếp tạo `PurchaseReceipt`; return đã kiểm đạt tạo `SaleReturnRestock`; mỗi movement tăng phải xác định Warehouse nhận, quantity cơ bản và giá vốn nguồn. Nhập đầu kỳ phải tạo biên bản, không được import đè lên tồn đã vận hành.

### SRS-INV-006 — Xuất bán POS

Khi POS chuyển `Completed`, hệ thống kiểm available và tạo `SaleIssue` giảm on-hand/available cho từng hàng quản lý tồn. Hàng dịch vụ/không quản lý tồn không tạo movement. Combo tạo movement thành phần theo công thức snapshot. Nếu hàng theo lô/serial, dòng xuất phải chỉ định các đối tượng đã chọn và không được trùng trong cùng thời điểm.

### SRS-INV-007 — Reservation của đơn online

Khi đơn online `Confirmed`, hệ thống tạo reservation theo dòng hàng và Warehouse, giảm available nhưng không giảm on-hand/giá vốn. `Packing` không thay đổi reservation. `Shipped` tạo `SaleIssue`, giảm on-hand, giải phóng reservation tương ứng và snapshot giá vốn. `Cancelled` trước Shipped giải phóng toàn bộ reservation. Reservation phải có thời hạn cấu hình, `createdBy/createdAt` hoặc system actor khi tự giải phóng; tác vụ giải phóng không được hủy đơn nếu user đang thao tác.

### SRS-INV-008 — Lô, hạn dùng và serial

Sản phẩm bật lô phải lưu mã lô, Warehouse, số lượng, ngày sản xuất/hết hạn khi cấu hình yêu cầu. Sản phẩm bật serial/IMEI phải lưu từng serial duy nhất trong tenant, trạng thái và Warehouse hiện tại. Hệ thống ưu tiên FEFO cho hàng lô có hạn dùng khi xuất; user chỉ thay lô trong quyền và trong giới hạn còn tồn. Không được xuất lô hết hạn hoặc serial không ở trạng thái bán được nếu Owner không cấu hình ngoại lệ có lý do và actor metadata.

## 4. Âm kho, điều chỉnh và hàng trả

### SRS-INV-009 — Cảnh báo và chặn tồn

Hệ thống phải cảnh báo tồn thấp, tồn lâu, lô gần hết hạn/hết hạn và serial bất thường nhưng không tự tạo movement. Cảnh báo phải tính theo Warehouse và quyền xem. Báo cáo cảnh báo không được tiết lộ số tồn của Warehouse ngoài scope user.

### SRS-INV-010 — Chính sách âm kho

Mặc định hệ thống chặn Completed/Shipped/adjustment làm on-hand hoặc available âm ở Warehouse nguồn. Manager/Owner có thể phê duyệt ngoại lệ theo Warehouse nếu cấu hình cho phép; yêu cầu phải có số lượng, lý do chuẩn hóa, actor, approver, thời điểm và liên kết chứng từ. Quyền duyệt một ngoại lệ không tự động bật âm kho cho giao dịch khác.

### SRS-INV-011 — Điều chỉnh, scrap và trách nhiệm

ManualAdjustment và Scrap chỉ do user được quyền tạo, phải chọn lý do chuẩn hóa, Warehouse, hàng/lô/serial, quantity và giá trị khi áp dụng. Chứng từ cần duyệt phải ở trạng thái `Draft → PendingApproval → Approved | Rejected | Cancelled`; chỉ `Approved` mới tạo movement. Nếu cấu hình yêu cầu ảnh/chứng từ đính kèm, không được gửi duyệt khi thiếu file.

### SRS-INV-012 — Xử lý hàng trả

Hàng trả từ khách nhận vào Quarantine bằng `SaleReturnReceive` vào kho/vị trí Quarantine, không tăng available. Với return có đơn gốc, hệ thống phải snapshot giá vốn dòng gốc; với fast return, dùng giá vốn đã duyệt tại `SRS-SAL-013`. Inspector có quyền chọn:

- `Restock`: tạo `SaleReturnRestock` vào Warehouse bán được, cập nhật giá vốn theo `SRS-INV-003`.
- `KeepQuarantine`: giữ không bán được, không tạo movement vào available.
- `Scrap`: tạo Scrap có lý do/duyệt, không thể xuất bán.

Serial/lô phải giữ liên kết đơn/return gốc. Hàng trả không được dùng để hoàn tất đơn mới trước Restock.

## 5. Chuyển kho

### SRS-INV-013 — Máy trạng thái chuyển kho

```text
Draft → PendingApproval → Approved → Shipped → Received
                                      └──────→ PartiallyReceived
Draft | PendingApproval | Approved → Cancelled
```

Phiếu chuyển phải có Warehouse nguồn/đích cùng tenant, dòng hàng, quantity, người tạo và lý do. Manager là người duyệt mặc định; Owner có thể cấu hình không cần duyệt cho chuyển nội bộ dưới ngưỡng. Không được chuyển một Warehouse sang chính nó.

### SRS-INV-014 — Hạch toán chuyển kho

`Shipped` phải kiểm tồn/ngoại lệ âm kho, tạo `TransferShip` giảm on-hand/available Warehouse nguồn và tăng in-transit. `Received` tạo `TransferReceive`, giảm in-transit và tăng on-hand/available Warehouse đích. `PartiallyReceived` chỉ tăng phần đã nhận; phần chưa nhận vẫn in-transit. Nhận thiếu/thừa/hỏng phải tạo dòng chênh có lý do, ảnh nếu yêu cầu và workflow duyệt; không tự cân bằng tồn nguồn/đích.

`Cancelled` chỉ hợp lệ trước `Shipped`. Sau Shipped, hoàn trả hàng nguồn là một phiếu/chứng từ chuyển ngược hoặc điều chỉnh được duyệt, không đổi trực tiếp trạng thái về Cancelled.

## 6. Kiểm kho

### SRS-INV-015 — Mở phiên kiểm

Phiên kiểm phải chọn Warehouse, phạm vi hàng/lô/serial, người kiểm và thời điểm bắt đầu. Hệ thống snapshot số hệ thống tại thời điểm mở, nhưng không khóa bán/nhập/xuất sau đó. Mọi movement phát sinh sau snapshot phải hiển thị riêng để người duyệt phân biệt chênh tại thời điểm kiểm và biến động sau kiểm.

### SRS-INV-016 — Ghi nhận và duyệt chênh lệch

Counter nhập số thực tế theo hàng/lô/serial; hệ thống tính chênh dựa trên snapshot, yêu cầu lý do với chênh lệch và không tự tạo adjustment khi nhập. Trạng thái phiên là `Draft → InProgress → Submitted → Approved | Rejected | Cancelled`. Người kiểm không được duyệt cùng phiên, trừ Owner khi cấu hình ngoại lệ có actor metadata. `Approved` tạo CountAdjustment; `Rejected` không thay đổi tồn và cho phép tạo phiên mới.

## 7. Truy vấn và tiêu chí nghiệm thu

### SRS-INV-017 — Truy vết kho

Hệ thống phải cung cấp thẻ kho/lịch sử movement lọc theo thời gian, Branch, Warehouse, hàng/variant, lô/serial, loại movement và chứng từ nguồn. User chỉ xem được scope của mình; mỗi dòng cho phép mở chứng từ nguồn nếu có quyền.

| Mã | Kịch bản kiểm thử | Kết quả bắt buộc |
| --- | --- | --- |
| INV-AT-01 | Nhập 10 × 100.000, sau đó nhập 10 × 120.000 cùng variant/kho. | Average cost sau lần nhập hai là 110.000; các lần xuất sau snapshot 110.000. |
| INV-AT-02 | Confirmed rồi Cancelled một đơn online. | Available giảm rồi tăng lại; on-hand không đổi; không có COGS/revenue. |
| INV-AT-03 | Cashier bán vượt tồn khi không có ngoại lệ. | Completed bị chặn, không tạo movement. |
| INV-AT-04 | Manager duyệt bán âm kho. | Có approver/lý do trên record ngoại lệ và SaleIssue âm đúng quantity; không tự bật âm cho đơn khác. |
| INV-AT-05 | Shipped phiếu chuyển 10, kho đích nhận 6. | Nguồn giảm 10; đích tăng available 6; 4 vẫn in-transit. |
| INV-AT-06 | Bán diễn ra sau khi mở kiểm. | Movement sau snapshot được hiển thị riêng; adjustment chỉ dựa snapshot theo quy tắc đã nêu. |
| INV-AT-07 | Khách trả hàng. | Hàng vào Quarantine và không bán được cho đến Restock; serial/lô vẫn truy vết đơn gốc. |
