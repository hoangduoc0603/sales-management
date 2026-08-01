# Cấu trúc thư mục

Tài liệu này là nguồn chuẩn để quyết định vị trí tệp, thư mục và trách nhiệm của từng vùng trong repository. `AGENTS.md` bắt buộc mọi thay đổi mã nguồn tham chiếu tài liệu này trước khi thực hiện.

## Nguyên tắc

- Đặt mã ở vùng hẹp nhất có đúng trách nhiệm; không tạo thư mục mới chỉ để né ranh giới hiện có.
- `web/` không truy cập trực tiếp Google Sheets hoặc Google Drive.
- `apps-script/` là lớp duy nhất tích hợp Google Workspace.
- `shared/` là TypeScript thuần: không phụ thuộc React, Browser API hoặc Apps Script API.
- Chiều phụ thuộc backend là `api → services → repositories → infrastructure`; không phụ thuộc ngược chiều.

## Bản đồ repository

```text
package.json         # Dependency, script build/test/lint và yêu cầu Node.js
tsconfig*.json       # Typecheck tách browser và Apps Script
vite.config.ts       # Build React/Tailwind thành HTML tự chứa trong dist/
vitest.config.ts     # Cấu hình kiểm thử TypeScript
eslint.config.mjs    # Cấu hình lint TypeScript
.clasp.json.example  # Mẫu cấu hình clasp rootDir ./dist; không chứa scriptId
.agents/
  skills/            # Skill Codex chỉ áp dụng trong repository này, gồm workflow Product Discovery, Solution/System Design và Detailed/Low-Level Design
apps-script/
  src/
    api/             # Điểm vào Apps Script gọi service
    bootstrap/       # Khởi tạo và ghép các thành phần ứng dụng
    infrastructure/  # Adapter Google Workspace và hạ tầng kỹ thuật
      google-workspace/ # SheetGateway, DriveGateway, RuntimeConfigStore và Apps Script Lock provider production seam
    repositories/    # Đọc/ghi dữ liệu qua các adapter
      platform/      # Repository nền tảng và repository primitive dùng chung qua SheetGateway
      catalog/       # Repository danh mục, variant, barcode, unit và chính sách thương mại
      crm/           # Repository khách hàng, nhóm khách và duplicate lookup
      finance/       # Repository Payment, CashTransaction, Allocation, Shift và công nợ
      inventory/     # Repository InventoryMovement append-only và InventoryBalance projection
      sales/         # Repository SaleOrder, SaleOrderLine, SaleTenderDraft và ReceiptSnapshot
      reporting/     # Repository DashboardProjection, report rows và ExportRun
    services/        # Nghiệp vụ và điều phối use case
      platform/      # Platform core: auth, authorization, bootstrap, command, registry
        runtime/     # Runtime warm-up, health-light và policy giữ fast path sẵn sàng
        worker/      # Background runner chung cho job có lease, checkpoint và retry budget
      administration/ # Use case quản trị tenant/branch/warehouse tối thiểu
      catalog/       # Use case catalog, POS projection và pricing/quote
      crm/           # Use case khách hàng, duplicate policy và quick lookup
      finance/       # Use case payment, allocation, công nợ, ca bán và chi phí
      inventory/     # Use case tồn kho, movement, balance, reservation và return restock
      sales/         # Use case POS draft, checkout command, receipt snapshot và điều phối Sales -> Inventory -> Finance
      reporting/     # Use case dashboard/report/export, metadata coverage và sensitive-field filtering
  appsscript.json
web/
  public/            # Tài nguyên tĩnh
  src/
    app/             # Composition root, router, provider và layout khung
      app-shell/     # AppShell, topbar/sidebar, scope selector và navigation khung
      auth/          # Auth gate, login/change-password flow và session storage frontend
      install/       # First-run setup UI trước auth để khách tự khởi tạo dữ liệu trên Google account của họ
      theme/         # Theme light/dark utilities và bridge với browser
    components/      # Component UI tái sử dụng toàn ứng dụng
      ui/            # Primitive UI dùng chung theo Cenio Core
    features/        # Mã riêng của từng tính năng
      dashboard/     # Dashboard vận hành và các thành phần riêng màn tổng quan
      catalog/       # UI shell Catalog, CRM và commercial policy
      finance/       # UI shell Finance/Shifts, sổ quỹ, công nợ, ca và chi phí
      inventory/     # UI shell Inventory/Purchasing, stock card và state tồn kho
      sales/          # UI shell Đơn bán, đơn nhập tay, trả/đổi hàng và bảo hành
      reporting/      # UI shell Báo cáo, quản trị và vận hành theo handoff Approved
      pos/           # POS checkout shell, giỏ hàng và UI bán hàng tại quầy
        catalog-cache/ # Browser-local POS catalog projection, barcode index và search helper
    hooks/           # Hook frontend dùng chung
    lib/             # Tiện ích, cấu hình và API client dùng chung
    styles/          # Style và token toàn cục
shared/
  constants/         # Hằng số dùng chung
  contracts/         # DTO request/response và hợp đồng giao tiếp
    catalog/         # Contract Catalog/POS projection/quote
    crm/             # Contract Customer/CRM quick lookup
    finance/         # Contract Payment, CashTransaction, Allocation, Obligation và Shift
    inventory/       # Contract InventoryMovement, InventoryBalance và command tồn kho
    sales/           # Contract SaleOrder, POS draft, checkout command, conflict và receipt snapshot
    reporting/       # Contract DashboardProjection, report query envelope và ExportRun
  schemas/           # Schema validation dùng chung
    catalog/         # Parser request Catalog/POS/quote
    crm/             # Parser request CRM/customer
    finance/         # Parser request shift/payment/reversal/expense
    inventory/       # Parser request receive/issue/reserve/release/return và balance query
    sales/           # Parser request POS draft, draft list/cancel và checkout complete
    reporting/       # Parser request dashboard/report/export
  types/             # Kiểu miền nghiệp vụ dùng chung
docs/
  architecture/      # Kiến trúc, LLD nền tảng và ranh giới hệ thống
    modules/         # LLD theo bounded context
  data-model/        # Mô hình Google Sheets, registry và dữ liệu
    tables/          # Data dictionary/schema vật lý theo domain
  decisions/         # Quyết định kỹ thuật có lý do
  design/            # Design System, Open Design registry, UI implementation rules và handoff màn hình đã duyệt
    screens/         # Handoff UI theo từng màn hình
  product/           # Yêu cầu sản phẩm, phạm vi và quy tắc nghiệp vụ
    srs/             # Đặc tả yêu cầu phần mềm theo từng miền nghiệp vụ
scripts/             # Script hỗ trợ và kiểm tra repository
tests/               # Kiểm thử dùng chung hoặc tích hợp
  performance/       # Benchmark regression có ngưỡng cho POS và các fast path release-critical
dist/                # Artifact build Apps Script ở root; không phải source và không theo dõi Git
tmp/                 # Tài liệu rà soát tạm thời; không phải nguồn quyết định chính thức
```

