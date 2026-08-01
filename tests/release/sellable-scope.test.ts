import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const requiredOpenGaps = [
  'reset-password-disable-role-change-revoke-session',
  'price-promotion-stale-conflict-checkout',
  'opening-balance-import-safe-flow',
  'lot-fefo-serial-state-guard',
  'transfer-stocktake-state',
  'inventory-concurrency-performance-matrix',
  'cashdrawer-paymentmethod-master',
  'receivable-payable-aging-projection',
  'pos-checkout-orchestration',
  'pos-commit-revalidation',
  'pos-structured-conflicts',
  'pos-receipt-snapshot-print',
  'pos-acceptance-performance-tests',
  'deposit-credit-refund-cancel-order',
  'reporting-archive-drilldown-worker-export',
  'operations-import-worker-chunk',
  'operations-private-attachment-drive',
  'operations-backup-retention',
  'operations-restore-replacement',
  'operations-archive-readonly-routing',
  'operations-production-test-matrix',
] as const;

describe('sellable release scope baseline', () => {
  it('classifies every open master-plan gap exactly once', () => {
    const document = readFileSync(
      path.join(process.cwd(), 'docs/architecture/release-scope-baseline.md'),
      'utf8',
    );

    const classificationTable = extractSection(document, '## 3. Classification table', '## 4. UI-disabled items');

    for (const gapId of requiredOpenGaps) {
      const count = countOccurrences(classificationTable, `| \`${gapId}\` |`);
      expect(count, `${gapId} must be classified exactly once`).toBe(1);
    }
  });

  it('uses only approved classification values', () => {
    const document = readFileSync(
      path.join(process.cwd(), 'docs/architecture/release-scope-baseline.md'),
      'utf8',
    );
    const classificationTable = extractSection(document, '## 3. Classification table', '## 4. UI-disabled items');
    const tableRows = classificationTable
      .split('\n')
      .filter((line) => line.startsWith('| `') && !line.includes('Gap ID'));

    expect(tableRows.length).toBeGreaterThan(0);
    for (const row of tableRows) {
      expect(row).toMatch(/\| `(?:MustFixBeforeRelease|CanShipDisabled|PostRelease)` \|/);
    }
  });
});

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function extractSection(document: string, startHeading: string, endHeading: string): string {
  const start = document.indexOf(startHeading);
  const end = document.indexOf(endHeading);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return document.slice(start, end);
}
