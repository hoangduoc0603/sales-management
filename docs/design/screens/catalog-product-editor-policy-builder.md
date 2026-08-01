# Catalog Product Editor & Policy Builder Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `catalog-product-editor-policy-builder.html`

## Phạm vi

- Hash/state cần verify: `#product`, `#variant`, `#bundle`, `#price-list`, `#promotion`, `#commission`.
- Bao phủ product master, SKU/barcode, unit conversion, lot/serial type, bundle formula, price list, promotion/voucher stacking, points, commission và warranty policy.
- Theo `docs/product/srs/customers-promotions.md`, `docs/architecture/modules/catalog-crm.md`.

## Rule triển khai

- Variant là transactional unit; không tự đổi requirement về SKU/stock type.
- Promotion/voucher/price effective date phải theo quote/policy từ backend.
- Dùng custom listbox/toggle/segmented controls, không native select.
