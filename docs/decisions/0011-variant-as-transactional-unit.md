# ADR 0011 — Variant là đơn vị giao dịch duy nhất

**Trạng thái:** Accepted  
**Liên quan:** [LLD Catalog–CRM](../architecture/modules/catalog-crm.md), `SRS-CRM-001` đến `SRS-CRM-005`

## Bối cảnh

Product có thể có biến thể, barcode, đơn vị, giá, tồn, lô và serial độc lập. Cho phép vừa Product vừa Variant là đơn vị giao dịch tạo ngoại lệ ở mọi ledger, lookup, pricing và report.

## Quyết định

`Product` là aggregate mô tả; `Variant` là đơn vị sale/purchase/inventory/pricing/barcode/serial duy nhất. Product không có biến thể phức tạp vẫn tạo một Default Variant. Bundle dùng variant không có tồn độc lập và BOM versioned; checkout snapshot BOM rồi issue component.

## Hệ quả

Transaction schema và API line chỉ mang `variantId`; UI có thể hiển thị Product/Variant. Báo cáo gộp Product qua Variant. Migration/import phải tạo Default Variant cho product đơn giản.

## Phương án không chọn

Cho Product bán trực tiếp, hoặc bỏ Product chỉ dùng SKU. Hai phương án làm ranh giới dữ liệu không nhất quán hoặc mất cấu trúc catalog/variant.
