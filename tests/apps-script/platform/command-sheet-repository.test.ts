import { describe, expect, it } from 'vitest';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import {
  createSheetCommandRepository,
  type CommandTransactionRecord,
} from '../../../apps-script/src/repositories/platform/command-repository';
import type { PlatformCacheStore } from '../../../apps-script/src/infrastructure/platform/cache';
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

  it('uses narrow lookups for command idempotency and versioning when gateway supports it', () => {
    const gateway = new FakeSheetGateway([], { supportFindRowsByColumn: true });
    const repository = createSheetCommandRepository({
      gateway,
      table: commandTable,
      partitionKey: 'FY2026-P01',
    });

    expect(repository.findByIdempotencyKey('sale-fast-1')).toBeUndefined();
    repository.save({
      commandId: 'cmd-fast-1',
      idempotencyKey: 'sale-fast-1',
      status: 'Preparing',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });

    expect(gateway.readCount).toBe(0);
    expect(gateway.findRequests).toEqual([
      { columnName: 'idempotencyKey', value: 'sale-fast-1' },
      { columnName: 'commandId', value: 'cmd-fast-1' },
      { columnName: 'id', value: 'cmd-fast-1:v1' },
    ]);
  });

  it('appends a new committed command without version preflight lookups', () => {
    const gateway = new FakeSheetGateway([], { supportFindRowsByColumn: true });
    const repository = createSheetCommandRepository({
      gateway,
      table: commandTable,
      partitionKey: 'FY2026-P01',
    });

    repository.appendNew({
      commandId: 'cmd-fast-commit-1',
      idempotencyKey: 'idem-fast-commit-1',
      status: 'Committed',
      resultJson: '{"receiptId":"receipt-fast-1"}',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:01.000Z',
    });

    expect(gateway.readCount).toBe(0);
    expect(gateway.findRequests).toEqual([]);
    expect(gateway.appendRequests).toEqual([
      {
        tableName: 'CommandTransaction',
        partitionKey: 'FY2026-P01',
        rows: [
          {
            id: 'cmd-fast-commit-1:v1',
            commandId: 'cmd-fast-commit-1',
            idempotencyKey: 'idem-fast-commit-1',
            status: 'Committed',
            createdAt: '2026-07-27T00:00:00.000Z',
            updatedAt: '2026-07-27T00:00:01.000Z',
            resultJson: '{"receiptId":"receipt-fast-1"}',
            errorCode: undefined,
          },
        ],
      },
    ]);
  });

  it('serves recent committed commands from cache without hitting Sheets for retry', () => {
    const gateway = new FakeSheetGateway([], { supportFindRowsByColumn: true });
    const cacheStore = new FakePlatformCacheStore();
    const repository = createSheetCommandRepository({
      gateway,
      table: commandTable,
      partitionKey: 'FY2026-P01',
      cacheStore,
    });

    repository.appendNew({
      commandId: 'cmd-cached-commit-1',
      idempotencyKey: 'idem-cached-commit-1',
      status: 'Committed',
      resultJson: '{"receiptId":"receipt-cached-1"}',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:01.000Z',
    });
    gateway.findRequests.length = 0;

    expect(repository.findCachedByIdempotencyKey?.('idem-cached-commit-1')).toEqual({
      commandId: 'cmd-cached-commit-1',
      idempotencyKey: 'idem-cached-commit-1',
      status: 'Committed',
      resultJson: '{"receiptId":"receipt-cached-1"}',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:01.000Z',
    });
    expect(gateway.findRequests).toEqual([]);
    expect(cacheStore.ttls()).toEqual([21600]);
  });
});

const commandTable = createPlatformTableDefinitions().find((table) => table.tableName === 'CommandTransaction')!;

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

function row(record: CommandTransactionRecord & { id: string }): Record<string, unknown> {
  return record;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class FakePlatformCacheStore implements PlatformCacheStore {
  private readonly values = new Map<string, string>();
  private readonly ttlValues: number[] = [];

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  put(key: string, value: string, expirationInSeconds: number): void {
    this.values.set(key, value);
    this.ttlValues.push(expirationInSeconds);
  }

  remove(key: string): void {
    this.values.delete(key);
  }

  ttls(): number[] {
    return [...this.ttlValues];
  }
}
