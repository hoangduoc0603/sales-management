import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';

export interface AppendOnlySheetRecordGateway {
  readTable(request: { table: TableDefinitionDTO; partitionKey?: string }): Record<string, unknown>[];
  findRowsByColumn?(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    columnName: string;
    value: string;
  }): Record<string, unknown>[];
  appendRows(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    rows: readonly Record<string, unknown>[];
  }): { appendedRowCount: number };
  flushPendingAppends?(): void;
}

export interface AppendOnlySheetRecordRepository<TRecord extends Record<string, unknown>> {
  list(): TRecord[];
  findById(id: string): TRecord | undefined;
  append(record: TRecord): void;
}

export interface AppendOnlySheetRecordRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  partitionKey?: string;
}

export function createAppendOnlySheetRecordRepository<TRecord extends Record<string, unknown>>(
  deps: AppendOnlySheetRecordRepositoryDependencies,
): AppendOnlySheetRecordRepository<TRecord> {
  const primaryKey = deps.table.primaryKey;

  function readAll(): TRecord[] {
    return deps.gateway
      .readTable({ table: deps.table, partitionKey: deps.partitionKey })
      .map((record) => deepClone(record) as TRecord);
  }

  function findByColumn(columnName: string, value: string): TRecord[] {
    const rows =
      deps.gateway.findRowsByColumn?.({
        table: deps.table,
        partitionKey: deps.partitionKey,
        columnName,
        value,
      }) ?? deps.gateway.readTable({ table: deps.table, partitionKey: deps.partitionKey });
    return rows
      .filter((record) => String(record[columnName] ?? '') === value)
      .map((record) => deepClone(record) as TRecord);
  }

  return {
    list() {
      return readAll();
    },
    findById(id) {
      const record = findByColumn(primaryKey, id)[0];
      return record === undefined ? undefined : deepClone(record);
    },
    append(record) {
      const primaryKeyValue = record[primaryKey];
      if (primaryKeyValue === undefined || primaryKeyValue === null || String(primaryKeyValue).trim() === '') {
        throw new Error(`MissingPrimaryKey:${deps.table.tableName}.${primaryKey}`);
      }

      const primaryKeyText = String(primaryKeyValue);
      if (findByColumn(primaryKey, primaryKeyText).length > 0) {
        throw new Error(`DuplicatePrimaryKey:${deps.table.tableName}.${primaryKey}:${primaryKeyText}`);
      }

      deps.gateway.appendRows({
        table: deps.table,
        partitionKey: deps.partitionKey,
        rows: [deepClone(record)],
      });
    },
  };
}

function deepClone<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}
