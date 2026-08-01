import { describe, expect, it } from 'vitest';
import type {
  CashDrawerDTO,
  CashTransactionDTO,
  PaymentDTO,
  PaymentMethodDTO,
  ShiftDTO,
} from '../../../shared/contracts/finance/finance';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import type { PlatformCacheStore } from '../../../apps-script/src/infrastructure/platform/cache';
import { createSheetFinanceRepository } from '../../../apps-script/src/repositories/finance/finance-repository';
import { createFinanceService } from '../../../apps-script/src/services/finance/finance-service';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed FinanceRepository', () => {
  it('persists shift, receivable, payment, cash transaction and allocation through SheetGateway', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetFinanceRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });
    const service = createFinanceService({
      repository,
      tenantId: 'tenant-default',
      now: () => new Date('2026-07-27T08:00:00.000Z'),
      newId: createSequenceId(),
    });

    repository.saveCashDrawer(cashDrawerFixture);
    repository.savePaymentMethod(paymentMethodFixture);
    const opened = service.openShift({
      commandId: 'cmd-open',
      idempotencyKey: 'idem-open',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      cashDrawerId: 'drawer-main',
      cashierId: 'cashier-1',
      openingCashVnd: 500000,
    });
    const receivable = service.createReceivable({
      branchId: 'branch-default',
      customerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
      amountVnd: 300000,
    });
    const payment = service.recordPayment({
      commandId: 'cmd-pay',
      idempotencyKey: 'idem-pay',
      branchId: 'branch-default',
      cashDrawerId: 'drawer-main',
      paymentMethodId: 'cash',
      amountVnd: 300000,
      payerType: 'Customer',
      payerId: 'customer-1',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
      shiftId: opened.ok ? opened.data.shift.shiftId : undefined,
      allocations: [{ obligationId: receivable.obligationId, amountVnd: 300000 }],
      actorId: 'cashier-1',
    });

    expect(opened).toMatchObject({ ok: true });
    expect(payment).toMatchObject({ ok: true });
    expect(repository.findOpenShiftForPos({
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      cashierId: 'cashier-1',
    })).toMatchObject({ status: 'Open' });
    expect(repository.getObligation(receivable.obligationId)).toMatchObject({
      status: 'Settled',
      remainingAmountVnd: 0,
    });
    expect(repository.listCashTransactions()).toHaveLength(2);
    expect(repository.listPaymentAllocations()).toHaveLength(1);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey])).toEqual([
      ['CashDrawer', undefined],
      ['PaymentMethod', undefined],
      ['Shift', 'FY2026-P01'],
      ['CashTransaction', 'FY2026-P01'],
      ['ReceivableLedger', 'FY2026-P01'],
      ['ReceivableLedger', 'FY2026-P01'],
      ['Payment', 'FY2026-P01'],
      ['CashTransaction', 'FY2026-P01'],
      ['PaymentAllocation', 'FY2026-P01'],
    ]);
    expect(gateway.appendRequests.find((request) => request.tableName === 'Payment')?.rows[0]).toMatchObject({
      id: 'payment-5:v1',
      tenantId: 'tenant-default',
      schemaVersion: 1,
      recordVersion: 1,
      paymentId: 'payment-5',
      sourceType: 'SaleOrder',
      sourceId: 'sale-1',
      amountVnd: 300000,
      shiftId: 'shift-1',
    });
  });

  it('rejects duplicate append-only cash transaction and reads latest shift version', () => {
    const gateway = new FakeSheetGateway({
      CashTransaction: [
        {
          id: 'cash-1',
          tenantId: 'tenant-default',
          schemaVersion: 1,
          cashTransactionId: 'cash-1',
          branchId: 'branch-default',
          cashDrawerId: 'drawer-main',
          transactionType: 'Receipt',
          amountVnd: 100000,
          effectiveAt: '2026-07-27T08:00:00.000Z',
          sourceType: 'SaleOrder',
          sourceId: 'sale-1',
          actorId: 'cashier-1',
          idempotencyKey: 'idem-cash',
        },
      ],
      Shift: [
        { ...shiftRowFixture, id: 'shift-1:v1', recordVersion: 1, status: 'Open' },
        { ...shiftRowFixture, id: 'shift-1:v2', recordVersion: 2, status: 'Closed', actualCashVnd: 510000 },
      ],
    });
    const repository = createSheetFinanceRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    expect(() =>
      repository.appendCashTransaction({
        cashTransactionId: 'cash-1',
        tenantId: 'tenant-default',
        branchId: 'branch-default',
        cashDrawerId: 'drawer-main',
        transactionType: 'Receipt',
        amountVnd: 100000,
        effectiveAt: '2026-07-27T08:00:00.000Z',
        sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
        actorId: 'cashier-1',
        idempotencyKey: 'idem-cash',
      }),
    ).toThrow(/DuplicatePrimaryKey:CashTransaction.id:cash-1/);
    expect(repository.getShift('shift-1')).toMatchObject({
      shiftId: 'shift-1',
      status: 'Closed',
      actualCashVnd: 510000,
    });
    expect(gateway.appendRequests).toEqual([]);
  });

  it('uses narrow lookup paths for POS checkout finance operations when gateway supports them', () => {
    const gateway = new FakeSheetGateway({}, { supportFindRowsByColumn: true });
    const repository = createSheetFinanceRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.saveShift(openShiftFixture);
    expect(
      repository.findOpenShiftForPos({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'cashier-1',
      }),
    ).toMatchObject({ shiftId: 'shift-1', status: 'Open' });
    repository.savePayment(paymentFixture);
    repository.appendCashTransaction(cashTransactionFixture);

    expect(gateway.readCount).toBe(0);
    expect(gateway.findRequests.map((request) => [request.tableName, request.columnName, request.value])).toEqual([
      ['Shift', 'shiftId', 'shift-1'],
      ['Shift', 'cashierId', 'cashier-1'],
      ['Payment', 'paymentId', 'payment-1'],
      ['CashTransaction', 'id', 'cash-1'],
    ]);
  });

  it('caches shift lookup by shiftId and invalidates cache when shift is saved again', () => {
    const cacheStore = new FakePlatformCacheStore();
    const gateway = new FakeSheetGateway({}, { supportFindRowsByColumn: true });
    const repository = createSheetFinanceRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
      cacheStore,
    });

    repository.saveShift(openShiftFixture);
    gateway.findRequests = [];

    expect(repository.getShift('shift-1')).toMatchObject({ status: 'Open' });
    expect(gateway.findRequests).toEqual([]);

    repository.saveShift({ ...openShiftFixture, status: 'Closed', closedAt: '2026-07-27T10:00:00.000Z' });
    gateway.findRequests = [];
    expect(repository.getShift('shift-1')).toMatchObject({ status: 'Closed' });
    expect(gateway.findRequests).toEqual([]);
    expect(cacheStore.ttls()).toEqual([300, 300]);
  });

  it('appends new POS payment and cash transaction without preflight Sheet lookups', () => {
    const gateway = new FakeSheetGateway({}, { supportFindRowsByColumn: true });
    const repository = createSheetFinanceRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.saveNewPayment(paymentFixture);
    repository.appendNewCashTransaction(cashTransactionFixture);

    expect(gateway.readCount).toBe(0);
    expect(gateway.findRequests).toEqual([]);
    expect(gateway.appendRequests.map((request) => request.tableName)).toEqual(['Payment', 'CashTransaction']);
    expect(gateway.appendRequests.find((request) => request.tableName === 'Payment')?.rows[0]).toMatchObject({
      id: 'payment-1:v1',
      paymentId: 'payment-1',
      recordVersion: 1,
    });
  });
});

