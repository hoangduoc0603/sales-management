import type { ApiErrorCode } from '@shared/contracts/errors';
import type { CustomerCreditDTO, FinancePaymentRecordResponse } from '@shared/contracts/finance/finance';
import type { InventoryMovementResponse } from '@shared/contracts/inventory/inventory';
import type { CatalogService } from '../catalog/catalog-service';
import { createPricingService } from '../catalog/pricing-service';
import type { FinanceService } from '../finance/finance-service';
import type { InventoryService } from '../inventory/inventory-service';
import type { CommandCoordinator } from '../platform/command/command-coordinator';
import type { FinanceRepository } from '../../repositories/finance/finance-repository';
import type { SalesRepository } from '../../repositories/sales/sales-repository';
import { recordStage } from '../../api/performance-tracker';
import type {
  ReceiptFormat,
  ReceiptSnapshotDTO,
  SaleOrderDTO,
  SaleOrderLineDTO,
  SalePaymentStatus,
  SalesOnlineCancelRequest,
  SalesOnlineTransitionRequest,
  SalesOnlineTransitionResponse,
  SalesOrderDetailRequest,
  SalesOrderDetailResponse,
  SalesOrderListRequest,
  SalesOrderListResponse,
  SalesReturnCreateRequest,
  SalesReturnCreateResponse,
  SalesReturnDTO,
  SalesReturnLineDTO,
  SalesReturnResolveRequest,
  SalesReturnResolveResponse,
  SalesDraftCancelRequest,
  SalesDraftCancelResponse,
  SalesDraftListResponse,
  SalesDraftOpenRequest,
  SalesDraftSaveRequest,
  SalesDraftSaveResponse,
  SalesExchangeCreateRequest,
  SalesExchangeCreateResponse,
  SalesPosCompleteRequest,
  SalesPosCompleteResponse,
  SalesWarrantyOpenRequest,
  SalesWarrantyResponse,
  SalesWarrantyTransitionRequest,
  WarrantyCaseDTO,
} from '@shared/contracts/sales/sales';

type SalesServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ApiErrorCode;
        message: string;
        details?: Record<string, string>;
      };
    };
type SalesServiceFailure = Extract<SalesServiceResult<never>, { ok: false }>;

type CatalogPosProjection = ReturnType<CatalogService['getPosProjection']>;

export interface SalesService {
  saveDraft(input: SalesDraftSaveRequest): SalesServiceResult<SalesDraftSaveResponse>;
  listDrafts(input: SalesDraftOpenRequest): SalesDraftListResponse;
  cancelDraft(input: SalesDraftCancelRequest): SalesServiceResult<SalesDraftCancelResponse>;
  completePosSale(input: SalesPosCompleteRequest): SalesServiceResult<SalesPosCompleteResponse>;
  listOrders(input: SalesOrderListRequest): SalesOrderListResponse;
  getOrder(input: SalesOrderDetailRequest): SalesOrderDetailResponse | undefined;
  confirmOnline(input: SalesOnlineTransitionRequest): SalesServiceResult<SalesOnlineTransitionResponse>;
  startPackingOnline(input: SalesOnlineTransitionRequest): SalesServiceResult<SalesOnlineTransitionResponse>;
  shipOnline(input: SalesOnlineTransitionRequest): SalesServiceResult<SalesOnlineTransitionResponse>;
  deliverOnline(input: SalesOnlineTransitionRequest): SalesServiceResult<SalesOnlineTransitionResponse>;
  cancelOnline(input: SalesOnlineCancelRequest): SalesServiceResult<SalesOnlineTransitionResponse>;
  createReturn(input: SalesReturnCreateRequest): SalesServiceResult<SalesReturnCreateResponse>;
  resolveReturn(input: SalesReturnResolveRequest): SalesServiceResult<SalesReturnResolveResponse>;
  createExchange(input: SalesExchangeCreateRequest): SalesServiceResult<SalesExchangeCreateResponse>;
  openWarranty(input: SalesWarrantyOpenRequest): SalesServiceResult<SalesWarrantyResponse>;
  transitionWarranty(input: SalesWarrantyTransitionRequest): SalesServiceResult<SalesWarrantyResponse>;
}

export interface SalesServiceDependencies {
  repository: SalesRepository;
  catalogService: CatalogService;
  inventoryService: InventoryService;
  financeService: FinanceService;
  financeRepository: FinanceRepository;
  commandCoordinator: CommandCoordinator;
  tenantId: string;
  now: () => Date;
  newId(prefix: string): string;
  requireOpenShift?: boolean;
}

