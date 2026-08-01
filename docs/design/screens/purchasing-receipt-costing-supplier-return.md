# Purchasing Receipt, Costing & Supplier Return Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `purchasing-receipt-costing-supplier-return.html`

## Phạm vi

- Hash/state cần verify: `#po`, `#goods-receipt`, `#landed-cost`, `#late-invoice`, `#supplier-return`, `#supplier-payment`.
- Bao phủ supplier card, PO approval, GRN lot/serial validation, receipt value, moving average cost preview, landed cost allocation, late invoice adjustment, supplier return/payment.
- Theo `docs/product/srs/purchasing.md`, `docs/product/srs/finance.md`, `docs/architecture/modules/purchasing.md`.

## Rule triển khai

- PO/GRN/costing state phải theo backend; UI không tự ghi inventory/payable.
- Late invoice và landed cost phải thể hiện adjustment, không sửa ledger lịch sử.
- Supplier payment allocation phải đối chiếu obligation/cash ledger.
