export type PaymentPartyType = 'Customer' | 'Supplier' | 'Internal' | 'Other';

export type FinanceSourceType =
  | 'SaleOrder'
  | 'SaleReturn'
  | 'PurchaseReceipt'
  | 'SupplierReturn'
  | 'Expense'
  | 'Shift'
  | 'Manual';

export interface FinanceSourceDocumentDTO {
  sourceType: FinanceSourceType;
  sourceId: string;
  sourceLineId?: string;
}

export interface CashDrawerDTO {
  cashDrawerId: string;
  tenantId: string;
  branchId: string;
  drawerCode: string;
  name: string;
  drawerType: 'Cash' | 'Bank' | 'Wallet';
  status: 'Active' | 'Disabled';
  directSaleEnabled: boolean;
}

export interface PaymentMethodDTO {
  paymentMethodId: string;
  tenantId: string;
  methodCode: string;
  name: string;
  methodType: 'Cash' | 'BankTransfer' | 'Card' | 'QR' | 'Credit';
  status: 'Active' | 'Disabled';
  directSaleEnabled: boolean;
}

export interface ShiftDTO {
  shiftId: string;
  tenantId: string;
  branchId: string;
  warehouseId: string;
  cashDrawerId: string;
  cashierId: string;
  status: 'Open' | 'SubmittedForClose' | 'Closed' | 'Locked';
  openedAt: string;
  openingCashVnd: number;
  expectedCashVnd: number;
  actualCashVnd?: number;
  varianceVnd?: number;
  closeReason?: string;
  lockedAt?: string;
}

export interface PaymentDTO {
  paymentId: string;
  tenantId: string;
  branchId: string;
  cashDrawerId: string;
  paymentMethodId: string;
  amountVnd: number;
  payerType: PaymentPartyType;
  payerId?: string;
  sourceDocument: FinanceSourceDocumentDTO;
  status: 'Approved' | 'Reversed';
  effectiveAt: string;
  shiftId?: string;
  reversalOfPaymentId?: string;
}

export interface CashTransactionDTO {
  cashTransactionId: string;
  tenantId: string;
  branchId: string;
  cashDrawerId: string;
  transactionType: 'Receipt' | 'Disbursement' | 'Refund' | 'Reversal' | 'ShiftOpening' | 'ShiftClosingVariance' | 'Expense';
  amountVnd: number;
  effectiveAt: string;
  paymentId?: string;
  sourceDocument: FinanceSourceDocumentDTO;
  actorId: string;
  approverId?: string;
  shiftId?: string;
  reversalOfCashTransactionId?: string;
  idempotencyKey: string;
}

export interface ObligationDTO {
  obligationId: string;
  tenantId: string;
  branchId: string;
  obligationType: 'Receivable' | 'Payable';
  partyId: string;
  sourceDocument: FinanceSourceDocumentDTO;
  dueDate: string;
  originalAmountVnd: number;
  allocatedAmountVnd: number;
  remainingAmountVnd: number;
  status: 'Open' | 'PartiallyPaid' | 'Settled' | 'Reversed';
}

export type FinanceAgingBucket = 'Current' | '1-30' | '31-60' | '61-90' | '90+';

export interface PaymentAllocationDTO {
  allocationId: string;
  tenantId: string;
  paymentId: string;
  obligationId: string;
  amountVnd: number;
  allocatedAt: string;
  reversalOfAllocationId?: string;
}

export interface CustomerCreditDTO {
  creditId: string;
  tenantId: string;
  branchId: string;
  customerId: string;
  sourcePaymentId: string;
  sourceDocument?: FinanceSourceDocumentDTO;
  amountVnd: number;
  consumedAmountVnd: number;
  status: 'Open' | 'Consumed' | 'Reversed';
}

export interface SupplierPrepaymentDTO {
  prepaymentId: string;
  tenantId: string;
  branchId: string;
  supplierId: string;
  sourceDocument: FinanceSourceDocumentDTO;
  amountVnd: number;
  consumedAmountVnd: number;
  status: 'Open' | 'Consumed' | 'Reversed';
}

export interface FinanceShiftOpenRequest {
  commandId: string;
  idempotencyKey: string;
  branchId: string;
  warehouseId: string;
  cashDrawerId: string;
  cashierId: string;
  openingCashVnd: number;
}

export interface FinanceShiftCloseRequest {
  commandId: string;
  idempotencyKey: string;
  shiftId: string;
  expectedCashVnd: number;
  actualCashVnd: number;
  varianceReason?: string;
}

export interface FinanceShiftLockRequest {
  commandId: string;
  idempotencyKey: string;
  shiftId: string;
  approverId: string;
}

export interface FinancePaymentAllocationInput {
  obligationId: string;
  amountVnd: number;
}

