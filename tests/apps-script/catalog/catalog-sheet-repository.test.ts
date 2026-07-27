import { describe, expect, it } from 'vitest';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import { createSheetCatalogRepository } from '../../../apps-script/src/repositories/catalog/catalog-repository';
import { createCatalogService } from '../../../apps-script/src/services/catalog/catalog-service';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed CatalogRepository', () => {
  it('persists product, default variant, unit and barcode for POS projection through SheetGateway', () => {
    const gateway = new FakeSheetGateway();
    const repository = createSheetCatalogRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
    });
    const service = createCatalogService({
      repository,
      tenantId: 'tenant-default',
      now: () => new Date('2026-07-27T00:00:00.000Z'),
      newId: createSequenceId(),
    });

    const created = service.createProduct({
      productCode: 'SP-001',
      name: 'Sữa hạt óc chó 1L',
      productType: 'Stocked',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'chai',
      unitPriceVnd: 42000,
    });
    const projection = service.getPosProjection({
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
    });

    expect(created).toMatchObject({ ok: true });
    expect(projection.variants).toEqual([
      expect.objectContaining({
        variantId: 'variant-2',
        productId: 'product-1',
        sku: 'SH-OC-1L',
        displayName: 'Sữa hạt óc chó 1L',
        barcode: '893000000001',
        unitVersionId: 'unit-version-3',
        unitName: 'chai',
        unitPriceVnd: 42000,
        saleEnabled: true,
        inventoryMode: 'Tracked',
      }),
    ]);
    expect(gateway.appendRequests.map((request) => request.tableName)).toEqual([
      'Product',
      'Variant',
      'UnitConversionVersion',
      'VariantBarcode',
    ]);
    expect(gateway.appendRequests[1]!.rows[0]).toMatchObject({
      id: 'variant-2:v1',
      tenantId: 'tenant-default',
      schemaVersion: 1,
      recordVersion: 1,
      variantId: 'variant-2',
      sku: 'SH-OC-1L',
      skuNormalized: 'SH-OC-1L',
      unitPriceVnd: 42000,
    });
  });

  it('reads existing SKU and barcode lookup records from Sheets without hard-coded header order', () => {
    const gateway = new FakeSheetGateway({
      Variant: [
        {
          id: 'variant-existing:v1',
          tenantId: 'tenant-default',
          schemaVersion: 1,
          recordVersion: 1,
          variantId: 'variant-existing',
          productId: 'product-existing',
          sku: 'EXIST-001',
          skuNormalized: 'EXIST-001',
          displayName: 'Hàng đã có',
          inventoryMode: 'Tracked',
          lotTracking: false,
          serialTracking: false,
          defaultUnitId: 'chai',
          isActive: true,
          unitPriceVnd: 10000,
        },
      ],
      VariantBarcode: [
        {
          id: 'barcode-existing:v1',
          tenantId: 'tenant-default',
          schemaVersion: 1,
          recordVersion: 1,
          barcodeId: 'barcode-existing',
          variantId: 'variant-existing',
          unitVersionId: 'unit-existing',
          barcode: '893000000001',
          barcodeNormalized: '893000000001',
          barcodeKind: 'Manufacturer',
          isActive: true,
        },
      ],
    });
    const repository = createSheetCatalogRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
    });

    expect(repository.findVariantBySkuNormalized('EXIST-001')).toMatchObject({
      variantId: 'variant-existing',
      sku: 'EXIST-001',
    });
    expect(repository.findBarcodeByNormalized('893000000001')).toMatchObject({
      barcodeId: 'barcode-existing',
      barcode: '893000000001',
    });
  });
});

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; rows: Record<string, unknown>[] }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  constructor(seed: Record<string, Record<string, unknown>[]> = {}) {
    for (const [tableName, rows] of Object.entries(seed)) {
      this.rowsByTable.set(tableName, rows.map(clone));
    }
  }

  readTable(request: { table: TableDefinitionDTO }): Record<string, unknown>[] {
    return this.getRows(request.table.tableName).map(clone);
  }

  appendRows(request: { table: TableDefinitionDTO; rows: readonly Record<string, unknown>[] }): { appendedRowCount: number } {
    const rows = request.rows.map(clone);
    this.appendRequests.push({
      tableName: request.table.tableName,
      rows,
    });
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
