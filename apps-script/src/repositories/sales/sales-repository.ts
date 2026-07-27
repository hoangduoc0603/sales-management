import type {
  ReceiptSnapshotDTO,
  SaleOrderDTO,
  SaleOrderLineDTO,
  SaleTenderDraftDTO,
  SalesOrderListRequest,
  SalesReturnDTO,
  WarrantyCaseDTO,
} from '@shared/contracts/sales/sales';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { AppendOnlySheetRecordGateway } from '../platform/sheet-record-repository';

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

export interface SheetSalesRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  transactionPartitionKey: string;
}

export function createSheetSalesRepository(deps: SheetSalesRepositoryDependencies): SalesRepository {
  const orders = createVersionedTable<SaleOrderDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'SaleOrder'),
    idField: 'saleOrderId',
    partitionKey: deps.transactionPartitionKey,
    toRow: orderToRow,
    fromRow: orderFromRow,
  });
  const orderLines = createChildSetTable<SaleOrderLineDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'SaleOrderLine'),
    parentField: 'saleOrderId',
    childIdField: 'saleOrderLineId',
    setVersionField: 'lineSetVersion',
    partitionKey: deps.transactionPartitionKey,
    getTenantId: (saleOrderId) => orders.list().find((order) => order.saleOrderId === saleOrderId)?.tenantId,
    stripParentFieldFromRecord: true,
  });
  const tenders = createChildSetTable<SaleTenderDraftDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'SaleTenderDraft'),
    parentField: 'saleOrderId',
    childIdField: 'tenderDraftId',
    setVersionField: 'tenderSetVersion',
    partitionKey: deps.transactionPartitionKey,
    getTenantId: (saleOrderId) => orders.list().find((order) => order.saleOrderId === saleOrderId)?.tenantId,
  });
  const receipts = createVersionedTable<ReceiptSnapshotDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'ReceiptSnapshot'),
    idField: 'receiptId',
    partitionKey: deps.transactionPartitionKey,
    toRow: receiptToRow,
    fromRow: receiptFromRow,
  });
  const returns = createVersionedTable<SalesReturnDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'SaleReturn'),
    idField: 'returnId',
    partitionKey: deps.transactionPartitionKey,
    toRow: returnToRow,
    fromRow: returnFromRow,
  });
  const returnLines = createChildSetTable<SalesReturnDTO['lines'][number]>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'SaleReturnLine'),
    parentField: 'returnId',
    childIdField: 'returnLineId',
    setVersionField: 'lineSetVersion',
    partitionKey: deps.transactionPartitionKey,
    getTenantId: (returnId) => returns.list().find((returnOrder) => returnOrder.returnId === returnId)?.tenantId,
  });
  const warrantyCases = createVersionedTable<WarrantyCaseDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'WarrantyCase'),
    idField: 'warrantyCaseId',
    partitionKey: deps.transactionPartitionKey,
    toRow: warrantyCaseToRow,
    fromRow: warrantyCaseFromRow,
  });

  return {
    saveOrder(order) {
      orders.save(order);
    },
    saveLines(saleOrderId, lines) {
      orderLines.saveSet(saleOrderId, lines);
    },
    saveTenders(saleOrderId, saleTenders) {
      tenders.saveSet(saleOrderId, saleTenders);
    },
    saveReceipt(receipt) {
      receipts.save(receipt);
    },
    getOrder(saleOrderId) {
      return orders.list().find((order) => order.saleOrderId === saleOrderId);
    },
    getLines(saleOrderId) {
      return orderLines.listSet(saleOrderId);
    },
    getTenders(saleOrderId) {
      return tenders.listSet(saleOrderId);
    },
    getReceiptByOrderId(saleOrderId) {
      return receipts.list().find((receipt) => receipt.saleOrderId === saleOrderId);
    },
    listOrders(input) {
      const filtered = orders.list().filter((order) => input === undefined || matchesOrderFilter(order, input));
      return input?.limit === undefined ? filtered : filtered.slice(0, input.limit);
    },
    listDrafts(input) {
      return orders
        .list()
        .filter(
          (order) =>
            order.status === 'Draft' &&
            order.branchId === input.branchId &&
            order.warehouseId === input.warehouseId,
        );
    },
    saveReturn(returnOrder) {
      returns.save(returnOrder);
      returnLines.saveSet(returnOrder.returnId, returnOrder.lines);
    },
    getReturn(returnId) {
      const returnOrder = returns.list().find((candidate) => candidate.returnId === returnId);
      return returnOrder === undefined ? undefined : { ...returnOrder, lines: returnLines.listSet(returnId) };
    },
    listReturns(sourceSaleOrderId) {
      return returns
        .list()
        .filter((returnOrder) => sourceSaleOrderId === undefined || returnOrder.sourceSaleOrderId === sourceSaleOrderId)
        .map((returnOrder) => ({ ...returnOrder, lines: returnLines.listSet(returnOrder.returnId) }));
    },
    saveWarrantyCase(warrantyCase) {
      warrantyCases.save(warrantyCase);
    },
    getWarrantyCase(warrantyCaseId) {
      return warrantyCases.list().find((warrantyCase) => warrantyCase.warrantyCaseId === warrantyCaseId);
    },
    listWarrantyCases(saleOrderId) {
      return warrantyCases
        .list()
        .filter((warrantyCase) => saleOrderId === undefined || warrantyCase.saleOrderId === saleOrderId);
    },
  };
}

