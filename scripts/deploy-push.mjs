import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verifyResult = spawnSync('npm', ['run', 'verify'], {
  cwd: repositoryRoot,
  stdio: 'inherit',
});

if (verifyResult.status !== 0) {
  process.exit(verifyResult.status ?? 1);
}

if (!existsSync(path.join(repositoryRoot, '.clasp.json'))) {
  console.error('Thiếu .clasp.json cục bộ. Sao chép .clasp.json.example, thêm scriptId của test tenant và chạy lại.');
  process.exit(1);
}

const claspCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const claspResult = spawnSync(claspCommand, ['clasp', 'push'], {
  cwd: repositoryRoot,
  stdio: 'inherit',
});

process.exit(claspResult.status ?? 1);
