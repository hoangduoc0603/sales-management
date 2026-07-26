# SRS — Mua hàng và nhà cung cấp

**Phụ thuộc:** [`overview.md`](overview.md), [`inventory.md`](inventory.md), [`finance.md`](finance.md)  
**Tiền tố yêu cầu:** `SRS-PUR`

## 1. Nhà cung cấp

### SRS-PUR-001 — Hồ sơ nhà cung cấp

Hệ thống phải quản lý mã, tên, mã số thuế, người liên hệ, điện thoại, email, địa chỉ, điều khoản thanh toán, hạn mức nếu dùng, trạng thái và ghi chú của nhà cung cấp (NCC). Mã NCC phải duy nhất trong tenant. NCC đã có chứng từ chỉ được ngừng hoạt động, không xóa; không được chọn NCC ngừng hoạt động cho PO/receipt mới.

### SRS-PUR-002 — Số dư phải trả theo nguồn

Phải trả NCC phải truy vết được tới receipt, hóa đơn mua, trả NCC, phiếu chi và các chứng từ điều chỉnh. Thay đổi tên/điều khoản NCC không làm đổi snapshot trên chứng từ cũ.

## 2. Đơn đặt mua và nhận hàng

### SRS-PUR-003 — Đơn đặt mua (PO)

PO phải lưu NCC, Warehouse nhận dự kiến, Branch, ngày dự kiến, điều khoản, tiền tệ VND, dòng hàng, số lượng/đơn vị quy đổi, giá dự kiến, giảm giá, VAT, chi phí dự kiến, ghi chú và tệp đính kèm khi có. Trạng thái PO:

```text
Draft → PendingApproval → Approved → PartiallyReceived → Completed
Draft | PendingApproval | Approved | PartiallyReceived → Cancelled
```

Owner có thể cấu hình PO dưới ngưỡng bỏ qua `PendingApproval`, nhưng PO chỉ là cam kết mua và **không tăng tồn, giá vốn hay phải trả** ở bất kỳ trạng thái nào.

### SRS-PUR-004 — Phiếu nhận hàng

Receipt có thể tham chiếu một hoặc nhiều dòng PO hoặc được tạo trực tiếp nếu user có quyền. Receipt phải chọn NCC và Warehouse nhận, ngày nhận, dòng hàng, quantity nhận, đơn vị, giá nhập thực tế, giảm giá/thuế, lô/serial nếu bắt buộc, chi phí mua và chứng từ NCC. Receipt hỗ trợ nhận một phần; không được nhận vượt quantity PO còn mở nếu Manager không duyệt ngoại lệ có lý do/audit.

Trạng thái receipt là `Draft → PendingApproval → Approved | Rejected | Cancelled`. Chỉ Approved tạo `PurchaseReceipt` theo `SRS-INV-005`, cập nhật giá vốn bình quân và phải trả. Receipt không được hủy trực tiếp sau Approved; sai sót dùng return NCC hoặc điều chỉnh được duyệt.

### SRS-PUR-005 — Lô, serial và kiểm tra dữ liệu nhập

Nếu product yêu cầu lô/hạn dùng, receipt phải có mã lô, Warehouse, số lượng và ngày hết hạn/sản xuất theo cấu hình. Nếu yêu cầu serial/IMEI, quantity phải khớp số serial hợp lệ, không trùng tenant và không ở trạng thái đã tồn. Hệ thống phải chặn Approved khi thiếu hoặc không hợp lệ, đồng thời chỉ rõ dòng lỗi.

## 3. Giá mua, chi phí và giá vốn

### SRS-PUR-006 — Giá trị receipt

Receipt phải tính giá trị hàng bằng quantity quy đổi × đơn giá sau giảm giá, sau đó tính VAT theo cấu hình giá gồm/chưa gồm VAT tại `SRS-SAL-006`. Giá trị hàng, thuế, chi phí mua và tổng phải trả phải snapshot theo receipt. Giá vốn nhận được dùng cho moving weighted average là giá trị hàng cộng phần chi phí mua được phân bổ, không bao gồm VAT được cấu hình là không tính vào giá vốn.

