import { z } from 'zod';
import type {
  SalesOnlineCancelRequest,
  SalesOnlineTransitionRequest,
  SalesExchangeCreateRequest,
  SalesOrderDetailRequest,
  SalesOrderListRequest,
  SalesReturnCreateRequest,
  SalesReturnResolveRequest,
  SalesDraftCancelRequest,
  SalesDraftOpenRequest,
  SalesDraftSaveRequest,
  SalesPosCompleteRequest,
  SalesWarrantyOpenRequest,
  SalesWarrantyTransitionRequest,
} from '@shared/contracts/sales/sales';

const nonEmptyTrimmed = z.string().trim().min(1);
const optionalNonEmptyTrimmed = z.string().trim().min(1).optional();
const nonNegativeVnd = z.number().int().nonnegative();
const positiveQuantity = z.number().positive();
const positiveQuantityMilli = z.number().int().positive();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const saleOrderStatusSchema = z.enum([
  'Draft',
  'Completed',
  'Confirmed',
  'Packing',
  'Shipped',
  'Delivered',
  'Cancelled',
]);
const saleOrderSourceSchema = z.enum(['POS', 'ManualOnline']);
const returnDispositionSchema = z.enum(['Quarantine', 'Restock', 'KeepQuarantine', 'Scrap']);

const commandBaseSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
  })
  .strict();

export const saleOrderLineInputSchema = z
  .object({
    lineId: nonEmptyTrimmed,
    variantId: nonEmptyTrimmed,
    unitVersionId: nonEmptyTrimmed,
    quantity: positiveQuantity,
    quantityMilli: positiveQuantityMilli,
    unitPriceVnd: nonNegativeVnd,
    lineDiscountVnd: nonNegativeVnd,
    lotId: optionalNonEmptyTrimmed,
    serialId: optionalNonEmptyTrimmed,
    note: optionalNonEmptyTrimmed,
  })
  .strict()
  .refine((value) => value.lineDiscountVnd <= Math.round(value.unitPriceVnd * value.quantity), {
    message: 'Line discount cannot exceed line subtotal.',
    path: ['lineDiscountVnd'],
  });

export const saleTenderDraftInputSchema = z
  .object({
    tenderId: nonEmptyTrimmed,
    paymentMethodId: nonEmptyTrimmed,
    amountVnd: nonNegativeVnd,
    cashDrawerId: optionalNonEmptyTrimmed,
  })
  .strict();

export const salesDraftSaveRequestSchema = commandBaseSchema.extend({
  draftId: optionalNonEmptyTrimmed,
  source: saleOrderSourceSchema.optional(),
  branchId: nonEmptyTrimmed,
  warehouseId: nonEmptyTrimmed,
  cashierId: nonEmptyTrimmed,
  customerId: optionalNonEmptyTrimmed,
  salesPersonId: optionalNonEmptyTrimmed,
  note: optionalNonEmptyTrimmed,
  quoteVersion: optionalNonEmptyTrimmed,
  recipient: z
    .object({
      name: optionalNonEmptyTrimmed,
      phone: optionalNonEmptyTrimmed,
      address: optionalNonEmptyTrimmed,
      shippingMethod: optionalNonEmptyTrimmed,
      externalReference: optionalNonEmptyTrimmed,
      codVnd: nonNegativeVnd.optional(),
    })
    .strict()
    .optional(),
  lines: z.array(saleOrderLineInputSchema).min(1),
  tenders: z.array(saleTenderDraftInputSchema).default([]),
});

export function parseSalesDraftSaveRequest(value: unknown): SalesDraftSaveRequest {
  return salesDraftSaveRequestSchema.parse(value);
}

export const salesDraftOpenRequestSchema = z
  .object({
    branchId: nonEmptyTrimmed,
    warehouseId: nonEmptyTrimmed,
  })
  .strict();

export function parseSalesDraftOpenRequest(value: unknown): SalesDraftOpenRequest {
  return salesDraftOpenRequestSchema.parse(value);
}

export const salesDraftCancelRequestSchema = commandBaseSchema.extend({
  draftId: nonEmptyTrimmed,
  reason: optionalNonEmptyTrimmed,
});

