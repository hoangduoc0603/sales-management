# Triển khai và vòng đời tenant

**Nguồn tổng quan:** [Solution Design](solution-design.md). Tài liệu này áp dụng cho cả Gmail cá nhân và Google Workspace; Shared Drive là tùy chọn, không phải điều kiện vận hành.

## 1. Bootstrap tenant

Bootstrap chạy bằng Google account do khách sở hữu và tạo resource tập trung trong Drive root của tenant:

```text
Sales Management - <Tên doanh nghiệp>
|- Database/
|  |- Core Data
|  |- Runtime Data
|  |- Transaction Data/
|  `- Audit Data/
|- Attachments/
|- Backups/
|- Exports/
|- Archive/
|- Templates/
`- Generated Documents/
```

Flow bootstrap: preflight authorization/Drive access -> tạo folder/storage group -> ghi config vào Script Properties -> setup schema/migration baseline -> tạo Branch/Warehouse mặc định -> tạo Owner/admin password tạm -> tạo scheduled worker chung -> health/readiness -> versioned Web App deployment.

Config là source of truth cho resource ID, active partition, schema/app version và deployment profile. Service nghiệp vụ không đọc Properties trực tiếp hoặc hard-code Spreadsheet/folder ID.

## 2. Release và migration

Mỗi release có app version, schema version và versioned Apps Script deployment. Owner tự update hoặc cấp quyền hỗ trợ có thời hạn. Trước update, hệ thống chạy compatibility check và backup bắt buộc; nếu migration chạm dữ liệu ghi, tenant vào maintenance mode để từ chối command mới một cách rõ ràng.

Migration có ID, trạng thái, timestamp, checksum/source version và idempotency. Ưu tiên append cột/table và backward compatibility; không rename/drop column có dữ liệu hoặc di chuyển partition ngầm. Rollback deployment chỉ hợp lệ khi schema vẫn compatible. Khi migration không đảo được, khôi phục từ backup hoặc migration tiến là phương án an toàn.

## 3. Backup và restore

Backup hằng ngày giữ 30 bản gần nhất; Owner có thể tạo backup thủ công. Mỗi package có manifest gồm app/schema version, storage partitions, row count, checksum, resource config và metadata attachment. Snapshot Spreadsheet và attachment backup tăng dần phải chạy background có `runId`, checkpoint và retry; không chạy trong POS.

Restore thực hiện theo replacement-resource strategy:

1. Owner chọn backup và hệ thống freeze write.
2. Verify manifest, schema, row count, checksum và reference.
3. Tạo bộ Spreadsheet/folder phục hồi riêng; không overwrite production cũ.
4. Import, kiểm tra integrity và hiển thị kết quả cho Owner.
5. Owner xác nhận switch config atomically sang resource mới, revoke session và health-check.
6. Chỉ mở lại ghi sau health-check thành công; resource cũ được giữ để rollback khôi phục.

## 4. Health và hỗ trợ

Readiness/health kiểm tra deployment version, config, schema, storage/folder access, trigger, backup freshness, worker failures, partition capacity, quota warning và integrity. Cảnh báo không tự xóa dữ liệu hoặc tự restore.

Hỗ trợ từ bên triển khai chỉ được cấp theo thời hạn/quyền tối thiểu và phải ghi audit. Khách có thể thu hồi quyền, xuất dữ liệu và vận hành độc lập mà không ảnh hưởng tới khả năng dùng lõi ứng dụng.
