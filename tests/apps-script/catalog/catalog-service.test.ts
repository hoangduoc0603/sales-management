import { describe, expect, it } from 'vitest';
import { createInMemoryCatalogRepository } from '../../../apps-script/src/repositories/catalog/catalog-repository';
import { createCatalogService } from '../../../apps-script/src/services/catalog/catalog-service';

function createService() {
  let sequence = 0;

  return createCatalogService({
    repository: createInMemoryCatalogRepository(),
    tenantId: 'tenant-default',
    now: () => new Date('2026-07-27T00:00:00.000Z'),
    newId(prefix) {
      sequence += 1;
      return `${prefix}-${sequence}`;
    },
  });
}

describe('CatalogService', () => {
  it('tạo product đơn giản với Default Variant là đơn vị giao dịch', () => {
    const service = createService();

    const result = service.createProduct({
      productCode: 'SP-001',
      name: 'Sữa hạt óc chó 1L',
      productType: 'Stocked',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'unit-bottle',
      unitPriceVnd: 42000,
    });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error('create product failed');

    expect(result.data.product.productId).toBe(result.data.defaultVariant.productId);
    expect(result.data.defaultVariant.displayName).toBe('Sữa hạt óc chó 1L');
    expect(result.data.defaultUnit.variantId).toBe(result.data.defaultVariant.variantId);
    expect(result.data.barcode?.variantId).toBe(result.data.defaultVariant.variantId);
  });

  it('chặn SKU và barcode trùng không phân biệt hoa thường', () => {
    const service = createService();

    const first = service.createProduct({
      productCode: 'SP-001',
      name: 'Sữa hạt óc chó 1L',
      productType: 'Stocked',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'unit-bottle',
      unitPriceVnd: 42000,
    });
    expect(first).toMatchObject({ ok: true });

    expect(
      service.createProduct({
        productCode: 'SP-002',
        name: 'Sữa hạt óc chó 500ml',
        productType: 'Stocked',
        sku: ' sh-oc-1l ',
        barcode: '893000000002',
        defaultUnitId: 'unit-bottle',
        unitPriceVnd: 25000,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE_SKU' },
    });

    expect(
      service.createProduct({
        productCode: 'SP-003',
        name: 'Sữa hạt óc chó thùng',
        productType: 'Stocked',
        sku: 'SH-OC-BOX',
        barcode: ' 893000000001 ',
        defaultUnitId: 'unit-box',
        unitPriceVnd: 480000,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE_BARCODE' },
    });
  });

  it('POS projection chỉ chứa dữ liệu bán hàng, không lộ cost/supplier', () => {
    const service = createService();

    service.createProduct({
      productCode: 'SP-001',
      name: 'Sữa hạt óc chó 1L',
      productType: 'Stocked',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'unit-bottle',
      unitPriceVnd: 42000,
    });

    const projection = service.getPosProjection({
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
    });

    expect(projection.variants).toHaveLength(1);
    expect(projection.variants[0]).toMatchObject({
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      unitPriceVnd: 42000,
    });
    expect(JSON.stringify(projection)).not.toContain('cost');
    expect(JSON.stringify(projection)).not.toContain('supplier');
  });
});
