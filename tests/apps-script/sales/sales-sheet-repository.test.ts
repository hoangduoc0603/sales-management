import { describe, expect, it } from 'vitest';
import type {
  ReceiptSnapshotDTO,
  SaleOrderDTO,
  SaleOrderLineDTO,
  SaleTenderDraftDTO,
  SalesReturnDTO,
  WarrantyCaseDTO,
} from '../../../shared/contracts/sales/sales';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import { createSheetSalesRepository } from '../../../apps-script/src/repositories/sales/sales-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed SalesRepository', () => {
  it('persists orders, latest line/tender sets and receipt snapshots through SheetGateway', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetSalesRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.saveOrder(draftOrderFixture);
    repository.saveLines(draftOrderFixture.saleOrderId, [lineFixture]);
    repository.saveTenders(draftOrderFixture.saleOrderId, [tenderFixture]);
    repository.saveLines(draftOrderFixture.saleOrderId, [replacementLineFixture]);
    repository.saveTenders(draftOrderFixture.saleOrderId, []);
    repository.saveReceipt(receiptFixture);

    expect(repository.getOrder('sale-1')).toEqual(draftOrderFixture);
    expect(repository.listDrafts({ branchId: 'branch-default', warehouseId: 'warehouse-default' })).toEqual([
      draftOrderFixture,
    ]);
    expect(repository.listOrders({ branchId: 'branch-default', query: 'web' })).toEqual([draftOrderFixture]);
    expect(repository.getLines('sale-1')).toEqual([replacementLineFixture]);
    expect(repository.getTenders('sale-1')).toEqual([]);
    expect(repository.getReceiptByOrderId('sale-1')).toEqual(receiptFixture);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey, request.rows.length])).toEqual(
      [
        ['SaleOrder', 'FY2026-P01', 1],
        ['SaleOrderLine', 'FY2026-P01', 1],
        ['SaleTenderDraft', 'FY2026-P01', 1],
        ['SaleOrderLine', 'FY2026-P01', 1],
        ['SaleTenderDraft', 'FY2026-P01', 1],
        ['ReceiptSnapshot', 'FY2026-P01', 1],
      ],
    );
    expect(gateway.appendRequests.find((request) => request.tableName === 'SaleOrder')?.rows[0]).toMatchObject({
      id: 'sale-1:v1',
      tenantId: 'tenant-default',
      schemaVersion: 1,
      recordVersion: 1,
      saleOrderId: 'sale-1',
      draftVersion: 1,
      recipientJson: draftOrderFixture.recipient,
    });
    expect(gateway.appendRequests.filter((request) => request.tableName === 'SaleOrderLine')[1]?.rows[0]).toMatchObject({
      id: 'line-2:v1:s2',
      tenantId: 'tenant-default',
      schemaVersion: 1,
      recordVersion: 1,
      lineSetVersion: 2,
      saleOrderLineId: 'line-2',
      saleOrderId: 'sale-1',
    });
    expect(gateway.appendRequests.filter((request) => request.tableName === 'SaleTenderDraft')[1]?.rows[0]).toMatchObject({
      id: 'sale-1:tenderSetVersion:s2:empty',
      saleOrderId: 'sale-1',
      tenderSetVersion: 2,
      setIsEmpty: true,
    });
  });

  it('reads latest order versions and persists returns plus warranty cases', () => {
    const gateway = new FakeSheetGateway({
      SaleOrder: [
        { ...toOrderSeedRow(draftOrderFixture), id: 'sale-1:v1', recordVersion: 1, status: 'Draft' },
        { ...toOrderSeedRow(completedOrderFixture), id: 'sale-1:v2', recordVersion: 2, status: 'Completed' },
      ],
    });
    const repository = createSheetSalesRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.saveReturn(returnFixture);
    repository.saveWarrantyCase(warrantyCaseFixture);

    expect(repository.getOrder('sale-1')).toEqual(completedOrderFixture);
    expect(repository.listOrders({ branchId: 'branch-default', statuses: ['Completed'] })).toEqual([completedOrderFixture]);
    expect(repository.getReturn('return-1')).toEqual(returnFixture);
    expect(repository.listReturns('sale-1')).toEqual([returnFixture]);
    expect(repository.getWarrantyCase('warranty-1')).toEqual(warrantyCaseFixture);
    expect(repository.listWarrantyCases('sale-1')).toEqual([warrantyCaseFixture]);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey, request.rows.length])).toEqual([
      ['SaleReturn', 'FY2026-P01', 1],
      ['SaleReturnLine', 'FY2026-P01', 1],
      ['WarrantyCase', 'FY2026-P01', 1],
    ]);
    expect(gateway.appendRequests.find((request) => request.tableName === 'SaleReturnLine')?.rows[0]).toMatchObject({
      id: 'return-line-1:v1:s1',
      tenantId: 'tenant-default',
      schemaVersion: 1,
      recordVersion: 1,
      lineSetVersion: 1,
      returnId: 'return-1',
      refundVnd: 50000,
      unitCostVnd: 32000,
    });
    expect(gateway.appendRequests.find((request) => request.tableName === 'WarrantyCase')?.rows[0]).toMatchObject({
      id: 'warranty-1:v1',
      tenantId: 'tenant-default',
      schemaVersion: 1,
      recordVersion: 1,
      warrantyCaseId: 'warranty-1',
      attachmentIdsJson: ['drive-file-1'],
    });
  });
});

