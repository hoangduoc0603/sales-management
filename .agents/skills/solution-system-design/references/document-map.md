# Document Map

Use the repository's documented locations. The following is a default map, not a mandatory file list.

| Need | Preferred output | Include |
| --- | --- | --- |
| One source of truth | `docs/architecture/solution-design.md` | drivers, context, principles, components, flows, traceability and links |
| Code/module boundaries | `docs/architecture/application-architecture.md` | layers, ownership, contracts and dependency rules |
| Hot path or platform limits | `docs/architecture/runtime-and-performance.md` | budgets, cache, commit/retry, worker and telemetry |
| Trust boundary | `docs/architecture/security-and-access.md` | identity, authorization, secrets, session, audit and data isolation |
| Customer/runtime lifecycle | `docs/architecture/deployment-and-lifecycle.md` | bootstrap, upgrade, migration, backup, restore and health |
| Domain model | `docs/data-model/logical-data-model.md` | aggregate/ledger/snapshot/ID ownership; no physical header guesswork |
| Storage lifecycle | `docs/data-model/storage-partitioning-and-lifecycle.md` | storage role, routing, partition, archive and backup impact |
| Irreversible choice | `docs/decisions/NNNN-<slug>.md` | context, decision, consequences, alternatives, supersession links |

Create the overview first. Add a deep-dive only when it has an independent concern, clear owner and stable boundary. Link each deep-dive from the overview and the relevant directory README. Update SRS for observable requirements and acceptance criteria; do not use ADR as a replacement for SRS.
