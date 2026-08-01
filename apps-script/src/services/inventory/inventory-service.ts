import type { ApiErrorCode } from '@shared/contracts/errors';
import type {
  InventoryBalanceDTO,
  InventoryBalanceSummaryRequest,
  InventoryBalanceSummaryResponse,
  InventoryIssueForSaleRequest,
  InventoryMovementDTO,
  InventoryMovementResponse,
  InventoryPurchaseReturnRequest,
  InventoryReceiveRequest,
  InventoryReleaseRequest,
  InventoryReserveRequest,
  InventoryReturnReceiveRequest,
  InventoryReturnRestockRequest,
  InventoryReturnScrapRequest,
  InventoryValueAdjustmentRequest,
} from '@shared/contracts/inventory/inventory';
import type { InventoryRepository } from '../../repositories/inventory/inventory-repository';

type InventoryServiceResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: ApiErrorCode;
        message: string;
      };
    };

export interface InventoryAvailabilityCheckInput {
  warehouseId: string;
  lines: readonly {
    lineId?: string;
    variantId: string;
    quantityMilli: number;
  }[];
}

export interface InventoryAvailabilityConflict {
  variantId: string;
  lineIds: readonly string[];
  requestedMilli: number;
  availableMilli: number;
}

export interface InventoryService {
  receive(input: InventoryReceiveRequest): InventoryServiceResult<InventoryMovementResponse>;
  purchaseReturn(input: InventoryPurchaseReturnRequest): InventoryServiceResult<InventoryMovementResponse>;
  issueForSale(input: InventoryIssueForSaleRequest): InventoryServiceResult<InventoryMovementResponse>;
  reserve(input: InventoryReserveRequest): InventoryServiceResult<InventoryMovementResponse>;
  release(input: InventoryReleaseRequest): InventoryServiceResult<InventoryMovementResponse>;
  receiveReturnToQuarantine(
    input: InventoryReturnReceiveRequest,
  ): InventoryServiceResult<InventoryMovementResponse>;
  restockReturn(input: InventoryReturnRestockRequest): InventoryServiceResult<InventoryMovementResponse>;
  scrapReturn(input: InventoryReturnScrapRequest): InventoryServiceResult<InventoryMovementResponse>;
  adjustInventoryValue(input: InventoryValueAdjustmentRequest): InventoryServiceResult<InventoryMovementResponse>;
  checkAvailability(input: InventoryAvailabilityCheckInput): readonly InventoryAvailabilityConflict[];
  getAverageUnitCostVnd(warehouseId: string, variantId: string): number;
  getBalanceSummary(input: InventoryBalanceSummaryRequest): InventoryBalanceSummaryResponse;
}

export interface InventoryServiceDependencies {
  repository: InventoryRepository;
  tenantId: string;
  now: () => Date;
  newId(prefix: string): string;
}

