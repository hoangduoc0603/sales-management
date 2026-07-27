import { describe, expect, it } from 'vitest';
import type {
  GoodsReceiptDTO,
  GoodsReceiptLineDTO,
  PurchaseCostVarianceDTO,
  PurchaseOrderDTO,
  PurchaseOrderLineDTO,
  SupplierDTO,
  SupplierReturnDTO,
  SupplierReturnLineDTO,
} from '../../../shared/contracts/purchasing/purchasing';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import { createSheetPurchasingRepository } from '../../../apps-script/src/repositories/purchasing/purchasing-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed PurchasingRepository', () => {
  it('persists supplier, PO and receipt documents with latest child sets through SheetGateway', () => {
    const gateway = new FakeSheetGateway({
      Supplier: [
        { ...supplierFixture, id: 'supplier-1:v1', schemaVersion: 1, recordVersion: 1, name: 'Tên cũ' },
        { ...supplierFixture, id: 'supplier-1:v2', schemaVersion: 1, recordVersion: 2 },
      ],
    });
    const repository = createSheetPurchasingRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.saveSupplier(newSupplierFixture);
    repository.savePurchaseOrder(purchaseOrderFixture);
    repository.savePurchaseOrderLines('po-1', [poLineFixture]);
    repository.savePurchaseOrderLines('po-1', []);
    repository.saveGoodsReceipt(goodsReceiptFixture);
    repository.saveGoodsReceiptLines('gr-1', [goodsReceiptLineFixture]);

    expect(repository.getSupplier('supplier-1')).toEqual(supplierFixture);
    expect(repository.findSupplierByCode('SUP-001')).toEqual(supplierFixture);
    expect(repository.listSuppliers()).toEqual([supplierFixture, newSupplierFixture]);
    expect(repository.getPurchaseOrder('po-1')).toEqual(purchaseOrderFixture);
    expect(repository.getPurchaseOrderLines('po-1')).toEqual([]);
    expect(repository.getGoodsReceipt('gr-1')).toEqual(goodsReceiptFixture);
    expect(repository.getGoodsReceiptLines('gr-1')).toEqual([goodsReceiptLineFixture]);
    expect(repository.listGoodsReceiptsByPo('po-1')).toEqual([goodsReceiptFixture]);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey, request.rows.length])).toEqual([
      ['Supplier', undefined, 1],
      ['PurchaseOrder', 'FY2026-P01', 1],
      ['PurchaseOrderLine', 'FY2026-P01', 1],
      ['PurchaseOrderLine', 'FY2026-P01', 1],
      ['GoodsReceipt', 'FY2026-P01', 1],
      ['GoodsReceiptLine', 'FY2026-P01', 1],
    ]);
    expect(gateway.appendRequests.find((request) => request.tableName === 'PurchaseOrder')?.rows[0]).toMatchObject({
      id: 'po-1:v1',
      tenantId: 'tenant-default',
      schemaVersion: 1,
      recordVersion: 1,
      attachmentIdsJson: ['attach-1'],
      termsSnapshotJson: { dueDays: 14 },
    });
    expect(gateway.appendRequests.filter((request) => request.tableName === 'PurchaseOrderLine')[1]?.rows[0]).toMatchObject({
      id: 'po-1:lineSetVersion:s2:empty',
      purchaseOrderId: 'po-1',
      lineSetVersion: 2,
      setIsEmpty: true,
    });
  });

  it('persists landed cost, variance and supplier return documents', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetPurchasingRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.saveLandedCostAdjustment(landedCostAdjustmentFixture);
    repository.appendPurchaseCostVariance(purchaseCostVarianceFixture);
    repository.saveSupplierReturn(supplierReturnFixture);
    repository.saveSupplierReturnLines('sr-1', [supplierReturnLineFixture]);

    expect(repository.listPurchaseCostVariances()).toEqual([purchaseCostVarianceFixture]);
    expect(repository.getSupplierReturn('sr-1')).toEqual(supplierReturnFixture);
    expect(repository.getSupplierReturnLines('sr-1')).toEqual([supplierReturnLineFixture]);
    expect(repository.listSupplierReturnsByReceipt('gr-1')).toEqual([supplierReturnFixture]);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey, request.rows.length])).toEqual([
      ['LandedCostAdjustment', 'FY2026-P01', 1],
      ['PurchaseCostVariance', 'FY2026-P01', 1],
      ['SupplierReturn', 'FY2026-P01', 1],
      ['SupplierReturnLine', 'FY2026-P01', 1],
    ]);
    expect(gateway.appendRequests.find((request) => request.tableName === 'PurchaseCostVariance')?.rows[0]).toMatchObject({
      id: 'variance-1',
      schemaVersion: 1,
      varianceId: 'variance-1',
      amountVnd: 20000,
    });
  });
});

const supplierFixture: SupplierDTO = {
  supplierId: 'supplier-1',
  tenantId: 'tenant-default',
  supplierCode: 'SUP-001',
  name: 'Nhà cung cấp 1',
  taxCode: '0100000001',
  status: 'Active',
  paymentTerms: { dueDays: 14 },
  contact: { contactName: 'Lan', phone: '0900000000', email: 'lan@example.com', address: 'HCM' },
  note: 'Ưu tiên',
  createdAt: '2026-07-27T08:00:00.000Z',
  updatedAt: '2026-07-27T08:00:00.000Z',
};

