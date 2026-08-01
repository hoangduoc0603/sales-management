import type {
  CashDrawerDTO,
  CashTransactionDTO,
  CustomerCreditDTO,
  ObligationDTO,
  PaymentAllocationDTO,
  PaymentDTO,
  PaymentMethodDTO,
  ShiftDTO,
  SupplierPrepaymentDTO,
} from '@shared/contracts/finance/finance';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import {
  createAppendOnlySheetRecordRepository,
  type AppendOnlySheetRecordGateway,
} from '../platform/sheet-record-repository';

export interface FinanceRepository {
  saveCashDrawer(drawer: CashDrawerDTO): void;
  savePaymentMethod(method: PaymentMethodDTO): void;
  saveShift(shift: ShiftDTO): void;
  savePayment(payment: PaymentDTO): void;
  saveNewPayment(payment: PaymentDTO): void;
  saveObligation(obligation: ObligationDTO): void;
  saveCustomerCredit(credit: CustomerCreditDTO): void;
  saveSupplierPrepayment(prepayment: SupplierPrepaymentDTO): void;
  appendCashTransaction(transaction: CashTransactionDTO): void;
  appendNewCashTransaction(transaction: CashTransactionDTO): void;
  appendPaymentAllocation(allocation: PaymentAllocationDTO): void;
  getShift(shiftId: string): ShiftDTO | undefined;
  findOpenShiftByCashier(cashierId: string): ShiftDTO | undefined;
  findOpenShiftForPos(input: { branchId: string; warehouseId: string; cashierId: string }): ShiftDTO | undefined;
  getPayment(paymentId: string): PaymentDTO | undefined;
  getObligation(obligationId: string): ObligationDTO | undefined;
  listCashTransactions(): CashTransactionDTO[];
  listPaymentAllocations(): PaymentAllocationDTO[];
  listObligations(): ObligationDTO[];
  listCustomerCredits(): CustomerCreditDTO[];
  listSupplierPrepayments(): SupplierPrepaymentDTO[];
  listPayments(): PaymentDTO[];
  listShifts(): ShiftDTO[];
}

export function createInMemoryFinanceRepository(): FinanceRepository {
  const cashDrawers = new Map<string, CashDrawerDTO>();
  const paymentMethods = new Map<string, PaymentMethodDTO>();
  const shifts = new Map<string, ShiftDTO>();
  const payments = new Map<string, PaymentDTO>();
  const cashTransactions = new Map<string, CashTransactionDTO>();
  const allocations = new Map<string, PaymentAllocationDTO>();
  const obligations = new Map<string, ObligationDTO>();
  const credits = new Map<string, CustomerCreditDTO>();
  const supplierPrepayments = new Map<string, SupplierPrepaymentDTO>();

  return {
    saveCashDrawer(drawer) {
      cashDrawers.set(drawer.cashDrawerId, clone(drawer));
    },
    savePaymentMethod(method) {
      paymentMethods.set(method.paymentMethodId, clone(method));
    },
    saveShift(shift) {
      shifts.set(shift.shiftId, clone(shift));
    },
    savePayment(payment) {
      payments.set(payment.paymentId, clone(payment));
    },
    saveNewPayment(payment) {
      payments.set(payment.paymentId, clone(payment));
    },
    saveObligation(obligation) {
      obligations.set(obligation.obligationId, clone(obligation));
    },
    saveCustomerCredit(credit) {
      credits.set(credit.creditId, clone(credit));
    },
    saveSupplierPrepayment(prepayment) {
      supplierPrepayments.set(prepayment.prepaymentId, clone(prepayment));
    },
    appendCashTransaction(transaction) {
      if (cashTransactions.has(transaction.cashTransactionId)) {
        throw new Error(`CashTransaction is append-only: duplicate ${transaction.cashTransactionId}.`);
      }
      cashTransactions.set(transaction.cashTransactionId, clone(transaction));
    },
    appendNewCashTransaction(transaction) {
      if (cashTransactions.has(transaction.cashTransactionId)) {
        throw new Error(`CashTransaction is append-only: duplicate ${transaction.cashTransactionId}.`);
      }
      cashTransactions.set(transaction.cashTransactionId, clone(transaction));
    },
    appendPaymentAllocation(allocation) {
      if (allocations.has(allocation.allocationId)) {
        throw new Error(`PaymentAllocation is append-only: duplicate ${allocation.allocationId}.`);
      }
      allocations.set(allocation.allocationId, clone(allocation));
    },
    getShift(shiftId) {
      return cloneOptional(shifts.get(shiftId));
    },
    findOpenShiftByCashier(cashierId) {
      return cloneOptional([...shifts.values()].find((shift) => shift.cashierId === cashierId && shift.status === 'Open'));
    },
    findOpenShiftForPos({ branchId, cashierId, warehouseId }) {
      return cloneOptional(
        [...shifts.values()].find(
          (shift) =>
            shift.branchId === branchId &&
            shift.warehouseId === warehouseId &&
            shift.cashierId === cashierId &&
            shift.status === 'Open',
        ),
      );
    },
    getPayment(paymentId) {
      return cloneOptional(payments.get(paymentId));
    },
    getObligation(obligationId) {
      return cloneOptional(obligations.get(obligationId));
    },
    listCashTransactions: () => [...cashTransactions.values()].map(clone),
    listPaymentAllocations: () => [...allocations.values()].map(clone),
    listObligations: () => [...obligations.values()].map(clone),
    listCustomerCredits: () => [...credits.values()].map(clone),
    listSupplierPrepayments: () => [...supplierPrepayments.values()].map(clone),
    listPayments: () => [...payments.values()].map(clone),
    listShifts: () => [...shifts.values()].map(clone),
  };
}