const cashDrawerFixture: CashDrawerDTO = {
  cashDrawerId: 'drawer-main',
  tenantId: 'tenant-default',
  branchId: 'branch-default',
  drawerCode: 'MAIN',
  name: 'Két chính',
  drawerType: 'Cash',
  status: 'Active',
};

const paymentMethodFixture: PaymentMethodDTO = {
  paymentMethodId: 'cash',
  tenantId: 'tenant-default',
  methodCode: 'CASH',
  name: 'Tiền mặt',
  methodType: 'Cash',
  status: 'Active',
};

const shiftRowFixture = {
  tenantId: 'tenant-default',
  schemaVersion: 1,
  shiftId: 'shift-1',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  cashDrawerId: 'drawer-main',
  cashierId: 'cashier-1',
  openedAt: '2026-07-27T08:00:00.000Z',
  openingCashVnd: 500000,
  expectedCashVnd: 500000,
};

const openShiftFixture: ShiftDTO = {
  shiftId: 'shift-1',
  tenantId: 'tenant-default',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  cashDrawerId: 'drawer-main',
  cashierId: 'cashier-1',
  openedAt: '2026-07-27T08:00:00.000Z',
  openingCashVnd: 500000,
  expectedCashVnd: 500000,
  status: 'Open',
};

const paymentFixture: PaymentDTO = {
  paymentId: 'payment-1',
  tenantId: 'tenant-default',
  branchId: 'branch-default',
  cashDrawerId: 'drawer-main',
  paymentMethodId: 'cash',
  amountVnd: 300000,
  payerType: 'Customer',
  payerId: 'customer-1',
  sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
  status: 'Recorded',
  effectiveAt: '2026-07-27T08:01:00.000Z',
  shiftId: 'shift-1',
};