export function createSalesService(deps: SalesServiceDependencies): SalesService {
  return {
    saveDraft(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => {
          const response = buildDraftResponse(deps, input);
          deps.repository.saveOrder(response.order);
          deps.repository.saveLines(response.order.saleOrderId, response.lines);
          deps.repository.saveTenders(response.order.saleOrderId, response.tenders);
          return { ok: true, data: response } satisfies SalesServiceResult<SalesDraftSaveResponse>;
        },
        { actorId: input.cashierId, action: 'sales.draft.save' },
      );
    },
    listDrafts(input) {
      return {
        drafts: deps.repository.listDrafts(input).map((order) => ({
          order,
          lines: deps.repository.getLines(order.saleOrderId),
          tenders: deps.repository.getTenders(order.saleOrderId),
        })),
      };
    },
    cancelDraft(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => {
          const order = deps.repository.getOrder(input.draftId);
          if (order === undefined || order.status !== 'Draft') {
            return failure('INVALID_INPUT', 'Chỉ có thể hủy phiếu nháp đang mở.');
          }

          const now = deps.now().toISOString();
          const next: SaleOrderDTO = {
            ...order,
            status: 'Cancelled',
            updatedAt: now,
            cancelledAt: now,
            note: input.reason ?? order.note,
          };
          deps.repository.saveOrder(next);
          return { ok: true, data: { order: next } } satisfies SalesServiceResult<SalesDraftCancelResponse>;
        },
        { actorId: 'system', action: 'sales.draft.cancel' },
      );
    },
    completePosSale(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => completePosSale(deps, input),
        { actorId: input.cashierId, action: 'sales.pos.complete' },
      );
    },
    listOrders(input) {
      return {
        generatedAt: deps.now().toISOString(),
        orders: deps.repository.listOrders(input).slice(0, input.limit ?? 50).map((order) => ({
          order,
          lineCount: deps.repository.getLines(order.saleOrderId).length,
          returnedLineCount: deps.repository.listReturns(order.saleOrderId).reduce((sum, returnOrder) => sum + returnOrder.lines.length, 0),
          warrantyCaseCount: deps.repository.listWarrantyCases(order.saleOrderId).length,
        })),
      };
    },
    getOrder(input) {
      const order = deps.repository.getOrder(input.saleOrderId);
      if (order === undefined) return undefined;
      return {
        order,
        lines: deps.repository.getLines(order.saleOrderId),
        tenders: deps.repository.getTenders(order.saleOrderId),
        receipt: deps.repository.getReceiptByOrderId(order.saleOrderId),
        returns: deps.repository.listReturns(order.saleOrderId),
        warrantyCases: deps.repository.listWarrantyCases(order.saleOrderId),
      };
    },
    confirmOnline(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => confirmOnline(deps, input),
        { actorId: input.actorId, action: 'sales.online.confirm' },
      );
    },
    startPackingOnline(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => transitionOnlineWithoutLedger(deps, input, ['Confirmed'], 'Packing', 'packingAt'),
        { actorId: input.actorId, action: 'sales.online.startPacking' },
      );
    },
    shipOnline(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => shipOnline(deps, input),
        { actorId: input.actorId, action: 'sales.online.ship' },
      );
    },
    deliverOnline(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => transitionOnlineWithoutLedger(deps, input, ['Shipped'], 'Delivered', 'deliveredAt'),
        { actorId: input.actorId, action: 'sales.online.deliver' },
      );
    },
    cancelOnline(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => cancelOnline(deps, input),
        { actorId: input.actorId, action: 'sales.online.cancel' },
      );
    },
    createReturn(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => createReturn(deps, input),
        { actorId: input.actorId, action: 'sales.return.create' },
      );
    },
    resolveReturn(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => resolveReturn(deps, input),
        { actorId: input.actorId, action: 'sales.return.resolve' },
      );
    },
    createExchange(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => createExchange(deps, input),
        { actorId: input.actorId, action: 'sales.exchange.create' },
      );
    },
    openWarranty(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => openWarranty(deps, input),
        { actorId: input.actorId, action: 'sales.warranty.open' },
      );
    },
    transitionWarranty(input) {
      return deps.commandCoordinator.run(
        toCommand(input),
        () => transitionWarranty(deps, input),
        { actorId: input.actorId, action: 'sales.warranty.transition' },
      );
    },
  };
}

function confirmOnline(
  deps: SalesServiceDependencies,
  input: SalesOnlineTransitionRequest,
): SalesServiceResult<SalesOnlineTransitionResponse> {
  const order = deps.repository.getOrder(input.saleOrderId);
  if (order === undefined || order.source !== 'ManualOnline' || order.status !== 'Draft') {
    return failure('INVALID_INPUT', 'Chỉ đơn online nháp mới được xác nhận.');
  }

  const movements = [];
  for (const line of deps.repository.getLines(order.saleOrderId)) {
    const reserved = deps.inventoryService.reserve({
      commandId: `${input.commandId}-${line.saleOrderLineId}-reserve`,
      idempotencyKey: `${input.idempotencyKey}-${line.saleOrderLineId}-reserve`,
      warehouseId: order.warehouseId,
      variantId: line.variantId,
      quantityMilli: line.quantityMilli,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: order.saleOrderId, sourceLineId: line.saleOrderLineId },
      actorId: input.actorId,
    });
    if (!reserved.ok) return failure(reserved.error.code, reserved.error.message);
    movements.push(reserved.data);
  }

  const now = deps.now().toISOString();
  const next: SaleOrderDTO = {
    ...order,
    status: 'Confirmed',
    updatedAt: now,
    confirmedAt: now,
    note: input.note ?? order.note,
  };
  deps.repository.saveOrder(next);
  return { ok: true, data: { order: next, inventoryMovements: movements } };
}

function transitionOnlineWithoutLedger(
  deps: SalesServiceDependencies,
  input: SalesOnlineTransitionRequest,
  allowed: readonly SaleOrderDTO['status'][],
  nextStatus: SaleOrderDTO['status'],
  timestampField: 'packingAt' | 'deliveredAt',
): SalesServiceResult<SalesOnlineTransitionResponse> {
  const order = deps.repository.getOrder(input.saleOrderId);
  if (order === undefined || order.source !== 'ManualOnline' || !allowed.includes(order.status)) {
    return failure('INVALID_INPUT', 'Trạng thái đơn online không hợp lệ cho thao tác này.');
  }

  const now = deps.now().toISOString();
  const next: SaleOrderDTO = {
    ...order,
    status: nextStatus,
    updatedAt: now,
    [timestampField]: now,
    note: input.note ?? order.note,
  };
  deps.repository.saveOrder(next);
  return { ok: true, data: { order: next, inventoryMovements: [] } };
}

function shipOnline(
  deps: SalesServiceDependencies,
  input: SalesOnlineTransitionRequest,
): SalesServiceResult<SalesOnlineTransitionResponse> {
  const order = deps.repository.getOrder(input.saleOrderId);
  if (order === undefined || order.source !== 'ManualOnline' || !['Confirmed', 'Packing'].includes(order.status)) {
    return failure('INVALID_INPUT', 'Chỉ đơn online đã xác nhận/đang soạn mới được xuất giao.');
  }

  const movements = [];
  for (const line of deps.repository.getLines(order.saleOrderId)) {
    const released = deps.inventoryService.release({
      commandId: `${input.commandId}-${line.saleOrderLineId}-release`,
      idempotencyKey: `${input.idempotencyKey}-${line.saleOrderLineId}-release`,
      warehouseId: order.warehouseId,
      variantId: line.variantId,
      quantityMilli: line.quantityMilli,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: order.saleOrderId, sourceLineId: line.saleOrderLineId },
      actorId: input.actorId,
    });
    if (!released.ok) return failure(released.error.code, released.error.message);
    movements.push(released.data);

    const issue = deps.inventoryService.issueForSale({
      commandId: `${input.commandId}-${line.saleOrderLineId}-issue`,
      idempotencyKey: `${input.idempotencyKey}-${line.saleOrderLineId}-issue`,
      warehouseId: order.warehouseId,
      variantId: line.variantId,
      quantityMilli: line.quantityMilli,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: order.saleOrderId, sourceLineId: line.saleOrderLineId },
      actorId: input.actorId,
    });
    if (!issue.ok) return failure(issue.error.code, issue.error.message);
    movements.push(issue.data);
  }

  const receivable =
    order.totalVnd > order.paidVnd
      ? deps.financeService.createReceivable({
          branchId: order.branchId,
          customerId: order.customerId ?? 'walk-in',
          sourceDocument: { sourceType: 'SaleOrder', sourceId: order.saleOrderId },
          amountVnd: order.totalVnd - order.paidVnd,
        })
      : undefined;
  const now = deps.now().toISOString();
  const next: SaleOrderDTO = {
    ...order,
    status: 'Shipped',
    paymentStatus: resolvePaymentStatus(order.totalVnd, order.paidVnd),
    receivableVnd: Math.max(0, order.totalVnd - order.paidVnd),
    updatedAt: now,
    shippedAt: now,
  };
  deps.repository.saveOrder(next);
  return { ok: true, data: { order: next, inventoryMovements: movements, receivable } };
}