function cloneOptional<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : clone(value);
}

function clone<T>(value: T): T {
  return { ...value };
}

export interface SheetFinanceRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  transactionPartitionKey: string;
}

export function createSheetFinanceRepository(deps: SheetFinanceRepositoryDependencies): FinanceRepository {
  const cashDrawers = createVersionedTable<CashDrawerDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'CashDrawer'),
    idField: 'cashDrawerId',
  });
  const paymentMethods = createVersionedTable<PaymentMethodDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'PaymentMethod'),
    idField: 'paymentMethodId',
  });
  const shifts = createVersionedTable<ShiftDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'Shift'),
    idField: 'shiftId',
    partitionKey: deps.transactionPartitionKey,
  });
  const payments = createVersionedTable<PaymentDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'Payment'),
    idField: 'paymentId',
    partitionKey: deps.transactionPartitionKey,
    toRow: paymentToRow,
    fromRow: paymentFromRow,
  });
  const receivables = createVersionedTable<ObligationDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'ReceivableLedger'),
    idField: 'obligationId',
    partitionKey: deps.transactionPartitionKey,
    toRow: obligationToRow,
    fromRow: obligationFromRow('Receivable'),
  });
  const payables = createVersionedTable<ObligationDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'PayableLedger'),
    idField: 'obligationId',
    partitionKey: deps.transactionPartitionKey,
    toRow: obligationToRow,
    fromRow: obligationFromRow('Payable'),
  });
  const customerCredits = createVersionedTable<CustomerCreditDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'CustomerCredit'),
    idField: 'creditId',
    partitionKey: deps.transactionPartitionKey,
    toRow: customerCreditToRow,
    fromRow: customerCreditFromRow,
  });
  const supplierPrepayments = createVersionedTable<SupplierPrepaymentDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'SupplierPrepayment'),
    idField: 'prepaymentId',
    partitionKey: deps.transactionPartitionKey,
    toRow: supplierPrepaymentToRow,
    fromRow: supplierPrepaymentFromRow,
  });
  const cashTransactionTable = findTable(deps.tableDefinitions, 'CashTransaction');
  const paymentAllocationTable = findTable(deps.tableDefinitions, 'PaymentAllocation');
  const cashTransactions = createAppendOnlySheetRecordRepository<FinanceRow>({
    gateway: deps.gateway,
    table: cashTransactionTable,
    partitionKey: deps.transactionPartitionKey,
  });
  const allocations = createAppendOnlySheetRecordRepository<FinanceRow>({
    gateway: deps.gateway,
    table: paymentAllocationTable,
    partitionKey: deps.transactionPartitionKey,
  });

  return {
    saveCashDrawer(drawer) {
      cashDrawers.save(drawer);
    },
    savePaymentMethod(method) {
      paymentMethods.save(method);
    },
    saveShift(shift) {
      shifts.save(shift);
    },
    savePayment(payment) {
      payments.save(payment);
    },
    saveNewPayment(payment) {
      payments.saveNew(payment);
    },
    saveObligation(obligation) {
      if (obligation.obligationType === 'Receivable') {
        receivables.save(obligation);
      } else {
        payables.save(obligation);
      }
    },
    saveCustomerCredit(credit) {
      customerCredits.save(credit);
    },
    saveSupplierPrepayment(prepayment) {
      supplierPrepayments.save(prepayment);
    },
    appendCashTransaction(transaction) {
      cashTransactions.append(cashTransactionToRow(transaction));
    },
    appendNewCashTransaction(transaction) {
      deps.gateway.appendRows({
        table: cashTransactionTable,
        partitionKey: deps.transactionPartitionKey,
        rows: [cashTransactionToRow(transaction)],
      });
    },
    appendPaymentAllocation(allocation) {
      allocations.append(paymentAllocationToRow(allocation));
    },
    getShift(shiftId) {
      return shifts.findById(shiftId);
    },
    findOpenShiftByCashier(cashierId) {
      return shifts.findByColumn('cashierId', cashierId).find((shift) => shift.status === 'Open');
    },
    findOpenShiftForPos({ branchId, cashierId, warehouseId }) {
      return shifts
        .findByColumn('cashierId', cashierId)
        .find(
          (shift) =>
            shift.branchId === branchId &&
            shift.warehouseId === warehouseId &&
            shift.cashierId === cashierId &&
            shift.status === 'Open',
        );
    },
    getPayment(paymentId) {
      return payments.findById(paymentId);
    },
    getObligation(obligationId) {
      return receivables.findById(obligationId) ?? payables.findById(obligationId);
    },
    listCashTransactions() {
      return cashTransactions.list().map(cashTransactionFromRow);
    },
    listPaymentAllocations() {
      return allocations.list().map(paymentAllocationFromRow);
    },
    listObligations() {
      return [...receivables.list(), ...payables.list()];
    },
    listCustomerCredits: () => customerCredits.list(),
    listSupplierPrepayments: () => supplierPrepayments.list(),
    listPayments: () => payments.list(),
    listShifts: () => shifts.list(),
  };
}

