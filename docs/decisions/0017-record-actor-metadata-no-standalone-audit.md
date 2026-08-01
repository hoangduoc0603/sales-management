# ADR 0017 — Không lưu audit nghiệp vụ riêng

**Trạng thái:** Accepted  
**Supersedes:** [ADR 0008](0008-mandatory-audit-outbox.md)  
**Supersedes một phần:** [ADR 0016](0016-command-journal-single-commit-fast-path.md) về bước ghi `AuditOutbox` trong hot path  
**Liên quan:** [SRS overview](../product/srs/overview.md), [Runtime và hiệu năng](../architecture/runtime-and-performance.md)

## Bối cảnh

Ứng dụng chạy trên Google Apps Script + Google Sheets, phục vụ chủ yếu cửa hàng nhỏ. Mỗi lần ghi thêm `AuditOutbox`/`AuditLog` làm tăng I/O, latency và độ phức tạp vận hành. Với phạm vi bán một lần cho khách tự sở hữu dữ liệu, yêu cầu truy vết đủ dùng là biết bản ghi/chứng từ do ai tạo, ai cập nhật, ai duyệt hoặc ai hủy.

## Quyết định

Baseline không lưu audit nghiệp vụ riêng bằng `AuditOutbox` hoặc `AuditLog`.

Mọi record nghiệp vụ và record vận hành quan trọng phải lưu metadata actor trực tiếp trên record, theo ngữ cảnh phù hợp:

- record tạo mới: `createdBy`, `createdAt`;
- record cập nhật được phép: `updatedBy`, `updatedAt`;
- transition nghiệp vụ: `approvedBy`, `approvedAt`, `cancelledBy`, `cancelledAt`, `reversedBy`, `reversedAt`, `uploadedBy`, `requestedBy`, hoặc trường `...By` tương ứng;
- chứng từ/ledger đã `Committed` vẫn bất biến; sửa sai bằng cancel/reversal/adjustment/return, không sửa evidence cũ.

`CommandTransaction` vẫn được giữ cho idempotency, retry và tra cứu outcome. Success bình thường không tạo audit/telemetry bền vững; chỉ warning/error/runtime health cần persist telemetry best-effort khi cần.

## Hệ quả

- POS checkout và các mutation giảm ít nhất một append/write audit trên hot path.
- Không còn audit search/delivery là chức năng baseline.
- Backup/restore/archive không còn phải xử lý Audit Data như một nguồn dữ liệu nghiệp vụ bắt buộc.
- Truy vết lịch sử dựa trên document/ledger source-of-truth và các field actor metadata trên chính record.
- Nếu sau này cần audit đầy đủ cho khách enterprise, phải tạo ADR mới và thiết kế như optional module, không được đưa mặc định vào hot path POS.

## Phương án không chọn

- Giữ mandatory `AuditOutbox`: truy vết mạnh hơn nhưng làm chậm Apps Script/Sheets và tăng complexity so với nhu cầu baseline.
- Audit bất đồng bộ không bền vững: nhanh hơn nhưng dễ mất event và vẫn cần thiết kế vận hành riêng.
- Ghi `AuditLog` trực tiếp mọi mutation: đơn giản về đọc audit nhưng chậm nhất và tạo thêm cross-partition I/O.
