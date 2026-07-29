import { appendFileSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { verifyArtifact } from './verify-apps-script-artifact.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactDirectory = path.join(repositoryRoot, 'dist');

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

appendFileSync(
  path.join(artifactDirectory, 'code.js'),
  `\nfunction doGet(event) {\n  return SalesManagement.doGet_(event);\n}\n\nfunction invoke(request) {\n  return SalesManagement.invoke_(request);\n}\n\nfunction installDefaultTenant_(request) {\n  return SalesManagement.installDefaultTenantForAppsScript_(request || {});\n}\n`,
  'utf8',
);

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
