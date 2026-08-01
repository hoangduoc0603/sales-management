# SRS — Tài chính, công nợ và ca bán

**Phụ thuộc:** [`overview.md`](overview.md), [`sales-orders.md`](sales-orders.md), [`purchasing.md`](purchasing.md)  
**Tiền tố yêu cầu:** `SRS-FIN`

## 1. Nguyên tắc sổ cái tiền và công nợ

### SRS-FIN-001 — Quỹ và tài khoản thanh toán

Hệ thống phải quản lý `CashDrawer`, tài khoản ngân hàng, ví và phương thức thanh toán khác theo Branch. Mỗi quỹ/tài khoản có mã, tên, loại, Branch, trạng thái và số dư truy vết từ ledger. Không cho user ghi đè số dư; điều chỉnh số dư dùng phiếu thu/chi/điều chỉnh có quyền, lý do và actor metadata.

### SRS-FIN-002 — CashTransaction

Mọi thu/chi đã duyệt phải tạo CashTransaction bất biến có ID, loại (`Receipt`, `Disbursement`, `Refund`, `Reversal`, `ShiftOpening`, `ShiftClosingVariance`, `Expense`), ngày hiệu lực, Branch, quỹ/tài khoản, phương thức, số tiền VND, đối tượng khách/NCC khi có, chứng từ nguồn, actor, approver, lý do và idempotency key. Chứng từ nguồn có thể là đơn bán, return, receipt mua, return NCC, chi phí hoặc giao dịch độc lập.

### SRS-FIN-003 — Phiếu thu/chi

User có quyền tạo phiếu thu/chi độc lập hoặc từ chứng từ nguồn. Phiếu phải chọn quỹ/tài khoản hợp lệ, người nộp/nhận, số tiền, phương thức, ngày, nội dung, đối tượng và file chứng từ nếu cấu hình yêu cầu. Trạng thái là `Draft → PendingApproval → Approved | Rejected | Cancelled`; chỉ Approved tạo CashTransaction. Không được hủy/sửa phiếu Approved; dùng Reversal tại `SRS-FIN-006`.

## 2. Công nợ và phân bổ thanh toán

### SRS-FIN-004 — Nghĩa vụ công nợ

Mỗi khoản phải thu/phải trả phải có ID, loại (`Receivable`/`Payable`), đối tượng, chứng từ nguồn, số tiền gốc, đến hạn, số đã phân bổ, số còn lại, trạng thái và snapshot Branch. Đơn bán Completed/Shipped tạo Receivable nếu còn thiếu; receipt mua Approved tạo Payable nếu chưa thanh toán. Return/refund/return NCC tạo giảm nghĩa vụ hoặc nghĩa vụ đối ứng theo cách xử lý đã chọn.

### SRS-FIN-005 — Payment Allocation nhiều-nhiều

Một CashTransaction/Payment được phân bổ cho một hoặc nhiều obligation; một obligation nhận nhiều allocation. Allocation phải lưu số tiền, ngày, chứng từ nguồn, actor và không vượt số tiền CashTransaction hoặc số dư obligation, trừ quyền tạo tín dụng trả trước. Số dư được tính từ dòng obligation và allocation đã duyệt, không từ trường người dùng sửa.

Khi khách trả dư so với Receivable, phần dư tạo `CustomerCredit` có ledger riêng và có thể phân bổ cho đơn sau hoặc hoàn lại bằng Refund có quyền. Khi NCC nhận trả dư, phần dư tạo `SupplierPrepayment/Credit`. Không biểu diễn trả dư bằng công nợ âm.

### SRS-FIN-006 — Đảo thanh toán và điều chỉnh

CashTransaction/Payment/Allocation đã Approved không được sửa/xóa. Manager/Owner tạo Reversal tham chiếu chứng từ gốc, chọn số tiền không vượt số chưa đảo, lý do và người duyệt theo ngưỡng. Reversal tạo transaction đối ứng và đảo/release allocation; hệ thống tính lại trạng thái payment/obligation từ ledger. Nếu tiền đã thực nhận nhưng phân bổ nhầm, user phải reversal allocation hoặc tạo allocation mới, không sửa lịch sử.

### SRS-FIN-007 — Hạn mức và quá hạn

Tenant cấu hình hạn mức nợ, ngày đến hạn và hành vi cảnh báo/chặn. Trước Completed/Shipped bán chịu, hệ thống tính dư nợ mở cộng giá trị đơn sau payment/credit; nếu vượt hạn mức hoặc có nợ quá hạn, hệ thống cảnh báo/chặn theo policy. Ngoại lệ cần Manager/Owner duyệt, lý do và `approvedBy/approvedAt`.

