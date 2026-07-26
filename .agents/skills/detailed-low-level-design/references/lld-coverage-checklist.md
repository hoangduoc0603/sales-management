# LLD Coverage Checklist

## Intake

- PRD/SRS/architecture/ADR đã được phê duyệt; requirement và acceptance criterion có ID.
- Primary workload, latency/performance budget, data growth/concurrency, security/scope và operational constraints đã đủ để quyết định LLD.
- Mỗi unknown được gắn là assumption/question; không bị ẩn trong schema hay API.

## Mỗi bounded context

| Mối quan tâm | Phải xác định |
| --- | --- |
| Ownership | Aggregate/table/ledger nào thuộc domain; public contract với domain khác. |
| State | State, transition, actor/permission, guard, immutable/reversal/correction path. |
| Command | Input/output/error, scope, validation, idempotency/concurrency, atomic write set và success outcome. |
| Query | Scope, source/projection, filter/sort/page, partition route, stale/cache behavior và query bound. |
| Data | Table owner/storage/lifecycle, PK/reference/lookup, typed fields, snapshot JSON, version/migration/retention. |
| Runtime | Sync hot path, worker/outbox, retry/checkpoint/recovery, audit/telemetry. |
| Test | Happy, validation, permission, idempotency/retry, failure recovery, concurrency và performance. |

## Cross-domain quality gate

- Mỗi SRS requirement có LLD owner và ít nhất một test scenario; no duplicate/contradictory state/field ownership.
- Source-of-truth rõ; projection/cache không nhận user-editable mutation thay ledger/document.
- Backend enforcement cho permission/scope/sensitive fields; UI/cache/Drive link không là trust boundary.
- Sửa lịch sử qua cancel/reversal/adjustment/return theo SRS; snapshot historical không bị recompute từ master hiện tại.
- Partition/archive/backup/restore không làm mất ID, reference, audit hoặc historical query route.
- Không còn `TODO`, `TBD`, requirement ID trùng, link hỏng hoặc decision kiến trúc chưa được phê duyệt.
