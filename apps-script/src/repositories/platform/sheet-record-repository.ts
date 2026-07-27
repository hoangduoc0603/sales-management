import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';

export interface AppendOnlySheetRecordGateway {
  readTable(request: { table: TableDefinitionDTO; partitionKey?: string }): Record<string, unknown>[];
  appendRows(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    rows: readonly Record<string, unknown>[];
  }): { appendedRowCount: number };
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

  return {
    list() {
      return readAll();
    },
    findById(id) {
      const record = readAll().find((current) => String(current[primaryKey]) === id);
      return record === undefined ? undefined : deepClone(record);
    },
    append(record) {
      const primaryKeyValue = record[primaryKey];
      if (primaryKeyValue === undefined || primaryKeyValue === null || String(primaryKeyValue).trim() === '') {
        throw new Error(`MissingPrimaryKey:${deps.table.tableName}.${primaryKey}`);
      }

      const primaryKeyText = String(primaryKeyValue);
      if (readAll().some((current) => String(current[primaryKey]) === primaryKeyText)) {
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
