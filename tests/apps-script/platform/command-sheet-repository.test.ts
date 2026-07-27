import { describe, expect, it } from 'vitest';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import {
  createSheetCommandRepository,
  type CommandTransactionRecord,
} from '../../../apps-script/src/repositories/platform/command-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed CommandRepository', () => {
  it('appends command transaction versions and returns the latest committed outcome', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetCommandRepository({
      gateway,
      table: commandTable,
      partitionKey: 'FY2026-P01',
    });

    repository.save({
      commandId: 'cmd-1',
      idempotencyKey: 'sale-1',
      status: 'Preparing',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    repository.save({
      commandId: 'cmd-1',
      idempotencyKey: 'sale-1',
      status: 'Committed',
      resultJson: '{"receiptId":"receipt-1"}',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:01.000Z',
    });

    expect(repository.findByCommandId('cmd-1')).toEqual({
      commandId: 'cmd-1',
      idempotencyKey: 'sale-1',
      status: 'Committed',
      resultJson: '{"receiptId":"receipt-1"}',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:01.000Z',
    });
    expect(repository.findByIdempotencyKey('sale-1')?.status).toBe('Committed');
    expect(gateway.appendRequests).toEqual([
      {
        tableName: 'CommandTransaction',
        partitionKey: 'FY2026-P01',
        rows: [
          {
            id: 'cmd-1:v1',
            commandId: 'cmd-1',
            idempotencyKey: 'sale-1',
            status: 'Preparing',
            createdAt: '2026-07-27T00:00:00.000Z',
            updatedAt: '2026-07-27T00:00:00.000Z',
            resultJson: undefined,
            errorCode: undefined,
          },
        ],
      },
      {
        tableName: 'CommandTransaction',
        partitionKey: 'FY2026-P01',
        rows: [
          {
            id: 'cmd-1:v2',
            commandId: 'cmd-1',
            idempotencyKey: 'sale-1',
            status: 'Committed',
            createdAt: '2026-07-27T00:00:00.000Z',
            updatedAt: '2026-07-27T00:00:01.000Z',
            resultJson: '{"receiptId":"receipt-1"}',
            errorCode: undefined,
          },
        ],
      },
    ]);
  });

  it('selects latest command record from existing sheet rows without relying on row numbers', () => {
    const gateway = new FakeSheetGateway([
      row({
        id: 'cmd-2:v1',
        commandId: 'cmd-2',
        idempotencyKey: 'return-1',
        status: 'Preparing',
        createdAt: '2026-07-27T00:00:00.000Z',
        updatedAt: '2026-07-27T00:00:00.000Z',
      }),
      row({
        id: 'cmd-2:v2',
        commandId: 'cmd-2',
        idempotencyKey: 'return-1',
        status: 'Failed',
        errorCode: 'INVALID_INPUT',
        createdAt: '2026-07-27T00:00:00.000Z',
        updatedAt: '2026-07-27T00:00:02.000Z',
      }),
    ]);
    const repository = createSheetCommandRepository({
      gateway,
      table: commandTable,
      partitionKey: 'FY2026-P01',
    });

    expect(repository.findByIdempotencyKey('return-1')).toEqual({
      commandId: 'cmd-2',
      idempotencyKey: 'return-1',
      status: 'Failed',
      errorCode: 'INVALID_INPUT',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:02.000Z',
    });
  });
});

const commandTable = createPlatformTableDefinitions().find((table) => table.tableName === 'CommandTransaction')!;

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

function row(record: CommandTransactionRecord & { id: string }): Record<string, unknown> {
  return record;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
