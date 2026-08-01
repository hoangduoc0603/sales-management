import type { ApiErrorCode } from '@shared/contracts/errors';
import type {
  CashDrawerDTO,
  CashTransactionDTO,
  CustomerCreditDTO,
  FinanceAgingProjectionRequest,
  FinanceAgingProjectionResponse,
  FinanceAgingRowDTO,
  FinanceCashDrawerUpsertRequest,
  FinanceExpenseApproveRequest,
  FinanceCustomerCreditCreateRequest,
  FinanceMasterDataRequest,
  FinanceMasterDataResponse,
  FinancePaymentRecordRequest,
  FinancePaymentRecordResponse,
  FinancePaymentMethodUpsertRequest,
  FinanceRefundRecordRequest,
  FinanceSupplierPaymentRecordRequest,
  FinanceSupplierPrepaymentCreateRequest,
  FinancePaymentReverseRequest,
  FinanceShiftCloseRequest,
  FinanceShiftLockRequest,
  FinanceShiftOpenRequest,
  FinanceSummaryResponse,
  ObligationDTO,
  PaymentAllocationDTO,
  PaymentDTO,
  PaymentMethodDTO,
  ShiftDTO,
  SupplierPrepaymentDTO,
} from '@shared/contracts/finance/finance';
import type { FinanceRepository } from '../../repositories/finance/finance-repository';

type FinanceServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string } };

export interface FinanceService {
  openShift(input: FinanceShiftOpenRequest): FinanceServiceResult<{ shift: ShiftDTO; cashTransaction: CashTransactionDTO }>;
  closeShift(input: FinanceShiftCloseRequest): FinanceServiceResult<{ shift: ShiftDTO }>;
  lockShift(input: FinanceShiftLockRequest): FinanceServiceResult<{ shift: ShiftDTO }>;
  recordPayment(input: FinancePaymentRecordRequest): FinanceServiceResult<FinancePaymentRecordResponse>;
  recordSupplierPayment(input: FinanceSupplierPaymentRecordRequest): FinanceServiceResult<FinancePaymentRecordResponse>;
  recordRefund(input: FinanceRefundRecordRequest): FinanceServiceResult<FinancePaymentRecordResponse>;
  reversePayment(input: FinancePaymentReverseRequest): FinanceServiceResult<FinancePaymentRecordResponse>;
  approveExpense(input: FinanceExpenseApproveRequest): FinanceServiceResult<{ cashTransaction: CashTransactionDTO }>;
  upsertCashDrawer(input: FinanceCashDrawerUpsertRequest): FinanceServiceResult<{ cashDrawer: CashDrawerDTO }>;
  upsertPaymentMethod(input: FinancePaymentMethodUpsertRequest): FinanceServiceResult<{ paymentMethod: PaymentMethodDTO }>;
  getMasterData(input?: FinanceMasterDataRequest): FinanceMasterDataResponse;
  getAgingProjection(input: FinanceAgingProjectionRequest): FinanceAgingProjectionResponse;
  getSummary(): FinanceSummaryResponse;
  createCustomerCreditFromSource(input: FinanceCustomerCreditCreateRequest): CustomerCreditDTO;
  createSupplierPrepaymentFromSource(input: FinanceSupplierPrepaymentCreateRequest): SupplierPrepaymentDTO;
  createReceivable(input: {
    branchId: string;
    customerId: string;
    sourceDocument: ObligationDTO['sourceDocument'];
    amountVnd: number;
    dueDate?: string;
  }): ObligationDTO;
  createPayable(input: {
    branchId: string;
    supplierId: string;
    sourceDocument: ObligationDTO['sourceDocument'];
    amountVnd: number;
    dueDate?: string;
  }): ObligationDTO;
  findPayableBySource(input: ObligationDTO['sourceDocument']): ObligationDTO | undefined;
  reducePayable(input: {
    branchId: string;
    supplierId: string;
    sourceDocument: ObligationDTO['sourceDocument'];
    sourceObligationId: string;
    amountVnd: number;
  }): ObligationDTO;
}

