import type { ApiResult } from '@shared/contracts/api';
import type { BootstrapInstallResponse } from '@shared/contracts/platform/bootstrap';
import type { RuntimeConfigDTO } from '../infrastructure/google-workspace/runtime-config-store';
import { createAppsScriptLockProvider } from '../infrastructure/google-workspace/apps-script-lock-provider';
import { createPropertiesCredentialVerifierStore } from '../infrastructure/google-workspace/credential-verifier-store';
import { createDriveGateway } from '../infrastructure/google-workspace/drive-gateway';
import { createPropertiesRuntimeConfigStore } from '../infrastructure/google-workspace/runtime-config-store';
import { createActiveRuntimeTableLocator } from '../infrastructure/google-workspace/runtime-table-locator';
import { createSheetGateway } from '../infrastructure/google-workspace/sheet-gateway';
import { createProductionApiComposition } from './create-production-api-composition';

export interface InstallDefaultTenantRequest {
  tenantDisplayName?: string;
  adminLoginId?: string;
  temporaryPassword?: string;
}

export interface InstallDefaultTenantResponse {
  installed: boolean;
  alreadyInstalled: boolean;
  runtimeConfig: RuntimeConfigDTO;
  bootstrap: ApiResult<BootstrapInstallResponse>;
}

export function installDefaultTenantForAppsScript_(
  request: InstallDefaultTenantRequest = {},
): InstallDefaultTenantResponse {
  const properties = PropertiesService.getScriptProperties();
  const runtimeConfigStore = createPropertiesRuntimeConfigStore({ properties });
  const existingConfig = runtimeConfigStore.getActiveConfig();

  if (existingConfig !== undefined) {
    return {
      installed: true,
      alreadyInstalled: true,
      runtimeConfig: existingConfig,
      bootstrap: invokeBootstrap(existingConfig, request),
    };
  }

  const tenantDisplayName = request.tenantDisplayName ?? 'Cửa hàng mặc định';
  const runtimeConfig = createInitialRuntimeConfig(tenantDisplayName, new Date());
  runtimeConfigStore.saveActiveConfig(runtimeConfig);

  return {
    installed: true,
    alreadyInstalled: false,
    runtimeConfig,
    bootstrap: invokeBootstrap(runtimeConfig, request),
  };
}

function invokeBootstrap(
  runtimeConfig: RuntimeConfigDTO,
  request: InstallDefaultTenantRequest,
): ApiResult<BootstrapInstallResponse> {
  const properties = PropertiesService.getScriptProperties();
  const sheetGateway = createSheetGateway({
    spreadsheetApp: SpreadsheetApp,
    tableLocator: createActiveRuntimeTableLocator(runtimeConfig),
  });
  const composition = createProductionApiComposition({
    clock: {
      now: () => new Date(),
    },
    runtimeConfigStore: {
      getActiveConfig: () => runtimeConfig,
      saveActiveConfig: (config) => createPropertiesRuntimeConfigStore({ properties }).saveActiveConfig(config),
    },
    sheetGateway,
    credentialVerifierStore: createPropertiesCredentialVerifierStore({ properties }),
    lockProvider: createAppsScriptLockProvider({
      lockService: LockService,
      spreadsheetApp: SpreadsheetApp,
      waitTimeoutMs: 3000,
    }),
  });

  return composition.invoke({
    operation: 'platform.bootstrap.install',
    requestId: `bootstrap-${Date.now()}`,
    payload: {
      tenantDisplayName: request.tenantDisplayName ?? 'Cửa hàng mặc định',
      adminLoginId: request.adminLoginId ?? 'admin',
      temporaryPassword: request.temporaryPassword ?? 'admin123',
    },
  }) as ApiResult<BootstrapInstallResponse>;
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
    appVersion: '0.1.0',
    schemaVersion: 1,
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

function createSpreadsheetInFolder(name: string, folderId: string | undefined): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const spreadsheet = SpreadsheetApp.create(name);

  if (folderId !== undefined) {
    DriveApp.getFileById(spreadsheet.getId()).moveTo(DriveApp.getFolderById(folderId));
  }

  return spreadsheet;
}

function toTransactionPartitionKey(now: Date): string {
  return `FY${now.getFullYear()}-P${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toAuditPartitionKey(now: Date): string {
  return `AUDIT-${now.toISOString().slice(0, 7)}`;
}
