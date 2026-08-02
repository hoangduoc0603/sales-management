import { describe, expect, it } from 'vitest';
import { operationNames } from '../../shared/contracts/platform/operations';
import {
  parseCatalogCreateProductRequest,
  parseCatalogProductListRequest,
  parseCatalogPosProjectionRequest,
  parseCatalogQuoteRequest,
  parseCatalogSetProductActiveRequest,
  parseCatalogUpdateProductRequest,
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
    expect(operationNames).toContain('catalog.pos.getProjection');
    expect(operationNames).toContain('catalog.quote.preview');
    expect(operationNames).toContain('crm.customer.quickCreate');
    expect(operationNames).toContain('crm.customer.search');
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