const draftOrderFixture: SaleOrderDTO = {
  saleOrderId: 'sale-1',
  tenantId: 'tenant-default',
  businessNumber: 'SO-260727-0001',
  source: 'ManualOnline',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  status: 'Draft',
  paymentStatus: 'Unpaid',
  customerId: 'customer-1',
  cashierId: 'cashier-1',
  salesPersonId: 'seller-1',
  note: 'web lead',
  subtotalVnd: 100000,
  discountVnd: 0,
  taxVnd: 0,
  shippingFeeVnd: 15000,
  totalVnd: 115000,
  paidVnd: 0,
  receivableVnd: 115000,
  quoteVersion: 'quote-v1',
  draftVersion: 1,
  createdAt: '2026-07-27T08:00:00.000Z',
  updatedAt: '2026-07-27T08:00:00.000Z',
  recipient: {
    name: 'Nguyễn An',
    phone: '0900000000',
    address: 'Quận 1, TP.HCM',
    shippingMethod: 'Manual',
    externalReference: 'WEB-001',
    codVnd: 115000,
  },
};

const completedOrderFixture: SaleOrderDTO = {
  ...draftOrderFixture,
  status: 'Completed',
  paymentStatus: 'Paid',
  paidVnd: 115000,
  receivableVnd: 0,
  draftVersion: 2,
  updatedAt: '2026-07-27T08:05:00.000Z',
  completedAt: '2026-07-27T08:05:00.000Z',
};

const lineFixture: SaleOrderLineDTO = {
  lineId: 'cart-line-1',
  saleOrderLineId: 'line-1',
  variantId: 'variant-1',
  unitVersionId: 'unit-version-1',
  quantity: 1,
  quantityMilli: 1000,
  unitPriceVnd: 100000,
  lineDiscountVnd: 0,
  sku: 'SKU-001',
  displayName: 'Sữa hạt óc chó 1L',
  unitName: 'Hộp',
  lineSubtotalVnd: 100000,
  lineTotalVnd: 100000,
  costVnd: 64000,
};

const replacementLineFixture: SaleOrderLineDTO = {
  ...lineFixture,
  lineId: 'cart-line-2',
  saleOrderLineId: 'line-2',
  variantId: 'variant-2',
  sku: 'SKU-002',
  displayName: 'Sữa chua uống',
  unitPriceVnd: 80000,
  lineSubtotalVnd: 80000,
  lineTotalVnd: 80000,
  costVnd: 50000,
};

const tenderFixture: SaleTenderDraftDTO = {
  tenderDraftId: 'tender-1',
  tenderId: 'cash-1',
  saleOrderId: 'sale-1',
  paymentMethodId: 'cash',
  amountVnd: 115000,
  cashDrawerId: 'drawer-main',
};

const receiptFixture: ReceiptSnapshotDTO = {
  receiptId: 'receipt-1',
  saleOrderId: 'sale-1',
  businessNumber: 'SO-260727-0001',
  receiptFormat: 'K80',
  createdAt: '2026-07-27T08:05:00.000Z',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  cashierId: 'cashier-1',
  customerId: 'customer-1',
  lines: [replacementLineFixture],
  totals: {
    subtotalVnd: 80000,
    discountVnd: 0,
    taxVnd: 0,
    shippingFeeVnd: 15000,
    totalVnd: 95000,
    paidVnd: 95000,
    receivableVnd: 0,
    changeVnd: 0,
  },
};

const returnFixture: SalesReturnDTO = {
  returnId: 'return-1',
  tenantId: 'tenant-default',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  customerId: 'customer-1',
  sourceSaleOrderId: 'sale-1',
  status: 'ReceivedForInspection',
  returnType: 'SourceReturn',
  reason: 'Khách đổi size',
  receivedAt: '2026-07-27T09:00:00.000Z',
  actorId: 'cashier-1',
  lines: [
    {
      returnLineId: 'return-line-1',
      returnId: 'return-1',
      sourceSaleLineId: 'line-2',
      variantId: 'variant-2',
      quantity: 1,
      quantityMilli: 1000,
      disposition: 'Quarantine',
      refundVnd: 50000,
      unitCostVnd: 32000,
    },
  ],
};

const warrantyCaseFixture: WarrantyCaseDTO = {
  warrantyCaseId: 'warranty-1',
  tenantId: 'tenant-default',
  customerId: 'customer-1',
  saleOrderId: 'sale-1',
  saleLineId: 'line-2',
  variantId: 'variant-2',
  serialId: 'serial-1',
  policyVersionId: 'policy-v1',
  receivedAt: '2026-07-27T09:10:00.000Z',
  status: 'Open',
  issue: 'Không lên nguồn',
  attachmentIds: ['drive-file-1'],
};

function toOrderSeedRow(order: SaleOrderDTO): Record<string, unknown> {
  const { recipient, ...rest } = order;
  return {
    ...rest,
    tenantId: order.tenantId,
    schemaVersion: 1,
    recipientJson: recipient,
  };
}

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
