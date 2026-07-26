# ADR 0012 — Quote trước, policy usage chỉ commit cùng đơn

**Trạng thái:** Accepted  
**Liên quan:** [LLD Catalog–CRM](../architecture/modules/catalog-crm.md), `SRS-CRM-009` đến `SRS-CRM-013`, `SRS-SAL-009`

## Bối cảnh

Giỏ POS cần tính giá/khuyến mại/điểm tức thì nhưng draft cart có thể bị bỏ hoặc dữ liệu policy thay đổi trước checkout. Giữ voucher/budget/point ngay khi quote làm tăng lock, TTL và rollback.

## Quyết định

Pricing/Promotion trả CommerceQuote không persist reservation. Sales re-evaluate quote trong commit; nếu hợp lệ thì batch-write PromotionApplication, VoucherUsage, PointLedger và snapshot cùng Sale Order. Return/cancel tạo record đối ứng tham chiếu usage/ledger gốc.

## Hệ quả

POS phải xử lý conflict rõ ràng khi quote stale. Usage/budget/point không bị rò vì cart bỏ dở; concurrent checkout được phân giải trong command lock/idempotency.

## Phương án không chọn

Reserve ngay khi add cart hoặc commit policy qua worker sau checkout. Hai phương án tạo cleanup/recovery phức tạp hoặc cho phép order success mà policy ledger chưa chắc chắn.
