import { describe, expect, it } from 'vitest';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import {
  createSheetAuditOutboxRepository,
  type AuditOutboxRecord,
} from '../../../apps-script/src/repositories/platform/audit-outbox-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed AuditOutbox repository', () => {
  it('persists AuditOutbox records through SheetGateway using registry primary key', () => {
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
            id: 'audit-1',
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

  it('rejects duplicate eventId values before appending another row', () => {
    const gateway = new FakeSheetGateway([
      {
        id: 'audit-1',
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

    expect(() => repository.append(auditRecord)).toThrow(/DuplicatePrimaryKey:AuditOutbox.id:audit-1/);
    expect(gateway.appendRequests).toEqual([]);
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

  constructor(private readonly rows: Record<string, unknown>[] = []) {}

  readTable(): Record<string, unknown>[] {
    return this.rows.map(clone);
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
