import { describe, expect, it } from 'vitest';
import { createProductionRepositories } from '../../../apps-script/src/bootstrap/create-production-repositories';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';

describe('Production repository aggregate', () => {
  it('wires platform and sellable domain repositories to SheetGateway partitions', () => {
    const gateway = new FakeSheetGateway();
    const repositories = createProductionRepositories({
      sheetGateway: gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
      auditPartitionKey: 'AUDIT-2026-07',
    });

    repositories.commandRepository.save({
      commandId: 'cmd-1',
      idempotencyKey: 'idem-1',
      status: 'Committed',
      createdAt: '2026-07-27T08:00:00.000Z',
      updatedAt: '2026-07-27T08:00:00.000Z',
    });
    repositories.auditOutboxRepository.append({
      eventId: 'event-1',
      commandId: 'cmd-1',
      actorId: 'user-admin',
      action: 'bootstrap.install',
      status: 'Pending',
      createdAt: '2026-07-27T08:00:00.000Z',
    });
    repositories.catalogRepository.saveProduct({
      productId: 'product-1',
      tenantId: 'tenant-default',
      productCode: 'P001',
      name: 'Sản phẩm 1',
      productType: 'Stocked',
      isActive: true,
    });
    repositories.inventoryRepository.appendMovement({
      movementId: 'movement-1',
      tenantId: 'tenant-default',
      movementType: 'OpeningBalance',
      warehouseId: 'warehouse-default',
      variantId: 'variant-1',
      quantityMilli: 1000,
      unitCostVnd: 100000,
      totalCostVnd: 100000,
      sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
      effectiveAt: '2026-07-27T08:00:00.000Z',
      actorId: 'user-admin',
      idempotencyKey: 'idem-movement-1',
    });
    repositories.financeRepository.savePaymentMethod({
      paymentMethodId: 'cash',
      tenantId: 'tenant-default',
      methodCode: 'CASH',
      name: 'Tiền mặt',
      methodType: 'Cash',
      status: 'Active',
    });
    repositories.customerRepository.saveCustomer({
      customerId: 'customer-1',
      tenantId: 'tenant-default',
      customerCode: 'C001',
      displayName: 'Khách lẻ',
      status: 'Active',
    });
    repositories.purchasingRepository.saveSupplier({
      supplierId: 'supplier-1',
      tenantId: 'tenant-default',
      supplierCode: 'SUP-001',
      name: 'Nhà cung cấp',
      status: 'Active',
      paymentTerms: { dueDays: 7 },
      createdAt: '2026-07-27T08:00:00.000Z',
      updatedAt: '2026-07-27T08:00:00.000Z',
    });
    repositories.salesRepository.saveOrder({
      saleOrderId: 'sale-1',
      tenantId: 'tenant-default',
      businessNumber: 'SO-1',
      source: 'POS',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      status: 'Draft',
      paymentStatus: 'Unpaid',
      cashierId: 'cashier-1',
      subtotalVnd: 0,
      discountVnd: 0,
      taxVnd: 0,
      shippingFeeVnd: 0,
      totalVnd: 0,
      paidVnd: 0,
      receivableVnd: 0,
      draftVersion: 1,
      createdAt: '2026-07-27T08:00:00.000Z',
      updatedAt: '2026-07-27T08:00:00.000Z',
    });
    repositories.operationsRepository.saveHealthCheck({
      checkId: 'check-1',
      checkType: 'RepositoryWiring',
      status: 'Ok',
      observedAt: '2026-07-27T08:00:00.000Z',
      resourceKey: 'sheet-gateway',
      message: 'ok',
    });
    repositories.reportingRepository.saveReportRows('sales-summary', [{ netRevenueVnd: 100000 }]);

    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey])).toEqual([
      ['CommandTransaction', 'FY2026-P01'],
      ['AuditOutbox', 'FY2026-P01'],
      ['Product', undefined],
      ['InventoryMovement', 'FY2026-P01'],
      ['PaymentMethod', undefined],
      ['Customer', undefined],
      ['Supplier', undefined],
      ['SaleOrder', 'FY2026-P01'],
      ['HealthCheck', undefined],
      ['ReportRow', 'FY2026-P01'],
    ]);
  });

  it('fails fast when required sellable domain table definitions are missing', () => {
    const tableDefinitions = createPlatformTableDefinitions().filter((definition) => definition.tableName !== 'SaleOrder');

    expect(() =>
      createProductionRepositories({
        sheetGateway: new FakeSheetGateway(),
        tableDefinitions,
        transactionPartitionKey: 'FY2026-P01',
        auditPartitionKey: 'AUDIT-2026-07',
      }),
    ).toThrow(/Missing sales table definition: SaleOrder/);
  });
});

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

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