export function parseSalesDraftCancelRequest(value: unknown): SalesDraftCancelRequest {
  return salesDraftCancelRequestSchema.parse(value);
}

export const salesPosCompleteRequestSchema = commandBaseSchema.extend({
  draftId: optionalNonEmptyTrimmed,
  branchId: nonEmptyTrimmed,
  warehouseId: nonEmptyTrimmed,
  cashierId: nonEmptyTrimmed,
  cashDrawerId: nonEmptyTrimmed,
  shiftId: optionalNonEmptyTrimmed,
  customerId: optionalNonEmptyTrimmed,
  salesPersonId: optionalNonEmptyTrimmed,
  note: optionalNonEmptyTrimmed,
  quoteVersion: nonEmptyTrimmed,
  receiptFormat: z.enum(['K80', 'A4']),
  lines: z.array(saleOrderLineInputSchema).min(1),
  tenders: z.array(saleTenderDraftInputSchema).default([]),
});

export function parseSalesPosCompleteRequest(value: unknown): SalesPosCompleteRequest {
  return salesPosCompleteRequestSchema.parse(value);
}

export const salesOrderListRequestSchema = z
  .object({
    branchId: nonEmptyTrimmed,
    warehouseId: optionalNonEmptyTrimmed,
    statuses: z.array(saleOrderStatusSchema).min(1).optional(),
    sources: z.array(saleOrderSourceSchema).min(1).optional(),
    dateFrom: isoDate.optional(),
    dateTo: isoDate.optional(),
    query: optionalNonEmptyTrimmed,
    limit: z.number().int().min(1).max(200).default(50),
  })
  .strict();

export function parseSalesOrderListRequest(value: unknown): SalesOrderListRequest {
  return salesOrderListRequestSchema.parse(value);
}

export const salesOrderDetailRequestSchema = z
  .object({
    saleOrderId: nonEmptyTrimmed,
  })
  .strict();

export function parseSalesOrderDetailRequest(value: unknown): SalesOrderDetailRequest {
  return salesOrderDetailRequestSchema.parse(value);
}

export const salesOnlineTransitionRequestSchema = commandBaseSchema.extend({
  saleOrderId: nonEmptyTrimmed,
  actorId: nonEmptyTrimmed,
  note: optionalNonEmptyTrimmed,
});

export function parseSalesOnlineTransitionRequest(value: unknown): SalesOnlineTransitionRequest {
  return salesOnlineTransitionRequestSchema.parse(value);
}

export const salesOnlineCancelRequestSchema = salesOnlineTransitionRequestSchema
  .extend({
    reason: nonEmptyTrimmed,
    depositTreatment: z.enum(['KeepCustomerCredit', 'Refund']).optional(),
    cashDrawerId: optionalNonEmptyTrimmed,
    paymentMethodId: optionalNonEmptyTrimmed,
    approverId: optionalNonEmptyTrimmed,
    shiftId: optionalNonEmptyTrimmed,
  })
  .superRefine((value, context) => {
    if (value.depositTreatment !== 'Refund') return;
    for (const fieldName of ['cashDrawerId', 'paymentMethodId', 'approverId'] as const) {
      if (value[fieldName] !== undefined) continue;
      context.addIssue({
        code: 'custom',
        path: [fieldName],
        message: 'Refund deposit requires cash drawer, payment method and approver.',
      });
    }
  });

export function parseSalesOnlineCancelRequest(value: unknown): SalesOnlineCancelRequest {
  return salesOnlineCancelRequestSchema.parse(value);
}

export const salesReturnLineInputSchema = z
  .object({
    sourceSaleLineId: optionalNonEmptyTrimmed,
    variantId: nonEmptyTrimmed,
    quantity: positiveQuantity,
    quantityMilli: positiveQuantityMilli,
    disposition: returnDispositionSchema,
    refundVnd: nonNegativeVnd.optional(),
    unitCostVnd: nonNegativeVnd.optional(),
    serialId: optionalNonEmptyTrimmed,
    lotId: optionalNonEmptyTrimmed,
    note: optionalNonEmptyTrimmed,
  })
  .strict();