type FinanceRow = Record<string, unknown>;

interface VersionedTableDependencies<TRecord extends object> {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  idField: keyof TRecord & string;
  partitionKey?: string;
  toRow?(record: TRecord): FinanceRow;
  fromRow?(row: FinanceRow): TRecord;
}

interface VersionedTable<TRecord extends object> {
  list(): TRecord[];
  findById(recordId: string): TRecord | undefined;
  findByColumn(columnName: string, value: string): TRecord[];
  save(record: TRecord): void;
  saveNew(record: TRecord): void;
}

function createVersionedTable<TRecord extends object>(deps: VersionedTableDependencies<TRecord>): VersionedTable<TRecord> {
  const toRow = deps.toRow ?? ((record: TRecord) => deepClone(record) as FinanceRow);
  const fromRow =
    deps.fromRow ??
    ((row: FinanceRow) => {
      const record: FinanceRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'id' && key !== 'schemaVersion' && key !== 'recordVersion') record[key] = value;
      }
      return record as TRecord;
    });

  function readRows(): FinanceRow[] {
    return deps.gateway.readTable({ table: deps.table, partitionKey: deps.partitionKey }).map(deepClone);
  }

  function findRowsByColumn(columnName: string, value: string): FinanceRow[] {
    const rows =
      deps.gateway.findRowsByColumn?.({
        table: deps.table,
        partitionKey: deps.partitionKey,
        columnName,
        value,
      }) ?? deps.gateway.readTable({ table: deps.table, partitionKey: deps.partitionKey });
    return rows
      .filter((row) => String(row[columnName] ?? '') === value)
      .map((row) => deepClone(row) as FinanceRow);
  }

  function latestRows(): FinanceRow[] {
    const latestById = new Map<string, FinanceRow>();
    for (const row of readRows()) {
      const recordId = String(row[deps.idField] ?? '');
      if (recordId === '') continue;
      const current = latestById.get(recordId);
      if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) latestById.set(recordId, row);
    }
    return [...latestById.values()];
  }

  return {
    list() {
      return latestRows().map((row) => deepClone(fromRow(row)));
    },
    findById(recordId) {
      const latest = findRowsByColumn(deps.idField, recordId).reduce<FinanceRow | undefined>(
        (current, row) => (current === undefined || getRecordVersion(row) > getRecordVersion(current) ? row : current),
        undefined,
      );
      return latest === undefined ? undefined : deepClone(fromRow(latest));
    },
    findByColumn(columnName, value) {
      const latestById = new Map<string, FinanceRow>();
      for (const row of findRowsByColumn(columnName, value)) {
        const recordId = String(row[deps.idField] ?? '');
        if (recordId === '') continue;
        const current = latestById.get(recordId);
        if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) latestById.set(recordId, row);
      }
      return [...latestById.values()].map((row) => deepClone(fromRow(row)));
    },
    save(record) {
      const row = toRow(record);
      const recordId = String(row[deps.idField] ?? '');
      if (recordId.trim() === '') throw new Error(`MissingRecordId:${deps.table.tableName}.${deps.idField}`);
      const nextVersion =
        findRowsByColumn(deps.idField, recordId).reduce(
          (max, current) => Math.max(max, getRecordVersion(current)),
          0,
        ) + 1;
      deps.gateway.appendRows({
        table: deps.table,
        partitionKey: deps.partitionKey,
        rows: [
          {
            ...row,
            id: `${recordId}:v${nextVersion}`,
            schemaVersion: deps.table.schemaVersion,
            recordVersion: nextVersion,
          },
        ],
      });
    },
    saveNew(record) {
      const row = toRow(record);
      const recordId = String(row[deps.idField] ?? '');
      if (recordId.trim() === '') throw new Error(`MissingRecordId:${deps.table.tableName}.${deps.idField}`);
      deps.gateway.appendRows({
        table: deps.table,
        partitionKey: deps.partitionKey,
        rows: [
          {
            ...row,
            id: `${recordId}:v1`,
            schemaVersion: deps.table.schemaVersion,
            recordVersion: 1,
          },
        ],
      });
    },
  };
}

