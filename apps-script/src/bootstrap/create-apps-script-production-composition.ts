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
  });
}
