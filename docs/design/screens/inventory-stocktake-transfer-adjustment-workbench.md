# Inventory Stocktake, Transfer & Adjustment Workbench Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `inventory-stocktake-transfer-adjustment-workbench.html`

## Phạm vi

- Hash/state cần verify: `#transfer`, `#stocktake`, `#adjustment`, `#scrap`, `#negative-cost`, `#trace`.
- Bao phủ movement ledger, transfer pick/receive, stocktake variance, movement-after-snapshot warning, adjustment evidence, scrap quarantine, negative temporary cost và lot/serial trace.
- Theo `docs/product/srs/inventory.md`, `docs/architecture/modules/inventory.md`.

## Rule triển khai

- InventoryMovement là ledger bất biến; correction qua movement mới.
- Stocktake/adjustment/transfer approval guard không được bypass ở UI.
- Negative cost/temp cost chỉ là warning/state từ backend, không tự tính lại trong UI.
