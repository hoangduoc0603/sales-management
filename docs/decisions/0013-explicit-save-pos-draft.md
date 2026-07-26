# ADR 0013 — POS cart local, chỉ persist khi lưu tạm

**Trạng thái:** Accepted  
**Liên quan:** [LLD Sales](../architecture/modules/sales-pos-returns.md), `SRS-SAL-003`, `SRS-SAL-010`

## Bối cảnh

POS cần scan/cart phản hồi nhanh, nhưng người dùng cũng cần chủ động treo/lưu một đơn để mở lại. Autosave từng thay đổi tạo RPC/I/O không cần thiết.

## Quyết định

Giỏ POS tồn tại local-first. Chỉ action `saveDraft` tạo/cập nhật SaleOrder Draft trên server. Draft không tạo inventory/finance/CRM ledger. `completeSale` revalidate cart/draft rồi commit atomic; cart chưa lưu mất khi browser đóng/reload.

## Hệ quả

Tốc độ scan/cart không bị server round-trip; có khả năng mở lại Draft khi user đã chọn lưu. Không hỗ trợ autosave hoặc chuyển giỏ chưa lưu giữa thiết bị.

## Phương án không chọn

Chỉ local không có saved draft, hoặc autosave sau từng scan/change. Phương án đầu thiếu nghiệp vụ treo đơn; phương án sau trái performance-first POS.
