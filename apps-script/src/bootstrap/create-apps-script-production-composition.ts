import type { Clock } from '../api/invoke';
import { createAppsScriptLockProvider } from '../infrastructure/google-workspace/apps-script-lock-provider';
import { createPropertiesCredentialVerifierStore } from '../infrastructure/google-workspace/credential-verifier-store';
import { createPropertiesRuntimeConfigStore } from '../infrastructure/google-workspace/runtime-config-store';
import { createSheetGateway, type GoogleSheetsAdvancedService } from '../infrastructure/google-workspace/sheet-gateway';
import { createActiveRuntimeTableLocator } from '../infrastructure/google-workspace/runtime-table-locator';
import { createAppsScriptLoginRateLimiter } from '../infrastructure/google-workspace/login-rate-limiter';
import { createAppsScriptCacheStore } from '../infrastructure/google-workspace/cache-store';
import { createPropertiesTenantSecretStore } from '../infrastructure/google-workspace/tenant-secret-store';
import { createAppsScriptSessionTokenFingerprinter } from '../services/platform/auth/session-token-fingerprinter';
import { createDriveGateway } from '../infrastructure/google-workspace/drive-gateway';
import { createProductionApiComposition } from './create-production-api-composition';

declare const Sheets: GoogleSheetsAdvancedService;

export function createAppsScriptProductionComposition(clock: Clock) {
  const properties = PropertiesService.getScriptProperties();
  const runtimeConfigStore = createPropertiesRuntimeConfigStore({ properties });
  const runtimeConfig = runtimeConfigStore.getActiveConfig();
  if (runtimeConfig === undefined) {
    throw new Error('Missing active runtime config.');
  }
  const sheetGateway = createSheetGateway({
    spreadsheetApp: SpreadsheetApp,
    tableLocator: createActiveRuntimeTableLocator(runtimeConfig),
    sheetsAdvancedService: Sheets,
    deferAppends: true,
  });
  const tenantSecretStore = createPropertiesTenantSecretStore({ properties });
  const platformCacheStore = createAppsScriptCacheStore({ cacheService: CacheService });
  const driveGateway = createDriveGateway({
    driveApp: DriveApp,
    utilities: {
      base64Decode: (value) => Utilities.base64Decode(value),
      base64Encode: (data) => Utilities.base64Encode(data),
      newBlob: (data, mimeType, fileName) => Utilities.newBlob(data, mimeType, fileName),
    },
  });
  const attachmentFolderId = runtimeConfig.driveFolders?.attachments.id ?? runtimeConfig.driveRootFolderId;

  return createProductionApiComposition({
    clock,
    runtimeConfigStore: {
      getActiveConfig: () => runtimeConfig,
      saveActiveConfig: (config) => runtimeConfigStore.saveActiveConfig(config),
    },
    sheetGateway,
    credentialVerifierStore: createPropertiesCredentialVerifierStore({ properties }),
    platformCacheStore,
    tenantSecretStore,
    loginRateLimiter: createAppsScriptLoginRateLimiter({ cacheService: CacheService }),
    tokenFingerprinter: createAppsScriptSessionTokenFingerprinter({
      getPepper: () => tenantSecretStore.getOrCreateSessionPepper(),
    }),
    idGenerator: {
      newId(prefix) {
        return `${prefix}-${Utilities.getUuid()}`;
      },
    },
    lockProvider: createAppsScriptLockProvider({
      lockService: LockService,
      spreadsheetApp: SpreadsheetApp,
      waitTimeoutMs: 3000,
    }),
    attachmentStorage: {
      savePrivateAttachment(input) {
        const stored = driveGateway.savePrivateAttachment({
          folderId: attachmentFolderId,
          fileName: input.fileName,
          mimeType: input.mimeType,
          contentBase64: input.contentBase64,
        });
        return { driveFileId: stored.driveFileId };
      },
      readPrivateAttachment(input) {
        return driveGateway.readPrivateAttachment({ driveFileId: input.driveFileId });
      },
      trashPrivateAttachment(input) {
        driveGateway.trashPrivateAttachment({ driveFileId: input.driveFileId });
      },
    },
  });
}
