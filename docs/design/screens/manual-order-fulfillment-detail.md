# Manual Order Fulfillment Detail Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `manual-order-fulfillment-detail.html`

## Phạm vi

- Hash/state cần verify: `#draft`, `#confirmed`, `#packing`, `#shipped`, `#cancel-guard`.
- Bao phủ đơn nhập tay/online order detail, customer card, reservation, COD/deposit, shipping handoff, attachment và cancel guard.
- Theo `docs/product/srs/sales-orders.md`, `docs/architecture/modules/sales-pos-returns.md`.

## Rule triển khai

- State order phải đến từ backend; UI không tự bỏ qua fulfillment/cancel guard.
- Reservation, payment obligation và shipping state hiển thị riêng, không gộp thành trạng thái đơn đơn giản.
- Không thêm integration carrier/marketplace ngoài SRS.
