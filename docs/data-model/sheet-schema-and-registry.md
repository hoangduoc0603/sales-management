# Sheet Schema and Registry

**Trạng thái:** Đã phê duyệt phần nền tảng  
**Nguồn:** [Detailed Design](../architecture/detailed-design.md), [Logical Data Model](logical-data-model.md), [Storage lifecycle](storage-partitioning-and-lifecycle.md), `SRS-OVR-003`, `SRS-OVR-004`, `SRS-OVR-011`, `SRS-OVR-023`

## 1. Mục tiêu

Tài liệu này quy định cách logical table được ánh xạ vào Google Sheets mà không biến Sheet thành API hoặc nguồn quy tắc nghiệp vụ. Domain table dictionary sẽ định nghĩa cột cụ thể sau; mọi dictionary phải tuân theo registry, migration và I/O policy ở đây.

## 2. TableRegistry

Mỗi logical table có một definition versioned tối thiểu:

```ts
type TableDefinition = {
  tableName: string;
  owner: BoundedContext;
  storageRole: 'core' | 'runtime' | 'transaction';
  sheetName: string;
  lifecycle: 'master' | 'runtime' | 'document' | 'ledger' | 'projection';
  schemaVersion: number;
  primaryKey: string;
  headers: readonly ColumnDefinition[];
  partitionPolicy: 'none' | 'transaction-period';
  lookupKeys: readonly LookupKeyDefinition[];
};
```

`TableLocator` dùng `storageRole`, active partition registry và `partitionKey` để trả về Spreadsheet/Sheet đúng. Application service và repository không hard-code Drive ID, spreadsheet ID, sheet name, header position hoặc row number.

## 3. Row schema hybrid

Mỗi row dùng cột typed cho field phục vụ scope, trạng thái, filtering, sorting, report, join/reference, balance và hot lookup. Snapshot có cấu trúc sâu chỉ được lưu trong JSON versioned khi không là điều kiện query hot. JSON không thay thế foreign key, permission scope, amount, quantity, date, state hoặc lookup key.

| Nhóm cột | Mục đích |
| --- | --- |
| Technical | `id`, `schemaVersion`, `recordVersion`, `partitionKey` khi applicable. |
| Scope | `tenantId`, `branchId`, `warehouseId` khi applicable. |
| Lifecycle | `status`, `createdAt`, `updatedAt`, committed/reversed/source reference. |
| Query/projection | business number, actor, date bucket, product/customer/supplier/reference ID, amount/quantity/balance fields cần lọc hoặc tổng hợp. |
| Snapshot | `snapshotJson`/`detailsJson` có schema version; chỉ chứa payload đã sanitize và được domain owner định nghĩa. |
| Audit correlation | `commandId`, `requestId`, `createdBy`, reason/reference theo yêu cầu domain. |

Money lưu bằng integer VND. Tất cả quantity field phải có tên thể hiện đơn vị/scale hoặc được table dictionary định nghĩa rõ; không dùng floating value mơ hồ trong ledger.

## 4. Header, serialization và migration

- Header canonical theo thứ tự registry; một migration chỉ append cột mới hoặc tạo Sheet/table mới, không đổi nghĩa cột cũ và không dựa vào cột di chuyển thủ công.
- `SchemaMigration` có migration ID, from/to version, timestamp, status và idempotency evidence. Migration lặp lại không tạo header/record trùng.
- Read mapping dùng header name → index trong mỗi execution; write tạo 2D array theo header registry rồi batch append/update. Không lấy `getLastColumn()` hoặc row offset làm contract nghiệp vụ.
- Cell chỉ lưu primitive serializable theo column type: string, integer number, boolean, ISO timestamp/text, enum hoặc JSON string. Không lưu object runtime, formula nghiệp vụ, secret/token hoặc public Drive URL.
- Mọi JSON snapshot có `schemaVersion`; unknown version bị từ chối/migrate rõ ràng, không parse best-effort rồi ghi đè lịch sử.

## 5. Lookup, projection và partition

Google Sheets không có database index. `lookupKeys` quy định field/compound key nào được duy trì bằng projection hoặc query range hẹp. Một lookup hot không được giải quyết bằng scan full Sheet trong POS path.

- Core master lookup có thể cache versioned nhưng backend revalidates dữ liệu quyết định command.
- Active transaction partition là nơi duy nhất POS đọc/ghi transaction hot. Historical query dùng partition registry để chọn tập partition giao nhau với date/reference; không mở mọi archive.
- Ledger append-only; balance/read model là table projection có `asOf`, source reference/partition và reconciliation route.
- Report/export lớn, rebuild projection, archive và migration nặng chạy worker/checkpoint; không chạy trong ScriptLock/checkout.

## 6. Data integrity và test

Mỗi table dictionary phải nêu: owner, storage role, partition policy, header list, required/nullable, type, default, primary key, foreign/reference key, lookup/projection role, lifecycle và migration rule.

Test tối thiểu gồm registry completeness, header-to-row round-trip, missing/unknown header, append migration idempotency, partition routing, lookup scope, batch I/O shape, immutable ledger rejection và recovery khi command chưa `Committed`.
