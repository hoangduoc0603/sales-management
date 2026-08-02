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

  it('liệt kê, tìm kiếm và lọc product/variant theo trạng thái', () => {
    const service = createService();

    const milk = service.createProduct({
      productCode: 'SP-001',
      name: 'Sữa hạt óc chó 1L',
      productType: 'Stocked',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'chai',
      unitPriceVnd: 42000,
    });
    expect(milk).toMatchObject({ ok: true });
    service.createProduct({
      productCode: 'SP-002',
      name: 'Nước giặt sinh học 3,6kg',
      productType: 'Stocked',
      sku: 'NG-SH-3600',
      defaultUnitId: 'túi',
      unitPriceVnd: 185000,
    });
    if (!milk.ok) throw new Error('create product failed');

    expect(service.listProducts({}).items.map((item) => item.sku)).toEqual([
      'NG-SH-3600',
      'SH-OC-1L',
    ]);
    expect(service.listProducts({ query: 'óc chó' }).items).toHaveLength(1);
    expect(service.listProducts({ query: '893000000001' }).items[0]?.productId).toBe(
      milk.data.product.productId,
    );

    service.setProductActive({
      productId: milk.data.product.productId,
      isActive: false,
      reason: 'Ngừng bán tạm thời',
    });

    expect(service.listProducts({ status: 'Active' }).items.map((item) => item.sku)).toEqual([
      'NG-SH-3600',
    ]);
    expect(service.listProducts({ status: 'Inactive' }).items.map((item) => item.sku)).toEqual([
      'SH-OC-1L',
    ]);
    expect(service.listProducts({ status: 'All' }).items).toHaveLength(2);
  });

  it('cập nhật product/default variant và vẫn chặn SKU/barcode trùng', () => {
    const service = createService();

    const milk = service.createProduct({
      productCode: 'SP-001',
      name: 'Sữa hạt óc chó 1L',
      productType: 'Stocked',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'chai',
      unitPriceVnd: 42000,
    });
    const detergent = service.createProduct({
      productCode: 'SP-002',
      name: 'Nước giặt sinh học 3,6kg',
      productType: 'Stocked',
      sku: 'NG-SH-3600',
      barcode: '893000000002',
      defaultUnitId: 'túi',
      unitPriceVnd: 185000,
    });
    if (!milk.ok || !detergent.ok) throw new Error('create product failed');

    expect(
      service.updateProduct({
        productId: milk.data.product.productId,
        name: 'Sữa hạt óc chó 1L - mẫu mới',
        sku: 'NG-SH-3600',
        barcode: '893000000001',
        unitPriceVnd: 45000,
      }),
    ).toMatchObject({ ok: false, error: { code: 'DUPLICATE_SKU' } });

    expect(
      service.updateProduct({
        productId: milk.data.product.productId,
        name: 'Sữa hạt óc chó 1L - mẫu mới',
        sku: 'SH-OC-NEW',
        barcode: '893000000002',
        unitPriceVnd: 45000,
      }),
    ).toMatchObject({ ok: false, error: { code: 'DUPLICATE_BARCODE' } });

    const updated = service.updateProduct({
      productId: milk.data.product.productId,
      productCode: 'SP-001A',
      name: 'Sữa hạt óc chó 1L - mẫu mới',
      productType: 'Service',
      sku: 'SH-OC-NEW',
      barcode: '893000000099',
      inventoryMode: 'NotTracked',
      defaultUnitId: 'lần',
      unitPriceVnd: 45000,
    });

    expect(updated).toMatchObject({ ok: true });
    expect(service.listProducts({ query: 'mẫu mới' }).items[0]).toMatchObject({
      productCode: 'SP-001A',
      productType: 'Service',
      displayName: 'Sữa hạt óc chó 1L - mẫu mới',
      sku: 'SH-OC-NEW',
      barcode: '893000000099',
      inventoryMode: 'NotTracked',
      defaultUnitId: 'lần',
      unitPriceVnd: 45000,
    });
  });

  it('ngừng hoạt động product kéo theo default variant ra khỏi POS projection và có thể kích hoạt lại', () => {
    const service = createService();

    const created = service.createProduct({
      productCode: 'SP-001',
      name: 'Sữa hạt óc chó 1L',
      productType: 'Stocked',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'chai',
      unitPriceVnd: 42000,
    });
    if (!created.ok) throw new Error('create product failed');

    expect(
      service.setProductActive({
        productId: created.data.product.productId,
        isActive: false,
        reason: 'Ngừng kinh doanh',
      }),
    ).toMatchObject({ ok: true, data: { product: { isActive: false }, defaultVariant: { isActive: false } } });

    expect(
      service.getPosProjection({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
      }).variants,
    ).toHaveLength(0);

    expect(
      service.setProductActive({
        productId: created.data.product.productId,
        isActive: true,
      }),
    ).toMatchObject({ ok: true, data: { product: { isActive: true }, defaultVariant: { isActive: true } } });
  });
});
