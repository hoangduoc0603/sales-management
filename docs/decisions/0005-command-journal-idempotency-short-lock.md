# ADR 0005 — Command journal, idempotency và ScriptLock ngắn

**Trạng thái:** Accepted  
**Liên quan:** [runtime và hiệu năng](../architecture/runtime-and-performance.md)

## Bối cảnh

Google Sheets không có ACID transaction đa bảng; timeout/retry và thao tác trùng có thể tạo sai tồn/tiền. Global lock dài làm POS chậm.

## Quyết định

Mỗi critical command có `commandId`/idempotency key và `CommandTransaction` `Preparing`/`Committed`/`Failed`. Baseline dùng `ScriptLock` chỉ trong đoạn fresh revalidation + batch commit + flush; committed record mới được tính. Timeout retry cùng key trả result cũ/recovery.

## Hệ quả

Không coi compensating unit of work là ACID. Không xây logical lock per-SKU baseline; chỉ cân nhắc khi telemetry chứng minh contention. POS phải ghi ledger/số dư/outbox đồng bộ trước success.

## Phương án không chọn

Không khóa, retry bằng key mới, hoặc worker hoàn tất ledger sau khi POS báo thành công.
