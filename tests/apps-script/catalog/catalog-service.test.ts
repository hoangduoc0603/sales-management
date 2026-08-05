import { describe, expect, it } from 'vitest';
import { createInMemoryCatalogRepository } from '../../../apps-script/src/repositories/catalog/catalog-repository';
import { createCatalogService } from '../../../apps-script/src/services/catalog/catalog-service';

function createService(repository = createInMemoryCatalogRepository()) {
  let sequence = 0;

  return createCatalogService({
    repository,
    tenantId: 'tenant-default',
    now: () => new Date('2026-07-27T00:00:00.000Z'),
    newId(prefix) {
      sequence += 1;
      return `${prefix}-${sequence}`;
    },
  });
}

describe('CatalogService', () => {
  it('re-quotes requested POS lines without constructing a full POS projection', () => {
    const service = createService();
    const created = service.createProduct({
      productCode: 'SP-QUOTE-001',
      name: 'Hàng re-quote',
      productType: 'Stocked',
      sku: 'QUOTE-001',
      defaultUnitId: 'cái',
      unitPriceVnd: 42000,
    });
    if (!created.ok) throw new Error('create product failed');

    expect(
      service.quotePosLines({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        lines: [
          {
            lineId: 'line-quote-1',
            variantId: created.data.defaultVariant.variantId,
            unitVersionId: created.data.defaultUnit.unitVersionId,
            quantity: 2,
          },
        ],
      }),
    ).toMatchObject({ ok: true, quote: { totalVnd: 84000, lines: [{ unitPriceVnd: 42000 }] } });
  });

  it('rejects POS revalidation when the active variant parent product is no longer active instead of quoting zero', () => {
    const repository = createInMemoryCatalogRepository();
    const service = createService(repository);
    const created = service.createProduct({
      productCode: 'SP-QUOTE-INACTIVE',
      name: 'Hàng đã ngừng bán',
      productType: 'Stocked',
      sku: 'QUOTE-INACTIVE',
      defaultUnitId: 'cái',
      unitPriceVnd: 42000,
    });
    if (!created.ok) throw new Error('create product failed');
    repository.saveProduct({ ...created.data.product, isActive: false });

    expect(
      service.quotePosLines({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        lines: [{
          lineId: 'line-quote-inactive',
          variantId: created.data.defaultVariant.variantId,
          unitVersionId: created.data.defaultUnit.unitVersionId,
          quantity: 1,
        }],
      }),
    ).toMatchObject({ ok: false, error: { lineId: 'line-quote-inactive', reason: 'PRODUCT_INACTIVE' } });
  });

  it('changes POS projectionVersion when price changes without changing the visible variant count', () => {
    const repository = createInMemoryCatalogRepository();
    const service = createService(repository);
    const created = service.createProduct({
      productCode: 'SP-PROJECTION-VERSION',
      name: 'Hàng đổi giá',
      productType: 'Stocked',
      sku: 'PROJECTION-VERSION',
      defaultUnitId: 'cái',
      unitPriceVnd: 42000,
    });
    if (!created.ok) throw new Error('create product failed');
    const before = service.getPosProjection({ branchId: 'branch-default', warehouseId: 'warehouse-default' });

    repository.saveVariant({ ...created.data.defaultVariant, unitPriceVnd: 43000 });
    const after = service.getPosProjection({ branchId: 'branch-default', warehouseId: 'warehouse-default' });

    expect(after.variants).toHaveLength(before.variants.length);
    expect(after.variants[0]?.unitPriceVnd).toBe(43000);
    expect(after.projectionVersion).not.toBe(before.projectionVersion);
  });

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

  it('tạo biến thể độc lập cho product và đưa vào POS projection', () => {
    const service = createService();

    const created = service.createProduct({
      productCode: 'SP-001',
      name: 'Sữa hạt óc chó',
      productType: 'Stocked',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'chai',
      unitPriceVnd: 42000,
    });
    if (!created.ok) throw new Error('create product failed');

    const variant = service.createVariant({
      productId: created.data.product.productId,
      displayName: 'Sữa hạt óc chó thùng 12 chai',
      sku: 'SH-OC-BOX12',
      barcode: '893000000012',
      defaultUnitId: 'thùng',
      unitPriceVnd: 480000,
      unitFactor: 12,
    });

    expect(variant).toMatchObject({
      ok: true,
      data: {
        variant: {
          productId: created.data.product.productId,
          sku: 'SH-OC-BOX12',
          displayName: 'Sữa hạt óc chó thùng 12 chai',
          defaultUnitId: 'thùng',
          unitPriceVnd: 480000,
        },
        unit: {
          factor: 12,
          saleEnabled: true,
          purchaseEnabled: true,
        },
        barcode: {
          barcode: '893000000012',
        },
      },
    });

    expect(service.listProducts({ query: 'box12' }).items).toHaveLength(1);
    expect(
      service
        .getPosProjection({ branchId: 'branch-default', warehouseId: 'warehouse-default' })
        .variants.map((item) => item.sku),
    ).toEqual(['SH-OC-1L', 'SH-OC-BOX12']);
  });

  it('cập nhật biến thể độc lập và vẫn chặn SKU/barcode trùng', () => {
    const service = createService();

    const created = service.createProduct({
      productCode: 'SP-001',
      name: 'Sữa hạt óc chó',
      productType: 'Stocked',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'chai',
      unitPriceVnd: 42000,
    });
    if (!created.ok) throw new Error('create product failed');
    const variant = service.createVariant({
      productId: created.data.product.productId,
      displayName: 'Sữa hạt óc chó thùng 12 chai',
      sku: 'SH-OC-BOX12',
      barcode: '893000000012',
      defaultUnitId: 'thùng',
      unitPriceVnd: 480000,
      unitFactor: 12,
    });
    if (!variant.ok) throw new Error('create variant failed');

    expect(
      service.updateVariant({
        variantId: variant.data.variant.variantId,
        sku: 'SH-OC-1L',
      }),
    ).toMatchObject({ ok: false, error: { code: 'DUPLICATE_SKU' } });
    expect(
      service.updateVariant({
        variantId: variant.data.variant.variantId,
        barcode: '893000000001',
      }),
    ).toMatchObject({ ok: false, error: { code: 'DUPLICATE_BARCODE' } });

    const updated = service.updateVariant({
      variantId: variant.data.variant.variantId,
      displayName: 'Sữa hạt óc chó thùng 24 chai',
      sku: 'SH-OC-BOX24',
      barcode: '893000000024',
      defaultUnitId: 'thùng',
      unitPriceVnd: 920000,
      unitFactor: 24,
      purchaseEnabled: false,
    });

    expect(updated).toMatchObject({
      ok: true,
      data: {
        variant: {
          displayName: 'Sữa hạt óc chó thùng 24 chai',
          sku: 'SH-OC-BOX24',
          defaultUnitId: 'thùng',
          unitPriceVnd: 920000,
        },
        unit: {
          factor: 24,
          purchaseEnabled: false,
        },
        barcode: {
          barcode: '893000000024',
        },
      },
    });
    expect(service.listProducts({ query: 'box24' }).items).toHaveLength(1);
  });

  it('ngừng hoạt động biến thể độc lập không làm tắt product/default variant', () => {
    const service = createService();

    const created = service.createProduct({
      productCode: 'SP-001',
      name: 'Sữa hạt óc chó',
      productType: 'Stocked',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'chai',
      unitPriceVnd: 42000,
    });
    if (!created.ok) throw new Error('create product failed');
    const variant = service.createVariant({
      productId: created.data.product.productId,
      displayName: 'Sữa hạt óc chó thùng 12 chai',
      sku: 'SH-OC-BOX12',
      defaultUnitId: 'thùng',
      unitPriceVnd: 480000,
    });
    if (!variant.ok) throw new Error('create variant failed');

    expect(
      service.setVariantActive({
        variantId: variant.data.variant.variantId,
        isActive: false,
        reason: 'Ngừng bán theo thùng',
      }),
    ).toMatchObject({
      ok: true,
      data: {
        product: { isActive: true },
        variant: { isActive: false },
      },
    });

    expect(service.listProducts({ status: 'Active' }).items.map((item) => item.sku)).toEqual([
      'SH-OC-1L',
    ]);
    expect(service.listProducts({ status: 'Inactive' }).items.map((item) => item.sku)).toEqual([
      'SH-OC-BOX12',
    ]);
    expect(
      service
        .getPosProjection({ branchId: 'branch-default', warehouseId: 'warehouse-default' })
        .variants.map((item) => item.sku),
    ).toEqual(['SH-OC-1L']);

    expect(
      service.setVariantActive({
        variantId: variant.data.variant.variantId,
        isActive: true,
      }),
    ).toMatchObject({ ok: true, data: { variant: { isActive: true } } });
  });

  it('cấu hình bundle formula theo version và retire version đang active', () => {
    const service = createService();
    const bundle = service.createProduct({
      productCode: 'BUNDLE-001',
      name: 'Combo chăm sóc nhà cửa',
      productType: 'Bundle',
      sku: 'BUNDLE-HOME-001',
      defaultUnitId: 'combo',
      unitPriceVnd: 220000,
    });
    const component = service.createProduct({
      productCode: 'SP-COMP-001',
      name: 'Nước giặt sinh học',
      productType: 'Stocked',
      sku: 'COMP-LAUNDRY-001',
      defaultUnitId: 'túi',
      unitPriceVnd: 185000,
    });
    if (!bundle.ok || !component.ok) throw new Error('create product failed');

    const firstFormula = service.configureBundleFormula({
      bundleVariantId: bundle.data.defaultVariant.variantId,
      effectiveFrom: '2026-08-03T00:00:00.000Z',
      components: [
        {
          componentVariantId: component.data.defaultVariant.variantId,
          quantityBase: 2,
          substitutionAllowed: false,
        },
      ],
    });

    expect(firstFormula).toMatchObject({
      ok: true,
      data: {
        formula: {
          bundleVariantId: bundle.data.defaultVariant.variantId,
          status: 'Active',
          components: [{ componentVariantId: component.data.defaultVariant.variantId, quantityBase: 2 }],
        },
        retiredFormula: undefined,
      },
    });
    if (!firstFormula.ok) throw new Error('configure formula failed');

    const secondFormula = service.configureBundleFormula({
      bundleVariantId: bundle.data.defaultVariant.variantId,
      effectiveFrom: '2026-08-10T00:00:00.000Z',
      components: [{ componentVariantId: component.data.defaultVariant.variantId, quantityBase: 3 }],
    });

    expect(secondFormula).toMatchObject({
      ok: true,
      data: {
        formula: {
          status: 'Active',
          effectiveFrom: '2026-08-10T00:00:00.000Z',
        },
        retiredFormula: {
          formulaVersionId: firstFormula.data.formula.formulaVersionId,
          status: 'Retired',
          effectiveTo: '2026-08-10T00:00:00.000Z',
        },
      },
    });
    if (!secondFormula.ok) throw new Error('configure second formula failed');
    expect(secondFormula.data.formula.formulaVersionId).not.toBe(firstFormula.data.formula.formulaVersionId);
    expect(service.getActiveBundleFormula({ bundleVariantId: bundle.data.defaultVariant.variantId })).toMatchObject({
      ok: true,
      data: { formula: { components: [{ quantityBase: 3 }] } },
    });
    expect(
      service.configureBundleFormula({
        bundleVariantId: component.data.defaultVariant.variantId,
        components: [{ componentVariantId: component.data.defaultVariant.variantId, quantityBase: 1 }],
      }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
});
