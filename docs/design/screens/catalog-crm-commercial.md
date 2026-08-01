# Catalog, CRM & Commercial Design Handoff

## Trạng thái

- Status: `Approved` — đã được người dùng duyệt, được dùng làm nguồn triển khai UI.
- Design System: Cenio Core v0.7
- Open Design: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` / `catalog-crm-commercial.html`

## Hash/state cần verify

- `#catalog`
- `#customers`
- `#commercial`
- `#imports`

## Phạm vi

Product/Variant và bundle formula version, catalog import/label, customer/profile/merge/loyalty, price list, promotion/voucher và commission lookup, kèm các state nghiệp vụ.

## Rule triển khai

- Theo `SRS-CRM-001..015`, `SRS-ACC-006/008/017`, LLD `catalog-crm.md`.
- Không hard delete dữ liệu đã tham chiếu; price/policy/unit version có hiệu lực về sau, không sửa snapshot cũ.
- Sensitive receivable/cost/profit chỉ từ backend permission; dùng custom listbox, token Core v0.7 và loading icon-only.
- Visual theo hướng TailAdmin-inspired: AppShell dark/light đồng bộ, sidebar/top tabs có deep link hash `#catalog`, `#customers`, `#commercial`, `#imports` và alias `#view-*`.
- Vùng import dùng dropzone click toàn vùng để chạy upload; không hiển thị nút `Chọn tệp` riêng trong dropzone.

## Đã kiểm tra

- No native select, gradient, selector user rộng hoặc nội dung ngoài phạm vi; render + SVG đạt.
- Dark subtle 9.22:1, filled primary 5.94:1; có loading, empty, validation, restricted, scope/stale/command state.
- State lab ẩn khỏi ready view; script parse và render desktop hash `#imports` đã được kiểm tra.
