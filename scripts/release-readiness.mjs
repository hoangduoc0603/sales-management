import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const phase12PlanPath = 'docs/superpowers/plans/2026-07-27-release-hardening-acceptance-phase-12.md';
const masterPlanPath = 'docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md';

const p0Rules = [
  {
    id: 'production-persistence-adapters',
    title: 'Thiếu production Google Workspace adapter cho Sheets/Drive/runtime config',
    source: 'SRS-OVR-003, SRS-OVR-008, SRS-OVR-023, sheet-schema-and-registry.md',
    evidence: ['Google Workspace adapter', 'SheetGateway', 'DriveGateway'],
  },
  {
    id: 'pos-acceptance-benchmark',
    title: 'Thiếu acceptance và benchmark cho POS sellable baseline',
    source: 'SRS-OVR-004, SRS-OVR-013, SRS-OVR-024, runtime-and-performance.md',
    evidence: ['POS acceptance', 'POS performance benchmark', 'Benchmark POS'],
  },
  {
    id: 'backup-restore-drill',
    title: 'Thiếu backup/restore replacement-resource drill',
    source: 'SRS-OVR-010, ADR 0007',
    evidence: ['backup/restore drill', 'replacement-resource restore', 'restore drill'],
  },
  {
    id: 'scheduled-worker-runtime',
    title: 'Thiếu scheduled worker runtime cho audit/import/export/backup/archive',
    source: 'SRS-OVR-021, LLD Administration–Reporting–Operations §5',
    evidence: ['Worker thật', 'scheduled trigger', 'BackgroundRun'],
  },
  {
    id: 'deployment-migration-drill',
    title: 'Thiếu deployment, migration và customer installation drill',
    source: 'SRS-OVR-023, ADR 0006',
    evidence: ['Deployment/migration', 'fresh tenant', 'customer installation checklist'],
  },
  {
    id: 'security-release-review',
    title: 'Thiếu security release review cho session/token/scope/sensitive data',
    source: 'SRS-OVR-005..008, LLD test matrix',
    evidence: ['Thiếu security release review', 'security-release-review'],
    resolvedEvidence: ['Security review local pass', 'tests/apps-script/release/security-review.test.ts'],
  },
];

const p1Rules = [
  {
    id: 'account-session-revoke',
    title: 'Reset password/disable/role change cần chứng minh revoke session',
    source: 'Phase 2, SRS-OVR-007',
    evidence: ['reset password/disable/role change revoke session'],
    resolvedEvidence: ['authVersion revoke', 'tests/apps-script/release/security-review.test.ts'],
  },
  {
    id: 'checkout-stale-conflict',
    title: 'Price/promotion stale conflict cần được kiểm chứng ở checkout',
    source: 'Phase 4, SRS-OVR-020',
    evidence: ['price/promotion stale conflict'],
  },
  {
    id: 'inventory-opening-lot-serial-transfer-stocktake',
    title: 'Opening balance, lot/serial, transfer và stocktake cần chốt sellable scope',
    source: 'Phase 5, SRS-INV',
    evidence: ['Opening balance', 'lot FEFO', 'transfer/stocktake'],
  },
  {
    id: 'finance-master-aging',
    title: 'CashDrawer/PaymentMethod master và aging projection cần chốt sellable scope',
    source: 'Phase 6, SRS-FIN',
    evidence: ['CashDrawer/PaymentMethod', 'aging projection'],
  },
  {
    id: 'sales-deposit-attachment-policy-reversal',
    title: 'Deposit cancellation, attachment Drive flow và CRM policy reversal cần chốt sellable scope',
    source: 'Phase 8, SRS-SAL',
    evidence: ['Deposit credit/refund', 'attachment Drive flow', 'CRM policy reversal'],
  },
  {
    id: 'reporting-drilldown-archive-worker-export',
    title: 'Archive coverage, drill-down permission và worker-backed export cần chốt production scope',
    source: 'Phase 10, SRS-ACC',
    evidence: ['archive coverage', 'drill-down token', 'worker-backed export'],
  },
  {
    id: 'operations-production-lifecycle',
    title: 'Import/attachment/audit/backup/restore/archive production lifecycle cần hardening',
    source: 'Phase 11, SRS-OVR-009..011',
    evidence: ['ImportBatch/ImportStagingRow', 'attachment metadata', 'AuditOutbox delivery worker'],
  },
];

export function collectReleaseReadiness({ rootDir = repositoryRoot } = {}) {
  const corpus = [
    readRequiredFile(rootDir, phase12PlanPath),
    readRequiredFile(rootDir, masterPlanPath),
    readOptionalFile(rootDir, 'docs/architecture/release-hardening.md'),
    readOptionalFile(rootDir, 'docs/architecture/release-scope-baseline.md'),
  ].join('\n');

  const p0Gaps = collectMatchingRules(p0Rules, corpus);
  const p1Gaps = collectMatchingRules(p1Rules, corpus);

  return {
    status: p0Gaps.length === 0 ? 'Ready' : 'Blocked',
    p0Gaps,
    p1Gaps,
  };
}

function collectMatchingRules(rules, corpus) {
  return rules
    .filter((rule) => rule.evidence.some((text) => corpus.includes(text)))
    .filter((rule) => !rule.resolvedEvidence?.some((text) => corpus.includes(text)))
    .map(({ evidence: _evidence, resolvedEvidence: _resolvedEvidence, ...gap }) => gap);
}

function readRequiredFile(rootDir, relativePath) {
  const filePath = path.join(rootDir, relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`Missing required release readiness source: ${relativePath}`);
  }
  return readFileSync(filePath, 'utf8');
}

function readOptionalFile(rootDir, relativePath) {
  const filePath = path.join(rootDir, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = collectReleaseReadiness({ rootDir: repositoryRoot });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'Blocked') {
    process.exitCode = 1;
  }
}