function cancelOnline(
  deps: SalesServiceDependencies,
  input: SalesOnlineCancelRequest,
): SalesServiceResult<SalesOnlineTransitionResponse> {
  const order = deps.repository.getOrder(input.saleOrderId);
  if (order === undefined || order.source !== 'ManualOnline' || !['Draft', 'Confirmed', 'Packing'].includes(order.status)) {
    return failure('INVALID_INPUT', 'Chỉ được hủy đơn online trước khi xuất giao.');
  }

  const movements = [];
  if (order.status === 'Confirmed' || order.status === 'Packing') {
    for (const line of deps.repository.getLines(order.saleOrderId)) {
      const released = deps.inventoryService.release({
        commandId: `${input.commandId}-${line.saleOrderLineId}-release`,
        idempotencyKey: `${input.idempotencyKey}-${line.saleOrderLineId}-release`,
        warehouseId: order.warehouseId,
        variantId: line.variantId,
        quantityMilli: line.quantityMilli,
        sourceDocument: { sourceType: 'SaleOrder', sourceId: order.saleOrderId, sourceLineId: line.saleOrderLineId },
        actorId: input.actorId,
      });
      if (!released.ok) return failure(released.error.code, released.error.message);
      movements.push(released.data);
    }
  }

  const depositResult = handleCancelledOnlineDeposit(deps, order, input);
  if (!depositResult.ok) return depositResult;

  const now = deps.now().toISOString();
  const next: SaleOrderDTO = {
    ...order,
    status: 'Cancelled',
    updatedAt: now,
    cancelledAt: now,
    note: input.reason,
  };
  deps.repository.saveOrder(next);
  return {
    ok: true,
    data: {
      order: next,
      inventoryMovements: movements,
      customerCredit: depositResult.customerCredit,
      financeResult: depositResult.financeResult,
    },
  };
}

function handleCancelledOnlineDeposit(
  deps: SalesServiceDependencies,
  order: SaleOrderDTO,
  input: SalesOnlineCancelRequest,
):
  | {
      ok: true;
      customerCredit?: CustomerCreditDTO;
      financeResult?: FinancePaymentRecordResponse;
    }
  | SalesServiceFailure {
  if (order.paidVnd <= 0) return { ok: true };

  const treatment = input.depositTreatment ?? 'KeepCustomerCredit';
  if (treatment === 'KeepCustomerCredit') {
    if (order.customerId === undefined) {
      return failure('INVALID_INPUT', 'Giữ tiền cọc thành tín dụng khách cần có khách hàng trên đơn.');
    }

    return {
      ok: true,
      customerCredit: deps.financeService.createCustomerCreditFromSource({
        branchId: order.branchId,
        customerId: order.customerId,
        sourceDocument: { sourceType: 'SaleOrder', sourceId: order.saleOrderId },
        amountVnd: order.paidVnd,
      }),
    };
  }

  if (input.cashDrawerId === undefined || input.paymentMethodId === undefined || input.approverId === undefined) {
    return failure('INVALID_INPUT', 'Hoàn tiền cọc cần quỹ, phương thức thanh toán và người duyệt.');
  }

  const refunded = deps.financeService.recordRefund({
    commandId: `${input.commandId}-deposit-refund`,
    idempotencyKey: `${input.idempotencyKey}-deposit-refund`,
    branchId: order.branchId,
    cashDrawerId: input.cashDrawerId,
    paymentMethodId: input.paymentMethodId,
    amountVnd: order.paidVnd,
    payeeType: order.customerId === undefined ? 'Other' : 'Customer',
    payeeId: order.customerId,
    sourceDocument: { sourceType: 'SaleOrder', sourceId: order.saleOrderId },
    shiftId: input.shiftId,
    approverId: input.approverId,
  });
  if (!refunded.ok) return failure(refunded.error.code, refunded.error.message);

  return { ok: true, financeResult: refunded.data };
}

