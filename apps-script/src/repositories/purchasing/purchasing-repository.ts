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
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { AppendOnlySheetRecordGateway } from '../platform/sheet-record-repository';

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

export interface SheetPurchasingRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  transactionPartitionKey: string;
}

export function createSheetPurchasingRepository(deps: SheetPurchasingRepositoryDependencies): PurchasingRepository {
  const suppliers = createVersionedTable<SupplierDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'Supplier'),
    idField: 'supplierId',
    toRow: supplierToRow,
    fromRow: supplierFromRow,
  });
  const purchaseOrders = createVersionedTable<PurchaseOrderDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'PurchaseOrder'),
    idField: 'purchaseOrderId',
    partitionKey: deps.transactionPartitionKey,
    toRow: purchaseOrderToRow,
    fromRow: purchaseOrderFromRow,
  });
  const purchaseOrderLines = createReplacementSetTable<PurchaseOrderLineDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'PurchaseOrderLine'),
    parentField: 'purchaseOrderId',
    childIdField: 'purchaseOrderLineId',
    setVersionField: 'lineSetVersion',
    partitionKey: deps.transactionPartitionKey,
  });
  const goodsReceipts = createVersionedTable<GoodsReceiptDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'GoodsReceipt'),
    idField: 'goodsReceiptId',
    partitionKey: deps.transactionPartitionKey,
  });
  const goodsReceiptLines = createReplacementSetTable<GoodsReceiptLineDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'GoodsReceiptLine'),
    parentField: 'goodsReceiptId',
    childIdField: 'goodsReceiptLineId',
    setVersionField: 'lineSetVersion',
    partitionKey: deps.transactionPartitionKey,
    toRow: goodsReceiptLineToRow,
    fromRow: goodsReceiptLineFromRow,
  });
  const landedCostAdjustments = createVersionedTable<LandedCostAdjustmentDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'LandedCostAdjustment'),
    idField: 'adjustmentId',
    partitionKey: deps.transactionPartitionKey,
  });
  const purchaseCostVariances = createAppendOnlyTable<PurchaseCostVarianceDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'PurchaseCostVariance'),
    idField: 'varianceId',
    partitionKey: deps.transactionPartitionKey,
  });
  const supplierReturns = createVersionedTable<SupplierReturnDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'SupplierReturn'),
    idField: 'supplierReturnId',
    partitionKey: deps.transactionPartitionKey,
  });
  const supplierReturnLines = createReplacementSetTable<SupplierReturnLineDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'SupplierReturnLine'),
    parentField: 'supplierReturnId',
    childIdField: 'supplierReturnLineId',
    setVersionField: 'lineSetVersion',
    partitionKey: deps.transactionPartitionKey,
  });

  return {
    saveSupplier(supplier) {
      suppliers.save(supplier);
    },
    getSupplier(supplierId) {
      return suppliers.list().find((supplier) => supplier.supplierId === supplierId);
    },
    findSupplierByCode(supplierCode) {
      const normalized = normalizeCode(supplierCode);
      return suppliers.list().find((supplier) => normalizeCode(supplier.supplierCode) === normalized);
    },
    listSuppliers: () => suppliers.list(),
    savePurchaseOrder(order) {
      purchaseOrders.save(order);
    },
    savePurchaseOrderLines(purchaseOrderId, lines) {
      purchaseOrderLines.saveSet(purchaseOrderId, lines);
    },
    getPurchaseOrder(purchaseOrderId) {
      return purchaseOrders.list().find((order) => order.purchaseOrderId === purchaseOrderId);
    },
    getPurchaseOrderLines(purchaseOrderId) {
      return purchaseOrderLines.listSet(purchaseOrderId);
    },
    saveGoodsReceipt(receipt) {
      goodsReceipts.save(receipt);
    },
    saveGoodsReceiptLines(goodsReceiptId, lines) {
      goodsReceiptLines.saveSet(goodsReceiptId, lines);
    },
    getGoodsReceipt(goodsReceiptId) {
      return goodsReceipts.list().find((receipt) => receipt.goodsReceiptId === goodsReceiptId);
    },
    getGoodsReceiptLines(goodsReceiptId) {
      return goodsReceiptLines.listSet(goodsReceiptId);
    },
    listGoodsReceiptsByPo(purchaseOrderId) {
      return goodsReceipts.list().filter((receipt) => receipt.purchaseOrderId === purchaseOrderId);
    },
    saveLandedCostAdjustment(adjustment) {
      landedCostAdjustments.save(adjustment);
    },
    appendPurchaseCostVariance(variance) {
      purchaseCostVariances.append(variance);
    },
    listPurchaseCostVariances() {
      return purchaseCostVariances.list();
    },
    saveSupplierReturn(supplierReturn) {
      supplierReturns.save(supplierReturn);
    },
    saveSupplierReturnLines(supplierReturnId, lines) {
      supplierReturnLines.saveSet(supplierReturnId, lines);
    },
    getSupplierReturn(supplierReturnId) {
      return supplierReturns.list().find((supplierReturn) => supplierReturn.supplierReturnId === supplierReturnId);
    },
    getSupplierReturnLines(supplierReturnId) {
      return supplierReturnLines.listSet(supplierReturnId);
    },
    listSupplierReturnsByReceipt(goodsReceiptId) {
      return supplierReturns.list().filter((supplierReturn) => supplierReturn.goodsReceiptId === goodsReceiptId);
    },
  };
}

