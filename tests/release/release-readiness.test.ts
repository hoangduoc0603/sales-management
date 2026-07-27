import { describe, expect, it } from 'vitest';
import { collectReleaseReadiness } from '../../scripts/release-readiness.mjs';

describe('release readiness gate', () => {
  it('marks release blocked while P0 production gaps remain open', () => {
    const result = collectReleaseReadiness({ rootDir: process.cwd() });

    expect(result.status).toBe('Blocked');
    expect(result.p0Gaps.map((gap) => gap.id)).toEqual(
      expect.arrayContaining([
        'production-persistence-adapters',
        'pos-acceptance-benchmark',
        'backup-restore-drill',
        'scheduled-worker-runtime',
        'deployment-migration-drill',
      ]),
    );
    expect(result.p0Gaps.map((gap) => gap.id)).not.toContain('security-release-review');
    expect(result.p1Gaps.map((gap) => gap.id)).not.toContain('account-session-revoke');
  });

  it('keeps P0 gaps evidence-backed with source references', () => {
    const result = collectReleaseReadiness({ rootDir: process.cwd() });

    expect(result.p0Gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'production-persistence-adapters',
          title: expect.stringContaining('Google Workspace adapter'),
          source: expect.stringContaining('SRS-OVR-023'),
        }),
        expect.objectContaining({
          id: 'backup-restore-drill',
          source: expect.stringContaining('ADR 0007'),
        }),
      ]),
    );
  });
});
