# UI Coverage Gap Analysis

- Ngày cập nhật: 2026-08-01
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Design system: Cenio Core v0.7
- Trạng thái: `Approved`

## Kết luận coverage

Các artifact cũ đã bao phủ workspace tổng hợp cho Dashboard, POS, Sales/Returns, Catalog/CRM, Inventory/Purchasing, Finance/Shifts, Reporting/Admin/Ops và Auth/First-run. Tài liệu SRS/LLD vẫn có nhiều luồng chi tiết cần màn handoff riêng để code UI không suy diễn từ workspace tổng hợp.

## Artifact bổ sung

| Artifact | Bounded context | Lý do bổ sung |
| --- | --- | --- |
| `pos-cache-conflict-receipt-print.html` | Sales / POS | Chi tiết cache conflict, timeout, receipt và print/reprint. |
| `manual-order-fulfillment-detail.html` | Sales / Orders | Chi tiết lifecycle đơn nhập tay và fulfillment guard. |
| `return-inspection-refund-exchange.html` | Sales / Returns / Warranty | Chi tiết inspection, refund, exchange và warranty mapping. |
| `catalog-product-editor-policy-builder.html` | Catalog / CRM / Commercial | Chi tiết product editor, bundle, price/promotion/commission policy. |
| `inventory-stocktake-transfer-adjustment-workbench.html` | Inventory | Chi tiết transfer, stocktake, adjustment, scrap, negative cost và trace. |
| `purchasing-receipt-costing-supplier-return.html` | Purchasing | Chi tiết PO, GRN, landed cost, late invoice, supplier return/payment. |
| `finance-payment-allocation-reversal.html` | Finance | Chi tiết voucher, allocation, credit/prepayment, reversal và source drilldown. |
| `shift-close-reconciliation.html` | Finance / Shifts | Chi tiết close shift, variance, lock và after-lock adjustment. |
| `admin-access-config-lifecycle.html` | Administration / Access | Chi tiết user/role/scope, session revoke, tenant config, branch/warehouse lifecycle. |
| `operations-run-center.html` | Operations | Chi tiết import/export/attachment/backup/restore/archive/worker/quota. |
| `report-builder-drilldown.html` | Reporting | Chi tiết report builder, drilldown, sensitive export guard. |
| `auth-security-session-states.html` | Auth / Security | Chi tiết lockout, expired/idle session, reset, permission revoked, install warning. |

## Quality gates đã chạy

- Open Design generation/refine cho 12 artifact mới.
- Source QA: script parse, đủ hash routes, không native `<select>`, không gradient, không selector `.user span`, không còn chuỗi `Chọn tệp`.
- Render QA: Open Design export render cho từng batch; Chrome headless chạy ứng dụng local cho POS conflict desktop và Operations mobile. Operations mobile đã được refine riêng cho dropzone và responsive header.