function cashTransactionToRow(transaction: CashTransactionDTO): FinanceRow {
  return {
    id: transaction.cashTransactionId,
    tenantId: transaction.tenantId,
    schemaVersion: 1,
    cashTransactionId: transaction.cashTransactionId,
    branchId: transaction.branchId,
    cashDrawerId: transaction.cashDrawerId,
    transactionType: transaction.transactionType,
    amountVnd: transaction.amountVnd,
    effectiveAt: transaction.effectiveAt,
    paymentId: transaction.paymentId,
    sourceType: transaction.sourceDocument.sourceType,
    sourceId: transaction.sourceDocument.sourceId,
    sourceLineId: transaction.sourceDocument.sourceLineId,
    actorId: transaction.actorId,
    approverId: transaction.approverId,
    shiftId: transaction.shiftId,
    reversalOfCashTransactionId: transaction.reversalOfCashTransactionId,
    idempotencyKey: transaction.idempotencyKey,
  };
}

function cashTransactionFromRow(row: FinanceRow): CashTransactionDTO {
  return {
    cashTransactionId: String(row.cashTransactionId),
    tenantId: String(row.tenantId),
    branchId: String(row.branchId),
    cashDrawerId: String(row.cashDrawerId),
    transactionType: row.transactionType as CashTransactionDTO['transactionType'],
    amountVnd: Number(row.amountVnd),
    effectiveAt: String(row.effectiveAt),
    paymentId: optionalString(row.paymentId),
    sourceDocument: {
      sourceType: row.sourceType as CashTransactionDTO['sourceDocument']['sourceType'],
      sourceId: String(row.sourceId),
      sourceLineId: optionalString(row.sourceLineId),
    },
    actorId: String(row.actorId),
    approverId: optionalString(row.approverId),
    shiftId: optionalString(row.shiftId),
    reversalOfCashTransactionId: optionalString(row.reversalOfCashTransactionId),
    idempotencyKey: String(row.idempotencyKey),
  };
}

function paymentAllocationToRow(allocation: PaymentAllocationDTO): FinanceRow {
  return {
    id: allocation.allocationId,
    tenantId: allocation.tenantId,
    schemaVersion: 1,
    allocationId: allocation.allocationId,
    paymentId: allocation.paymentId,
    obligationId: allocation.obligationId,
    amountVnd: allocation.amountVnd,
    allocatedAt: allocation.allocatedAt,
    reversalOfAllocationId: allocation.reversalOfAllocationId,
  };
}

function paymentAllocationFromRow(row: FinanceRow): PaymentAllocationDTO {
  return {
    allocationId: String(row.allocationId),
    tenantId: String(row.tenantId),
    paymentId: String(row.paymentId),
    obligationId: String(row.obligationId),
    amountVnd: Number(row.amountVnd),
    allocatedAt: String(row.allocatedAt),
    reversalOfAllocationId: optionalString(row.reversalOfAllocationId),
  };
}

function paymentToRow(payment: PaymentDTO): FinanceRow {
  return {
    ...deepClone(payment),
    sourceType: payment.sourceDocument.sourceType,
    sourceId: payment.sourceDocument.sourceId,
    sourceLineId: payment.sourceDocument.sourceLineId,
  };
}

