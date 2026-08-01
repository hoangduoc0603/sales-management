# LLD — Quản trị, báo cáo và vận hành dữ liệu

**Trạng thái:** Đã hoàn thiện LLD  
**Nguồn:** `SRS-ACC-001` đến `SRS-ACC-018`, `SRS-OVR-001`, `SRS-OVR-005` đến `SRS-OVR-011`, `SRS-OVR-019` đến `SRS-OVR-024`; [Security](../security-and-access.md), [Deployment](../deployment-and-lifecycle.md)

## 1. Ownership và ranh giới

Administration sở hữu profile `User`, Role/permission/scope, tenant configuration, Branch/Warehouse lifecycle và session metadata. Reporting sở hữu report query specification, permission-aware projection và dashboard read model, nhưng không sở hữu hay sửa ledger nguồn. Operations sở hữu import/export run, attachment metadata, backup/restore run, worker/health/capacity record.

Các domain Sales, Inventory, Purchasing và Finance vẫn là chủ sở hữu của chứng từ/ledger và các quy tắc số liệu. Administration chỉ gọi public query/command contract của chúng; import không bao giờ ghi trực tiếp vào Sheet nguồn hoặc balance projection.

## 2. Access, scope và cấu hình tenant

### State và guard

```text
User: PasswordChangeRequired -> Active <-> Locked
                                     |
                                     v
                                  Disabled

Import: Uploaded -> Validated -> AwaitingConfirmation -> Committing
                                      |                       |
                                      v                       v
                              FailedValidation          Completed | Failed

Export: Requested -> Running -> Completed | Failed | Expired
Attachment: PendingUpload -> Available | Unavailable | Deleted
```

- `User` không bị xóa cứng. `Locked` chỉ là kết quả rate-limit 15 phút; `Disabled` chỉ Admin/Owner có quyền khôi phục theo policy.
- Mỗi thay đổi password, trạng thái, role hoặc scope tăng `authVersion`, revoke mọi session còn hiệu lực, và invalidates permission/session cache trước khi trả success. Password verifier/salt/pepper không thuộc table dictionary và không được đưa vào export/telemetry.
- `RolePermission` dùng cặp `resource:action`; `UserScope` là tenant, Branch hoặc Warehouse. `AuthorizationService` tạo `ActorContext` trước service domain; repository chỉ nhận scope đã được kiểm tra. Field nhạy cảm (COGS/lợi nhuận, quỹ, công nợ) được chọn hoặc loại bỏ tại backend projection, không chỉ ẩn ở UI.
- `Branch/Warehouse.disable` phải truy vấn các blocker: on-hand/reserved/in-transit, document open, shift open, user scope còn gán. Nếu có blocker, trả danh sách phân trang theo loại; không có trạng thái nửa chừng. Warehouse không được chuyển Branch sau khi đã có reference.
- Configuration thay đổi giá/thuế/reservation/approval dùng record versioned với khoảng hiệu lực `[effectiveFrom, effectiveTo)`. Command giao dịch snapshot version áp dụng; thay đổi config không tính lại chứng từ cũ.

| Command | Permission/guard | Hậu quả `Committed` |
| --- | --- | --- |
| `admin.user.create/resetPassword/disable/assignAccess` | `user.configure`, scope tenant; không tự cấp quyền vượt actor | User/access version mới, revoke session, `updatedBy/updatedAt` trên record liên quan. |
| `admin.role.create/update` | `role.configure`; không được tạo permission/scope vượt actor | Role/permission version mới, user bị ảnh hưởng revoke session, `updatedBy/updatedAt`. |
| `admin.branch.create/update/disable`, `admin.warehouse.create/update/disable` | `configure`; lifecycle guard | Master/version mới hoặc deactivate, cache invalidation, actor metadata. |
| `admin.config.publish` | permission cấu hình riêng, approval policy khi áp dụng | Effective configuration version, `publishedBy/publishedAt`; chỉ future command dùng version mới. |
| `auth.login/changePassword/logout` | credential/rate-limit/session guard | Session hash metadata hoặc revoke; không lưu secret/token. |

## 3. Import, export và attachment

### Import theo batch

`import.template.download` chỉ trả template/schema version hiện hành. `import.upload` lưu file staging trong Drive tenant private và tạo `ImportBatch`; `import.validate` parse bounded chunk, kiểm tra schema, duplicate nội/bên ngoài batch, permission/scope và rule của domain. Kết quả theo dòng được lưu `ImportStagingRow`; UI không được suy luận valid thay backend.

`import.commit` yêu cầu trạng thái `AwaitingConfirmation`, `batchId`, lựa chọn `ValidRowsOnly|AllOrNothing`, `commandId` và actor còn quyền. Worker xử lý theo chunk/checkpoint, nhưng từng record nghiệp vụ gọi command domain idempotent và lưu actor metadata trên record nguồn. Batch chỉ `Completed` sau khi mọi row được quyết định; retry cùng `batchId`/row key trả outcome cũ. Tồn đầu kỳ chỉ gọi flow Inventory được phép, không cập nhật `InventoryBalance` trực tiếp.

### Export và attachment

`report.export.request` chốt query specification, actor, scope, selected columns và snapshot `asOf` trước khi tạo `ExportRun`. Backend bỏ cột/row ngoài permission trước khi render CSV/XLSX. Export nhỏ có thể hoàn thành đồng bộ ngoài ScriptLock; export lớn luôn worker/checkpoint và ghi file vào `Exports/` private. `export.download` lại xác thực actor/scope/run owner; không trả public Drive URL. File hết TTL chuyển `Expired` và chỉ cleanup file kỹ thuật theo policy.

