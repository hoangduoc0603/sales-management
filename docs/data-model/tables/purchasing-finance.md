# Table Dictionary — Purchasing và Finance

**Trạng thái:** Đã hoàn thiện LLD Purchasing và Finance.
**Nguồn:** [LLD Purchasing](../../architecture/modules/purchasing.md), [Sheet schema](../sheet-schema-and-registry.md)

| Table | Lifecycle | Cột typed chính | JSON/snapshot |
| --- | --- | --- |
| `Supplier` | master | `supplierId`, `supplierCode`, `name`, `taxCode`, `status`, `paymentTerms` | contact/address/note |
| `PurchaseOrder` / `PurchaseOrderLine` | document | ID, supplier, Branch/Warehouse, status, expected date; line variant/unit/quantity/price/tax/received quantity | terms/attachment refs |
| `GoodsReceipt` / `GoodsReceiptLine` | document | ID, supplier/Warehouse, status, received date; line variant/lot/serial/quantity/unit/price/tax/allocated cost | receipt/commercial snapshot |
| `LandedCostAdjustment` | immutable adjustment | adjustment/receipt ID, status, total VND, method, on-hand allocated VND, variance VND | allocation evidence |
| `SupplierReturn` / `SupplierReturnLine` | document | source receipt, Warehouse, status, line quantity/value/lot/serial, treatment | reason/approval snapshot |
| `PurchaseCostVariance` | append-only ledger | ID, adjustment/receipt/variant/Warehouse, amount VND, effective time | reason/cost source |

All approved mutations have partition key, command correlation and actor metadata on the source record. Receipt/return query uses supplier/Warehouse/status/date indexes; no full ledger scan in receipt approval.

## Finance

| Table | Lifecycle | Cột typed chính | JSON/snapshot |
| --- | --- | --- | --- |
| `CashDrawer` / `PaymentMethod` | master | ID, `branchId`, code, name, type, status, direct-sale eligibility | provider/config display metadata; no secret. |
| `Payment` | document | `paymentId`, `partitionKey`, `branchId`, payer/payee type and ID, source document, amount VND, method, status, effectiveAt, `shiftId`, reversal reference | tender/reference snapshot. |
| `CashTransaction` | append-only ledger | `cashTransactionId`, partition, Branch, drawer/account, transaction type, amount VND signed, effectiveAt, payment/source/reversal ID, actor/approver, `shiftId` | reason/evidence snapshot. |
| `ReceivableLedger` / `PayableLedger` | append-only obligation ledger | ID, partition, Branch, customer/supplier, source document, due date, original/allocated/remaining VND, status, reversal reference | obligation terms snapshot. |
| `PaymentAllocation` | append-only allocation | `allocationId`, partition, `paymentId`, receivable/payable ID, amount VND, allocatedAt, reversal reference | allocation reason. |
| `CustomerCredit` / `SupplierPrepayment` | append-only balance evidence | ID, partition, party ID, source payment/refund, amount VND, consumed/reversed amount, status | source/effective snapshot. |
| `Shift` | document/state | `shiftId`, partition, Branch, CashDrawer, Warehouse, cashier, status, openedAt, submitted/closed/locked times, opening/expected/actual/variance VND, approver | tender breakdown/reason/close evidence. |
| `Expense` | document/state | `expenseId`, partition, Branch, category, drawer/account, payee, amount VND, effectiveAt, status, cash transaction/source attachment ID, actor/approver | reason/attachment snapshot. |

All approved mutations carry partition, command correlation and actor metadata. Payment/ledger/allocation and balance/aging/shift expected projections are committed atomically; projections read only Approved/Committed evidence and never accept user-editable balance.
