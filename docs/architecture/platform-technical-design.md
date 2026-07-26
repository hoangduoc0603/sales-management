# Platform Technical Design

**Trạng thái:** Đã phê duyệt phần nền tảng  
**Nguồn:** [Detailed Design](detailed-design.md), [Application Architecture](application-architecture.md), [Security](security-and-access.md), `SRS-OVR-004` đến `SRS-OVR-009`, `SRS-OVR-020` đến `SRS-OVR-024`

## 1. Public API boundary

`doGet` chỉ tạo `HtmlOutput`; không bootstrap hay trả dữ liệu nghiệp vụ trước xác thực. Public business boundary là một server function `invoke(request)`. Các implementation helper kết thúc bằng `_` hoặc không được export khỏi API package.

Browser dùng `web/src/lib/api` để bọc `google.script.run` thành Promise; feature component không gọi function Apps Script trực tiếp. Vì `google.script.run` bất đồng bộ và call song song không có thứ tự bảo đảm, adapter phải giữ một in-flight command theo `commandId`, không gửi mutation lần hai khi kết quả chưa rõ, và cho phép query độc lập có giới hạn concurrency.

```ts
type ApiRequest = {
  operation: OperationName;
  requestId: string;
  sessionToken?: string;
  payload: unknown;
  command?: {
    commandId: string;
    idempotencyKey: string;
    expectedVersions?: Record<string, string>;
  };
  client?: {
    appVersion: string;
    schemaVersion: string;
    cacheVersions?: Record<string, string>;
  };
};

type ApiResult<T> =
  | { ok: true; data: T; meta: ApiMeta }
  | { ok: false; error: ApiError; meta: ApiMeta };
```

`OperationName` là union TypeScript tạo từ allowlist backend. Không có operation nhận table name, sheet name, filter raw hoặc service class từ browser. Login là operation công khai duy nhất; mọi operation khác cần session hợp lệ. Token không được đưa vào telemetry, error, audit summary hoặc persisted command response.

## 2. Operation registry và pipeline

Mỗi operation registry entry phải khai báo `kind` (`public`, `query`, `mutation`), input schema, output schema, required action, scope resolver, handler và policy telemetry/audit.

```text
invoke
  -> validate request envelope và operation allowlist
  -> tạo requestId / ApiContext
  -> authenticate session khi operation không public
  -> resolve actor, permission và Branch/Warehouse scope
  -> validate payload schema
  -> dispatch application service
  -> map domain/runtime error thành ApiResult
  -> emit sanitized timing/I/O telemetry
```

`ApiContext` chỉ chứa actor đã xác thực, request/command ID, clock, correlation data, granted scope và capability đã kiểm tra. Repository nhận explicit scope/filter từ service; repository không nhận raw session hoặc tự mở rộng scope.

## 3. Command protocol

Mutation tạo/hoàn tất/duyệt/hủy/đảo phải mang `commandId` và `idempotencyKey`. Query, login và logout không được giả làm command nghiệp vụ.

1. Ngoài lock: kiểm tra envelope, session, permission, payload và read hẹp không cạnh tranh.
2. Trong `ScriptLock`: kiểm tra idempotency lần cuối, fresh-read dữ liệu cạnh tranh, chạy guard/state transition, cấp sequence cần thiết và batch-write `CommandTransaction`, document, ledger, projection và `AuditOutbox`.
3. Gọi `SpreadsheetApp.flush()` trước release lock. Chỉ khi command là `Committed` mới trả success và cho report/read model tính kết quả.
4. Khi timeout/unknown outcome, client gọi `command.getStatus` hoặc retry cùng key. Backend trả receipt/result đã commit hoặc recovery outcome; không tạo command mới.

Lock không được bao gồm Drive, PDF, export, report, full catalog reload, network call, worker dispatch hoặc audit partition write. `LockService.getScriptLock()` được dùng; `DocumentLock` không phải nền tảng cho standalone Web App.

## 4. Error contract và client behavior

| Nhóm | Code ví dụ | Hành vi adapter/client |
| --- | --- | --- |
| Validation | `INVALID_INPUT`, `INVALID_STATE_TRANSITION` | Không retry; hiển thị field/business error. |
| Authorization | `SESSION_EXPIRED`, `PERMISSION_DENIED`, `SCOPE_DENIED` | Xóa state nhạy cảm; login/refresh scope. |
| Business conflict | `PRICE_CHANGED`, `PROMOTION_CHANGED`, `INSUFFICIENT_STOCK`, `VERSION_CONFLICT` | Không tự sửa giỏ; trả detail để user xác nhận/tải lại. |
| Command outcome | `COMMAND_PENDING`, `COMMAND_ALREADY_COMMITTED` | Poll status hoặc dùng committed response; không phát lệnh mới. |
| Retryable runtime | `LOCK_TIMEOUT`, `GOOGLE_SERVICE_UNAVAILABLE`, `QUOTA_TEMPORARY` | Giữ input, retry cùng idempotency key theo policy adapter. |
| Unknown | `INTERNAL_ERROR` | Hiển thị request ID; không lộ exception/secret. |

Mọi `ApiMeta` có `requestId`, `operation`, `serverTime`, `durationMs`, stage timing và I/O summary đã sanitize. Warning/error mới cần persist telemetry; success normal không sinh record telemetry bền vững trên hot path.

## 5. Cache, worker và security seam

- Cache browser/server chỉ phục vụ read model theo [runtime performance](runtime-and-performance.md); cache miss không được đổi semantic của command.
- Worker gọi service nội bộ qua `WorkerContext`, không gọi `invoke`. Worker có `runId`, checkpoint, execution budget, lease/idempotency và không complete POS/ledger cốt lõi.
- Credential verifier/session metadata được Platform service xử lý; domain service chỉ nhận `ActorContext`, không đọc password/token hay Script Properties.
- API handler bắt buộc check action và scope trên backend cho cả read, print, export, attachment và backup/restore.

## 6. Code placement và test seam

| Vị trí | Trách nhiệm |
| --- | --- |
| `apps-script/src/api/` | `invoke`, registry, ApiContext, input/output mapping. |
| `apps-script/src/services/platform/` | auth/session, permission, command coordinator, runtime/worker, audit/outbox policy. |
| `apps-script/src/repositories/` | table-aware repository, query mapping và partition route. |
| `apps-script/src/infrastructure/` | Sheet/Drive/Cache/Lock/Properties/Clock/ID/telemetry adapter. |
| `web/src/lib/` | Promise wrapper, typed client, error normalization và cache namespace. |
| `shared/` | operation contracts, schemas, error code/type và DTO thuần. |

Service test dùng fake `SheetGateway`, `DriveGateway`, `LockProvider`, `Clock`, `IdGenerator` và `CacheProvider`. Adapter integration test xác minh Apps Script boundary, batch I/O, lock/retry behavior và serialization; benchmark POS chạy trên deployment/profile đại diện.
