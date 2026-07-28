import type { Clock } from '../api/invoke';
import { createAppsScriptLockProvider } from '../infrastructure/google-workspace/apps-script-lock-provider';
import { createPropertiesCredentialVerifierStore } from '../infrastructure/google-workspace/credential-verifier-store';
import { createPropertiesRuntimeConfigStore } from '../infrastructure/google-workspace/runtime-config-store';
import { createSheetGateway } from '../infrastructure/google-workspace/sheet-gateway';
import { createActiveRuntimeTableLocator } from '../infrastructure/google-workspace/runtime-table-locator';
import { createProductionApiComposition } from './create-production-api-composition';

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
  });

  return createProductionApiComposition({
    clock,
    runtimeConfigStore: {
      getActiveConfig: () => runtimeConfig,
      saveActiveConfig: (config) => runtimeConfigStore.saveActiveConfig(config),
    },
    sheetGateway,
    credentialVerifierStore: createPropertiesCredentialVerifierStore({ properties }),
    lockProvider: createAppsScriptLockProvider({
      lockService: LockService,
      spreadsheetApp: SpreadsheetApp,
      waitTimeoutMs: 3000,
    }),
  });
}