export interface FinanceServiceDependencies {
  repository: FinanceRepository;
  tenantId: string;
  now: () => Date;
  newId(prefix: string): string;
}

export function createFinanceService(deps: FinanceServiceDependencies): FinanceService {
  return {
    openShift(input) {
      const existing = deps.repository.findOpenShiftByCashier(input.cashierId);
      if (existing !== undefined) {
        return {
          ok: false,
          error: { code: 'SHIFT_ALREADY_OPEN', message: 'Cashier đang có ca mở.' },
        };
      }

      const shift: ShiftDTO = {
        shiftId: deps.newId('shift'),
        tenantId: deps.tenantId,
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        cashDrawerId: input.cashDrawerId,
        cashierId: input.cashierId,
        status: 'Open',
        openedAt: deps.now().toISOString(),
        openingCashVnd: input.openingCashVnd,
        expectedCashVnd: input.openingCashVnd,
      };
      const cashTransaction = createCashTransaction(deps, {
        branchId: input.branchId,
        cashDrawerId: input.cashDrawerId,
        transactionType: 'ShiftOpening',
        amountVnd: input.openingCashVnd,
        sourceDocument: { sourceType: 'Shift', sourceId: shift.shiftId },
        actorId: input.cashierId,
        shiftId: shift.shiftId,
        idempotencyKey: input.idempotencyKey,
      });

      deps.repository.saveShift(shift);
      deps.repository.appendCashTransaction(cashTransaction);

      return { ok: true, data: { shift, cashTransaction } };
    },
    closeShift(input) {
      const shift = deps.repository.getShift(input.shiftId);
      if (shift === undefined || shift.status !== 'Open') {
        return { ok: false, error: { code: 'SHIFT_NOT_OPEN', message: 'Ca không ở trạng thái Open.' } };
      }

      const varianceVnd = input.actualCashVnd - input.expectedCashVnd;
      if (varianceVnd !== 0 && input.varianceReason === undefined) {
        return {
          ok: false,
          error: { code: 'SHIFT_VARIANCE_REASON_REQUIRED', message: 'Cần nhập lý do khi đóng ca bị lệch.' },
        };
      }

      const next: ShiftDTO = {
        ...shift,
        status: 'Closed',
        expectedCashVnd: input.expectedCashVnd,
        actualCashVnd: input.actualCashVnd,
        varianceVnd,
        closeReason: input.varianceReason,
      };
      deps.repository.saveShift(next);

      return { ok: true, data: { shift: next } };
    },
    lockShift(input) {
      const shift = deps.repository.getShift(input.shiftId);
      if (shift === undefined || shift.status !== 'Closed') {
        return { ok: false, error: { code: 'SHIFT_NOT_OPEN', message: 'Chỉ khóa ca đã Closed.' } };
      }

      const next: ShiftDTO = {
        ...shift,
        status: 'Locked',
        lockedAt: deps.now().toISOString(),
      };
      deps.repository.saveShift(next);

      return { ok: true, data: { shift: next } };
    },
    recordPayment(input) {
      const allocationTotal = input.allocations.reduce((sum, allocation) => sum + allocation.amountVnd, 0);
      if (allocationTotal > input.amountVnd) {
        return {
          ok: false,
          error: {
            code: 'PAYMENT_ALLOCATION_EXCEEDS_AMOUNT',
            message: 'Tổng phân bổ vượt số tiền thanh toán.',
          },
        };
      }

      const obligations: ObligationDTO[] = [];
      const allocations: PaymentAllocationDTO[] = [];
      for (const allocationInput of input.allocations) {
        const obligation = deps.repository.getObligation(allocationInput.obligationId);
        if (obligation === undefined) continue;
        if (allocationInput.amountVnd > obligation.remainingAmountVnd) {
          return {
            ok: false,
            error: {
              code: 'OBLIGATION_ALLOCATION_EXCEEDS_BALANCE',
              message: 'Số phân bổ vượt công nợ còn lại.',
            },
          };
        }

        const nextObligation = applyAllocation(obligation, allocationInput.amountVnd);
        deps.repository.saveObligation(nextObligation);
        obligations.push(nextObligation);
        allocations.push({
          allocationId: deps.newId('allocation'),
          tenantId: deps.tenantId,
          paymentId: 'pending',
          obligationId: allocationInput.obligationId,
          amountVnd: allocationInput.amountVnd,
          allocatedAt: deps.now().toISOString(),
        });
      }

      const payment: PaymentDTO = {
        paymentId: deps.newId('payment'),
        tenantId: deps.tenantId,
        branchId: input.branchId,
        cashDrawerId: input.cashDrawerId,
        paymentMethodId: input.paymentMethodId,
        amountVnd: input.amountVnd,
        payerType: input.payerType,
        payerId: input.payerId,
        sourceDocument: input.sourceDocument,
        status: 'Approved',
        effectiveAt: deps.now().toISOString(),
        shiftId: input.shiftId,
      };
      const finalizedAllocations = allocations.map((allocation) => ({
        ...allocation,
        paymentId: payment.paymentId,
      }));
      const cashTransaction = createCashTransaction(deps, {
        branchId: input.branchId,
        cashDrawerId: input.cashDrawerId,
        transactionType: 'Receipt',
        amountVnd: input.amountVnd,
        paymentId: payment.paymentId,
        sourceDocument: input.sourceDocument,
        actorId: input.actorId ?? 'system',
        shiftId: input.shiftId,
        idempotencyKey: input.idempotencyKey,
      });
      const overpaymentVnd = input.amountVnd - allocationTotal;
      const customerCredit =
        allocationTotal > 0 && overpaymentVnd > 0 && input.payerType === 'Customer' && input.payerId !== undefined
          ? createCustomerCredit(deps, input.branchId, input.payerId, payment.paymentId, overpaymentVnd)
          : undefined;

      deps.repository.saveNewPayment(payment);
      deps.repository.appendNewCashTransaction(cashTransaction);
      finalizedAllocations.forEach((allocation) => deps.repository.appendPaymentAllocation(allocation));
      if (customerCredit !== undefined) {
        deps.repository.saveCustomerCredit(customerCredit);
      }

      return {
        ok: true,
        data: {
          payment,
          cashTransaction,
          allocations: finalizedAllocations,
          obligations,
          customerCredit,
        },
      };
    },
    recordSupplierPayment(input) {
      const allocationResult = applyPaymentAllocations(deps, input.amountVnd, input.allocations);
      if (!allocationResult.ok) return allocationResult;

      const payment: PaymentDTO = {
        paymentId: deps.newId('payment'),
        tenantId: deps.tenantId,
        branchId: input.branchId,
        cashDrawerId: input.cashDrawerId,
        paymentMethodId: input.paymentMethodId,
        amountVnd: -input.amountVnd,
        payerType: 'Supplier',
        payerId: input.supplierId,
        sourceDocument: input.sourceDocument,
        status: 'Approved',
        effectiveAt: deps.now().toISOString(),
        shiftId: input.shiftId,
      };
      const finalizedAllocations = allocationResult.data.allocations.map((allocation) => ({
        ...allocation,
        paymentId: payment.paymentId,
      }));
      const cashTransaction = createCashTransaction(deps, {
        branchId: input.branchId,
        cashDrawerId: input.cashDrawerId,
        transactionType: 'Disbursement',
        amountVnd: -input.amountVnd,
        paymentId: payment.paymentId,
        sourceDocument: input.sourceDocument,
        actorId: input.actorId ?? 'system',
        shiftId: input.shiftId,
        idempotencyKey: input.idempotencyKey,
      });

      deps.repository.savePayment(payment);
      deps.repository.appendCashTransaction(cashTransaction);
      finalizedAllocations.forEach((allocation) => deps.repository.appendPaymentAllocation(allocation));

      return {
        ok: true,
        data: {
          payment,
          cashTransaction,
          allocations: finalizedAllocations,
          obligations: allocationResult.data.obligations,
        },
      };
    },
    recordRefund(input) {
      if (input.amountVnd <= 0) {
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Số tiền hoàn phải lớn hơn 0.' },
        };
      }

      const payment: PaymentDTO = {
        paymentId: deps.newId('payment'),
        tenantId: deps.tenantId,
        branchId: input.branchId,
        cashDrawerId: input.cashDrawerId,
        paymentMethodId: input.paymentMethodId,
        amountVnd: -input.amountVnd,
        payerType: input.payeeType,
        payerId: input.payeeId,
        sourceDocument: input.sourceDocument,
        status: 'Approved',
        effectiveAt: deps.now().toISOString(),
        shiftId: input.shiftId,
      };
      const cashTransaction = createCashTransaction(deps, {
        branchId: input.branchId,
        cashDrawerId: input.cashDrawerId,
        transactionType: 'Refund',
        amountVnd: -input.amountVnd,
        paymentId: payment.paymentId,
        sourceDocument: input.sourceDocument,
        actorId: input.approverId,
        approverId: input.approverId,
        shiftId: input.shiftId,
        idempotencyKey: input.idempotencyKey,
      });

      deps.repository.savePayment(payment);
      deps.repository.appendCashTransaction(cashTransaction);

      return {
        ok: true,
        data: {
          payment,
          cashTransaction,
          allocations: [],
          obligations: [],
        },
      };
    },
    reversePayment(input) {
      const original = deps.repository.getPayment(input.paymentId);
      if (original === undefined || input.amountVnd > original.amountVnd) {
        return {
          ok: false,
          error: {
            code: 'PAYMENT_REVERSAL_EXCEEDS_ORIGINAL',
            message: 'Số tiền đảo vượt khoản thu gốc.',
          },
        };
      }

      const reversalPayment: PaymentDTO = {
        ...original,
        paymentId: deps.newId('payment-reversal'),
        amountVnd: -input.amountVnd,
        status: 'Approved',
        effectiveAt: deps.now().toISOString(),
        reversalOfPaymentId: original.paymentId,
      };
      const reversalCashTransaction = createCashTransaction(deps, {
        branchId: original.branchId,
        cashDrawerId: original.cashDrawerId,
        transactionType: 'Reversal',
        amountVnd: -input.amountVnd,
        paymentId: reversalPayment.paymentId,
        sourceDocument: { sourceType: 'Manual', sourceId: original.paymentId },
        actorId: input.approverId,
        approverId: input.approverId,
        shiftId: original.shiftId,
        idempotencyKey: input.idempotencyKey,
      });

      deps.repository.savePayment(reversalPayment);
      deps.repository.appendCashTransaction(reversalCashTransaction);

      return {
        ok: true,
        data: {
          payment: reversalPayment,
          cashTransaction: reversalCashTransaction,
          allocations: [],
          obligations: [],
        },
      };
    },
    approveExpense(input) {
      const cashTransaction = createCashTransaction(deps, {
        branchId: input.branchId,
        cashDrawerId: input.cashDrawerId,
        transactionType: 'Expense',
        amountVnd: -input.amountVnd,
        sourceDocument: { sourceType: 'Expense', sourceId: input.expenseId },
        actorId: input.approverId,
        approverId: input.approverId,
        idempotencyKey: input.idempotencyKey,
      });
      deps.repository.appendCashTransaction(cashTransaction);

      return { ok: true, data: { cashTransaction } };
    },
    upsertCashDrawer(input) {
      const cashDrawer: CashDrawerDTO = {
        cashDrawerId: input.cashDrawerId ?? deps.newId('cash-drawer'),
        tenantId: deps.tenantId,
        branchId: input.branchId,
        drawerCode: input.drawerCode,
        name: input.name,
        drawerType: input.drawerType,
        status: input.status,
        directSaleEnabled: input.directSaleEnabled ?? true,
      };
      deps.repository.saveCashDrawer(cashDrawer);
      return { ok: true, data: { cashDrawer } };
    },
    upsertPaymentMethod(input) {
      const paymentMethod: PaymentMethodDTO = {
        paymentMethodId: input.paymentMethodId ?? deps.newId('payment-method'),
        tenantId: deps.tenantId,
        methodCode: input.methodCode,
        name: input.name,
        methodType: input.methodType,
        status: input.status,
        directSaleEnabled: input.directSaleEnabled ?? true,
      };
      deps.repository.savePaymentMethod(paymentMethod);
      return { ok: true, data: { paymentMethod } };
    },
    getMasterData(input = {}) {
      const includeDisabled = input.includeDisabled ?? false;
      return {
        cashDrawers: deps.repository
          .listCashDrawers()
          .filter((drawer) => input.branchId === undefined || drawer.branchId === input.branchId)
          .filter((drawer) => includeDisabled || drawer.status === 'Active')
          .sort((a, b) => a.drawerCode.localeCompare(b.drawerCode)),
        paymentMethods: deps.repository
          .listPaymentMethods()
          .filter((method) => includeDisabled || method.status === 'Active')
          .sort((a, b) => a.methodCode.localeCompare(b.methodCode)),
      };
    },
    getAgingProjection(input) {
      const asOfDate = toDateOnly(input.asOfDate);
      const rows = deps.repository
        .listObligations()
        .filter((obligation) => input.branchId === undefined || obligation.branchId === input.branchId)
        .filter((obligation) => input.obligationType === undefined || obligation.obligationType === input.obligationType)
        .filter((obligation) => (input.includeSettled ?? false) || obligation.status !== 'Settled')
        .filter((obligation) => obligation.status !== 'Reversed')
        .map((obligation): FinanceAgingRowDTO => {
          const daysOverdue = Math.max(0, diffDays(asOfDate, toDateOnly(obligation.dueDate)));
          return {
            obligationId: obligation.obligationId,
            branchId: obligation.branchId,
            obligationType: obligation.obligationType,
            partyId: obligation.partyId,
            sourceDocument: obligation.sourceDocument,
            dueDate: obligation.dueDate,
            daysOverdue,
            bucket: resolveAgingBucket(daysOverdue),
            originalAmountVnd: obligation.originalAmountVnd,
            allocatedAmountVnd: obligation.allocatedAmountVnd,
            remainingAmountVnd: obligation.remainingAmountVnd,
            status: obligation.status,
          };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue || b.remainingAmountVnd - a.remainingAmountVnd);

      return {
        generatedAt: deps.now().toISOString(),
        asOfDate: input.asOfDate,
        branchId: input.branchId,
        obligationType: input.obligationType,
        rows,
        totals: rows.reduce(
          (totals, row) => {
            totals.totalRemainingVnd += row.remainingAmountVnd;
            if (row.bucket === 'Current') totals.currentVnd += row.remainingAmountVnd;
            if (row.bucket === '1-30') totals.bucket1To30Vnd += row.remainingAmountVnd;
            if (row.bucket === '31-60') totals.bucket31To60Vnd += row.remainingAmountVnd;
            if (row.bucket === '61-90') totals.bucket61To90Vnd += row.remainingAmountVnd;
            if (row.bucket === '90+') totals.bucket90PlusVnd += row.remainingAmountVnd;
            return totals;
          },
          {
            totalRemainingVnd: 0,
            currentVnd: 0,
            bucket1To30Vnd: 0,
            bucket31To60Vnd: 0,
            bucket61To90Vnd: 0,
            bucket90PlusVnd: 0,
          },
        ),
      };
    },
    getSummary() {
      const cashTransactions = deps.repository.listCashTransactions();
      const obligations = deps.repository.listObligations();
      return {
        generatedAt: deps.now().toISOString(),
        openShiftCount: deps.repository.listShifts().filter((shift) => shift.status === 'Open').length,
        cashInVnd: cashTransactions.filter((tx) => tx.amountVnd > 0).reduce((sum, tx) => sum + tx.amountVnd, 0),
        cashOutVnd: Math.abs(cashTransactions.filter((tx) => tx.amountVnd < 0).reduce((sum, tx) => sum + tx.amountVnd, 0)),
        receivableOpenVnd: obligations
          .filter((obligation) => obligation.obligationType === 'Receivable')
          .reduce((sum, obligation) => sum + obligation.remainingAmountVnd, 0),
        payableOpenVnd: obligations
          .filter((obligation) => obligation.obligationType === 'Payable')
          .reduce((sum, obligation) => sum + obligation.remainingAmountVnd, 0),
      };
    },
    createCustomerCreditFromSource(input) {
      const customerCredit = createCustomerCredit(
        deps,
        input.branchId,
        input.customerId,
        input.sourceDocument.sourceId,
        input.amountVnd,
        input.sourceDocument,
      );
      deps.repository.saveCustomerCredit(customerCredit);
      return customerCredit;
    },
    createSupplierPrepaymentFromSource(input) {
      const supplierPrepayment = createSupplierPrepayment(
        deps,
        input.branchId,
        input.supplierId,
        input.sourceDocument,
        input.amountVnd,
      );
      deps.repository.saveSupplierPrepayment(supplierPrepayment);
      return supplierPrepayment;
    },
    createReceivable(input) {
      const receivable: ObligationDTO = {
        obligationId: deps.newId('receivable'),
        tenantId: deps.tenantId,
        branchId: input.branchId,
        obligationType: 'Receivable',
        partyId: input.customerId,
        sourceDocument: input.sourceDocument,
        dueDate: input.dueDate ?? toIsoDate(deps.now()),
        originalAmountVnd: input.amountVnd,
        allocatedAmountVnd: 0,
        remainingAmountVnd: input.amountVnd,
        status: 'Open',
      };
      deps.repository.saveObligation(receivable);
      return receivable;
    },
    createPayable(input) {
      const payable: ObligationDTO = {
        obligationId: deps.newId('payable'),
        tenantId: deps.tenantId,
        branchId: input.branchId,
        obligationType: 'Payable',
        partyId: input.supplierId,
        sourceDocument: input.sourceDocument,
        dueDate: input.dueDate ?? toIsoDate(deps.now()),
        originalAmountVnd: input.amountVnd,
        allocatedAmountVnd: 0,
        remainingAmountVnd: input.amountVnd,
        status: 'Open',
      };
      deps.repository.saveObligation(payable);
      return payable;
    },
    findPayableBySource(input) {
      return deps.repository
        .listObligations()
        .find(
          (obligation) =>
            obligation.obligationType === 'Payable' &&
            obligation.sourceDocument.sourceType === input.sourceType &&
            obligation.sourceDocument.sourceId === input.sourceId &&
            (input.sourceLineId === undefined || obligation.sourceDocument.sourceLineId === input.sourceLineId),
        );
    },
    reducePayable(input) {
      const obligation = deps.repository.getObligation(input.sourceObligationId);
      if (obligation === undefined || obligation.obligationType !== 'Payable' || obligation.partyId !== input.supplierId) {
        throw new Error('Payable obligation not found for reduction.');
      }
      if (input.amountVnd > obligation.remainingAmountVnd) {
        throw new Error('Payable reduction exceeds remaining amount.');
      }

      const next = applyAllocation(obligation, input.amountVnd);
      deps.repository.saveObligation(next);
      return next;
    },
  };
}