function createReturn(
  deps: SalesServiceDependencies,
  input: SalesReturnCreateRequest,
): SalesServiceResult<SalesReturnCreateResponse> {
  if (input.fastReturn === true && input.fastReturnApproved !== true) {
    return failure('PERMISSION_DENIED', 'Trả nhanh không có đơn gốc cần quyền hoặc phê duyệt riêng.');
  }

  const sourceOrder = input.sourceSaleOrderId === undefined ? undefined : deps.repository.getOrder(input.sourceSaleOrderId);
  const sourceLines = sourceOrder === undefined ? [] : deps.repository.getLines(sourceOrder.saleOrderId);
  if (
    input.sourceSaleOrderId !== undefined &&
    (sourceOrder === undefined || !['Completed', 'Shipped', 'Delivered'].includes(sourceOrder.status))
  ) {
    return failure('INVALID_INPUT', 'Return phải tham chiếu đơn đã hoàn tất hoặc đã xuất giao.');
  }

  for (const line of input.lines) {
    if (sourceOrder === undefined) continue;
    const sourceLine = sourceLines.find((candidate) => candidate.saleOrderLineId === line.sourceSaleLineId);
    if (sourceLine === undefined) return failure('INVALID_INPUT', 'Dòng trả hàng không khớp dòng bán gốc.');

    const alreadyReturned = deps.repository
      .listReturns(sourceOrder.saleOrderId)
      .flatMap((returnOrder) => returnOrder.lines)
      .filter((returnLine) => returnLine.sourceSaleLineId === sourceLine.saleOrderLineId)
      .reduce((sum, returnLine) => sum + returnLine.quantityMilli, 0);
    if (line.quantityMilli > sourceLine.quantityMilli - alreadyReturned) {
      return failure('INVALID_INPUT', 'Số lượng trả vượt số lượng đã bán còn được phép trả.');
    }
  }

  const returnId = deps.newId('sale-return');
  const now = deps.now().toISOString();
  const returnLines: SalesReturnLineDTO[] = input.lines.map((line) => {
    const sourceLine = sourceLines.find((candidate) => candidate.saleOrderLineId === line.sourceSaleLineId);
    const unitCostVnd = line.unitCostVnd ?? deps.inventoryService.getAverageUnitCostVnd(input.warehouseId, line.variantId);
    const refundVnd =
      line.refundVnd ??
      (sourceLine === undefined
        ? 0
        : Math.round((sourceLine.lineTotalVnd * line.quantityMilli) / sourceLine.quantityMilli));
    return {
      ...line,
      returnId,
      returnLineId: deps.newId('sale-return-line'),
      refundVnd,
      unitCostVnd,
    };
  });
  const returnOrder: SalesReturnDTO = {
    returnId,
    tenantId: deps.tenantId,
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    customerId: input.customerId ?? sourceOrder?.customerId,
    sourceSaleOrderId: input.sourceSaleOrderId,
    status: 'ReceivedForInspection',
    returnType: input.fastReturn === true ? 'FastReturn' : 'SourceReturn',
    reason: input.reason,
    receivedAt: now,
    actorId: input.actorId,
    approvedBy: input.fastReturnApproved === true ? input.actorId : undefined,
    lines: returnLines,
  };

  const movements = [];
  for (const line of returnLines) {
    const received = deps.inventoryService.receiveReturnToQuarantine({
      commandId: `${input.commandId}-${line.returnLineId}-quarantine`,
      idempotencyKey: `${input.idempotencyKey}-${line.returnLineId}-quarantine`,
      warehouseId: input.warehouseId,
      variantId: line.variantId,
      quantityMilli: line.quantityMilli,
      unitCostVnd: line.unitCostVnd,
      sourceDocument: { sourceType: 'SaleReturn', sourceId: returnId, sourceLineId: line.returnLineId },
      actorId: input.actorId,
    });
    if (!received.ok) return failure(received.error.code, received.error.message);
    movements.push(received.data);
  }

  deps.repository.saveReturn(returnOrder);
  return { ok: true, data: { returnOrder, inventoryMovements: movements } };
}

function resolveReturn(
  deps: SalesServiceDependencies,
  input: SalesReturnResolveRequest,
): SalesServiceResult<SalesReturnResolveResponse> {
  const returnOrder = deps.repository.getReturn(input.returnId);
  if (returnOrder === undefined || returnOrder.status !== 'ReceivedForInspection') {
    return failure('INVALID_INPUT', 'Chỉ return đang kiểm hàng mới được xử lý.');
  }

  const movements = [];
  const nextLines = returnOrder.lines.map((line) => {
    const requested = input.lines.find((candidate) => candidate.returnLineId === line.returnLineId);
    return requested === undefined ? line : { ...line, disposition: requested.disposition };
  });

  for (const line of nextLines) {
    if (line.disposition === 'Restock') {
      const restocked = deps.inventoryService.restockReturn({
        commandId: `${input.commandId}-${line.returnLineId}-restock`,
        idempotencyKey: `${input.idempotencyKey}-${line.returnLineId}-restock`,
        warehouseId: returnOrder.warehouseId,
        variantId: line.variantId,
        quantityMilli: line.quantityMilli,
        unitCostVnd: line.unitCostVnd,
        sourceDocument: { sourceType: 'SaleReturn', sourceId: returnOrder.returnId, sourceLineId: line.returnLineId },
        actorId: input.actorId,
      });
      if (!restocked.ok) return failure(restocked.error.code, restocked.error.message);
      movements.push(restocked.data);
      continue;
    }

    if (line.disposition !== 'Scrap') continue;
    const scrapped = deps.inventoryService.scrapReturn({
      commandId: `${input.commandId}-${line.returnLineId}-scrap`,
      idempotencyKey: `${input.idempotencyKey}-${line.returnLineId}-scrap`,
      warehouseId: returnOrder.warehouseId,
      variantId: line.variantId,
      quantityMilli: line.quantityMilli,
      unitCostVnd: line.unitCostVnd,
      sourceDocument: { sourceType: 'SaleReturn', sourceId: returnOrder.returnId, sourceLineId: line.returnLineId },
      actorId: input.actorId,
    });
    if (!scrapped.ok) return failure(scrapped.error.code, scrapped.error.message);
    movements.push(scrapped.data);
  }

  const financialAction = input.financialAction;
  const financeResult =
    financialAction?.treatment === 'Refund' && financialAction.amountVnd > 0
      ? createReturnRefund(deps, input, returnOrder, financialAction)
      : undefined;
  if (financeResult !== undefined && !financeResult.ok) {
    return failure(financeResult.error.code, financeResult.error.message);
  }

  const customerCredit =
    financialAction?.treatment === 'CustomerCredit' && financialAction.amountVnd > 0
      ? createReturnCustomerCredit(deps, returnOrder, financialAction.amountVnd)
      : undefined;
  if (customerCredit !== undefined && 'ok' in customerCredit && !customerCredit.ok) {
    return customerCredit;
  }

  const next: SalesReturnDTO = {
    ...returnOrder,
    status: 'Resolved',
    resolvedAt: deps.now().toISOString(),
    actorId: input.actorId,
    lines: nextLines,
  };
  deps.repository.saveReturn(next);
  updateSourceOrderRefundStatus(deps, next);

  return {
    ok: true,
    data: {
      returnOrder: next,
      inventoryMovements: movements,
      financeResult: financeResult?.data,
      customerCredit: customerCredit === undefined || 'ok' in customerCredit ? undefined : customerCredit,
    },
  };
}

