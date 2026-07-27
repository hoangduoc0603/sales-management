import type {
  BackupManifestDTO,
  BackupRunDTO,
  BackupType,
  HealthStatus,
  RestoreRunDTO,
} from '@shared/contracts/operations/operations';
import type { OperationsRepository } from '../../repositories/operations/operations-repository';

export interface BackupRestoreWorkerDependencies {
  repository: Pick<
    OperationsRepository,
    'listPartitions' | 'saveBackup' | 'listBackups' | 'replaceBackups' | 'getBackup' | 'saveRestore' | 'getRestore'
  >;
  tenantId: string;
  appVersion: string;
  schemaVersion: number;
  now: () => Date;
  newId(prefix: string): string;
}

export function runBackupChunk(
  deps: BackupRestoreWorkerDependencies,
  input: {
    backupType: BackupType;
    requestedBy: string;
    dailyRetentionLimit?: number;
  },
): BackupRunDTO {
  const generatedAt = deps.now().toISOString();
  const partitions = deps.repository.listPartitions().map((partition) => ({
    storageRole: partition.storageRole,
    partitionKey: partition.partitionKey,
    status: partition.status,
    rowCount: partition.rowCount,
  }));
  const resources = [
    {
      resourceKey: 'runtime-config',
      resourceId: `runtime-config-${deps.tenantId}`,
      checksum: `checksum-runtime-config-${deps.schemaVersion}`,
    },
  ];
  const manifestWithoutChecksum = {
    appVersion: deps.appVersion,
    schemaVersion: deps.schemaVersion,
    generatedAt,
    partitions,
    resources,
  };
  const manifest: BackupManifestDTO = {
    ...manifestWithoutChecksum,
    checksum: stableChecksum(manifestWithoutChecksum),
  };
  const backup: BackupRunDTO = {
    backupRunId: deps.newId('backup'),
    status: 'Completed',
    backupType: input.backupType,
    requestedBy: input.requestedBy,
    requestedAt: generatedAt,
    completedAt: generatedAt,
    manifest,
  };

  deps.repository.saveBackup(backup);
  applyDailyRetention(deps.repository, input.dailyRetentionLimit ?? 30);

  return backup;
}

export function runRestoreVerification(
  deps: BackupRestoreWorkerDependencies,
  input: {
    backupRunId: string;
    requestedBy: string;
  },
): RestoreRunDTO {
  const backup = deps.repository.getBackup(input.backupRunId);
  if (backup === undefined || backup.status !== 'Completed') {
    throw new Error('BackupNotRestorable');
  }

  const expectedChecksum = stableChecksum({
    appVersion: backup.manifest.appVersion,
    schemaVersion: backup.manifest.schemaVersion,
    generatedAt: backup.manifest.generatedAt,
    partitions: backup.manifest.partitions,
    resources: backup.manifest.resources,
  });
  if (backup.manifest.checksum !== expectedChecksum) {
    throw new Error('BackupChecksumMismatch');
  }

  const restore: RestoreRunDTO = {
    restoreRunId: deps.newId('restore'),
    backupRunId: backup.backupRunId,
    status: 'Prepared',
    requestedBy: input.requestedBy,
    preparedAt: deps.now().toISOString(),
    oldConfigVersion: 'runtime-config-current',
    newConfigVersion: `runtime-config-replacement-${lastSegment(backup.backupRunId)}`,
    healthResult: 'Ok',
    writeFrozen: true,
  };
  deps.repository.saveRestore(restore);

  return restore;
}

export function switchRestore(
  deps: BackupRestoreWorkerDependencies,
  input: {
    restoreRunId: string;
    healthResult: HealthStatus;
  },
): RestoreRunDTO {
  const restore = deps.repository.getRestore(input.restoreRunId);
  if (restore === undefined || restore.status !== 'Prepared') {
    throw new Error('RestoreNotPrepared');
  }
  if (input.healthResult !== 'Ok') {
    throw new Error('RestoreHealthCheckFailed');
  }

  const switched: RestoreRunDTO = {
    ...restore,
    status: 'Switched',
    switchedAt: deps.now().toISOString(),
    healthResult: 'Ok',
    writeFrozen: false,
  };
  deps.repository.saveRestore(switched);

  return switched;
}

function applyDailyRetention(
  repository: Pick<OperationsRepository, 'listBackups' | 'replaceBackups'>,
  dailyRetentionLimit: number,
): void {
  const backups = repository.listBackups();
  const dailyBackups = backups
    .filter((backup) => backup.backupType === 'Daily')
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
  const retainedDailyIds = new Set(
    dailyBackups.slice(0, dailyRetentionLimit).map((backup) => backup.backupRunId),
  );
  repository.replaceBackups(
    backups.filter((backup) => backup.backupType !== 'Daily' || retainedDailyIds.has(backup.backupRunId)),
  );
}

function stableChecksum(input: unknown): string {
  const text = JSON.stringify(input, Object.keys(flatten(input)).sort());
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return `checksum-${hash.toString(16)}`;
}

function flatten(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    result[key] = value;
    Object.assign(result, flatten(value));
  }

  return result;
}

function lastSegment(value: string): string {
  const parts = value.split('-');
  return parts[parts.length - 1] ?? value;
}
