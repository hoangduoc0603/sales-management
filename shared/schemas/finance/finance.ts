import { z } from 'zod';
import type {
  FinanceExpenseApproveRequest,
  FinancePaymentRecordRequest,
  FinancePaymentReverseRequest,
  FinanceShiftCloseRequest,
  FinanceShiftLockRequest,
  FinanceShiftOpenRequest,
  FinanceSupplierPaymentRecordRequest,
} from '@shared/contracts/finance/finance';

const nonEmptyTrimmed = z.string().trim().min(1);
const nonNegativeVnd = z.number().int().nonnegative();
const positiveVnd = z.number().int().positive();

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
