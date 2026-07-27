import { describe, expect, it } from 'vitest';
import type {
  InventoryBalanceDTO,
  InventoryMovementDTO,
} from '../../../shared/contracts/inventory/inventory';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import { createSheetInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed InventoryRepository', () => {
  it('appends immutable movements and versioned balance projections through SheetGateway', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetInventoryRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.appendMovement(movementFixture);
    repository.applyProjection(balanceFixture);

    expect(repository.listMovements()).toEqual([movementFixture]);
    expect(repository.getBalance('warehouse-1', 'variant-1')).toEqual(balanceFixture);
    expect(gateway.appendRequests).toEqual([
      {
        tableName: 'InventoryMovement',
        partitionKey: 'FY2026-P01',
        rows: [
          expect.objectContaining({
            id: 'movement-1',
            tenantId: 'tenant-default',
            schemaVersion: 1,
            movementId: 'movement-1',
            sourceType: 'OpeningBalance',
            sourceId: 'opening-1',
            sourceLineId: 'opening-line-1',
            quantityMilli: 1000,
            totalCostVnd: 100000,
          }),
        ],
      },
      {
        tableName: 'InventoryBalance',
        partitionKey: undefined,
        rows: [
          expect.objectContaining({
            id: 'balance-warehouse-1-variant-1:v1',
            tenantId: 'tenant-default',
            schemaVersion: 1,
            recordVersion: 1,
            balanceId: 'balance-warehouse-1-variant-1',
            warehouseId: 'warehouse-1',
            variantId: 'variant-1',
            availableMilli: 1000,
          }),
        ],
      },
    ]);
  });

  it('rejects duplicate movement ids and reads the latest balance projection version', () => {
    const gateway = new FakeSheetGateway({
      InventoryMovement: [
        {
          id: 'movement-1',
          tenantId: 'tenant-default',
          schemaVersion: 1,
          movementId: 'movement-1',
          movementType: 'OpeningBalance',
          warehouseId: 'warehouse-1',
          variantId: 'variant-1',
          quantityMilli: 1000,
          unitCostVnd: 100000,
          totalCostVnd: 100000,
          sourceType: 'OpeningBalance',
          sourceId: 'opening-1',
          effectiveAt: '2026-07-27T00:00:00.000Z',
          actorId: 'user-admin',
          idempotencyKey: 'idem-1',
        },
      ],
      InventoryBalance: [
        { ...balanceRowFixture, id: 'balance-warehouse-1-variant-1:v1', recordVersion: 1, availableMilli: 1000 },
        { ...balanceRowFixture, id: 'balance-warehouse-1-variant-1:v2', recordVersion: 2, availableMilli: 700 },
      ],
    });
    const repository = createSheetInventoryRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    expect(() => repository.appendMovement(movementFixture)).toThrow(
      /DuplicatePrimaryKey:InventoryMovement.id:movement-1/,
    );
    expect(repository.getBalance('warehouse-1', 'variant-1')).toMatchObject({
      balanceId: 'balance-warehouse-1-variant-1',
      availableMilli: 700,
    });
    expect(gateway.appendRequests).toEqual([]);
  });
});

const movementFixture: InventoryMovementDTO = {
  movementId: 'movement-1',
  tenantId: 'tenant-default',
  movementType: 'OpeningBalance',
  warehouseId: 'warehouse-1',
  variantId: 'variant-1',
  quantityMilli: 1000,
  unitCostVnd: 100000,
  totalCostVnd: 100000,
  sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1', sourceLineId: 'opening-line-1' },
  effectiveAt: '2026-07-27T00:00:00.000Z',
  actorId: 'user-admin',
  idempotencyKey: 'idem-1',
};

const balanceFixture: InventoryBalanceDTO = {
  balanceId: 'balance-warehouse-1-variant-1',
  tenantId: 'tenant-default',
  warehouseId: 'warehouse-1',
  variantId: 'variant-1',
  onHandMilli: 1000,
  availableMilli: 1000,
  reservedMilli: 0,
  inTransitMilli: 0,
  quarantineMilli: 0,
  inventoryValueVnd: 100000,
  asOfMovementId: 'movement-1',
};

const balanceRowFixture = {
  tenantId: 'tenant-default',
  schemaVersion: 1,
  balanceId: 'balance-warehouse-1-variant-1',
  warehouseId: 'warehouse-1',
  variantId: 'variant-1',
  onHandMilli: 1000,
  reservedMilli: 0,
  inTransitMilli: 0,
  quarantineMilli: 0,
  inventoryValueVnd: 100000,
  asOfMovementId: 'movement-1',
};

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: unknown[] }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  constructor(seed: Record<string, Record<string, unknown>[]> = {}) {
    for (const [tableName, rows] of Object.entries(seed)) {
      this.rowsByTable.set(tableName, rows.map(clone));
    }
  }

  readTable(request: { table: TableDefinitionDTO }): Record<string, unknown>[] {
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
