# Table Dictionary — Catalog và CRM

**Trạng thái:** Đã phê duyệt  
**Nguồn:** [LLD Catalog–CRM](../../architecture/modules/catalog-crm.md), [Sheet schema and registry](../sheet-schema-and-registry.md), `SRS-CRM-001` đến `SRS-CRM-015`

Các bảng dùng base columns của registry (`id`, `tenantId`, `schemaVersion`, `recordVersion`, lifecycle time/actor, `commandId` khi mutation). Cột được liệt kê là business/query columns; `detailsJson`/`snapshotJson` chứa cấu trúc sâu versioned, không thay thế khóa/scope/amount/state.

## 1. Core Data — catalog và commercial configuration

| Table | Lifecycle | Cột typed chính | JSON/versioned |
| --- | --- | --- | --- |
| `Product` | master | `productId`, `productCode`, `name`, `productType`, `categoryId`, `brandId`, `taxCode`, `isActive` | `descriptionJson`, image/attribute reference |
| `Variant` | master | `variantId`, `productId`, `skuNormalized`, `displayName`, `inventoryMode`, `lotTracking`, `serialTracking`, `defaultUnitId`, `isActive` | attribute snapshot |
| `VariantBarcode` | master | `barcodeId`, `variantId`, `unitVersionId`, `barcodeNormalized`, `barcodeKind`, `isActive` | generation metadata |
| `UnitConversionVersion` | master/versioned | `unitVersionId`, `variantId`, `unitId`, `baseUnitId`, `factor`, `saleEnabled`, `purchaseEnabled`, `effectiveFrom`, `effectiveTo`, `isActive` | display/rounding policy |
| `BundleFormulaVersion` | master/versioned | `formulaVersionId`, `bundleVariantId`, `effectiveFrom`, `effectiveTo`, `status` | component list: variant ID, base quantity, substitution rule |
| `PriceList` | master | `priceListId`, `name`, `scopeType`, `branchId`, `customerGroupId`, `status`, `effectiveFrom`, `effectiveTo`, `priority` | policy metadata |
| `PriceRule` | master/versioned | `priceRuleId`, `priceListId`, `variantId`, `unitVersionId`, `unitPriceVnd`, `effectiveFrom`, `effectiveTo`, `priority`, `status` | condition snapshot |
| `Promotion` | master/versioned | `promotionId`, `name`, `promotionType`, `status`, `branchScopeKey`, `effectiveFrom`, `effectiveTo`, `priority`, `usageLimit`, `budgetVnd` | condition/reward/eligibility rule |
| `Voucher` | master | `voucherId`, `promotionId`, `codeNormalized`, `status`, `effectiveFrom`, `effectiveTo`, `usageLimit`, `usedCount` | condition/reward snapshot |
| `CommissionRule` | master/versioned | `commissionRuleId`, `scopeType`, `staffId`, `categoryId`, `productId`, `rateType`, `rateValue`, `effectiveFrom`, `effectiveTo`, `status` | rule condition |

`skuNormalized` và `barcodeNormalized` là lookup key unique theo tenant. Unique check phải revalidate trong mutation lock; cache/search index chỉ hỗ trợ phát hiện sớm. Hiệu lực khoảng thời gian dùng half-open interval `[effectiveFrom, effectiveTo)`; `effectiveTo` null nghĩa là chưa hết hạn.

## 2. Core Data — customer và loyalty policy

| Table | Lifecycle | Cột typed chính | JSON/versioned |
| --- | --- | --- | --- |
| `Customer` | master | `customerId`, `customerCode`, `displayName`, `phoneNormalized`, `emailNormalized`, `customerGroupId`, `status`, `mergedIntoCustomerId` | contact/address/note |
| `CustomerGroup` | master | `customerGroupId`, `name`, `assignmentMode`, `status`, `priority` | condition rule |
| `CustomerMerge` | immutable master/evidence | `mergeId`, `sourceCustomerId`, `targetCustomerId`, `mergedAt`, `mergedBy`, `reason` | before/after summary |
| `LoyaltyPolicyVersion` | master/versioned | `policyVersionId`, `effectiveFrom`, `effectiveTo`, `earnRate`, `redeemRate`, `expiryPolicy`, `status` | eligibility/rounding rule |
| `WarrantyPolicyVersion` | master/versioned | `policyVersionId`, `productId`, `variantId`, `durationDays`, `effectiveFrom`, `effectiveTo`, `status` | terms snapshot |

Customer source đã `Merged` không selectable cho giao dịch mới. `phoneNormalized`/`emailNormalized` chỉ là lookup theo duplicate policy tenant; dữ liệu gốc hiển thị được giữ trong contact JSON và không bị tự ghi đè bởi normalizer.

## 3. Active Transaction partition

| Table | Lifecycle | Cột typed chính | JSON/versioned |
| --- | --- | --- | --- |
| `PromotionApplication` | immutable document detail | `applicationId`, `partitionKey`, `saleOrderId`, `saleLineId`, `promotionId`, `promotionVersionId`, `discountVnd`, `status`, `sourceCommandId` | eligibility/rejection snapshot |
| `VoucherUsage` | immutable ledger-like | `usageId`, `partitionKey`, `voucherId`, `saleOrderId`, `customerId`, `usedAt`, `discountVnd`, `reversalOfUsageId`, `status` | voucher snapshot |
| `PointLedger` | append-only ledger | `pointEntryId`, `partitionKey`, `customerId`, `sourceType`, `sourceId`, `effectiveAt`, `expiresAt`, `earnedPoints`, `spentPoints`, `reversalOfEntryId`, `status` | policy snapshot |
| `CommissionLedger` | append-only ledger | `commissionEntryId`, `partitionKey`, `staffId`, `saleOrderId`, `saleLineId`, `ruleVersionId`, `amountVnd`, `reversalOfEntryId`, `status` | rule/base snapshot |
| `WarrantyCase` | document | `warrantyCaseId`, `partitionKey`, `customerId`, `saleOrderId`, `saleLineId`, `variantId`, `serialId`, `policyVersionId`, `receivedAt`, `status` | issue/resolution/attachment refs |

`PromotionApplication`, `VoucherUsage`, `PointLedger` và `CommissionLedger` are batch-appended with Sale command and only count when source command is `Committed`. Warranty state updates and import commits create their own command and store actor metadata on source records. `ImportBatch`/`ImportStagingRow` là hạ tầng dùng chung, được định nghĩa duy nhất tại [Operations–Reporting tables](operations-reporting.md).

## 4. Index/projection and retention rules

- `CatalogPosProjection` is a cacheable Core projection keyed by Branch, catalog version and price/promotion policy version; it is not a source of truth and contains no cost/supplier/secret data.
- Search uses normalized SKU/barcode exact lookup first; name search is a bounded projection/search index, never a full transaction scan.
- Customer canonical reporting query follows `mergedIntoCustomerId` without rewriting source order/ledger rows.
- Master rows are deactivated/versioned, never hard deleted once referenced. Transaction rows remain in their original partition and archive with that partition.
