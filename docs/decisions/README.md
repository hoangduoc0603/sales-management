# Quyết định kiến trúc

ADR ghi bối cảnh, quyết định, hệ quả và phương án thay thế cho các lựa chọn khó đảo. [Solution Design](../architecture/solution-design.md) là tài liệu tổng quan; SRS vẫn là nguồn yêu cầu hành vi/tiêu chí nghiệm thu.

| ADR | Trạng thái | Quyết định |
| --- | --- | --- |
| [0001](0001-public-web-app-internal-session.md) | Accepted | Public Web App, identity/session nội bộ. |
| [0002](0002-htmlservice-modular-monolith.md) | Accepted | React/Vite trong HtmlService và modular monolith. |
| [0003](0003-storage-roles-partition-archive.md) | Accepted; audit partition superseded by [0017](0017-record-actor-metadata-no-standalone-audit.md) | Storage role, transaction partition và archive. |
| [0004](0004-performance-first-pos.md) | Accepted | POS local-first read, server-authoritative commit. |
| [0005](0005-command-journal-idempotency-short-lock.md) | Accepted | Command journal, idempotency và ScriptLock ngắn. |
| [0006](0006-customer-owned-deployment-migration.md) | Accepted | Customer-owned deployment và versioned migration. |
| [0007](0007-backup-manifest-replacement-restore.md) | Accepted | Backup manifest và restore sang resource thay thế. |
| [0008](0008-mandatory-audit-outbox.md) | Superseded by [0017](0017-record-actor-metadata-no-standalone-audit.md) | Audit outbox bền vững, projection audit bất đồng bộ. |
| [0009](0009-single-rpc-api-gateway.md) | Accepted | Typed RPC qua một public API gateway. |
| [0010](0010-hybrid-sheet-record-schema.md) | Accepted | Hybrid row schema: typed columns và JSON snapshot versioned. |
| [0011](0011-variant-as-transactional-unit.md) | Accepted | Variant là đơn vị giao dịch; Product là aggregate mô tả. |
| [0012](0012-quote-then-commit-commercial-policy.md) | Accepted | Quote không reserve; policy usage commit cùng đơn. |
| [0013](0013-explicit-save-pos-draft.md) | Accepted | POS local-first; chỉ persist đơn khi user lưu tạm. |
| [0014](0014-scaled-quantity-integer-inventory-value.md) | Accepted | Quantity milli-unit, inventory value và issue value VND integer. |
| [0015](0015-late-purchase-cost-adjustment.md) | Accepted | Chi phí mua muộn vào tồn còn lại, phần đã bán thành variance. |
| [0016](0016-command-journal-single-commit-fast-path.md) | Accepted; audit step superseded by [0017](0017-record-actor-metadata-no-standalone-audit.md) | Command journal dùng single-commit fast path cho command mới, giữ idempotency; không còn ghi audit outbox trong baseline. |
| [0017](0017-record-actor-metadata-no-standalone-audit.md) | Accepted | Không lưu audit nghiệp vụ riêng; dùng actor metadata trên record/chứng từ/ledger. |

ADR thay đổi quyết định đã Accepted phải ghi rõ `Supersedes`/`Superseded by`; không để hai quyết định mâu thuẫn cùng Accepted.
