# ADR 0015 — Chi phí mua muộn phân bổ tồn còn lại, phần đã bán thành variance

**Trạng thái:** Accepted  
**Liên quan:** [LLD Purchasing](../architecture/modules/purchasing.md), `SRS-PUR-008`

## Quyết định

Chi phí/hóa đơn NCC đến sau receipt tạo adjustment bất biến. Chi phí được phân bổ vào giá trị tồn còn lại; phần không còn tồn ghi `PurchaseCostVariance`. Không sửa receipt hay COGS/đơn bán lịch sử.

## Hệ quả

Giá trị tồn hiện tại phản ánh chi phí hợp lệ, lịch sử bán giữ snapshot, và mọi chênh lệch truy vết được bằng chứng từ điều chỉnh kèm actor metadata.