function paymentFromRow(row: FinanceRow): PaymentDTO {
  return {
    paymentId: String(row.paymentId),
    tenantId: String(row.tenantId),
    branchId: String(row.branchId),
    cashDrawerId: String(row.cashDrawerId),
    paymentMethodId: String(row.paymentMethodId),
    amountVnd: Number(row.amountVnd),
    payerType: row.payerType as PaymentDTO['payerType'],
    payerId: optionalString(row.payerId),
    sourceDocument: {
      sourceType: row.sourceType as PaymentDTO['sourceDocument']['sourceType'],
      sourceId: String(row.sourceId),
      sourceLineId: optionalString(row.sourceLineId),
    },
    status: row.status as PaymentDTO['status'],
    effectiveAt: String(row.effectiveAt),
    shiftId: optionalString(row.shiftId),
    reversalOfPaymentId: optionalString(row.reversalOfPaymentId),
  };
}

function obligationToRow(obligation: ObligationDTO): FinanceRow {
  return {
    ...deepClone(obligation),
    sourceType: obligation.sourceDocument.sourceType,
    sourceId: obligation.sourceDocument.sourceId,
    sourceLineId: obligation.sourceDocument.sourceLineId,
    customerId: obligation.obligationType === 'Receivable' ? obligation.partyId : undefined,
    supplierId: obligation.obligationType === 'Payable' ? obligation.partyId : undefined,
  };
}

function obligationFromRow(obligationType: ObligationDTO['obligationType']): (row: FinanceRow) => ObligationDTO {
  return (row) => ({
    obligationId: String(row.obligationId),
    tenantId: String(row.tenantId),
    branchId: String(row.branchId),
    obligationType,
    partyId: obligationType === 'Receivable' ? String(row.customerId) : String(row.supplierId),
    sourceDocument: {
      sourceType: row.sourceType as ObligationDTO['sourceDocument']['sourceType'],
      sourceId: String(row.sourceId),
      sourceLineId: optionalString(row.sourceLineId),
    },
    originalAmountVnd: Number(row.originalAmountVnd),
    allocatedAmountVnd: Number(row.allocatedAmountVnd),
    remainingAmountVnd: Number(row.remainingAmountVnd),
    status: row.status as ObligationDTO['status'],
  });
}

function customerCreditToRow(credit: CustomerCreditDTO): FinanceRow {
  return {
    ...deepClone(credit),
    sourceType: credit.sourceDocument?.sourceType,
    sourceId: credit.sourceDocument?.sourceId,
    sourceLineId: credit.sourceDocument?.sourceLineId,
  };
}

function customerCreditFromRow(row: FinanceRow): CustomerCreditDTO {
  return {
    creditId: String(row.creditId),
    tenantId: String(row.tenantId),
    branchId: String(row.branchId),
    customerId: String(row.customerId),
    sourcePaymentId: String(row.sourcePaymentId),
    sourceDocument:
      row.sourceType === undefined || row.sourceId === undefined
        ? undefined
        : {
            sourceType: row.sourceType as NonNullable<CustomerCreditDTO['sourceDocument']>['sourceType'],
            sourceId: String(row.sourceId),
            sourceLineId: optionalString(row.sourceLineId),
          },
    amountVnd: Number(row.amountVnd),
    consumedAmountVnd: Number(row.consumedAmountVnd),
    status: row.status as CustomerCreditDTO['status'],
  };
}

function supplierPrepaymentToRow(prepayment: SupplierPrepaymentDTO): FinanceRow {
  return {
    ...deepClone(prepayment),
    sourcePaymentId: prepayment.sourceDocument.sourceId,
    sourceType: prepayment.sourceDocument.sourceType,
    sourceId: prepayment.sourceDocument.sourceId,
    sourceLineId: prepayment.sourceDocument.sourceLineId,
  };
}

function supplierPrepaymentFromRow(row: FinanceRow): SupplierPrepaymentDTO {
  return {
    prepaymentId: String(row.prepaymentId),
    tenantId: String(row.tenantId),
    branchId: String(row.branchId),
    supplierId: String(row.supplierId),
    sourceDocument: {
      sourceType: row.sourceType as SupplierPrepaymentDTO['sourceDocument']['sourceType'],
      sourceId: String(row.sourceId),
      sourceLineId: optionalString(row.sourceLineId),
    },
    amountVnd: Number(row.amountVnd),
    consumedAmountVnd: Number(row.consumedAmountVnd),
    status: row.status as SupplierPrepaymentDTO['status'],
  };
}

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) throw new Error(`Missing finance table definition: ${tableName}`);
  return table;
}

function getRecordVersion(row: FinanceRow): number {
  if (typeof row.recordVersion === 'number') return row.recordVersion;
  const parsed = Number(row.recordVersion);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const match = /:v(\d+)$/.exec(String(row.id ?? ''));
  return match === null ? 0 : Number(match[1]);
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
