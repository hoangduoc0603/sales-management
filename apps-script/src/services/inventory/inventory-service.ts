import type { ApiErrorCode } from '@shared/contracts/errors';
import type {
  InventoryBalanceDTO,
  InventoryBalanceSummaryRequest,
  InventoryBalanceSummaryResponse,
  InventoryIssueForSaleRequest,
  InventoryLotBalanceDTO,
  InventoryMovementDTO,
  InventoryMovementResponse,
  InventoryPurchaseReturnRequest,
  InventoryReceiveRequest,
  InventoryReleaseRequest,
  InventoryReserveRequest,
  InventoryStocktakeApproveRequest,
  InventoryStocktakeOpenRequest,
  InventoryStocktakeResponse,
  InventoryStocktakeSubmitRequest,
  InventoryTransferApproveRequest,
  InventoryTransferCreateRequest,
  InventoryTransferReceiveRequest,
  InventoryTransferResponse,
  InventoryTransferShipRequest,
  InventoryReturnReceiveRequest,
  InventoryReturnRestockRequest,
  InventoryReturnScrapRequest,
  InventoryValueAdjustmentRequest,
  SerialStateDTO,
  StocktakeLineDTO,
  StocktakeSessionDTO,
  StockTransferLineDTO,
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
  createTransfer(input: InventoryTransferCreateRequest): InventoryServiceResult<InventoryTransferResponse>;
  approveTransfer(input: InventoryTransferApproveRequest): InventoryServiceResult<InventoryTransferResponse>;
  shipTransfer(input: InventoryTransferShipRequest): InventoryServiceResult<InventoryTransferResponse>;
  receiveTransfer(input: InventoryTransferReceiveRequest): InventoryServiceResult<InventoryTransferResponse>;
  openStocktake(input: InventoryStocktakeOpenRequest): InventoryServiceResult<InventoryStocktakeResponse>;
  submitStocktake(input: InventoryStocktakeSubmitRequest): InventoryServiceResult<InventoryStocktakeResponse>;
  approveStocktake(input: InventoryStocktakeApproveRequest): InventoryServiceResult<InventoryStocktakeResponse>;
  checkAvailability(input: InventoryAvailabilityCheckInput): readonly InventoryAvailabilityConflict[];
  warmBalances(input: { warehouseId: string; variantIds: readonly string[] }): number;
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

      const balancesByVariantId = new Map(
        deps.repository
          .getBalances(input.warehouseId, [...requiredByVariantId.keys()])
          .map((balance) => [balance.variantId, balance.availableMilli]),
      );
      const conflicts: InventoryAvailabilityConflict[] = [];
      for (const [variantId, required] of requiredByVariantId.entries()) {
        const availableMilli = balancesByVariantId.get(variantId) ?? 0;
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
    warmBalances(input) {
      const variantIds = [...new Set(input.variantIds)].slice(0, 20);
      deps.repository.getBalances(input.warehouseId, variantIds);
      return variantIds.length;
    },
    receive(input) {
      if (input.sourceDocument.sourceType === 'OpeningBalance' && hasMovementHistory(deps, input.warehouseId, input.variantId)) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Không thể nhập đầu kỳ khi hàng hóa đã có lịch sử tồn.' },
        };
      }
      if (input.serialId !== undefined && deps.repository.getSerialState(input.serialId) !== undefined) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Serial đã tồn tại trong hệ thống.' },
        };
      }

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

      const response = appendAndProject(movement, next);
      applyLotReceiveProjection(deps, input, movement);
      applySerialProjection(deps, input, movement, 'Saleable');

      return { ok: true, data: response };
    },
    purchaseReturn(input) {
      const lotGuard = validateLotAvailable(deps, input, false);
      if (lotGuard !== undefined) return lotGuard;
      const serialGuard = validateSerialForIssue(deps, input);
      if (serialGuard !== undefined) return serialGuard;

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

      const response = appendAndProject(movement, next);
      applyLotIssueProjection(deps, input, movement, { allowExpired: true, quarantine: false });
      applySerialProjection(deps, input, movement, 'ReturnedToSupplier');

      return { ok: true, data: response };
    },
    issueForSale(input) {
      const lotGuard = validateLotAvailable(deps, input, true);
      if (lotGuard !== undefined) return lotGuard;
      const serialGuard = validateSerialForIssue(deps, input);
      if (serialGuard !== undefined) return serialGuard;

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

      const response = appendAndProject(movement, next);
      applyLotIssueProjection(deps, input, movement, { allowExpired: false, quarantine: false });
      applySerialProjection(deps, input, movement, 'Sold');

      return { ok: true, data: response };
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
      if (input.serialId !== undefined) {
        const currentSerial = deps.repository.getSerialState(input.serialId);
        if (
          currentSerial !== undefined &&
          (currentSerial.variantId !== input.variantId || currentSerial.warehouseId !== input.warehouseId)
        ) {
          return {
            ok: false,
            error: { code: 'INVALID_INPUT', message: 'Serial trả hàng không khớp hàng/kho hiện tại.' },
          };
        }
      }

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

      const response = appendAndProject(movement, next);
      applyLotReceiveProjection(deps, input, movement, { quarantine: true });
      applySerialProjection(deps, input, movement, 'Quarantine');

      return { ok: true, data: response };
    },
    restockReturn(input) {
      const lotGuard = validateLotQuarantine(deps, input);
      if (lotGuard !== undefined) return lotGuard;

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

      const response = appendAndProject(movement, next);
      applyLotRestockProjection(deps, input, movement);
      applySerialProjection(deps, input, movement, 'Saleable');

      return { ok: true, data: response };
    },
    scrapReturn(input) {
      const lotGuard = validateLotQuarantine(deps, input);
      if (lotGuard !== undefined) return lotGuard;

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

      const response = appendAndProject(movement, next);
      applyLotScrapProjection(deps, input, movement);
      applySerialProjection(deps, input, movement, 'Scrapped');

      return { ok: true, data: response };
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
    createTransfer(input) {
      if (input.sourceWarehouseId === input.destinationWarehouseId) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Kho nguồn và kho đích phải khác nhau.' },
        };
      }

      const transferId = deps.newId('transfer');
      const now = deps.now().toISOString();
      const transfer = {
        transferId,
        tenantId: deps.tenantId,
        sourceWarehouseId: input.sourceWarehouseId,
        destinationWarehouseId: input.destinationWarehouseId,
        status: 'PendingApproval' as const,
        reasonCode: input.reasonCode,
        reasonNote: input.reasonNote,
        createdBy: input.actorId ?? 'system',
        createdAt: now,
      };
      const lines: StockTransferLineDTO[] = input.lines.map((line) => ({
        transferLineId: line.transferLineId ?? deps.newId('transfer-line'),
        transferId,
        variantId: line.variantId,
        quantityMilli: line.quantityMilli,
        receivedQuantityMilli: 0,
        unitVersionId: line.unitVersionId,
      }));

      deps.repository.saveStockTransfer(transfer);
      deps.repository.saveStockTransferLines(lines);

      return {
        ok: true,
        data: { transfer, lines },
      };
    },
    approveTransfer(input) {
      const transfer = deps.repository.getStockTransfer(input.transferId);
      if (transfer === undefined) {
        return { ok: false, error: { code: 'INVALID_INPUT', message: 'Không tìm thấy phiếu chuyển kho.' } };
      }
      if (transfer.status !== 'Draft' && transfer.status !== 'PendingApproval') {
        return { ok: false, error: { code: 'INVALID_INPUT', message: 'Phiếu chuyển không ở trạng thái chờ duyệt.' } };
      }

      const next = {
        ...transfer,
        status: 'Approved' as const,
        approvedBy: input.actorId ?? 'system',
        approvedAt: deps.now().toISOString(),
      };
      deps.repository.saveStockTransfer(next);

      return {
        ok: true,
        data: { transfer: next, lines: deps.repository.listStockTransferLines(input.transferId) },
      };
    },
    shipTransfer(input) {
      const transfer = deps.repository.getStockTransfer(input.transferId);
      if (transfer === undefined) {
        return { ok: false, error: { code: 'INVALID_INPUT', message: 'Không tìm thấy phiếu chuyển kho.' } };
      }
      if (transfer.status !== 'Approved') {
        return { ok: false, error: { code: 'INVALID_INPUT', message: 'Phiếu chuyển phải được duyệt trước khi xuất kho.' } };
      }

      const lines = deps.repository.listStockTransferLines(input.transferId);
      const movements: InventoryMovementDTO[] = [];
      const balances: InventoryBalanceDTO[] = [];
      const nextLines: StockTransferLineDTO[] = [];

      for (const line of lines) {
        const sourceBalance = getOrCreateBalance(transfer.sourceWarehouseId, line.variantId);
        if (sourceBalance.availableMilli < line.quantityMilli || sourceBalance.onHandMilli < line.quantityMilli) {
          return {
            ok: false,
            error: { code: 'INSUFFICIENT_STOCK', message: 'Không đủ tồn khả dụng để xuất chuyển kho.' },
          };
        }

        const unitCostVnd = getAverageUnitCost(sourceBalance);
        const transferValueVnd = Math.round((line.quantityMilli * sourceBalance.inventoryValueVnd) / sourceBalance.onHandMilli);
        const movement = createTransferMovement(deps, {
          command: input,
          movementType: 'TransferShip',
          warehouseId: transfer.sourceWarehouseId,
          variantId: line.variantId,
          quantityMilli: -line.quantityMilli,
          unitVersionId: line.unitVersionId,
          unitCostVnd,
          totalCostVnd: -transferValueVnd,
          transferId: transfer.transferId,
          transferLineId: line.transferLineId,
        });
        const nextBalance: InventoryBalanceDTO = {
          ...sourceBalance,
          onHandMilli: sourceBalance.onHandMilli - line.quantityMilli,
          availableMilli: sourceBalance.availableMilli - line.quantityMilli,
          inTransitMilli: sourceBalance.inTransitMilli + line.quantityMilli,
          inventoryValueVnd: sourceBalance.inventoryValueVnd - transferValueVnd,
          asOfMovementId: movement.movementId,
        };
        movements.push(movement);
        balances.push(nextBalance);
        nextLines.push({ ...line, unitCostVnd });
      }

      for (const movement of movements) deps.repository.appendNewMovement(movement);
      for (const balance of balances) deps.repository.applyProjection(balance);

      const nextTransfer = {
        ...transfer,
        status: 'Shipped' as const,
        shippedBy: input.actorId ?? 'system',
        shippedAt: deps.now().toISOString(),
      };
      deps.repository.saveStockTransfer(nextTransfer);
      deps.repository.saveStockTransferLines(nextLines);

      return { ok: true, data: { transfer: nextTransfer, lines: nextLines, movements, balances } };
    },
    receiveTransfer(input) {
      const transfer = deps.repository.getStockTransfer(input.transferId);
      if (transfer === undefined) {
        return { ok: false, error: { code: 'INVALID_INPUT', message: 'Không tìm thấy phiếu chuyển kho.' } };
      }
      if (transfer.status !== 'Shipped' && transfer.status !== 'PartiallyReceived') {
        return { ok: false, error: { code: 'INVALID_INPUT', message: 'Phiếu chuyển chưa ở trạng thái có thể nhận.' } };
      }

      const lines = deps.repository.listStockTransferLines(input.transferId);
      const receiveByLineId = new Map(input.receivedLines.map((line) => [line.transferLineId, line]));
      const movements: InventoryMovementDTO[] = [];
      const balances: InventoryBalanceDTO[] = [];
      const nextLines: StockTransferLineDTO[] = [];

      for (const line of lines) {
        const receiveLine = receiveByLineId.get(line.transferLineId);
        if (receiveLine === undefined) {
          nextLines.push(line);
          continue;
        }
        const remainingMilli = line.quantityMilli - line.receivedQuantityMilli;
        if (receiveLine.receivedQuantityMilli > remainingMilli) {
          return {
            ok: false,
            error: { code: 'INVALID_INPUT', message: 'Số lượng nhận vượt lượng còn đang chuyển.' },
          };
        }
        const unitCostVnd = line.unitCostVnd ?? 0;
        const receivedValueVnd = calculateLineValue(receiveLine.receivedQuantityMilli, unitCostVnd);
        const sourceBalance = getOrCreateBalance(transfer.sourceWarehouseId, line.variantId);
        const destinationBalance = getOrCreateBalance(transfer.destinationWarehouseId, line.variantId);
        const movement = createTransferMovement(deps, {
          command: input,
          movementType: 'TransferReceive',
          warehouseId: transfer.destinationWarehouseId,
          variantId: line.variantId,
          quantityMilli: receiveLine.receivedQuantityMilli,
          unitVersionId: line.unitVersionId,
          unitCostVnd,
          totalCostVnd: receivedValueVnd,
          transferId: transfer.transferId,
          transferLineId: line.transferLineId,
        });
        const nextSourceBalance: InventoryBalanceDTO = {
          ...sourceBalance,
          inTransitMilli: Math.max(0, sourceBalance.inTransitMilli - receiveLine.receivedQuantityMilli),
          asOfMovementId: movement.movementId,
        };
        const nextDestinationBalance: InventoryBalanceDTO = {
          ...destinationBalance,
          onHandMilli: destinationBalance.onHandMilli + receiveLine.receivedQuantityMilli,
          availableMilli: destinationBalance.availableMilli + receiveLine.receivedQuantityMilli,
          inventoryValueVnd: destinationBalance.inventoryValueVnd + receivedValueVnd,
          asOfMovementId: movement.movementId,
        };
        movements.push(movement);
        balances.push(nextSourceBalance, nextDestinationBalance);
        nextLines.push({
          ...line,
          receivedQuantityMilli: line.receivedQuantityMilli + receiveLine.receivedQuantityMilli,
          varianceReasonCode: receiveLine.varianceReasonCode ?? line.varianceReasonCode,
          varianceNote: receiveLine.varianceNote ?? line.varianceNote,
        });
      }

      for (const movement of movements) deps.repository.appendNewMovement(movement);
      for (const balance of balances) deps.repository.applyProjection(balance);

      const hasRemaining = nextLines.some((line) => line.receivedQuantityMilli < line.quantityMilli);
      const nextTransfer = {
        ...transfer,
        status: hasRemaining ? ('PartiallyReceived' as const) : ('Received' as const),
        receivedBy: input.actorId ?? 'system',
        receivedAt: deps.now().toISOString(),
      };
      deps.repository.saveStockTransfer(nextTransfer);
      deps.repository.saveStockTransferLines(nextLines);

      return { ok: true, data: { transfer: nextTransfer, lines: nextLines, movements, balances } };
    },
    openStocktake(input) {
      const now = deps.now().toISOString();
      const stocktakeSessionId = deps.newId('stocktake');
      const balances = deps.repository
        .listBalances(input.warehouseId)
        .filter((balance) => input.scopeVariantIds === undefined || input.scopeVariantIds.includes(balance.variantId));
      const session = {
        stocktakeSessionId,
        tenantId: deps.tenantId,
        warehouseId: input.warehouseId,
        status: 'InProgress' as const,
        snapshotAt: now,
        scopeVariantIds: input.scopeVariantIds,
        createdBy: input.actorId ?? 'system',
        createdAt: now,
      };
      const lines: StocktakeLineDTO[] = balances.map((balance) => ({
        stocktakeLineId: deps.newId('stocktake-line'),
        stocktakeSessionId,
        variantId: balance.variantId,
        snapshotQuantityMilli: balance.onHandMilli,
        movementsAfterSnapshotCount: 0,
      }));

      deps.repository.saveStocktakeSession(session);
      deps.repository.saveStocktakeLines(lines);

      return { ok: true, data: { session, lines } };
    },
    submitStocktake(input) {
      const session = deps.repository.getStocktakeSession(input.stocktakeSessionId);
      if (session === undefined) {
        return { ok: false, error: { code: 'INVALID_INPUT', message: 'Không tìm thấy phiên kiểm kho.' } };
      }
      if (session.status !== 'InProgress') {
        return { ok: false, error: { code: 'INVALID_INPUT', message: 'Phiên kiểm kho không ở trạng thái đang kiểm.' } };
      }

      const submitByLineId = new Map(input.lines.map((line) => [line.stocktakeLineId, line]));
      const nextLines = deps.repository.listStocktakeLines(input.stocktakeSessionId).map((line) => {
        const submitted = submitByLineId.get(line.stocktakeLineId);
        if (submitted === undefined) return line;
        const varianceMilli = submitted.countedQuantityMilli - line.snapshotQuantityMilli;
        return {
          ...line,
          countedQuantityMilli: submitted.countedQuantityMilli,
          varianceMilli,
          reasonCode: submitted.reasonCode ?? line.reasonCode,
          reasonNote: submitted.reasonNote ?? line.reasonNote,
          movementsAfterSnapshotCount: countMovementsAfterSnapshot(deps, session, line),
        };
      });
      const nextSession = {
        ...session,
        status: 'Submitted' as const,
        submittedBy: input.actorId ?? 'system',
        submittedAt: deps.now().toISOString(),
      };
      deps.repository.saveStocktakeSession(nextSession);
      deps.repository.saveStocktakeLines(nextLines);

      return { ok: true, data: { session: nextSession, lines: nextLines } };
    },
    approveStocktake(input) {
      const session = deps.repository.getStocktakeSession(input.stocktakeSessionId);
      if (session === undefined) {
        return { ok: false, error: { code: 'INVALID_INPUT', message: 'Không tìm thấy phiên kiểm kho.' } };
      }
      if (session.status !== 'Submitted') {
        return { ok: false, error: { code: 'INVALID_INPUT', message: 'Phiên kiểm kho phải được gửi duyệt trước.' } };
      }

      const movements: InventoryMovementDTO[] = [];
      const balances: InventoryBalanceDTO[] = [];
      const lines = deps.repository.listStocktakeLines(input.stocktakeSessionId);
      for (const line of lines) {
        const varianceMilli = line.varianceMilli ?? 0;
        if (varianceMilli === 0) continue;
        const current = getOrCreateBalance(session.warehouseId, line.variantId);
        const unitCostVnd = getAverageUnitCost(current);
        const adjustmentValueVnd = calculateLineValue(Math.abs(varianceMilli), unitCostVnd);
        if (varianceMilli < 0 && (current.availableMilli < Math.abs(varianceMilli) || current.onHandMilli < Math.abs(varianceMilli))) {
          return {
            ok: false,
            error: { code: 'INSUFFICIENT_STOCK', message: 'Không đủ tồn hiện hành để duyệt chênh giảm kiểm kho.' },
          };
        }
        const signedValueVnd = varianceMilli < 0 ? -adjustmentValueVnd : adjustmentValueVnd;
        const movement = createStocktakeMovement(deps, {
          command: input,
          session,
          line,
          quantityMilli: varianceMilli,
          unitCostVnd,
          totalCostVnd: signedValueVnd,
        });
        const nextBalance: InventoryBalanceDTO = {
          ...current,
          onHandMilli: current.onHandMilli + varianceMilli,
          availableMilli: current.availableMilli + varianceMilli,
          inventoryValueVnd: current.inventoryValueVnd + signedValueVnd,
          asOfMovementId: movement.movementId,
        };
        movements.push(movement);
        balances.push(nextBalance);
      }

      for (const movement of movements) deps.repository.appendNewMovement(movement);
      for (const balance of balances) deps.repository.applyProjection(balance);

      const nextSession = {
        ...session,
        status: 'Approved' as const,
        approvedBy: input.actorId ?? 'system',
        approvedAt: deps.now().toISOString(),
      };
      deps.repository.saveStocktakeSession(nextSession);

      return { ok: true, data: { session: nextSession, lines, movements, balances } };
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
    lotId: 'lotId' in params.input ? params.input.lotId : undefined,
    serialId: 'serialId' in params.input ? params.input.serialId : undefined,
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

function createTransferMovement(
  deps: InventoryServiceDependencies,
  params: {
    command: InventoryTransferShipRequest | InventoryTransferReceiveRequest;
    movementType: 'TransferShip' | 'TransferReceive';
    warehouseId: string;
    variantId: string;
    quantityMilli: number;
    unitVersionId?: string;
    unitCostVnd: number;
    totalCostVnd: number;
    transferId: string;
    transferLineId: string;
  },
): InventoryMovementDTO {
  return {
    movementId: deps.newId('movement'),
    tenantId: deps.tenantId,
    movementType: params.movementType,
    warehouseId: params.warehouseId,
    variantId: params.variantId,
    quantityMilli: params.quantityMilli,
    unitVersionId: params.unitVersionId,
    unitCostVnd: params.unitCostVnd,
    totalCostVnd: params.totalCostVnd,
    sourceDocument: {
      sourceType: 'StockTransfer',
      sourceId: params.transferId,
      sourceLineId: params.transferLineId,
    },
    effectiveAt: deps.now().toISOString(),
    actorId: params.command.actorId ?? 'system',
    idempotencyKey: params.command.idempotencyKey,
  };
}

function createStocktakeMovement(
  deps: InventoryServiceDependencies,
  params: {
    command: InventoryStocktakeApproveRequest;
    session: StocktakeSessionDTO;
    line: StocktakeLineDTO;
    quantityMilli: number;
    unitCostVnd: number;
    totalCostVnd: number;
  },
): InventoryMovementDTO {
  return {
    movementId: deps.newId('movement'),
    tenantId: deps.tenantId,
    movementType: 'CountAdjustment',
    warehouseId: params.session.warehouseId,
    variantId: params.line.variantId,
    lotId: params.line.lotId,
    serialId: params.line.serialId,
    quantityMilli: params.quantityMilli,
    unitCostVnd: params.unitCostVnd,
    totalCostVnd: params.totalCostVnd,
    sourceDocument: {
      sourceType: 'StocktakeSession',
      sourceId: params.session.stocktakeSessionId,
      sourceLineId: params.line.stocktakeLineId,
    },
    effectiveAt: deps.now().toISOString(),
    actorId: params.command.actorId ?? 'system',
    approverId: params.command.actorId,
    idempotencyKey: params.command.idempotencyKey,
  };
}

function countMovementsAfterSnapshot(
  deps: InventoryServiceDependencies,
  session: StocktakeSessionDTO,
  line: StocktakeLineDTO,
): number {
  const snapshotAt = Date.parse(session.snapshotAt);
  return deps.repository
    .listMovements()
    .filter(
      (movement) =>
        movement.warehouseId === session.warehouseId &&
        movement.variantId === line.variantId &&
        Date.parse(movement.effectiveAt) > snapshotAt,
    ).length;
}

function hasMovementHistory(deps: InventoryServiceDependencies, warehouseId: string, variantId: string): boolean {
  return deps.repository
    .listMovements()
    .some((movement) => movement.warehouseId === warehouseId && movement.variantId === variantId);
}

type MovementGuardResult = Extract<InventoryServiceResult<InventoryMovementResponse>, { ok: false }>;

function validateLotAvailable(
  deps: InventoryServiceDependencies,
  input: Pick<InventoryIssueForSaleRequest, 'warehouseId' | 'variantId' | 'quantityMilli' | 'lotId'>,
  blockExpired: boolean,
): MovementGuardResult | undefined {
  if (input.lotId === undefined) return undefined;
  const lotBalance = deps.repository.getLotBalance(input.warehouseId, input.variantId, input.lotId);
  if (lotBalance === undefined) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: 'Không tìm thấy lô trong kho hiện tại.' } };
  }
  if (blockExpired && isExpired(lotBalance.expiryDate, deps.now())) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: 'Không được xuất lô đã hết hạn.' } };
  }
  if (lotBalance.availableMilli < input.quantityMilli || lotBalance.onHandMilli < input.quantityMilli) {
    return { ok: false, error: { code: 'INSUFFICIENT_STOCK', message: 'Không đủ tồn khả dụng theo lô.' } };
  }
  return undefined;
}