## Quy tắc đặt file

| Vị trí | Đặt ở đây | Không đặt ở đây |
| --- | --- | --- |
| `web/src/app/` | Router, provider, layout khung và khởi tạo ứng dụng | UI hoặc nghiệp vụ chỉ thuộc một tính năng |
| `web/src/app/app-shell/` | AppShell dùng chung: sidebar, topbar, theme toggle, scope selector và navigation shell | Nội dung riêng từng màn nghiệp vụ |
| `web/src/app/auth/` | Login/change-password gate, session token storage phía browser và orchestration auth frontend | Password verifier/backend auth service hoặc phân quyền domain |
| `web/src/app/install/` | First-run setup gate trước auth, form khởi tạo tenant/admin nội bộ và orchestration gọi `platform.install.*` | Bootstrap backend, Drive/Sheets provisioning thật hoặc UI nghiệp vụ sau đăng nhập |
| `web/src/app/theme/` | Tiện ích theme light/dark, đọc/ghi theme preference và apply `data-theme` | Token CSS hoặc style component |
| `web/src/features/<feature>/` | Page, component, hook, state, gọi API và type chỉ phục vụ `<feature>` | Component hoặc tiện ích dùng cho nhiều tính năng |
| `web/src/features/dashboard/` | Dashboard vận hành, route tổng quan và state riêng màn dashboard | AppShell dùng chung hoặc report service backend |
| `web/src/features/sales/` | UI shell Đơn bán, đơn nhập tay, trả/đổi hàng, bảo hành và state riêng màn chứng từ bán theo handoff Approved | POS cart local, checkout command backend, ledger Inventory/Finance hoặc AppShell dùng chung |
| `web/src/features/reporting/` | UI shell Báo cáo, quản trị và vận hành: report/export, user/role/scope, import, attachment, backup/restore, health/capacity theo handoff Approved | Dashboard vận hành riêng, reporting service backend, repository hoặc worker hạ tầng |
| `web/src/features/catalog/` | UI shell Catalog/CRM/Commercial, state và component chỉ phục vụ danh mục/khách hàng/chính sách thương mại | Pricing service backend, POS checkout state hoặc component dùng chung |
| `web/src/features/finance/` | UI shell Finance/Shifts, sổ quỹ, công nợ, ca thu ngân và chi phí theo handoff Approved | Finance service backend, ledger mutation hoặc repository |
| `web/src/features/inventory/` | UI shell Inventory/Purchasing, stock card, movement summary, transfer/stocktake/purchasing placeholder theo handoff Approved | Inventory service backend, ledger mutation hoặc repository |
| `web/src/features/pos/` | POS checkout shell, giỏ hàng, scan/search placeholder và state UI riêng bán hàng tại quầy | Checkout command backend, catalog/inventory/finance service hoặc AppShell dùng chung |
| `web/src/features/pos/catalog-cache/` | POS catalog projection loader, barcode index và search local trong browser cache | Source of truth catalog, inventory balance hoặc mutation checkout |
| `web/src/components/` | Component dùng lại giữa nhiều feature; component shadcn/ui khi được khởi tạo | Logic nghiệp vụ hoặc truy cập dữ liệu theo feature |
| `web/src/components/ui/` | Primitive UI dùng chung theo Cenio Core như Button, Listbox, Badge, Panel, Table, Tabs, Dialog, Toast, Skeleton, StateBlock | Component nghiệp vụ chỉ phục vụ một feature |
| `web/src/hooks/` | Hook frontend dùng chung | Hook chỉ dùng trong một feature |
| `web/src/lib/` | API transport dùng chung, utility và cấu hình frontend | API adapter hay state chỉ của một feature |
| `web/src/styles/` | CSS, token và style toàn cục | Style chỉ của một feature |
| `apps-script/src/api/` | Hàm public, endpoint và trigger nhận input rồi gọi service | Nghiệp vụ, truy cập Sheet/Drive trực tiếp |
| `apps-script/src/services/` | Use case, validation nghiệp vụ và điều phối repository | Chi tiết `SpreadsheetApp`, `DriveApp` hoặc giao thức frontend |
| `apps-script/src/services/platform/` | Use case nền tảng: auth/session, authorization, bootstrap tenant, command, registry và runtime policy | Luồng nghiệp vụ bán hàng, kho, mua hàng hoặc báo cáo theo domain |
| `apps-script/src/services/platform/runtime/` | Runtime warm-up/service nhẹ để giữ cache và Apps Script execution path sẵn sàng; không tạo session, ledger hoặc chạy worker nặng | Scheduled worker nghiệp vụ, backup/export/archive, login thật hoặc mutation domain |
| `apps-script/src/services/platform/worker/` | Background runner dùng chung cho scheduled job có lease, checkpoint, retry budget và sanitized error | Job nghiệp vụ cụ thể như backup/archive hoặc logic domain |
| `apps-script/src/services/administration/` | Use case quản trị tenant, chi nhánh, kho, scope và cấu hình vận hành | Auth/session core hoặc adapter Google Workspace |
| `apps-script/src/services/catalog/` | Use case Product/Variant/Barcode/Unit, POS projection và quote giá/khuyến mại | Repository mapping, frontend cache hoặc ledger tồn/tiền |
| `apps-script/src/services/crm/` | Use case khách hàng, duplicate warning, quick create/search và customer group lookup | UI customer workspace hoặc payment/receivable ledger |
| `apps-script/src/services/finance/` | Use case shift open/close/lock, payment/allocation, công nợ, credit, reversal và expense approval | Sheets adapter, React UI hoặc POS orchestration trực tiếp |
| `apps-script/src/services/inventory/` | Use case receive, issue, reserve, release, return quarantine/restock và balance summary | Sheets adapter, React UI hoặc pricing/customer logic |
| `apps-script/src/services/sales/` | Use case POS draft, checkout complete, receipt snapshot và điều phối Sales -> Catalog -> Inventory -> Finance | Repository mapping, React UI hoặc trực tiếp Google Workspace adapter |
| `apps-script/src/services/reporting/` | Use case DashboardProjection, report query envelope, metadata coverage, export run và sensitive-field filtering | Ledger nguồn nghiệp vụ, UI dashboard hoặc worker Drive export thật |
| `apps-script/src/repositories/` | Đọc/ghi và ánh xạ dữ liệu nghiệp vụ qua các adapter hạ tầng | Quy tắc nghiệp vụ hoặc UI |
| `apps-script/src/repositories/platform/` | Repository nền tảng như auth/command/registry/admin và primitive repository dùng chung qua `SheetGateway`; không gọi trực tiếp Apps Script API | Rule nghiệp vụ domain, hard-code spreadsheet/sheet/header/row number hoặc UI |
| `apps-script/src/repositories/catalog/` | Repository Catalog/Commercial qua adapter hạ tầng; hiện có in-memory seam cho test/local | Rule quote, permission hoặc UI |
| `apps-script/src/repositories/crm/` | Repository Customer/CustomerGroup và duplicate lookup qua adapter hạ tầng; hiện có in-memory seam | Rule gộp khách, công nợ hoặc UI |
| `apps-script/src/repositories/finance/` | Repository Payment, CashTransaction, Allocation, Obligation, Credit và Shift; hiện có in-memory seam cho test/local | Rule phân bổ, reversal, ca hoặc UI |
| `apps-script/src/repositories/inventory/` | Repository InventoryMovement append-only và InventoryBalance projection; hiện có in-memory seam cho test/local | Rule âm kho, giá vốn hoặc UI |
| `apps-script/src/repositories/sales/` | Repository SaleOrder, SaleOrderLine, SaleTenderDraft và ReceiptSnapshot; hiện có in-memory seam cho test/local | Checkout orchestration, inventory/finance ledger hoặc UI |
| `apps-script/src/repositories/reporting/` | Repository DashboardProjection, report rows/query result seam và ExportRun; hiện có in-memory seam cho test/local | Rule tính KPI từ ledger nguồn hoặc UI |
| `apps-script/src/infrastructure/` | Wrapper/adapters cho Sheets, Drive, Properties, logging, lock và cấu hình runtime | Quyết định nghiệp vụ theo use case |
| `apps-script/src/infrastructure/google-workspace/` | Production seam cho Google Sheets/Drive/Properties/Lock: `SheetGateway`, `DriveGateway`, `RuntimeConfigStore` và `AppsScriptLockProvider`; mọi Apps Script API thật phải đi qua đây hoặc adapter hạ tầng tương đương | Use case nghiệp vụ, repository in-memory, hard-code resource ID/header index/row number hoặc rule domain |
| `apps-script/src/bootstrap/` | Khởi tạo dependency và wiring ứng dụng | Mã nghiệp vụ hoặc UI |
| `shared/` | Type, DTO, schema và hằng số được cả hai phía dùng | Code cần React, `window`, `SpreadsheetApp` hoặc `DriveApp` |
| `shared/contracts/catalog/` | DTO request/response Catalog, POS projection và CommerceQuote | Service implementation, schema parser hoặc UI component |
| `shared/contracts/crm/` | DTO Customer, duplicate warning và quick lookup/search | CRM service implementation hoặc UI component |
| `shared/contracts/finance/` | DTO Payment, CashTransaction, Allocation, Obligation, CustomerCredit, Shift và request finance | Finance service implementation hoặc UI component |
| `shared/contracts/inventory/` | DTO InventoryMovement, InventoryBalance, receive/issue/reserve/release/return và summary query | Inventory service implementation hoặc UI component |
| `shared/contracts/sales/` | DTO SaleOrder, SaleOrderLine, SaleTenderDraft, POS draft, POS complete, conflict và receipt snapshot | Sales service implementation hoặc React component |
| `shared/contracts/reporting/` | DTO DashboardProjection, report query envelope, metadata coverage, restricted sensitive fields và ExportRun | Reporting service implementation hoặc React component |
| `shared/schemas/catalog/` | Zod parser cho request Catalog/POS/quote | Business service hoặc React component |
| `shared/schemas/crm/` | Zod parser cho request CRM/customer | Business service hoặc React component |
| `shared/schemas/finance/` | Zod parser cho request shift/payment/reversal/expense | Business service hoặc React component |
| `shared/schemas/inventory/` | Zod parser cho request tồn kho và balance summary | Business service hoặc React component |
| `shared/schemas/sales/` | Zod parser cho request POS draft, list/cancel draft và POS complete | Business service hoặc React component |
| `shared/schemas/reporting/` | Zod parser cho request dashboard/report/export | Business service hoặc React component |
| `.agents/skills/` | Workflow, reference và asset cho Codex tái sử dụng trong repository | Mã nguồn ứng dụng, secret hoặc tài liệu sản phẩm |
| `docs/architecture/modules/` | LLD theo domain: use case, state machine, contract, orchestration và test scenario | Logical/physical schema dùng chung không thuộc riêng một domain |
| `docs/data-model/tables/` | Data dictionary vật lý theo nhóm domain, tuân theo registry/migration | Nghiệp vụ, UI hoặc Sheets formula xử lý logic |
| `docs/design/` | Design System reference, Open Design registry, rule triển khai UI và handoff các màn hình đã duyệt | Requirement nghiệp vụ gốc, schema dữ liệu hoặc source code UI |
| `docs/design/screens/` | Handoff UI theo từng màn hình: artifact Open Design, trạng thái duyệt, nội dung bắt buộc, rule và acceptance checklist | Prototype HTML xuất từ Open Design, mã React/Tailwind hoặc tài liệu nháp chưa duyệt |
| `docs/product/` | PRD, yêu cầu sản phẩm, phạm vi, quy tắc nghiệp vụ và tiêu chí nghiệm thu | Chi tiết thiết kế kỹ thuật hoặc schema Google Sheets |
| `docs/product/srs/` | Bộ SRS mô-đun; `overview.md` là nguồn quy tắc chung, các tệp còn lại đặc tả theo miền và dẫn chiếu bằng mã yêu cầu | Schema Sheet chi tiết, API contract, wireframe hoặc kiến trúc mã nguồn |
| `docs/` | Tài liệu tiếng Việt về kiến trúc, dữ liệu, quyết định và tính năng | Cấu hình runtime hoặc secret |
| `tests/performance/` | Benchmark tự động có threshold rõ ràng, dùng dữ liệu seed đại diện để chặn regression hiệu năng release-critical | Benchmark phụ thuộc tài nguyên production thật, sleep/timeouts dài hoặc số đo không có assertion |
| `tmp/` | Báo cáo rà soát, bản nháp hoặc tài liệu làm việc tạm thời trước khi được chốt/move vào `docs/` | Nguồn chuẩn về kiến trúc, dữ liệu, sản phẩm hoặc quyết định |
| `dist/` | Artifact build tự sinh gồm HTML/CSS/JS inline, Apps Script bundle và manifest để clasp push | Source code, secret, `.clasp.json` hoặc asset cần chỉnh tay |