## 3. Ca bán và két tiền

### SRS-FIN-008 — Mở ca

Cashier chỉ được có một ca `Open` tại một CashDrawer tại một thời điểm. Mở ca phải chọn Branch, CashDrawer, Warehouse bán, tiền đầu ca theo phương thức, người phụ trách và thời điểm. CashDrawer/Warehouse phải thuộc scope Cashier. Nếu tenant bật bắt buộc ca, POS không cho tạo/Completed đơn khi Cashier không có ca Open phù hợp Branch/Warehouse.

### SRS-FIN-009 — Ghi nhận trong ca

Mọi Payment/CashTransaction liên quan POS trong ca phải liên kết ca hiện hành. Hệ thống hiển thị số dự kiến theo tiền đầu ca, thu, chi, hoàn tiền, nộp/rút quỹ và phương thức. User không được chuyển đơn đã Completed giữa các ca; sửa sai dùng chứng từ mới ở ca hiện hành hoặc quy trình điều chỉnh có lý do và actor metadata.

### SRS-FIN-010 — Đóng và khóa ca

Đóng ca yêu cầu Cashier nhập tiền thực tế theo phương thức, hệ thống tính expected, variance, lý do khi chênh và đính kèm nếu cấu hình. Trạng thái `Open → SubmittedForClose → Closed → Locked`; Manager/Owner duyệt variance theo ngưỡng. `Closed` không cho tạo POS mới trong ca; `Locked` là bất biến. Ca đã Closed/Locked không mở lại; chỉ Manager/Owner tạo CashTransaction/adjustment mới liên kết ca cũ nếu cần, kèm lý do và actor metadata.

### SRS-FIN-011 — Chi phí vận hành

Chi phí phải có nhóm chi phí, Branch, ngày, số tiền, quỹ/tài khoản, người nhận, nội dung, chứng từ đính kèm khi yêu cầu và trạng thái duyệt. Chi phí Approved tạo Disbursement/Expense; không tự phân bổ thành giá vốn hàng hóa trừ khi được tạo theo `SRS-PUR-007`.

## 4. Đối soát và báo cáo tài chính vận hành

### SRS-FIN-012 — Sổ quỹ và đối soát

Hệ thống phải hiển thị sổ quỹ/tài khoản theo khoảng thời gian, Branch, CashDrawer, phương thức, actor và chứng từ nguồn. Mọi số dư phải drill-down đến CashTransaction, allocation, shift và chứng từ nguồn trong scope quyền. Hệ thống phải báo chênh lệch khi tổng cash transaction không khớp expected của ca hoặc khi allocation không khớp obligation.

### SRS-FIN-013 — Công nợ

Hệ thống phải báo cáo aging phải thu/phải trả theo đối tượng, chứng từ, due date, Branch, trạng thái và ngày tham chiếu; cho phép lọc nợ quá hạn, credit trả trước và khoản chưa phân bổ. Báo cáo không phải sổ kế toán tổng hợp hay tờ khai thuế.

## 5. Tiêu chí nghiệm thu trọng yếu

| Mã | Kịch bản kiểm thử | Kết quả bắt buộc |
| --- | --- | --- |
| FIN-AT-01 | Một khoản thu 1.000.000 được phân bổ 600.000 và 400.000 cho hai đơn. | Hai allocation tổng đúng 1.000.000; trạng thái/số dư hai Receivable được tính đúng. |
| FIN-AT-02 | Khách trả dư 100.000. | Tạo CustomerCredit 100.000, không có receivable âm; credit dùng/hoàn tiếp đều truy vết ledger. |
| FIN-AT-03 | Manager đảo một khoản thu đã duyệt. | Transaction/Allocation đối ứng được tạo, khoản thu gốc không sửa, obligation và status tính lại đúng. |
| FIN-AT-04 | Cashier mở ca A rồi cố mở ca B. | Bị chặn nếu ca A còn Open, không tạo tiền đầu ca thứ hai. |
| FIN-AT-05 | POS khi tenant bắt buộc ca và Cashier chưa mở ca. | Không thể Completed; không thay đổi tồn/tiền. |
| FIN-AT-06 | Đóng ca có tiền thực tế lệch expected. | Bắt buộc lý do, tạo workflow duyệt; sau Locked không thể mở lại mà chỉ có adjustment mới. |
