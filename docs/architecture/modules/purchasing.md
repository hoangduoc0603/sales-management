# LLD — Purchasing và nhận/trả NCC

**Trạng thái:** Đã phê duyệt  
**Nguồn:** `SRS-PUR-001` đến `SRS-PUR-011`, `SRS-FIN-004` đến `SRS-FIN-006`, [LLD Inventory](inventory.md)

## 1. Ownership và state

Purchasing sở hữu Supplier, PO, Receipt, landed-cost adjustment và Return NCC; Inventory sở hữu movement/balance, Finance sở hữu Payable/payment allocation.

```text
PO: Draft → PendingApproval → Approved → PartiallyReceived → Completed
    Draft | PendingApproval | Approved | PartiallyReceived → Cancelled

Receipt/Return: Draft → PendingApproval → Approved | Rejected | Cancelled
```

PO không tạo tồn, cost hay payable. Receipt Approved revalidates supplier/Warehouse/PO remaining quantity/lot/serial/cost allocation, then atomically creates PurchaseReceipt movement, balance/cost update and Payable, while receipt record stores `approvedBy/approvedAt`. Approved receipt is corrected only by Return/adjustment.

## 2. Commands và chi phí mua

`po.create/approve/cancel`, `receipt.create/approve`, `landedCost.adjust`, `supplierReturn.create/approve` và `supplierInvoice.adjust` là idempotent commands. Receipt line snapshots unit/factor, price, discount, VAT, actual cost, allocation method/value and supplier terms.

Landed cost allocation must equal the cost amount before approval. Methods: value, base quantity or explicit manual amount. Late invoice/cost never edits receipt or historical sale COGS: it creates an approved adjustment with actor metadata; allocation increases remaining on-hand value for referenced receipt/variant/Warehouse, while the unallocatable sold portion creates `PurchaseCostVariance` evidence.

Return NCC cannot exceed received less returned quantity and validates current Warehouse/lot/serial. Approved return creates PurchaseReturn, reduces Payable or creates supplier credit/refund according to selected treatment.

## 3. Tests

Test PO no-ledger; partial receipt; serial/lot rejection; exact landed-cost allocation; late cost split on-hand/variance; return limit; and multi-receipt payment allocation.
