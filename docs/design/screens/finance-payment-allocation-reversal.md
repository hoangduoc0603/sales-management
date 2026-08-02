# Finance Payment Allocation & Reversal Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `finance-payment-allocation-reversal.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/finance-payment-allocation-reversal.html`

## Phạm vi

- Hash/state cần verify: `#receipt-voucher`, `#payment-voucher`, `#allocation`, `#credit`, `#reversal`, `#source-drilldown`.
- Bao phủ voucher editor, many-to-many allocation, credit/prepayment, reversal request, source drilldown và permission restricted state.
- Theo `docs/product/srs/finance.md`, `docs/architecture/modules/finance-shifts.md`.

## Rule triển khai

- Reversal không sửa chứng từ gốc; phải hiển thị original immutable và approval reason.
- Allocation dùng dữ liệu obligation/cash account từ backend.
- Sensitive finance data phải bị cắt ở API khi thiếu quyền.
