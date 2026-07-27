import type {
  GoodsReceiptDTO,
  GoodsReceiptLineDTO,
  LandedCostAdjustmentDTO,
  PurchaseCostVarianceDTO,
  PurchaseOrderDTO,
  PurchaseOrderLineDTO,
  SupplierDTO,
  SupplierReturnDTO,
  SupplierReturnLineDTO,
} from '@shared/contracts/purchasing/purchasing';

export interface PurchasingRepository {
  saveSupplier(supplier: SupplierDTO): void;
  getSupplier(supplierId: string): SupplierDTO | undefined;
  findSupplierByCode(supplierCode: string): SupplierDTO | undefined;
  listSuppliers(): readonly SupplierDTO[];
  savePurchaseOrder(order: PurchaseOrderDTO): void;
  savePurchaseOrderLines(purchaseOrderId: string, lines: readonly PurchaseOrderLineDTO[]): void;
  getPurchaseOrder(purchaseOrderId: string): PurchaseOrderDTO | undefined;
  getPurchaseOrderLines(purchaseOrderId: string): readonly PurchaseOrderLineDTO[];
  saveGoodsReceipt(receipt: GoodsReceiptDTO): void;
  saveGoodsReceiptLines(goodsReceiptId: string, lines: readonly GoodsReceiptLineDTO[]): void;
  getGoodsReceipt(goodsReceiptId: string): GoodsReceiptDTO | undefined;
  getGoodsReceiptLines(goodsReceiptId: string): readonly GoodsReceiptLineDTO[];
  listGoodsReceiptsByPo(purchaseOrderId: string): readonly GoodsReceiptDTO[];
  saveLandedCostAdjustment(adjustment: LandedCostAdjustmentDTO): void;
  appendPurchaseCostVariance(variance: PurchaseCostVarianceDTO): void;
  listPurchaseCostVariances(): readonly PurchaseCostVarianceDTO[];
  saveSupplierReturn(supplierReturn: SupplierReturnDTO): void;
  saveSupplierReturnLines(supplierReturnId: string, lines: readonly SupplierReturnLineDTO[]): void;
  getSupplierReturn(supplierReturnId: string): SupplierReturnDTO | undefined;
  getSupplierReturnLines(supplierReturnId: string): readonly SupplierReturnLineDTO[];
  listSupplierReturnsByReceipt(goodsReceiptId: string): readonly SupplierReturnDTO[];
}

export function createInMemoryPurchasingRepository(): PurchasingRepository {
  const suppliers = new Map<string, SupplierDTO>();
  const purchaseOrders = new Map<string, PurchaseOrderDTO>();
  const purchaseOrderLines = new Map<string, PurchaseOrderLineDTO[]>();
  const goodsReceipts = new Map<string, GoodsReceiptDTO>();
  const goodsReceiptLines = new Map<string, GoodsReceiptLineDTO[]>();
  const landedCostAdjustments = new Map<string, LandedCostAdjustmentDTO>();
  const purchaseCostVariances: PurchaseCostVarianceDTO[] = [];
  const supplierReturns = new Map<string, SupplierReturnDTO>();
  const supplierReturnLines = new Map<string, SupplierReturnLineDTO[]>();

  return {
    saveSupplier(supplier) {
      suppliers.set(supplier.supplierId, clone(supplier));
    },
    getSupplier(supplierId) {
      return cloneOptional(suppliers.get(supplierId));
    },
    findSupplierByCode(supplierCode) {
      const normalized = normalizeCode(supplierCode);
      return cloneOptional([...suppliers.values()].find((supplier) => normalizeCode(supplier.supplierCode) === normalized));
    },
    listSuppliers() {
      return [...suppliers.values()].map(clone);
    },
    savePurchaseOrder(order) {
      purchaseOrders.set(order.purchaseOrderId, clone(order));
    },
    savePurchaseOrderLines(purchaseOrderId, lines) {
      purchaseOrderLines.set(purchaseOrderId, lines.map(clone));
    },
    getPurchaseOrder(purchaseOrderId) {
      return cloneOptional(purchaseOrders.get(purchaseOrderId));
    },
    getPurchaseOrderLines(purchaseOrderId) {
      return (purchaseOrderLines.get(purchaseOrderId) ?? []).map(clone);
    },
    saveGoodsReceipt(receipt) {
      goodsReceipts.set(receipt.goodsReceiptId, clone(receipt));
    },
    saveGoodsReceiptLines(goodsReceiptId, lines) {
      goodsReceiptLines.set(goodsReceiptId, lines.map(clone));
    },
    getGoodsReceipt(goodsReceiptId) {
      return cloneOptional(goodsReceipts.get(goodsReceiptId));
    },
    getGoodsReceiptLines(goodsReceiptId) {
      return (goodsReceiptLines.get(goodsReceiptId) ?? []).map(clone);
    },
    listGoodsReceiptsByPo(purchaseOrderId) {
      return [...goodsReceipts.values()]
        .filter((receipt) => receipt.purchaseOrderId === purchaseOrderId)
        .map(clone);
    },
    saveLandedCostAdjustment(adjustment) {
      landedCostAdjustments.set(adjustment.adjustmentId, clone(adjustment));
    },
    appendPurchaseCostVariance(variance) {
      purchaseCostVariances.push(clone(variance));
    },
    listPurchaseCostVariances() {
      return purchaseCostVariances.map(clone);
    },
    saveSupplierReturn(supplierReturn) {
      supplierReturns.set(supplierReturn.supplierReturnId, clone(supplierReturn));
    },
    saveSupplierReturnLines(supplierReturnId, lines) {
      supplierReturnLines.set(supplierReturnId, lines.map(clone));
    },
    getSupplierReturn(supplierReturnId) {
      return cloneOptional(supplierReturns.get(supplierReturnId));
    },
    getSupplierReturnLines(supplierReturnId) {
      return (supplierReturnLines.get(supplierReturnId) ?? []).map(clone);
    },
    listSupplierReturnsByReceipt(goodsReceiptId) {
      return [...supplierReturns.values()]
        .filter((supplierReturn) => supplierReturn.goodsReceiptId === goodsReceiptId)
        .map(clone);
    },
  };
}

function normalizeCode(value: string): string {
  return value.trim().toLocaleLowerCase('vi-VN');
}

function cloneOptional<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : clone(value);
}

function clone<T>(value: T): T {
  return { ...value };
}