function validateLotQuarantine(
  deps: InventoryServiceDependencies,
  input: Pick<InventoryReturnRestockRequest, 'warehouseId' | 'variantId' | 'quantityMilli' | 'lotId'>,
): MovementGuardResult | undefined {
  if (input.lotId === undefined) return undefined;
  const lotBalance = deps.repository.getLotBalance(input.warehouseId, input.variantId, input.lotId);
  if (lotBalance === undefined) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: 'Không tìm thấy lô trong kho hiện tại.' } };
  }
  if (lotBalance.quarantineMilli < input.quantityMilli || lotBalance.onHandMilli < input.quantityMilli) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: 'Không đủ tồn quarantine theo lô.' } };
  }
  return undefined;
}

function validateSerialForIssue(
  deps: InventoryServiceDependencies,
  input: Pick<InventoryIssueForSaleRequest, 'warehouseId' | 'variantId' | 'quantityMilli' | 'serialId'>,
): MovementGuardResult | undefined {
  if (input.serialId === undefined) return undefined;
  if (input.quantityMilli !== 1_000) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: 'Serial chỉ được xuất từng đơn vị.' } };
  }
  const serialState = deps.repository.getSerialState(input.serialId);
  if (serialState === undefined) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: 'Không tìm thấy serial.' } };
  }
  if (
    serialState.status !== 'Saleable' ||
    serialState.warehouseId !== input.warehouseId ||
    serialState.variantId !== input.variantId
  ) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: 'Serial không ở trạng thái có thể bán.' } };
  }
  return undefined;
}

