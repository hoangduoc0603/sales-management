# ADR 0003 — Storage role, partition và archive

**Trạng thái:** Accepted  
**Liên quan:** [storage lifecycle](../data-model/storage-partitioning-and-lifecycle.md)

## Bối cảnh

Một Spreadsheet chứa mọi master, transaction và ledger sẽ chậm/dễ chạm giới hạn. Tách một Spreadsheet cho từng module lại làm tăng liên kết chéo và I/O POS.

## Quyết định

Tách Core, Runtime, Transaction và Audit theo storage role. POS chỉ ghi active Transaction partition; Transaction/Audit partition theo năm tài chính và phần thứ tự (`FYyyyy-Pnn`), có archive read-only. Registry route logical table/record theo partition key.

## Hệ quả

Hot path không mở lịch sử/core write. Backup/restore/report phải biết toàn bộ partition. Không được dùng row number, hard-code file ID hay scan mọi archive để tìm record. Audit partition trong ADR gốc đã được supersede bởi ADR 0017; baseline chỉ dùng actor metadata trên record.

## Phương án không chọn

Một Core Data lớn hoặc một file mỗi domain. Hai phương án lần lượt không bền về dung lượng/hiệu năng và quá phức tạp về cross-file commit.
