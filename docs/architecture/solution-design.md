# Solution Design — Ứng dụng quản lý bán hàng

**Trạng thái:** Đã phê duyệt kiến trúc nền  
**Nguồn yêu cầu:** [PRD](../product/PRD.md), [SRS overview](../product/srs/overview.md) và bộ SRS theo domain  
**Tài liệu liên quan:** [mô hình dữ liệu](../data-model/logical-data-model.md), [lưu trữ và partition](../data-model/storage-partitioning-and-lifecycle.md), [ADR](../decisions/README.md)

## 1. Mục tiêu và ràng buộc

Ứng dụng là phần mềm quản lý bán hàng bán một lần, triển khai độc lập cho từng khách trên Google Workspace của chính khách. Khách sở hữu Apps Script project, Spreadsheet, Drive folder, backup và trigger; ứng dụng không cần hosting hay cơ sở dữ liệu SaaS của nhà cung cấp.

Đối tượng ưu tiên là cửa hàng nhỏ, thường một Branch, một Warehouse và một thu ngân. Mô hình đa Branch–đa Warehouse vẫn là khả năng bắt buộc của dữ liệu và quyền. POS phải ưu tiên tốc độ cảm nhận; các tác vụ nặng không được cạnh tranh với luồng bán.

Ràng buộc kỹ thuật cố định:

- frontend React/TypeScript/Vite được bundle vào Apps Script `HtmlService`;
- backend là Google Apps Script; Google Sheets là data store nghiệp vụ; Drive là nơi chứa file;
- người dùng ứng dụng đăng nhập bằng `loginId`/mật khẩu nội bộ, không dùng Google account làm identity;
- không có offline write hoặc đồng bộ xung đột; mọi commit nghiệp vụ phải được server xác nhận;
- Google Sheets/Apps Script có quota, runtime và giới hạn dung lượng, nên dữ liệu phải partition và thao tác phải batch.

## 2. System context

```text
[Owner / nhân viên]
          |
          | Browser
          v
[React POS & quản trị trong HtmlService]
          |
          | typed adapter + google.script.run
          v
[Apps Script Web App - quyền tài khoản khách triển khai]
          |
          +-- Platform: auth, permission, config, data, runtime, audit,
          |             backup, Drive, API/error handling
          |
          +-- Domain: Catalog, Sales, Inventory, Purchasing, Finance,
          |           CRM & Promotion, Administration & Reporting
          |
          v
[Google Workspace của khách]
  |- Google Sheets theo storage role/partition
  |- Google Drive folder theo chức năng
  `- Apps Script Properties + installable trigger chung
```

Web App có URL public để nhân viên không cần Google account. Public URL không cấp dữ liệu hay quyền; mọi API nghiệp vụ yêu cầu session nội bộ còn hiệu lực và kiểm tra permission/scope ở backend.

## 3. Nguyên tắc kiến trúc

| Nguyên tắc | Quyết định áp dụng |
| --- | --- |
| Performance-first POS | Browser xử lý catalog đã đồng bộ, barcode, tìm hàng và giỏ; checkout là một command backend. Không đưa export, Drive/PDF, báo cáo lớn, backup hay quét ledger vào fast path. |
| Server-authoritative commit | Cache chỉ dùng cho read model. Server luôn xác nhận quyền, trạng thái, giá/promotion, tồn, tiền và công nợ trước khi commit. |
| Modular monolith | Một Apps Script deployment cho mỗi tenant; tách platform và domain rõ ràng thay vì microservice hoặc module gọi chéo repository. |
| Ledger bất biến | Tồn, tiền và công nợ truy vết qua ledger/chứng từ nguồn. Sai sót dùng hủy, điều chỉnh hoặc reversal; không sửa số tổng hợp làm nguồn sự thật. |
| Partition từ đầu | Không đặt toàn bộ dữ liệu vào một Spreadsheet. Transaction/Audit phân vùng theo kỳ và archive read-only. |
| Ownership của khách | Resource config, deployment, backup và upgrade thuộc tài khoản Google của khách; hỗ trợ bên ngoài chỉ theo quyền có thời hạn. |
| Quan sát được | API có request ID, duration/stage/I/O metrics; mọi quyết định mở rộng dựa trên telemetry và benchmark, không dựa vào giả định. |

## 4. Bounded context và ownership

| Context | Sở hữu | Giao tiếp đồng bộ trong command |
| --- | --- | --- |
| Platform | auth/session, permission scope, config, registry/migration, runtime, audit/outbox, Drive, backup/export/archive | Cung cấp capability dùng chung; không chứa quy tắc bán/kho/tiền. |
| Catalog | product, variant, barcode, unit, price list | Trả snapshot/product pricing cho Sales. |
| Sales | POS cart, Sale Order, return/exchange, trạng thái bán, receipt | Điều phối checkout; không tự ghi inventory/cash ledger. |
| Inventory | movement, balance, reservation, lot/serial, transfer, stocktake | Nhận lệnh issue/receive/adjust có nguồn chứng từ. |
| Finance | cash, receivable/payable, payment allocation, shift, expense | Nhận lệnh settlement/obligation/reversal. |
| Purchasing | supplier, PO, goods receipt, supplier return | Điều phối Inventory/Finance cho luồng mua. |
| CRM & Promotion | customer, point, voucher, promotion, warranty | Tính eligibility và ghi điều chỉnh point/voucher sau commit. |
| Administration & Reporting | tenant, Branch/Warehouse, user/role, dashboard/report, import/export | Không can thiệp trực tiếp ledger domain khác. |

Module chỉ giao tiếp qua application service/contract. `SalesCheckoutService` có thể điều phối Catalog, Inventory, Finance và CRM trong cùng một command; mỗi domain vẫn sở hữu validation và dòng ledger của mình. Không module nào tự gọi repository của module khác.

## 5. Luồng có độ ưu tiên cao: POS checkout

```text
Browser: catalog/read model cache
  -> scan, search, add cart, calculation cục bộ
  -> completeSale(commandId, idempotencyKey, cart snapshot)
