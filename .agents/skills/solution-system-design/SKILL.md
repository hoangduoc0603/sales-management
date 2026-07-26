---
name: solution-system-design
description: Use when approved PRD and SRS need Solution Design, System Design, SAD, HLD, architecture decisions, data/storage architecture, runtime/performance, security, deployment, or ADR documentation before implementation. Do not use for product discovery, SRS-only work, UI specification, or coding.
---

# Solution & System Design

Create an implementable architecture from approved requirements without silently turning unknowns into decisions. Keep one canonical design source, then add specialized documents and ADRs only where they improve maintainability.

## Preconditions and boundaries

- Read `AGENTS.md`, repository structure, PRD, relevant SRS, ADRs, data-model docs, and user-nominated reference system/code before proposing design.
- If PRD or SRS is absent, materially incomplete, or unapproved, stop at a gap report and recommend the preceding phase. Do not manufacture requirements.
- Research current platform limits, deployment/security models, quotas, or standards from primary sources when they affect the design. Label evidence, inference, assumption, and approved decision separately.
- Do not write code, physical table headers, API endpoint inventories, UI specs, or implementation plans in this skill's scope.

## Mandatory workflow

1. Map requirements to architectural drivers: primary workload, quality attributes, data sensitivity, ownership, integrations, operational scale, and non-negotiable constraints. Read [design coverage](references/design-coverage-checklist.md).
2. Inspect existing architecture/code or a user-nominated reference only as patterns. Record conflicts and never copy policy, schema, or implementation blindly.
3. Ask one question per turn only when an unanswered decision materially changes the architecture. Do not ask again for information already present.
4. For real alternatives, present 2–3 options with trade-offs and a recommendation. Prioritize the primary user flow and measured performance budget over speculative scale.
5. Present the proposed document map and design sections. **Do not create or update design documents, SRS, PRD, ADRs, or repository structure until the user explicitly approves the design direction and document map.**
6. Present and obtain approval for each material section, or obtain explicit approval for the complete design at once: system context; module boundaries; data/storage lifecycle; runtime/performance/consistency; security/access; deployment/operations; test/observability/ADR.
7. After approval, use [document map](references/document-map.md) to write the canonical Solution Design, focused deep-dive documents, logical data/storage documents, and ADRs. Adapt names/count to the project; do not create empty or duplicate docs.
8. Update SRS for new observable behavior, NFR, operational policy, and acceptance criteria caused by approved architecture. Update PRD only to remove or link decisions that are no longer open. Keep implementation choices out of SRS unless they are externally observable constraints.
9. Self-review and hand off: check links, unique requirement IDs, placeholders, contradictions across PRD/SRS/design/ADR, repository-structure rules, and relevant verification commands. Ask the user to review the written design before implementation planning.

## Required design rules

- Define source-of-truth, immutable history/reversal policy, ownership, access scope, failure/retry behavior, and data lifecycle for every transactional system.
- Define a performance budget from the real primary workload. Separate client-local work, synchronous commit, cached reads, and background work; do not place heavy I/O, reporting, export, file generation, or speculative concurrency machinery in a hot path without evidence.
- Treat cache as an optimization, not authority. Define cache key/version/invalidation/stale-write behavior whenever cache is used.
- Make background work idempotent, observable, and unable to finalize critical user transactions unless requirements explicitly allow it.
- State security trust boundaries and backend authorization; never rely on hidden UI, browser cache, or deployment identity alone.
- Use ADRs for difficult-to-reverse decisions. A new ADR that replaces an accepted one must mark the prior ADR `Superseded` and link both directions.

## Quality gate

Before completion, ensure the result has a canonical overview, traceability to approved requirements, clear open assumptions, no unfinished markers, and tests or benchmark scenarios for high-risk quality attributes. If a new folder or required artifact is added, update the repository structure documentation, README/verifier when applicable, and run the project structure check.

## Resources

- [Design coverage checklist](references/design-coverage-checklist.md): use during intake and self-review.
- [Document map](references/document-map.md): use after approval to select outputs and avoid fragmented architecture docs.
