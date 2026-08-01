import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { RuntimeConfigDTO } from './runtime-config-store';
import type { SheetGatewayTableLocator, SheetLocation } from './sheet-gateway';

export function createActiveRuntimeTableLocator(config: RuntimeConfigDTO): SheetGatewayTableLocator {
  return ({ table, partitionKey }) => ({
    spreadsheetId: resolveSpreadsheetId(config, table, partitionKey),
    sheetName: table.sheetName,
  });
}

function resolveSpreadsheetId(
  config: RuntimeConfigDTO,
  table: TableDefinitionDTO,
  partitionKey: string | undefined,
): SheetLocation['spreadsheetId'] {
  if (table.storageRole === 'core') return config.storage.core.spreadsheetId;
  if (table.storageRole === 'runtime') return config.storage.runtime.spreadsheetId;
  if (table.storageRole === 'transaction') {
    const activePartitionKey = config.storage.transaction.activePartitionKey;
    if (partitionKey !== undefined && partitionKey !== activePartitionKey) {
      throw new Error(`Unsupported non-active transaction partition: ${partitionKey}`);
    }
    return config.storage.transaction.spreadsheetId;
  }

  throw new Error(`Unsupported storage role: ${table.storageRole}`);
}