function createReturnRefund(
  deps: SalesServiceDependencies,
  input: SalesReturnResolveRequest,
  returnOrder: SalesReturnDTO,
  financialAction: NonNullable<SalesReturnResolveRequest['financialAction']>,
): SalesServiceResult<FinancePaymentRecordResponse> {
  if (
    financialAction.cashDrawerId === undefined ||
    financialAction.paymentMethodId === undefined ||
    financialAction.approverId === undefined
  ) {
    return failure('INVALID_INPUT', 'Hoàn tiền cần két tiền, phương thức thanh toán và người duyệt.');
  }

  return deps.financeService.recordRefund({
    commandId: `${input.commandId}-refund`,
    idempotencyKey: `${input.idempotencyKey}-refund`,
    branchId: returnOrder.branchId,
    cashDrawerId: financialAction.cashDrawerId,
    paymentMethodId: financialAction.paymentMethodId,
    amountVnd: financialAction.amountVnd,
    payeeType: returnOrder.customerId === undefined ? 'Other' : 'Customer',
    payeeId: returnOrder.customerId,
    sourceDocument: { sourceType: 'SaleReturn', sourceId: returnOrder.returnId },
    approverId: financialAction.approverId,
  });
}

function createReturnCustomerCredit(
  deps: SalesServiceDependencies,
  returnOrder: SalesReturnDTO,
  amountVnd: number,
): CustomerCreditDTO | SalesServiceResult<never> {
  if (returnOrder.customerId === undefined) {
    return failure('INVALID_INPUT', 'Tạo công nợ/credit khách hàng cần có khách hàng.');
  }

  return deps.financeService.createCustomerCreditFromSource({
    branchId: returnOrder.branchId,
    customerId: returnOrder.customerId,
    sourceDocument: { sourceType: 'SaleReturn', sourceId: returnOrder.returnId },
    amountVnd,
  });
}

function updateSourceOrderRefundStatus(deps: SalesServiceDependencies, returnOrder: SalesReturnDTO): void {
  if (returnOrder.sourceSaleOrderId === undefined) return;

  const sourceOrder = deps.repository.getOrder(returnOrder.sourceSaleOrderId);
  if (sourceOrder === undefined) return;

  const refundedVnd = deps.repository
    .listReturns(sourceOrder.saleOrderId)
    .filter((candidate) => candidate.status === 'Resolved')
    .flatMap((candidate) => candidate.lines)
    .reduce((sum, line) => sum + line.refundVnd, 0);
  if (refundedVnd <= 0) return;

  deps.repository.saveOrder({
    ...sourceOrder,
    paymentStatus: refundedVnd >= sourceOrder.totalVnd ? 'FullRefund' : 'PartialRefund',
    updatedAt: deps.now().toISOString(),
  });
}

function createExchange(
  deps: SalesServiceDependencies,
  input: SalesExchangeCreateRequest,
): SalesServiceResult<SalesExchangeCreateResponse> {
  const sourceOrder = deps.repository.getOrder(input.sourceSaleOrderId);
  if (sourceOrder === undefined || !['Completed', 'Shipped', 'Delivered'].includes(sourceOrder.status)) {
    return failure('INVALID_INPUT', 'Exchange phải tham chiếu đơn đã hoàn tất hoặc đã xuất giao.');
  }

  const quote = quoteCurrentCart(deps, {
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    customerId: input.customerId ?? sourceOrder.customerId,
    lines: input.exchangeLines,
  });
  if (quote.quoteVersion !== input.quoteVersion) {
    return failure('PRICE_CHANGED', 'Giá hoặc khuyến mãi đã thay đổi. Vui lòng áp dụng báo giá mới trước khi đổi hàng.', {
      expectedVersion: input.quoteVersion,
      actualVersion: quote.quoteVersion,
    });
  }

  const createdReturn = createReturn(deps, {
    commandId: `${input.commandId}-return`,
    idempotencyKey: `${input.idempotencyKey}-return`,
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    actorId: input.actorId,
    customerId: input.customerId ?? sourceOrder.customerId,
    sourceSaleOrderId: input.sourceSaleOrderId,
    reason: input.reason,
    lines: input.returnLines.map((line) => ({ ...line, disposition: 'Quarantine' })),
  });
  if (!createdReturn.ok) return createdReturn;

  const resolvedReturn = resolveReturn(deps, {
    commandId: `${input.commandId}-return-resolve`,
    idempotencyKey: `${input.idempotencyKey}-return-resolve`,
    returnId: createdReturn.data.returnOrder.returnId,
    actorId: input.actorId,
    lines: createdReturn.data.returnOrder.lines.map((line) => {
      const requested = input.returnLines.find((candidate) => candidate.sourceSaleLineId === line.sourceSaleLineId);
      return {
        returnLineId: line.returnLineId,
        disposition: requested?.disposition ?? 'Restock',
      };
    }),
  });
  if (!resolvedReturn.ok) return resolvedReturn;

  const returnValueVnd = resolvedReturn.data.returnOrder.lines.reduce((sum, line) => sum + line.refundVnd, 0);
  const cashTenderVnd = input.tenders.reduce((sum, tender) => sum + tender.amountVnd, 0);
  const netSettlementVnd = quote.totalVnd - returnValueVnd;
  if (netSettlementVnd > cashTenderVnd) {
    return failure('INVALID_INPUT', 'Số tiền thu thêm chưa đủ để hoàn tất đổi hàng.');
  }

  const exchangeOrderId = deps.newId('sale-order');
  const now = deps.now().toISOString();
  const paidVnd = Math.min(quote.totalVnd, returnValueVnd + cashTenderVnd);
  const receivableVnd = Math.max(0, quote.totalVnd - paidVnd);
  const exchangeLines = buildLineSnapshots(
    deps,
    { branchId: input.branchId, warehouseId: input.warehouseId, lines: input.exchangeLines },
    exchangeOrderId,
    quote.lines,
  );
  const exchangeOrder: SaleOrderDTO = {
    saleOrderId: exchangeOrderId,
    tenantId: deps.tenantId,
    businessNumber: createBusinessNumber(exchangeOrderId),
    source: 'POS',
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    status: 'Completed',
    paymentStatus: resolvePaymentStatus(quote.totalVnd, paidVnd),
    customerId: input.customerId ?? sourceOrder.customerId,
    cashierId: input.cashierId,
    subtotalVnd: quote.subtotalVnd,
    discountVnd: quote.discountVnd,
    taxVnd: 0,
    shippingFeeVnd: 0,
    totalVnd: quote.totalVnd,
    paidVnd,
    receivableVnd,
    quoteVersion: quote.quoteVersion,
    draftVersion: 1,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    linkedReturnId: resolvedReturn.data.returnOrder.returnId,
  };

  const issueMovements = [];
  for (const line of exchangeLines) {
    const issued = deps.inventoryService.issueForSale({
      commandId: `${input.commandId}-${line.saleOrderLineId}-issue`,
      idempotencyKey: `${input.idempotencyKey}-${line.saleOrderLineId}-issue`,
      warehouseId: input.warehouseId,
      variantId: line.variantId,
      quantityMilli: line.quantityMilli,
      sourceDocument: { sourceType: 'SaleOrder', sourceId: exchangeOrderId, sourceLineId: line.saleOrderLineId },
      actorId: input.cashierId,
    });
    if (!issued.ok) return failure(issued.error.code, issued.error.message);
    issueMovements.push(issued.data);
  }

  const financeResult =
    cashTenderVnd > 0
      ? deps.financeService.recordPayment({
          commandId: `${input.commandId}-payment`,
          idempotencyKey: `${input.idempotencyKey}-payment`,
          branchId: input.branchId,
          cashDrawerId: input.cashDrawerId,
          paymentMethodId: input.tenders[0]?.paymentMethodId ?? 'cash',
          amountVnd: cashTenderVnd,
          payerType: exchangeOrder.customerId === undefined ? 'Other' : 'Customer',
          payerId: exchangeOrder.customerId,
          sourceDocument: { sourceType: 'SaleOrder', sourceId: exchangeOrderId },
          shiftId: input.shiftId,
          allocations: [],
          actorId: input.cashierId,
        })
      : undefined;
  if (financeResult !== undefined && !financeResult.ok) {
    return failure(financeResult.error.code, financeResult.error.message);
  }

  const receipt = buildReceipt(
    {
      ...input,
      lines: input.exchangeLines,
    },
    exchangeOrder,
    exchangeLines,
    Math.max(0, cashTenderVnd - Math.max(0, netSettlementVnd)),
  );
  const linkedReturn: SalesReturnDTO = {
    ...resolvedReturn.data.returnOrder,
    returnType: 'Exchange',
    linkedExchangeSaleId: exchangeOrderId,
  };

  deps.repository.saveOrder({
    ...sourceOrder,
    linkedReturnId: linkedReturn.returnId,
    paymentStatus: sourceOrder.paymentStatus === 'FullRefund' ? 'FullRefund' : 'PartialRefund',
    updatedAt: deps.now().toISOString(),
  });
  deps.repository.saveReturn(linkedReturn);
  deps.repository.saveOrder(exchangeOrder);
  deps.repository.saveLines(exchangeOrder.saleOrderId, exchangeLines);
  deps.repository.saveTenders(
    exchangeOrder.saleOrderId,
    input.tenders.map((tender) => ({
      ...tender,
      cashDrawerId: tender.cashDrawerId ?? input.cashDrawerId,
      saleOrderId: exchangeOrder.saleOrderId,
      tenderDraftId: deps.newId('sale-tender'),
    })),
  );
  deps.repository.saveReceipt(receipt);

  return {
    ok: true,
    data: {
      returnOrder: linkedReturn,
      exchangeOrder,
      exchangeLines,
      receipt,
      inventoryMovements: [
        ...createdReturn.data.inventoryMovements,
        ...resolvedReturn.data.inventoryMovements,
        ...issueMovements,
      ],
      netSettlementVnd,
      financeResult: financeResult?.data,
    },
  };
}