type SalesRow = Record<string, unknown>;

interface VersionedTableDependencies<TRecord extends object> {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  idField: keyof TRecord & string;
  partitionKey: string;
  toRow?(record: TRecord): SalesRow;
  fromRow?(row: SalesRow): TRecord;
}

interface VersionedTable<TRecord extends object> {
  list(): TRecord[];
  save(record: TRecord): void;
}

function createVersionedTable<TRecord extends object>(deps: VersionedTableDependencies<TRecord>): VersionedTable<TRecord> {
  const toRow = deps.toRow ?? ((record: TRecord) => deepClone(record) as SalesRow);
  const fromRow =
    deps.fromRow ??
    ((row: SalesRow) => {
      const record: SalesRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'id' && key !== 'schemaVersion' && key !== 'recordVersion') record[key] = value;
      }
      return record as TRecord;
    });

  function readRows(): SalesRow[] {
    return deps.gateway
      .readTable({ table: deps.table, partitionKey: deps.partitionKey })
      .map((row) => deepClone(row) as SalesRow);
  }

  function latestRows(): SalesRow[] {
    const latestById = new Map<string, SalesRow>();
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
    save(record) {
      const row = toRow(record);
      const recordId = String(row[deps.idField] ?? '');
      if (recordId.trim() === '') throw new Error(`MissingRecordId:${deps.table.tableName}.${deps.idField}`);
      const nextVersion =
        readRows()
          .filter((current) => String(current[deps.idField] ?? '') === recordId)
          .reduce((max, current) => Math.max(max, getRecordVersion(current)), 0) + 1;
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
  };
}

interface ChildSetTableDependencies<TRecord extends object> {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  parentField: string;
  childIdField: keyof TRecord & string;
  setVersionField: string;
  partitionKey: string;
  getTenantId?(parentId: string): string | undefined;
  stripParentFieldFromRecord?: boolean;
}

interface ChildSetTable<TRecord extends object> {
  listSet(parentId: string): TRecord[];
  saveSet(parentId: string, records: readonly TRecord[]): void;
}

