# Design Coverage Checklist

Use only the sections relevant to the product. A missing item is an interview question only when it changes the design.

## Inputs and drivers

- Approved PRD/SRS, business rules, NFR, acceptance criteria, existing ADR/data model/code, reference systems, and current platform constraints.
- Primary workload and peak: actor, device/network, latency budget, data volume/growth, concurrency, failure tolerance, cost/ownership.
- Data classification, tenancy, access scope, integrations, compliance/retention, deployment/support model.

## Sections to design

| Area | Questions that must have an answer |
| --- | --- |
| Context | Who owns/runs the system and what external systems/resources are trusted? |
| Boundaries | Which module owns each rule/data mutation? How do modules communicate? |
| Data | What is source-of-truth, ID/snapshot/reversal policy, read model, lifecycle and archive route? |
| Runtime | What is local/cache/sync/background? What makes retry safe and what is the failure outcome? |
| Performance | What is the hot path and its budget? Which I/O/query patterns are forbidden? How is it measured? |
| Security | What authenticates, authorizes, scopes and revokes access? Where are secrets and audit evidence kept? |
| Operations | How are bootstrap, migration, backup, restore, health, support and decommissioning handled? |
| Quality | Which unit/integration/E2E/recovery/load tests certify risky behavior? |

## Review traps

- Do not optimize an unlikely scale scenario before the primary flow is fast.
- Do not call a non-ACID store transactional without a recovery/reconciliation design.
- Do not use cache, UI hiding, direct file sharing, or retry with a new key as a security/consistency solution.
- Do not leave a decision as an unlabelled assumption or duplicate an ADR with conflicting Accepted status.
