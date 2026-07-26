# ADR 0007 — Backup manifest và replacement-resource restore

**Trạng thái:** Accepted  
**Liên quan:** [deployment lifecycle](../architecture/deployment-and-lifecycle.md)

## Bối cảnh

Backup chỉ copy một file không đủ khi data nằm ở nhiều partition/folder. Restore overwrite production có thể phá vỡ recovery khi import/validation lỗi.

## Quyết định

Backup manifest-first mọi storage partition/config/schema/checksum/attachment metadata; backup lớn chạy worker. Restore freeze write, tạo resource thay thế, verify rồi Owner xác nhận switch config; giữ production cũ để rollback khôi phục.

## Hệ quả

Restore lâu hơn overwrite trực tiếp nhưng an toàn/kiểm tra được. Cần revoke session, audit và health-check sau switch.

## Phương án không chọn

Chỉ dựa vào Drive version history hoặc restore ghi đè trực tiếp Spreadsheet production.
