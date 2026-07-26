# ADR 0009 — Typed RPC qua single API gateway

**Trạng thái:** Accepted  
**Liên quan:** [Platform technical design](../architecture/platform-technical-design.md), `SRS-OVR-004`, `SRS-OVR-022`

## Bối cảnh

`google.script.run` gọi function server bất đồng bộ và các call song song không có thứ tự thực thi bảo đảm. Rải nhiều tên public Apps Script function qua component làm yếu typed boundary, telemetry, authorization và xử lý unknown command outcome.

## Quyết định

Expose một public business function `invoke(ApiRequest)` cho React adapter. `operation` đi qua allowlist typed có input/output schema, action permission, scope resolver và handler rõ ràng. `doGet` chỉ phục vụ UI; helper không là public API. Mutation dùng command ID/idempotency key, query không được dispatch raw CRUD/table access.

## Hệ quả

API có một pipeline thống nhất cho session, permission, validation, error mapping và telemetry. Thêm operation cần đăng ký contract rõ ràng nhưng không cần thêm public Apps Script endpoint. Client phải dùng typed adapter; function `google.script.run` không xuất hiện trong feature component.

## Phương án không chọn

Public function riêng cho mỗi use case, generic CRUD theo table name, hoặc REST/HTTP nội bộ. Các phương án này lần lượt làm boundary phân tán, lộ data access abstraction, hoặc tăng độ trễ/vận hành không cần thiết trên Apps Script.
