import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const requiredFiles = ['appsscript.json', 'code.js', 'index.html'];

export function verifyArtifact(artifactDirectory) {
  const files = readdirSync(artifactDirectory).sort();
  const missingFiles = requiredFiles.filter((filename) => !existsSync(path.join(artifactDirectory, filename)));

  if (missingFiles.length > 0) {
    throw new Error(`Artifact thiếu tệp bắt buộc: ${missingFiles.join(', ')}.`);
  }

  if (files.length !== requiredFiles.length || files.some((filename) => !requiredFiles.includes(filename))) {
    throw new Error('Artifact chỉ được chứa appsscript.json, code.js và index.html.');
  }

  const html = readFileSync(path.join(artifactDirectory, 'index.html'), 'utf8');
  if (hasExternalAssetReference(html)) {
    throw new Error('index.html không được chứa asset URL ngoài.');
  }

  const code = readFileSync(path.join(artifactDirectory, 'code.js'), 'utf8');
  if (/(^|\n)\s*(import|export)\s/m.test(code)) {
    throw new Error('code.js không được chứa import/export runtime.');
  }

  const manifestPath = path.join(artifactDirectory, 'appsscript.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (
    manifest.runtimeVersion !== 'V8' ||
    manifest.timeZone !== 'Asia/Ho_Chi_Minh' ||
    manifest.exceptionLogging !== 'STACKDRIVER'
  ) {
    throw new Error('appsscript.json không thỏa runtime V8, Asia/Ho_Chi_Minh và STACKDRIVER.');
  }

  if (manifest.webapp?.executeAs !== 'USER_DEPLOYING' || manifest.webapp?.access !== 'ANYONE_ANONYMOUS') {
    throw new Error('appsscript.json không có cấu hình Web App public chạy bằng tài khoản triển khai.');
  }

  for (const filename of requiredFiles) {
    const content = readFileSync(path.join(artifactDirectory, filename), 'utf8');
    if (/\b(scriptId|client_secret|refresh_token)\b/i.test(content)) {
      throw new Error(`Artifact chứa dữ liệu nhạy cảm trong ${filename}.`);
    }
  }
}

function hasExternalAssetReference(html) {
  return /<script\b[^>]*\bsrc\s*=/i.test(html) || /<link\b[^>]*\bhref\s*=/i.test(html) || /(?:\/|\.\/)?assets\//i.test(html);
}

const isDirectExecution = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  try {
    verifyArtifact(path.join(repositoryRoot, 'dist'));
    console.log('Artifact Apps Script hợp lệ.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Không thể kiểm tra artifact Apps Script.');
    process.exit(1);
  }
}