## Khi thêm tính năng hoặc luồng mới

1. Đọc tài liệu này và tài liệu tính năng liên quan trong `docs/` (nếu đã có).
2. Nếu có UI, đọc `docs/design/open-design-registry.md`, `docs/design/implementation-rules.md` và handoff tương ứng trong `docs/design/screens/` trước khi tạo/sửa file UI.
3. Đặt UI và state riêng vào `web/src/features/<feature>/`; chỉ trích xuất sang `components/`, `hooks/` hoặc `lib/` khi thật sự được dùng chung.
4. Đặt DTO, schema và type dùng bởi cả frontend và backend vào `shared/` theo đúng loại nội dung.
5. Đặt điểm vào Apps Script ở `api/`, use case ở `services/`, đọc/ghi dữ liệu ở `repositories/`, và chi tiết Google Workspace ở `infrastructure/`.
6. Không bắt buộc tạo đủ thư mục ở cả frontend lẫn backend: chỉ tạo phần cần cho luồng đang xây dựng.

## Khi thay đổi cấu trúc

Một thay đổi được xem là thay đổi cấu trúc khi thêm, xoá, di chuyển, đổi tên thư mục; hoặc đổi trách nhiệm của thư mục hiện có. Trong cùng thay đổi đó phải:

1. Cập nhật cây thư mục, bảng quy tắc và các ranh giới liên quan trong tài liệu này.
2. Cập nhật `README.md` nếu bản đồ repository tóm tắt không còn đúng.
3. Cập nhật `scripts/verify-structure.mjs` nếu thêm, xoá hoặc đổi tên thành phần skeleton bắt buộc.
4. Xoá mọi tham chiếu đường dẫn cũ khỏi tài liệu liên quan.
5. Chạy `node scripts/verify-structure.mjs`.

Nếu vị trí cho một loại mã chưa rõ, dừng trước khi tạo thư mục mới và xin làm rõ hoặc bổ sung quyết định trong `docs/decisions/`.