function createChildSetTable<TRecord extends object>(deps: ChildSetTableDependencies<TRecord>): ChildSetTable<TRecord> {
  function readRows(): SalesRow[] {
    return deps.gateway
      .readTable({ table: deps.table, partitionKey: deps.partitionKey })
      .map((row) => deepClone(row) as SalesRow);
  }

  function nextSetVersion(parentId: string): number {
    return (
      readRows()
        .filter((row) => String(row[deps.parentField] ?? '') === parentId)
        .reduce((max, row) => Math.max(max, getPositiveInteger(row[deps.setVersionField])), 0) + 1
    );
  }

  return {
    listSet(parentId) {
      const rows = readRows().filter((row) => String(row[deps.parentField] ?? '') === parentId);
      const latestSetVersion = rows.reduce(
        (max, row) => Math.max(max, getPositiveInteger(row[deps.setVersionField])),
        0,
      );
      if (latestSetVersion === 0) return [];

      const latestRows = rows.filter((row) => getPositiveInteger(row[deps.setVersionField]) === latestSetVersion);
      if (latestRows.some((row) => row.setIsEmpty === true)) return [];

      const latestByChildId = new Map<string, SalesRow>();
      for (const row of latestRows) {
        const childId = String(row[deps.childIdField] ?? '');
        if (childId === '') continue;
        const current = latestByChildId.get(childId);
        if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) latestByChildId.set(childId, row);
      }
      return [...latestByChildId.values()].map((row) => stripChildSetFields(row, deps) as TRecord);
    },
    saveSet(parentId, records) {
      const setVersion = nextSetVersion(parentId);
      const rows =
        records.length === 0
          ? [
              {
                id: `${parentId}:${deps.setVersionField}:s${setVersion}:empty`,
                tenantId: deps.getTenantId?.(parentId),
                [deps.parentField]: parentId,
                [deps.setVersionField]: setVersion,
                setIsEmpty: true,
                schemaVersion: deps.table.schemaVersion,
              },
            ]
          : records.map((record) => {
              const row = deepClone(record) as SalesRow;
              const childId = String(row[deps.childIdField] ?? '');
              if (childId.trim() === '') throw new Error(`MissingRecordId:${deps.table.tableName}.${deps.childIdField}`);
              const childVersion =
                readRows()
                  .filter((current) => String(current[deps.childIdField] ?? '') === childId)
                  .reduce((max, current) => Math.max(max, getRecordVersion(current)), 0) + 1;
              return {
                ...row,
                tenantId: deps.getTenantId?.(parentId) ?? row.tenantId,
                [deps.parentField]: parentId,
                id: `${childId}:v${childVersion}:s${setVersion}`,
                schemaVersion: deps.table.schemaVersion,
                recordVersion: childVersion,
                [deps.setVersionField]: setVersion,
              };
            });
      deps.gateway.appendRows({ table: deps.table, partitionKey: deps.partitionKey, rows });
    },
  };
}

function orderToRow(order: SaleOrderDTO): SalesRow {
  const { recipient, ...row } = deepClone(order);
  return {
    ...row,
    recipientJson: recipient,
  };
}