export function createInventoryService(deps: InventoryServiceDependencies): InventoryService {
  const getOrCreateBalance = (warehouseId: string, variantId: string): InventoryBalanceDTO =>
    deps.repository.getBalance(warehouseId, variantId) ?? {
      balanceId: `balance-${warehouseId}-${variantId}`,
      tenantId: deps.tenantId,
      warehouseId,
      variantId,
      onHandMilli: 0,
      availableMilli: 0,
      reservedMilli: 0,
      inTransitMilli: 0,
      quarantineMilli: 0,
      inventoryValueVnd: 0,
    };

  const appendAndProject = (
    movement: InventoryMovementDTO,
    balance: InventoryBalanceDTO,
  ): InventoryMovementResponse => {
    deps.repository.appendNewMovement(movement);
    deps.repository.applyProjection(balance);
    return {
      movement,
      balance,
    };
  };

  return {
    checkAvailability(input) {
      const requiredByVariantId = new Map<string, { quantityMilli: number; lineIds: string[] }>();
      for (const line of input.lines) {
        const current = requiredByVariantId.get(line.variantId) ?? { quantityMilli: 0, lineIds: [] };
        current.quantityMilli += line.quantityMilli;
        if (line.lineId !== undefined) current.lineIds.push(line.lineId);
        requiredByVariantId.set(line.variantId, current);
      }

      const conflicts: InventoryAvailabilityConflict[] = [];
      for (const [variantId, required] of requiredByVariantId.entries()) {
        const availableMilli = deps.repository.getBalance(input.warehouseId, variantId)?.availableMilli ?? 0;
        if (availableMilli < required.quantityMilli) {
          conflicts.push({
            variantId,
            lineIds: required.lineIds,
            requestedMilli: required.quantityMilli,
            availableMilli,
          });
        }
      }
      return conflicts;
    },
    receive(input) {
      const current = getOrCreateBalance(input.warehouseId, input.variantId);
      const totalCostVnd = calculateLineValue(input.quantityMilli, input.unitCostVnd);
      const movement = createMovement(deps, {
        input,
        movementType: input.sourceDocument.sourceType === 'OpeningBalance' ? 'OpeningBalance' : 'PurchaseReceipt',
        quantityMilli: input.quantityMilli,
        unitCostVnd: input.unitCostVnd,
        totalCostVnd,
      });
      const next: InventoryBalanceDTO = {
        ...current,
        onHandMilli: current.onHandMilli + input.quantityMilli,
        availableMilli: current.availableMilli + input.quantityMilli,
        inventoryValueVnd: current.inventoryValueVnd + totalCostVnd,
        asOfMovementId: movement.movementId,
      };

      return {
        ok: true,
        data: appendAndProject(movement, next),
      };
    },
    purchaseReturn(input) {
      const current = getOrCreateBalance(input.warehouseId, input.variantId);
      if (current.availableMilli < input.quantityMilli || current.onHandMilli < input.quantityMilli) {
        return {
          ok: false,
          error: { code: 'INSUFFICIENT_STOCK', message: 'Không đủ tồn để trả nhà cung cấp.' },
        };
      }

      const returnValueVnd = calculateLineValue(input.quantityMilli, input.unitCostVnd);
      const movement = createMovement(deps, {
        input,
        movementType: 'PurchaseReturn',
        quantityMilli: -input.quantityMilli,
        unitCostVnd: input.unitCostVnd,
        totalCostVnd: -returnValueVnd,
      });
      const next: InventoryBalanceDTO = {
        ...current,
        onHandMilli: current.onHandMilli - input.quantityMilli,
        availableMilli: current.availableMilli - input.quantityMilli,
        inventoryValueVnd: current.inventoryValueVnd - returnValueVnd,
        asOfMovementId: movement.movementId,
      };

      return {
        ok: true,
        data: appendAndProject(movement, next),
      };
    },
    issueForSale(input) {
      const current = getOrCreateBalance(input.warehouseId, input.variantId);
      const hasEnoughAvailable = current.availableMilli >= input.quantityMilli;

      if (!hasEnoughAvailable && input.negativeStockApproval === undefined) {
        return {
          ok: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Không đủ tồn khả dụng để xuất bán.',
          },
        };
      }

      const unitCostVnd = resolveIssueUnitCost(current, input);
      if (unitCostVnd === undefined) {
        return {
          ok: false,
          error: {
            code: 'TEMPORARY_COST_REQUIRED',
            message: 'Cần nhập giá vốn tạm khi duyệt xuất âm kho chưa có giá vốn.',
          },
        };
      }

      const issueValueVnd = hasEnoughAvailable
        ? Math.round((input.quantityMilli * current.inventoryValueVnd) / current.onHandMilli)
        : calculateLineValue(input.quantityMilli, unitCostVnd);
      const movement = createMovement(deps, {
        input,
        movementType: 'SaleIssue',
        quantityMilli: -input.quantityMilli,
        unitCostVnd,
        totalCostVnd: -issueValueVnd,
        approverId: input.negativeStockApproval?.approvedBy,
        requiresCostReconciliation: !hasEnoughAvailable,
      });
      const next: InventoryBalanceDTO = {
        ...current,
        onHandMilli: current.onHandMilli - input.quantityMilli,
        availableMilli: current.availableMilli - input.quantityMilli,
        inventoryValueVnd: current.inventoryValueVnd - issueValueVnd,
        asOfMovementId: movement.movementId,
      };

      return {
        ok: true,
        data: appendAndProject(movement, next),
      };
    },
    reserve(input) {
      const current = getOrCreateBalance(input.warehouseId, input.variantId);
      if (current.availableMilli < input.quantityMilli) {
        return {
          ok: false,
          error: { code: 'INSUFFICIENT_STOCK', message: 'Không đủ tồn khả dụng để giữ hàng.' },
        };
      }

      const movement = createMovement(deps, {
        input,
        movementType: 'ManualAdjustment',
        quantityMilli: 0,
        unitCostVnd: getAverageUnitCost(current),
        totalCostVnd: 0,
      });
      const next: InventoryBalanceDTO = {
        ...current,
        availableMilli: current.availableMilli - input.quantityMilli,
        reservedMilli: current.reservedMilli + input.quantityMilli,
        asOfMovementId: movement.movementId,
      };

      return {
        ok: true,
        data: appendAndProject(movement, next),
      };
    },
    release(input) {
      const current = getOrCreateBalance(input.warehouseId, input.variantId);
      if (current.reservedMilli < input.quantityMilli) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Số lượng giải phóng vượt lượng đã giữ.' },
        };
      }

      const movement = createMovement(deps, {
        input,
        movementType: 'ManualAdjustment',
        quantityMilli: 0,
        unitCostVnd: getAverageUnitCost(current),
        totalCostVnd: 0,
      });
      const next: InventoryBalanceDTO = {
        ...current,
        availableMilli: current.availableMilli + input.quantityMilli,
        reservedMilli: current.reservedMilli - input.quantityMilli,
        asOfMovementId: movement.movementId,
      };

      return {
        ok: true,
        data: appendAndProject(movement, next),
      };
    },
    receiveReturnToQuarantine(input) {
      const current = getOrCreateBalance(input.warehouseId, input.variantId);
      const totalCostVnd = calculateLineValue(input.quantityMilli, input.unitCostVnd);
      const movement = createMovement(deps, {
        input,
        movementType: 'SaleReturnReceive',
        quantityMilli: input.quantityMilli,
        unitCostVnd: input.unitCostVnd,
        totalCostVnd,
      });
      const next: InventoryBalanceDTO = {
        ...current,
        onHandMilli: current.onHandMilli + input.quantityMilli,
        quarantineMilli: current.quarantineMilli + input.quantityMilli,
        inventoryValueVnd: current.inventoryValueVnd + totalCostVnd,
        asOfMovementId: movement.movementId,
      };

      return {
        ok: true,
        data: appendAndProject(movement, next),
      };
    },
    restockReturn(input) {
      const current = getOrCreateBalance(input.warehouseId, input.variantId);
      if (current.quarantineMilli < input.quantityMilli) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Số lượng restock vượt lượng đang quarantine.' },
        };
      }

      const movement = createMovement(deps, {
        input,
        movementType: 'SaleReturnRestock',
        quantityMilli: input.quantityMilli,
        unitCostVnd: input.unitCostVnd,
        totalCostVnd: calculateLineValue(input.quantityMilli, input.unitCostVnd),
      });
      const next: InventoryBalanceDTO = {
        ...current,
        availableMilli: current.availableMilli + input.quantityMilli,
        quarantineMilli: current.quarantineMilli - input.quantityMilli,
        asOfMovementId: movement.movementId,
      };

      return {
        ok: true,
        data: appendAndProject(movement, next),
      };
    },
    scrapReturn(input) {
      const current = getOrCreateBalance(input.warehouseId, input.variantId);
      if (current.quarantineMilli < input.quantityMilli) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Số lượng hủy vượt lượng đang quarantine.' },
        };
      }

      const scrapValueVnd = calculateLineValue(input.quantityMilli, input.unitCostVnd);
      const movement = createMovement(deps, {
        input,
        movementType: 'Scrap',
        quantityMilli: -input.quantityMilli,
        unitCostVnd: input.unitCostVnd,
        totalCostVnd: -scrapValueVnd,
      });
      const next: InventoryBalanceDTO = {
        ...current,
        onHandMilli: current.onHandMilli - input.quantityMilli,
        quarantineMilli: current.quarantineMilli - input.quantityMilli,
        inventoryValueVnd: current.inventoryValueVnd - scrapValueVnd,
        asOfMovementId: movement.movementId,
      };

      return {
        ok: true,
        data: appendAndProject(movement, next),
      };
    },
    adjustInventoryValue(input) {
      const current = getOrCreateBalance(input.warehouseId, input.variantId);
      const movement = createMovement(deps, {
        input,
        movementType: 'ManualAdjustment',
        quantityMilli: 0,
        unitCostVnd: getAverageUnitCost(current),
        totalCostVnd: input.amountVnd,
      });
      const next: InventoryBalanceDTO = {
        ...current,
        inventoryValueVnd: current.inventoryValueVnd + input.amountVnd,
        asOfMovementId: movement.movementId,
      };

      return {
        ok: true,
        data: appendAndProject(movement, next),
      };
    },
    getAverageUnitCostVnd(warehouseId, variantId) {
      const balance = deps.repository.getBalance(warehouseId, variantId);
      return balance === undefined ? 0 : getAverageUnitCost(balance);
    },
    getBalanceSummary(input) {
      return {
        generatedAt: deps.now().toISOString(),
        rows: deps.repository.listBalances(input.warehouseId).map((balance) => ({
          warehouseId: balance.warehouseId,
          variantId: balance.variantId,
          onHandMilli: balance.onHandMilli,
          availableMilli: balance.availableMilli,
          reservedMilli: balance.reservedMilli,
          quarantineMilli: balance.quarantineMilli,
          inventoryValueVnd: balance.inventoryValueVnd,
        })),
      };
    },
  };
}

