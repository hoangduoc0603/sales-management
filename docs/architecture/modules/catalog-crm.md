# LLD — Catalog, CRM và chính sách thương mại

**Trạng thái:** Đã phê duyệt  
**Nguồn:** `SRS-CRM-001` đến `SRS-CRM-015`, `SRS-SAL-003` đến `SRS-SAL-006`, [Detailed Design](../detailed-design.md), [Logical Data Model](../../data-model/logical-data-model.md)

## 1. Ownership và aggregate

| Owner | Aggregate | Trách nhiệm |
| --- | --- | --- |
| Catalog | Product, Variant, Barcode, UnitConversion, BundleFormula | Danh mục bán/mua/tồn, lookup POS và version hiệu lực. |
| CRM | Customer, CustomerGroup, CustomerMerge | Hồ sơ, chống trùng, canonical customer và policy khách. |
| Pricing | PriceList, PriceRule, CommerceQuote | Chọn giá xác định theo Branch/nhóm khách/đơn vị/thời điểm. |
| Promotion | Promotion, Voucher, PromotionApplication | Eligibility, một promotion tự động thắng, voucher usage và reason. |
| Loyalty | PointLedger | Số dư điểm từ ledger bất biến. |
| Warranty/Commission | WarrantyCase, CommissionRule/Ledger | Theo dõi sau bán; không tự hạch toán tồn/tiền. |

`Product` không là đơn vị giao dịch. Mọi line sale/purchase/inventory/price/barcode/serial tham chiếu `variantId`; sản phẩm đơn giản có một `Default Variant`. Bundle dùng variant không quản lý tồn riêng và `BundleFormula` versioned; completed sale snapshot công thức rồi issue component.

## 2. Lifecycle và command

| Aggregate | Transition/command | Guard chính |
| --- | --- | --- |
| Product/Variant | `create`, `update`, `deactivate`, `reactivate` | SKU/barcode unique; không hard delete khi đã có reference. |
| UnitConversion | `addVersion`, `deactivate` | factor dương; không sửa version đã snapshot trên chứng từ. |
| BundleFormula | `createVersion`, `activate`, `retire` | component là variant hợp lệ; quantity cơ bản dương; hiệu lực không mơ hồ. |
| Customer | `create`, `update`, `deactivate`, `merge` | normalizer/duplicate policy; merge chỉ Manager/Owner. |
| PriceList/Rule | `draft`, `publish`, `retire` | scope/effective range rõ; conflict cùng priority bị chặn. |
| Promotion | `draft → Active → Paused | Expired | Retired` | điều kiện/giới hạn/budget hợp lệ; Active không sửa rule lịch sử. |
| Voucher | `issue`, `reserve-none`, `redeem`, `void` | redeem chỉ trong checkout commit; usage limit/validity còn hiệu lực. |
| WarrantyCase | `Received → InProgress → Completed | Rejected` | có sale/serial/policy snapshot hợp lệ. |

`catalog.import.prepare` tạo `ImportBatch` staging; `catalog.import.commit` chỉ chạy sau user chọn `validRowsOnly` hoặc `cancelAll`. Commit cùng `batchId` idempotent, lưu `createdBy/updatedBy` trên record liên quan và không tạo row trùng.

## 3. POS read model và quote

POS bootstrap trả catalog projection theo Branch/Warehouse scope: variant active, barcode index, unit bán được, price/promotion policy version và resource version. Scan/search/cart chạy local; detail/lô/serial lazy-load. Không trả cost, supplier data hay policy không thuộc permission.

```text
cart + branch + warehouse + customer + atTime
  -> CatalogPricingService.quote
  -> base variant price
  -> Branch price rule
  -> customer-group price rule
  -> one best automatic promotion
  -> eligible voucher / loyalty redemption
  -> CommerceQuote + application/rejection reasons
```

