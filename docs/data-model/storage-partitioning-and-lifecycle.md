# Storage Partitioning và Data Lifecycle

**Nguồn:** [Solution Design](../architecture/solution-design.md), [runtime/performance](../architecture/runtime-and-performance.md). Tài liệu này là nguồn chuẩn về physical data layout trên Google Workspace.

## 1. Drive root và storage role

```text
Sales Management - <Tên doanh nghiệp>/
|- Database/
|  |- Core Data
|  |- Runtime Data
|  |- Transaction Data/
|  |  |- Transactions FY2026-P01
|  |  `- Transactions FY2026-P02 (nếu cần)
|  `- Audit Data/
|     `- Audit FY2026-P01
|- Attachments/
|- Backups/
|- Exports/
|- Archive/
|- Templates/
`- Generated Documents/
```

`FY2026-P01` là partition thứ nhất của năm tài chính 2026, không phải tháng 01. Mọi file/folder ID và active partition nằm trong runtime config do `TableRegistry`/`TableLocator` sử dụng; source code/service không hard-code ID, tab, cột hoặc row number.

| Storage role | Dữ liệu | Mục tiêu hiệu năng |
| --- | --- | --- |
| Core | organization, Branch/Warehouse, user/role/scope, catalog, price/promotion/config, schema and partition registry | Ít ghi trên POS, cache-aside được. |
| Runtime | session metadata, import staging, background run, health, TTL technical state | Không là nơi ghi transaction nóng; cleanup có policy. |
| Active transaction partition | document, line, immutable inventory/cash/AR/AP/point ledger, materialized balance, command journal, audit outbox | Một Spreadsheet ghi nóng cho checkout; batch/narrow I/O. |
| Audit partition | AuditLog append-only theo kỳ | Không đồng bộ mở/ghi trong checkout; nhận idempotent từ durable outbox. |
| Archive | Partition transaction/audit đã đóng, read-only | Vẫn route/query/export/backup; không phá reference. |

## 2. Registry, schema và routing

Mỗi logical table definition có `tableName`, `sheetName`, header schema, primary key, module owner, lifecycle, storage role, schema version và partition policy. Luồng chuẩn là:

```text
Application service -> Repository -> SheetGateway -> TableLocator
  -> storage role + partition key + logical sheet -> Spreadsheet/Sheet
```

Migration append missing column/table, giữ header cũ và ghi `SchemaMigration` idempotent. Migration không replace cả table trong runtime POS. Direct lookup dùng partitioned technical ID, business number có year/partition component hoặc source partition reference; không tìm bằng cách mở toàn bộ archive.

## 3. Partition policy

- Bootstrap tạo một active transaction partition và một active audit partition cho năm tài chính hiện hành.
- Sang năm tài chính, worker/preflight tạo partition `P01` tiếp theo với schema đúng trước khi có giao dịch mới.
- Owner nhận cảnh báo capacity/latency; khi partition tăng đến ngưỡng vận hành cấu hình, hệ thống tạo `P02`, validate schema, switch write routing atomically và đóng `P01` read-only.
- Cảnh báo và switch dùng ngưỡng dung lượng kết hợp latency/projection đã được cấu hình và kiểm chứng bằng benchmark; hệ thống phải cảnh báo đủ sớm để Owner tạo partition tiếp theo trước khi POS bị ảnh hưởng. Ngưỡng không thay thế kiểm tra quota/thực tế vận hành và chỉ Owner được thay đổi trong giới hạn an toàn.
- Không tự xóa Order, ledger, audit hoặc attachment để mở chỗ. Chỉ runtime technical data có TTL cleanup.

Mỗi switch/close/archive/reopen phải audit. Archive giữ file ID và logical partition registry, nên attachment và cross-reference không đổi.

## 4. Read/write strategy

POS chỉ đọc active partition cho dữ liệu transaction cần xác nhận và ghi batch vào đó. Core master dùng cache versioned; data history/audit partition không được mở trong checkout. `InventoryBalance`, `CashBalance`, `ReceivableBalance`, `PayableBalance` và POS read model là projection trong active partition, có opening snapshot lúc bắt đầu partition mới và reconciliation với ledger.

Report theo date range lấy partition registry, mở đúng tập partition giao nhau với phạm vi; report nhiều partition, export lớn và rebuild projection chạy worker. Sheet database không chứa formula nghiệp vụ, `IMPORTRANGE`, pivot/conditional formatting nặng hoặc dashboard presentation.

## 5. Archive, backup và restore

Khi policy archive áp dụng, partition đã đóng chuyển sang `Archive/` và read-only. Archive vẫn searchable/exportable qua backend và luôn nằm trong backup manifest. Khôi phục archive không copy/sửa record sang active partition; muốn điều chỉnh dữ liệu lịch sử phải tạo chứng từ/reversal ở partition đang mở có reference lịch sử.

Backup manifest liệt kê mọi storage group/partition, schema/app version, row count, checksum và attachment metadata/version. Restore tạo resource thay thế và chỉ switch config sau integrity check/Owner confirmation; chi tiết tại [deployment lifecycle](../architecture/deployment-and-lifecycle.md).
