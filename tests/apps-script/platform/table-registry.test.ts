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
      missingHeaders: ['idempotencyKey', 'status', 'createdAt', 'updatedAt', 'resultJson'],
    });
  });

  it('đăng ký table Catalog/CRM theo data dictionary Phase 4', () => {
    const service = createTableRegistryServiceForTest();
    const tableNames = service.getDefinitions().map((table) => table.tableName);

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
  });
});