function orderFromRow(row: SalesRow): SaleOrderDTO {
  const order: SaleOrderDTO = {
    saleOrderId: String(row.saleOrderId),
    tenantId: String(row.tenantId),
    businessNumber: String(row.businessNumber),
    source: row.source as SaleOrderDTO['source'],
    branchId: String(row.branchId),
    warehouseId: String(row.warehouseId),
    status: row.status as SaleOrderDTO['status'],
    paymentStatus: row.paymentStatus as SaleOrderDTO['paymentStatus'],
    cashierId: String(row.cashierId),
    subtotalVnd: Number(row.subtotalVnd),
    discountVnd: Number(row.discountVnd),
    taxVnd: Number(row.taxVnd),
    shippingFeeVnd: Number(row.shippingFeeVnd),
    totalVnd: Number(row.totalVnd),
    paidVnd: Number(row.paidVnd),
    receivableVnd: Number(row.receivableVnd),
    draftVersion: Number(row.draftVersion),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
  assignOptionalString(order, 'customerId', row.customerId);
  assignOptionalString(order, 'salesPersonId', row.salesPersonId);
  assignOptionalString(order, 'note', row.note);
  assignOptionalString(order, 'quoteVersion', row.quoteVersion);
  assignOptionalString(order, 'completedAt', row.completedAt);
  assignOptionalString(order, 'confirmedAt', row.confirmedAt);
  assignOptionalString(order, 'packingAt', row.packingAt);
  assignOptionalString(order, 'shippedAt', row.shippedAt);
  assignOptionalString(order, 'deliveredAt', row.deliveredAt);
  assignOptionalString(order, 'cancelledAt', row.cancelledAt);
  assignOptionalString(order, 'linkedReturnId', row.linkedReturnId);
  assignOptionalString(order, 'linkedExchangeSaleId', row.linkedExchangeSaleId);
  if (row.recipientJson !== undefined && row.recipientJson !== null && row.recipientJson !== '') {
    order.recipient = deepClone(row.recipientJson as NonNullable<SaleOrderDTO['recipient']>);
  }
  return order;
}

function receiptToRow(receipt: ReceiptSnapshotDTO): SalesRow {
  const { lines, totals, ...row } = deepClone(receipt);
  return {
    ...row,
    linesJson: lines,
    totalsJson: totals,
  };
}

function receiptFromRow(row: SalesRow): ReceiptSnapshotDTO {
  return {
    receiptId: String(row.receiptId),
    saleOrderId: String(row.saleOrderId),
    businessNumber: String(row.businessNumber),
    receiptFormat: row.receiptFormat as ReceiptSnapshotDTO['receiptFormat'],
    createdAt: String(row.createdAt),
    branchId: String(row.branchId),
    warehouseId: String(row.warehouseId),
    cashierId: String(row.cashierId),
    customerId: optionalString(row.customerId),
    lines: deepClone((row.linesJson ?? []) as SaleOrderLineDTO[]),
    totals: deepClone(row.totalsJson as ReceiptSnapshotDTO['totals']),
  };
}

function returnToRow(returnOrder: SalesReturnDTO): SalesRow {
  const row = deepClone(returnOrder) as unknown as SalesRow;
  delete row.lines;
  return row;
}

function returnFromRow(row: SalesRow): SalesReturnDTO {
  const returnOrder: SalesReturnDTO = {
    returnId: String(row.returnId),
    tenantId: String(row.tenantId),
    branchId: String(row.branchId),
    warehouseId: String(row.warehouseId),
    status: row.status as SalesReturnDTO['status'],
    returnType: row.returnType as SalesReturnDTO['returnType'],
    reason: String(row.reason),
    receivedAt: String(row.receivedAt),
    actorId: String(row.actorId),
    lines: [],
  };
  assignOptionalString(returnOrder, 'customerId', row.customerId);
  assignOptionalString(returnOrder, 'sourceSaleOrderId', row.sourceSaleOrderId);
  assignOptionalString(returnOrder, 'resolvedAt', row.resolvedAt);
  assignOptionalString(returnOrder, 'approvedBy', row.approvedBy);
  assignOptionalString(returnOrder, 'linkedExchangeSaleId', row.linkedExchangeSaleId);
  return returnOrder;
}

function warrantyCaseToRow(warrantyCase: WarrantyCaseDTO): SalesRow {
  const { attachmentIds, ...row } = deepClone(warrantyCase);
  return {
    ...row,
    attachmentIdsJson: attachmentIds,
  };
}

function warrantyCaseFromRow(row: SalesRow): WarrantyCaseDTO {
  const warrantyCase: WarrantyCaseDTO = {
    warrantyCaseId: String(row.warrantyCaseId),
    tenantId: String(row.tenantId),
    customerId: String(row.customerId),
    saleOrderId: String(row.saleOrderId),
    saleLineId: String(row.saleLineId),
    variantId: String(row.variantId),
    serialId: String(row.serialId),
    receivedAt: String(row.receivedAt),
    status: row.status as WarrantyCaseDTO['status'],
    issue: String(row.issue),
    attachmentIds: deepClone((row.attachmentIdsJson ?? []) as string[]),
  };
  assignOptionalString(warrantyCase, 'policyVersionId', row.policyVersionId);
  assignOptionalString(warrantyCase, 'resolution', row.resolution);
  return warrantyCase;
}

function stripChildSetFields<TRecord extends object>(
  row: SalesRow,
  deps: Pick<ChildSetTableDependencies<TRecord>, 'parentField' | 'stripParentFieldFromRecord'>,
): SalesRow {
  const cloneRow = deepClone(row);
  delete cloneRow.id;
  delete cloneRow.tenantId;
  delete cloneRow.schemaVersion;
  delete cloneRow.recordVersion;
  delete cloneRow.lineSetVersion;
  delete cloneRow.tenderSetVersion;
  delete cloneRow.setIsEmpty;
  if (deps.stripParentFieldFromRecord === true) delete cloneRow[deps.parentField];
  return cloneRow;
}

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) throw new Error(`Missing sales table definition: ${tableName}`);
  return table;
}

function getRecordVersion(row: SalesRow): number {
  return getPositiveInteger(row.recordVersion) || getVersionFromId(row.id);
}

function getPositiveInteger(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getVersionFromId(value: unknown): number {
  const match = /:v(\d+)/.exec(String(value ?? ''));
  return match === null ? 0 : Number(match[1]);
}

function assignOptionalString<TRecord extends object>(
  record: TRecord,
  key: keyof TRecord & string,
  value: unknown,
): void {
  const text = optionalString(value);
  if (text !== undefined) (record as Record<string, unknown>)[key] = text;
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
