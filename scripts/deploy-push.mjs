import { existsSync, readFileSync } from 'node:fs';
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

validateLocalClaspConfig(repositoryRoot);

const claspCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const claspResult = spawnSync(claspCommand, ['clasp', 'push'], {
  cwd: repositoryRoot,
  stdio: 'inherit',
});

process.exit(claspResult.status ?? 1);

export function validateLocalClaspConfig(rootDir) {
  const claspConfigPath = path.join(rootDir, '.clasp.json');

  if (!existsSync(claspConfigPath)) {
    console.error(
      'Thiếu .clasp.json cục bộ. Sao chép .clasp.json.example, thêm scriptId của tenant test/khách và chạy lại. Tệp này chứa scriptId nên không được commit.',
    );
    process.exit(1);
  }

  let claspConfig;
  try {
    claspConfig = JSON.parse(readFileSync(claspConfigPath, 'utf8'));
  } catch (error) {
    console.error(`.clasp.json cục bộ không hợp lệ: ${error.message}`);
    process.exit(1);
  }

  if (typeof claspConfig?.scriptId !== 'string' || claspConfig.scriptId.trim() === '') {
    console.error('.clasp.json cục bộ phải có scriptId của Apps Script project đích; scriptId local-only và không được commit.');
    process.exit(1);
  }

  if (claspConfig.rootDir !== './dist') {
    console.error("rootDir: './dist' là bắt buộc để chỉ push artifact build, không push source TypeScript.");
    process.exit(1);
  }
}