Quote là object tính tạm, không giữ voucher, budget hoặc điểm. Nếu user chọn giá/chiết khấu thủ công, quote vẫn lưu automatic promotion đủ điều kiện nhưng đánh dấu bị bỏ qua, reason và approval requirement. `SalesCheckoutService` gọi quote lại trong commit; nếu price/promotion/voucher/point version khác, trả `PRICE_CHANGED`, `PROMOTION_CHANGED`, `VOUCHER_UNAVAILABLE` hoặc `POINT_BALANCE_CHANGED`, không tự thay giỏ.

Khi checkout `Committed`, Promotion tạo `PromotionApplication`/`VoucherUsage`; Loyalty tạo `PointLedger`; Sales snapshot quote/rule lên order line. Return/cancel tạo application/usage/point reversal theo source reference, không update record lịch sử.

## 4. Determinism và concurrency

- Chỉ một promotion tự động được chọn: giảm tuyệt đối toàn đơn cao nhất, rồi `priority` nhỏ hơn, rồi technical ID nhỏ hơn.
- Voucher/point chỉ dùng sau automatic promotion và chỉ khi giá trị không làm line/order âm.
- `VoucherUsage`, point available balance và promotion usage/budget được fresh-read/revalidate trong command lock cùng Sale commit. Usage không được tăng ở cart draft.
- Customer group, price rule, promotion rule, commission rule và warranty policy luôn có version/effective period; document lưu rule/snapshot ID và snapshot hiển thị.
- Customer merge đặt source `Merged` và `mergedIntoCustomerId`; historical order/ledger vẫn giữ source ID. Query/report resolve canonical customer có thể hiển thị group, nhưng không rewrite ledger/foreign key.

## 5. Authorization và error contract

| Operation family | Permission tối thiểu | Error đáng chú ý |
| --- | --- | --- |
| Catalog/Customer query | `view` theo scope | `SCOPE_DENIED`, `PRODUCT_INACTIVE` |
| Catalog/price/promotion config | `configure` | `DUPLICATE_SKU`, `DUPLICATE_BARCODE`, `EFFECTIVE_RANGE_CONFLICT` |
| Manual price/discount | sensitive price override + approval khi vượt ngưỡng | `MANUAL_PRICE_APPROVAL_REQUIRED` |
| Customer merge | `configure` Manager/Owner | `CUSTOMER_MERGE_FORBIDDEN` |
| Point adjustment/voucher issue | sensitive loyalty/configure | `POINT_BALANCE_INVALID`, `VOUCHER_UNAVAILABLE` |
| Warranty/commission | domain create/update/approve scope | `WARRANTY_TRANSITION_INVALID` |

Mọi create/update/deactivate/merge/publish/redeem/adjust phải lưu actor metadata trực tiếp trên record phát sinh hoặc record chuyển trạng thái. Credential, payment data, internal notes hạn chế và cost không được đưa vào catalog cache hoặc quote nếu actor không có quyền.

## 6. Test matrix

| Nhóm | Kịch bản bắt buộc |
| --- | --- |
| Variant/unit | Default Variant cho product đơn giản; SKU/barcode case-insensitive unique; version quy đổi mới không đổi order cũ. |
| Bundle | Completed snapshot BOM và issue component; thiếu component chặn hoặc đi qua ngoại lệ âm kho đã duyệt. |
| Quote | Branch → group → best promotion → voucher/point; tie-break xác định; price cache stale trả conflict. |
| Concurrency | Hai checkout cùng voucher/point cuối cùng chỉ một command commit usage; retry cùng key không cấp/trừ lần hai. |
| Customer | Duplicate theo policy; merge không mất order/ledger/point và source–target lưu được người thực hiện. |
| Import | lỗi theo dòng, commit valid-only/cancel-all, retry batch không tạo trùng. |
| Warranty/commission | state guard; return/cancel sinh reversal commission/point theo source. |

## 7. Physical schema

Table dictionary và storage role nằm tại [Catalog–CRM tables](../../data-model/tables/catalog-crm.md). `PromotionApplication`, `VoucherUsage`, `PointLedger` và `CommissionLedger` ở active Transaction partition dù domain owner là CRM/Promotion; POS chỉ ghi chúng trong checkout batch.