const cashTransactionFixture: CashTransactionDTO = {
  cashTransactionId: 'cash-1',
  tenantId: 'tenant-default',
  branchId: 'branch-default',
  cashDrawerId: 'drawer-main',
  transactionType: 'Receipt',
  amountVnd: 300000,
  effectiveAt: '2026-07-27T08:01:00.000Z',
  paymentId: 'payment-1',
  sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
  actorId: 'cashier-1',
  shiftId: 'shift-1',
  idempotencyKey: 'idem-cash-1',
};

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  readonly findRequests: Array<{ tableName: string; columnName: string; value: string }> = [];
  readCount = 0;
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  constructor(
    seed: Record<string, Record<string, unknown>[]> = {},
    private readonly options: { supportFindRowsByColumn?: boolean } = {},
  ) {
    for (const [tableName, rows] of Object.entries(seed)) {
      this.rowsByTable.set(tableName, rows.map(clone));
    }
  }

  readTable(request: { table: TableDefinitionDTO }): Record<string, unknown>[] {
    this.readCount += 1;
    return this.getRows(request.table.tableName).map(clone);
  }

  findRowsByColumn(request: {
    table: TableDefinitionDTO;
    columnName: string;
    value: string;
  }): Record<string, unknown>[] {
    if (this.options.supportFindRowsByColumn !== true) return this.readTable(request);
    this.findRequests.push({
      tableName: request.table.tableName,
      columnName: request.columnName,
      value: request.value,
    });
    return this.getRows(request.table.tableName)
      .filter((row) => String(row[request.columnName] ?? '') === request.value)
      .map(clone);
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

class FakePlatformCacheStore implements PlatformCacheStore {
  private readonly values = new Map<string, string>();
  private readonly ttlValues: number[] = [];

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  put(key: string, value: string, expirationInSeconds: number): void {
    this.values.set(key, value);
    this.ttlValues.push(expirationInSeconds);
  }

  remove(key: string): void {
    this.values.delete(key);
  }

  ttls(): number[] {
    return this.ttlValues;
  }
}

function createSequenceId(): (prefix: string) => string {
  let sequence = 0;
  return (prefix) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
