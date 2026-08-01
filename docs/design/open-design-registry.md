# Open Design Registry

Registry này ánh xạ màn hình trong sản phẩm với project/artifact trên Open Design và trạng thái duyệt. AI Agent phải đọc registry này trước khi code UI.

`Open Design project` và `Artifact chính` là định danh chuẩn, ổn định của thiết kế. `Local preview` chỉ là đường mở nhanh trên chính máy đang chạy Open Design; không thay thế định danh chuẩn và không phải nguồn duy nhất để code.

## Design System

| Tên | Project | Phiên bản | Local preview | Ghi chú |
| --- | --- | --- | --- | --- |
| Cenio Core | `brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209` | v0.7 | [Mở DESIGN.md](http://127.0.0.1:50416/api/projects/brand-cenio-core-l-product-design-system-d-ng-chung-ch-7e9209/raw/DESIGN.md) | Nguồn chuẩn token light/dark, component catalog, AppShell và page pattern. |

## Screens

| Màn hình | Domain | Open Design project | Artifact chính | Local preview | Handoff repo | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| Auth và First-run setup | Platform / Auth / Install | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `auth-first-run.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/auth-first-run.html) | `docs/design/screens/auth-first-run.md` | `Approved` |
| Sales Dashboard | Reporting / Operations | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `app-shell-dashboard.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/app-shell-dashboard.html) | `docs/design/screens/sales-dashboard.md` | `Approved` |
| POS tại quầy — Checkout | Sales / POS | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `app-pos-checkout.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/app-pos-checkout.html) | `docs/design/screens/pos-checkout.md` | `Approved` |
| Đơn bán, đơn nhập tay, trả/đổi và bảo hành | Sales / POS / Returns | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `sales-orders-returns.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/sales-orders-returns.html) | `docs/design/screens/sales-orders-returns.md` | `Approved` |
| Catalog, khách hàng và commercial policy | Catalog / CRM | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `catalog-crm-commercial.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/catalog-crm-commercial.html) | `docs/design/screens/catalog-crm-commercial.md` | `Approved` |
| Tồn kho và mua hàng | Inventory / Purchasing | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `inventory-purchasing.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/inventory-purchasing.html) | `docs/design/screens/inventory-purchasing.md` | `Approved` |
| Tài chính và ca bán | Finance / Shifts | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `finance-shifts.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/finance-shifts.html) | `docs/design/screens/finance-shifts.md` | `Approved` |
| Báo cáo, quản trị và vận hành | Reporting / Administration / Operations | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `reporting-administration-operations.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/reporting-administration-operations.html) | `docs/design/screens/reporting-administration-operations.md` | `Approved` |
| POS cache, conflict, receipt và print | Sales / POS | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `pos-cache-conflict-receipt-print.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/pos-cache-conflict-receipt-print.html) | `docs/design/screens/pos-cache-conflict-receipt-print.md` | `Approved` |
| Manual order fulfillment detail | Sales / Orders | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `manual-order-fulfillment-detail.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/manual-order-fulfillment-detail.html) | `docs/design/screens/manual-order-fulfillment-detail.md` | `Approved` |
| Return inspection, refund và exchange | Sales / Returns / Warranty | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `return-inspection-refund-exchange.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/return-inspection-refund-exchange.html) | `docs/design/screens/return-inspection-refund-exchange.md` | `Approved` |
| Catalog product editor và policy builder | Catalog / CRM / Commercial | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `catalog-product-editor-policy-builder.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/catalog-product-editor-policy-builder.html) | `docs/design/screens/catalog-product-editor-policy-builder.md` | `Approved` |
| Inventory stocktake, transfer và adjustment workbench | Inventory | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `inventory-stocktake-transfer-adjustment-workbench.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/inventory-stocktake-transfer-adjustment-workbench.html) | `docs/design/screens/inventory-stocktake-transfer-adjustment-workbench.md` | `Approved` |
| Purchasing receipt, costing và supplier return | Purchasing | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `purchasing-receipt-costing-supplier-return.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/purchasing-receipt-costing-supplier-return.html) | `docs/design/screens/purchasing-receipt-costing-supplier-return.md` | `Approved` |
| Finance payment allocation và reversal | Finance | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `finance-payment-allocation-reversal.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/finance-payment-allocation-reversal.html) | `docs/design/screens/finance-payment-allocation-reversal.md` | `Approved` |
| Shift close reconciliation | Finance / Shifts | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `shift-close-reconciliation.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/shift-close-reconciliation.html) | `docs/design/screens/shift-close-reconciliation.md` | `Approved` |
| Admin access, config và lifecycle | Administration / Access | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `admin-access-config-lifecycle.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/admin-access-config-lifecycle.html) | `docs/design/screens/admin-access-config-lifecycle.md` | `Approved` |
| Operations run center | Operations | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `operations-run-center.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/operations-run-center.html) | `docs/design/screens/operations-run-center.md` | `Approved` |
| Report builder và drilldown | Reporting | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `report-builder-drilldown.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/report-builder-drilldown.html) | `docs/design/screens/report-builder-drilldown.md` | `Approved` |
| Auth security và session states | Platform / Auth / Security | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` | `auth-security-session-states.html` | [Mở local](http://127.0.0.1:50416/api/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/raw/auth-security-session-states.html) | `docs/design/screens/auth-security-session-states.md` | `Approved` |

## Quy tắc sử dụng registry

- Chỉ implement UI từ artifact có trạng thái `Approved`.
- Nếu artifact trên Open Design đã đổi nhưng registry chưa cập nhật, dừng lại và yêu cầu cập nhật handoff trước khi code.
- Nếu task yêu cầu màn hình chưa có trong registry, tạo hoặc cập nhật design/handoff trước khi implement UI.
- Khi đổi tên artifact, đổi project, đổi trạng thái duyệt hoặc đổi local preview port, cập nhật registry trong cùng thay đổi.
- Khi local preview port đổi sau khi Open Design khởi động lại, cập nhật registry trong cùng thay đổi bàn giao để link mở nhanh không bị stale. Việc đổi port không làm thay đổi source of truth; `Open Design project` + `Artifact chính` vẫn là định danh chuẩn.
- Trước khi code, dùng `Open Design project` + `Artifact chính` để lấy artifact hiện hành qua Open Design; sau đó mở `Local preview` để đối chiếu trực quan. Không code UI chỉ từ screenshot.
- `Local preview` dùng `127.0.0.1`, nên chỉ hoạt động trên máy đang chạy dịch vụ Open Design. Nếu link không mở được do dịch vụ hoặc port thay đổi, dùng định danh chuẩn để lấy lại artifact qua Open Design; không coi link hỏng là design bị mất.
