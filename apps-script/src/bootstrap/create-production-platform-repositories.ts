import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import {
  createSheetAuditOutboxRepository,
  type AuditOutboxRepository,
} from '../repositories/platform/audit-outbox-repository';
import {
  createSheetCommandRepository,
  type CommandRepository,
} from '../repositories/platform/command-repository';
import type { AppendOnlySheetRecordGateway } from '../repositories/platform/sheet-record-repository';

export interface ProductionPlatformRepositories {
  commandRepository: CommandRepository;
  auditOutboxRepository: AuditOutboxRepository;
}

export interface ProductionPlatformRepositoryDependencies {
  sheetGateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  transactionPartitionKey: string;
}

export function createProductionPlatformRepositories(
  deps: ProductionPlatformRepositoryDependencies,
): ProductionPlatformRepositories {
  const commandTable = findRequiredTable(deps.tableDefinitions, 'CommandTransaction');
  const auditOutboxTable = findRequiredTable(deps.tableDefinitions, 'AuditOutbox');

  return {
    commandRepository: createSheetCommandRepository({
      gateway: deps.sheetGateway,
      table: commandTable,
      partitionKey: deps.transactionPartitionKey,
    }),
    auditOutboxRepository: createSheetAuditOutboxRepository({
      gateway: deps.sheetGateway,
      table: auditOutboxTable,
      partitionKey: deps.transactionPartitionKey,
    }),
  };
}

function findRequiredTable(
  definitions: readonly TableDefinitionDTO[],
  tableName: string,
): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) {
    throw new Error(`Missing platform table definition: ${tableName}`);
  }
  return table;
}
