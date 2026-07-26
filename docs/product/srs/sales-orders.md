# SRS — Bán hàng, đơn hàng và hoàn trả

**Phụ thuộc:** [`overview.md`](overview.md), [`inventory.md`](inventory.md), [`customers-promotions.md`](customers-promotions.md), [`finance.md`](finance.md)  
**Tiền tố yêu cầu:** `SRS-SAL`

## 1. Phạm vi

Mô-đun bao gồm POS tại quầy và đơn online do nhân viên nhập thủ công. “Online” chỉ là nguồn đơn và thông tin giao hàng; hệ thống không kết nối website, sàn, hãng vận chuyển hoặc ngân hàng ở bản đầu.

## 2. Dữ liệu chứng từ bán hàng

### SRS-SAL-001 — Đơn bán và dòng hàng

Mỗi đơn bán phải lưu mã đơn, nguồn (`POS` hoặc `ManualOnline`), Branch, Warehouse bán, trạng thái đơn, trạng thái thanh toán, khách hàng nếu có, thu ngân/nhân viên bán, thời điểm tạo/hoàn tất/xuất giao, ghi chú và liên kết chứng từ liên quan. Mỗi dòng phải snapshot product/variant ID, SKU, barcode khi áp dụng, tên hiển thị, đơn vị giao dịch, hệ số quy đổi, số lượng, giá gốc, giá áp dụng, chiết khấu, thuế, promotion/voucher/point, giá vốn và tổng dòng.

Sửa danh mục, bảng giá, thuế hoặc thông tin khách sau đó không được đổi nội dung snapshot. Hàng hóa có tồn, dịch vụ, hàng không quản lý tồn và combo đều có thể xuất hiện trên đơn; combo phải lưu thành phần trừ tồn theo quy tắc tại `SRS-CRM-005`.

### SRS-SAL-002 — Bắt buộc scope bán

Trước khi thêm hàng hoặc hoàn tất đơn, hệ thống phải xác định Branch và Warehouse bán thuộc scope user. Warehouse không được bán trực tiếp bị chặn tạo POS/online fulfillment. Mọi dòng quản lý tồn phải tác động đúng Warehouse đã snapshot trên đơn; không được tự chọn kho khác sau khi đơn hoàn tất.

## 3. POS và giỏ hàng

### SRS-SAL-003 — Tạo giỏ POS

POS phải hỗ trợ tìm hàng bằng scanner barcode, SKU, tên và danh sách gợi ý. Scanner được xử lý như bàn phím; khi barcode khớp duy nhất, hệ thống thêm đúng variant/đơn vị vào giỏ. Nếu barcode không tồn tại hoặc có nhiều kết quả, không được tự thêm sai hàng và phải hiển thị lỗi/cho chọn. Khi POS đã đồng bộ, tìm/scan/add-to-cart/tính giỏ phải dùng catalog read model cache theo `SRS-OVR-020`; không gọi backend cho từng lần quét hoặc đổi số lượng.

Giỏ hỗ trợ thay đổi số lượng, đơn vị, ghi chú dòng/đơn, nhân viên bán, khách hàng, phí giao hàng và giảm giá trong quyền. Hệ thống phải kiểm tra số lượng lẻ theo thiết lập sản phẩm, tồn khả dụng, serial/lô bắt buộc và điều kiện promotion trước `Completed`.

### SRS-SAL-004 — Tạo khách nhanh và cảnh báo khách

Nhân viên có quyền phải tạo khách nhanh bằng tên và tối thiểu một phương thức liên hệ khi tenant yêu cầu. Khi chọn khách, POS chỉ hiển thị điểm, hạn mức nợ, số dư tín dụng và chính sách giá cần cho giao dịch nếu user có quyền xem. Hệ thống phải cảnh báo khách bị ngừng hoạt động, vượt hạn mức nợ hoặc có công nợ quá hạn theo cấu hình.

### SRS-SAL-005 — Giá, đổi giá và chiết khấu

