# Table Dictionary — Sales và Inventory

**Trạng thái:** Đã phê duyệt phần Sales/POS/Return; Inventory sẽ bổ sung bảng movement/balance/lot/serial.  
**Nguồn:** [LLD Sales](../../architecture/modules/sales-pos-returns.md), [LLD Catalog–CRM](../../architecture/modules/catalog-crm.md), [Sheet schema](../sheet-schema-and-registry.md)

Tất cả bảng transaction có `partitionKey`, technical ID, tenant/scope, lifecycle timestamp/actor, command/audit correlation và chỉ có hiệu lực khi source command `Committed`.

| Table | Lifecycle | Cột typed chính | JSON/snapshot |
| --- | --- | --- | --- |
| `SaleOrder` | document | `saleOrderId`, `businessNumber`, `source`, `branchId`, `warehouseId`, `customerId`, `status`, `paymentStatus`, `createdAt`, `completedAt`, `shippedAt`, `deliveredAt`, `totalVnd`, `paidVnd`, `receivableVnd`, `draftVersion`, `linkedReturnId` | recipient/shipping/order note/policy snapshot |
| `SaleOrderLine` | immutable after completion | `saleLineId`, `saleOrderId`, `lineNo`, `variantId`, `unitVersionId`, `quantityBase`, `quantityDisplay`, `basePriceVnd`, `appliedPriceVnd`, `discountVnd`, `taxVnd`, `lineTotalVnd`, `unitCostVnd`, `bundleFormulaVersionId` | display/commercial/BOM snapshot |
| `SaleTenderDraft` | draft-only child | `tenderDraftId`, `saleOrderId`, `methodId`, `amountVnd`, `cashDrawerId` | tender note; deleted/retired with draft cancellation |
| `SaleFulfillment` | document child | `fulfillmentId`, `saleOrderId`, `status`, `recipientName`, `recipientPhone`, `shippingFeeVnd`, `codVnd`, `packedBy`, `shippedAt` | address/carrier/reference snapshot |
| `SaleReturn` | document | `returnId`, `sourceSaleOrderId`, `branchId`, `warehouseId`, `customerId`, `status`, `returnType`, `receivedAt`, `resolvedAt`, `linkedExchangeSaleId` | reason/inspection summary |
| `SaleReturnLine` | document child | `returnLineId`, `returnId`, `sourceSaleLineId`, `variantId`, `quantityBase`, `refundVnd`, `costVnd`, `disposition` | source commercial/serial/lot snapshot |
| `ReceiptSnapshot` | immutable document | `receiptId`, `saleOrderId`, `businessNumber`, `renderVersion`, `createdAt` | full printable K80/A4 snapshot |

`SaleTenderDraft` is never a Finance payment. A persisted Draft can be cancelled; Completed/Shipment correction uses Return/reversal, never edit/cancel back. Query uses Branch/Warehouse/status/date indexes and active partition routing; POS does not search historical SaleOrder in its fast path.

## Inventory additions

| Table | Lifecycle | Cột typed chính | JSON/snapshot |
| --- | --- | --- | --- |
| `InventoryMovement` | append-only ledger | `movementId`, `partitionKey`, `movementType`, `warehouseId`, `variantId`, `lotId`, `serialId`, `quantityMilli`, `unitVersionId`, `unitCostVnd`, `totalCostVnd`, `sourceType`, `sourceId`, `effectiveAt`, `reversalOfMovementId` | source/unit/approval snapshot |
| `InventoryBalance` | projection | `balanceId`, `warehouseId`, `variantId`, `onHandMilli`, `availableMilli`, `reservedMilli`, `inTransitMilli`, `quarantineMilli`, `inventoryValueVnd`, `asOfMovementId` | reconciliation metadata |
| `InventoryLotBalance` | projection | `lotBalanceId`, `warehouseId`, `variantId`, `lotCode`, `expiryDate`, `onHandMilli`, `availableMilli`, `quarantineMilli` | manufacture/quality metadata |
| `SerialState` | state record | `serialId`, `variantId`, `warehouseId`, `status`, `sourceMovementId`, `sourceSaleLineId`, `updatedAt` | serial/history summary |
| `StockTransfer` / `StockTransferLine` | document | `transferId`, source/destination warehouse, `status`, line variant/quantity/received quantity | reason/variance/attachment refs |
| `StocktakeSession` / `StocktakeLine` | document | `sessionId`, warehouse, `status`, snapshot quantity, counted quantity, variance | scope/reason/approval refs |

All quantity columns are milli-units and all inventory value/cost totals VND integers. `InventoryBalance` is rebuildable from ledger but is never manually edited; reconciliation output is an audited worker result.
