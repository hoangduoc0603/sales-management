import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

describe('platform composition', () => {
  it('login rồi gọi protected registry query qua cùng invoke pipeline', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-26T00:00:00.000Z'),
    });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const registry = composition.invoke({
      operation: 'platform.registry.getTableDefinitions',
      requestId: 'req-registry',
      sessionToken: login.data.sessionToken,
      payload: {},
    });

    expect(registry).toMatchObject({ ok: true });
    if (!registry.ok) throw new Error('registry failed');
    expect(registry.data.tables.map((table) => table.tableName)).toContain('CommandTransaction');
  });

  it('expose Catalog/CRM operations qua cùng invoke pipeline', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-27T00:00:00.000Z'),
    });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const created = composition.invoke({
      operation: 'catalog.product.create',
      requestId: 'req-product',
      sessionToken: login.data.sessionToken,
      payload: {
        productCode: 'SP-001',
        name: 'Sữa hạt óc chó 1L',
        productType: 'Stocked',
        sku: 'SH-OC-1L',
        barcode: '893000000001',
        defaultUnitId: 'unit-bottle',
        unitPriceVnd: 42000,
      },
    });
    expect(created).toMatchObject({ ok: true });
    if (!created.ok) throw new Error('create product failed');

    const projection = composition.invoke({
      operation: 'catalog.pos.getProjection',
      requestId: 'req-projection',
      sessionToken: login.data.sessionToken,
      payload: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
    });
    expect(projection).toMatchObject({
      ok: true,
      data: { variants: [{ sku: 'SH-OC-1L' }] },
    });

    const quote = composition.invoke({
      operation: 'catalog.quote.preview',
      requestId: 'req-quote',
      sessionToken: login.data.sessionToken,
      payload: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        lines: [
          {
            lineId: 'line-1',
            variantId: created.data.defaultVariant.variantId,
            unitVersionId: created.data.defaultUnit.unitVersionId,
            quantity: 2,
          },
        ],
      },
    });
    expect(quote).toMatchObject({ ok: true, data: { subtotalVnd: 84000 } });

    const customer = composition.invoke({
      operation: 'crm.customer.quickCreate',
      requestId: 'req-customer',
      sessionToken: login.data.sessionToken,
      payload: {
        displayName: 'Trần Thị Hồng Nhung',
        phone: '0909 482 176',
      },
    });
    expect(customer).toMatchObject({ ok: true, data: { duplicateWarnings: [] } });

    const search = composition.invoke({
      operation: 'crm.customer.search',
      requestId: 'req-customer-search',
      sessionToken: login.data.sessionToken,
      payload: { query: '0909482176' },
    });
    expect(search).toMatchObject({
      ok: true,
      data: { customers: [{ displayName: 'Trần Thị Hồng Nhung' }] },
    });
  });
});
