import { describe, expect, it } from 'vitest';
import { createPricingService } from '../../../apps-script/src/services/catalog/pricing-service';

const variant = {
  variantId: 'variant-milk-1l',
  unitVersionId: 'unit-bottle-v1',
  unitPriceVnd: 42000,
};

describe('PricingService', () => {
  it('quote theo thứ tự giá variant -> Branch price -> Customer group price -> promotion tự động tốt nhất', () => {
    const service = createPricingService({
      variants: [variant],
      priceRules: [
        {
          priceRuleId: 'branch-price',
          level: 'branch',
          branchId: 'branch-default',
          variantId: variant.variantId,
          unitVersionId: variant.unitVersionId,
          unitPriceVnd: 40000,
          priority: 10,
          status: 'Published',
        },
        {
          priceRuleId: 'group-price',
          level: 'customerGroup',
          customerGroupId: 'vip',
          variantId: variant.variantId,
          unitVersionId: variant.unitVersionId,
          unitPriceVnd: 38000,
          priority: 10,
          status: 'Published',
        },
      ],
      promotions: [
        {
          promotionId: 'promo-5k',
          name: 'Giảm 5.000đ',
          branchId: 'branch-default',
          discountVnd: 5000,
          minSubtotalVnd: 50000,
          priority: 20,
          status: 'Active',
        },
        {
          promotionId: 'promo-10k',
          name: 'Giảm 10.000đ',
          branchId: 'branch-default',
          discountVnd: 10000,
          minSubtotalVnd: 50000,
          priority: 30,
          status: 'Active',
        },
      ],
    });

    const quote = service.quoteCart({
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      customerGroupId: 'vip',
      lines: [
        {
          lineId: 'line-1',
          variantId: variant.variantId,
          unitVersionId: variant.unitVersionId,
          quantity: 2,
        },
      ],
    });

    expect(quote).toMatchObject({
      subtotalVnd: 76000,
      discountVnd: 10000,
      totalVnd: 66000,
      applications: [{ promotionId: 'promo-10k' }],
    });
    expect(quote.lines[0]).toMatchObject({
      unitPriceVnd: 38000,
      lineSubtotalVnd: 76000,
      lineTotalVnd: 66000,
    });
  });

  it('promotion tie-break: discount lớn hơn, rồi priority nhỏ hơn, rồi promotionId nhỏ hơn', () => {
    const service = createPricingService({
      variants: [variant],
      priceRules: [],
      promotions: [
        {
          promotionId: 'promo-b',
          name: 'Giảm cùng giá trị B',
          branchId: 'branch-default',
          discountVnd: 7000,
          priority: 2,
          status: 'Active',
        },
        {
          promotionId: 'promo-a',
          name: 'Giảm cùng giá trị A',
          branchId: 'branch-default',
          discountVnd: 7000,
          priority: 2,
          status: 'Active',
        },
        {
          promotionId: 'promo-lower-priority',
          name: 'Priority cao hơn số',
          branchId: 'branch-default',
          discountVnd: 7000,
          priority: 10,
          status: 'Active',
        },
      ],
    });

    const quote = service.quoteCart({
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      lines: [
        {
          lineId: 'line-1',
          variantId: variant.variantId,
          unitVersionId: variant.unitVersionId,
          quantity: 1,
        },
      ],
    });

    expect(quote.applications).toEqual([
      {
        promotionId: 'promo-a',
        name: 'Giảm cùng giá trị A',
        discountVnd: 7000,
        reason: 'Promotion tự động tốt nhất.',
      },
    ]);
  });
});
