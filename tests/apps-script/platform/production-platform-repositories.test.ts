import { describe, expect, it } from 'vitest';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import { createProductionPlatformRepositories } from '../../../apps-script/src/bootstrap/create-production-platform-repositories';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('production platform repository wiring', () => {
  it('wires command journal to SheetGateway with the active transaction partition', () => {
    const gateway = new FakeSheetGateway();
    const repositories = createProductionPlatformRepositories({
      sheetGateway: gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repositories.commandRepository.save({
      commandId: 'cmd-1',
      idempotencyKey: 'checkout-1',
      status: 'Committed',
      resultJson: '{"ok":true}',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:01.000Z',
    });
    expect(repositories.commandRepository.findByIdempotencyKey('checkout-1')?.status).toBe('Committed');
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey])).toEqual([
      ['CommandTransaction', 'FY2026-P01'],
    ]);
  });

  it('fails fast when required platform table definitions are missing', () => {
    const gateway = new FakeSheetGateway();
    const tableDefinitions = createPlatformTableDefinitions().filter((table) => table.tableName !== 'CommandTransaction');

    expect(() =>
      createProductionPlatformRepositories({
        sheetGateway: gateway,
        tableDefinitions,
        transactionPartitionKey: 'FY2026-P01',
      }),
    ).toThrow(/Missing platform table definition: CommandTransaction/);
  });
});

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  readTable(request: { table: TableDefinitionDTO; partitionKey?: string }): Record<string, unknown>[] {
    return this.getRows(request.table.tableName).map(clone);
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
    this.getRows(request.table.tableName).push(...rows);
    return { appendedRowCount: rows.length };
  }

  private getRows(tableName: string): Record<string, unknown>[] {
    let rows = this.rowsByTable.get(tableName);
    if (rows === undefined) {
      rows = [];
      this.rowsByTable.set(tableName, rows);
    }
    return rows;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
