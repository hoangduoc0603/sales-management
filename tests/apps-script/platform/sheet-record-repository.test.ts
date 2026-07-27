import { describe, expect, it } from 'vitest';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import { createAppendOnlySheetRecordRepository } from '../../../apps-script/src/repositories/platform/sheet-record-repository';

interface AuditRecord {
  auditId: string;
  tenantId: string;
  action: string;
  payloadJson: {
    schemaVersion: number;
    source: string;
  };
}

describe('append-only Sheet record repository', () => {
  it('reads typed records through SheetGateway and returns defensive copies', () => {
    const gateway = new FakeSheetRecordGateway<AuditRecord>([
      {
        auditId: 'audit-1',
        tenantId: 'tenant-1',
        action: 'Login',
        payloadJson: { schemaVersion: 1, source: 'auth' },
      },
    ]);
    const repository = createAppendOnlySheetRecordRepository<AuditRecord>({
      gateway,
      table: auditTable,
      partitionKey: 'FY2026-P01',
    });

    const records = repository.list();
    records[0]!.payloadJson.source = 'mutated';

    expect(repository.findById('audit-1')).toEqual({
      auditId: 'audit-1',
      tenantId: 'tenant-1',
      action: 'Login',
      payloadJson: { schemaVersion: 1, source: 'auth' },
    });
    expect(gateway.readRequests).toContainEqual({ tableName: 'AuditLog', partitionKey: 'FY2026-P01' });
  });

  it('appends records by table registry metadata and rejects duplicate primary keys', () => {
    const gateway = new FakeSheetRecordGateway<AuditRecord>([
      {
        auditId: 'audit-1',
        tenantId: 'tenant-1',
        action: 'Login',
        payloadJson: { schemaVersion: 1, source: 'auth' },
      },
    ]);
    const repository = createAppendOnlySheetRecordRepository<AuditRecord>({
      gateway,
      table: auditTable,
      partitionKey: 'FY2026-P01',
    });

    repository.append({
      auditId: 'audit-2',
      tenantId: 'tenant-1',
      action: 'CheckoutCommitted',
      payloadJson: { schemaVersion: 1, source: 'sales' },
    });

    expect(gateway.appendRequests).toEqual([
      {
        tableName: 'AuditLog',
        partitionKey: 'FY2026-P01',
        rows: [
          {
            auditId: 'audit-2',
            tenantId: 'tenant-1',
            action: 'CheckoutCommitted',
            payloadJson: { schemaVersion: 1, source: 'sales' },
          },
        ],
      },
    ]);
    expect(() =>
      repository.append({
        auditId: 'audit-2',
        tenantId: 'tenant-1',
        action: 'Duplicate',
        payloadJson: { schemaVersion: 1, source: 'test' },
      }),
    ).toThrow(/DuplicatePrimaryKey:AuditLog.auditId/);
    expect(gateway.appendRequests).toHaveLength(1);
  });

  it('rejects records without the registry primary key before touching Sheets', () => {
    const gateway = new FakeSheetRecordGateway<Record<string, unknown>>([]);
    const repository = createAppendOnlySheetRecordRepository<Record<string, unknown>>({
      gateway,
      table: auditTable,
      partitionKey: 'FY2026-P01',
    });

    expect(() => repository.append({ tenantId: 'tenant-1' })).toThrow(/MissingPrimaryKey:AuditLog.auditId/);
    expect(gateway.appendRequests).toEqual([]);
  });
});

const auditTable: TableDefinitionDTO = {
  tableName: 'AuditLog',
  owner: 'operations',
  storageRole: 'audit',
  sheetName: 'AuditLog',
  lifecycle: 'audit',
  schemaVersion: 1,
  primaryKey: 'auditId',
  headers: [
    { name: 'auditId', type: 'string', required: true },
    { name: 'tenantId', type: 'string', required: true },
    { name: 'action', type: 'enum', required: true },
    { name: 'payloadJson', type: 'json', required: false },
  ],
  partitionPolicy: 'audit-period',
  lookupKeys: [{ name: 'AuditLog.primary', columns: ['auditId'], unique: true }],
};

class FakeSheetRecordGateway<T extends Record<string, unknown>> {
  readonly readRequests: Array<{ tableName: string; partitionKey?: string }> = [];
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: T[] }> = [];

  constructor(private readonly records: T[]) {}

  readTable(request: { table: TableDefinitionDTO; partitionKey?: string }): T[] {
    this.readRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey });
    return this.records.map(clone);
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