`attachment.upload` baseline nhận nội dung file nhỏ dạng base64, ghi vào thư mục Drive Attachments riêng tư và chỉ lưu metadata; không trả public URL. `attachment.upload.begin/complete` có thể bổ sung sau cho file lớn/chunked upload. `attachment.list/download/delete` luôn kiểm tra quyền xem/sửa object nguồn trước Drive access; download trả nội dung qua backend/token nội bộ, không trả Drive URL. Metadata giữ object ID, partition, checksum/version, lifecycle và actor metadata; delete logical giữ history trên record metadata. Integrity worker chuyển metadata thành `Unavailable` nếu file bị xóa ngoài ứng dụng.

Baseline không có `audit.search` hoặc `audit.deliver`; khi cần xem ai tạo/sửa/duyệt/hủy, UI/API đọc field actor metadata trên record nguồn.

## 4. Dashboard và query báo cáo

Mỗi query có envelope: `reportId`, `dateField`, date range, Branch/Warehouse scope, filters, dimensions, cursor/page size và `asOf`. `ReportService` intersect scope yêu cầu với `ActorContext`, chọn active/archive partitions theo date/reference, đọc projection đã hiệu lực và trả metadata `generatedAt`, `asOf`, `partitionCoverage`, `archiveIncluded` cùng drill-down token. Token chỉ mang query hash/scope fingerprint; backend resolve lại permission khi drill-down.

- Dashboard dùng `DashboardProjection` theo Branch/date bucket; không quét ledger/document toàn kỳ trong lúc mở POS.
- Dashboard KPI trả bốn chỉ số chính theo `DashboardKpiDTO`; ngoài `valueVnd`/`valueCount` có thể trả `statusLabel` và `secondaryValueVnd` để UI render badge phụ như “Đã xác nhận” hoặc “quá hạn”. Các giá trị phụ này vẫn thuộc projection/backend permission filtering, không được UI tự bịa từ display mock.
- Hàng đợi đơn nhập tay trên Dashboard trả `DashboardManualOrderDTO` từ projection/backend, có thể kèm `customerSubtitle` và `slaTargetMinutes` để UI render dòng phụ/SLA; UI không tự suy diễn nhóm khách hoặc SLA từ tên hiển thị.
- Báo cáo doanh số phân biệt `createdAt`, `completedOrShippedAt`, `deliveredAt`, `paidAt`; query bắt buộc chọn một `dateField`.
- Báo cáo tồn/mua/tiền đọc balance, aging và shift projection có `asOf`/source reference; drill-down luôn về ledger/chứng từ nguồn trong scope.
- Draft/Rejected/Cancelled bị loại trừ mặc định. Báo cáo chứng từ mở phải khai báo rõ tập trạng thái. COGS/lợi nhuận bị loại ngay tại query/export resolver nếu actor thiếu sensitive permission.
- Báo cáo có cost lớn, khoảng thời gian nhiều partition hoặc rebuild projection chuyển thành `ExportRun`/worker; không giữ `ScriptLock` và không cạnh tranh POS fast path.

## 5. Worker, backup/restore và observability

Scheduled worker chung claim `BackgroundRun` theo lease/run ID, xử lý một loại job/chunk trong execution budget, checkpoint sau mỗi chunk và retry backoff có giới hạn. Queue chỉ gồm import, export, backup, archive, rebuild/reconcile, runtime TTL cleanup và health/capacity; worker không complete POS hoặc tự phát sinh ledger cốt lõi.

`backup.request` tạo `BackupRun`/manifest draft; backup hằng ngày dùng cùng protocol. `restore.prepare` freeze command mới, verify manifest/schema/checksum/reference và tạo resource replacement. Chỉ `restore.switch` của Owner mới atomically đổi runtime config, revoke session và mở ghi sau health check; production cũ được giữ để rollback restore. Không có command ghi đè trực tiếp resource production.

`ops.health.check` và capacity worker ghi version/config/trigger/storage access, active partition capacity, backup freshness, worker backlog/failure, quota/integrity. Chỉ warning/error telemetry được persist và luôn có `requestId`/`runId`; không log secret. Cảnh báo chỉ hướng dẫn Owner tạo partition, archive hoặc xử lý lỗi, không tự xóa lịch sử hay tự restore.

## 6. Test matrix

| Nhóm | Kịch bản bắt buộc |
| --- | --- |
| Access | API scope Warehouse khác bị từ chối trước query; reset/disable/giảm scope revoke session ngay; sensitive field không lộ qua dashboard, drill-down hoặc export. |
| Config/lifecycle | Không disable Warehouse còn tồn/ca/user; config future-effective không đổi snapshot chứng từ cũ. |
| Import | Lỗi từng dòng; `ValidRowsOnly`/`AllOrNothing`; retry batch/row không tạo trùng; tồn đầu kỳ sai flow bị chặn. |
| Export/attachment/actor metadata | Export scope/column filtering; export lớn không giữ lock; attachment không dùng public URL; record nguồn giữ actor metadata cần thiết. |
| Report | Date semantic đúng, archive coverage rõ, KPI drill-down đúng source, projection rebuild không đổi ledger. |
| Operations | Backup manifest/restore replacement/freeze/switch; worker retry/checkpoint; quota/health alert; benchmark POS chạy song song report/export. |