function openWarranty(
  deps: SalesServiceDependencies,
  input: SalesWarrantyOpenRequest,
): SalesServiceResult<SalesWarrantyResponse> {
  const order = deps.repository.getOrder(input.saleOrderId);
  const line = deps.repository.getLines(input.saleOrderId).find((candidate) => candidate.saleOrderLineId === input.saleLineId);
  if (order === undefined || line === undefined || line.variantId !== input.variantId) {
    return failure('INVALID_INPUT', 'Không tìm thấy đơn/dòng bán gốc cho ca bảo hành.');
  }

  const warrantyCase: WarrantyCaseDTO = {
    warrantyCaseId: deps.newId('warranty-case'),
    tenantId: deps.tenantId,
    customerId: input.customerId,
    saleOrderId: input.saleOrderId,
    saleLineId: input.saleLineId,
    variantId: input.variantId,
    serialId: input.serialId,
    policyVersionId: input.policyVersionId,
    receivedAt: deps.now().toISOString(),
    status: 'Open',
    issue: input.issue,
    attachmentIds: input.attachmentIds ?? [],
  };
  deps.repository.saveWarrantyCase(warrantyCase);
  return { ok: true, data: { warrantyCase } };
}

function transitionWarranty(
  deps: SalesServiceDependencies,
  input: SalesWarrantyTransitionRequest,
): SalesServiceResult<SalesWarrantyResponse> {
  const warrantyCase = deps.repository.getWarrantyCase(input.warrantyCaseId);
  if (warrantyCase === undefined) return failure('INVALID_INPUT', 'Không tìm thấy ca bảo hành.');

  const next: WarrantyCaseDTO = {
    ...warrantyCase,
    status: input.status,
    resolution: input.resolution ?? warrantyCase.resolution,
    attachmentIds: input.attachmentIds ?? warrantyCase.attachmentIds,
  };
  deps.repository.saveWarrantyCase(next);
  return { ok: true, data: { warrantyCase: next } };
}