Giá khởi tạo cho từng dòng phải theo thứ tự tại `SRS-CRM-011`. User chỉ đổi giá hoặc nhập giảm giá trong quyền được cấp. Nếu giá/giảm giá vượt ngưỡng Owner cấu hình, đơn chuyển sang trạng thái cần duyệt ngoại lệ và không thể Completed trước khi được duyệt. Hệ thống phải lưu giá trước/sau, kiểu giảm, lý do, người tạo và người duyệt.

### SRS-SAL-006 — Tính thuế và làm tròn

Tenant cấu hình giá mua và giá bán là đã gồm hoặc chưa gồm VAT; mặc định giá bán lẻ gồm VAT. Hệ thống tính chiết khấu trước thuế. Với từng dòng, hệ thống xác định giá tính thuế từ cấu hình snapshot, tính VAT, làm tròn đến VND và sau đó cộng các dòng thành tổng đơn. Phiếu in phải hiển thị rõ tổng trước giảm, giảm giá, thuế, phí giao hàng, đã thu, còn phải thu và tổng phải trả.

## 4. Thanh toán và công nợ từ đơn bán

### SRS-SAL-007 — Phương thức và nhiều khoản thanh toán

Đơn hỗ trợ tiền mặt, chuyển khoản thủ công, QR hiển thị, thẻ, COD và phương thức tùy cấu hình. QR ở bản đầu chỉ hiển thị thông tin để khách thanh toán; nhân viên phải ghi nhận khoản thu, hệ thống không tự xác nhận biến động ngân hàng. Một đơn có thể có nhiều khoản thu và nhiều phương thức; từng khoản tham chiếu `Payment`/`CashTransaction` tại `SRS-FIN-003`.

Khoản tender nhập trên POS Draft chỉ là dữ liệu tạm của giỏ. Hệ thống chỉ tạo CashTransaction/Payment chính thức trong cùng thao tác atomic với `Completed`; nếu hoàn tất bị chặn hoặc Draft bị hủy thì không có khoản thu chính thức. Với đơn online, khoản đặt cọc thu trước `Shipped` được tạo CustomerCredit/Deposit liên kết đơn, chưa tạo doanh thu hoặc receivable; khi Shipped, hệ thống tạo nghĩa vụ rồi phân bổ deposit. Nếu online bị Cancelled trước Shipped, deposit phải được giữ thành CustomerCredit hoặc hoàn bằng Refund có audit, không được tự xóa.

### SRS-SAL-008 — Bán chịu, đặt cọc và trạng thái thanh toán

Khi đơn có số phải thu còn lại sau khi Completed/Shipped, hệ thống tạo nghĩa vụ phải thu theo khách và hạn thanh toán/hạn mức nếu áp dụng. Đặt cọc, thu một phần và thu nợ về sau phải được phân bổ theo `SRS-FIN-005`. Trạng thái thanh toán của đơn là một trong: `Unpaid`, `Partial`, `Paid`, `PartialRefund`, `FullRefund`; trạng thái này độc lập với trạng thái đơn và được tính từ các khoản thu/hoàn đã duyệt.

### SRS-SAL-009 — Kiểm tra trước khi hoàn tất

Trước khi `Completed` hoặc `Shipped`, hệ thống phải kiểm tra: quyền/scope, ca bán mở nếu là POS, hàng/đơn vị hợp lệ, số lượng, tồn hoặc ngoại lệ âm kho đã duyệt, serial/lô, giá/giảm giá, promotion/điểm/voucher, thuế, hạn mức công nợ, tổng khoản thanh toán và idempotency key. Dữ liệu giỏ gửi lên chỉ là đề nghị; backend phải kiểm tra lại dữ liệu hiện hành theo `SRS-OVR-004`. Một lỗi phải chặn hoàn tất và chỉ rõ dòng/quy tắc vi phạm.

### SRS-SAL-017 — Xung đột cache khi checkout