function applyAllocation(obligation: ObligationDTO, amountVnd: number): ObligationDTO {
  const allocatedAmountVnd = obligation.allocatedAmountVnd + amountVnd;
  const remainingAmountVnd = obligation.originalAmountVnd - allocatedAmountVnd;
  return {
    ...obligation,
    allocatedAmountVnd,
    remainingAmountVnd,
    status: remainingAmountVnd === 0 ? 'Settled' : 'PartiallyPaid',
  };
}

function resolveAgingBucket(daysOverdue: number): FinanceAgingRowDTO['bucket'] {
  if (daysOverdue <= 0) return 'Current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function diffDays(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000);
}

function applyPaymentAllocations(
  deps: FinanceServiceDependencies,
  paymentAmountVnd: number,
  allocationInputs: readonly { obligationId: string; amountVnd: number }[],
): FinanceServiceResult<{ allocations: PaymentAllocationDTO[]; obligations: ObligationDTO[] }> {
  const allocationTotal = allocationInputs.reduce((sum, allocation) => sum + allocation.amountVnd, 0);
  if (allocationTotal > paymentAmountVnd) {
    return {
      ok: false,
      error: {
        code: 'PAYMENT_ALLOCATION_EXCEEDS_AMOUNT',
        message: 'Tổng phân bổ vượt số tiền thanh toán.',
      },
    };
  }

  const obligations: ObligationDTO[] = [];
  const allocations: PaymentAllocationDTO[] = [];
  for (const allocationInput of allocationInputs) {
    const obligation = deps.repository.getObligation(allocationInput.obligationId);
    if (obligation === undefined) continue;
    if (allocationInput.amountVnd > obligation.remainingAmountVnd) {
      return {
        ok: false,
        error: {
          code: 'OBLIGATION_ALLOCATION_EXCEEDS_BALANCE',
          message: 'Số phân bổ vượt công nợ còn lại.',
        },
      };
    }

    const nextObligation = applyAllocation(obligation, allocationInput.amountVnd);
    deps.repository.saveObligation(nextObligation);
    obligations.push(nextObligation);
    allocations.push({
      allocationId: deps.newId('allocation'),
      tenantId: deps.tenantId,
      paymentId: 'pending',
      obligationId: allocationInput.obligationId,
      amountVnd: allocationInput.amountVnd,
      allocatedAt: deps.now().toISOString(),
    });
  }

  return { ok: true, data: { allocations, obligations } };
}

