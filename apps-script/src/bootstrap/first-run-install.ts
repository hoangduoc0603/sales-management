import type { ApiMeta, ApiRequest, ApiResult } from '@shared/contracts/api';
import type { ApiErrorCode } from '@shared/contracts/errors';
import type {
  InstallRunRequest,
  InstallRunResponse,
  InstallStatus,
  InstallStatusResponse,
} from '@shared/contracts/platform/install';
import { parseApiRequest } from '@shared/schemas/api';
import { parseInstallRunRequest } from '@shared/schemas/platform/install';
import { ZodError } from 'zod';
import { createAppsScriptLockProvider } from '../infrastructure/google-workspace/apps-script-lock-provider';
import { createPropertiesCredentialVerifierStore } from '../infrastructure/google-workspace/credential-verifier-store';
import {
  createPropertiesRuntimeConfigStore,
  type RuntimeConfigDTO,
} from '../infrastructure/google-workspace/runtime-config-store';
import { createDriveGateway } from '../infrastructure/google-workspace/drive-gateway';
import { createActiveRuntimeTableLocator } from '../infrastructure/google-workspace/runtime-table-locator';
import { createSheetGateway } from '../infrastructure/google-workspace/sheet-gateway';
import { createPropertiesTenantSecretStore } from '../infrastructure/google-workspace/tenant-secret-store';
import { createAppsScriptSessionTokenFingerprinter } from '../services/platform/auth/session-token-fingerprinter';
import { createProductionApiComposition } from './create-production-api-composition';

const appVersion = '0.1.0';
const schemaVersion = 1;
const installStatusKey = 'salesManagement.install.status';
const installStartedAtKey = 'salesManagement.install.startedAt';
const installCompletedAtKey = 'salesManagement.install.completedAt';
const installLastErrorKey = 'salesManagement.install.lastError';
const installTenantDisplayNameKey = 'salesManagement.install.tenantDisplayName';
const installDraftRuntimeConfigKey = 'salesManagement.install.draftRuntimeConfig';
const requiredInstallScopes = [
  'https://www.googleapis.com/auth/script.storage',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];

export function isFirstRunInstallOperation(request: unknown): boolean {
  return (
    typeof request === 'object' &&
    request !== null &&
    'operation' in request &&
    (request.operation === 'platform.install.getStatus' || request.operation === 'platform.install.run')
  );
}

export function invokeFirstRunInstallForAppsScript_(request: unknown): ApiResult<unknown> {
  const startedAt = new Date();

  try {
    const apiRequest = parseApiRequest(request);

    if (apiRequest.operation === 'platform.install.getStatus') {
      return success(getInstallStatus(), apiRequest, startedAt);
    }

    if (apiRequest.operation === 'platform.install.run') {
      const payload = parseInstallRunRequest(apiRequest.payload);
      return success(runInstall(payload), apiRequest, startedAt);
    }

    return error('OPERATION_NOT_SUPPORTED', 'Thao tác chưa được hỗ trợ.', request, startedAt);
  } catch (caught) {
    if (caught instanceof ZodError) {
      return error('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', request, startedAt);
    }

    return error(
      'INTERNAL_ERROR',
      caught instanceof Error ? sanitizeErrorMessage(caught.message) : 'Có lỗi hệ thống.',
      request,
      startedAt,
    );
  }
}

function getInstallStatus(): InstallStatusResponse {
  const properties = PropertiesService.getScriptProperties();
  const runtimeConfig = createPropertiesRuntimeConfigStore({ properties }).getActiveConfig();

  if (runtimeConfig !== undefined) {
    return {
      status: 'Installed',
      installed: true,
      canRetry: false,
      appVersion: runtimeConfig.appVersion,
      schemaVersion: runtimeConfig.schemaVersion,
      tenantDisplayName: properties.getProperty(installTenantDisplayNameKey) ?? undefined,
      startedAt: properties.getProperty(installStartedAtKey) ?? undefined,
      completedAt: properties.getProperty(installCompletedAtKey) ?? undefined,
    };
  }

  const status = readInstallStatus(properties.getProperty(installStatusKey));
  return {
    status,
    installed: false,
    canRetry: status === 'NotInstalled' || status === 'Failed',
    appVersion,
    schemaVersion,
    tenantDisplayName: properties.getProperty(installTenantDisplayNameKey) ?? undefined,
    startedAt: properties.getProperty(installStartedAtKey) ?? undefined,
    completedAt: properties.getProperty(installCompletedAtKey) ?? undefined,
    lastErrorMessage: properties.getProperty(installLastErrorKey) ?? undefined,
  };
}

