# ADR 0008 — Mandatory audit outbox

**Trạng thái:** Superseded by [ADR 0017](0017-record-actor-metadata-no-standalone-audit.md)  
**Liên quan:** [logical data model](../data-model/logical-data-model.md)

## Bối cảnh

Audit là bắt buộc nhưng ghi audit sang Spreadsheet riêng trong checkout tạo thêm cross-file latency/failure point.

## Quyết định

Command nghiệp vụ ghi `AuditOutbox` bền vững cùng transaction hot path. Worker idempotent copy sang Audit partition append-only; audit query/reconciliation bao gồm event pending để không mất dấu vết.

## Hệ quả

POS không chờ Audit Spreadsheet nhưng audit evidence tồn tại trước success. Worker phải có retry, delivery state và cảnh báo lỗi; audit không chứa password/token/secret.

## Phương án không chọn

Tắt audit business mặc định, chỉ ghi audit async không bền vững, hoặc ghi trực tiếp Audit Data trong mọi checkout.
