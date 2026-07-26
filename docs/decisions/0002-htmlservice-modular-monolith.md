# ADR 0002 — HtmlService và modular monolith

**Trạng thái:** Accepted  
**Liên quan:** [kiến trúc ứng dụng](../architecture/application-architecture.md)

## Bối cảnh

Sản phẩm phải triển khai trọn vẹn trong Google account khách, không tạo chi phí hosting/infra ngoài. Nghiệp vụ vẫn đủ rộng: POS, kho, mua, tiền, CRM và quản trị.

## Quyết định

Bundle React/Vite vào Apps Script `HtmlService`; frontend gọi backend qua typed `google.script.run` adapter. Backend là modular monolith, tách Platform, Catalog, Sales, Inventory, Purchasing, Finance, CRM & Promotion, Administration & Reporting.

## Hệ quả

Một deployment/tenant dễ cài và backup. Các domain giao tiếp qua service contract, không gọi chéo repository. Không dùng microservice, HTTP nội bộ hay hosting ngoài.

## Phương án không chọn

SPA host ngoài Apps Script hoặc microservice: tăng quyền, chi phí, deployment và dependency vận hành mà không phù hợp mô hình bán một lần.
