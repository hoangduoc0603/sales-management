import { describe, expect, it } from 'vitest';
import { createTableRegistryServiceForTest } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('TableRegistryService', () => {
  it('tạo header map theo tên cột thay vì index hard-code', () => {
    const service = createTableRegistryServiceForTest();
    expect(service.createHeaderMap('CommandTransaction', ['status', 'id', 'commandId'])).toEqual({
      status: 0,
      id: 1,
      commandId: 2,
    });
  });

  it('migration chỉ append cột thiếu theo registry', () => {
    const service = createTableRegistryServiceForTest();
    expect(service.planMigration('CommandTransaction', ['id', 'commandId'])).toEqual({
      action: 'appendColumns',
      missingHeaders: ['idempotencyKey', 'status', 'createdAt', 'updatedAt', 'resultJson', 'errorCode'],
    });
  });

  it('đăng ký table Catalog/CRM theo data dictionary Phase 4', () => {
    const service = createTableRegistryServiceForTest();
    const definitions = service.getDefinitions();
    const tableNames = definitions.map((table) => table.tableName);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        'Product',
        'Variant',
        'VariantBarcode',
        'UnitConversionVersion',
        'PriceList',
        'PriceRule',
        'Promotion',
        'Voucher',
        'Customer',
        'CustomerGroup',
      ]),
    );
    expect(definitions.find((table) => table.tableName === 'Variant')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'sku', 'unitPriceVnd']),
    );
    expect(definitions.find((table) => table.tableName === 'Customer')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'phone', 'email']),
    );
    expect(definitions.find((table) => table.tableName === 'VariantBarcode')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'barcode']),
    );
    expect(
      definitions.find((table) => table.tableName === 'UnitConversionVersion')?.headers.map((header) => header.name),
    ).toEqual(expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'unitName']));
  });

  it('đăng ký table Inventory ledger/projection theo data dictionary Phase 5', () => {
    const service = createTableRegistryServiceForTest();
    const definitions = service.getDefinitions();
    const tableNames = definitions.map((table) => table.tableName);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        'InventoryMovement',
        'InventoryBalance',
        'InventoryLotBalance',
        'SerialState',
        'StockTransfer',
        'StockTransferLine',
        'StocktakeSession',
        'StocktakeLine',
      ]),
    );
    expect(definitions.find((table) => table.tableName === 'InventoryMovement')).toMatchObject({
      owner: 'inventory',
      lifecycle: 'ledger',
      partitionPolicy: 'transaction-period',
    });
    expect(definitions.find((table) => table.tableName === 'InventoryBalance')).toMatchObject({
      owner: 'inventory',
      lifecycle: 'projection',
    });
    expect(
      definitions.find((table) => table.tableName === 'InventoryMovement')?.headers.map((header) => header.name),
    ).toEqual(expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'sourceLineId', 'idempotencyKey']));
    expect(
      definitions.find((table) => table.tableName === 'InventoryBalance')?.headers.map((header) => header.name),
    ).toEqual(expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'asOfMovementId']));
  });

  it('đăng ký table Finance theo data dictionary Phase 6', () => {
    const service = createTableRegistryServiceForTest();
    const definitions = service.getDefinitions();
    const tableNames = definitions.map((table) => table.tableName);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        'CashDrawer',
        'PaymentMethod',
        'Payment',
        'CashTransaction',
        'ReceivableLedger',
        'PayableLedger',
        'PaymentAllocation',
        'CustomerCredit',
        'SupplierPrepayment',
        'Shift',
        'Expense',
      ]),
    );
    expect(definitions.find((table) => table.tableName === 'CashTransaction')).toMatchObject({
      owner: 'finance',
      lifecycle: 'ledger',
      partitionPolicy: 'transaction-period',
    });
    expect(definitions.find((table) => table.tableName === 'Shift')).toMatchObject({
      owner: 'finance',
      lifecycle: 'document',
    });
    expect(definitions.find((table) => table.tableName === 'Payment')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'cashDrawerId', 'sourceLineId']),
    );
    expect(definitions.find((table) => table.tableName === 'CashTransaction')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'sourceLineId', 'idempotencyKey']),
    );
    expect(definitions.find((table) => table.tableName === 'ReceivableLedger')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'sourceLineId']),
    );
    expect(definitions.find((table) => table.tableName === 'Shift')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'closeReason']),
    );
  });

  it('đăng ký table Purchasing theo data dictionary Phase 9', () => {
    const service = createTableRegistryServiceForTest();
    const definitions = service.getDefinitions();
    const tableNames = definitions.map((table) => table.tableName);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        'Supplier',
        'PurchaseOrder',
        'PurchaseOrderLine',
        'GoodsReceipt',
        'GoodsReceiptLine',
        'LandedCostAdjustment',
        'PurchaseCostVariance',
        'SupplierReturn',
        'SupplierReturnLine',
      ]),
    );
    expect(definitions.find((table) => table.tableName === 'Supplier')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'paymentTermsJson', 'contactJson']),
    );
    expect(definitions.find((table) => table.tableName === 'PurchaseOrder')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'attachmentIdsJson']),
    );
    expect(definitions.find((table) => table.tableName === 'GoodsReceiptLine')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'schemaVersion', 'recordVersion', 'lineSetVersion', 'serialIdsJson']),
    );
    expect(definitions.find((table) => table.tableName === 'PurchaseCostVariance')).toMatchObject({
      owner: 'purchasing',
      lifecycle: 'ledger',
      partitionPolicy: 'transaction-period',
    });
  });

  it('đăng ký table Sales/POS/Return theo data dictionary Phase 7-8', () => {
    const service = createTableRegistryServiceForTest();
    const definitions = service.getDefinitions();
    const tableNames = definitions.map((table) => table.tableName);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        'SaleOrder',
        'SaleOrderLine',
        'SaleTenderDraft',
        'ReceiptSnapshot',
        'SaleReturn',
        'SaleReturnLine',
        'WarrantyCase',
      ]),
    );
    expect(definitions.find((table) => table.tableName === 'SaleOrder')).toMatchObject({
      owner: 'sales',
      lifecycle: 'document',
      partitionPolicy: 'transaction-period',
    });
    expect(definitions.find((table) => table.tableName === 'SaleOrder')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'draftVersion', 'recipientJson']),
    );
    expect(definitions.find((table) => table.tableName === 'SaleOrderLine')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'lineSetVersion', 'setIsEmpty']),
    );
    expect(definitions.find((table) => table.tableName === 'SaleTenderDraft')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'tenderSetVersion', 'paymentMethodId']),
    );
    expect(definitions.find((table) => table.tableName === 'ReceiptSnapshot')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'linesJson', 'totalsJson']),
    );
    expect(definitions.find((table) => table.tableName === 'SaleReturnLine')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'lineSetVersion', 'refundVnd']),
    );
    expect(definitions.find((table) => table.tableName === 'WarrantyCase')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'attachmentIdsJson']),
    );
  });

  it('đăng ký table Operations/Reporting runtime, evidence và audit theo data dictionary Phase 11', () => {
    const service = createTableRegistryServiceForTest();
    const definitions = service.getDefinitions();
    const tableNames = definitions.map((table) => table.tableName);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        'ImportBatch',
        'ImportStagingRow',
        'ExportRun',
        'BackgroundRun',
        'HealthCheck',
        'CapacityAlert',
        'AttachmentMetadata',
        'AuditLog',
        'BackupRun',
        'RestoreRun',
        'ReportProjectionState',
        'RuntimeRecord',
      ]),
    );
    expect(definitions.find((table) => table.tableName === 'AuditLog')).toMatchObject({
      owner: 'operations',
      storageRole: 'audit',
      lifecycle: 'audit',
      partitionPolicy: 'audit-period',
    });
    expect(definitions.find((table) => table.tableName === 'AttachmentMetadata')).toMatchObject({
      owner: 'operations',
      storageRole: 'transaction',
      lifecycle: 'document',
      partitionPolicy: 'transaction-period',
    });
    expect(definitions.find((table) => table.tableName === 'ReportProjectionState')).toMatchObject({
      owner: 'reporting',
      storageRole: 'transaction',
      lifecycle: 'projection',
      partitionPolicy: 'transaction-period',
    });
    expect(tableNames).toEqual(expect.arrayContaining(['DashboardProjection', 'ReportRow', 'ReportingExportRun']));
    expect(definitions.find((table) => table.tableName === 'DashboardProjection')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'projectionKey', 'responseJson']),
    );
    expect(definitions.find((table) => table.tableName === 'ReportRow')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'schemaVersion', 'recordVersion', 'rowSetVersion', 'rowJson']),
    );
    expect(definitions.find((table) => table.tableName === 'ReportingExportRun')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'tenantId', 'schemaVersion', 'recordVersion', 'queryJson', 'routing']),
    );
    expect(definitions.find((table) => table.tableName === 'ImportBatch')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'schemaVersion', 'recordVersion', 'batchId', 'sourceFileName', 'checksum']),
    );
    expect(definitions.find((table) => table.tableName === 'ImportStagingRow')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'schemaVersion', 'recordVersion', 'rowSetVersion', 'errorsJson', 'payloadJson']),
    );
    expect(definitions.find((table) => table.tableName === 'RuntimeRecord')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'schemaVersion', 'recordVersion', 'runtimeSetVersion', 'recordId', 'evidence']),
    );
    expect(definitions.find((table) => table.tableName === 'BackupRun')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'schemaVersion', 'recordVersion', 'backupSetVersion', 'backupType', 'manifestJson']),
    );
    expect(definitions.find((table) => table.tableName === 'RestoreRun')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'schemaVersion', 'recordVersion', 'writeFrozen']),
    );
    expect(definitions.find((table) => table.tableName === 'AuditLog')?.headers.map((header) => header.name)).toEqual(
      expect.arrayContaining(['id', 'schemaVersion', 'eventId', 'summaryJson']),
    );
  });
});
