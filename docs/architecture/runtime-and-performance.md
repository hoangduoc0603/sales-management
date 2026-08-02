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

Browser dùng memory cache cho tab hiện tại và IndexedDB cho catalog/read model đã xác thực. POS bootstrap chỉ trả đúng Branch/Warehouse, catalog projection, barcode index, price/promotion policy và version cần thiết; detail/history/lot/serial lazy-load khi người dùng mở. POS catalog projection được persist tại IndexedDB theo namespace `tenant:user:authVersion:appVersion:schemaVersion` và Branch/Warehouse; không lưu session token. Entry hỏng, IndexedDB bị tắt/đầy hoặc cache miss phải fallback remote; logout xóa namespace hiện hành, còn đổi auth/app/schema version tạo namespace mới nên không đọc dữ liệu cũ.

Cache client có key gồm installation, user, permission/auth version, app/schema version, scope và resource version. Cache cũ chỉ là stale read-only fallback; logout, auth/permission error hoặc deployment mới phải xóa namespace tương ứng.

Apps Script `CacheService` dùng cache-aside cho config, permission summary ngắn hạn, current scope đã resolve, session metadata đã fingerprint, command result snapshot gần nhất, master data ít đổi và runtime state nhỏ có invalidation rõ ràng như `Shift` theo `shiftId`. Catalog master tables được cache theo table/schema version khi payload nằm dưới ngưỡng an toàn của CacheService; mọi mutation catalog phải invalidate table cache tương ứng. Current scope cache key phải gồm tenant, user, `authVersion`, branch scope và warehouse scope; TTL ngắn hơn master data cache để giảm stale khi đổi phân quyền/scope, và cache miss phải fallback Sheets. Session cache chỉ lưu token fingerprint, user/authVersion và expiry metadata; không lưu raw token, password hoặc verifier, và cache miss phải fallback Sheets. Command cache chỉ lưu `CommandTransactionRecord` đã tối giản theo idempotency key để phục vụ retry gần; payload quá lớn thì bỏ cache và durable command sheet vẫn là source of truth. Shift cache TTL ngắn, cập nhật khi save/open/close/lock shift qua ứng dụng và cache miss phải fallback Sheets. Cache miss hoặc payload quá lớn là trạng thái bình thường; cache không được làm một operation sai hoặc không dùng được. Ledger và số dư quyết định checkout không được cache persistent.

Khi Catalog/price/promotion thay đổi, mutation tăng resource version hoặc invalidate tag. Browser tải delta; không tải lại toàn bộ catalog nếu không cần. Server luôn revalidate ở `completeSale`; kết quả khác cached cart trả conflict chi tiết, không tự đổi giá.

POS được phép prewarm read-only ngay sau khi projection sẵn sàng bằng `sales.pos.prewarmCheckoutContext`: request nền chỉ làm nóng Shift theo `shiftId` và tối đa 20 InventoryBalance của variant đang hiển thị. Prewarm không được ghi nghiệp vụ, không tạo session/command, không giữ lock và không thay thế kiểm tra trong checkout. Nếu prewarm lỗi hoặc chưa kịp hoàn tất, POS vẫn phải hoạt động bằng cache miss fallback trong `sales.pos.complete`.

## 3. Write fast path

`completeSale` là một command có `commandId` và `idempotencyKey` do client tạo. Trước lock chỉ làm auth, permission, schema validation và read hẹp. Vùng lock dùng `ScriptLock` và phải chỉ bao gồm:

1. kiểm tra lại idempotency và dữ liệu có thể cạnh tranh;
2. cấp sequence cần thiết;
3. batch append/update document, ledger, materialized balance và command transaction ở active transaction partition;
4. `SpreadsheetApp.flush()` trước khi release lock.

Không mở Drive, sinh PDF, export, gửi notification, load catalog, refresh báo cáo hoặc gọi dịch vụ ngoài trong lock. Với baseline một thu ngân, lock hầu như không có contention. Không xây logical lock phức tạp trước khi telemetry chứng minh `lockWaitMs` là bottleneck.

`CommandTransaction` hỗ trợ `Preparing`, `Committed`, `Failed`, nhưng command mới trên fast path dùng single-commit append theo [ADR 0016](../decisions/0016-command-journal-single-commit-fast-path.md): ưu tiên cache-only idempotency lookup cho retry gần, ghi document/ledger/projection bắt buộc, rồi append `Committed` kèm response snapshot. Không scan `CommandTransaction` bền vững trước mỗi command mới chỉ để chứng minh idempotency key chưa tồn tại; retry muộn hoặc tra cứu explicit dùng `platform.command.getStatus`/durable command repository. Frontend POS phải giữ `commandId`/`idempotencyKey` ổn định cho cart đang complete và không tạo key mới cho retry cùng thao tác. Response snapshot trong command journal là kết quả client-facing tối thiểu để retry an toàn, ví dụ POS chỉ cần order/lines/receipt/conflict/receivable cần render UI; không lưu kèm ledger, movement, payment/cash transaction internals khi các record đó đã có source of truth riêng. Theo [ADR 0017](../decisions/0017-record-actor-metadata-no-standalone-audit.md), không ghi `AuditOutbox` trong baseline; record nghiệp vụ tự lưu actor metadata. Chỉ record thuộc command `Committed` được tính vào report/read model. Retry cùng idempotency key trả result cũ hoặc tiếp tục recovery an toàn; không tạo order/ledger lần hai.