type PurchasingRow = Record<string, unknown>;

interface VersionedTableDependencies<TRecord extends object> {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  idField: keyof TRecord & string;
  partitionKey?: string;
  toRow?(record: TRecord): PurchasingRow;
  fromRow?(row: PurchasingRow): TRecord;
}

function createVersionedTable<TRecord extends object>(deps: VersionedTableDependencies<TRecord>) {
  const toRow = deps.toRow ?? ((record: TRecord) => deepClone(record) as unknown as PurchasingRow);
  const fromRow = deps.fromRow ?? ((row: PurchasingRow) => stripTechnicalFields(row) as TRecord);

  function readRows(): PurchasingRow[] {
    return deps.gateway
      .readTable({ table: deps.table, partitionKey: deps.partitionKey })
      .map((row) => deepClone(row) as PurchasingRow);
  }

  return {
    list(): TRecord[] {
      return latestRowsBy(readRows(), deps.idField).map((row) => deepClone(fromRow(row)));
    },
    save(record: TRecord): void {
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
        rows: [{ ...row, id: `${recordId}:v${nextVersion}`, schemaVersion: deps.table.schemaVersion, recordVersion: nextVersion }],
      });
    },
  };
}

interface ReplacementSetTableDependencies<TRecord extends object> {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  partitionKey?: string;
  parentField: string;
  childIdField: keyof TRecord & string;
  setVersionField: string;
  toRow?(record: TRecord): PurchasingRow;
  fromRow?(row: PurchasingRow): TRecord;
}

