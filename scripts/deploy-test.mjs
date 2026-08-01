import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateLocalClaspConfig } from './deploy-webapp.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function buildTestWebAppUrl(deploymentId) {
  return `https://script.google.com/macros/s/${deploymentId}/dev`;
}

export function findTestDeploymentIdFromDeployments(deployments) {
  if (!Array.isArray(deployments)) {
    return undefined;
  }

  return deployments.find((deployment) => {
    return (
      deployment !== null &&
      typeof deployment === 'object' &&
      typeof deployment.deploymentId === 'string' &&
      deployment.deploymentId.trim() !== '' &&
      (deployment.versionNumber === undefined || deployment.versionNumber === null)
    );
  })?.deploymentId;
}

async function main() {
  try {
    validateLocalClaspConfig(repositoryRoot);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const verifyResult = spawnSync('npm', ['run', 'verify'], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  if (verifyResult.status !== 0) {
    process.exit(verifyResult.status ?? 1);
  }

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const pushResult = spawnSync(npxCommand, ['clasp', 'push', '--force'], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  if (pushResult.status !== 0) {
    process.exit(pushResult.status ?? 1);
  }

  const deploymentsResult = spawnSync(npxCommand, ['clasp', 'deployments', '--json'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  if (deploymentsResult.status !== 0) {
    process.stdout.write(deploymentsResult.stdout ?? '');
    process.stderr.write(deploymentsResult.stderr ?? '');
    process.exit(deploymentsResult.status ?? 1);
  }

  let deployments;
  try {
    deployments = JSON.parse(deploymentsResult.stdout);
  } catch (error) {
    console.error(`Không đọc được danh sách deployments từ clasp: ${error.message}`);
    process.exit(1);
  }

  const testDeploymentId = findTestDeploymentIdFromDeployments(deployments);
  if (!testDeploymentId) {
    console.error('Không tìm thấy HEAD/test deployment ID để tạo URL /dev.');
    console.error('Mở Apps Script UI > Deploy > Test deployments để lấy Web App URL /dev, hoặc tạo test deployment trước rồi chạy lại.');
    process.exit(1);
  }

  console.log('');
  console.log('Đã push code mới nhất lên Apps Script để test qua /dev.');
  console.log(`Test Web App URL: ${buildTestWebAppUrl(testDeploymentId)}`);
  console.log('');
  console.log('Lệnh này không tạo Apps Script version và không cập nhật deployment /exec.');
  console.log('Lưu ý: URL /dev là test deployment, thường chỉ truy cập được bởi editor của Apps Script project.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
