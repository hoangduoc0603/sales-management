import type {
  InventoryBalanceDTO,
  InventoryMovementDTO,
} from '@shared/contracts/inventory/inventory';

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
