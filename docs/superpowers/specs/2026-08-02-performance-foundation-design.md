# Thiết kế — nền tảng hiệu năng toàn ứng dụng

**Trạng thái:** Chờ user duyệt spec  
**Nguồn:** `SRS-OVR-012` đến `SRS-OVR-024`, [Runtime và hiệu năng](../../architecture/runtime-and-performance.md), ADR 0004, ADR 0005, ADR 0016 và ADR 0017.

## 1. Mục tiêu và phạm vi

Chuẩn hóa hiệu năng thành quy ước xuyên miền, đồng thời đưa primitive dùng chung về đúng performance contract đã Accepted. Phạm vi gồm:

1. một performance playbook bắt buộc cho thay đổi có API, Google Sheets/Drive, cache, worker hoặc dữ liệu lớn;
2. command/write primitive bảo đảm deferred Sheets append được flush trước khi `ScriptLock` được nhả và telemetry đo được lock wait/hold;
3. POS checkout tách preflight không cạnh tranh khỏi commit critical section, vẫn fresh-revalidate hẹp trước khi ghi;
4. browser cache POS được chuyển từ `localStorage` sang IndexedDB, với namespace/invalidation đúng contract;
5. regression test và benchmark evidence có thể lặp lại.

Không thay đổi state machine, permission, ledger ownership, source of truth, table schema, partition/lifecycle hoặc SLO đã được SRS/ADR chốt. Cache không được quyết định quyền, tồn kho, tiền, công nợ hay trạng thái commit.

## 2. Quyết định kiến trúc

### 2.1. Playbook là entrypoint triển khai xuyên miền

Tạo `docs/architecture/performance-playbook.md` như checklist vận hành ngắn, dẫn chiếu `runtime-and-performance.md` làm policy chuẩn và ADR Accepted làm quyết định không được tự đổi. `AGENTS.md`, Detailed Design và LLD traceability review phải yêu cầu đọc playbook trước mọi thay đổi tác động API, persistence, cache, worker, fast path hoặc payload/read model lớn.

Playbook buộc mỗi slice ghi rõ: classification read/query/command/worker; budget/SLO; read/write set; cache key/TTL/invalidation/fallback; lock boundary; số call Google service; worker routing; telemetry; test và benchmark evidence. `release-hardening.md` tiếp tục chỉ là lịch sử evidence, không là hướng dẫn implement hằng ngày.

### 2.2. Command lifecycle và flush trước unlock

`CommandCoordinator` nhận một hook flush phụ thuộc hạ tầng. Trong execution production, hook gọi `SheetGateway.flushPendingAppends()`. Với command có pending append, coordinator thực hiện theo thứ tự:

```text
acquire ScriptLock
  -> đo lock wait
  -> kiểm idempotency cuối
  -> fresh revalidation cạnh tranh + append document/ledger/projection/Committed
  -> flush pending Advanced Sheets batches
  -> SpreadsheetApp.flush
release ScriptLock
```

`afterInvoke` vẫn flush best-effort như safety net cho query/non-command append hoặc error path, nhưng không là cơ chế correctness cho critical command. Nếu flush lỗi, command không được trả success; error được sanitize và coordinator ghi `Failed` khi khả thi trước khi unlock. Không chuyển ledger, command journal hay commit sang worker.

### 2.3. POS checkout hai pha

POS checkout có hai pha, không thay đổi response/error contract:

1. **Preflight ngoài lock:** parse/auth/permission bởi API boundary; load POS projection và tính quote từ cache/read model; kiểm tra cấu trúc payload và build immutable candidate snapshot. Kết quả preflight không phải authority commit.
2. **Commit trong lock:** kiểm idempotency cache-first; lookup hẹp `shiftId`, variant/unit/price policy và balance theo các line; tính lại quote/stock cạnh tranh; nếu mismatch trả conflict hiện có; append document, InventoryMovement, InventoryBalance projection, Finance records và `CommandTransaction Committed`; flush rồi unlock.

Commit không gọi `getPosProjection`, không scan history, không làm Drive/PDF/report/export/notification. Với multi-line order, stock precheck vẫn aggregate theo `variantId`; single-line tiếp tục không đọc balance hai lần. Retry dùng cùng command/idempotency key và trả snapshot đã committed.

### 2.4. Browser cache POS

Thay `localStorage` projection persistence bằng adapter IndexedDB trong `web/src/features/pos/catalog-cache/`; index memory barcode/search vẫn chỉ sống trong tab. Mỗi entry gồm cached projection, cachedAt và namespace version. Namespace chứa installation, tenant, user, `authVersion`, app/schema version, Branch/Warehouse scope và resource/projection version.

