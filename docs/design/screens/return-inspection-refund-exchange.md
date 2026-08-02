# Return Inspection, Refund & Exchange Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `return-inspection-refund-exchange.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/return-inspection-refund-exchange.html`

## Phạm vi

- Hash/state cần verify: `#with-original`, `#fast-return`, `#inspection`, `#refund`, `#exchange`, `#warranty`.
- Bao phủ original sale link, fast return permission, quarantine/restock/scrap inspection, refund/credit, exchange order và serial/warranty mapping.
- Theo `docs/product/srs/sales-orders.md`, `docs/product/srs/inventory.md`, `docs/product/srs/finance.md`, `docs/architecture/modules/sales-pos-returns.md`.

## Rule triển khai

- Refund/exchange không sửa đơn gốc; phải hiển thị chứng từ liên kết và ledger impact preview.
- Fast return là state theo quyền; UI không thay permission backend.
- Inspection result quyết định quarantine/restock/scrap theo backend.
