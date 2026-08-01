# Report Builder & Drilldown Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `report-builder-drilldown.html`

## Phạm vi

- Hash/state cần verify: `#builder`, `#sales`, `#inventory`, `#cash-shift`, `#customer`, `#commission`, `#drilldown`, `#export`.
- Bao phủ date semantics, branch/warehouse scope, column picker, saved view, KPI/table/chart drilldown, sensitive field restriction và export run.
- Theo `docs/product/srs/access-reporting.md`, `docs/architecture/modules/administration-reporting-operations.md`.

## Rule triển khai

- Reports phải hiển thị `generatedAt`/`asOf`/coverage khi dữ liệu stale/partial.
- Sensitive columns không chỉ ẩn bằng UI; API/export phải cắt trước.
- Drilldown và export dùng cùng scope/filter đã chọn.
