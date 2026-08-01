import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { verifyArtifact } from './verify-apps-script-artifact.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactDirectory = path.join(repositoryRoot, 'dist');
const appsScriptEntrypointWrappers = `function doGet(event) {
  return SalesManagement.doGet_(event);
}

function invoke(request) {
  return SalesManagement.invoke_(request);
}

function authorizeSetupScopes() {
  return SalesManagement.authorizeSetupScopesForAppsScript_();
}

function authorizeSetupScopes_() {
  return SalesManagement.authorizeSetupScopesForAppsScript_();
}

function installDefaultTenant_(request) {
  return SalesManagement.installDefaultTenantForAppsScript_(request || {});
}

function warmRuntime() {
  return SalesManagement.warmRuntimeForAppsScript_();
}

function warmRuntime_() {
  return SalesManagement.warmRuntimeForAppsScript_();
}

function installWarmupTrigger() {
  return SalesManagement.installWarmupTriggerForAppsScript_();
}

function installWarmupTrigger_() {
  return SalesManagement.installWarmupTriggerForAppsScript_();
}

function removeWarmupTriggers() {
  return SalesManagement.removeWarmupTriggersForAppsScript_();
}

function removeWarmupTriggers_() {
  return SalesManagement.removeWarmupTriggersForAppsScript_();
}

function getWarmupTriggerStatus() {
  return SalesManagement.getWarmupTriggerStatusForAppsScript_();
}

function getWarmupTriggerStatus_() {
  return SalesManagement.getWarmupTriggerStatusForAppsScript_();
}

function scheduledWorker() {
  return SalesManagement.scheduledWorker_();
}

function scheduledWorker_() {
  return SalesManagement.scheduledWorker_();
}

function installScheduledWorkerTrigger() {
  return SalesManagement.installScheduledWorkerTriggerForAppsScript_();
}

function installScheduledWorkerTrigger_() {
  return SalesManagement.installScheduledWorkerTriggerForAppsScript_();
}

function removeScheduledWorkerTriggers() {
  return SalesManagement.removeScheduledWorkerTriggersForAppsScript_();
}

function removeScheduledWorkerTriggers_() {
  return SalesManagement.removeScheduledWorkerTriggersForAppsScript_();
}

function getScheduledWorkerTriggerStatus() {
  return SalesManagement.getScheduledWorkerTriggerStatusForAppsScript_();
}

function getScheduledWorkerTriggerStatus_() {
  return SalesManagement.getScheduledWorkerTriggerStatusForAppsScript_();
}

function runHealthCheck() {
  return SalesManagement.runHealthCheckForAppsScript_();
}

function runHealthCheck_() {
  return SalesManagement.runHealthCheckForAppsScript_();
}

function requestManualBackup() {
  return SalesManagement.requestManualBackupForAppsScript_();
}

function requestManualBackup_() {
  return SalesManagement.requestManualBackupForAppsScript_();
}

function runPosAcceptanceDrill() {
  return SalesManagement.runPosAcceptanceDrillForAppsScript_();
}

function runPosAcceptanceDrill_() {
  return SalesManagement.runPosAcceptanceDrillForAppsScript_();
}

`;

rmSync(artifactDirectory, { force: true, recursive: true });
mkdirSync(artifactDirectory, { recursive: true });

await build({
  bundle: true,
  entryPoints: [path.join(repositoryRoot, 'apps-script/src/bootstrap/entry.ts')],
  format: 'iife',
  globalName: 'SalesManagement',
  outfile: path.join(artifactDirectory, 'code.js'),
  platform: 'neutral',
  target: 'es2020',
  tsconfig: path.join(repositoryRoot, 'tsconfig.apps-script.json'),
});

const appsScriptBundlePath = path.join(artifactDirectory, 'code.js');
writeFileSync(appsScriptBundlePath, `${appsScriptEntrypointWrappers}${readFileSync(appsScriptBundlePath, 'utf8')}`, 'utf8');

const viteBin = path.join(repositoryRoot, 'node_modules/vite/bin/vite.js');
const viteResult = await runProcess(process.execPath, [viteBin, 'build', '--config', 'vite.config.ts'], repositoryRoot);

if (viteResult !== 0) {
  throw new Error('Vite build thất bại.');
}

copyFileSync(
  path.join(repositoryRoot, 'apps-script/appsscript.json'),
  path.join(artifactDirectory, 'appsscript.json'),
);

verifyArtifact(artifactDirectory);
console.log('Đã tạo artifact Apps Script tại dist/.');

function runProcess(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code));
  });
}
