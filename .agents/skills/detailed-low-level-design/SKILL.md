---
name: detailed-low-level-design
description: Use when approved PRD, SRS, and Solution/System Design need Detailed Design, Low-Level Design (LLD), module-level contracts, state machines, physical data dictionaries, or testable implementation rules before implementation planning. Do not use for product discovery, SRS-only work, high-level architecture, UI design, or coding.
---

# Detailed Design / Low-Level Design

Chuyển kiến trúc đã được phê duyệt thành thiết kế đủ rõ để đội phát triển triển khai mà không tự suy đoán quy tắc dữ liệu, giao dịch, quyền hay failure behavior. LLD cụ thể hóa quyết định đã chốt; không âm thầm thay đổi requirement hoặc architecture.

## Điều kiện đầu vào và ranh giới

- Đọc `AGENTS.md`, quy ước cấu trúc repository, PRD, toàn bộ SRS liên quan, Solution/System Design, ADR, data model và code/reference system được người dùng chỉ định.
- Chỉ bắt đầu viết LLD khi PRD, SRS và Solution/System Design đã được phê duyệt. Nếu thiếu hoặc mâu thuẫn, lập gap report và đề xuất quay lại pha trước; không tự điền bằng giả định.
- Dùng [LLD coverage checklist](references/lld-coverage-checklist.md) để kiểm tra đầu vào và tự rà. Dùng [document map](references/document-map.md) để chọn đầu ra theo repository hiện có.
- Không viết code, UI/wireframe, migration chạy thật hoặc implementation/backlog plan trong scope này. Có thể chỉ rõ contract/schema/test cần được implementation plan cụ thể hóa sau đó.

## Workflow bắt buộc

1. **Intake và truy vết.** Lập requirement map từ SRS vào domain/aggregate, command/query, state transition, data evidence và test. Xác định hot path, quality attribute, source-of-truth, mutation boundary và decision chưa đủ rõ.
2. **Brainstorming có kiểm soát.** Chỉ hỏi một câu mỗi lượt khi câu trả lời thay đổi material LLD. Nếu có 2–3 cách làm hợp lệ, nêu trade-off và khuyến nghị; phân biệt fact, inference, assumption và approved decision.
3. **Chốt hướng trước khi viết.** Trình bày document map, domain ownership, các decision vật lý/contract còn phải chốt và phạm vi từng gói. **Không tạo hoặc cập nhật LLD/data dictionary/ADR/SRS trước khi người dùng phê duyệt rõ ràng hướng và document map**, trừ khi người dùng đã ủy quyền trực tiếp cho phần đã nêu.
4. **Viết theo gói có thể duyệt.** Làm foundation trước, sau đó từng bounded context. Một domain LLD phải nêu ownership, state machine, command/query, validation/permission/idempotency, orchestration, table dictionary/projection/partition/lifecycle, side effect/worker/recovery và test scenarios. Dùng physical field/header khi cần cho implementation; không hard-code row number, Sheet ID hay Drive ID.
5. **Rà soát xuyên miền.** Lập traceability SRS → LLD → schema → ADR → test. Kiểm tra source-of-truth, immutable/reversal, scope/sensitive data, retry/concurrency, cache authority/invalidation, background work, archive/backup và performance hot path. Mâu thuẫn với SRS hoặc ADR Accepted phải được nêu để phê duyệt, không tự sửa nguồn.
6. **Bàn giao.** Kiểm tra link, requirement ID, terminology/state/field consistency, placeholder, table ownership và quality gate. Nếu thay đổi cấu trúc repository, cập nhật folder structure, README/verifier theo `AGENTS.md` và chạy kiểm tra cấu trúc.

## Quy tắc thiết kế không được bỏ qua

- Mỗi mutation phải định nghĩa actor/scope, precondition, record/ledger/projection/outbox được ghi, điều kiện thành công và outcome khi retry/lỗi.
- Mỗi query phải định nghĩa scope, source/projection, sorting/pagination, partition routing và giới hạn quét dữ liệu; cache không là authority.
- Mỗi table phải có owner, storage role, lifecycle, typed lookup fields, primary/reference keys, snapshot policy, migration rule và retention/partition policy.
- Ghi rõ tác vụ đồng bộ nào nằm trên hot path và tác vụ nào phải đưa sang worker có run ID, checkpoint, retry và observability. Không để worker hoàn tất giao dịch trọng yếu nếu SRS không cho phép.
- Tạo ADR chỉ cho quyết định khó đảo hoặc thay đổi architecture đã Accepted; ADR không thay thế requirement SRS.

## Resources

- [LLD coverage checklist](references/lld-coverage-checklist.md): checklist intake, từng domain và quality gate.
- [Document map](references/document-map.md): đầu ra LLD chuẩn và điều kiện nên tạo từng tài liệu.
