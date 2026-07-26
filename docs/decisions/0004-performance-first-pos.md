# ADR 0004 — Performance-first POS

**Trạng thái:** Accepted  
**Liên quan:** [runtime và hiệu năng](../architecture/runtime-and-performance.md)

## Bối cảnh

Khách mục tiêu thường có một thu ngân; Apps Script có latency/cold start và Google Sheets đắt khi gọi lặp lại. Tốc độ tại quầy quyết định khả năng dùng sản phẩm.

## Quyết định

Áp dụng “local-first for reads, server-authoritative for commit”. Browser cache versioned catalog/barcode/price/promotion/config; scan/search/cart chạy local; checkout là một command server. Server revalidate fresh và trả conflict rõ ràng nếu cache cũ.

## Hệ quả

Không thêm RPC/Google service/full-table scan/heavy task vào POS fast path nếu không có budget/benchmark. Cache không quyết định tồn, tiền, công nợ, quyền hoặc commit; stale cache chỉ đọc.

## Phương án không chọn

Gọi backend cho từng scan/thay đổi giỏ hoặc dùng cache transaction làm nguồn sự thật.
