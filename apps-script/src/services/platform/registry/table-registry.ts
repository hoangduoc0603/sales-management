import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import {
  createStaticTableRegistryRepository,
  type TableRegistryRepository,
} from '../../../repositories/platform/table-registry-repository';

export type HeaderMap = Record<string, number>;

export type MigrationPlan =
  | {
      action: 'none';
      missingHeaders: readonly string[];
    }
  | {
      action: 'createTable' | 'appendColumns';
      missingHeaders: readonly string[];
    };

export interface TableRegistryService {
  getDefinitions(): readonly TableDefinitionDTO[];
  createHeaderMap(tableName: string, actualHeaders: readonly string[]): HeaderMap;
  planMigration(tableName: string, actualHeaders: readonly string[]): MigrationPlan;
}

export function createTableRegistryService(repository: TableRegistryRepository): TableRegistryService {
  return {
    getDefinitions() {
      return repository.listDefinitions();
    },
    createHeaderMap(_tableName, actualHeaders) {
      return Object.fromEntries(actualHeaders.map((header, index) => [header, index]));
    },
    planMigration(tableName, actualHeaders) {
      const definition = findDefinition(repository, tableName);
      const missingHeaders = definition.headers
        .map((header) => header.name)
        .filter((header) => !actualHeaders.includes(header));

      if (actualHeaders.length === 0) {
        return { action: 'createTable', missingHeaders };
      }

      if (missingHeaders.length > 0) {
        return { action: 'appendColumns', missingHeaders };
      }

      return { action: 'none', missingHeaders: [] };
    },
  };
}

export function createTableRegistryServiceForTest(): TableRegistryService {
  return createTableRegistryService(createStaticTableRegistryRepository(createPlatformTableDefinitions()));
}

export function createPlatformTableDefinitions(): readonly TableDefinitionDTO[] {
  return [
    table('CommandTransaction', 'transaction', 'ledger', 'transaction-period', [
      'id',
      'commandId',
      'idempotencyKey',
      'status',
      'createdAt',
      'updatedAt',
      'resultJson',
    ]),
    table('AuditOutbox', 'transaction', 'audit', 'transaction-period', [
      'id',
      'eventId',
      'commandId',
      'actorId',
      'action',
      'status',
      'createdAt',
    ]),
    table('Session', 'runtime', 'runtime', 'none', [
      'id',
      'tokenFingerprint',
      'userId',
      'authVersion',
      'issuedAt',
      'idleExpiresAt',
      'absoluteExpiresAt',
      'revokedAt',
    ]),
    table('UserAccount', 'core', 'master', 'none', [
      'id',
      'loginId',
      'displayName',
      'tenantId',
      'authVersion',
      'disabled',
      'passwordChangeRequired',
    ]),
    table('RolePermission', 'core', 'master', 'none', ['id', 'roleId', 'action', 'tenantId']),
    table('UserScope', 'core', 'master', 'none', [
      'id',
      'userId',
      'tenantId',
      'branchId',
      'warehouseId',
    ]),
    table('SchemaMigration', 'core', 'runtime', 'none', [
      'id',
      'migrationId',
      'tableName',
      'fromVersion',
      'toVersion',
      'status',
      'createdAt',
    ]),
    table('PartitionRegistry', 'core', 'runtime', 'none', [
      'id',
      'storageRole',
      'partitionKey',
      'spreadsheetId',
      'status',
      'activeFrom',
      'closedAt',
    ]),
  ];
}

function table(
  tableName: string,
  storageRole: TableDefinitionDTO['storageRole'],
  lifecycle: TableDefinitionDTO['lifecycle'],
  partitionPolicy: TableDefinitionDTO['partitionPolicy'],
  headers: readonly string[],
): TableDefinitionDTO {
  return {
    tableName,
    owner: 'platform',
    storageRole,
    sheetName: tableName,
    lifecycle,
    schemaVersion: 1,
    primaryKey: 'id',
    headers: headers.map((name) => ({
      name,
      type: name.endsWith('Json') ? 'json' : name.endsWith('At') ? 'timestamp' : 'string',
      required: name !== 'revokedAt' && name !== 'closedAt' && name !== 'resultJson',
    })),
    partitionPolicy,
    lookupKeys: [{ name: `${tableName}.primary`, columns: ['id'], unique: true }],
  };
}

function findDefinition(
  repository: TableRegistryRepository,
  tableName: string,
): TableDefinitionDTO {
  const definition = repository.listDefinitions().find((candidate) => candidate.tableName === tableName);

  if (definition === undefined) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  return definition;
}