Nếu dữ liệu cache đã cũ và giá, promotion, voucher/điểm hoặc tồn thay đổi làm ảnh hưởng đơn, backend phải từ chối commit với mã nghiệp vụ ổn định, tối thiểu `PRICE_CHANGED`, `PROMOTION_CHANGED`, `INSUFFICIENT_STOCK` hoặc mã tương đương; kèm chênh lệch an toàn để POS hiển thị. Hệ thống không được âm thầm thay giá/khuyến mại hoặc tự tạo chứng từ một phần. Thu ngân phải xác nhận áp dụng dữ liệu mới rồi gửi command mới.

## 5. Máy trạng thái đơn và hạch toán

### SRS-SAL-010 — Luồng POS

```text
Draft ──complete──> Completed
  └──cancel──────> Cancelled
```

- `Draft`: có thể sửa/hủy; không có doanh thu, công nợ, ledger tồn hoặc ledger tiền chính thức.
- `Completed`: bất biến trực tiếp. Hệ thống trừ tồn thực tế theo `SRS-INV-006`, ghi nhận doanh thu, thuế, giá vốn snapshot, khoản phải thu còn lại và liên kết khoản thanh toán đã duyệt.
- `Cancelled`: chỉ hủy Draft; không tạo bút toán. Đơn Completed sửa sai bằng return/reversal, không đổi lại thành Cancelled.

### SRS-SAL-011 — Luồng đơn online nhập tay

```text
Draft ──confirm──> Confirmed ──start packing──> Packing ──ship──> Shipped ──confirm delivery──> Delivered
  │                     │                         │                    └──cancel? no; use return/reversal if needed
  └──cancel─────────────┴─────────────────────────┘
```

- `Draft`: có thể sửa/hủy; không giữ hay trừ tồn.
- `Confirmed`: giữ tồn (`reserved`) ở Warehouse bán; chưa giảm on-hand, chưa ghi nhận doanh thu/công nợ chính thức.
- `Packing`: vẫn giữ tồn; lưu người đóng gói khi có.
- `Shipped`: xác nhận giao/đưa cho đơn vị vận chuyển; giảm on-hand, giải phóng reservation tương ứng, ghi doanh thu/công nợ/giá vốn và tạo nghĩa vụ COD khi phù hợp.
- `Delivered`: xác nhận kết quả giao; không trừ tồn hay ghi doanh thu lần thứ hai.
- `Cancelled`: chỉ hợp lệ trước `Shipped`; giải phóng reservation. Hủy một phần thực hiện bằng giảm/hủy dòng còn chưa ship và audit, không được âm thầm sửa dòng đã ship.

Hệ thống phải lưu nguồn đơn, người nhận, số điện thoại, địa chỉ, phương thức giao, phí ship, COD, mã tham chiếu bên ngoài nếu có và các mốc thời gian riêng. Không được tự suy đoán Delivered từ khoản tiền đã thu.

## 6. Trả hàng, đổi hàng và hoàn tiền

### SRS-SAL-012 — Return có tham chiếu đơn gốc

Return mặc định phải tham chiếu đơn Completed/Shipped/Delivered gốc, trong thời hạn trả hàng tenant cấu hình. Số lượng trả trên mỗi dòng không được vượt số đã bán trừ các return đã được duyệt. Giá trị hoàn/đổi dùng snapshot giá, giảm giá, thuế, promotion và giá vốn của dòng gốc; không dùng bảng giá hiện tại. Return phải có lý do, người tiếp nhận, trạng thái kiểm hàng và phương án xử lý hàng.

### SRS-SAL-013 — Fast return và kiểm hàng

Fast return không có đơn gốc chỉ dành cho Manager/Owner hoặc user được cấp quyền riêng. User phải chọn khách nếu có, hàng, số lượng, chính sách giá hoàn, giá vốn dùng để nhập lại, lý do, Warehouse/kho chờ kiểm và thông tin kiểm hàng. Hệ thống phải audit lý do và người duyệt. Hàng trả mặc định vào Quarantine, không tăng `available`; chỉ người có quyền kiểm mới quyết định `Restock`, `KeepQuarantine` hoặc `Scrap` theo `SRS-INV-012`.

### SRS-SAL-014 — Hoàn tiền và đổi hàng