function completePosSale(
  deps: SalesServiceDependencies,
  input: SalesPosCompleteRequest,
): SalesServiceResult<SalesPosCompleteResponse> {
  const measure = <T>(stage: string, operation: () => T): T => {
    const startedAt = Date.now();
    try {
      return operation();
    } finally {
      recordStage(stage, Date.now() - startedAt);
    }
  };

  const shiftError = measure<SalesServiceResult<SalesPosCompleteResponse> | undefined>('sales.pos.validateShiftMs', () =>
    validateOpenShift(deps, input),
  );
  if (shiftError !== undefined) return shiftError;

  const projection = measure('sales.pos.catalogProjectionMs', () =>
    deps.catalogService.getPosProjection({
      branchId: input.branchId,
      warehouseId: input.warehouseId,
    }),
  );
  const quote = measure('sales.pos.quoteMs', () => quoteCurrentCart(deps, input, projection));
  if (quote.quoteVersion !== input.quoteVersion) {
    return failure('PRICE_CHANGED', 'Giá hoặc khuyến mãi đã thay đổi. Vui lòng áp dụng báo giá mới trước khi hoàn tất.', {
      expectedVersion: input.quoteVersion,
      actualVersion: quote.quoteVersion,
    });
  }

  const priceError = measure<SalesServiceResult<SalesPosCompleteResponse> | undefined>('sales.pos.validatePriceMs', () => {
    for (const line of input.lines) {
      const projectedLine = quote.lines.find((candidate) => candidate.lineId === line.lineId);
      if (projectedLine === undefined || projectedLine.unitPriceVnd !== line.unitPriceVnd) {
        return failure('PRICE_CHANGED', 'Giá bán đã thay đổi trước khi hoàn tất.', {
          lineId: line.lineId,
          variantId: line.variantId,
        });
      }
    }
    return undefined;
  });
  if (priceError !== undefined) return priceError;

  const stockConflict = measure<SalesServiceResult<SalesPosCompleteResponse> | undefined>('sales.pos.stockCheckMs', () =>
    findStockConflict(deps, input),
  );
  if (stockConflict !== undefined) {
    return stockConflict;
  }

  const saleOrderId = deps.newId('sale-order');
  const now = deps.now().toISOString();
  const paidVnd = input.tenders.reduce((sum, tender) => sum + tender.amountVnd, 0);
  const receivableVnd = Math.max(0, quote.totalVnd - paidVnd);
  const changeVnd = Math.max(0, paidVnd - quote.totalVnd);
  const paymentStatus = resolvePaymentStatus(quote.totalVnd, paidVnd);
  const lines = buildLineSnapshots(deps, input, saleOrderId, quote.lines, projection);
  const order: SaleOrderDTO = {
    saleOrderId,
    tenantId: deps.tenantId,
    businessNumber: createBusinessNumber(saleOrderId),
    source: 'POS',
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    status: 'Completed',
    paymentStatus,
    customerId: input.customerId,
    cashierId: input.cashierId,
    salesPersonId: input.salesPersonId,
    note: input.note,
    subtotalVnd: quote.subtotalVnd,
    discountVnd: quote.discountVnd,
    taxVnd: 0,
    shippingFeeVnd: 0,
    totalVnd: quote.totalVnd,
    paidVnd,
    receivableVnd,
    quoteVersion: quote.quoteVersion,
    draftVersion: 1,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  };

  const inventoryResult = measure<SalesServiceResult<readonly InventoryMovementResponse[]>>('sales.pos.inventoryIssueMs', () => {
    const inventoryMovements = [];
    for (const line of input.lines) {
      const issue = deps.inventoryService.issueForSale({
        commandId: `${input.commandId}-${line.lineId}-issue`,
        idempotencyKey: `${input.idempotencyKey}-${line.lineId}-issue`,
        warehouseId: input.warehouseId,
        variantId: line.variantId,
        quantityMilli: line.quantityMilli,
        sourceDocument: { sourceType: 'SaleOrder', sourceId: saleOrderId, sourceLineId: line.lineId },
        actorId: input.cashierId,
      });
      if (!issue.ok) return failure(issue.error.code, issue.error.message);
      inventoryMovements.push(issue.data);
    }
    return { ok: true, data: inventoryMovements };
  });
  if (!inventoryResult.ok) return inventoryResult;
  const inventoryMovements = inventoryResult.data;

  const receivable =
    receivableVnd > 0
      ? deps.financeService.createReceivable({
          branchId: input.branchId,
          customerId: input.customerId ?? 'walk-in',
          sourceDocument: { sourceType: 'SaleOrder', sourceId: saleOrderId },
          amountVnd: receivableVnd,
        })
      : undefined;
  const financeResult = measure('sales.pos.financeRecordMs', () =>
    paidVnd > 0
      ? deps.financeService.recordPayment({
          commandId: `${input.commandId}-payment`,
          idempotencyKey: `${input.idempotencyKey}-payment`,
          branchId: input.branchId,
          cashDrawerId: input.cashDrawerId,
          paymentMethodId: input.tenders[0]?.paymentMethodId ?? 'cash',
          amountVnd: paidVnd,
          payerType: input.customerId === undefined ? 'Other' : 'Customer',
          payerId: input.customerId,
          sourceDocument: { sourceType: 'SaleOrder', sourceId: saleOrderId },
          shiftId: input.shiftId,
          allocations: [],
          actorId: input.cashierId,
        })
      : undefined,
  );
  if (financeResult !== undefined && !financeResult.ok) {
    return failure(financeResult.error.code, financeResult.error.message);
  }

  const receipt = buildReceipt(input, order, lines, changeVnd);
  measure('sales.pos.persistOrderMs', () => {
    deps.repository.saveNewCompletedPosSale({
      order,
      lines,
      tenders: input.tenders.map((tender) => ({
        ...tender,
        cashDrawerId: tender.cashDrawerId ?? input.cashDrawerId,
        saleOrderId: order.saleOrderId,
        tenderDraftId: deps.newId('sale-tender'),
      })),
      receipt,
    });
  });

  return {
    ok: true,
    data: {
      order,
      lines,
      receipt,
      inventoryMovements,
      financeResult: financeResult?.data,
      receivable,
      conflicts: [],
    },
  };
}

function validateOpenShift(
  deps: SalesServiceDependencies,
  input: SalesPosCompleteRequest,
): SalesServiceResult<SalesPosCompleteResponse> | undefined {
  if (!deps.requireOpenShift) return undefined;
  if (input.shiftId === undefined) {
    return failure('SHIFT_NOT_OPEN', 'Cần mở ca POS trước khi hoàn tất bán hàng.');
  }

  const openShift = deps.financeRepository.getShift(input.shiftId);
  if (
    openShift === undefined ||
    openShift.status !== 'Open' ||
    openShift.branchId !== input.branchId ||
    openShift.warehouseId !== input.warehouseId ||
    openShift.cashierId !== input.cashierId
  ) {
    return failure('SHIFT_NOT_OPEN', 'Ca POS không còn mở trong phạm vi hiện tại.');
  }

  return undefined;
}

