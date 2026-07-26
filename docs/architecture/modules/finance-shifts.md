# LLD — Finance, công nợ, ca bán và chi phí

**Trạng thái:** Đã phê duyệt  
**Nguồn:** `SRS-FIN-001` đến `SRS-FIN-013`, `SRS-SAL-007` đến `SRS-SAL-008`, `SRS-PUR-002`, `SRS-PUR-010`

## Ownership

Finance sở hữu Payment, CashTransaction, obligation Receivable/Payable, PaymentAllocation, CustomerCredit/SupplierPrepayment, Shift và Expense. Số dư luôn dẫn xuất từ ledger/allocation đã Approved; không có cột số dư người dùng sửa.

## Commands

| Command | Hậu quả |
| --- | --- |
| `finance.payment.record` | Payment/CashTransaction và Allocation trong cùng command; phần dư thành credit/prepayment. |
| `finance.payment.reverse` | Counter-transaction và reversal allocation; không sửa chứng từ gốc. |
| `finance.shift.open/close/lock` | Opening cash; close tính expected, variance/reason; Locked bất biến. |
| `finance.expense.approve` | Expense + Disbursement/CashTransaction; không là giá vốn trừ landed cost Purchasing. |

POS Completed/Shipped gọi Finance trong checkout command. CashTransaction POS luôn mang `shiftId` khi policy bắt buộc ca; không chuyển giao dịch Completed sang ca khác. Shift state: `Open → SubmittedForClose → Closed → Locked`; mọi điều chỉnh sau Locked là chứng từ mới có audit.

## Tests

Bao phủ allocation nhiều-nhiều, payment dư, reversal, hạn mức nợ, một cashier/một drawer, POS thiếu ca, variance close và adjustment sau lock.
