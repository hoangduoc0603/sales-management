import { describe, expect, it } from 'vitest';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import { createAppendOnlySheetRecordRepository } from '../../../apps-script/src/repositories/platform/sheet-record-repository';

interface AppendRecord {
  recordId: string;
  tenantId: string;
  action: string;
  payloadJson: {
    schemaVersion: number;
    source: string;
  };
}

describe('append-only Sheet record repository', () => {
  it('reads typed records through SheetGateway and returns defensive copies', () => {
    const gateway = new FakeSheetRecordGateway<AppendRecord>([
      {
        recordId: 'record-1',
        tenantId: 'tenant-1',
        action: 'Login',
        payloadJson: { schemaVersion: 1, source: 'auth' },
      },
    ]);
    const repository = createAppendOnlySheetRecordRepository<AppendRecord>({
      gateway,
      table: appendOnlyTable,
      partitionKey: 'FY2026-P01',
    });

    const records = repository.list();
    records[0]!.payloadJson.source = 'mutated';

    expect(repository.findById('record-1')).toEqual({
      recordId: 'record-1',
      tenantId: 'tenant-1',
      action: 'Login',
      payloadJson: { schemaVersion: 1, source: 'auth' },
    });
    expect(gateway.readRequests).toContainEqual({ tableName: 'AppendOnlyRecord', partitionKey: 'FY2026-P01' });
  });

  it('appends records by table registry metadata and rejects duplicate primary keys', () => {
    const gateway = new FakeSheetRecordGateway<AppendRecord>([
      {
        recordId: 'record-1',
        tenantId: 'tenant-1',
        action: 'Login',
        payloadJson: { schemaVersion: 1, source: 'auth' },
      },
    ]);
    const repository = createAppendOnlySheetRecordRepository<AppendRecord>({
      gateway,
      table: appendOnlyTable,
      partitionKey: 'FY2026-P01',
    });

    repository.append({
      recordId: 'record-2',
      tenantId: 'tenant-1',
      action: 'CheckoutCommitted',
      payloadJson: { schemaVersion: 1, source: 'sales' },
    });

    expect(gateway.appendRequests).toEqual([
      {
        tableName: 'AppendOnlyRecord',
        partitionKey: 'FY2026-P01',
        rows: [
          {
            recordId: 'record-2',
            tenantId: 'tenant-1',
            action: 'CheckoutCommitted',
            payloadJson: { schemaVersion: 1, source: 'sales' },
          },
        ],
      },
    ]);
    expect(() =>
      repository.append({
        recordId: 'record-2',
        tenantId: 'tenant-1',
        action: 'Duplicate',
        payloadJson: { schemaVersion: 1, source: 'test' },
      }),
    ).toThrow(/DuplicatePrimaryKey:AppendOnlyRecord.recordId/);
    expect(gateway.appendRequests).toHaveLength(1);
  });

  it('uses narrow primary-key lookup instead of full table read before appending when gateway supports it', () => {
    const gateway = new FakeSheetRecordGateway<AppendRecord>([], { supportFindRowsByColumn: true });
    const repository = createAppendOnlySheetRecordRepository<AppendRecord>({
      gateway,
      table: appendOnlyTable,
      partitionKey: 'FY2026-P01',
    });

    repository.append({
      recordId: 'record-fast-1',
      tenantId: 'tenant-1',
      action: 'CheckoutCommitted',
      payloadJson: { schemaVersion: 1, source: 'sales' },
    });

    expect(gateway.readRequests).toEqual([]);
    expect(gateway.findRequests).toEqual([
      {
        tableName: 'AppendOnlyRecord',
        partitionKey: 'FY2026-P01',
        columnName: 'recordId',
        value: 'record-fast-1',
      },
    ]);
    expect(gateway.appendRequests).toHaveLength(1);
  });

  it('rejects records without the registry primary key before touching Sheets', () => {
    const gateway = new FakeSheetRecordGateway<Record<string, unknown>>([]);
    const repository = createAppendOnlySheetRecordRepository<Record<string, unknown>>({
      gateway,
      table: appendOnlyTable,
      partitionKey: 'FY2026-P01',
    });

    expect(() => repository.append({ tenantId: 'tenant-1' })).toThrow(/MissingPrimaryKey:AppendOnlyRecord.recordId/);
    expect(gateway.appendRequests).toEqual([]);
  });
});

const appendOnlyTable: TableDefinitionDTO = {
  tableName: 'AppendOnlyRecord',
  owner: 'operations',
  storageRole: 'transaction',
  sheetName: 'AppendOnlyRecord',
  lifecycle: 'document',
  schemaVersion: 1,
  primaryKey: 'recordId',
  headers: [
    { name: 'recordId', type: 'string', required: true },
    { name: 'tenantId', type: 'string', required: true },
    { name: 'action', type: 'enum', required: true },
    { name: 'payloadJson', type: 'json', required: false },
  ],
  partitionPolicy: 'transaction-period',
  lookupKeys: [{ name: 'AppendOnlyRecord.primary', columns: ['recordId'], unique: true }],
};

class FakeSheetRecordGateway<T extends Record<string, unknown>> {
  readonly readRequests: Array<{ tableName: string; partitionKey?: string }> = [];
  readonly findRequests: Array<{
    tableName: string;
    partitionKey?: string;
    columnName: string;
    value: string;
  }> = [];
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: T[] }> = [];

  constructor(
    private readonly records: T[],
    private readonly options: { supportFindRowsByColumn?: boolean } = {},
  ) {}

  readTable(request: { table: TableDefinitionDTO; partitionKey?: string }): T[] {
    this.readRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey });
    return this.records.map(clone);
  }

  findRowsByColumn(
    request: { table: TableDefinitionDTO; partitionKey?: string; columnName: string; value: string },
  ): T[] {
    if (this.options.supportFindRowsByColumn !== true) {
      return this.readTable(request).filter((record) => String(record[request.columnName] ?? '') === request.value);
    }
    this.findRequests.push({
      tableName: request.table.tableName,
      partitionKey: request.partitionKey,
      columnName: request.columnName,
      value: request.value,
    });
    return this.records.filter((record) => String(record[request.columnName] ?? '') === request.value).map(clone);
  }

  appendRows(request: { table: TableDefinitionDTO; partitionKey?: string; rows: readonly T[] }): { appendedRowCount: number } {
    const rows = request.rows.map(clone);
    this.appendRequests.push({
      tableName: request.table.tableName,
      partitionKey: request.partitionKey,
      rows,
    });
    this.records.push(...rows);
    return { appendedRowCount: rows.length };
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