const newSupplierFixture: SupplierDTO = {
  ...supplierFixture,
  supplierId: 'supplier-2',
  supplierCode: 'SUP-002',
  name: 'Nhà cung cấp 2',
};

const purchaseOrderFixture: PurchaseOrderDTO = {
  purchaseOrderId: 'po-1',
  tenantId: 'tenant-default',
  businessNumber: 'PO-1',
  supplierId: 'supplier-1',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  status: 'Draft',
  expectedDate: '2026-07-30',
  termsSnapshot: { dueDays: 14 },
  attachmentIds: ['attach-1'],
  subtotalVnd: 100000,
  discountVnd: 0,
  vatVnd: 8000,
  totalVnd: 108000,
  note: 'PO test',
  createdAt: '2026-07-27T08:00:00.000Z',
  updatedAt: '2026-07-27T08:00:00.000Z',
};

const poLineFixture: PurchaseOrderLineDTO = {
  lineId: 'po-cart-line-1',
  purchaseOrderLineId: 'po-line-1',
  purchaseOrderId: 'po-1',
  variantId: 'variant-1',
  unitVersionId: 'unit-1',
  quantity: 1,
  quantityMilli: 1000,
  unitCostVnd: 100000,
  lineDiscountVnd: 0,
  vatVnd: 8000,
  receivedQuantityMilli: 0,
  lineSubtotalVnd: 100000,
  lineTotalVnd: 108000,
};

const goodsReceiptFixture: GoodsReceiptDTO = {
  goodsReceiptId: 'gr-1',
  tenantId: 'tenant-default',
  businessNumber: 'GR-1',
  supplierId: 'supplier-1',
  purchaseOrderId: 'po-1',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  status: 'Approved',
  receivedDate: '2026-07-27',
  subtotalVnd: 100000,
  discountVnd: 0,
  vatVnd: 8000,
  landedCostVnd: 20000,
  totalPayableVnd: 128000,
  actorId: 'buyer-1',
  approvedBy: 'manager-1',
  createdAt: '2026-07-27T08:00:00.000Z',
  updatedAt: '2026-07-27T08:05:00.000Z',
  approvedAt: '2026-07-27T08:05:00.000Z',
};

const goodsReceiptLineFixture: GoodsReceiptLineDTO = {
  lineId: 'gr-cart-line-1',
  goodsReceiptLineId: 'gr-line-1',
  goodsReceiptId: 'gr-1',
  purchaseOrderLineId: 'po-line-1',
  variantId: 'variant-1',
  unitVersionId: 'unit-1',
  quantity: 1,
  quantityMilli: 1000,
  unitCostVnd: 100000,
  lineDiscountVnd: 0,
  vatVnd: 8000,
  allocatedLandedCostVnd: 20000,
  lotId: 'lot-1',
  serialIds: ['serial-1'],
  lineSubtotalVnd: 100000,
  lineTotalVnd: 108000,
  actualCostVnd: 120000,
  returnedQuantityMilli: 0,
};

const landedCostAdjustmentFixture = {
  adjustmentId: 'adjustment-1',
  tenantId: 'tenant-default',
  goodsReceiptId: 'gr-1',
  adjustmentType: 'LateCost' as const,
  status: 'Approved' as const,
  method: 'ByValue' as const,
  totalCostVnd: 20000,
  onHandAllocatedVnd: 0,
  varianceVnd: 20000,
  approvedBy: 'manager-1',
  createdAt: '2026-07-27T09:00:00.000Z',
};

const purchaseCostVarianceFixture: PurchaseCostVarianceDTO = {
  varianceId: 'variance-1',
  tenantId: 'tenant-default',
  adjustmentId: 'adjustment-1',
  goodsReceiptId: 'gr-1',
  goodsReceiptLineId: 'gr-line-1',
  variantId: 'variant-1',
  warehouseId: 'warehouse-default',
  amountVnd: 20000,
  effectiveAt: '2026-07-27T09:00:00.000Z',
};

const supplierReturnFixture: SupplierReturnDTO = {
  supplierReturnId: 'sr-1',
  tenantId: 'tenant-default',
  supplierId: 'supplier-1',
  goodsReceiptId: 'gr-1',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  status: 'Approved',
  treatment: 'ReducePayable',
  reason: 'Hàng lỗi',
  actorId: 'buyer-1',
  approvedBy: 'manager-1',
  totalVnd: 50000,
  createdAt: '2026-07-27T10:00:00.000Z',
  updatedAt: '2026-07-27T10:05:00.000Z',
  approvedAt: '2026-07-27T10:05:00.000Z',
};

const supplierReturnLineFixture: SupplierReturnLineDTO = {
  lineId: 'sr-cart-line-1',
  supplierReturnLineId: 'sr-line-1',
  supplierReturnId: 'sr-1',
  goodsReceiptLineId: 'gr-line-1',
  variantId: 'variant-1',
  quantity: 1,
  quantityMilli: 1000,
  unitCostVnd: 50000,
  lineTotalVnd: 50000,
};

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
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
    this.appendRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey, rows });
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
