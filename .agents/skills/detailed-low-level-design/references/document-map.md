# LLD Document Map

Dùng vị trí chuẩn repository; đây là map mặc định, không phải danh sách tệp bắt buộc.

| Nhu cầu | Đầu ra ưu tiên | Nội dung tối thiểu |
| --- | --- | --- |
| Convention chung | `docs/architecture/detailed-design.md` | scope LLD, ID/time/scope/snapshot, dependency, quality gate và traceability. |
| Platform contract | `docs/architecture/platform-technical-design.md` | API/RPC, context/auth, command protocol, error, worker/test seam. |
| Domain behavior | `docs/architecture/modules/<domain>.md` | ownership, state machine, command/query, orchestration, failure/recovery và tests. |
| Physical schema | `docs/data-model/tables/<group>.md` | table dictionary, typed field, key, lookup, storage/partition, snapshot, migration/lifecycle. |
| Cross-domain closure | `docs/architecture/lld-traceability-review.md` | SRS → LLD → schema → ADR → test, consistency findings và readiness gate. |
| Hard-to-reverse decision | `docs/decisions/NNNN-<slug>.md` | context, decision, consequence, alternatives, supersession. |

Không tạo tệp trống hoặc một tài liệu cho mỗi requirement. Gom nhóm theo bounded context/stable ownership; liên kết tài liệu mới từ index phù hợp.