function runInstall(input: InstallRunRequest): InstallRunResponse {
  requireInstallScopes();

  const lock = LockService.getScriptLock();
  lock.waitLock(30_000);

  try {
    const properties = PropertiesService.getScriptProperties();
    const runtimeConfigStore = createPropertiesRuntimeConfigStore({ properties });
    const existingConfig = runtimeConfigStore.getActiveConfig();

    if (existingConfig !== undefined) {
      return installedResponse({
        tenantDisplayName: properties.getProperty(installTenantDisplayNameKey) ?? input.tenantDisplayName,
        adminLoginId: input.adminLoginId,
      });
    }

    properties.setProperty(installStatusKey, 'Installing');
    properties.setProperty(installStartedAtKey, new Date().toISOString());
    properties.setProperty(installTenantDisplayNameKey, input.tenantDisplayName);

    try {
      const runtimeConfig = readDraftRuntimeConfig(properties) ?? createInitialRuntimeConfig(input.tenantDisplayName, new Date());
      properties.setProperty(installDraftRuntimeConfigKey, JSON.stringify(runtimeConfig));
      const bootstrap = invokeBootstrap(runtimeConfig, input);

      if (!bootstrap.ok) {
        throw new Error(bootstrap.error.message);
      }

      runtimeConfigStore.saveActiveConfig(runtimeConfig);
      properties.setProperty(installStatusKey, 'Installed');
      properties.setProperty(installCompletedAtKey, new Date().toISOString());
      properties.setProperty(installLastErrorKey, '');
      properties.setProperty(installDraftRuntimeConfigKey, '');

      return installedResponse({
        tenantDisplayName: input.tenantDisplayName,
        adminLoginId: input.adminLoginId,
      });
    } catch (caught) {
      properties.setProperty(installStatusKey, 'Failed');
      properties.setProperty(
        installLastErrorKey,
        caught instanceof Error ? sanitizeErrorMessage(caught.message) : 'Không thể khởi tạo hệ thống.',
      );
      throw caught;
    }
  } finally {
    lock.releaseLock();
  }
}

function requireInstallScopes(): void {
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, requiredInstallScopes);
}

function invokeBootstrap(
  runtimeConfig: RuntimeConfigDTO,
  input: InstallRunRequest,
): ApiResult<unknown> {
  const properties = PropertiesService.getScriptProperties();
  const sheetGateway = createSheetGateway({
    spreadsheetApp: SpreadsheetApp,
    tableLocator: createActiveRuntimeTableLocator(runtimeConfig),
  });
  const tenantSecretStore = createPropertiesTenantSecretStore({ properties });
  const composition = createProductionApiComposition({
    clock: { now: () => new Date() },
    runtimeConfigStore: {
      getActiveConfig: () => runtimeConfig,
      saveActiveConfig: (config) => createPropertiesRuntimeConfigStore({ properties }).saveActiveConfig(config),
    },
    sheetGateway,
    credentialVerifierStore: createPropertiesCredentialVerifierStore({ properties }),
    tenantSecretStore,
    tokenFingerprinter: createAppsScriptSessionTokenFingerprinter({
      getPepper: () => tenantSecretStore.getOrCreateSessionPepper(),
    }),
    lockProvider: createAppsScriptLockProvider({
      lockService: LockService,
      spreadsheetApp: SpreadsheetApp,
      waitTimeoutMs: 3000,
    }),
  });

  return composition.invoke({
    operation: 'platform.bootstrap.install',
    requestId: `install-bootstrap-${Date.now()}`,
    payload: {
      tenantDisplayName: input.tenantDisplayName,
      adminLoginId: input.adminLoginId,
      temporaryPassword: input.adminPassword,
      adminPasswordChangeRequired: false,
    },
  });
}

