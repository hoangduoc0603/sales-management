# ADR 0010 — Hybrid Sheet record schema

**Trạng thái:** Accepted  
**Liên quan:** [Sheet schema and registry](../data-model/sheet-schema-and-registry.md), [Logical data model](../data-model/logical-data-model.md), `SRS-OVR-003`, `SRS-OVR-011`

## Bối cảnh

Schema toàn cột làm document snapshot nhanh chóng rộng và khó migration; schema toàn JSON không thể hỗ trợ scope query, projection, export và hot path POS hiệu quả trên Google Sheets.

## Quyết định

Dùng row schema hybrid qua TableRegistry. ID, scope, status, lifecycle, reference, amount/quantity, time, lookup key và projection field dùng cột typed. Snapshot/details có cấu trúc sâu, không dùng cho hot query, dùng JSON versioned đã sanitize. Ledger vẫn append-only; balance/read model là projection đối soát được.

## Hệ quả

Mỗi table dictionary phải phân loại field typed/JSON, khai báo schema version và lookup key. JSON không được chứa secret hay thay thế foreign key, state, tiền/số lượng hoặc scope. Migration chỉ append cột/tạo table mới theo registry; code không hard-code header index/row number.

## Phương án không chọn

All-columns, all-JSON hoặc EAV generic. Các phương án này lần lượt làm schema quá rộng, query/report yếu hoặc mất type/integrity và tăng I/O/migration complexity.
