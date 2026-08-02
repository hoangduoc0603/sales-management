# Performance playbook

**Trạng thái:** Approved
**Nguồn policy:** [Runtime và hiệu năng](runtime-and-performance.md), `SRS-OVR-012`–`024`, ADR 0004, ADR 0005, ADR 0016 và ADR 0017.

Tài liệu này là entrypoint bắt buộc trước mọi thay đổi có API, Google Sheets/Drive, command/query, cache, worker, payload/read model lớn hoặc UI hiển thị dữ liệu lớn. Nó không thay SRS/ADR; khi mâu thuẫn, áp dụng thứ tự ưu tiên trong `AGENTS.md`.

## 1. Performance intake bắt buộc

Mỗi implementation plan hoặc task phải hoàn thành bảng này trước code. Không có SLO nghĩa là nêu rõ vì sao path không nằm trên fast path.

| Field | Decision cần ghi |
| --- | --- |
| Path class | `Query`, `Command`, `Worker` hoặc browser-local interaction. |
| User/SRS budget | SLO SRS, p95/p99 hoặc lý do không áp dụng. |
| Read/write set | Table/projection/partition, lookup key, estimated Google service calls và payload. |
| Cache | Key namespace, TTL/version, invalidation, stale fallback, data không được cache. |
| Lock | Việc preflight ngoài lock, revalidation cạnh tranh trong lock, append và flush trước unlock. |
| Worker | Lý do đồng bộ hoặc job/lease/checkpoint/retry budget nếu nền. |
| Telemetry | `stages`, `io`, client timing nào chứng minh budget. |
| Evidence | Unit/integration/concurrency/performance test, môi trường và số mẫu production. |

## 2. Read, cache và browser

- Browser-local interaction như POS scan/search/cart không RPC khi data warm. Bootstrap chỉ tải projection đúng scope; detail/history/lot/serial lazy-load.
- Browser cache key tách installation, tenant/user, `authVersion`, app/schema version, scope và resource version. Cache stale chỉ phục vụ read; logout, auth/permission error hoặc deploy incompatibility phải xóa namespace phù hợp.
- `CacheService` là cache-aside có TTL, size cap, invalidation và fallback source of truth. Không lưu raw token, password, verifier, secret; không dùng cache persistent để quyết định tồn, tiền, công nợ, quyền hoặc commit.
- Đọc Sheets dùng lookup key/partition/projection hẹp. Không full scan transaction/history trong fast path; reuse handle/cache execution-local và invalidate sau append.

## 3. Command và Google Sheets I/O

- Parse/auth/permission, projection build và validation không cạnh tranh ở ngoài lock. Trong lock chỉ final idempotency, fresh narrow revalidation, sequence cần thiết, batch append/update và flush.
- `CommandTransaction` giữ ADR 0016 single-commit: retry dùng cùng `commandId`/`idempotencyKey`, cache result chỉ hỗ trợ retry gần và durable record là fallback. Không thêm state/recovery protocol nếu chưa có ADR mới.
- Deferred append phải flush trước `SpreadsheetApp.flush()` và release `ScriptLock`. Flush lỗi đi qua error path hiện có; không tự khẳng định recovery outcome ngoài ADR hiện hành.
- Không gọi Drive/PDF/export/report/notification, refresh dashboard, full projection/history scan hoặc Google service không cần thiết trong lock. Không xen kẽ read/write trong loop; batch ranges trong cùng spreadsheet.

## 4. Worker và dữ liệu lớn

- Backup, archive, import lớn, export, reconciliation, cleanup runtime và cảnh báo quota dùng scheduled worker có `runId`, lease/checkpoint, execution budget, retry backoff/jitter.
- Worker không complete POS hay tạo ledger core thay command đồng bộ. Report/export lớn trả trạng thái tra cứu lại và không cạnh tranh POS.
- Tối ưu primitive chung trước khi nhân bản cache/lookup logic theo từng feature; chỉ thêm cache khi số đo cho thấy bottleneck và invalidation đã xác định.

## 5. Telemetry, test và release evidence

- `ApiMeta` dùng `durationMs`, `stages`, `io`; command fast path phải có lock wait/hold, flush, domain stage và I/O full-scan/batch counters liên quan.
- Viết test trước thay đổi hành vi. Test fast path phải chứng minh read/lookup/flush boundary, retry/idempotency, permission/scope và concurrent path không đổi nghiệp vụ.
- Local benchmark là regression nhanh. Evidence Apps Script `/dev` hoặc production phải có cache cold/warm, môi trường, profile SRS, số mẫu, p50/p95/p99/max, stage/I/O chính. Dưới 20 mẫu chỉ ghi smoke evidence.
- Release ảnh hưởng POS bị chặn khi vượt SLO hoặc có full-scan/I/O regression; không bù bằng timeout, cache sai source of truth hoặc chuyển ledger sang worker.