function applyLotReceiveProjection(
  deps: InventoryServiceDependencies,
  input: Pick<
    InventoryReceiveRequest | InventoryReturnReceiveRequest,
    'warehouseId' | 'variantId' | 'quantityMilli' | 'lotId' | 'lotCode' | 'expiryDate'
  >,
  movement: InventoryMovementDTO,
  options: { quarantine?: boolean } = {},
): void {
  if (input.lotId === undefined) return;
  const current = getOrCreateLotBalance(deps, input);
  deps.repository.applyLotProjection({
    ...current,
    onHandMilli: current.onHandMilli + input.quantityMilli,
    availableMilli: options.quarantine === true ? current.availableMilli : current.availableMilli + input.quantityMilli,
    quarantineMilli: options.quarantine === true ? current.quarantineMilli + input.quantityMilli : current.quarantineMilli,
    asOfMovementId: movement.movementId,
  });
}

function applyLotIssueProjection(
  deps: InventoryServiceDependencies,
  input: Pick<InventoryIssueForSaleRequest, 'warehouseId' | 'variantId' | 'quantityMilli' | 'lotId'>,
  movement: InventoryMovementDTO,
  options: { allowExpired: boolean; quarantine: boolean },
): void {
  if (input.lotId === undefined) return;
  const current = deps.repository.getLotBalance(input.warehouseId, input.variantId, input.lotId);
  if (current === undefined) return;
  deps.repository.applyLotProjection({
    ...current,
    onHandMilli: current.onHandMilli - input.quantityMilli,
    availableMilli: options.quarantine ? current.availableMilli : current.availableMilli - input.quantityMilli,
    quarantineMilli: options.quarantine ? current.quarantineMilli - input.quantityMilli : current.quarantineMilli,
    asOfMovementId: movement.movementId,
  });
}

