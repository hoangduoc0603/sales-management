export type BoundedContext =
  | 'platform'
  | 'catalog'
  | 'crm'
  | 'sales'
  | 'inventory'
  | 'purchasing'
  | 'finance'
  | 'reporting'
  | 'operations';

export type StorageRole = 'core' | 'runtime' | 'transaction' | 'audit';

export type TableLifecycle =
  | 'master'
  | 'runtime'
  | 'document'
  | 'ledger'
  | 'projection'
  | 'audit';

export type PartitionPolicy = 'none' | 'transaction-period' | 'audit-period';

export type ColumnType = 'string' | 'integer' | 'boolean' | 'timestamp' | 'enum' | 'json';

export interface ColumnDefinitionDTO {
  name: string;
  type: ColumnType;
  required: boolean;
}

export interface LookupKeyDefinitionDTO {
  name: string;
  columns: readonly string[];
  unique: boolean;
}

export interface TableDefinitionDTO {
  tableName: string;
  owner: BoundedContext;
  storageRole: StorageRole;
  sheetName: string;
  lifecycle: TableLifecycle;
  schemaVersion: number;
  primaryKey: string;
  headers: readonly ColumnDefinitionDTO[];
  partitionPolicy: PartitionPolicy;
  lookupKeys: readonly LookupKeyDefinitionDTO[];
}

export interface TableDefinitionsResponse {
  tables: readonly TableDefinitionDTO[];
}