function createReplacementSetTable<TRecord extends object>(deps: ReplacementSetTableDependencies<TRecord>) {
  const toRow = deps.toRow ?? ((record: TRecord) => deepClone(record) as unknown as PurchasingRow);
  const fromRow = deps.fromRow ?? ((row: PurchasingRow) => stripReplacementFields(row, deps) as TRecord);

  function readRows(): PurchasingRow[] {
    return deps.gateway
      .readTable({ table: deps.table, partitionKey: deps.partitionKey })
      .map((row) => deepClone(row) as PurchasingRow);
  }

  return {
    listSet(parentId: string): TRecord[] {
      const rows = readRows().filter((row) => String(row[deps.parentField] ?? '') === parentId);
      const latestSetVersion = rows.reduce((max, row) => Math.max(max, getPositiveInteger(row[deps.setVersionField])), 0);
      if (latestSetVersion === 0) return [];
      const setRows = rows.filter((row) => getPositiveInteger(row[deps.setVersionField]) === latestSetVersion);
      if (setRows.some((row) => row.setIsEmpty === true)) return [];
      return latestRowsBy(setRows, deps.childIdField).map((row) => deepClone(fromRow(row)));
    },
    saveSet(parentId: string, records: readonly TRecord[]): void {
      const setVersion =
        readRows()
          .filter((row) => String(row[deps.parentField] ?? '') === parentId)
          .reduce((max, row) => Math.max(max, getPositiveInteger(row[deps.setVersionField])), 0) + 1;
      const rows =
        records.length === 0
          ? [
              {
                id: `${parentId}:${deps.setVersionField}:s${setVersion}:empty`,
                [deps.parentField]: parentId,
                [deps.setVersionField]: setVersion,
                setIsEmpty: true,
                schemaVersion: deps.table.schemaVersion,
              },
            ]
          : records.map((record) => {
              const row = toRow(record);
              const childId = String(row[deps.childIdField] ?? '');
              if (childId.trim() === '') throw new Error(`MissingRecordId:${deps.table.tableName}.${deps.childIdField}`);
              const childVersion =
                readRows()
                  .filter((current) => String(current[deps.childIdField] ?? '') === childId)
                  .reduce((max, current) => Math.max(max, getRecordVersion(current)), 0) + 1;
              return {
                ...row,
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

function createAppendOnlyTable<TRecord extends object>(deps: VersionedTableDependencies<TRecord>) {
  const toRow = deps.toRow ?? ((record: TRecord) => deepClone(record) as unknown as PurchasingRow);
  const fromRow = deps.fromRow ?? ((row: PurchasingRow) => stripTechnicalFields(row) as TRecord);

  function readRows(): PurchasingRow[] {
    return deps.gateway
      .readTable({ table: deps.table, partitionKey: deps.partitionKey })
      .map((row) => deepClone(row) as PurchasingRow);
  }

  return {
    list(): TRecord[] {
      return readRows().map((row) => deepClone(fromRow(row)));
    },
    append(record: TRecord): void {
      const row = toRow(record);
      const recordId = String(row[deps.idField] ?? '');
      if (readRows().some((current) => String(current[deps.idField] ?? '') === recordId || String(current.id ?? '') === recordId)) {
        throw new Error(`DuplicatePrimaryKey:${deps.table.tableName}.id:${recordId}`);
      }
      deps.gateway.appendRows({
        table: deps.table,
        partitionKey: deps.partitionKey,
        rows: [{ ...row, id: recordId, schemaVersion: deps.table.schemaVersion }],
      });
    },
  };
}

function supplierToRow(supplier: SupplierDTO): PurchasingRow {
  const { paymentTerms, contact, ...row } = deepClone(supplier);
  return { ...row, paymentTermsJson: paymentTerms, contactJson: contact };
}

function supplierFromRow(row: PurchasingRow): SupplierDTO {
  const supplier = stripTechnicalFields(row) as unknown as SupplierDTO;
  supplier.paymentTerms = deepClone((row.paymentTermsJson ?? row.paymentTerms) as SupplierDTO['paymentTerms']);
  if (row.contactJson !== undefined) supplier.contact = deepClone(row.contactJson as SupplierDTO['contact']);
  delete (supplier as unknown as PurchasingRow).paymentTermsJson;
  delete (supplier as unknown as PurchasingRow).contactJson;
  return supplier;
}

function purchaseOrderToRow(order: PurchaseOrderDTO): PurchasingRow {
  const { attachmentIds, termsSnapshot, ...row } = deepClone(order);
  return { ...row, attachmentIdsJson: attachmentIds, termsSnapshotJson: termsSnapshot };
}

function purchaseOrderFromRow(row: PurchasingRow): PurchaseOrderDTO {
  const order = stripTechnicalFields(row) as unknown as PurchaseOrderDTO;
  order.attachmentIds = deepClone((row.attachmentIdsJson ?? []) as string[]);
  if (row.termsSnapshotJson !== undefined) {
    order.termsSnapshot = deepClone(row.termsSnapshotJson as PurchaseOrderDTO['termsSnapshot']);
  }
  delete (order as unknown as PurchasingRow).attachmentIdsJson;
  delete (order as unknown as PurchasingRow).termsSnapshotJson;
  return order;
}

function goodsReceiptLineToRow(line: GoodsReceiptLineDTO): PurchasingRow {
  const { serialIds, ...row } = deepClone(line);
  return { ...row, serialIdsJson: serialIds };
}

function goodsReceiptLineFromRow(row: PurchasingRow): GoodsReceiptLineDTO {
  const line = stripReplacementFields(row, { setVersionField: 'lineSetVersion' }) as unknown as GoodsReceiptLineDTO;
  if (row.serialIdsJson !== undefined) line.serialIds = deepClone(row.serialIdsJson as string[]);
  delete (line as unknown as PurchasingRow).serialIdsJson;
  return line;
}

function latestRowsBy(rows: readonly PurchasingRow[], idField: string): PurchasingRow[] {
  const latestById = new Map<string, PurchasingRow>();
  for (const row of rows) {
    const recordId = String(row[idField] ?? '');
    if (recordId === '') continue;
    const current = latestById.get(recordId);
    if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) latestById.set(recordId, row);
  }
  return [...latestById.values()];
}

function stripTechnicalFields(row: PurchasingRow): PurchasingRow {
  const next = deepClone(row);
  delete next.id;
  delete next.schemaVersion;
  delete next.recordVersion;
  return next;
}

function stripReplacementFields<TRecord extends object>(
  row: PurchasingRow,
  deps: Pick<ReplacementSetTableDependencies<TRecord>, 'setVersionField'>,
): PurchasingRow {
  const next = stripTechnicalFields(row);
  delete next[deps.setVersionField];
  delete next.setIsEmpty;
  return next;
}

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) throw new Error(`Missing purchasing table definition: ${tableName}`);
  return table;
}

function getRecordVersion(row: PurchasingRow): number {
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

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
