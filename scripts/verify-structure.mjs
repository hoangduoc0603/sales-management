import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredPaths = [
  'README.md',
  '.gitignore',
  '.clasp.json.example',
  'package.json',
  'tsconfig.web.json',
  'tsconfig.apps-script.json',
  'vite.config.ts',
  'vitest.config.ts',
  'eslint.config.mjs',
  'index.html',
  '.agents/skills/product-discovery-prd/SKILL.md',
  '.agents/skills/solution-system-design/SKILL.md',
  '.agents/skills/detailed-low-level-design/SKILL.md',
  'apps-script/appsscript.json',
  '.clasp.json.example',
  'apps-script/src/api/.gitkeep',
  'apps-script/src/services/.gitkeep',
  'apps-script/src/repositories/.gitkeep',
  'apps-script/src/infrastructure/.gitkeep',
  'apps-script/src/bootstrap/.gitkeep',
  'web/src/app/.gitkeep',
  'web/src/features/.gitkeep',
  'web/src/components/.gitkeep',
  'web/src/hooks/.gitkeep',
  'web/src/lib/.gitkeep',
  'web/src/styles/.gitkeep',
  'web/public/.gitkeep',
  'shared/contracts/.gitkeep',
  'shared/schemas/.gitkeep',
  'shared/types/.gitkeep',
  'shared/constants/.gitkeep',
  'docs/architecture/README.md',
  'docs/architecture/folder-structure.md',
  'docs/data-model/README.md',
  'docs/decisions/README.md',
  'docs/design/README.md',
  'docs/design/design-system.md',
  'docs/design/open-design-registry.md',
  'docs/design/implementation-rules.md',
  'docs/design/screens/sales-dashboard.md',
  'docs/product/PRD.md',
  'docs/product/srs/overview.md',
  'docs/product/srs/sales-orders.md',
  'docs/product/srs/inventory.md',
  'docs/product/srs/purchasing.md',
  'docs/product/srs/customers-promotions.md',
  'docs/product/srs/finance.md',
  'docs/product/srs/access-reporting.md',
  'scripts/verify-structure.mjs',
  'scripts/bootstrap-default.mjs',
  'scripts/build.mjs',
  'scripts/deploy-push.mjs',
  'scripts/deploy-test.mjs',
  'scripts/deploy-webapp.mjs',
  'scripts/verify-apps-script-artifact.mjs',
  'tests/.gitkeep',
];

const missingPaths = requiredPaths.filter((relativePath) => !existsSync(path.join(repositoryRoot, relativePath)));

if (missingPaths.length > 0) {
  console.error(`Thiếu đường dẫn bắt buộc:\n${missingPaths.map((relativePath) => `- ${relativePath}`).join('\n')}`);
  process.exit(1);
}

const invalidFilePaths = requiredPaths.filter((relativePath) => !statSync(path.join(repositoryRoot, relativePath)).isFile());

if (invalidFilePaths.length > 0) {
  console.error(`Đường dẫn bắt buộc phải là tệp thường, không phải thư mục hoặc loại khác:\n${invalidFilePaths.map((relativePath) => `- ${relativePath}`).join('\n')}`);
  process.exit(1);
}

const manifestPath = path.join(repositoryRoot, 'apps-script/appsscript.json');
let manifest;

try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (error) {
  console.error(`Manifest Apps Script không hợp lệ: ${error.message}`);
  process.exit(1);
}

if (manifest.timeZone !== 'Asia/Ho_Chi_Minh') {
  console.error('Manifest Apps Script phải đặt timeZone là Asia/Ho_Chi_Minh.');
  process.exit(1);
}

if (manifest.runtimeVersion !== 'V8') {
  console.error('Manifest Apps Script phải đặt runtimeVersion là V8.');
  process.exit(1);
}

if (manifest.exceptionLogging !== 'STACKDRIVER') {
  console.error('Manifest Apps Script phải đặt exceptionLogging là STACKDRIVER.');
  process.exit(1);
}

if (manifest.webapp?.executeAs !== 'USER_DEPLOYING' || manifest.webapp?.access !== 'ANYONE_ANONYMOUS') {
  console.error('Manifest Apps Script phải cấu hình Web App public chạy bằng tài khoản triển khai.');
  process.exit(1);
}

const requiredOauthScopes = [
  'https://www.googleapis.com/auth/script.storage',
  'https://www.googleapis.com/auth/script.scriptapp',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];
if (!Array.isArray(manifest.oauthScopes) || requiredOauthScopes.some((scope) => !manifest.oauthScopes.includes(scope))) {
  console.error('Manifest Apps Script phải khai báo OAuth scopes cho Properties/Drive/Sheets.');
  process.exit(1);
}

const claspExamplePath = path.join(repositoryRoot, '.clasp.json.example');
let claspExample;

try {
  claspExample = JSON.parse(readFileSync(claspExamplePath, 'utf8'));
} catch (error) {
  console.error(`Tệp ví dụ cấu hình clasp không hợp lệ: ${error.message}`);
  process.exit(1);
}

if (claspExample === null || typeof claspExample !== 'object' || Array.isArray(claspExample)) {
  console.error("Tệp .clasp.json.example phải là object chỉ chứa rootDir: './dist'.");
  process.exit(1);
}

const claspExampleKeys = Object.keys(claspExample);
if (claspExampleKeys.length !== 1 || claspExampleKeys[0] !== 'rootDir' || claspExample.rootDir !== './dist') {
  console.error('Tệp .clasp.json.example chỉ được có rootDir với giá trị ./dist.');
  process.exit(1);
}

const gitignoreLines = readFileSync(path.join(repositoryRoot, '.gitignore'), 'utf8').split(/\r?\n/);
if (!gitignoreLines.includes('/.clasp.json')) {
  console.error('`.gitignore` phải loại trừ root `.clasp.json`.');
  process.exit(1);
}

console.log('Cấu trúc thư mục base hợp lệ.');