### SRS-PUR-007 — Chi phí mua bổ sung

Hệ thống hỗ trợ chi phí mua như vận chuyển, bốc xếp, bảo hiểm và chi phí tùy cấu hình. Mỗi chi phí phải có loại, số tiền, chứng từ nguồn, NCC/người nhận nếu có, Warehouse/receipt áp dụng và phương pháp phân bổ: theo giá trị dòng, theo số lượng cơ bản hoặc phân bổ thủ công. Tổng giá trị phân bổ phải đúng bằng chi phí cần phân bổ; hệ thống phải hiển thị chênh lệch và chặn Approved khi chưa phân bổ đủ. Phương pháp và giá trị phân bổ từng dòng phải snapshot để đối soát giá vốn sau này.

### SRS-PUR-008 — Hóa đơn/NCC phát sinh sau receipt

Nếu hóa đơn NCC hoặc chi phí mua đến sau khi receipt đã Approved, user không được sửa receipt. Hệ thống phải tạo chứng từ chi phí/điều chỉnh giá vốn có tham chiếu receipt, quyền duyệt và audit. Điều chỉnh chỉ tác động tồn còn lại/chi phí theo quy tắc dữ liệu được thiết kế sau SRS; không được âm thầm sửa giá vốn đã snapshot trên đơn bán cũ.

## 4. Trả hàng nhà cung cấp và phải trả

### SRS-PUR-009 — Return NCC

Return NCC phải tham chiếu receipt khi có thể; user chọn Warehouse, hàng/lô/serial, quantity, giá trị, lý do và cách xử lý tiền (`ReducePayable`, `Refund`, `Replacement`). Quantity không được vượt số đã nhận trừ số đã trả, có xét tồn hiện tại/lô/serial tại Warehouse. Return có trạng thái `Draft → PendingApproval → Approved | Rejected | Cancelled`; Approved tạo `PurchaseReturn`, giảm on-hand đúng Warehouse/lô/serial và giảm/đảo phải trả hoặc tạo khoản phải thu NCC theo cách xử lý.

### SRS-PUR-010 — Thanh toán NCC

Thanh toán NCC sử dụng Payment Allocation ở `SRS-FIN-005`. Một phiếu chi có thể phân bổ cho nhiều receipt/nghĩa vụ; một receipt có thể nhận nhiều lần thanh toán. Thanh toán vượt phải trả chỉ hợp lệ nếu tạo credit/prepayment NCC theo quyền; không làm phải trả âm không có bản chất.

## 5. Tra cứu và tiêu chí nghiệm thu

### SRS-PUR-011 — Báo cáo mua hàng

Hệ thống phải tra cứu PO/receipt/return theo NCC, Warehouse, thời gian, trạng thái, product và người tạo; hiển thị quantity đặt–nhận–còn lại, giá nhập snapshot, chi phí phân bổ, phải trả, đã thanh toán và hạn thanh toán trong phạm vi quyền.

| Mã | Kịch bản kiểm thử | Kết quả bắt buộc |
| --- | --- | --- |
| PUR-AT-01 | Approved một PO nhưng chưa receipt. | Tồn, average cost và payable không đổi. |
| PUR-AT-02 | Approved receipt một phần từ PO. | Tồn/average cost/payable tăng theo phần nhận; PO chuyển PartiallyReceived. |
| PUR-AT-03 | Receipt hàng serial nhưng thiếu một serial. | Approved bị chặn, không tạo inventory movement. |
| PUR-AT-04 | Phân bổ 300.000 phí vận chuyển cho nhiều dòng. | Tổng phân bổ đúng 300.000, từng dòng snapshot phương pháp/giá trị và average cost dùng giá đã phân bổ. |
| PUR-AT-05 | Trả NCC một phần hàng đã nhận. | Giảm đúng tồn/lô/serial, không vượt lịch sử nhận-trả; payable/refund được tạo theo lựa chọn. |
| PUR-AT-06 | Một phiếu chi thanh toán hai receipt. | Hai allocation được lưu, tổng allocation không vượt số tiền phiếu chi và số dư payable đối soát được. |