function applyLotRestockProjection(
  deps: InventoryServiceDependencies,
  input: Pick<InventoryReturnRestockRequest, 'warehouseId' | 'variantId' | 'quantityMilli' | 'lotId'>,
  movement: InventoryMovementDTO,
): void {
  if (input.lotId === undefined) return;
  const current = deps.repository.getLotBalance(input.warehouseId, input.variantId, input.lotId);
  if (current === undefined) return;
  deps.repository.applyLotProjection({
    ...current,
    availableMilli: current.availableMilli + input.quantityMilli,
    quarantineMilli: current.quarantineMilli - input.quantityMilli,
    asOfMovementId: movement.movementId,
  });
}

function applyLotScrapProjection(
  deps: InventoryServiceDependencies,
  input: Pick<InventoryReturnScrapRequest, 'warehouseId' | 'variantId' | 'quantityMilli' | 'lotId'>,
  movement: InventoryMovementDTO,
): void {
  applyLotIssueProjection(deps, input, movement, { allowExpired: true, quarantine: true });
}

function applySerialProjection(
  deps: InventoryServiceDependencies,
  input: Pick<InventoryReceiveRequest, 'warehouseId' | 'variantId' | 'serialId'> & {
    sourceDocument?: { sourceLineId?: string };
  },
  movement: InventoryMovementDTO,
  status: SerialStateDTO['status'],
): void {
  if (input.serialId === undefined) return;
  deps.repository.saveSerialState({
    serialId: input.serialId,
    tenantId: deps.tenantId,
    warehouseId: input.warehouseId,
    variantId: input.variantId,
    status,
    sourceMovementId: movement.movementId,
    sourceSaleLineId: status === 'Sold' ? input.sourceDocument?.sourceLineId : undefined,
    updatedAt: movement.effectiveAt,
  });
}

function getOrCreateLotBalance(
  deps: InventoryServiceDependencies,
  input: Pick<
    InventoryReceiveRequest | InventoryReturnReceiveRequest,
    'warehouseId' | 'variantId' | 'lotId' | 'lotCode' | 'expiryDate'
  >,
): InventoryLotBalanceDTO {
  if (input.lotId === undefined) {
    throw new Error('lotId is required to create lot balance.');
  }
  return (
    deps.repository.getLotBalance(input.warehouseId, input.variantId, input.lotId) ?? {
      lotBalanceId: `lot-balance-${input.warehouseId}-${input.variantId}-${input.lotId}`,
      tenantId: deps.tenantId,
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      lotId: input.lotId,
      lotCode: input.lotCode ?? input.lotId,
      expiryDate: input.expiryDate,
      onHandMilli: 0,
      availableMilli: 0,
      quarantineMilli: 0,
    }
  );
}

function isExpired(expiryDate: string | undefined, now: Date): boolean {
  if (expiryDate === undefined) return false;
  return expiryDate < now.toISOString().slice(0, 10);
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
