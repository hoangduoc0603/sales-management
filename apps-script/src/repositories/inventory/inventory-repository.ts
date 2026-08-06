import type {
  InventoryBalanceDTO,
  InventoryLotBalanceDTO,
  InventoryMovementDTO,
  SerialStateDTO,
  StocktakeLineDTO,
  StocktakeSessionDTO,
  StockTransferDTO,
  StockTransferLineDTO,
} from '@shared/contracts/inventory/inventory';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import { recordIo } from '../../api/performance-tracker';
import type { PlatformCacheStore } from '../../infrastructure/platform/cache';
import {
  createAppendOnlySheetRecordRepository,
  type AppendOnlySheetRecordGateway,
} from '../platform/sheet-record-repository';

export interface InventoryRepository {
  appendMovement(movement: InventoryMovementDTO): void;
  appendNewMovement(movement: InventoryMovementDTO): void;
  listMovements(): InventoryMovementDTO[];
  getBalance(warehouseId: string, variantId: string): InventoryBalanceDTO | undefined;
  getBalances(warehouseId: string, variantIds: readonly string[]): InventoryBalanceDTO[];
  listBalances(warehouseId?: string): InventoryBalanceDTO[];
  applyProjection(balance: InventoryBalanceDTO): void;
  getLotBalance(warehouseId: string, variantId: string, lotId: string): InventoryLotBalanceDTO | undefined;
  listLotBalances(warehouseId: string, variantId?: string): InventoryLotBalanceDTO[];
  applyLotProjection(lotBalance: InventoryLotBalanceDTO): void;
  getSerialState(serialId: string): SerialStateDTO | undefined;
  saveSerialState(serialState: SerialStateDTO): void;
  saveStockTransfer(transfer: StockTransferDTO): void;
  getStockTransfer(transferId: string): StockTransferDTO | undefined;
  saveStockTransferLines(lines: readonly StockTransferLineDTO[]): void;
  listStockTransferLines(transferId: string): StockTransferLineDTO[];
  saveStocktakeSession(session: StocktakeSessionDTO): void;
  getStocktakeSession(stocktakeSessionId: string): StocktakeSessionDTO | undefined;
  saveStocktakeLines(lines: readonly StocktakeLineDTO[]): void;
  listStocktakeLines(stocktakeSessionId: string): StocktakeLineDTO[];
}

export function createInMemoryInventoryRepository(): InventoryRepository {
  const movements = new Map<string, InventoryMovementDTO>();
  const balances = new Map<string, InventoryBalanceDTO>();
  const lotBalances = new Map<string, InventoryLotBalanceDTO>();
  const serialStates = new Map<string, SerialStateDTO>();
  const transfers = new Map<string, StockTransferDTO>();
  const transferLines = new Map<string, StockTransferLineDTO>();
  const stocktakeSessions = new Map<string, StocktakeSessionDTO>();
  const stocktakeLines = new Map<string, StocktakeLineDTO>();

  return {
    appendMovement(movement) {
      if (movements.has(movement.movementId)) {
        throw new Error(`InventoryMovement is append-only: duplicate ${movement.movementId}.`);
      }

      movements.set(movement.movementId, clone(movement));
    },
    appendNewMovement(movement) {
      movements.set(movement.movementId, clone(movement));
    },
    listMovements() {
      return [...movements.values()].map(clone);
    },
    getBalance(warehouseId, variantId) {
      const balance = balances.get(balanceKey(warehouseId, variantId));
      return balance === undefined ? undefined : clone(balance);
    },
    getBalances(warehouseId, variantIds) {
      return uniqueStrings(variantIds)
        .map((variantId) => balances.get(balanceKey(warehouseId, variantId)))
        .filter(isDefined)
        .map(clone);
    },
    listBalances(warehouseId) {
      return [...balances.values()]
        .filter((balance) => warehouseId === undefined || balance.warehouseId === warehouseId)
        .map(clone);
    },
    applyProjection(balance) {
      balances.set(balanceKey(balance.warehouseId, balance.variantId), clone(balance));
    },
    getLotBalance(warehouseId, variantId, lotId) {
      const lotBalance = lotBalances.get(lotBalanceKey(warehouseId, variantId, lotId));
      return lotBalance === undefined ? undefined : clone(lotBalance);
    },
    listLotBalances(warehouseId, variantId) {
      return [...lotBalances.values()]
        .filter((lotBalance) => lotBalance.warehouseId === warehouseId)
        .filter((lotBalance) => variantId === undefined || lotBalance.variantId === variantId)
        .map(clone);
    },
    applyLotProjection(lotBalance) {
      lotBalances.set(lotBalanceKey(lotBalance.warehouseId, lotBalance.variantId, lotBalance.lotId), clone(lotBalance));
    },
    getSerialState(serialId) {
      const serialState = serialStates.get(serialId);
      return serialState === undefined ? undefined : clone(serialState);
    },
    saveSerialState(serialState) {
      serialStates.set(serialState.serialId, clone(serialState));
    },
    saveStockTransfer(transfer) {
      transfers.set(transfer.transferId, clone(transfer));
    },
    getStockTransfer(transferId) {
      const transfer = transfers.get(transferId);
      return transfer === undefined ? undefined : clone(transfer);
    },
    saveStockTransferLines(lines) {
      for (const line of lines) {
        transferLines.set(line.transferLineId, clone(line));
      }
    },
    listStockTransferLines(transferId) {
      return [...transferLines.values()]
        .filter((line) => line.transferId === transferId)
        .map(clone);
    },
    saveStocktakeSession(session) {
      stocktakeSessions.set(session.stocktakeSessionId, clone(session));
    },
    getStocktakeSession(stocktakeSessionId) {
      const session = stocktakeSessions.get(stocktakeSessionId);
      return session === undefined ? undefined : clone(session);
    },
    saveStocktakeLines(lines) {
      for (const line of lines) {
        stocktakeLines.set(line.stocktakeLineId, clone(line));
      }
    },
    listStocktakeLines(stocktakeSessionId) {
      return [...stocktakeLines.values()]
        .filter((line) => line.stocktakeSessionId === stocktakeSessionId)
        .map(clone);
    },
  };
}