function createMovement(
  deps: InventoryServiceDependencies,
  params: {
    input:
      | InventoryReceiveRequest
      | InventoryPurchaseReturnRequest
      | InventoryIssueForSaleRequest
      | InventoryReserveRequest
      | InventoryReleaseRequest
      | InventoryReturnReceiveRequest
      | InventoryReturnRestockRequest
      | InventoryReturnScrapRequest
      | InventoryValueAdjustmentRequest;
    movementType: InventoryMovementDTO['movementType'];
    quantityMilli: number;
    unitCostVnd: number;
    totalCostVnd: number;
    approverId?: string;
    requiresCostReconciliation?: boolean;
  },
): InventoryMovementDTO {
  return {
    movementId: deps.newId('movement'),
    tenantId: deps.tenantId,
    movementType: params.movementType,
    warehouseId: params.input.warehouseId,
    variantId: params.input.variantId,
    quantityMilli: params.quantityMilli,
    unitVersionId: 'unitVersionId' in params.input ? params.input.unitVersionId : undefined,
    unitCostVnd: params.unitCostVnd,
    totalCostVnd: params.totalCostVnd,
    sourceDocument: params.input.sourceDocument,
    effectiveAt: deps.now().toISOString(),
    actorId: params.input.actorId ?? 'system',
    approverId: params.approverId,
    idempotencyKey: params.input.idempotencyKey,
    requiresCostReconciliation: params.requiresCostReconciliation,
  };
}

function calculateLineValue(quantityMilli: number, unitCostVnd: number): number {
  return Math.round((quantityMilli * unitCostVnd) / 1000);
}

function getAverageUnitCost(balance: InventoryBalanceDTO): number {
  if (balance.onHandMilli <= 0) {
    return 0;
  }

  return Math.round((balance.inventoryValueVnd * 1000) / balance.onHandMilli);
}

function resolveIssueUnitCost(
  balance: InventoryBalanceDTO,
  input: InventoryIssueForSaleRequest,
): number | undefined {
  const averageCost = getAverageUnitCost(balance);
  if (averageCost > 0) {
    return averageCost;
  }

  return input.negativeStockApproval?.temporaryUnitCostVnd;
}
