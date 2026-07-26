# Detailed Design — Nền tảng triển khai

**Trạng thái:** Đã phê duyệt phần nền tảng  
**Nguồn:** [PRD](../product/PRD.md), [SRS](../product/srs/overview.md), [Solution Design](solution-design.md) và [ADR](../decisions/README.md)

Tài liệu này là điểm vào của Low-Level Design (LLD). Nó quy định các convention và truy vết xuyên miền; chi tiết state machine, command/query và data dictionary của từng domain nằm trong các tài liệu LLD domain tiếp theo.

## 1. Ranh giới LLD

LLD không thay đổi các quyết định đã Accepted về public Web App, modular monolith, storage role/partition, POS performance, command journal, customer-owned deployment, backup/restore hoặc audit outbox. Mọi thay đổi các quyết định này phải có ADR mới và chỉ có hiệu lực sau khi được phê duyệt.

LLD phải biến mỗi yêu cầu SRS thành ít nhất một trong các đầu ra: application command/query, state transition, validation/authorization rule, physical table field/projection, worker, hoặc test scenario. Không thêm tính năng ngoài PRD/SRS chỉ vì thuận tiện cho implementation.

## 2. Quy ước thiết kế chung

| Chủ đề | Quy ước bắt buộc |
| --- | --- |
| Định danh | Dùng technical ID bất biến; không dùng row number, tên hoặc business number làm foreign key. Transaction ID mang partition key để route trực tiếp. |
| Thời gian | Backend tạo thời gian chuẩn `Asia/Ho_Chi_Minh`; client time chỉ dùng cho telemetry/UI, không quyết định hiệu lực nghiệp vụ. |
| Tiền và số lượng | Tiền VND là integer đồng. Mỗi table dictionary phải khai báo rõ biểu diễn số lượng và tối đa ba số lẻ theo SRS; không có số thực không khai báo scale trong ledger. |
| Lịch sử | Chứng từ/ledger `Committed` là bất biến. Cancel, reversal, adjustment hoặc return tạo record mới có source reference. |
| Scope | Record có `tenantId` và Branch/Warehouse khi áp dụng. Service xác thực scope trước khi repository truy vấn. |
| Snapshot | Giá, thuế, đơn vị quy đổi, chính sách, cost và thông tin hiển thị lịch sử được snapshot trên document/ledger, không join master hiện tại để viết lại quá khứ. |
| Side effect | Audit durable, document, ledger và projection quyết định kết quả phải xong trước success. Export, PDF, backup, notification và audit delivery dùng outbox/worker. |

## 3. Package và dependency

```text
web/src/features/<domain>
  -> web/src/lib/api
  -> apps-script/src/api
  -> apps-script/src/services/platform | <domain>
  -> apps-script/src/repositories
  -> apps-script/src/infrastructure
```

- `shared/` chứa contract, schema, type và constant thuần TypeScript.
- `api/` chỉ xây `ApiContext`, validate envelope, gọi service và map lỗi.
- `services/` sở hữu use case, state transition và orchestration; chỉ gọi public service contract của domain khác.
- `repositories/` sở hữu mapping table/query; không thực thi policy nghiệp vụ hoặc kiểm tra UI.
- `infrastructure/` hiện thực Apps Script gateway. Không domain nào hard-code spreadsheet ID, sheet name, header index hoặc Drive path.

## 4. Bản đồ tài liệu chi tiết

| Mối quan tâm | Nguồn chi tiết |
| --- | --- |
| API, session, command commit, worker và test seam | [Platform technical design](platform-technical-design.md) |
| TableRegistry, header/schema, routing và I/O Sheets | [Sheet schema and registry](../data-model/sheet-schema-and-registry.md) |
| Catalog, CRM, pricing, promotion, loyalty, warranty và commission | [LLD Catalog–CRM](modules/catalog-crm.md) và [table dictionary](../data-model/tables/catalog-crm.md) |
| Sales, POS, online order và return/exchange | [LLD Sales](modules/sales-pos-returns.md) và [table dictionary](../data-model/tables/sales-inventory.md) |
| Inventory, lô/serial, transfer và stocktake | [LLD Inventory](modules/inventory.md) và [Sales–Inventory tables](../data-model/tables/sales-inventory.md) |
| Purchasing, receipt, landed cost và return NCC | [LLD Purchasing](modules/purchasing.md) và [table dictionary](../data-model/tables/purchasing-finance.md) |
| Payment, công nợ, quỹ, ca bán và chi phí | [LLD Finance](modules/finance-shifts.md) và [Purchasing–Finance tables](../data-model/tables/purchasing-finance.md) |
| User/role/scope, import/export, báo cáo, audit và vận hành | [LLD Administration–Reporting–Operations](modules/administration-reporting-operations.md) và [Operations–Reporting tables](../data-model/tables/operations-reporting.md) |
| Rà soát traceability trước implementation | [LLD readiness review](lld-traceability-review.md) |
| Conceptual record ownership | [Logical data model](../data-model/logical-data-model.md) |
| Storage group, partition và archive | [Storage partitioning](../data-model/storage-partitioning-and-lifecycle.md) |
| Chỉ tiêu vận hành POS | [Runtime và hiệu năng](runtime-and-performance.md) |

## 5. Hợp đồng của một LLD domain

Mỗi tài liệu domain phải có các mục sau, chỉ ở mức cần thiết cho domain đó:

1. Requirement traceability và ownership của aggregate/table.
2. State machine cùng transition, guard, actor/permission và hậu quả ledger.
3. Command/query contract, input/output, validation, idempotency và lỗi nghiệp vụ.
4. Orchestration với domain khác qua public service contract.
5. Table dictionary/link physical schema, snapshot, projection, partition routing và lifecycle.
6. Side effect/outbox/worker, failure/retry/recovery và audit.
7. Unit, integration, permission, concurrency/retry và performance test scenarios.

## 6. Traceability và quality gate

- Mỗi command/query ghi mã SRS nguồn; một SRS có thể tham chiếu nhiều command nhưng không được thiếu implementation owner.
- Mỗi mutation phải xác định rõ record nào tạo/update, state transition, ledger/projection/outbox nào phát sinh và điều kiện `Committed`.
- Mỗi query phải xác định scope, partition set, projection/read model, sorting/pagination và giới hạn không quét full table trong fast path.
- Mỗi physical table phải có owner, storage role, lifecycle, schema version, primary key, lookup key logic và migration behavior.
- Trước implementation, module phải có test matrix bao phủ happy path, validation, permission/scope, idempotency/retry, failure recovery và scenario hiệu năng liên quan.

## 7. Quyết định nền tảng được cụ thể hóa

- [ADR 0009](../decisions/0009-single-rpc-api-gateway.md) chốt một typed RPC gateway làm public business boundary.
- [ADR 0010](../decisions/0010-hybrid-sheet-record-schema.md) chốt row schema hybrid: cột typed cho hot query/projection, JSON versioned cho snapshot phức tạp.
