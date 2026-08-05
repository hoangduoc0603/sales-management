import { describe, expect, it } from 'vitest';
import { operationNames } from '../../shared/contracts/platform/operations';
import {
  parseCatalogCreateProductRequest,
  parseCatalogCreateVariantRequest,
  parseCatalogGetBundleFormulaRequest,
  parseCatalogProductListRequest,
  parseCatalogPosProjectionRequest,
  parseCatalogQuoteRequest,
  parseCatalogConfigureBundleFormulaRequest,
  parseCatalogSetProductActiveRequest,
  parseCatalogSetVariantActiveRequest,
  parseCatalogUpdateProductRequest,
  parseCatalogUpdateVariantRequest,
} from '../../shared/schemas/catalog/catalog';
import {
  parseCustomerQuickCreateRequest,
  parseCustomerSearchRequest,
} from '../../shared/schemas/crm/customer';

describe('Catalog/CRM shared contracts', () => {
  it('đăng ký operation names cần cho Phase 4', () => {
    expect(operationNames).toContain('catalog.product.create');
    expect(operationNames).toContain('catalog.product.list');
    expect(operationNames).toContain('catalog.product.update');
    expect(operationNames).toContain('catalog.product.setActive');
    expect(operationNames).toContain('catalog.variant.create');
    expect(operationNames).toContain('catalog.variant.update');
    expect(operationNames).toContain('catalog.variant.setActive');
    expect(operationNames).toContain('catalog.bundleFormula.configure');
    expect(operationNames).toContain('catalog.bundleFormula.getActive');
    expect(operationNames).toContain('catalog.pos.getProjection');
    expect(operationNames).toContain('catalog.quote.preview');
    expect(operationNames).toContain('crm.customer.quickCreate');
    expect(operationNames).toContain('crm.customer.search');
  });

  it('parse cấu hình công thức bundle versioned', () => {
    expect(
      parseCatalogConfigureBundleFormulaRequest({
        bundleVariantId: 'variant-bundle-1',
        effectiveFrom: '2026-08-03T00:00:00.000Z',
        components: [
          {
            componentVariantId: 'variant-component-1',
            quantityBase: 2,
            substitutionAllowed: false,
          },
        ],
      }),
    ).toMatchObject({
      bundleVariantId: 'variant-bundle-1',
      components: [{ componentVariantId: 'variant-component-1', quantityBase: 2 }],
    });

    expect(() =>
      parseCatalogConfigureBundleFormulaRequest({
        bundleVariantId: 'variant-bundle-1',
        components: [{ componentVariantId: 'variant-component-1', quantityBase: 0 }],
      }),
    ).toThrow();

    expect(parseCatalogGetBundleFormulaRequest({ bundleVariantId: 'variant-bundle-1' })).toEqual({
      bundleVariantId: 'variant-bundle-1',
    });
  });

  it('parse create/update/setActive variant request cho màn Variant & đơn vị', () => {
    expect(
      parseCatalogCreateVariantRequest({
        productId: 'product-1',
        displayName: 'Senka thùng 12',
        sku: 'SRM-120-C12',
        barcode: '893000000012',
        defaultUnitId: 'thùng',
        unitPriceVnd: 1020000,
        inventoryMode: 'Tracked',
        lotTracking: true,
        serialTracking: false,
        unitFactor: 12,
        saleEnabled: true,
        purchaseEnabled: true,
      }),
    ).toMatchObject({
      productId: 'product-1',
      sku: 'SRM-120-C12',
      defaultUnitId: 'thùng',
      unitFactor: 12,
      saleEnabled: true,
    });

    expect(() =>
      parseCatalogCreateVariantRequest({
        productId: 'product-1',
        displayName: 'Variant lỗi',
        sku: '',
        defaultUnitId: 'thùng',
        unitPriceVnd: 1000,
        unitFactor: 0,
      }),
    ).toThrow();

    expect(
      parseCatalogUpdateVariantRequest({
        variantId: 'variant-1',
        displayName: 'Senka thùng 12 - mẫu mới',
        sku: 'SRM-120-C12B',
        barcode: '893000000099',
        defaultUnitId: 'thùng',
        unitPriceVnd: 990000,
        unitFactor: 12,
        saleEnabled: true,
        purchaseEnabled: false,
      }),
    ).toMatchObject({
      variantId: 'variant-1',
      displayName: 'Senka thùng 12 - mẫu mới',
      sku: 'SRM-120-C12B',
    });

    expect(parseCatalogSetVariantActiveRequest({ variantId: 'variant-1', isActive: false })).toEqual({
      variantId: 'variant-1',
      isActive: false,
    });
  });

  it('parse list/update/setActive product request cho màn Hàng hóa', () => {
    expect(parseCatalogProductListRequest({ query: ' sữa ', status: 'All', limit: 20 })).toEqual({
      query: 'sữa',
      status: 'All',
      limit: 20,
    });
    expect(() => parseCatalogProductListRequest({ limit: 0 })).toThrow();

    expect(
      parseCatalogUpdateProductRequest({
        productId: 'product-1',
        name: 'Sữa hạt óc chó 1L',
        productType: 'Service',
        sku: 'SH-OC-1L',
        barcode: '893000000001',
        inventoryMode: 'NotTracked',
        defaultUnitId: 'lần',
        unitPriceVnd: 42000,
      }),
    ).toMatchObject({
      productId: 'product-1',
      productType: 'Service',
      sku: 'SH-OC-1L',
      inventoryMode: 'NotTracked',
      defaultUnitId: 'lần',
    });
    expect(() => parseCatalogUpdateProductRequest({ productId: '', sku: 'SKU' })).toThrow();

    expect(parseCatalogSetProductActiveRequest({ productId: 'product-1', isActive: false })).toEqual({
      productId: 'product-1',
      isActive: false,
    });
  });

  it('parse create product và từ chối SKU/barcode rỗng', () => {
    expect(
      parseCatalogCreateProductRequest({
        productCode: 'SP-001',
        name: 'Sữa hạt óc chó 1L',
        productType: 'Stocked',
        sku: 'SH-OC-1L',
        barcode: '893000000001',
        defaultUnitId: 'unit-bottle',
        unitPriceVnd: 42000,
      }),
    ).toMatchObject({
      sku: 'SH-OC-1L',
      unitPriceVnd: 42000,
    });

    expect(() =>
      parseCatalogCreateProductRequest({
        productCode: 'SP-002',
        name: 'Sản phẩm lỗi',
        productType: 'Stocked',
        sku: '',
        barcode: '   ',
        defaultUnitId: 'unit-piece',
        unitPriceVnd: 1000,
      }),
    ).toThrow();
  });

  it('parse POS projection request theo Branch/Warehouse scope', () => {
    expect(
      parseCatalogPosProjectionRequest({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
      }),
    ).toEqual({
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
    });
  });

  it('quote request bắt buộc có ít nhất một dòng', () => {
    expect(() =>
      parseCatalogQuoteRequest({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        lines: [],
      }),
    ).toThrow();

    expect(
      parseCatalogQuoteRequest({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        customerGroupId: 'retail',
        lines: [
          {
            lineId: 'line-1',
            variantId: 'variant-1',
            unitVersionId: 'unit-version-1',
            quantity: 2,
          },
        ],
      }),
    ).toMatchObject({
      branchId: 'branch-default',
      lines: [{ quantity: 2 }],
    });
  });

  it('parse customer quick create/search và normalize input boundary', () => {
    expect(
      parseCustomerQuickCreateRequest({
        displayName: 'Trần Thị Hồng Nhung',
        phone: '0909 482 176',
        email: 'NHUNG@example.com',
      }),
    ).toMatchObject({
      displayName: 'Trần Thị Hồng Nhung',
      phone: '0909 482 176',
      email: 'NHUNG@example.com',
    });

    expect(parseCustomerSearchRequest({ query: '0909' })).toEqual({ query: '0909' });
    expect(() => parseCustomerSearchRequest({ query: '' })).toThrow();
  });
});