Apps Script:
  -> auth + permission + input validation
  -> fresh read hẹp của dữ liệu cần xác nhận
  -> commit ngắn: idempotency, sale, inventory, finance, CRM,
     materialized balance, audit outbox
  -> receipt snapshot
Browser:
  -> render/in K80 hoặc A4 bằng receipt snapshot
```

Nếu giá, promotion hoặc tồn đã thay đổi sau khi browser đồng bộ, command trả chênh lệch có cấu trúc và không commit. POS yêu cầu người dùng xác nhận áp dụng lại kết quả mới; không đổi giá âm thầm và không gọi server sau từng lần quét barcode.

## 6. Truy vết yêu cầu trọng yếu

| Nhóm thiết kế | Yêu cầu nguồn |
| --- | --- |
| Tenant, Branch/Warehouse, technical ID, lock/idempotency, ledger, session, audit, backup/archive | `SRS-OVR-001` đến `SRS-OVR-011`, `SRS-OVR-019` đến `SRS-OVR-024` |
| Capacity và POS performance | `SRS-OVR-012` đến `SRS-OVR-018`, `SRS-OVR-020` đến `SRS-OVR-022` |
| Checkout, snapshot, return, in phiếu | `SRS-SAL-*`, `SRS-INV-*`, `SRS-FIN-*`, `SRS-CRM-*` |
| Access, import/export, attachment, reporting, health | `SRS-ACC-*` |

Mã `SRS-OVR-020` đến `SRS-OVR-024` được bổ sung cùng Solution Design này. Tài liệu kiến trúc không thay thế SRS: mọi hành vi nhìn thấy được hoặc tiêu chí nghiệm thu vẫn thuộc SRS.

## 7. Tài liệu chuyên sâu

- [Kiến trúc ứng dụng](application-architecture.md)
- [Runtime và hiệu năng](runtime-and-performance.md)
- [Bảo mật và truy cập](security-and-access.md)
- [Triển khai và vòng đời](deployment-and-lifecycle.md)
- [Detailed Design — nền tảng triển khai](detailed-design.md)
- [Platform technical design](platform-technical-design.md)
- [Logical data model](../data-model/logical-data-model.md)
- [Sheet schema and registry](../data-model/sheet-schema-and-registry.md)
- [Storage partitioning và lifecycle](../data-model/storage-partitioning-and-lifecycle.md)
- [ADR index](../decisions/README.md)

## 8. Pattern Cenio được tham chiếu

Thiết kế này tham chiếu Cenio ở các pattern: layered architecture, `TableRegistry`/header mapping/migration, API boundary, batch I/O/runtime governance, cache-aside, Drive metadata, fake Apps Script test harness và ADR discipline. Không sao chép implementation/policy Cenio nguyên trạng: Sales dùng public Web App + internal session đã chốt; không dùng Google email identity, không coi compensating unit of work là ACID, không để business audit tắt mặc định và không dùng restore overwrite production. Chi tiết rà soát gốc nằm tại [báo cáo Cenio](../../tmp/cenio-solution-system-design-review.md).
