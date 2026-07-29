import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildClaspDeployArgs,
  buildWebAppUrl,
  parseClaspDeploymentOutput,
  parseClaspVersionOutput,
} from '../../scripts/deploy-webapp.mjs';

const repositoryRoot = process.cwd();

describe('deploy webapp tooling', () => {
  it('configures Apps Script manifest as a public Web App running as deploying owner', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, 'apps-script/appsscript.json'), 'utf8'),
    ) as {
      webapp?: {
        access?: string;
        executeAs?: string;
      };
    };

    expect(manifest.webapp).toEqual({
      access: 'ANYONE_ANONYMOUS',
      executeAs: 'USER_DEPLOYING',
    });
  });

  it('builds clasp deploy args for a new deployment and an existing deployment', () => {
    expect(buildClaspDeployArgs({ description: 'sales-management test' })).toEqual([
      'clasp',
      'deploy',
      '--description',
      'sales-management test',
    ]);

    expect(
      buildClaspDeployArgs({
        deploymentId: 'AKfycbx-existing-deployment',
        description: 'sales-management redeploy',
      }),
    ).toEqual([
      'clasp',
      'deploy',
      '--description',
      'sales-management redeploy',
      '--deploymentId',
      'AKfycbx-existing-deployment',
    ]);

    expect(
      buildClaspDeployArgs({
        description: 'sales-management versioned',
        versionNumber: 12,
      }),
    ).toEqual(['clasp', 'deploy', '--versionNumber', '12', '--description', 'sales-management versioned']);
  });

  it('extracts the immutable Apps Script version number before deploy', () => {
    expect(parseClaspVersionOutput('Created version 12.')).toBe(12);
  });

  it('extracts the deployed Web App URL without needing the script ID in output', () => {
    const deployment = parseClaspDeploymentOutput(
      [
        'Created version 12.',
        'Created deployment AKfycbxGeneratedDeploymentId123456789 @12.',
      ].join('\n'),
    );

    expect(deployment).toEqual({
      deploymentId: 'AKfycbxGeneratedDeploymentId123456789',
      webAppUrl: 'https://script.google.com/macros/s/AKfycbxGeneratedDeploymentId123456789/exec',
    });
  });

  it('builds a stable Web App URL from an explicit deployment ID', () => {
    expect(buildWebAppUrl('AKfycbxExistingDeploymentId')).toBe(
      'https://script.google.com/macros/s/AKfycbxExistingDeploymentId/exec',
    );
  });

  it('exposes a manual owner bootstrap function in the Apps Script artifact', () => {
    const buildScript = fs.readFileSync(path.join(repositoryRoot, 'scripts/build.mjs'), 'utf8');

    expect(buildScript).toContain('function installDefaultTenant_(request)');
    expect(buildScript).toContain('SalesManagement.installDefaultTenantForAppsScript_(request || {})');
  });
});
