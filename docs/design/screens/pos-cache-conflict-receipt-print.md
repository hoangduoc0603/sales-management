# POS Cache, Conflict, Receipt & Print Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `pos-cache-conflict-receipt-print.html`

## Phạm vi

- Hash/state cần verify: `#cache-ready`, `#version-conflict`, `#checkout-timeout`, `#receipt`, `#print-reprint`.
- Bao phủ POS cache freshness/version, server conflict diff, checkout timeout/idempotency retry, receipt snapshot, K80/A4 print và reprint.
- Theo `docs/product/srs/overview.md`, `docs/product/srs/sales-orders.md`, `docs/architecture/modules/sales-pos-returns.md`.

## Rule triển khai

- Không tạo đơn/khoản thu trùng khi retry timeout; UI chỉ hiển thị retry theo command id.
- Conflict giá/tồn/promotion phải yêu cầu thu ngân áp dụng quote mới hoặc quay lại giỏ.
- Print/reprint dùng receipt snapshot, không tạo ledger mới.
- Bám artifact, custom controls, light/dark, không native select.
