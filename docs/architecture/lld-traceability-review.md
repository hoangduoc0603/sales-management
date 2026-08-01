# Rà soát traceability và mức sẵn sàng LLD

**Trạng thái:** Baseline LLD hoàn chỉnh — sẵn sàng chuyển sang implementation planning  
**Rà soát theo:** [PRD](../product/PRD.md), toàn bộ [SRS](../product/srs/overview.md), Solution/System Design, ADR `0001`–`0015` và các LLD/data dictionary dưới đây.

## 1. Phạm vi và kết quả

Rà soát này kiểm tra tính đầy đủ thiết kế, không phải xác nhận code đã được xây dựng. Một yêu cầu SRS phải có owner LLD, source-of-truth/projection phù hợp, guard về scope/idempotency khi có mutation và hướng kiểm thử trước implementation. Không có yêu cầu nghiệp vụ mới được đưa vào tài liệu này.

| Nhóm SRS | Owner LLD và hành vi chính | Schema / quyết định | Mức bao phủ |
| --- | --- | --- | --- |
| `SRS-OVR` | [Detailed Design](detailed-design.md), [Platform](platform-technical-design.md), Administration–Operations | [Registry](../data-model/sheet-schema-and-registry.md), operations tables; ADR 0001–0010, 0017 | Tenant/scope, public app/session nội bộ, command lock/idempotency, worker, lifecycle, actor metadata/backup/archive/performance. |
| `SRS-CRM` | [Catalog–CRM](modules/catalog-crm.md) | [Catalog–CRM tables](../data-model/tables/catalog-crm.md); ADR 0011–0012 | Catalog/variant/unit, CRM, commercial policy, loyalty/warranty/commission và import domain. |
| `SRS-SAL` | [Sales–POS–Return](modules/sales-pos-returns.md) | [Sales–Inventory tables](../data-model/tables/sales-inventory.md); ADR 0013 | Cart local, saved draft rõ ràng, checkout, online manual, return/exchange, print. |
| `SRS-INV` | [Inventory](modules/inventory.md) | [Sales–Inventory tables](../data-model/tables/sales-inventory.md); ADR 0014 | Movement immutable, balance projection, weighted average, lot/serial, reservation, transfer, stocktake. |
| `SRS-PUR` | [Purchasing](modules/purchasing.md) | [Purchasing–Finance tables](../data-model/tables/purchasing-finance.md); ADR 0015 | PO/receipt/return NCC, actual and late landed cost, payable hand-off. |
| `SRS-FIN` | [Finance–Shift](modules/finance-shifts.md) | [Purchasing–Finance tables](../data-model/tables/purchasing-finance.md) | Payment/allocation, AR/AP, credit/prepayment, cash, shift và expense. |
| `SRS-ACC` | [Administration–Reporting–Operations](modules/administration-reporting-operations.md) | [Operations–Reporting tables](../data-model/tables/operations-reporting.md) | User/role/scope, import/export/attachment, dashboard/report, backup/restore/health. |

## 2. Cross-cutting integrity checks

| Kiểm tra | Kết luận thiết kế |
| --- | --- |
| Source of truth | Document/ledger immutable là nguồn; balance, dashboard, aging và report là projection rebuildable. Không module nào được ghi trực tiếp balance để sửa nghiệp vụ. |
| Scope và sensitive data | `ActorContext` kiểm tra trước repository; report/export/attachment/drill-down lọc backend. Google account triển khai không là identity user. |
| Command outcome | Mutation có `commandId`, fresh-read trong lock ngắn, `CommandTransaction` và actor metadata trên record nghiệp vụ; retry tra cứu kết quả cũ, không tạo duplicate. |
| Lịch sử | State effective/versioned và document snapshot bảo toàn giá/thuế/cost/policy. Sửa sai dùng cancel/reversal/adjustment/return, không update evidence cũ. |
| Performance | POS dùng cache local cho đọc, server-authoritative checkout; report/export/import/backup/PDF ở worker hoặc ngoài fast path. Query route active/archive partition, không quét toàn bộ history. |
| Vận hành | Registry/migration append-only, partition/archive, backup manifest và replacement restore; health/capacity cảnh báo, không tự xóa/restore. |

## 3. Quality gate trước implementation

Các điều kiện sau là bắt buộc cho từng implementation slice, không phải công việc phân tích còn mở:

1. Chuyển command/query được chọn thành TypeScript contracts, schema validator, error code tiếng Việt và permission matrix trong `shared/`/backend theo [folder structure](folder-structure.md).
2. Khai báo TableRegistry/header/migration thực tế từ dictionary của slice; không hard-code sheet ID, name, row number hoặc header index.
3. Viết unit/service, repository/integration, permission-scope, idempotency/retry, recovery và performance tests đã nêu trong LLD trước khi coi slice hoàn thành.
4. Benchmark mọi release ảnh hưởng POS theo `SRS-OVR-024`, gồm report/export chạy song song; chỉ tối ưu projection/cache khi số đo chỉ ra bottleneck mà không phá source-of-truth.
5. Bất kỳ thay đổi nào làm mâu thuẫn ADR Accepted, state machine, ledger ownership hoặc storage routing phải quay lại Solution Design/ADR để được phê duyệt trước.

## 4. Kết luận

LLD đã phủ các bounded context đã chốt trong PRD/SRS, có physical dictionary tương ứng, và thống nhất với các ADR nền tảng. Bước kế tiếp là lập implementation plan theo vertical slice (bootstrap/platform trước, rồi domain), không mở rộng lại phạm vi hay thay đổi quyết định kiến trúc trong lúc coding.