function createCashTransaction(
  deps: FinanceServiceDependencies,
  input: {
    branchId: string;
    cashDrawerId: string;
    transactionType: CashTransactionDTO['transactionType'];
    amountVnd: number;
    paymentId?: string;
    sourceDocument: CashTransactionDTO['sourceDocument'];
    actorId: string;
    approverId?: string;
    shiftId?: string;
    idempotencyKey: string;
  },
): CashTransactionDTO {
  return {
    cashTransactionId: deps.newId('cash-transaction'),
    tenantId: deps.tenantId,
    branchId: input.branchId,
    cashDrawerId: input.cashDrawerId,
    transactionType: input.transactionType,
    amountVnd: input.amountVnd,
    effectiveAt: deps.now().toISOString(),
    paymentId: input.paymentId,
    sourceDocument: input.sourceDocument,
    actorId: input.actorId,
    approverId: input.approverId,
    shiftId: input.shiftId,
    idempotencyKey: input.idempotencyKey,
  };
}

function createCustomerCredit(
  deps: FinanceServiceDependencies,
  branchId: string,
  customerId: string,
  sourcePaymentId: string,
  amountVnd: number,
  sourceDocument?: CustomerCreditDTO['sourceDocument'],
): CustomerCreditDTO {
  return {
    creditId: deps.newId('customer-credit'),
    tenantId: deps.tenantId,
    branchId,
    customerId,
    sourcePaymentId,
    sourceDocument,
    amountVnd,
    consumedAmountVnd: 0,
    status: 'Open',
  };
}

function createSupplierPrepayment(
  deps: FinanceServiceDependencies,
  branchId: string,
  supplierId: string,
  sourceDocument: SupplierPrepaymentDTO['sourceDocument'],
  amountVnd: number,
): SupplierPrepaymentDTO {
  return {
    prepaymentId: deps.newId('supplier-prepayment'),
    tenantId: deps.tenantId,
    branchId,
    supplierId,
    sourceDocument,
    amountVnd,
    consumedAmountVnd: 0,
    status: 'Open',
  };
}