## 4. I/O, quota và worker

Gateway batch read/write theo header mapping, chỉ đọc cột/row cần thiết và reuse spreadsheet/sheet handle trong một execution. Production write path ưu tiên defer append trong request và flush cuối request bằng Google Sheets Advanced Service `spreadsheets.values.batchUpdate` để gom nhiều range cùng spreadsheet vào một API call; khi advanced service không có thì fallback ghi đồng bộ bằng SpreadsheetApp. Trong cùng execution, gateway phải reuse trạng thái append của từng sheet sau lần đảm bảo header/lastRow đầu tiên; không được gọi lại `getLastRow()` cho từng append cùng sheet. Gateway được cache kết quả lookup exact theo table/partition/column/value trong cùng execution và phải invalidate khi append vào table đó. Registry phải khai báo `lookupKeys` cho khóa unique nóng để gateway dùng targeted lookup thay vì full scan bảng nhỏ; tối thiểu gồm `CommandTransaction.commandId`, `CommandTransaction.idempotencyKey`, `InventoryBalance.balanceId`, `Shift.shiftId`, `Variant.variantId` và `UnitConversionVersion.unitVersionId`. Nếu trong cùng request cần đọc Sheet thật trong khi còn pending append, gateway phải flush trước khi đọc để không trả dữ liệu cũ. Repository/service được phép dùng execution-local cache cho record/version vừa đọc để tránh lookup lại trước projection append trong cùng command. Khi cần kiểm tra/làm nóng tồn nhiều SKU cùng warehouse, inventory repository phải dùng bulk balance lookup: đọc cache theo `balanceId` trước, và nếu nhiều cache miss thì lookup theo `warehouseId` một lần rồi cache lại từng `InventoryBalance`; không loop `getBalance()` gây nhiều lần đọc Sheets. POS stock precheck phải aggregate quantity theo `variantId` trong giỏ và lookup đúng các balance liên quan; không đọc toàn bộ warehouse balance để kiểm tra một giỏ nhỏ. Với POS chỉ có một dòng, có thể bỏ stock precheck riêng và để `issueForSale` tự kiểm tồn trước khi ghi movement/projection để tránh đọc balance hai lần; với nhiều dòng vẫn phải precheck để tránh partial side effects. POS checkout chuẩn bị catalog projection chỉ-đọc dùng để tạo snapshot trước lock; trong lock phải quote lại riêng các Variant/UnitConversionVersion của cart, đồng thời kiểm tra ca/tồn hiện hành. POS checkout đã có `shiftId` phải validate ca bằng lookup trực tiếp theo `shiftId` rồi kiểm tra status/scope/cashier, không scan lịch sử ca theo cashier. Không xen kẽ read/write trong vòng lặp; không dùng Sheet formula, `IMPORTRANGE`, format hoặc pivot nặng để xử lý nghiệp vụ.

Worker có một scheduled trigger chung, `runId`, checkpoint, execution budget và retry có backoff/jitter. Worker chỉ làm backup, export lớn, archive, import batch, reconciliation, cleanup runtime và cảnh báo quota/capacity. Worker không complete POS hoặc tạo ledger cốt lõi thay command đồng bộ.

## 5. Telemetry và regression gate

`ApiMeta` trả `durationMs`, `stages` và `io`. Fast path phải ghi stage đủ để xem `command.lockWaitMs`, `command.lockHoldMs`, command/batch flush và các domain stage; I/O phải thể hiện spreadsheet open, table read/write, cells/ranges/rows và full-scan counter khi có. Client/debug drill đo transport/cold-start ngoài `ApiMeta`. Success bình thường không ghi SystemEvent bền vững; warning/error mới được ghi best-effort.

Release ảnh hưởng POS phải benchmark cache cold/warm với profile SRS, gồm mở POS, scan liên tiếp, search, cart, checkout đơn giản/phức tạp, retry, hai checkout đồng thời và export/report nền. Evidence ghi môi trường, cache state, số mẫu, p50/p95/p99/max và stage/I/O chính; dưới 20 mẫu chỉ là smoke evidence, không phải chứng nhận percentile. Release bị chặn nếu vượt SLO hoặc có full-table scan/I/O regression trong fast path.
