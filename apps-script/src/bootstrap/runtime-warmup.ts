import { createPropertiesCredentialVerifierStore } from '../infrastructure/google-workspace/credential-verifier-store';
import { createPropertiesRuntimeConfigStore } from '../infrastructure/google-workspace/runtime-config-store';
import { createSheetGateway } from '../infrastructure/google-workspace/sheet-gateway';
import { createActiveRuntimeTableLocator } from '../infrastructure/google-workspace/runtime-table-locator';
import { createAppsScriptCacheStore } from '../infrastructure/google-workspace/cache-store';
import {
  getWarmupTriggerStatus,
  installWarmupTrigger,
  removeWarmupTriggers,
  type WarmupTriggerInstallResult,
  type WarmupTriggerRemoveResult,
  type WarmupTriggerStatusResult,
} from '../infrastructure/google-workspace/warmup-trigger-manager';
import { createPlatformTableDefinitions } from '../services/platform/registry/table-registry';
import { warmRuntime, type RuntimeWarmupResult } from '../services/platform/runtime/runtime-warmup';
import { createProductionRepositories } from './create-production-repositories';

const warmupLastStartedAtKey = 'salesManagement.warmup.lastStartedAt';
const warmupLastCompletedAtKey = 'salesManagement.warmup.lastCompletedAt';
const warmupLastDurationMsKey = 'salesManagement.warmup.lastDurationMs';
const warmupLastStatusKey = 'salesManagement.warmup.lastStatus';
const warmupLastErrorKey = 'salesManagement.warmup.lastError';

export interface RuntimeWarmupStatusForAppsScriptResponse extends WarmupTriggerStatusResult {
  lastStartedAt?: string;
  lastCompletedAt?: string;
  lastDurationMs?: number;
  lastStatus?: string;
  lastError?: string;
}

export function warmRuntimeForAppsScript_(): RuntimeWarmupResult {
  const properties = PropertiesService.getScriptProperties();
  const startedAt = new Date();
  properties.setProperty(warmupLastStartedAtKey, startedAt.toISOString());

  try {
    const runtimeConfigStore = createPropertiesRuntimeConfigStore({ properties });
    const runtimeConfig = runtimeConfigStore.getActiveConfig();

    if (runtimeConfig === undefined) {
      return persistWarmupResult(
        properties,
        warmRuntime({
          now: () => new Date(),
          nowMs: () => Date.now(),
        }),
      );
    }

    const tableDefinitions = createPlatformTableDefinitions();
    const repositories = createProductionRepositories({
      sheetGateway: createSheetGateway({
        spreadsheetApp: SpreadsheetApp,
        tableLocator: createActiveRuntimeTableLocator(runtimeConfig),
      }),
      tableDefinitions,
      transactionPartitionKey: runtimeConfig.storage.transaction.activePartitionKey,
      credentialVerifierStore: createPropertiesCredentialVerifierStore({ properties }),
      platformCacheStore: createAppsScriptCacheStore({ cacheService: CacheService }),
    });

    return persistWarmupResult(
      properties,
      warmRuntime({
        runtimeConfig,
        authRepository: repositories.authRepository,
        administrationRepository: repositories.administrationRepository,
        now: () => new Date(),
        nowMs: () => Date.now(),
        maxDurationMs: 1500,
      }),
    );
  } catch (caught) {
    const completedAt = new Date();
    return persistWarmupResult(properties, {
      status: 'Failed',
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
      reason: sanitizeErrorMessage(caught),
      warmed: {
        userProfile: false,
        tenant: false,
        branches: 0,
        warehouses: 0,
      },
    });
  }
}

export function installWarmupTriggerForAppsScript_(): WarmupTriggerInstallResult {
  return installWarmupTrigger({ scriptApp: ScriptApp });
}

export function removeWarmupTriggersForAppsScript_(): WarmupTriggerRemoveResult {
  return removeWarmupTriggers({ scriptApp: ScriptApp });
}

export function getWarmupTriggerStatusForAppsScript_(): RuntimeWarmupStatusForAppsScriptResponse {
  const properties = PropertiesService.getScriptProperties();
  const lastDurationMs = properties.getProperty(warmupLastDurationMsKey);

  return {
    ...getWarmupTriggerStatus({ scriptApp: ScriptApp }),
    lastStartedAt: readOptionalProperty(properties, warmupLastStartedAtKey),
    lastCompletedAt: readOptionalProperty(properties, warmupLastCompletedAtKey),
    lastDurationMs: lastDurationMs === null ? undefined : Number(lastDurationMs),
    lastStatus: readOptionalProperty(properties, warmupLastStatusKey),
    lastError: readOptionalProperty(properties, warmupLastErrorKey),
  };
}

function persistWarmupResult(
  properties: GoogleAppsScript.Properties.Properties,
  result: RuntimeWarmupResult,
): RuntimeWarmupResult {
  properties.setProperty(warmupLastCompletedAtKey, result.completedAt);
  properties.setProperty(warmupLastDurationMsKey, String(result.durationMs));
  properties.setProperty(warmupLastStatusKey, result.status);
  if (result.reason !== undefined && result.status === 'Failed') {
    properties.setProperty(warmupLastErrorKey, result.reason);
  }
  return result;
}

function readOptionalProperty(
  properties: GoogleAppsScript.Properties.Properties,
  key: string,
): string | undefined {
  return properties.getProperty(key) ?? undefined;
}

function sanitizeErrorMessage(caught: unknown): string {
  const raw = caught instanceof Error ? caught.message : String(caught);
  return raw
    .replace(/(password|token|secret|verifier|pepper)[^,\n]*/gi, '$1:<hidden>')
    .slice(0, 500);
}
