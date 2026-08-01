import { describe, expect, it } from 'vitest';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import {
  createSheetAuditOutboxRepository,
  type AuditOutboxRecord,
} from '../../../apps-script/src/repositories/platform/audit-outbox-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed AuditOutbox repository', () => {
  it('persists AuditOutbox records as append-only versions through SheetGateway', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetAuditOutboxRepository({
      gateway,
      table: auditOutboxTable,
      partitionKey: 'FY2026-P01',
    });

    repository.append(auditRecord);

    expect(gateway.appendRequests).toEqual([
      {
        tableName: 'AuditOutbox',
        partitionKey: 'FY2026-P01',
        rows: [
          {
            id: 'audit-1:v1',
            eventId: 'audit-1',
            commandId: 'cmd-1',
            actorId: 'user-1',
            action: 'sales.checkout.complete',
            status: 'Pending',
            createdAt: '2026-07-27T00:00:00.000Z',
          },
        ],
      },
    ]);
    expect(repository.list()).toEqual([auditRecord]);
  });

  it('allows a later event state version and returns latest state per eventId', () => {
    const gateway = new FakeSheetGateway([
      {
        id: 'audit-1:v1',
        eventId: 'audit-1',
        commandId: 'cmd-1',
        actorId: 'user-1',
        action: 'sales.checkout.complete',
        status: 'Pending',
        createdAt: '2026-07-27T00:00:00.000Z',
      },
    ]);
    const repository = createSheetAuditOutboxRepository({
      gateway,
      table: auditOutboxTable,
      partitionKey: 'FY2026-P01',
    });

    repository.append({ ...auditRecord, status: 'Delivered' });

    expect(gateway.appendRequests).toEqual([
      {
        tableName: 'AuditOutbox',
        partitionKey: 'FY2026-P01',
        rows: [
          {
            id: 'audit-1:v2',
            eventId: 'audit-1',
            commandId: 'cmd-1',
            actorId: 'user-1',
            action: 'sales.checkout.complete',
            status: 'Delivered',
            createdAt: '2026-07-27T00:00:00.000Z',
          },
        ],
      },
    ]);
    expect(repository.list()).toEqual([{ ...auditRecord, status: 'Delivered' }]);
  });

  it('uses narrow event lookup before appending a new outbox version when gateway supports it', () => {
    const gateway = new FakeSheetGateway([], { supportFindRowsByColumn: true });
    const repository = createSheetAuditOutboxRepository({
      gateway,
      table: auditOutboxTable,
      partitionKey: 'FY2026-P01',
    });

    repository.append(auditRecord);

    expect(gateway.readCount).toBe(0);
    expect(gateway.findRequests).toEqual([
      { columnName: 'eventId', value: 'audit-1' },
      { columnName: 'id', value: 'audit-1:v1' },
    ]);
    expect(gateway.appendRequests).toHaveLength(1);
  });
});

const auditOutboxTable = createPlatformTableDefinitions().find((table) => table.tableName === 'AuditOutbox')!;

const auditRecord: AuditOutboxRecord = {
  eventId: 'audit-1',
  commandId: 'cmd-1',
  actorId: 'user-1',
  action: 'sales.checkout.complete',
  status: 'Pending',
  createdAt: '2026-07-27T00:00:00.000Z',
};

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  readonly findRequests: Array<{ columnName: string; value: string }> = [];
  readCount = 0;

  constructor(
    private readonly rows: Record<string, unknown>[] = [],
    private readonly options: { supportFindRowsByColumn?: boolean } = {},
  ) {}

  readTable(): Record<string, unknown>[] {
    this.readCount += 1;
    return this.rows.map(clone);
  }

  findRowsByColumn(request: { columnName: string; value: string }): Record<string, unknown>[] {
    if (this.options.supportFindRowsByColumn !== true) {
      return this.readTable().filter((row) => String(row[request.columnName] ?? '') === request.value);
    }
    this.findRequests.push({ columnName: request.columnName, value: request.value });
    return this.rows.filter((row) => String(row[request.columnName] ?? '') === request.value).map(clone);
  }

  appendRows(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    rows: readonly Record<string, unknown>[];
  }): { appendedRowCount: number } {
    const rows = request.rows.map(clone);
    this.appendRequests.push({
      tableName: request.table.tableName,
      partitionKey: request.partitionKey,
      rows,
    });
    this.rows.push(...rows);
    return { appendedRowCount: rows.length };
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