Hoàn tiền phải là `Payment`/phiếu chi đối ứng liên kết Return; phương thức có thể là tiền mặt, chuyển khoản thủ công hoặc cấn trừ công nợ/tín dụng theo quyền. Không sửa/xóa khoản thu cũ. Đổi hàng phải tạo một Return và một Sale Order mới liên kết hai chiều; hệ thống tính chênh lệch để thu thêm, hoàn tiền hoặc tạo tín dụng khách. Trả hàng phải đảo/điều chỉnh doanh thu, thuế, giá vốn, công nợ, điểm, promotion và hoa hồng theo trạng thái hàng sau kiểm.

### SRS-SAL-015 — Serial, bảo hành và return

Với hàng serial/IMEI, đơn Completed/Shipped phải chọn serial cụ thể; return/bảo hành phải tra được serial, khách và đơn gốc. Serial trả về không được bán lại cho đến khi được Restock; serial Scrap/đang bảo hành không được chọn cho đơn mới.

## 7. In và xuất chứng từ bán

### SRS-SAL-016 — In qua trình duyệt

Hệ thống phải cung cấp xem trước, in và in lại phiếu theo mẫu K80 hoặc A4. Mẫu phải chứa tối thiểu thông tin doanh nghiệp/chi nhánh, mã chứng từ, thời điểm, người bán, hàng hóa, số lượng, giá, chiết khấu, thuế, thanh toán, khách khi có và QR/mã tra cứu nếu được cấu hình. In lại không làm thay đổi chứng từ và phải audit khi tenant bật audit in.

Hệ thống không tích hợp driver/API máy in và không tuyên bố phiếu in là hóa đơn điện tử ký số. User có quyền export có thể tải bản PDF/dữ liệu phiếu, trong phạm vi quyền dữ liệu.

Sau commit thành công, POS phải render/in K80/A4 từ receipt snapshot trả về; tạo PDF, upload Drive hoặc tác vụ in nặng không được là điều kiện hoàn tất POS.

## 8. Tiêu chí nghiệm thu trọng yếu

| Mã | Kịch bản kiểm thử | Kết quả bắt buộc |
| --- | --- | --- |
| SAL-AT-01 | Cashier hoàn tất POS có hàng đủ tồn và thanh toán đủ. | Chỉ một đơn Completed, giảm on-hand, ghi giá vốn/doanh thu/thuế và Payment; in lại không tạo bút toán mới. |
| SAL-AT-02 | Cashier hoàn tất POS chưa thu đủ tiền. | Đơn Completed, Payment là Partial, tạo phải thu đúng số còn lại. |
| SAL-AT-03 | Tạo online rồi Confirmed, sau đó Cancelled trước Shipped. | Reserved tăng rồi về 0; on-hand, doanh thu và công nợ không đổi. |
| SAL-AT-04 | Shipped đơn online có COD. | On-hand giảm một lần, revenue/COGS/receivable được ghi; Delivered không tạo lần thứ hai. |
| SAL-AT-05 | User không có quyền trả nhanh cố tạo return không có đơn gốc. | Bị chặn trước tạo chứng từ; không đổi tồn/tiền. |
| SAL-AT-06 | Trả một phần đơn gốc. | Không vượt số đã bán; hàng vào Quarantine; hoàn tiền là bút toán đối ứng; snapshot giá gốc được dùng. |
| SAL-AT-07 | Một user gửi lại yêu cầu complete cùng idempotency key do timeout. | Hệ thống trả lại kết quả đơn đầu, không nhân đôi tồn/doanh thu/Payment. |
| SAL-AT-08 | Giá hoặc promotion thay đổi sau khi hàng đã được thêm vào giỏ. | Checkout trả conflict có chênh lệch, chưa tạo chứng từ; chỉ command mới sau xác nhận mới được commit. |
| SAL-AT-09 | Nhiều lần scan/tăng giảm số lượng khi POS warm cache. | Không phát sinh Apps Script API cho từng thao tác và đạt `SRS-OVR-013`. |
