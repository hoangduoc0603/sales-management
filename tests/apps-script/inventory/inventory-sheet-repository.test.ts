import { describe, expect, it } from 'vitest';
import type {
  InventoryBalanceDTO,
  InventoryLotBalanceDTO,
  InventoryMovementDTO,
  SerialStateDTO,
  StocktakeLineDTO,
  StocktakeSessionDTO,
  StockTransferDTO,
  StockTransferLineDTO,
} from '../../../shared/contracts/inventory/inventory';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import type { PlatformCacheStore } from '../../../apps-script/src/infrastructure/platform/cache';
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

  it('uses narrow lookup paths for POS inventory balance and movement writes when gateway supports them', () => {
    const gateway = new FakeSheetGateway(
      {
        InventoryBalance: [
          { ...balanceRowFixture, id: 'balance-warehouse-1-variant-1:v1', recordVersion: 1, availableMilli: 1000 },
        ],
      },
      { supportFindRowsByColumn: true },
    );
    const repository = createSheetInventoryRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    expect(repository.getBalance('warehouse-1', 'variant-1')).toMatchObject({ availableMilli: 1000 });
    repository.applyProjection({ ...balanceFixture, availableMilli: 700 });
    repository.appendMovement({ ...movementFixture, movementId: 'movement-2', idempotencyKey: 'idem-2' });

    expect(gateway.readCount).toBe(0);
    expect(gateway.findRequests.map((request) => [request.tableName, request.columnName, request.value])).toEqual([
      ['InventoryBalance', 'balanceId', 'balance-warehouse-1-variant-1'],
      ['InventoryMovement', 'id', 'movement-2'],
    ]);
  });

  it('caches inventory balance by balanceId for hot POS checkout reads and refreshes cache on projection write', () => {
    const cacheStore = new FakePlatformCacheStore();
    const gateway = new FakeSheetGateway({}, { supportFindRowsByColumn: true });
    const repository = createSheetInventoryRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
      cacheStore,
    });

    repository.applyProjection(balanceFixture);
    gateway.findRequests = [];
    gateway.readCount = 0;

    const nextRequestRepository = createSheetInventoryRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
      cacheStore,
    });

    expect(nextRequestRepository.getBalance('warehouse-1', 'variant-1')).toEqual(balanceFixture);
    expect(gateway.findRequests).toEqual([]);
    expect(gateway.readCount).toBe(0);
    expect(cacheStore.ttls()).toEqual([300]);
  });

  it('bulk-loads multiple balances through one warehouse lookup and reuses balance cache on hot paths', () => {
    const cacheStore = new FakePlatformCacheStore();
    const gateway = new FakeSheetGateway(
      {
        InventoryBalance: [
          { ...balanceRowFixture, id: 'balance-warehouse-1-variant-1:v1', recordVersion: 1, availableMilli: 1000 },
          {
            ...balanceRowFixture,
            id: 'balance-warehouse-1-variant-2:v1',
            recordVersion: 1,
            balanceId: 'balance-warehouse-1-variant-2',
            variantId: 'variant-2',
            availableMilli: 2000,
          },
          {
            ...balanceRowFixture,
            id: 'balance-warehouse-2-variant-3:v1',
            recordVersion: 1,
            balanceId: 'balance-warehouse-2-variant-3',
            warehouseId: 'warehouse-2',
            variantId: 'variant-3',
            availableMilli: 3000,
          },
        ],
      },
      { supportFindRowsByColumn: true },
    );
    const repository = createSheetInventoryRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
      cacheStore,
    });

    expect(repository.getBalances('warehouse-1', ['variant-1', 'variant-2', 'variant-1'])).toEqual([
      expect.objectContaining({ variantId: 'variant-1', availableMilli: 1000 }),
      expect.objectContaining({ variantId: 'variant-2', availableMilli: 2000 }),
    ]);
    expect(gateway.findRequests.map((request) => [request.tableName, request.columnName, request.value])).toEqual([
      ['InventoryBalance', 'warehouseId', 'warehouse-1'],
    ]);

    gateway.findRequests = [];
    expect(repository.getBalances('warehouse-1', ['variant-2', 'variant-1'])).toEqual([
      expect.objectContaining({ variantId: 'variant-2', availableMilli: 2000 }),
      expect.objectContaining({ variantId: 'variant-1', availableMilli: 1000 }),
    ]);
    expect(gateway.findRequests).toEqual([]);
  });

  it('appends service-generated new movements without duplicate preflight lookup', () => {
    const gateway = new FakeSheetGateway({}, { supportFindRowsByColumn: true });
    const repository = createSheetInventoryRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.appendNewMovement(movementFixture);

    expect(gateway.readCount).toBe(0);
    expect(gateway.findRequests).toEqual([]);
    expect(gateway.appendRequests).toEqual([
      {
        tableName: 'InventoryMovement',
        partitionKey: 'FY2026-P01',
        rows: [
          expect.objectContaining({
            id: 'movement-1',
            movementId: 'movement-1',
          }),
        ],
      },
    ]);
  });

  it('persists stock transfer and stocktake document state as versioned rows', () => {
    const gateway = new FakeSheetGateway({}, { supportFindRowsByColumn: true });
    const repository = createSheetInventoryRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.saveStockTransfer(transferFixture);
    repository.saveStockTransfer({ ...transferFixture, status: 'Approved', approvedBy: 'manager-1', approvedAt: '2026-07-27T01:05:00.000Z' });
    repository.saveStockTransferLines([transferLineFixture]);
    repository.saveStocktakeSession(stocktakeSessionFixture);
    repository.saveStocktakeLines([stocktakeLineFixture]);

    expect(repository.getStockTransfer('transfer-1')).toMatchObject({
      transferId: 'transfer-1',
      status: 'Approved',
      approvedBy: 'manager-1',
    });
    expect(repository.listStockTransferLines('transfer-1')).toEqual([transferLineFixture]);
    expect(repository.getStocktakeSession('stocktake-1')).toEqual(stocktakeSessionFixture);
    expect(repository.listStocktakeLines('stocktake-1')).toEqual([stocktakeLineFixture]);
    expect(gateway.appendRequests.map((request) => request.tableName)).toEqual([
      'StockTransfer',
      'StockTransfer',
      'StockTransferLine',
      'StocktakeSession',
      'StocktakeLine',
    ]);
    expect(gateway.appendRequests[1]?.rows[0]).toMatchObject({ id: 'transfer-1:v2', recordVersion: 2 });
  });

  it('persists latest lot balance and serial state projection rows', () => {
    const gateway = new FakeSheetGateway({}, { supportFindRowsByColumn: true });
    const repository = createSheetInventoryRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.applyLotProjection(lotBalanceFixture);
    repository.applyLotProjection({ ...lotBalanceFixture, availableMilli: 700 });
    repository.saveSerialState(serialStateFixture);
    repository.saveSerialState({ ...serialStateFixture, status: 'Sold', updatedAt: '2026-07-27T02:00:00.000Z' });

    expect(repository.getLotBalance('warehouse-1', 'variant-1', 'lot-1')).toMatchObject({
      lotId: 'lot-1',
      availableMilli: 700,
    });
    expect(repository.listLotBalances('warehouse-1', 'variant-1')).toHaveLength(1);
    expect(repository.getSerialState('SERIAL-001')).toMatchObject({
      serialId: 'SERIAL-001',
      status: 'Sold',
    });
    expect(gateway.appendRequests.map((request) => request.tableName)).toEqual([
      'InventoryLotBalance',
      'InventoryLotBalance',
      'SerialState',
      'SerialState',
    ]);
    expect(gateway.appendRequests[1]?.rows[0]).toMatchObject({
      id: 'lot-balance-warehouse-1-variant-1-lot-1:v2',
      recordVersion: 2,
    });
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

const transferFixture: StockTransferDTO = {
  transferId: 'transfer-1',
  tenantId: 'tenant-default',
  sourceWarehouseId: 'warehouse-source',
  destinationWarehouseId: 'warehouse-destination',
  status: 'PendingApproval',
  reasonCode: 'replenishment',
  createdBy: 'user-admin',
  createdAt: '2026-07-27T01:00:00.000Z',
};

const transferLineFixture: StockTransferLineDTO = {
  transferLineId: 'transfer-line-1',
  transferId: 'transfer-1',
  variantId: 'variant-1',
  quantityMilli: 10_000,
  receivedQuantityMilli: 0,
  unitCostVnd: 100_000,
};

const stocktakeSessionFixture: StocktakeSessionDTO = {
  stocktakeSessionId: 'stocktake-1',
  tenantId: 'tenant-default',
  warehouseId: 'warehouse-1',
  status: 'InProgress',
  snapshotAt: '2026-07-27T01:00:00.000Z',
  scopeVariantIds: ['variant-1'],
  createdBy: 'counter-1',
  createdAt: '2026-07-27T01:00:00.000Z',
};

const stocktakeLineFixture: StocktakeLineDTO = {
  stocktakeLineId: 'stocktake-line-1',
  stocktakeSessionId: 'stocktake-1',
  variantId: 'variant-1',
  snapshotQuantityMilli: 10_000,
  countedQuantityMilli: 9_000,
  varianceMilli: -1_000,
  movementsAfterSnapshotCount: 1,
  reasonCode: 'count-diff',
};

const lotBalanceFixture: InventoryLotBalanceDTO = {
  lotBalanceId: 'lot-balance-warehouse-1-variant-1-lot-1',
  tenantId: 'tenant-default',
  warehouseId: 'warehouse-1',
  variantId: 'variant-1',
  lotId: 'lot-1',
  lotCode: 'LOT-2408-A',
  expiryDate: '2026-08-31',
  onHandMilli: 1000,
  availableMilli: 1000,
  quarantineMilli: 0,
  asOfMovementId: 'movement-1',
};

const serialStateFixture: SerialStateDTO = {
  serialId: 'SERIAL-001',
  tenantId: 'tenant-default',
  warehouseId: 'warehouse-1',
  variantId: 'variant-1',
  status: 'Saleable',
  sourceMovementId: 'movement-1',
  updatedAt: '2026-07-27T00:00:00.000Z',
};

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: unknown[] }> = [];
  readonly findRequests: Array<{ tableName: string; columnName: string; value: string }> = [];
  readCount = 0;
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  constructor(
    seed: Record<string, Record<string, unknown>[]> = {},
    private readonly options: { supportFindRowsByColumn?: boolean } = {},
  ) {
    for (const [tableName, rows] of Object.entries(seed)) {
      this.rowsByTable.set(tableName, rows.map(clone));
    }
  }

  readTable(request: { table: TableDefinitionDTO }): Record<string, unknown>[] {
    this.readCount += 1;
    return this.getRows(request.table.tableName).map(clone);
  }

  findRowsByColumn(request: {
    table: TableDefinitionDTO;
    columnName: string;
    value: string;
  }): Record<string, unknown>[] {
    if (this.options.supportFindRowsByColumn !== true) return this.readTable(request);
    this.findRequests.push({
      tableName: request.table.tableName,
      columnName: request.columnName,
      value: request.value,
    });
    return this.getRows(request.table.tableName)
      .filter((row) => String(row[request.columnName] ?? '') === request.value)
      .map(clone);
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

class FakePlatformCacheStore implements PlatformCacheStore {
  private readonly entries = new Map<string, { value: string; ttl: number }>();

  get(key: string): string | undefined {
    return this.entries.get(key)?.value;
  }

  put(key: string, value: string, expirationInSeconds: number): void {
    this.entries.set(key, { value, ttl: expirationInSeconds });
  }

  remove(key: string): void {
    this.entries.delete(key);
  }

  ttls(): number[] {
    return [...this.entries.values()].map((entry) => entry.ttl);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
