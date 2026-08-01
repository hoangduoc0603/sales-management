# Finance & Shifts Design Handoff

## Trạng thái

- Status: `Approved` — đã được người dùng duyệt, được dùng làm nguồn triển khai UI.
- Design System: Cenio Core v0.7
- Open Design: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` / `finance-shifts.html`

## Hash/state cần verify

- `#ledger`
- `#aging`
- `#shift`
- `#expense`

## Phạm vi

Sổ quỹ/tài khoản, phiếu thu–chi, Payment/Allocation/Credit/Prepayment, công nợ aging, ca mở–đóng–khóa và chi phí vận hành, kèm state recovery.

## Rule triển khai

- Theo `SRS-FIN-001..013`, SRS Sales/Purchasing liên quan và LLD `finance-shifts.md`.
- Ledger/Payment/Allocation Approved bất biến; số dư chỉ từ projection backend, không có field sửa số dư.
- Scope/permission/COGS, custom listbox, theme token v0.7 và button loading theo rule chung.

## Đã kiểm tra

- Không native select/nội dung ngoài phạm vi; SVG/render đạt.
- Dark subtle 9.22:1, filled primary 5.94:1; status icon + copy.