export function balanceKey(warehouseId: string, variantId: string): string {
  return `${warehouseId}::${variantId}`;
}

export function lotBalanceKey(warehouseId: string, variantId: string, lotId: string): string {
  return `${warehouseId}::${variantId}::${lotId}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export interface SheetInventoryRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  transactionPartitionKey: string;
  cacheStore?: PlatformCacheStore;
}

export function createSheetInventoryRepository(deps: SheetInventoryRepositoryDependencies): InventoryRepository {
  const movementTable = findTable(deps.tableDefinitions, 'InventoryMovement');
  const movementRepository = createAppendOnlySheetRecordRepository<InventoryMovementSheetRow>({
    gateway: deps.gateway,
    table: movementTable,
    partitionKey: deps.transactionPartitionKey,
  });
  const balanceTable = findTable(deps.tableDefinitions, 'InventoryBalance');
  const lotBalanceTable = findTable(deps.tableDefinitions, 'InventoryLotBalance');
  const serialStateTable = findTable(deps.tableDefinitions, 'SerialState');
  const transferTable = findTable(deps.tableDefinitions, 'StockTransfer');
  const transferLineTable = findTable(deps.tableDefinitions, 'StockTransferLine');
  const stocktakeSessionTable = findTable(deps.tableDefinitions, 'StocktakeSession');
  const stocktakeLineTable = findTable(deps.tableDefinitions, 'StocktakeLine');
  const latestBalanceVersionCache = new Map<string, number>();
  const latestDocumentVersionCache = new Map<string, number>();

  function rememberLatestBalanceVersion(row: InventoryBalanceSheetRow): void {
    const version = getRecordVersion(row);
    const current = latestBalanceVersionCache.get(row.balanceId) ?? 0;
    if (version > current) latestBalanceVersionCache.set(row.balanceId, version);
  }

  function readBalanceRows(): InventoryBalanceSheetRow[] {
    return deps.gateway.readTable({ table: balanceTable }).map((row) => deepClone(row) as InventoryBalanceSheetRow);
  }

  function findBalanceRowsByColumn(columnName: string, value: string): InventoryBalanceSheetRow[] {
    const rows =
      deps.gateway.findRowsByColumn?.({
        table: balanceTable,
        columnName,
        value,
      }) ?? deps.gateway.readTable({ table: balanceTable });
    return rows
      .filter((row) => String(row[columnName] ?? '') === value)
      .map((row) => deepClone(row) as InventoryBalanceSheetRow);
  }

  function listLatestBalances(warehouseId?: string): InventoryBalanceDTO[] {
    if (warehouseId !== undefined) {
      const cached = readCachedWarehouseBalances(deps.cacheStore, warehouseId);
      if (cached !== undefined) {
        recordIo('inventoryWarehouseBalanceCacheHit');
        for (const entry of cached) {
          latestBalanceVersionCache.set(entry.balance.balanceId, entry.recordVersion);
        }
        return cached.map((entry) => deepClone(entry.balance));
      }
      recordIo('inventoryWarehouseBalanceCacheMiss');
    }

    const latestByBalanceId = new Map<string, InventoryBalanceSheetRow>();
    const rows = warehouseId === undefined ? readBalanceRows() : findBalanceRowsByColumn('warehouseId', warehouseId);
    const latestRows: Array<{ balance: InventoryBalanceDTO; recordVersion: number }> = [];
    for (const row of rows) {
      if (warehouseId !== undefined && row.warehouseId !== warehouseId) continue;
      const current = latestByBalanceId.get(row.balanceId);
      if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) {
        latestByBalanceId.set(row.balanceId, row);
      }
    }
    const balances = [...latestByBalanceId.values()].map((row) => {
      rememberLatestBalanceVersion(row);
      const balance = fromBalanceRow(row);
      cacheBalance(deps.cacheStore, balance, getRecordVersion(row));
      latestRows.push({ balance, recordVersion: getRecordVersion(row) });
      return balance;
    });
    if (warehouseId !== undefined) {
      cacheWarehouseBalances(deps.cacheStore, warehouseId, latestRows);
    }
    return balances;
  }

  function findLatestBalanceByBalanceId(balanceId: string): InventoryBalanceDTO | undefined {
    const cached = readCachedBalance(deps.cacheStore, balanceId);
    if (cached !== undefined) {
      latestBalanceVersionCache.set(balanceId, cached.recordVersion);
      return cached.balance;
    }

    const latest = findBalanceRowsByColumn('balanceId', balanceId).reduce<InventoryBalanceSheetRow | undefined>(
      (current, row) => (current === undefined || getRecordVersion(row) > getRecordVersion(current) ? row : current),
      undefined,
    );
    if (latest === undefined) return undefined;

    rememberLatestBalanceVersion(latest);
    const balance = fromBalanceRow(latest);
    cacheBalance(deps.cacheStore, balance, getRecordVersion(latest));
    return balance;
  }

  function getBalanceInternal(warehouseId: string, variantId: string): InventoryBalanceDTO | undefined {
    const balanceId = `balance-${warehouseId}-${variantId}`;
    return findLatestBalanceByBalanceId(balanceId)
      ?? listLatestBalances(warehouseId).find((balance) => balance.variantId === variantId);
  }

  function getBalancesInternal(warehouseId: string, variantIds: readonly string[]): InventoryBalanceDTO[] {
    const uniqueVariantIds = uniqueStrings(variantIds);
    if (uniqueVariantIds.length === 0) return [];

    const balancesByVariantId = new Map<string, InventoryBalanceDTO>();
    const misses: string[] = [];
    for (const variantId of uniqueVariantIds) {
      const balanceId = `balance-${warehouseId}-${variantId}`;
      const cached = readCachedBalance(deps.cacheStore, balanceId);
      if (cached === undefined) {
        if (!readCachedMissingBalance(deps.cacheStore, balanceId)) {
          misses.push(variantId);
        }
      } else {
        latestBalanceVersionCache.set(balanceId, cached.recordVersion);
        balancesByVariantId.set(variantId, cached.balance);
      }
    }

    if (misses.length === 1) {
      const balance = getBalanceInternal(warehouseId, misses[0]);
      if (balance !== undefined) {
        balancesByVariantId.set(balance.variantId, balance);
      } else {
        cacheMissingBalance(deps.cacheStore, `balance-${warehouseId}-${misses[0]}`);
      }
    } else if (misses.length > 1) {
      const missedVariantIds = new Set(misses);
      for (const balance of listLatestBalances(warehouseId)) {
        if (missedVariantIds.has(balance.variantId)) {
          balancesByVariantId.set(balance.variantId, balance);
        }
      }
      for (const variantId of missedVariantIds) {
        if (!balancesByVariantId.has(variantId)) {
          cacheMissingBalance(deps.cacheStore, `balance-${warehouseId}-${variantId}`);
        }
      }
    }

    return uniqueVariantIds
      .map((variantId) => balancesByVariantId.get(variantId))
      .filter(isDefined)
      .map(deepClone);
  }

  function findRowsByColumn(table: TableDefinitionDTO, columnName: string, value: string): Record<string, unknown>[] {
    const rows =
      deps.gateway.findRowsByColumn?.({
        table,
        partitionKey: deps.transactionPartitionKey,
        columnName,
        value,
      }) ?? deps.gateway.readTable({ table, partitionKey: deps.transactionPartitionKey });
    return rows.filter((row) => String(row[columnName] ?? '') === value).map(deepClone);
  }

  function appendVersionedRow(
    table: TableDefinitionDTO,
    logicalId: string,
    row: Record<string, unknown>,
  ): void {
    const cacheKey = `${table.tableName}:${logicalId}`;
    const cachedLatestVersion = latestDocumentVersionCache.get(cacheKey);
    const nextVersion =
      cachedLatestVersion !== undefined
        ? cachedLatestVersion + 1
        : findRowsByColumn(table, table.primaryKey === 'id' ? inferLogicalIdColumn(table.tableName) : table.primaryKey, logicalId).reduce(
            (max, candidate) => Math.max(max, getRecordVersion(candidate)),
            0,
          ) + 1;
    deps.gateway.appendRows({
      table,
      partitionKey: deps.transactionPartitionKey,
      rows: [
        {
          ...deepClone(row),
          id: `${logicalId}:v${nextVersion}`,
          schemaVersion: table.schemaVersion,
          recordVersion: nextVersion,
          partitionKey: deps.transactionPartitionKey,
        },
      ],
    });
    latestDocumentVersionCache.set(cacheKey, nextVersion);
  }

  function latestRowByLogicalId<T extends Record<string, unknown>>(
    table: TableDefinitionDTO,
    columnName: string,
    value: string,
  ): T | undefined {
    const latest = findRowsByColumn(table, columnName, value).reduce<Record<string, unknown> | undefined>(
      (current, row) => (current === undefined || getRecordVersion(row) > getRecordVersion(current) ? row : current),
      undefined,
    );
    if (latest !== undefined) latestDocumentVersionCache.set(`${table.tableName}:${value}`, getRecordVersion(latest));
    return latest === undefined ? undefined : (deepClone(latest) as T);
  }

  function latestRowsByLogicalId<T extends Record<string, unknown>>(
    table: TableDefinitionDTO,
    parentColumnName: string,
    parentId: string,
    logicalColumnName: string,
  ): T[] {
    const latestById = new Map<string, Record<string, unknown>>();
    for (const row of findRowsByColumn(table, parentColumnName, parentId)) {
      const logicalId = String(row[logicalColumnName] ?? '');
      if (logicalId === '') continue;
      const current = latestById.get(logicalId);
      if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) {
        latestById.set(logicalId, row);
      }
    }
    return [...latestById.values()].map((row) => {
      latestDocumentVersionCache.set(`${table.tableName}:${String(row[logicalColumnName])}`, getRecordVersion(row));
      return deepClone(row) as T;
    });
  }

  function latestRowsByWarehouseAndVariant<T extends Record<string, unknown>>(
    table: TableDefinitionDTO,
    warehouseId: string,
    variantId: string | undefined,
    logicalColumnName: string,
  ): T[] {
    const latestById = new Map<string, Record<string, unknown>>();
    for (const row of findRowsByColumn(table, 'warehouseId', warehouseId)) {
      if (variantId !== undefined && String(row.variantId ?? '') !== variantId) continue;
      const logicalId = String(row[logicalColumnName] ?? '');
      if (logicalId === '') continue;
      const current = latestById.get(logicalId);
      if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) {
        latestById.set(logicalId, row);
      }
    }
    return [...latestById.values()].map((row) => deepClone(row) as T);
  }

  return {
    appendMovement(movement) {
      movementRepository.append(toMovementRow(movement));
    },
    appendNewMovement(movement) {
      deps.gateway.appendRows({
        table: movementTable,
        partitionKey: deps.transactionPartitionKey,
        rows: [toMovementRow(movement)],
      });
    },
    listMovements() {
      return movementRepository.list().map(fromMovementRow);
    },
    getBalance(warehouseId, variantId) {
      return getBalanceInternal(warehouseId, variantId);
    },
    getBalances(warehouseId, variantIds) {
      return getBalancesInternal(warehouseId, variantIds);
    },
    listBalances(warehouseId) {
      return listLatestBalances(warehouseId);
    },
    applyProjection(balance) {
      const cachedLatestVersion = latestBalanceVersionCache.get(balance.balanceId);
      const nextVersion =
        cachedLatestVersion !== undefined
          ? cachedLatestVersion + 1
          : findBalanceRowsByColumn('balanceId', balance.balanceId).reduce(
              (max, row) => Math.max(max, getRecordVersion(row)),
              0,
            ) + 1;
      deps.gateway.appendRows({
        table: balanceTable,
        rows: [
          {
            ...deepClone(balance),
            id: `${balance.balanceId}:v${nextVersion}`,
            schemaVersion: balanceTable.schemaVersion,
            recordVersion: nextVersion,
          },
        ],
      });
      latestBalanceVersionCache.set(balance.balanceId, nextVersion);
      removeCachedWarehouseBalances(deps.cacheStore, balance.warehouseId);
      removeCachedMissingBalance(deps.cacheStore, balance.balanceId);
      cacheBalance(deps.cacheStore, balance, nextVersion);
    },
    getLotBalance(warehouseId, variantId, lotId) {
      const row = latestRowByLogicalId<InventoryLotBalanceSheetRow>(
        lotBalanceTable,
        'lotBalanceId',
        `lot-balance-${warehouseId}-${variantId}-${lotId}`,
      );
      return row === undefined ? undefined : fromLotBalanceRow(row);
    },
    listLotBalances(warehouseId, variantId) {
      return latestRowsByWarehouseAndVariant<InventoryLotBalanceSheetRow>(
        lotBalanceTable,
        warehouseId,
        variantId,
        'lotBalanceId',
      ).map(fromLotBalanceRow);
    },
    applyLotProjection(lotBalance) {
      appendVersionedRow(lotBalanceTable, lotBalance.lotBalanceId, toLotBalanceRow(lotBalance));
    },
    getSerialState(serialId) {
      const row = latestRowByLogicalId<SerialStateSheetRow>(serialStateTable, 'serialId', serialId);
      return row === undefined ? undefined : fromSerialStateRow(row);
    },
    saveSerialState(serialState) {
      appendVersionedRow(serialStateTable, serialState.serialId, toSerialStateRow(serialState));
    },
    saveStockTransfer(transfer) {
      appendVersionedRow(transferTable, transfer.transferId, toStockTransferRow(transfer));
    },
    getStockTransfer(transferId) {
      const row = latestRowByLogicalId<StockTransferSheetRow>(transferTable, 'transferId', transferId);
      return row === undefined ? undefined : fromStockTransferRow(row);
    },
    saveStockTransferLines(lines) {
      for (const line of lines) {
        const transfer = latestRowByLogicalId<StockTransferSheetRow>(transferTable, 'transferId', line.transferId);
        appendVersionedRow(
          transferLineTable,
          line.transferLineId,
          toStockTransferLineRow(transfer?.tenantId ?? '', line),
        );
      }
    },
    listStockTransferLines(transferId) {
      return latestRowsByLogicalId<StockTransferLineSheetRow>(
        transferLineTable,
        'transferId',
        transferId,
        'transferLineId',
      ).map(fromStockTransferLineRow);
    },
    saveStocktakeSession(session) {
      appendVersionedRow(stocktakeSessionTable, session.stocktakeSessionId, toStocktakeSessionRow(session));
    },
    getStocktakeSession(stocktakeSessionId) {
      const row = latestRowByLogicalId<StocktakeSessionSheetRow>(
        stocktakeSessionTable,
        'stocktakeSessionId',
        stocktakeSessionId,
      );
      return row === undefined ? undefined : fromStocktakeSessionRow(row);
    },
    saveStocktakeLines(lines) {
      for (const line of lines) {
        const session = latestRowByLogicalId<StocktakeSessionSheetRow>(
          stocktakeSessionTable,
          'stocktakeSessionId',
          line.stocktakeSessionId,
        );
        appendVersionedRow(
          stocktakeLineTable,
          line.stocktakeLineId,
          toStocktakeLineRow(session?.tenantId ?? '', line),
        );
      }
    },
    listStocktakeLines(stocktakeSessionId) {
      return latestRowsByLogicalId<StocktakeLineSheetRow>(
        stocktakeLineTable,
        'stocktakeSessionId',
        stocktakeSessionId,
        'stocktakeLineId',
      ).map(fromStocktakeLineRow);
    },
  };
}

interface InventoryMovementSheetRow extends Record<string, unknown> {
  id: string;
  tenantId: string;
  schemaVersion: number;
  movementId: string;
  movementType: InventoryMovementDTO['movementType'];
  warehouseId: string;
  variantId: string;
  lotId?: string;
  serialId?: string;
  quantityMilli: number;
  unitVersionId?: string;
  unitCostVnd: number;
  totalCostVnd: number;
  sourceType: InventoryMovementDTO['sourceDocument']['sourceType'];
  sourceId: string;
  sourceLineId?: string;
  effectiveAt: string;
  actorId: string;
  approverId?: string;
  idempotencyKey: string;
  reversalOfMovementId?: string;
  requiresCostReconciliation?: boolean;
}

interface InventoryBalanceSheetRow extends Record<string, unknown> {
  id: string;
  tenantId: string;
  schemaVersion: number;
  recordVersion: number;
  balanceId: string;
  warehouseId: string;
  variantId: string;
  onHandMilli: number;
  availableMilli: number;
  reservedMilli: number;
  inTransitMilli: number;
  quarantineMilli: number;
  inventoryValueVnd: number;
  asOfMovementId?: string;
}

interface InventoryLotBalanceSheetRow extends Record<string, unknown> {
  id: string;
  tenantId: string;
  schemaVersion: number;
  recordVersion: number;
  partitionKey?: string;
  lotBalanceId: string;
  warehouseId: string;
  variantId: string;
  lotId: string;
  lotCode: string;
  expiryDate?: string;
  onHandMilli: number;
  availableMilli: number;
  quarantineMilli: number;
  asOfMovementId?: string;
  metadataJson?: string;
}

interface SerialStateSheetRow extends Record<string, unknown> {
  id: string;
  tenantId: string;
  schemaVersion: number;
  recordVersion: number;
  partitionKey?: string;
  serialId: string;
  variantId: string;
  warehouseId: string;
  status: SerialStateDTO['status'];
  sourceMovementId?: string;
  sourceSaleLineId?: string;
  updatedAt: string;
  historyJson?: string;
}

interface StockTransferSheetRow extends Record<string, unknown> {
  id: string;
  tenantId: string;
  schemaVersion: number;
  recordVersion: number;
  partitionKey?: string;
  transferId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: StockTransferDTO['status'];
  reasonCode?: string;
  reasonNote?: string;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  shippedBy?: string;
  shippedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
}

interface StockTransferLineSheetRow extends Record<string, unknown> {
  id: string;
  tenantId: string;
  schemaVersion: number;
  recordVersion: number;
  partitionKey?: string;
  transferLineId: string;
  transferId: string;
  variantId: string;
  quantityMilli: number;
  receivedQuantityMilli: number;
  unitVersionId?: string;
  unitCostVnd?: number;
  varianceReasonCode?: string;
  varianceNote?: string;
}

interface StocktakeSessionSheetRow extends Record<string, unknown> {
  id: string;
  tenantId: string;
  schemaVersion: number;
  recordVersion: number;
  partitionKey?: string;
  stocktakeSessionId: string;
  warehouseId: string;
  status: StocktakeSessionDTO['status'];
  snapshotAt: string;
  scopeJson?: string;
  createdBy: string;
  createdAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface StocktakeLineSheetRow extends Record<string, unknown> {
  id: string;
  tenantId: string;
  schemaVersion: number;
  recordVersion: number;
  partitionKey?: string;
  stocktakeLineId: string;
  stocktakeSessionId: string;
  variantId: string;
  lotId?: string;
  serialId?: string;
  snapshotQuantityMilli: number;
  countedQuantityMilli?: number;
  varianceMilli?: number;
  movementsAfterSnapshotCount: number;
  reasonCode?: string;
  reasonNote?: string;
}

function toMovementRow(movement: InventoryMovementDTO): InventoryMovementSheetRow {
  return {
    id: movement.movementId,
    tenantId: movement.tenantId,
    schemaVersion: 1,
    movementId: movement.movementId,
    movementType: movement.movementType,
    warehouseId: movement.warehouseId,
    variantId: movement.variantId,
    lotId: movement.lotId,
    serialId: movement.serialId,
    quantityMilli: movement.quantityMilli,
    unitVersionId: movement.unitVersionId,
    unitCostVnd: movement.unitCostVnd,
    totalCostVnd: movement.totalCostVnd,
    sourceType: movement.sourceDocument.sourceType,
    sourceId: movement.sourceDocument.sourceId,
    sourceLineId: movement.sourceDocument.sourceLineId,
    effectiveAt: movement.effectiveAt,
    actorId: movement.actorId,
    approverId: movement.approverId,
    idempotencyKey: movement.idempotencyKey,
    reversalOfMovementId: movement.reversalOfMovementId,
    requiresCostReconciliation: movement.requiresCostReconciliation,
  };
}

function fromMovementRow(row: InventoryMovementSheetRow): InventoryMovementDTO {
  return {
    movementId: row.movementId,
    tenantId: row.tenantId,
    movementType: row.movementType,
    warehouseId: row.warehouseId,
    variantId: row.variantId,
    lotId: row.lotId,
    serialId: row.serialId,
    quantityMilli: row.quantityMilli,
    unitVersionId: row.unitVersionId,
    unitCostVnd: row.unitCostVnd,
    totalCostVnd: row.totalCostVnd,
    sourceDocument: {
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      sourceLineId: row.sourceLineId,
    },
    effectiveAt: row.effectiveAt,
    actorId: row.actorId,
    approverId: row.approverId,
    idempotencyKey: row.idempotencyKey,
    reversalOfMovementId: row.reversalOfMovementId,
    requiresCostReconciliation: row.requiresCostReconciliation,
  };
}

function fromBalanceRow(row: InventoryBalanceSheetRow): InventoryBalanceDTO {
  return {
    balanceId: row.balanceId,
    tenantId: row.tenantId,
    warehouseId: row.warehouseId,
    variantId: row.variantId,
    onHandMilli: row.onHandMilli,
    availableMilli: row.availableMilli,
    reservedMilli: row.reservedMilli,
    inTransitMilli: row.inTransitMilli,
    quarantineMilli: row.quarantineMilli,
    inventoryValueVnd: row.inventoryValueVnd,
    asOfMovementId: row.asOfMovementId,
  };
}

function toLotBalanceRow(lotBalance: InventoryLotBalanceDTO): InventoryLotBalanceSheetRow {
  return {
    id: lotBalance.lotBalanceId,
    tenantId: lotBalance.tenantId,
    schemaVersion: 1,
    recordVersion: 1,
    lotBalanceId: lotBalance.lotBalanceId,
    warehouseId: lotBalance.warehouseId,
    variantId: lotBalance.variantId,
    lotId: lotBalance.lotId,
    lotCode: lotBalance.lotCode,
    expiryDate: lotBalance.expiryDate,
    onHandMilli: lotBalance.onHandMilli,
    availableMilli: lotBalance.availableMilli,
    quarantineMilli: lotBalance.quarantineMilli,
    asOfMovementId: lotBalance.asOfMovementId,
  };
}

function fromLotBalanceRow(row: InventoryLotBalanceSheetRow): InventoryLotBalanceDTO {
  return {
    lotBalanceId: row.lotBalanceId,
    tenantId: row.tenantId,
    warehouseId: row.warehouseId,
    variantId: row.variantId,
    lotId: row.lotId,
    lotCode: row.lotCode,
    expiryDate: row.expiryDate,
    onHandMilli: row.onHandMilli,
    availableMilli: row.availableMilli,
    quarantineMilli: row.quarantineMilli,
    asOfMovementId: row.asOfMovementId,
  };
}

function toSerialStateRow(serialState: SerialStateDTO): SerialStateSheetRow {
  return {
    id: serialState.serialId,
    tenantId: serialState.tenantId,
    schemaVersion: 1,
    recordVersion: 1,
    serialId: serialState.serialId,
    variantId: serialState.variantId,
    warehouseId: serialState.warehouseId,
    status: serialState.status,
    sourceMovementId: serialState.sourceMovementId,
    sourceSaleLineId: serialState.sourceSaleLineId,
    updatedAt: serialState.updatedAt,
  };
}

function fromSerialStateRow(row: SerialStateSheetRow): SerialStateDTO {
  return {
    serialId: row.serialId,
    tenantId: row.tenantId,
    variantId: row.variantId,
    warehouseId: row.warehouseId,
    status: row.status,
    sourceMovementId: row.sourceMovementId,
    sourceSaleLineId: row.sourceSaleLineId,
    updatedAt: row.updatedAt,
  };
}

function toStockTransferRow(transfer: StockTransferDTO): StockTransferSheetRow {
  return {
    id: transfer.transferId,
    tenantId: transfer.tenantId,
    schemaVersion: 1,
    recordVersion: 1,
    transferId: transfer.transferId,
    sourceWarehouseId: transfer.sourceWarehouseId,
    destinationWarehouseId: transfer.destinationWarehouseId,
    status: transfer.status,
    reasonCode: transfer.reasonCode,
    reasonNote: transfer.reasonNote,
    createdBy: transfer.createdBy,
    createdAt: transfer.createdAt,
    approvedBy: transfer.approvedBy,
    approvedAt: transfer.approvedAt,
    shippedBy: transfer.shippedBy,
    shippedAt: transfer.shippedAt,
    receivedBy: transfer.receivedBy,
    receivedAt: transfer.receivedAt,
  };
}

function fromStockTransferRow(row: StockTransferSheetRow): StockTransferDTO {
  return {
    transferId: row.transferId,
    tenantId: row.tenantId,
    sourceWarehouseId: row.sourceWarehouseId,
    destinationWarehouseId: row.destinationWarehouseId,
    status: row.status,
    reasonCode: row.reasonCode,
    reasonNote: row.reasonNote,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    shippedBy: row.shippedBy,
    shippedAt: row.shippedAt,
    receivedBy: row.receivedBy,
    receivedAt: row.receivedAt,
  };
}

function toStockTransferLineRow(tenantId: string, line: StockTransferLineDTO): StockTransferLineSheetRow {
  return {
    id: line.transferLineId,
    tenantId,
    schemaVersion: 1,
    recordVersion: 1,
    transferLineId: line.transferLineId,
    transferId: line.transferId,
    variantId: line.variantId,
    quantityMilli: line.quantityMilli,
    receivedQuantityMilli: line.receivedQuantityMilli,
    unitVersionId: line.unitVersionId,
    unitCostVnd: line.unitCostVnd,
    varianceReasonCode: line.varianceReasonCode,
    varianceNote: line.varianceNote,
  };
}

function fromStockTransferLineRow(row: StockTransferLineSheetRow): StockTransferLineDTO {
  return {
    transferLineId: row.transferLineId,
    transferId: row.transferId,
    variantId: row.variantId,
    quantityMilli: row.quantityMilli,
    receivedQuantityMilli: row.receivedQuantityMilli,
    unitVersionId: row.unitVersionId,
    unitCostVnd: row.unitCostVnd,
    varianceReasonCode: row.varianceReasonCode,
    varianceNote: row.varianceNote,
  };
}

function toStocktakeSessionRow(session: StocktakeSessionDTO): StocktakeSessionSheetRow {
  return {
    id: session.stocktakeSessionId,
    tenantId: session.tenantId,
    schemaVersion: 1,
    recordVersion: 1,
    stocktakeSessionId: session.stocktakeSessionId,
    warehouseId: session.warehouseId,
    status: session.status,
    snapshotAt: session.snapshotAt,
    scopeJson: session.scopeVariantIds === undefined ? undefined : JSON.stringify({ variantIds: session.scopeVariantIds }),
    createdBy: session.createdBy,
    createdAt: session.createdAt,
    submittedBy: session.submittedBy,
    submittedAt: session.submittedAt,
    approvedBy: session.approvedBy,
    approvedAt: session.approvedAt,
  };
}

function fromStocktakeSessionRow(row: StocktakeSessionSheetRow): StocktakeSessionDTO {
  return {
    stocktakeSessionId: row.stocktakeSessionId,
    tenantId: row.tenantId,
    warehouseId: row.warehouseId,
    status: row.status,
    snapshotAt: row.snapshotAt,
    scopeVariantIds: parseScopeVariantIds(row.scopeJson),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    submittedBy: row.submittedBy,
    submittedAt: row.submittedAt,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
  };
}

function toStocktakeLineRow(tenantId: string, line: StocktakeLineDTO): StocktakeLineSheetRow {
  return {
    id: line.stocktakeLineId,
    tenantId,
    schemaVersion: 1,
    recordVersion: 1,
    stocktakeLineId: line.stocktakeLineId,
    stocktakeSessionId: line.stocktakeSessionId,
    variantId: line.variantId,
    lotId: line.lotId,
    serialId: line.serialId,
    snapshotQuantityMilli: line.snapshotQuantityMilli,
    countedQuantityMilli: line.countedQuantityMilli,
    varianceMilli: line.varianceMilli,
    movementsAfterSnapshotCount: line.movementsAfterSnapshotCount,
    reasonCode: line.reasonCode,
    reasonNote: line.reasonNote,
  };
}

function fromStocktakeLineRow(row: StocktakeLineSheetRow): StocktakeLineDTO {
  return {
    stocktakeLineId: row.stocktakeLineId,
    stocktakeSessionId: row.stocktakeSessionId,
    variantId: row.variantId,
    lotId: row.lotId,
    serialId: row.serialId,
    snapshotQuantityMilli: row.snapshotQuantityMilli,
    countedQuantityMilli: row.countedQuantityMilli,
    varianceMilli: row.varianceMilli,
    movementsAfterSnapshotCount: row.movementsAfterSnapshotCount,
    reasonCode: row.reasonCode,
    reasonNote: row.reasonNote,
  };
}

function parseScopeVariantIds(scopeJson: string | undefined): readonly string[] | undefined {
  if (scopeJson === undefined || scopeJson.trim() === '') return undefined;
  const parsed = JSON.parse(scopeJson) as { variantIds?: unknown };
  return Array.isArray(parsed.variantIds) ? parsed.variantIds.map(String) : undefined;
}

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) {
    throw new Error(`Missing inventory table definition: ${tableName}`);
  }
  return table;
}

function getRecordVersion(row: { id?: unknown; recordVersion?: unknown }): number {
  if (typeof row.recordVersion === 'number') return row.recordVersion;
  const parsed = Number(row.recordVersion);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const match = /:v(\d+)$/.exec(String(row.id ?? ''));
  return match === null ? 0 : Number(match[1]);
}

function inferLogicalIdColumn(tableName: string): string {
  switch (tableName) {
    case 'StockTransfer':
      return 'transferId';
    case 'InventoryLotBalance':
      return 'lotBalanceId';
    case 'SerialState':
      return 'serialId';
    case 'StockTransferLine':
      return 'transferLineId';
    case 'StocktakeSession':
      return 'stocktakeSessionId';
    case 'StocktakeLine':
      return 'stocktakeLineId';
    default:
      return 'id';
  }
}

const inventoryBalanceCacheTtlSeconds = 300;
const inventoryWarehouseBalanceCacheTtlSeconds = inventoryBalanceCacheTtlSeconds;
const inventoryMissingBalanceCacheTtlSeconds = inventoryBalanceCacheTtlSeconds;
const inventoryWarehouseBalanceCacheMaxPayloadLength = 80_000;

interface CachedInventoryBalancePayload {
  balance: InventoryBalanceDTO;
  recordVersion: number;
}

interface CachedInventoryWarehouseBalancesPayload {
  warehouseId: string;
  items: CachedInventoryBalancePayload[];
}

function cacheBalance(
  cacheStore: PlatformCacheStore | undefined,
  balance: InventoryBalanceDTO,
  recordVersion: number,
): void {
  if (cacheStore === undefined) return;
  cacheStore.put(balanceCacheKey(balance.balanceId), JSON.stringify({ balance, recordVersion }), inventoryBalanceCacheTtlSeconds);
}

function readCachedBalance(
  cacheStore: PlatformCacheStore | undefined,
  balanceId: string,
): CachedInventoryBalancePayload | undefined {
  if (cacheStore === undefined) return undefined;
  const key = balanceCacheKey(balanceId);
  const raw = cacheStore.get(key);
  if (raw === undefined) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedInventoryBalancePayload>;
    if (
      parsed.balance === undefined ||
      parsed.balance.balanceId !== balanceId ||
      typeof parsed.recordVersion !== 'number'
    ) {
      cacheStore.remove(key);
      return undefined;
    }
    return {
      balance: deepClone(parsed.balance),
      recordVersion: parsed.recordVersion,
    };
  } catch {
    cacheStore.remove(key);
    return undefined;
  }
}

function balanceCacheKey(balanceId: string): string {
  return `inventory:balance:${balanceId}`;
}

function missingBalanceCacheKey(balanceId: string): string {
  return `inventory:balance:missing:${balanceId}`;
}

function cacheMissingBalance(
  cacheStore: PlatformCacheStore | undefined,
  balanceId: string,
): void {
  if (cacheStore === undefined) return;
  recordIo('inventoryMissingBalanceCachePut');
  cacheStore.put(missingBalanceCacheKey(balanceId), '1', inventoryMissingBalanceCacheTtlSeconds);
}

function readCachedMissingBalance(
  cacheStore: PlatformCacheStore | undefined,
  balanceId: string,
): boolean {
  if (cacheStore === undefined) return false;
  const hit = cacheStore.get(missingBalanceCacheKey(balanceId)) !== undefined;
  if (hit) recordIo('inventoryMissingBalanceCacheHit');
  return hit;
}

function removeCachedMissingBalance(
  cacheStore: PlatformCacheStore | undefined,
  balanceId: string,
): void {
  if (cacheStore === undefined) return;
  recordIo('inventoryMissingBalanceCacheRemove');
  cacheStore.remove(missingBalanceCacheKey(balanceId));
}

function warehouseBalancesCacheKey(warehouseId: string): string {
  return `inventory:balances:warehouse:${warehouseId}`;
}

function cacheWarehouseBalances(
  cacheStore: PlatformCacheStore | undefined,
  warehouseId: string,
  items: readonly CachedInventoryBalancePayload[],
): void {
  if (cacheStore === undefined) return;
  const payload = JSON.stringify({
    warehouseId,
    items: items.map((entry) => ({
      balance: deepClone(entry.balance),
      recordVersion: entry.recordVersion,
    })),
  } satisfies CachedInventoryWarehouseBalancesPayload);
  if (payload.length > inventoryWarehouseBalanceCacheMaxPayloadLength) return;
  recordIo('inventoryWarehouseBalanceCachePut');
  cacheStore.put(warehouseBalancesCacheKey(warehouseId), payload, inventoryWarehouseBalanceCacheTtlSeconds);
}

function readCachedWarehouseBalances(
  cacheStore: PlatformCacheStore | undefined,
  warehouseId: string,
): CachedInventoryBalancePayload[] | undefined {
  if (cacheStore === undefined) return undefined;
  const key = warehouseBalancesCacheKey(warehouseId);
  const raw = cacheStore.get(key);
  if (raw === undefined) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedInventoryWarehouseBalancesPayload>;
    if (
      parsed.warehouseId !== warehouseId ||
      parsed.items === undefined ||
      !Array.isArray(parsed.items)
    ) {
      cacheStore.remove(key);
      return undefined;
    }
    const items: CachedInventoryBalancePayload[] = [];
    for (const entry of parsed.items) {
      if (
        entry.balance === undefined ||
        entry.balance.warehouseId !== warehouseId ||
        typeof entry.recordVersion !== 'number'
      ) {
        cacheStore.remove(key);
        return undefined;
      }
      items.push({
        balance: deepClone(entry.balance),
        recordVersion: entry.recordVersion,
      });
    }
    return items;
  } catch {
    cacheStore.remove(key);
    return undefined;
  }
}

function removeCachedWarehouseBalances(
  cacheStore: PlatformCacheStore | undefined,
  warehouseId: string,
): void {
  recordIo('inventoryWarehouseBalanceCacheRemove');
  cacheStore?.remove(warehouseBalancesCacheKey(warehouseId));
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
