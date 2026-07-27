import type {
  CashDrawerDTO,
  CashTransactionDTO,
  CustomerCreditDTO,
  ObligationDTO,
  PaymentAllocationDTO,
  PaymentDTO,
  PaymentMethodDTO,
  ShiftDTO,
  SupplierPrepaymentDTO,
} from '@shared/contracts/finance/finance';

export interface FinanceRepository {
  saveCashDrawer(drawer: CashDrawerDTO): void;
  savePaymentMethod(method: PaymentMethodDTO): void;
  saveShift(shift: ShiftDTO): void;
  savePayment(payment: PaymentDTO): void;
  saveObligation(obligation: ObligationDTO): void;
  saveCustomerCredit(credit: CustomerCreditDTO): void;
  saveSupplierPrepayment(prepayment: SupplierPrepaymentDTO): void;
  appendCashTransaction(transaction: CashTransactionDTO): void;
  appendPaymentAllocation(allocation: PaymentAllocationDTO): void;
  getShift(shiftId: string): ShiftDTO | undefined;
  findOpenShiftByCashier(cashierId: string): ShiftDTO | undefined;
  findOpenShiftForPos(input: { branchId: string; warehouseId: string; cashierId: string }): ShiftDTO | undefined;
  getPayment(paymentId: string): PaymentDTO | undefined;
  getObligation(obligationId: string): ObligationDTO | undefined;
  listCashTransactions(): CashTransactionDTO[];
  listPaymentAllocations(): PaymentAllocationDTO[];
  listObligations(): ObligationDTO[];
  listCustomerCredits(): CustomerCreditDTO[];
  listSupplierPrepayments(): SupplierPrepaymentDTO[];
  listPayments(): PaymentDTO[];
  listShifts(): ShiftDTO[];
}

export function createInMemoryFinanceRepository(): FinanceRepository {
  const cashDrawers = new Map<string, CashDrawerDTO>();
  const paymentMethods = new Map<string, PaymentMethodDTO>();
  const shifts = new Map<string, ShiftDTO>();
  const payments = new Map<string, PaymentDTO>();
  const cashTransactions = new Map<string, CashTransactionDTO>();
  const allocations = new Map<string, PaymentAllocationDTO>();
  const obligations = new Map<string, ObligationDTO>();
  const credits = new Map<string, CustomerCreditDTO>();
  const supplierPrepayments = new Map<string, SupplierPrepaymentDTO>();

  return {
    saveCashDrawer(drawer) {
      cashDrawers.set(drawer.cashDrawerId, clone(drawer));
    },
    savePaymentMethod(method) {
      paymentMethods.set(method.paymentMethodId, clone(method));
    },
    saveShift(shift) {
      shifts.set(shift.shiftId, clone(shift));
    },
    savePayment(payment) {
      payments.set(payment.paymentId, clone(payment));
    },
    saveObligation(obligation) {
      obligations.set(obligation.obligationId, clone(obligation));
    },
    saveCustomerCredit(credit) {
      credits.set(credit.creditId, clone(credit));
    },
    saveSupplierPrepayment(prepayment) {
      supplierPrepayments.set(prepayment.prepaymentId, clone(prepayment));
    },
    appendCashTransaction(transaction) {
      if (cashTransactions.has(transaction.cashTransactionId)) {
        throw new Error(`CashTransaction is append-only: duplicate ${transaction.cashTransactionId}.`);
      }
      cashTransactions.set(transaction.cashTransactionId, clone(transaction));
    },
    appendPaymentAllocation(allocation) {
      if (allocations.has(allocation.allocationId)) {
        throw new Error(`PaymentAllocation is append-only: duplicate ${allocation.allocationId}.`);
      }
      allocations.set(allocation.allocationId, clone(allocation));
    },
    getShift(shiftId) {
      return cloneOptional(shifts.get(shiftId));
    },
    findOpenShiftByCashier(cashierId) {
      return cloneOptional([...shifts.values()].find((shift) => shift.cashierId === cashierId && shift.status === 'Open'));
    },
    findOpenShiftForPos({ branchId, cashierId, warehouseId }) {
      return cloneOptional(
        [...shifts.values()].find(
          (shift) =>
            shift.branchId === branchId &&
            shift.warehouseId === warehouseId &&
            shift.cashierId === cashierId &&
            shift.status === 'Open',
        ),
      );
    },
    getPayment(paymentId) {
      return cloneOptional(payments.get(paymentId));
    },
    getObligation(obligationId) {
      return cloneOptional(obligations.get(obligationId));
    },
    listCashTransactions: () => [...cashTransactions.values()].map(clone),
    listPaymentAllocations: () => [...allocations.values()].map(clone),
    listObligations: () => [...obligations.values()].map(clone),
    listCustomerCredits: () => [...credits.values()].map(clone),
    listSupplierPrepayments: () => [...supplierPrepayments.values()].map(clone),
    listPayments: () => [...payments.values()].map(clone),
    listShifts: () => [...shifts.values()].map(clone),
  };
}

function cloneOptional<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : clone(value);
}

function clone<T>(value: T): T {
  return { ...value };
}
