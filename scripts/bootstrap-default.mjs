import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateLocalClaspConfig } from './deploy-webapp.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function buildClaspBootstrapArgs() {
  return ['clasp', 'run', 'installDefaultTenant_'];
}

export function isClaspRunApiExecutableError(output) {
  return (
    output.includes('Script function not found') ||
    output.includes('deployed as API executable')
  );
}

async function main() {
  try {
    validateLocalClaspConfig(repositoryRoot);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(npxCommand, buildClaspBootstrapArgs(), {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0 || isClaspRunApiExecutableError(output)) {
    console.error('');
    console.error('Không bootstrap được qua `clasp run`.');
    console.error('Nguyên nhân thường gặp: Apps Script project chưa có API executable deployment phù hợp cho scripts.run.');
    console.error('Cách xử lý nhanh cho lần đầu triển khai:');
    console.error('1. Mở Apps Script editor bằng `npx clasp open-script`.');
    console.error('2. Chọn function `installDefaultTenant_`.');
    console.error('3. Bấm Run và duyệt quyền Google nếu được hỏi.');
    console.error('4. Sau khi function chạy xong, mở lại Web App và đăng nhập `admin/admin123`.');
    process.exit(result.status === 0 ? 1 : result.status ?? 1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
