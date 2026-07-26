# LLD — Sales, POS và trả/đổi hàng

**Trạng thái:** Đã phê duyệt  
**Nguồn:** `SRS-SAL-001` đến `SRS-SAL-017`, `SRS-INV-006` đến `SRS-INV-012`, `SRS-FIN-003` đến `SRS-FIN-005`, [LLD Catalog–CRM](catalog-crm.md)

## 1. Ownership và nguyên tắc

Sales sở hữu `SaleOrder`, line, saved draft, recipient/shipping snapshot, receipt snapshot và `ReturnOrder`. Sales điều phối checkout nhưng không tự ghi InventoryMovement, CashTransaction/ReceivableLedger hay PointLedger; các domain Inventory, Finance, CRM tạo ledger của mình trong cùng command.

POS cart là state browser. `saveDraft` là action rõ ràng tạo/cập nhật `SaleOrder` `Draft`; scan/search/sửa giỏ/tender không RPC. Draft không có movement, payment, receivable, promotion usage hay reservation. Reload mất cart chưa lưu nhưng user có thể tìm/mở Draft đã lưu theo Branch/Warehouse scope.

## 2. State machine

```text
POS: Draft --complete--> Completed
       └--cancel-------> Cancelled

Online: Draft -> Confirmed -> Packing -> Shipped -> Delivered
          |        |          |
          +--------+----------+--> Cancelled (chỉ trước Shipped)

Return: Draft -> ReceivedForInspection -> Resolved | Cancelled
```

- `completeSale` chỉ cho POS Draft hoặc cart local; `Completed` bất biến trực tiếp.
- `confirmOnline` tạo reservation; `shipOnline` issue tồn, giải phóng reservation, ghi doanh thu/cost/obligation một lần; `Delivered` không tạo ledger lần hai.
- Return tham chiếu order source; `resolveReturn` gọi Inventory để Quarantine/Restock/Scrap và Finance để refund/credit. Exchange luôn tạo Return và SaleOrder mới, liên kết hai chiều.

## 3. Commands và preconditions

| Command | Input/quyền chính | Hậu quả |
| --- | --- | --- |
| `sales.draft.save` | Branch/Warehouse scope, cart snapshot, `draftId?` | Persist Draft/version/audit; không financial/inventory ledger. |
| `sales.pos.complete` | open shift khi policy yêu cầu, command/idempotency, quote/tender | Atomically SaleOrder `Completed`, Inventory issue, Finance payment/AR, CRM policy ledger, AuditOutbox, receipt. |
| `sales.online.confirm` | order Draft, available stock | `Confirmed` + reservation; không revenue/on-hand. |
| `sales.online.ship` | `Packing|Confirmed`, fulfillment/tender validation | `Shipped` + issue/revenue/cost/AR/payment allocation. |
| `sales.online.cancel` | state trước Shipped | release reservation; xử lý deposit thành credit/refund, audit. |
| `sales.return.create/resolve` | source order or privileged fast-return, quantity/reason | Return document; accepted inspection creates domain reversals. |

Mọi command revalidate Branch/Warehouse, product/unit/lot/serial, quote, price override approval, stock exception, credit policy, shift/tender total và idempotency trong commit protocol. Mismatch cached data trả conflict có detail; không commit phần order/ledger nào.

## 4. Checkout orchestration

```text
cart/draft + command key
 -> Sales validates and snapshots lines
 -> Catalog/CRM re-quotes commercial policy
 -> Inventory validates then issues variant/BOM/lot/serial
 -> Finance records payment, allocation, AR/COD/deposit outcome
 -> CRM writes promotion/voucher/point/commission entries
 -> Sales marks Completed and returns immutable receipt snapshot
```

Một `SaleOrderLine` snapshot variant/SKU/name/unit/factor, base/applied/manual price, discount, tax, promotion/point/voucher, cost and total. Receipt is returned in `ApiResult`; browser renders K80/A4. Print/reprint/export is separate from checkout and cannot create ledger.

## 5. Return và exchange

Return line computes maximum return quantity from source sale less resolved returns. Reference return reuses original commercial/cost snapshot; fast return requires privileged actor, approved cost policy and Quarantine destination. Refund is a Finance counter-document, never deletion of original Payment. Resolved return emits CRM reversal entries and Inventory movement according to inspection result. 

## 6. POS performance and tests

Adapter keeps a single in-flight complete command per cart/command ID. It uses `command.getStatus` then same idempotency key after timeout. The hot path excludes Drive, PDF, export, report, full history and audit partition I/O.

Tests cover warm-cache scan/no RPC, explicit draft save/reopen/cancel, shift requirement, POS full/partial payment, online reservation/cancel/ship/deliver, quote conflict, retry duplicate prevention, source/fast return permission, exchange net settlement, print no-ledger, and concurrent last-stock/voucher cases.
