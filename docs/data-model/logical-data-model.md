# Logical Data Model

**Nguồn:** [Solution Design](../architecture/solution-design.md), [SRS overview](../product/srs/overview.md). Đây là logical model; header/cột Sheet vật lý phải tuân theo [registry và schema vật lý](sheet-schema-and-registry.md).

## 1. Quy tắc xuyên suốt

- Mọi record có `id` kỹ thuật bất biến; không dùng row number, tên, mã hiển thị hoặc vị trí Sheet làm khóa.
- Mã chứng từ là business number tách khỏi `id`, duy nhất theo tenant/type, không tái sử dụng sau hủy. Sequence được cấp trong commit lock ngắn.
- Mọi record nghiệp vụ có `tenantId`, timestamps theo `Asia/Ho_Chi_Minh`, actor/source command và scope Branch/Warehouse khi áp dụng.
- Dữ liệu thay đổi lịch sử quan trọng dùng snapshot. Chứng từ/ledger `Committed` bất biến; sửa sai bằng cancel, reversal hoặc adjustment có source reference.
- Quan hệ giữa transaction partition luôn mang `partitionKey` của record đích. Technical ID transaction có prefix partition có thể route trực tiếp, ví dụ `txn:FY2026-P01:<uuidv7>`; không cần quét nhiều file để tìm một ID.

## 2. Cấu trúc tổ chức và identity

```text
Organization
  └─ Branch
       └─ Warehouse

User ─< UserRole >─ Role ─< RolePermission
User ─< UserScope >─ tenant | Branch | Warehouse
```

`User` là profile nghiệp vụ với `loginId`, trạng thái và role/scope. Nó không chứa password verifier. Credential verifier/salt/pepper/session secret thuộc secure runtime configuration theo [security architecture](../architecture/security-and-access.md).

## 3. Master data

| Aggregate | Quan hệ/chức năng chính |
| --- | --- |
| Catalog | Product -> Variant, Barcode, UnitConversion, PriceList/PriceRule, ProductPolicy; Product có cờ inventory/lot/serial/combo. |
| Customer/CRM | Customer -> Group, Address/Contact, PointLedger, CreditPolicy; merge giữ liên kết lịch sử. |
| Supplier/Purchasing | Supplier -> PurchaseOrder -> GoodsReceipt/ReturnToSupplier; payable tham chiếu chứng từ nguồn. |
| Configuration | payment method, cash account, tax, numbering, approval threshold, promotion, reservation, return, storage/partition policy. |

Master chỉ có hiệu lực về sau. Sale/Purchase/ledger phải snapshot giá, tên, thuế, đơn vị quy đổi, policy, cost và actor cần thiết; không join lại master hiện tại để viết lại lịch sử.

## 4. Transaction và ledger

```text
SaleOrder -> SaleOrderLine -> InventoryMovement
          -> Payment -> PaymentAllocation -> CashTransaction
          -> ReceivableLedger
          -> PointLedger / VoucherUsage

PurchaseOrder -> GoodsReceipt -> InventoryMovement -> PayableLedger
Return / Transfer / Stocktake / Adjustment -> InventoryMovement
```

`InventoryMovement`, `CashTransaction`, `ReceivableLedger`, `PayableLedger` và `PointLedger` là append-only ledger. Materialized balance/read model phục vụ truy vấn nhanh nhưng phải có `asOf`, `sourcePartitionKey` và khả năng đối soát với ledger.

Giá vốn dùng **bình quân gia quyền di động** đã được chốt: mỗi receipt/adjustment hợp lệ cập nhật giá trị và lượng on-hand; mỗi issue/sale snapshot unit cost tại thời điểm issue. Return/reversal không sửa movement cũ mà sinh movement/ledger đối ứng theo SRS. Lot/serial bổ sung allocation/state riêng, không làm thay đổi nguyên tắc ledger.

## 5. Command, actor metadata và side effect

| Record | Mục đích |
| --- | --- |
| `CommandTransaction` | Idempotency key, command ID, actor, resource scope, trạng thái `Preparing`/`Committed`/`Failed`, response snapshot và recovery metadata. Fast path command mới append trực tiếp `Committed` theo ADR 0016; `Preparing` giữ cho recovery/migration hoặc command phức tạp sau này. |
| Actor metadata | Các field `createdBy`, `updatedBy`, `approvedBy`, `cancelledBy`, `reversedBy`, `uploadedBy`, `requestedBy` và thời điểm tương ứng trên chính record nghiệp vụ/vận hành. Đây là baseline truy vết theo ADR 0017, thay cho audit log riêng. |
| `BackgroundRun` | run ID, loại việc, checkpoint, status/retry/error đã sanitize; không phải business ledger. |

Baseline không có query audit riêng. Lịch sử được truy từ chứng từ/ledger/source record và actor metadata trên record đó.

## 6. Attachment, document và export

Drive lưu binary; Sheets chỉ lưu metadata `attachmentId`, object type/ID/partition, Drive file ID, version/checksum, uploader, time, state và access classification. Document/receipt snapshot tham chiếu source transaction, không dùng link Drive public. Export/backup/restore có run record và manifest riêng, không làm nguồn sự thật cho ledger.

## 7. Vòng đời record

- Master đã có reference: deactivate thay vì hard delete.
- Transaction/ledger/business document: không hard delete; cancel/reversal/adjustment để thay đổi ảnh hưởng.
- Runtime technical state: có TTL rõ ràng cho expired session, idempotency replay window, staging và completed run; cleanup chỉ ghi telemetry warning/error khi cần và không xóa business evidence.
- Partition đóng: read-only, vẫn query/export/backup được; archive không đổi logical ID hay reference.
