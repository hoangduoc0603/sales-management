# ADR 0016 — Command journal single-commit fast path

**Trạng thái:** Accepted  
**Supersedes một phần:** [ADR 0005](0005-command-journal-idempotency-short-lock.md) về cách ghi `CommandTransaction` trên happy path  
**Audit step superseded by:** [ADR 0017](0017-record-actor-metadata-no-standalone-audit.md)  
**Liên quan:** [Runtime và hiệu năng](../architecture/runtime-and-performance.md), [Platform Technical Design](../architecture/platform-technical-design.md)

## Bối cảnh

Benchmark Apps Script cho POS checkout cho thấy một phần latency đến từ việc command mới ghi `CommandTransaction Preparing`, chạy handler, rồi ghi tiếp `Committed`. Với Google Sheets, mỗi append/version lookup tạo thêm I/O và latency biến động. Trong implementation hiện tại, bản ghi `Preparing` chưa được dùng để recovery an toàn; retry vẫn dựa trên `Committed resultJson` theo idempotency key.

Ledger cốt lõi và materialized balance vẫn phải được ghi đồng bộ trước khi trả success. Theo ADR 0017, baseline không còn ghi `AuditOutbox` trong hot path; truy vết actor nằm trên chính record/chứng từ/ledger qua các field `createdBy`, `updatedBy`, `approvedBy` và các field `...By` tương ứng.

## Quyết định

Với command mới trên hot path, Command Coordinator dùng **single-commit fast path**:

1. Trong `ScriptLock`, kiểm tra idempotency lần cuối bằng `idempotencyKey`.
2. Nếu đã có `Committed resultJson`, trả lại kết quả cũ và không chạy handler.
3. Nếu chưa có command committed, chạy handler nghiệp vụ để ghi document/ledger/projection bắt buộc.
4. Append một bản ghi `CommandTransaction` `Committed` kèm `resultJson`.

Nếu handler ném lỗi trước khi trả kết quả, append một bản ghi `Failed` đã sanitize để hỗ trợ tra cứu trạng thái. Trạng thái `Preparing` vẫn nằm trong schema để tương thích recovery/migration hoặc command phức tạp sau này, nhưng không còn là bước mặc định của fast path.

## Hệ quả

- Mỗi mutation happy path giảm một append command và một vòng version lookup so với ghi `Preparing -> Committed`.
- Idempotency vẫn dựa trên `idempotencyKey` và `Committed resultJson`; retry không tạo ledger lần hai khi command đã committed.
- `AuditOutbox` không còn là evidence bắt buộc theo ADR 0017.
- Worker vẫn không được hoàn tất POS hoặc tạo ledger cốt lõi thay command đồng bộ.
- Nếu sau này cần recovery “unknown outcome” mạnh hơn, phải thiết kế thêm cơ chế command recovery thật sự thay vì chỉ ghi `Preparing` nhưng không sử dụng.

## Phương án không chọn

- Giữ `Preparing -> Committed` cho mọi command: đúng mô hình ban đầu nhưng tạo I/O không còn mang lại recovery thực tế trong implementation hiện tại.
- Đẩy `CommandTransaction` sang worker: nhanh hơn nhưng phá idempotency/outcome trước success.
- Đẩy một phần ledger POS sang worker: phá cam kết server-authoritative checkout và không phù hợp SRS/ADR hiện tại.