export const salesReturnCreateRequestSchema = commandBaseSchema
  .extend({
    branchId: nonEmptyTrimmed,
    warehouseId: nonEmptyTrimmed,
    actorId: nonEmptyTrimmed,
    customerId: optionalNonEmptyTrimmed,
    sourceSaleOrderId: optionalNonEmptyTrimmed,
    fastReturn: z.boolean().optional(),
    fastReturnApproved: z.boolean().optional(),
    reason: nonEmptyTrimmed,
    lines: z.array(salesReturnLineInputSchema).min(1),
  })
  .refine((value) => value.sourceSaleOrderId !== undefined || value.fastReturn === true, {
    message: 'Return must reference a source order unless fast return is explicitly requested.',
    path: ['sourceSaleOrderId'],
  })
  .refine((value) => value.fastReturn !== true || value.fastReturnApproved === true, {
    message: 'Fast return requires explicit approval.',
    path: ['fastReturnApproved'],
  });

export function parseSalesReturnCreateRequest(value: unknown): SalesReturnCreateRequest {
  return salesReturnCreateRequestSchema.parse(value);
}

export const salesReturnResolveRequestSchema = commandBaseSchema.extend({
  returnId: nonEmptyTrimmed,
  actorId: nonEmptyTrimmed,
  lines: z
    .array(
      z
        .object({
          returnLineId: nonEmptyTrimmed,
          disposition: returnDispositionSchema,
        })
        .strict(),
    )
    .min(1),
  financialAction: z
    .object({
      treatment: z.enum(['Refund', 'CustomerCredit', 'None']),
      amountVnd: nonNegativeVnd,
      cashDrawerId: optionalNonEmptyTrimmed,
      paymentMethodId: optionalNonEmptyTrimmed,
      approverId: optionalNonEmptyTrimmed,
    })
    .strict()
    .optional(),
});

export function parseSalesReturnResolveRequest(value: unknown): SalesReturnResolveRequest {
  return salesReturnResolveRequestSchema.parse(value);
}

export const salesExchangeCreateRequestSchema = commandBaseSchema.extend({
  branchId: nonEmptyTrimmed,
  warehouseId: nonEmptyTrimmed,
  actorId: nonEmptyTrimmed,
  cashierId: nonEmptyTrimmed,
  cashDrawerId: nonEmptyTrimmed,
  shiftId: optionalNonEmptyTrimmed,
  customerId: optionalNonEmptyTrimmed,
  sourceSaleOrderId: nonEmptyTrimmed,
  reason: nonEmptyTrimmed,
  quoteVersion: nonEmptyTrimmed,
  receiptFormat: z.enum(['K80', 'A4']),
  returnLines: z.array(salesReturnLineInputSchema).min(1),
  exchangeLines: z.array(saleOrderLineInputSchema).min(1),
  tenders: z.array(saleTenderDraftInputSchema).default([]),
});

export function parseSalesExchangeCreateRequest(value: unknown): SalesExchangeCreateRequest {
  return salesExchangeCreateRequestSchema.parse(value);
}

export const salesWarrantyOpenRequestSchema = commandBaseSchema.extend({
  actorId: nonEmptyTrimmed,
  customerId: nonEmptyTrimmed,
  saleOrderId: nonEmptyTrimmed,
  saleLineId: nonEmptyTrimmed,
  variantId: nonEmptyTrimmed,
  serialId: nonEmptyTrimmed,
  policyVersionId: optionalNonEmptyTrimmed,
  issue: nonEmptyTrimmed,
  attachmentIds: z.array(nonEmptyTrimmed).default([]),
});

export function parseSalesWarrantyOpenRequest(value: unknown): SalesWarrantyOpenRequest {
  return salesWarrantyOpenRequestSchema.parse(value);
}

export const salesWarrantyTransitionRequestSchema = commandBaseSchema.extend({
  warrantyCaseId: nonEmptyTrimmed,
  actorId: nonEmptyTrimmed,
  status: z.enum(['Open', 'InReview', 'Resolved', 'Rejected', 'Cancelled']),
  resolution: optionalNonEmptyTrimmed,
  attachmentIds: z.array(nonEmptyTrimmed).optional(),
});

export function parseSalesWarrantyTransitionRequest(value: unknown): SalesWarrantyTransitionRequest {
  return salesWarrantyTransitionRequestSchema.parse(value);
}
