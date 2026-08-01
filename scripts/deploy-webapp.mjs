import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function buildClaspDeployArgs({ deploymentId, description, versionNumber }) {
  const args = ['clasp', 'deploy'];

  if (versionNumber !== undefined && versionNumber !== null) {
    args.push('--versionNumber', String(versionNumber));
  }

  args.push('--description', description);

  if (deploymentId !== undefined && deploymentId !== null && deploymentId.trim() !== '') {
    args.push('--deploymentId', deploymentId.trim());
  }

  return args;
}

export function buildWebAppUrl(deploymentId) {
  return `https://script.google.com/macros/s/${deploymentId}/exec`;
}

export function parseClaspDeploymentOutput(output) {
  const deploymentId = output.match(/\bAKfy[a-zA-Z0-9_-]+\b/)?.[0];

  if (!deploymentId) {
    return {
      deploymentId: undefined,
      webAppUrl: undefined,
    };
  }

  return {
    deploymentId,
    webAppUrl: buildWebAppUrl(deploymentId),
  };
}

export function parseClaspVersionOutput(output) {
  const match =
    output.match(/\bCreated version\s+(\d+)\b/i) ??
    output.match(/\bVersion\s+(\d+)\b/i) ??
    output.match(/[@#]\s*(\d+)\b/);

  if (!match?.[1]) {
    return undefined;
  }

  return Number.parseInt(match[1], 10);
}

export function parseDeployWebAppOptions(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

    if (argument === '--deploymentId') {
      options.deploymentId = requireOptionValue(argument, nextValue);
      index += 1;
      continue;
    }

    if (argument === '--description') {
      options.description = requireOptionValue(argument, nextValue);
      index += 1;
      continue;
    }

    throw new Error(`Tham số không hỗ trợ: ${argument}`);
  }

  return options;
}

export function validateLocalClaspConfig(rootDir) {
  const claspConfigPath = path.join(rootDir, '.clasp.json');

  if (!existsSync(claspConfigPath)) {
    throw new Error(
      'Thiếu .clasp.json cục bộ. Tạo file này từ .clasp.json.example, thêm scriptId của Apps Script project đích và chạy lại. Không commit file này.',
    );
  }

  let claspConfig;
  try {
    claspConfig = JSON.parse(readFileSync(claspConfigPath, 'utf8'));
  } catch (error) {
    throw new Error(`.clasp.json cục bộ không hợp lệ: ${error.message}`);
  }

  if (typeof claspConfig?.scriptId !== 'string' || claspConfig.scriptId.trim() === '') {
    throw new Error('.clasp.json cục bộ phải có scriptId của Apps Script project đích.');
  }

  if (claspConfig.rootDir !== './dist') {
    throw new Error("rootDir: './dist' là bắt buộc để chỉ deploy artifact build trong dist/.");
  }

  return {
    scriptId: claspConfig.scriptId.trim(),
  };
}

async function main() {
  let options;
  try {
    options = parseDeployWebAppOptions(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  let claspConfig;
  try {
    claspConfig = validateLocalClaspConfig(repositoryRoot);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const description = options.description ?? createDefaultDescription();
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  const verifyResult = spawnSync('npm', ['run', 'verify'], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  if (verifyResult.status !== 0) {
    process.exit(verifyResult.status ?? 1);
  }

  const pushResult = spawnSync(npxCommand, ['clasp', 'push', '--force'], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  if (pushResult.status !== 0) {
    process.exit(pushResult.status ?? 1);
  }

  const versionResult = spawnSync(npxCommand, ['clasp', 'version', description], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  writeSanitizedOutput(versionResult, claspConfig.scriptId);
  if (versionResult.status !== 0) {
    process.exit(versionResult.status ?? 1);
  }

  const versionNumber = parseClaspVersionOutput(`${versionResult.stdout}\n${versionResult.stderr}`);
  if (versionNumber === undefined) {
    console.error('Không đọc được version number từ clasp version output. Dừng để tránh deploy nhầm version.');
    process.exit(1);
  }

  const deployArgs = buildClaspDeployArgs({
    deploymentId: options.deploymentId,
    description,
    versionNumber,
  });
  const deployResult = spawnSync(npxCommand, deployArgs, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  writeSanitizedOutput(deployResult, claspConfig.scriptId);
  if (deployResult.status !== 0) {
    process.exit(deployResult.status ?? 1);
  }

  const parsedDeployment = parseClaspDeploymentOutput(`${deployResult.stdout}\n${deployResult.stderr}`);
  const deploymentId = options.deploymentId ?? parsedDeployment.deploymentId;

  if (!deploymentId) {
    console.log(
      'Đã deploy nhưng không parse được deploymentId từ clasp output. Chạy `npx clasp deployments` hoặc mở Apps Script UI để lấy Web App URL.',
    );
    return;
  }

  console.log('');
  console.log(`Deployment ID: ${deploymentId}`);
  console.log(`Web App URL: ${buildWebAppUrl(deploymentId)}`);
  console.log('');
  console.log('Nếu URL chưa mở được, kiểm tra OAuth authorization và Web App access trong Apps Script deployment.');
}

function createDefaultDescription() {
  const packageJson = JSON.parse(readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  return `sales-management ${packageJson.version} ${timestamp}`;
}

function requireOptionValue(optionName, value) {
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Thiếu giá trị cho ${optionName}.`);
  }

  return value;
}

function writeSanitizedOutput(result, scriptId) {
  const stdout = sanitizeSensitiveOutput(result.stdout ?? '', scriptId);
  const stderr = sanitizeSensitiveOutput(result.stderr ?? '', scriptId);

  if (stdout) {
    process.stdout.write(stdout);
  }

  if (stderr) {
    process.stderr.write(stderr);
  }
}

function sanitizeSensitiveOutput(output, scriptId) {
  if (!scriptId) {
    return output;
  }

  return output.split(scriptId).join('<SCRIPT_ID_LOCAL>');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