Loader đọc IndexedDB không chặn render: memory/current projection trước, cached projection sau, remote refresh theo TTL/version sau cùng. IndexedDB unavailable, corrupt entry, auth/permission error, logout hoặc deploy/schema incompatibility đều phải xóa entry/namespace phù hợp và fallback remote; stale entry chỉ render read path. Checkout luôn gửi snapshot/quote version và server fresh-revalidate.

### 2.5. Telemetry và benchmark

Performance tracker/API metadata được mở rộng để ghi tối thiểu `lockWaitMs`, `lockHoldMs`, deferred batch flush duration/range/row count, targeted lookup/full-scan count và payload bytes khi có. Tên field trong policy và code phải thống nhất.

Benchmark local giữ vai trò regression nhanh; evidence Apps Script `/dev` là điều kiện chứng nhận production. Mỗi benchmark POS chạy cold và warm với profile SRS 10.000 variants, checkout đơn/đa line, retry timeout, hai checkout cạnh tranh và report/export nền. Báo cáo ghi sample count, p50/p95/p99, max, môi trường và các stage/I/O chính; dưới 20 mẫu chỉ là smoke evidence, không được gọi là p95/p99 certification.

## 3. Thay đổi dự kiến theo vị trí

| Vùng | Trách nhiệm thay đổi |
| --- | --- |
| `docs/architecture/` | Playbook policy, runtime contract và evidence terminology. |
| `AGENTS.md`, Detailed Design, traceability review | Bắt buộc performance intake/quality gate. |
| `apps-script/src/infrastructure/google-workspace/` | Flush/counter/lock adapter production, không chứa business policy. |
| `apps-script/src/services/platform/command/` | Command protocol, lock timing và critical flush boundary. |
| `apps-script/src/services/sales/` | Preflight/commit separation và targeted fresh revalidation POS. |
| `apps-script/src/services/catalog`, `inventory`, `finance` và repositories | Chỉ thêm narrow read contract cần cho commit; không thay ownership. |
| `web/src/features/pos/catalog-cache/` | IndexedDB persistence/version/invalidation adapter. |
| `tests/apps-script`, `tests/web`, `tests/performance` | TDD regression cho thứ tự flush, lock boundary, cache namespace/invalidation và benchmark evidence. |

## 4. Lỗi, nhất quán và bảo mật

- Lỗi preflight không tạo command/document/ledger.
- Lỗi fresh revalidation trả đúng conflict nghiệp vụ hiện có; không tự đổi giá hoặc giảm số lượng.
- Lỗi flush/Google Sheets không trả checkout success. Retry sau timeout dùng cùng key; durable command journal là fallback nếu command cache miss.
- Cache server chỉ lưu fingerprint/session metadata và record được phép; không lưu raw session token, password, verifier hay secret.
- Cache browser không là security boundary; namespace tách theo user/authVersion/scope và bị xóa khi session/auth/deploy yêu cầu.
- Không có full transaction table scan trong POS commit fast path; query history/report/export route projection/worker/partition đúng policy.

## 5. Chiến lược kiểm thử và nghiệm thu

1. TDD test hạ tầng chứng minh Advanced Sheets pending batches được flush trước `releaseLock`, kể cả lỗi flush; `afterInvoke` không còn là điều kiện để command commit bền vững.
2. TDD test command coordinator chứng minh retry concurrent cùng key không chạy handler lần hai và ghi lock wait/hold.
3. TDD Sales test chứng minh preflight không chạy trong lock; commit dùng lookup narrow, revalidate stale price/stock/shift và không full-load POS projection trong lock.
4. TDD web test IndexedDB: namespace đủ thành phần, corrupt/miss fallback remote, logout/auth/deploy invalidation, stale read-only và scan/search từ memory không RPC.
5. Targeted performance tests assert full-scan counter bằng 0 ở fast path, batch flush được đo và không đổi SRS p95/p99 local baseline.
6. Sau local verification, chạy Apps Script `/dev` drill với ít nhất 20 cold/warm samples và ghi evidence theo format mới. Không chuyển release sang `Ready` nếu SLO/P0 khác vẫn chưa đạt.

## 6. Ngoài phạm vi

- Tạo logical lock per-SKU, sharding Spreadsheet, thay Google Sheets bằng database khác, thay state machine POS hoặc thay command journal model.
- Tối ưu tùy tiện các domain không có số đo hay không đi qua primitive chung.
- Đưa PDF/Drive/export/report/notification vào checkout synchronous path.
- Ghi audit log riêng trong fast path.
