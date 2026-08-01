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

## Quy tắc sử dụng registry

- Chỉ implement UI từ artifact có trạng thái `Approved`.
- Nếu artifact trên Open Design đã đổi nhưng registry chưa cập nhật, dừng lại và yêu cầu cập nhật handoff trước khi code.
- Nếu task yêu cầu màn hình chưa có trong registry, tạo hoặc cập nhật design/handoff trước khi implement UI.
- Khi đổi tên artifact, đổi project hoặc đổi trạng thái duyệt, cập nhật registry trong cùng thay đổi.
- Trước khi code, dùng `Open Design project` + `Artifact chính` để lấy artifact hiện hành qua Open Design; sau đó mở `Local preview` để đối chiếu trực quan. Không code UI chỉ từ screenshot.
- `Local preview` dùng `127.0.0.1`, nên chỉ hoạt động trên máy đang chạy dịch vụ Open Design. Nếu link không mở được do dịch vụ hoặc port thay đổi, dùng định danh chuẩn để lấy lại artifact qua Open Design; không coi link hỏng là design bị mất và không cập nhật registry chỉ vì port local thay đổi.
