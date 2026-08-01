import { z } from 'zod';
import type {
  FinanceAgingProjectionRequest,
  FinanceCashDrawerUpsertRequest,
  FinanceExpenseApproveRequest,
  FinanceMasterDataRequest,
  FinancePaymentRecordRequest,
  FinancePaymentMethodUpsertRequest,
  FinancePaymentReverseRequest,
  FinanceShiftCloseRequest,
  FinanceShiftLockRequest,
  FinanceShiftOpenRequest,
  FinanceSupplierPaymentRecordRequest,
} from '@shared/contracts/finance/finance';

const nonEmptyTrimmed = z.string().trim().min(1);
const nonNegativeVnd = z.number().int().nonnegative();
const positiveVnd = z.number().int().positive();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const financeSourceDocumentSchema = z
  .object({
    sourceType: z.enum(['SaleOrder', 'SaleReturn', 'PurchaseReceipt', 'SupplierReturn', 'Expense', 'Shift', 'Manual']),
    sourceId: nonEmptyTrimmed,
    sourceLineId: nonEmptyTrimmed.optional(),
  })
  .strict();

const commandBaseSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
  })
  .strict();

export const financeShiftOpenRequestSchema = commandBaseSchema.extend({
  branchId: nonEmptyTrimmed,
  warehouseId: nonEmptyTrimmed,
  cashDrawerId: nonEmptyTrimmed,
  cashierId: nonEmptyTrimmed,
  openingCashVnd: nonNegativeVnd,
});

export function parseFinanceShiftOpenRequest(value: unknown): FinanceShiftOpenRequest {
  return financeShiftOpenRequestSchema.parse(value);
}

export const financeShiftCloseRequestSchema = commandBaseSchema
  .extend({
    shiftId: nonEmptyTrimmed,
    expectedCashVnd: nonNegativeVnd,
    actualCashVnd: nonNegativeVnd,
    varianceReason: nonEmptyTrimmed.optional(),
  })
  .refine((value) => value.actualCashVnd === value.expectedCashVnd || value.varianceReason !== undefined, {
    message: 'Variance reason is required when actual differs from expected.',
    path: ['varianceReason'],
  });

export function parseFinanceShiftCloseRequest(value: unknown): FinanceShiftCloseRequest {
  return financeShiftCloseRequestSchema.parse(value);
}

export const financeShiftLockRequestSchema = commandBaseSchema.extend({
  shiftId: nonEmptyTrimmed,
  approverId: nonEmptyTrimmed,
});

export function parseFinanceShiftLockRequest(value: unknown): FinanceShiftLockRequest {
  return financeShiftLockRequestSchema.parse(value);
}

export const financePaymentRecordRequestSchema = commandBaseSchema.extend({
  branchId: nonEmptyTrimmed,
  cashDrawerId: nonEmptyTrimmed,
  paymentMethodId: nonEmptyTrimmed,
  amountVnd: positiveVnd,
  payerType: z.enum(['Customer', 'Supplier', 'Internal', 'Other']),
  payerId: nonEmptyTrimmed.optional(),
  sourceDocument: financeSourceDocumentSchema,
  shiftId: nonEmptyTrimmed.optional(),
  allocations: z
    .array(
      z
        .object({
          obligationId: nonEmptyTrimmed,
          amountVnd: positiveVnd,
        })
        .strict(),
    )
    .default([]),
  actorId: nonEmptyTrimmed.optional(),
});

export function parseFinancePaymentRecordRequest(value: unknown): FinancePaymentRecordRequest {
  return financePaymentRecordRequestSchema.parse(value);
}

export const financeSupplierPaymentRecordRequestSchema = commandBaseSchema.extend({
  branchId: nonEmptyTrimmed,
  cashDrawerId: nonEmptyTrimmed,
  paymentMethodId: nonEmptyTrimmed,
  amountVnd: positiveVnd,
  supplierId: nonEmptyTrimmed,
  sourceDocument: financeSourceDocumentSchema,
  shiftId: nonEmptyTrimmed.optional(),
  allocations: z
    .array(
      z
        .object({
          obligationId: nonEmptyTrimmed,
          amountVnd: positiveVnd,
        })
        .strict(),
    )
    .default([]),
  actorId: nonEmptyTrimmed.optional(),
});

export function parseFinanceSupplierPaymentRecordRequest(value: unknown): FinanceSupplierPaymentRecordRequest {
  return financeSupplierPaymentRecordRequestSchema.parse(value);
}

export const financePaymentReverseRequestSchema = commandBaseSchema.extend({
  paymentId: nonEmptyTrimmed,
  amountVnd: positiveVnd,
  reason: nonEmptyTrimmed,
  approverId: nonEmptyTrimmed,
});

export function parseFinancePaymentReverseRequest(value: unknown): FinancePaymentReverseRequest {
  return financePaymentReverseRequestSchema.parse(value);
}

export const financeExpenseApproveRequestSchema = commandBaseSchema.extend({
  branchId: nonEmptyTrimmed,
  cashDrawerId: nonEmptyTrimmed,
  paymentMethodId: nonEmptyTrimmed,
  expenseId: nonEmptyTrimmed,
  amountVnd: positiveVnd,
  payeeName: nonEmptyTrimmed,
  reason: nonEmptyTrimmed,
  approverId: nonEmptyTrimmed,
});

export function parseFinanceExpenseApproveRequest(value: unknown): FinanceExpenseApproveRequest {
  return financeExpenseApproveRequestSchema.parse(value);
}

export const financeCashDrawerUpsertRequestSchema = commandBaseSchema.extend({
  cashDrawerId: nonEmptyTrimmed.optional(),
  branchId: nonEmptyTrimmed,
  drawerCode: nonEmptyTrimmed,
  name: nonEmptyTrimmed,
  drawerType: z.enum(['Cash', 'Bank', 'Wallet']),
  status: z.enum(['Active', 'Disabled']),
  directSaleEnabled: z.boolean().optional(),
});

export function parseFinanceCashDrawerUpsertRequest(value: unknown): FinanceCashDrawerUpsertRequest {
  return financeCashDrawerUpsertRequestSchema.parse(value);
}

export const financePaymentMethodUpsertRequestSchema = commandBaseSchema.extend({
  paymentMethodId: nonEmptyTrimmed.optional(),
  methodCode: nonEmptyTrimmed,
  name: nonEmptyTrimmed,
  methodType: z.enum(['Cash', 'BankTransfer', 'Card', 'QR', 'Credit']),
  status: z.enum(['Active', 'Disabled']),
  directSaleEnabled: z.boolean().optional(),
});

export function parseFinancePaymentMethodUpsertRequest(value: unknown): FinancePaymentMethodUpsertRequest {
  return financePaymentMethodUpsertRequestSchema.parse(value);
}

export const financeMasterDataRequestSchema = z
  .object({
    branchId: nonEmptyTrimmed.optional(),
    includeDisabled: z.boolean().optional(),
  })
  .strict();

export function parseFinanceMasterDataRequest(value: unknown): FinanceMasterDataRequest {
  return financeMasterDataRequestSchema.parse(value ?? {});
}

export const financeAgingProjectionRequestSchema = z
  .object({
    asOfDate: isoDate,
    branchId: nonEmptyTrimmed.optional(),
    obligationType: z.enum(['Receivable', 'Payable']).optional(),
    includeSettled: z.boolean().optional(),
  })
  .strict();

export function parseFinanceAgingProjectionRequest(value: unknown): FinanceAgingProjectionRequest {
  return financeAgingProjectionRequestSchema.parse(value);
}
