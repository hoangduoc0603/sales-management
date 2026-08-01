# Runtime và hiệu năng

**Nguồn tổng quan:** [Solution Design](solution-design.md). Tài liệu này biến ưu tiên performance-first POS thành quy tắc triển khai và kiểm thử.

## 1. Performance contract

Baseline bắt buộc là cửa hàng nhỏ với một Branch, một Warehouse, một thu ngân; kiến trúc vẫn hỗ trợ đa Branch/Warehouse. Điều kiện mạng, trình duyệt và dữ liệu benchmark được quy định trong SRS.

| Luồng | Mục tiêu |
| --- | --- |
| Scan/add item sau khi POS ready | p95 <= 150 ms tại browser |
| Search catalog đã đồng bộ | p95 <= 250 ms tại browser |
| Thay đổi giỏ | p95 <= 100 ms tại browser |
| Complete POS | p95 <= 3 giây, p99 <= 5 giây, không tính in |
| Mở/reload POS | p95 <= 5 giây |

Không endpoint nào được quét full transaction table trong fast path chỉ để tìm product, xác nhận tồn, tính giỏ hoặc kiểm tra trạng thái command.

## 2. Read path và cache

Browser dùng memory cache cho tab hiện tại và IndexedDB cho catalog/read model đã xác thực. POS bootstrap chỉ trả đúng Branch/Warehouse, catalog projection, barcode index, price/promotion policy và version cần thiết; detail/history/lot/serial lazy-load khi người dùng mở.

Cache client có key gồm installation, user, permission/auth version, app/schema version, scope và resource version. Cache cũ chỉ là stale read-only fallback; logout, auth/permission error hoặc deployment mới phải xóa namespace tương ứng.

Apps Script `CacheService` dùng cache-aside cho config, permission summary ngắn hạn và master data ít đổi. Cache miss là trạng thái bình thường; cache không được làm một operation sai hoặc không dùng được. Ledger, audit, command state và số dư quyết định checkout không được cache persistent.

Khi Catalog/price/promotion thay đổi, mutation tăng resource version hoặc invalidate tag. Browser tải delta; không tải lại toàn bộ catalog nếu không cần. Server luôn revalidate ở `completeSale`; kết quả khác cached cart trả conflict chi tiết, không tự đổi giá.

## 3. Write fast path

`completeSale` là một command có `commandId` và `idempotencyKey` do client tạo. Trước lock chỉ làm auth, permission, schema validation và read hẹp. Vùng lock dùng `ScriptLock` và phải chỉ bao gồm:

1. kiểm tra lại idempotency và dữ liệu có thể cạnh tranh;
2. cấp sequence cần thiết;
3. batch append/update document, ledger, materialized balance, command transaction và audit outbox ở active transaction partition;
4. `SpreadsheetApp.flush()` trước khi release lock.

Không mở Drive, sinh PDF, export, gửi notification, load catalog, refresh báo cáo hoặc gọi dịch vụ ngoài trong lock. Với baseline một thu ngân, lock hầu như không có contention. Không xây logical lock phức tạp trước khi telemetry chứng minh `lockWaitMs` là bottleneck.

`CommandTransaction` hỗ trợ `Preparing`, `Committed`, `Failed`, nhưng command mới trên fast path dùng single-commit append theo [ADR 0016](../decisions/0016-command-journal-single-commit-fast-path.md): kiểm tra idempotency, ghi document/ledger/projection và `AuditOutbox`, rồi append `Committed` kèm response snapshot. Chỉ record thuộc command `Committed` được tính vào report/read model. Retry cùng idempotency key trả result cũ hoặc tiếp tục recovery an toàn; không tạo order/ledger lần hai.

## 4. I/O, quota và worker

Gateway batch read/write theo header mapping, chỉ đọc cột/row cần thiết và reuse spreadsheet/sheet handle trong một execution. Không xen kẽ read/write trong vòng lặp; không dùng Sheet formula, `IMPORTRANGE`, format hoặc pivot nặng để xử lý nghiệp vụ.

Worker có một scheduled trigger chung, `runId`, checkpoint, execution budget và retry có backoff/jitter. Worker chỉ làm audit projection, backup, export lớn, archive, import batch, reconciliation, cleanup runtime và cảnh báo quota/capacity. Worker không complete POS hoặc tạo ledger cốt lõi thay command đồng bộ.

## 5. Telemetry và regression gate

`ApiMeta` đo `serverDurationMs`, transport/cold-start overhead, stage timing, `spreadsheetOpens`, table read/write, cells read/written và `lockWaitMs`. Success bình thường không ghi SystemEvent bền vững; warning/error mới được ghi best-effort.

Release ảnh hưởng POS phải benchmark cache cold/warm với profile SRS, gồm mở POS, scan liên tiếp, search, cart, checkout đơn giản/phức tạp, retry, hai checkout đồng thời và export/report nền. Release bị chặn nếu vượt SLO hoặc có full-table scan/I/O regression trong fast path.