export interface FinancePaymentRecordRequest {
  commandId: string;
  idempotencyKey: string;
  branchId: string;
  cashDrawerId: string;
  paymentMethodId: string;
  amountVnd: number;
  payerType: PaymentPartyType;
  payerId?: string;
  sourceDocument: FinanceSourceDocumentDTO;
  shiftId?: string;
  allocations: readonly FinancePaymentAllocationInput[];
  actorId?: string;
}

export interface FinanceSupplierPaymentRecordRequest {
  commandId: string;
  idempotencyKey: string;
  branchId: string;
  cashDrawerId: string;
  paymentMethodId: string;
  amountVnd: number;
  supplierId: string;
  sourceDocument: FinanceSourceDocumentDTO;
  shiftId?: string;
  allocations: readonly FinancePaymentAllocationInput[];
  actorId?: string;
}

export interface FinanceRefundRecordRequest {
  commandId: string;
  idempotencyKey: string;
  branchId: string;
  cashDrawerId: string;
  paymentMethodId: string;
  amountVnd: number;
  payeeType: PaymentPartyType;
  payeeId?: string;
  sourceDocument: FinanceSourceDocumentDTO;
  shiftId?: string;
  approverId: string;
}

export interface FinanceCustomerCreditCreateRequest {
  branchId: string;
  customerId: string;
  sourceDocument: FinanceSourceDocumentDTO;
  amountVnd: number;
}

export interface FinanceSupplierPrepaymentCreateRequest {
  branchId: string;
  supplierId: string;
  sourceDocument: FinanceSourceDocumentDTO;
  amountVnd: number;
}

export interface FinancePaymentReverseRequest {
  commandId: string;
  idempotencyKey: string;
  paymentId: string;
  amountVnd: number;
  reason: string;
  approverId: string;
}

export interface FinanceExpenseApproveRequest {
  commandId: string;
  idempotencyKey: string;
  branchId: string;
  cashDrawerId: string;
  paymentMethodId: string;
  expenseId: string;
  amountVnd: number;
  payeeName: string;
  reason: string;
  approverId: string;
}

export interface FinanceCashDrawerUpsertRequest {
  commandId: string;
  idempotencyKey: string;
  cashDrawerId?: string;
  branchId: string;
  drawerCode: string;
  name: string;
  drawerType: CashDrawerDTO['drawerType'];
  status: CashDrawerDTO['status'];
  directSaleEnabled?: boolean;
}

export interface FinancePaymentMethodUpsertRequest {
  commandId: string;
  idempotencyKey: string;
  paymentMethodId?: string;
  methodCode: string;
  name: string;
  methodType: PaymentMethodDTO['methodType'];
  status: PaymentMethodDTO['status'];
  directSaleEnabled?: boolean;
}

export interface FinanceMasterDataRequest {
  branchId?: string;
  includeDisabled?: boolean;
}

export interface FinanceMasterDataResponse {
  cashDrawers: readonly CashDrawerDTO[];
  paymentMethods: readonly PaymentMethodDTO[];
}

export interface FinanceAgingProjectionRequest {
  asOfDate: string;
  branchId?: string;
  obligationType?: ObligationDTO['obligationType'];
  includeSettled?: boolean;
}

export interface FinanceAgingRowDTO {
  obligationId: string;
  branchId: string;
  obligationType: ObligationDTO['obligationType'];
  partyId: string;
  sourceDocument: FinanceSourceDocumentDTO;
  dueDate: string;
  daysOverdue: number;
  bucket: FinanceAgingBucket;
  originalAmountVnd: number;
  allocatedAmountVnd: number;
  remainingAmountVnd: number;
  status: ObligationDTO['status'];
}

export interface FinanceAgingTotalsDTO {
  totalRemainingVnd: number;
  currentVnd: number;
  bucket1To30Vnd: number;
  bucket31To60Vnd: number;
  bucket61To90Vnd: number;
  bucket90PlusVnd: number;
}

export interface FinanceAgingProjectionResponse {
  generatedAt: string;
  asOfDate: string;
  branchId?: string;
  obligationType?: ObligationDTO['obligationType'];
  rows: readonly FinanceAgingRowDTO[];
  totals: FinanceAgingTotalsDTO;
}

export interface FinancePaymentRecordResponse {
  payment: PaymentDTO;
  cashTransaction: CashTransactionDTO;
  allocations: readonly PaymentAllocationDTO[];
  obligations: readonly ObligationDTO[];
  customerCredit?: CustomerCreditDTO;
  supplierPrepayment?: SupplierPrepaymentDTO;
}

export interface FinanceSummaryResponse {
  generatedAt: string;
  openShiftCount: number;
  cashInVnd: number;
  cashOutVnd: number;
  receivableOpenVnd: number;
  payableOpenVnd: number;
}
