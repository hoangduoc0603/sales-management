import type {
  ReceiptSnapshotDTO,
  SaleOrderDTO,
  SaleOrderLineDTO,
  SaleTenderDraftDTO,
  SalesOrderListRequest,
  SalesReturnDTO,
  WarrantyCaseDTO,
} from '@shared/contracts/sales/sales';

export interface SalesRepository {
  saveOrder(order: SaleOrderDTO): void;
  saveLines(saleOrderId: string, lines: readonly SaleOrderLineDTO[]): void;
  saveTenders(saleOrderId: string, tenders: readonly SaleTenderDraftDTO[]): void;
  saveReceipt(receipt: ReceiptSnapshotDTO): void;
  getOrder(saleOrderId: string): SaleOrderDTO | undefined;
  getLines(saleOrderId: string): readonly SaleOrderLineDTO[];
  getTenders(saleOrderId: string): readonly SaleTenderDraftDTO[];
  getReceiptByOrderId(saleOrderId: string): ReceiptSnapshotDTO | undefined;
  listOrders(input?: SalesOrderListRequest): readonly SaleOrderDTO[];
  listDrafts(input: { branchId: string; warehouseId: string }): readonly SaleOrderDTO[];
  saveReturn(returnOrder: SalesReturnDTO): void;
  getReturn(returnId: string): SalesReturnDTO | undefined;
  listReturns(sourceSaleOrderId?: string): readonly SalesReturnDTO[];
  saveWarrantyCase(warrantyCase: WarrantyCaseDTO): void;
  getWarrantyCase(warrantyCaseId: string): WarrantyCaseDTO | undefined;
  listWarrantyCases(saleOrderId?: string): readonly WarrantyCaseDTO[];
}

export function createInMemorySalesRepository(): SalesRepository {
  const orders = new Map<string, SaleOrderDTO>();
  const linesByOrderId = new Map<string, SaleOrderLineDTO[]>();
  const tendersByOrderId = new Map<string, SaleTenderDraftDTO[]>();
  const receiptsByOrderId = new Map<string, ReceiptSnapshotDTO>();
  const returns = new Map<string, SalesReturnDTO>();
  const warrantyCases = new Map<string, WarrantyCaseDTO>();

  return {
    saveOrder(order) {
      orders.set(order.saleOrderId, clone(order));
    },
    saveLines(saleOrderId, lines) {
      linesByOrderId.set(saleOrderId, lines.map(clone));
    },
    saveTenders(saleOrderId, tenders) {
      tendersByOrderId.set(saleOrderId, tenders.map(clone));
    },
    saveReceipt(receipt) {
      receiptsByOrderId.set(receipt.saleOrderId, cloneReceipt(receipt));
    },
    getOrder(saleOrderId) {
      return cloneOptional(orders.get(saleOrderId));
    },
    getLines(saleOrderId) {
      return (linesByOrderId.get(saleOrderId) ?? []).map(clone);
    },
    getTenders(saleOrderId) {
      return (tendersByOrderId.get(saleOrderId) ?? []).map(clone);
    },
    getReceiptByOrderId(saleOrderId) {
      const receipt = receiptsByOrderId.get(saleOrderId);
      return receipt === undefined ? undefined : cloneReceipt(receipt);
    },
    listOrders(input) {
      return [...orders.values()]
        .filter((order) => input === undefined || matchesOrderFilter(order, input))
        .map(clone);
    },
    listDrafts(input) {
      return [...orders.values()]
        .filter(
          (order) =>
            order.status === 'Draft' &&
            order.branchId === input.branchId &&
            order.warehouseId === input.warehouseId,
        )
        .map(clone);
    },
    saveReturn(returnOrder) {
      returns.set(returnOrder.returnId, cloneReturn(returnOrder));
    },
    getReturn(returnId) {
      const returnOrder = returns.get(returnId);
      return returnOrder === undefined ? undefined : cloneReturn(returnOrder);
    },
    listReturns(sourceSaleOrderId) {
      return [...returns.values()]
        .filter((returnOrder) => sourceSaleOrderId === undefined || returnOrder.sourceSaleOrderId === sourceSaleOrderId)
        .map(cloneReturn);
    },
    saveWarrantyCase(warrantyCase) {
      warrantyCases.set(warrantyCase.warrantyCaseId, cloneWarrantyCase(warrantyCase));
    },
    getWarrantyCase(warrantyCaseId) {
      const warrantyCase = warrantyCases.get(warrantyCaseId);
      return warrantyCase === undefined ? undefined : cloneWarrantyCase(warrantyCase);
    },
    listWarrantyCases(saleOrderId) {
      return [...warrantyCases.values()]
        .filter((warrantyCase) => saleOrderId === undefined || warrantyCase.saleOrderId === saleOrderId)
        .map(cloneWarrantyCase);
    },
  };
}

function matchesOrderFilter(order: SaleOrderDTO, input: SalesOrderListRequest): boolean {
  if (order.branchId !== input.branchId) return false;
  if (input.warehouseId !== undefined && order.warehouseId !== input.warehouseId) return false;
  if (input.statuses !== undefined && !input.statuses.includes(order.status)) return false;
  if (input.sources !== undefined && !input.sources.includes(order.source)) return false;
  if (input.query !== undefined) {
    const query = input.query.toLocaleLowerCase('vi-VN');
    const haystack = [order.businessNumber, order.customerId, order.note]
      .filter((value): value is string => value !== undefined)
      .join(' ')
      .toLocaleLowerCase('vi-VN');
    if (!haystack.includes(query)) return false;
  }

  return true;
}

function cloneOptional<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : clone(value);
}

function clone<T>(value: T): T {
  return { ...value };
}

function cloneReceipt(receipt: ReceiptSnapshotDTO): ReceiptSnapshotDTO {
  return {
    ...receipt,
    lines: receipt.lines.map(clone),
    totals: { ...receipt.totals },
  };
}

function cloneReturn(returnOrder: SalesReturnDTO): SalesReturnDTO {
  return {
    ...returnOrder,
    lines: returnOrder.lines.map(clone),
  };
}

function cloneWarrantyCase(warrantyCase: WarrantyCaseDTO): WarrantyCaseDTO {
  return {
    ...warrantyCase,
    attachmentIds: [...warrantyCase.attachmentIds],
  };
}