function createInitialRuntimeConfig(tenantDisplayName: string, now: Date): RuntimeConfigDTO {
  const folders = createDriveGateway({ driveApp: DriveApp }).createTenantFolders({ businessName: tenantDisplayName });
  const databaseFolders = Object.fromEntries(folders.database.children.map((folder) => [folder.name, folder.id]));
  const coreSpreadsheet = createSpreadsheetInFolder('Core Data', databaseFolders['Core Data']);
  const runtimeSpreadsheet = createSpreadsheetInFolder('Runtime Data', databaseFolders['Runtime Data']);
  const transactionSpreadsheet = createSpreadsheetInFolder(
    `Transaction Data ${toTransactionPartitionKey(now)}`,
    databaseFolders['Transaction Data'],
  );
  const auditSpreadsheet = createSpreadsheetInFolder(
    `Audit Data ${toAuditPartitionKey(now)}`,
    databaseFolders['Audit Data'],
  );

  return {
    tenantId: 'tenant-default',
    appVersion,
    schemaVersion,
    driveRootFolderId: folders.root.id,
    storage: {
      core: { spreadsheetId: coreSpreadsheet.getId() },
      runtime: { spreadsheetId: runtimeSpreadsheet.getId() },
      transaction: {
        activePartitionKey: toTransactionPartitionKey(now),
        spreadsheetId: transactionSpreadsheet.getId(),
      },
      audit: {
        activePartitionKey: toAuditPartitionKey(now),
        spreadsheetId: auditSpreadsheet.getId(),
      },
    },
    maintenanceMode: false,
  };
}

function readDraftRuntimeConfig(
  properties: GoogleAppsScript.Properties.Properties,
): RuntimeConfigDTO | undefined {
  const serialized = properties.getProperty(installDraftRuntimeConfigKey);

  if (!serialized) {
    return undefined;
  }

  try {
    return JSON.parse(serialized) as RuntimeConfigDTO;
  } catch {
    return undefined;
  }
}

function createSpreadsheetInFolder(name: string, folderId: string | undefined): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const spreadsheet = SpreadsheetApp.create(name);

  if (folderId !== undefined) {
    DriveApp.getFileById(spreadsheet.getId()).moveTo(DriveApp.getFolderById(folderId));
  }

  return spreadsheet;
}

function installedResponse(input: { tenantDisplayName: string; adminLoginId: string }): InstallRunResponse {
  return {
    status: 'Installed',
    installed: true,
    tenantDisplayName: input.tenantDisplayName,
    adminLoginId: input.adminLoginId,
    branchName: 'Chi nhánh mặc định',
    warehouseName: 'Kho mặc định',
  };
}

function readInstallStatus(value: string | null): InstallStatus {
  if (value === 'Installing' || value === 'Installed' || value === 'Failed') {
    return value;
  }

  return 'NotInstalled';
}

function toTransactionPartitionKey(now: Date): string {
  return `FY${now.getFullYear()}-P${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toAuditPartitionKey(now: Date): string {
  return `AUDIT-${now.toISOString().slice(0, 7)}`;
}

function success<T>(data: T, request: ApiRequest, startedAt: Date): ApiResult<T> {
  return {
    ok: true,
    data,
    meta: createMeta(request.requestId, request.operation, startedAt),
  };
}

function error(
  code: ApiErrorCode,
  message: string,
  request: unknown,
  startedAt: Date,
): ApiResult<never> {
  return {
    ok: false,
    error: { code, message },
    meta: createMeta(readRequestId(request, startedAt), readOperation(request), startedAt),
  };
}

function createMeta(requestId: string, operation: string, startedAt: Date): ApiMeta {
  return {
    requestId,
    operation,
    serverTime: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    stages: {},
    io: {},
  };
}

function readRequestId(request: unknown, startedAt: Date): string {
  if (isRecord(request) && typeof request.requestId === 'string' && request.requestId.trim() !== '') {
    return request.requestId.trim();
  }

  return `install-error-${startedAt.getTime()}`;
}

function readOperation(request: unknown): string {
  if (isRecord(request) && typeof request.operation === 'string' && request.operation.trim() !== '') {
    return request.operation.trim();
  }

  return 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeErrorMessage(message: string): string {
  return message.replace(/(password|token|secret)[^,\n]*/gi, '$1:<hidden>');
}
