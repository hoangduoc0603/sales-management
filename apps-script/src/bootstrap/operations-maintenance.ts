import type { BackupResponse, HealthCheckResponse } from '@shared/contracts/operations/operations';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import { createPropertiesCredentialVerifierStore } from '../infrastructure/google-workspace/credential-verifier-store';
import { createPropertiesRuntimeConfigStore } from '../infrastructure/google-workspace/runtime-config-store';
import { createSheetGateway } from '../infrastructure/google-workspace/sheet-gateway';
import { createActiveRuntimeTableLocator } from '../infrastructure/google-workspace/runtime-table-locator';
import { createOperationsService } from '../services/operations/operations-service';
import { createPlatformTableDefinitions } from '../services/platform/registry/table-registry';
import { createProductionRepositories } from './create-production-repositories';

export interface OperationsMaintenanceHealthCheckResult {
  status: HealthCheckResponse['status'];
  checks: HealthCheckResponse['checks'];
  capacityAlerts: HealthCheckResponse['capacityAlerts'];
}

export interface OperationsMaintenanceBackupResult {
  backup: BackupResponse['backup'];
}

export function runHealthCheckForAppsScript_(): OperationsMaintenanceHealthCheckResult {
  const context = createOperationsMaintenanceContext_();
  const result = context.operationsService.checkHealth({
    actor: context.actor,
    request: { includeIntegrity: true },
  });

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  const response = {
    status: result.data.status,
    checks: result.data.checks,
    capacityAlerts: result.data.capacityAlerts,
  };
  logMaintenanceResult_('operations.health.check', response);
  return response;
}

export function requestManualBackupForAppsScript_(): OperationsMaintenanceBackupResult {
  const context = createOperationsMaintenanceContext_();
  const suffix = String(Date.now());
  const result = context.operationsService.requestBackup({
    actor: context.actor,
    request: {
      backupType: 'Manual',
      commandId: `cmd-owner-manual-backup-${suffix}`,
      idempotencyKey: `idem-owner-manual-backup-${suffix}`,
    },
  });

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  const response = { backup: result.data.backup };
  logMaintenanceResult_('operations.backup.request', {
    backupRunId: response.backup.backupRunId,
    status: response.backup.status,
    backupType: response.backup.backupType,
    requestedAt: response.backup.requestedAt,
    completedAt: response.backup.completedAt,
    checksum: response.backup.manifest.checksum,
    partitionCount: response.backup.manifest.partitions.length,
    resourceCount: response.backup.manifest.resources.length,
  });
  return response;
}

function createOperationsMaintenanceContext_() {
  const properties = PropertiesService.getScriptProperties();
  const runtimeConfig = createPropertiesRuntimeConfigStore({ properties }).getActiveConfig();
  if (runtimeConfig === undefined) {
    throw new Error('Missing active runtime config. Run first-run setup before operations maintenance.');
  }

  const tableDefinitions = createPlatformTableDefinitions();
  const repositories = createProductionRepositories({
    sheetGateway: createSheetGateway({
      spreadsheetApp: SpreadsheetApp,
      tableLocator: createActiveRuntimeTableLocator(runtimeConfig),
    }),
    tableDefinitions,
    transactionPartitionKey: runtimeConfig.storage.transaction.activePartitionKey,
    auditPartitionKey: runtimeConfig.storage.audit.activePartitionKey,
    credentialVerifierStore: createPropertiesCredentialVerifierStore({ properties }),
  });

  let sequence = 0;
  const operationsService = createOperationsService({
    repository: repositories.operationsRepository,
    auditOutboxRepository: repositories.auditOutboxRepository,
    tenantId: runtimeConfig.tenantId,
    appVersion: runtimeConfig.appVersion,
    schemaVersion: runtimeConfig.schemaVersion,
    now: () => new Date(),
    newId(prefix) {
      sequence += 1;
      return `${prefix}-${Date.now()}-${sequence}`;
    },
  });

  return {
    actor: createOwnerMaintenanceActor_(runtimeConfig.tenantId),
    operationsService,
  };
}

function createOwnerMaintenanceActor_(tenantId: string): ActorContextDTO {
  return {
    userId: 'apps-script-owner',
    loginId: 'apps-script-owner',
    displayName: 'Apps Script Owner',
    tenantId,
    authVersion: 1,
    actions: [
      'operations.health.view',
      'operations.backup.manage',
    ],
    scope: {
      tenantId,
      branchIds: ['*'],
      warehouseIds: ['*'],
    },
  };
}

function logMaintenanceResult_(operation: string, data: unknown): void {
  console.log(JSON.stringify({
    operation,
    ok: true,
    data,
  }));
}
