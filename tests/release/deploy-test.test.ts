import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTestWebAppUrl, findTestDeploymentIdFromDeployments } from '../../scripts/deploy-test.mjs';

const repositoryRoot = process.cwd();

describe('deploy test tooling', () => {
  it('builds the Apps Script /dev test deployment URL from Web App deployment ID', () => {
    expect(buildTestWebAppUrl('AKfycb-test-deployment')).toBe(
      'https://script.google.com/macros/s/AKfycb-test-deployment/dev',
    );
  });

  it('selects the unversioned HEAD deployment for /dev testing', () => {
    expect(
      findTestDeploymentIdFromDeployments([
        {
          deploymentId: 'AKfycb-head',
        },
        {
          deploymentId: 'AKfycb-versioned',
          versionNumber: 1,
        },
      ]),
    ).toBe('AKfycb-head');
  });

  it('pushes latest code for /dev testing without creating immutable versions or deployments', () => {
    const deployScript = fs.readFileSync(path.join(repositoryRoot, 'scripts/deploy-test.mjs'), 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['deploy:test']).toBe('node scripts/deploy-test.mjs');
    expect(deployScript).toContain("'clasp', 'push', '--force'");
    expect(deployScript).toContain("'clasp', 'deployments', '--json'");
    expect(deployScript).not.toContain("'clasp', 'version'");
    expect(deployScript).not.toContain("'clasp', 'deploy'");
  });
});
