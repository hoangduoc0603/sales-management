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

  it('declares explicit OAuth scopes required by first-run setup and runtime storage', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, 'apps-script/appsscript.json'), 'utf8'),
    ) as {
      oauthScopes?: string[];
    };

    expect(manifest.oauthScopes).toEqual([
      'https://www.googleapis.com/auth/script.storage',
      'https://www.googleapis.com/auth/script.scriptapp',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ]);
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

  it('exposes a harmless public authorization helper for newly added setup scopes', () => {
    const buildScript = fs.readFileSync(path.join(repositoryRoot, 'scripts/build.mjs'), 'utf8');

    expect(buildScript).toContain('function authorizeSetupScopes()');
    expect(buildScript).toContain('SalesManagement.authorizeSetupScopesForAppsScript_()');
  });

  it('exposes owner-managed runtime warm-up helpers in the Apps Script artifact', () => {
    const buildScript = fs.readFileSync(path.join(repositoryRoot, 'scripts/build.mjs'), 'utf8');

    expect(buildScript).toContain('function warmRuntime()');
    expect(buildScript).toContain('function installWarmupTrigger()');
    expect(buildScript).toContain('function removeWarmupTriggers()');
    expect(buildScript).toContain('function getWarmupTriggerStatus()');
    expect(buildScript).toContain('function warmRuntime_()');
    expect(buildScript).toContain('SalesManagement.warmRuntimeForAppsScript_()');
    expect(buildScript).toContain('function installWarmupTrigger_()');
    expect(buildScript).toContain('SalesManagement.installWarmupTriggerForAppsScript_()');
    expect(buildScript).toContain('function removeWarmupTriggers_()');
    expect(buildScript).toContain('SalesManagement.removeWarmupTriggersForAppsScript_()');
    expect(buildScript).toContain('function getWarmupTriggerStatus_()');
    expect(buildScript).toContain('SalesManagement.getWarmupTriggerStatusForAppsScript_()');
  });

  it('places Apps Script entrypoint wrappers before the bundled code so the editor function picker can detect them', () => {
    const buildScript = fs.readFileSync(path.join(repositoryRoot, 'scripts/build.mjs'), 'utf8');

    expect(buildScript.indexOf('function authorizeSetupScopes()')).toBeLessThan(
      buildScript.indexOf('await build({'),
    );
  });

  it('force-pushes the artifact before creating a versioned Web App deployment', () => {
    const deployScript = fs.readFileSync(path.join(repositoryRoot, 'scripts/deploy-webapp.mjs'), 'utf8');

    expect(deployScript).toContain("'clasp', 'push', '--force'");
  });
});
