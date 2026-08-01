import type { RuntimeConfigDTO } from '../infrastructure/google-workspace/runtime-config-store';
import { createPropertiesCredentialVerifierStore } from '../infrastructure/google-workspace/credential-verifier-store';
import { createPropertiesRuntimeConfigStore } from '../infrastructure/google-workspace/runtime-config-store';
import { createSheetGateway } from '../infrastructure/google-workspace/sheet-gateway';
import { createActiveRuntimeTableLocator } from '../infrastructure/google-workspace/runtime-table-locator';
import type { OperationsRepository } from '../repositories/operations/operations-repository';
import type { AdministrationRepository } from '../repositories/platform/administration-repository';
import type { ReportingRepository } from '../repositories/reporting/reporting-repository';
import { ensureCurrentDashboardBaselineProjections } from '../services/reporting/dashboard-baseline-projection';
import { createProductionRepositories } from './create-production-repositories';
import { createPlatformTableDefinitions } from '../services/platform/registry/table-registry';
import {
  getScheduledWorkerTriggerStatus,
  installScheduledWorkerTrigger,
  removeScheduledWorkerTriggers,
  type ScheduledWorkerTriggerInstallResult,
  type ScheduledWorkerTriggerRemoveResult,
  type ScheduledWorkerTriggerStatusResult,
} from '../infrastructure/google-workspace/scheduled-worker-trigger-manager';
import { runBackupChunk } from '../services/operations/backup-restore-worker';
import { runImportCommitChunk } from '../services/operations/import-commit-worker';
import { runArchiveChunk } from '../services/operations/archive-worker';
import { runReportingExportChunk } from '../services/reporting/reporting-export-worker';
import {
  runScheduledWorkerTick,
  type ScheduledWorkerTickResult,
} from '../services/platform/worker/scheduled-worker-runtime';

export interface ProductionScheduledWorkerTickDependencies {
  repository: OperationsRepository;
  administrationRepository?: AdministrationRepository;
  reportingRepository?: ReportingRepository;
  tenantId: string;
  appVersion: string;
  schemaVersion: number;
  now: () => Date;
  newId(prefix: string): string;
}

export function runProductionScheduledWorkerTick(
  deps: ProductionScheduledWorkerTickDependencies,
): ScheduledWorkerTickResult {
  const businessDate = deps.now().toISOString().slice(0, 10);

  return runScheduledWorkerTick({
    repository: deps.repository,
    now: deps.now,
    jobs: [
      ...(
        deps.reportingRepository === undefined || deps.administrationRepository === undefined
          ? []
          : [
              {
                runId: `scheduled-reporting-projection-baseline-${businessDate}`,
                jobType: 'ReportProjection' as const,
                execute(checkpoint: (checkpointKey: string) => void) {
                  const result = ensureCurrentDashboardBaselineProjections({
                    repository: deps.reportingRepository!,
                    tenantId: deps.tenantId,
                    branches: deps.administrationRepository!.listBranches(),
                    warehouses: deps.administrationRepository!.listWarehouses(),
                    now: deps.now,
                  });
                  checkpoint(`dashboard-baseline:${result.dateBucket}:created:${result.createdCount}:checked:${result.checkedCount}`);
                },
              },
            ]
      ),
      ...(
        deps.reportingRepository === undefined
          ? []
          : [
              {
                runId: 'scheduled-reporting-export',
                jobType: 'Export' as const,
                execute(checkpoint: (checkpointKey: string) => void) {
                  const result = runReportingExportChunk({
                    repository: deps.reportingRepository!,
                    now: deps.now,
                    newFileId: (run) => `export-file-${run.runId}`,
                    maxRuns: 20,
                  });
                  if (result.checkpointKey !== undefined) {
                    checkpoint(result.checkpointKey);
                    return;
                  }
                  checkpoint('export:no-pending');
                },
              },
            ]
      ),
      {
        runId: 'scheduled-import-commit',
        jobType: 'Import',
        execute(checkpoint) {
          const batch = deps.repository
            .listImportBatches()
            .find((candidate) => candidate.status === 'Committing' && candidate.selectionMode !== undefined);
          if (batch === undefined || batch.selectionMode === undefined) {
            checkpoint('import:no-pending');
            return;
          }
          const result = runImportCommitChunk({
            repository: deps.repository,
            now: deps.now,
            newId: deps.newId,
            batchId: batch.batchId,
            selectionMode: batch.selectionMode,
            maxRows: 100,
          });
          checkpoint(result.checkpointKey);
        },
      },
      {
        runId: 'scheduled-archive-transaction',
        jobType: 'Archive',
        execute(checkpoint) {
          const result = runArchiveChunk({
            repository: deps.repository,
            now: deps.now,
            storageRole: 'transaction',
            maxPartitions: 1,
          });
          if (result.checkpointKey !== undefined) {
            checkpoint(result.checkpointKey);
            return;
          }
          checkpoint('archive:no-pending');
        },
      },
      {
        runId: 'scheduled-health-check',
        jobType: 'HealthCheck',
        execute(checkpoint) {
          deps.repository.saveHealthCheck({
            checkId: deps.newId('health'),
            checkType: 'ScheduledWorker',
            status: 'Ok',
            observedAt: deps.now().toISOString(),
            resourceKey: 'scheduled-worker',
            message: 'Scheduled worker tick completed.',
          });
          checkpoint('health:done');
        },
      },
      {
        runId: `scheduled-backup-daily-${businessDate}`,
        jobType: 'Backup',
        execute(checkpoint) {
          runBackupChunk(
            {
              repository: deps.repository,
              tenantId: deps.tenantId,
              appVersion: deps.appVersion,
              schemaVersion: deps.schemaVersion,
              now: deps.now,
              newId: deps.newId,
            },
            {
              backupType: 'Daily',
              requestedBy: 'system-worker',
            },
          );
          checkpoint('backup:done');
        },
      },
    ],
  });
}

export function runAppsScriptScheduledWorker(): ScheduledWorkerTickResult {
  const properties = PropertiesService.getScriptProperties();
  const runtimeConfigStore = createPropertiesRuntimeConfigStore({ properties });
  const runtimeConfig = runtimeConfigStore.getActiveConfig();
  if (runtimeConfig === undefined) {
    throw new Error('Missing active runtime config.');
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
  });
  let sequence = 0;

  return runProductionScheduledWorkerTick({
    repository: repositories.operationsRepository,
    administrationRepository: repositories.administrationRepository,
    reportingRepository: repositories.reportingRepository,
    tenantId: runtimeConfig.tenantId,
    appVersion: runtimeConfig.appVersion,
    schemaVersion: runtimeConfig.schemaVersion,
    now: () => new Date(),
    newId(prefix) {
      sequence += 1;
      return `${prefix}-${Date.now()}-${sequence}`;
    },
  });
}

export function installScheduledWorkerTriggerForAppsScript_(): ScheduledWorkerTriggerInstallResult {
  return installScheduledWorkerTrigger({ scriptApp: ScriptApp });
}

export function removeScheduledWorkerTriggersForAppsScript_(): ScheduledWorkerTriggerRemoveResult {
  return removeScheduledWorkerTriggers({ scriptApp: ScriptApp });
}

export function getScheduledWorkerTriggerStatusForAppsScript_(): ScheduledWorkerTriggerStatusResult {
  return getScheduledWorkerTriggerStatus({ scriptApp: ScriptApp });
}

export type { RuntimeConfigDTO };
