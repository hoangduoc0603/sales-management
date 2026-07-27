import type {
  CatalogQuoteRequest,
  CatalogQuoteResponse,
  PromotionApplicationDTO,
  PromotionRejectionDTO,
} from '@shared/contracts/catalog/catalog';

export interface PricingVariantInput {
  variantId: string;
  unitVersionId: string;
  unitPriceVnd: number;
}

export interface PriceRuleInput {
  priceRuleId: string;
  level: 'branch' | 'customerGroup';
  branchId?: string;
  customerGroupId?: string;
  variantId: string;
  unitVersionId: string;
  unitPriceVnd: number;
  priority: number;
  status: 'Draft' | 'Published' | 'Retired';
}

export interface PromotionInput {
  promotionId: string;
  name: string;
  branchId: string;
  discountVnd: number;
  minSubtotalVnd?: number;
  priority: number;
  status: 'Draft' | 'Active' | 'Paused' | 'Expired' | 'Retired';
}

export interface PricingService {
  quoteCart(input: CatalogQuoteRequest): CatalogQuoteResponse;
}

export interface PricingServiceDependencies {
  variants: readonly PricingVariantInput[];
  priceRules: readonly PriceRuleInput[];
  promotions: readonly PromotionInput[];
}

export function createPricingService(deps: PricingServiceDependencies): PricingService {
  return {
    quoteCart(input) {
      const lines = input.lines.map((line) => {
        const unitPriceVnd = resolveUnitPrice(line.variantId, line.unitVersionId, input, deps);
        const lineSubtotalVnd = Math.round(unitPriceVnd * line.quantity);

        return {
          lineId: line.lineId,
          variantId: line.variantId,
          quantity: line.quantity,
          unitPriceVnd,
          lineSubtotalVnd,
          lineDiscountVnd: 0,
          lineTotalVnd: lineSubtotalVnd,
        };
      });
      const subtotalVnd = lines.reduce((sum, line) => sum + line.lineSubtotalVnd, 0);
      const promotionDecision = chooseBestPromotion(input.branchId, subtotalVnd, deps.promotions);
      const discountVnd = promotionDecision.application?.discountVnd ?? 0;
      const totalVnd = Math.max(0, subtotalVnd - discountVnd);
      const firstLine = lines[0];

      if (firstLine !== undefined && discountVnd > 0) {
        firstLine.lineDiscountVnd = discountVnd;
        firstLine.lineTotalVnd = Math.max(0, firstLine.lineSubtotalVnd - discountVnd);
      }

      return {
        quoteVersion: `quote-${input.branchId}-${subtotalVnd}-${discountVnd}`,
        subtotalVnd,
        discountVnd,
        totalVnd,
        lines,
        applications:
          promotionDecision.application === undefined ? [] : [promotionDecision.application],
        rejections: promotionDecision.rejections,
      };
    },
  };
}

function resolveUnitPrice(
  variantId: string,
  unitVersionId: string,
  input: CatalogQuoteRequest,
  deps: PricingServiceDependencies,
): number {
  const variant = deps.variants.find(
    (candidate) =>
      candidate.variantId === variantId && candidate.unitVersionId === unitVersionId,
  );
  const basePrice = variant?.unitPriceVnd ?? 0;
  const branchPrice = choosePriceRule(
    deps.priceRules.filter(
      (rule) =>
        rule.status === 'Published' &&
        rule.level === 'branch' &&
        rule.branchId === input.branchId &&
        rule.variantId === variantId &&
        rule.unitVersionId === unitVersionId,
    ),
  );
  const customerGroupPrice = choosePriceRule(
    deps.priceRules.filter(
      (rule) =>
        rule.status === 'Published' &&
        rule.level === 'customerGroup' &&
        rule.customerGroupId === input.customerGroupId &&
        rule.variantId === variantId &&
        rule.unitVersionId === unitVersionId,
    ),
  );

  return customerGroupPrice?.unitPriceVnd ?? branchPrice?.unitPriceVnd ?? basePrice;
}

function choosePriceRule(rules: readonly PriceRuleInput[]): PriceRuleInput | undefined {
  return [...rules].sort((left, right) => left.priority - right.priority || left.priceRuleId.localeCompare(right.priceRuleId))[0];
}

function chooseBestPromotion(
  branchId: string,
  subtotalVnd: number,
  promotions: readonly PromotionInput[],
): {
  application?: PromotionApplicationDTO;
  rejections: PromotionRejectionDTO[];
} {
  const eligible = promotions.filter(
    (promotion) =>
      promotion.status === 'Active' &&
      promotion.branchId === branchId &&
      subtotalVnd >= (promotion.minSubtotalVnd ?? 0) &&
      promotion.discountVnd > 0,
  );
  const winner = [...eligible].sort(
    (left, right) =>
      right.discountVnd - left.discountVnd ||
      left.priority - right.priority ||
      left.promotionId.localeCompare(right.promotionId),
  )[0];

  return {
    application:
      winner === undefined
        ? undefined
        : {
            promotionId: winner.promotionId,
            name: winner.name,
            discountVnd: Math.min(winner.discountVnd, subtotalVnd),
            reason: 'Promotion tự động tốt nhất.',
          },
    rejections: promotions
      .filter((promotion) => winner === undefined || promotion.promotionId !== winner.promotionId)
      .map((promotion) => ({
        promotionId: promotion.promotionId,
        name: promotion.name,
        reason: eligible.includes(promotion)
          ? 'Không phải promotion tự động tốt nhất.'
          : 'Không đủ điều kiện áp dụng.',
      })),
  };
}
