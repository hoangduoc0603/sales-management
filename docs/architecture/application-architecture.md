# Kiến trúc ứng dụng

**Nguồn tổng quan:** [Solution Design](solution-design.md). Tài liệu này quy định ranh giới mã, API và orchestration; không quy định schema Sheet chi tiết.

## 1. Lớp ứng dụng

```text
web/src/features/<domain>
  -> web/src/lib typed API adapter
  -> apps-script/src/api public function
  -> apps-script/src/services/<domain>
  -> apps-script/src/repositories
  -> apps-script/src/infrastructure Google Workspace adapter
```

`shared/` chỉ chứa contract, schema, type và constant thuần TypeScript. React không gọi `SpreadsheetApp`/`DriveApp`; business service không đọc `window`; repository không chứa quy tắc nghiệp vụ. Vị trí tệp cụ thể tuân theo [folder structure](folder-structure.md).

## 2. API boundary

Mọi public Apps Script function đi qua API handler chung để tạo `ApiContext`, validate input server-side, xác thực session, kiểm tra permission, đo timing và map lỗi an toàn.

```ts
type ApiResult<T> =
  | { ok: true; data: T; meta: ApiMeta }
  | { ok: false; error: ApiError; meta: ApiMeta };
```

`meta` tối thiểu có `requestId`, `operation`, `serverTime`, `durationMs`, stage timing và I/O summary. API entrypoint mỏng; không chứa logic domain hoặc Google service call trực tiếp. Client gọi qua typed adapter, không rải function-name của `google.script.run` trong component.

## 3. Composition và dependency

Composition root ở `apps-script/src/bootstrap/` ghép config, gateway, repository, service và API handler. Infrastructure cung cấp `SheetGateway`, `DriveGateway`, `LockProvider`, `CacheProvider`, `Clock`, `IdGenerator`, `PropertiesConfig` và telemetry; services nhận abstraction qua dependency injection.

Dependency chỉ được đi xuống:

```text
api -> services -> repositories -> infrastructure
                    ^
                    | shared contracts/schemas/types
```

`services/<domain>` chỉ gọi public application service của domain khác hoặc platform contract. Không được import repository nội bộ của context khác.

## 4. Checkout orchestration

`SalesCheckoutService.completeSale()` là command owner của checkout. Nó điều phối tuần tự:

1. xác nhận scope Branch/Warehouse và trạng thái giỏ;
2. yêu cầu Catalog đánh giá giá, promotion và snapshot hiện hành;
3. yêu cầu Inventory issue hàng, lot/serial và movement/balance projection;
4. yêu cầu Finance tạo payment, cash và receivable ledger/allocation;
5. yêu cầu CRM điều chỉnh point/voucher khi hợp lệ;
6. ghi Sale Order `Completed`, `CommandTransaction` và `AuditOutbox`;
7. trả receipt snapshot bất biến.

Các bước trên cùng thực hiện trong synchronous command vì cùng quyết định kết quả bán. Không dùng HTTP, trigger hoặc background event để hoàn tất tồn/tiền/công nợ. Nếu một điều kiện thất bại, command không được `Committed` và UI nhận lỗi nghiệp vụ có thể xử lý.

## 5. Event/outbox sau commit

Sau commit, command tạo outbox bất biến cho các side effect không quyết định việc bán: copy audit sang Audit Data, invalidate/warm read model, tạo export/PDF khi được yêu cầu, notification hoặc reconciliation. Worker tiêu thụ outbox idempotent theo event ID.

Outbox không được dùng để trì hoãn inventory movement, payment/cash ledger, receivable/payable ledger, trạng thái chứng từ hoặc receipt. Những dữ liệu này phải tồn tại trước khi browser nhận success.

## 6. Lỗi và trạng thái client

Client phân biệt rõ `validation`, `permission`, `business conflict`, `retryable runtime` và `unknown outcome`.

| Code ví dụ | Hành vi POS |
| --- | --- |
| `PRICE_CHANGED`, `PROMOTION_CHANGED`, `INSUFFICIENT_STOCK` | Hiển thị chênh lệch; không tự cập nhật giỏ; yêu cầu xác nhận/tải lại. |
| `LOCK_TIMEOUT`, `GOOGLE_SERVICE_UNAVAILABLE` | Giữ giỏ, tra trạng thái `commandId`, cho retry cùng idempotency key. |
| `COMMAND_PENDING` | Hiển thị đang kiểm tra, không cho tạo command mới cùng giỏ. |
| `PERMISSION_DENIED`, `SESSION_EXPIRED` | Xóa state nhạy cảm, yêu cầu đăng nhập/đổi scope. |

In phiếu dùng receipt snapshot đã commit và browser print stylesheet; không chờ backend tạo Drive/PDF trong checkout.
