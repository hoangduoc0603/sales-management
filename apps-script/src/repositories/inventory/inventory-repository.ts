import type {
  InventoryBalanceDTO,
  InventoryMovementDTO,
} from '@shared/contracts/inventory/inventory';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import {
  createAppendOnlySheetRecordRepository,
  type AppendOnlySheetRecordGateway,
} from '../platform/sheet-record-repository';

export interface InventoryRepository {
  appendMovement(movement: InventoryMovementDTO): void;
  listMovements(): InventoryMovementDTO[];
  getBalance(warehouseId: string, variantId: string): InventoryBalanceDTO | undefined;
  listBalances(warehouseId?: string): InventoryBalanceDTO[];
  applyProjection(balance: InventoryBalanceDTO): void;
}

export function createInMemoryInventoryRepository(): InventoryRepository {
  const movements = new Map<string, InventoryMovementDTO>();
  const balances = new Map<string, InventoryBalanceDTO>();

  return {
    appendMovement(movement) {
      if (movements.has(movement.movementId)) {
        throw new Error(`InventoryMovement is append-only: duplicate ${movement.movementId}.`);
      }

      movements.set(movement.movementId, clone(movement));
    },
    listMovements() {
      return [...movements.values()].map(clone);
    },
    getBalance(warehouseId, variantId) {
      const balance = balances.get(balanceKey(warehouseId, variantId));
      return balance === undefined ? undefined : clone(balance);
    },
    listBalances(warehouseId) {
      return [...balances.values()]
        .filter((balance) => warehouseId === undefined || balance.warehouseId === warehouseId)
        .map(clone);
    },
    applyProjection(balance) {
      balances.set(balanceKey(balance.warehouseId, balance.variantId), clone(balance));
    },
  };
}

export function balanceKey(warehouseId: string, variantId: string): string {
  return `${warehouseId}::${variantId}`;
}

function clone<T>(value: T): T {
  return { ...value };
}

export interface SheetInventoryRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  transactionPartitionKey: string;
}

export function createSheetInventoryRepository(deps: SheetInventoryRepositoryDependencies): InventoryRepository {
  const movementRepository = createAppendOnlySheetRecordRepository<InventoryMovementSheetRow>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'InventoryMovement'),
    partitionKey: deps.transactionPartitionKey,
  });
  const balanceTable = findTable(deps.tableDefinitions, 'InventoryBalance');

  function readBalanceRows(): InventoryBalanceSheetRow[] {
    return deps.gateway.readTable({ table: balanceTable }).map((row) => deepClone(row) as InventoryBalanceSheetRow);
  }

  function listLatestBalances(warehouseId?: string): InventoryBalanceDTO[] {
    const latestByBalanceId = new Map<string, InventoryBalanceSheetRow>();
    for (const row of readBalanceRows()) {
      if (warehouseId !== undefined && row.warehouseId !== warehouseId) continue;
      const current = latestByBalanceId.get(row.balanceId);
      if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) {
        latestByBalanceId.set(row.balanceId, row);
      }
    }
    return [...latestByBalanceId.values()].map(fromBalanceRow);
  }

  return {
    appendMovement(movement) {
      movementRepository.append(toMovementRow(movement));
    },
    listMovements() {
      return movementRepository.list().map(fromMovementRow);
    },
    getBalance(warehouseId, variantId) {
      return listLatestBalances(warehouseId).find((balance) => balance.variantId === variantId);
    },
    listBalances(warehouseId) {
      return listLatestBalances(warehouseId);
    },
    applyProjection(balance) {
      const nextVersion =
        readBalanceRows()
          .filter((row) => row.balanceId === balance.balanceId)
          .reduce((max, row) => Math.max(max, getRecordVersion(row)), 0) + 1;
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

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) {
    throw new Error(`Missing inventory table definition: ${tableName}`);
  }
  return table;
}

function getRecordVersion(row: InventoryBalanceSheetRow): number {
  if (typeof row.recordVersion === 'number') return row.recordVersion;
  const parsed = Number(row.recordVersion);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const match = /:v(\d+)$/.exec(row.id);
  return match === null ? 0 : Number(match[1]);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