function buildDraftResponse(
  deps: SalesServiceDependencies,
  input: SalesDraftSaveRequest,
): SalesDraftSaveResponse {
  const quote = quoteCurrentCart(deps, input);
  const saleOrderId = input.draftId ?? deps.newId('sale-draft');
  const existing = input.draftId === undefined ? undefined : deps.repository.getOrder(input.draftId);
  const now = deps.now().toISOString();
  const paidVnd = input.tenders.reduce((sum, tender) => sum + tender.amountVnd, 0);
  const order: SaleOrderDTO = {
    saleOrderId,
    tenantId: deps.tenantId,
    businessNumber: existing?.businessNumber ?? createBusinessNumber(saleOrderId),
    source: input.source ?? 'POS',
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    status: 'Draft',
    paymentStatus: resolvePaymentStatus(quote.totalVnd, paidVnd),
    customerId: input.customerId,
    cashierId: input.cashierId,
    salesPersonId: input.salesPersonId,
    note: input.note,
    subtotalVnd: quote.subtotalVnd,
    discountVnd: quote.discountVnd,
    taxVnd: 0,
    shippingFeeVnd: 0,
    totalVnd: quote.totalVnd,
    paidVnd,
    receivableVnd: Math.max(0, quote.totalVnd - paidVnd),
    quoteVersion: quote.quoteVersion,
    draftVersion: (existing?.draftVersion ?? 0) + 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    recipient: input.recipient,
  };

  return {
    order,
    lines: buildLineSnapshots(deps, input, saleOrderId, quote.lines),
    tenders: input.tenders.map((tender) => ({
      ...tender,
      saleOrderId,
      tenderDraftId: deps.newId('sale-tender-draft'),
    })),
  };
}

function quoteCurrentCart(
  deps: SalesServiceDependencies,
  input: Pick<SalesPosCompleteRequest, 'branchId' | 'warehouseId' | 'customerId' | 'lines'>,
  projection: CatalogPosProjection = deps.catalogService.getPosProjection({
    branchId: input.branchId,
    warehouseId: input.warehouseId,
  }),
) {
  return createPricingService({
    variants: projection.variants.map((variant) => ({
      variantId: variant.variantId,
      unitVersionId: variant.unitVersionId,
      unitPriceVnd: variant.unitPriceVnd,
    })),
    priceRules: [],
    promotions: [],
  }).quoteCart({
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    customerId: input.customerId,
    lines: input.lines.map((line) => ({
      lineId: line.lineId,
      variantId: line.variantId,
      unitVersionId: line.unitVersionId,
      quantity: line.quantity,
    })),
  });
}

function buildLineSnapshots(
  deps: SalesServiceDependencies,
  input: Pick<SalesPosCompleteRequest, 'branchId' | 'warehouseId' | 'lines'>,
  saleOrderId: string,
  quotedLines: readonly { lineId: string; unitPriceVnd: number; lineSubtotalVnd: number; lineDiscountVnd: number; lineTotalVnd: number }[],
  projection: CatalogPosProjection = deps.catalogService.getPosProjection({
    branchId: input.branchId,
    warehouseId: input.warehouseId,
  }),
): SaleOrderLineDTO[] {
  return input.lines.map((line) => {
    const variant = projection.variants.find((candidate) => candidate.variantId === line.variantId);
    const quoteLine = quotedLines.find((candidate) => candidate.lineId === line.lineId);
    return {
      ...line,
      saleOrderLineId: `${saleOrderId}-${line.lineId}`,
      sku: variant?.sku,
      displayName: variant?.displayName ?? line.variantId,
      unitName: variant?.unitName ?? line.unitVersionId,
      unitPriceVnd: quoteLine?.unitPriceVnd ?? line.unitPriceVnd,
      lineSubtotalVnd: quoteLine?.lineSubtotalVnd ?? Math.round(line.unitPriceVnd * line.quantity),
      lineDiscountVnd: quoteLine?.lineDiscountVnd ?? line.lineDiscountVnd,
      lineTotalVnd: quoteLine?.lineTotalVnd ?? Math.max(0, Math.round(line.unitPriceVnd * line.quantity) - line.lineDiscountVnd),
    };
  });
}

function findStockConflict(
  deps: SalesServiceDependencies,
  input: SalesPosCompleteRequest,
): SalesServiceResult<SalesPosCompleteResponse> | undefined {
  if (input.lines.length <= 1) return undefined;

  const conflict = deps.inventoryService.checkAvailability({
    warehouseId: input.warehouseId,
    lines: input.lines.map((line) => ({
      lineId: line.lineId,
      variantId: line.variantId,
      quantityMilli: line.quantityMilli,
    })),
  })[0];
  if (conflict !== undefined) {
    return failure('INSUFFICIENT_STOCK', 'Không đủ tồn khả dụng để hoàn tất bán hàng.', {
      lineId: conflict.lineIds[0] ?? '',
      variantId: conflict.variantId,
      requestedMilli: String(conflict.requestedMilli),
      availableMilli: String(conflict.availableMilli),
    });
  }

  return undefined;
}

function buildReceipt(
  input: SalesPosCompleteRequest,
  order: SaleOrderDTO,
  lines: readonly SaleOrderLineDTO[],
  changeVnd: number,
): ReceiptSnapshotDTO {
  return {
    receiptId: `receipt-${order.saleOrderId}`,
    saleOrderId: order.saleOrderId,
    businessNumber: order.businessNumber,
    receiptFormat: input.receiptFormat as ReceiptFormat,
    createdAt: order.completedAt ?? order.updatedAt,
    branchId: order.branchId,
    warehouseId: order.warehouseId,
    cashierId: order.cashierId,
    customerId: order.customerId,
    lines,
    totals: {
      subtotalVnd: order.subtotalVnd,
      discountVnd: order.discountVnd,
      taxVnd: order.taxVnd,
      shippingFeeVnd: order.shippingFeeVnd,
      totalVnd: order.totalVnd,
      paidVnd: order.paidVnd,
      receivableVnd: order.receivableVnd,
      changeVnd,
    },
  };
}

function resolvePaymentStatus(totalVnd: number, paidVnd: number): SalePaymentStatus {
  if (totalVnd <= 0 || paidVnd >= totalVnd) return 'Paid';
  if (paidVnd > 0) return 'Partial';
  return 'Unpaid';
}

function toCommand(input: { commandId: string; idempotencyKey: string }) {
  return {
    commandId: input.commandId,
    idempotencyKey: input.idempotencyKey,
  };
}

function failure<T>(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, string>,
): SalesServiceResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
      details,
    },
  };
}

function createBusinessNumber(saleOrderId: string): string {
  return `SO-${saleOrderId.toLocaleUpperCase('vi-VN')}`;
}
