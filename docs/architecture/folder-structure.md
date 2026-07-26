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
    repositories/    # Đọc/ghi dữ liệu qua các adapter
    services/        # Nghiệp vụ và điều phối use case
  appsscript.json
web/
  public/            # Tài nguyên tĩnh
  src/
    app/             # Composition root, router, provider và layout khung
    components/      # Component UI tái sử dụng toàn ứng dụng
    features/        # Mã riêng của từng tính năng
    hooks/           # Hook frontend dùng chung
    lib/             # Tiện ích, cấu hình và API client dùng chung
    styles/          # Style và token toàn cục
shared/
  constants/         # Hằng số dùng chung
  contracts/         # DTO request/response và hợp đồng giao tiếp
  schemas/           # Schema validation dùng chung
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
dist/                # Artifact build Apps Script ở root; không phải source và không theo dõi Git
tmp/                 # Tài liệu rà soát tạm thời; không phải nguồn quyết định chính thức
```

## Quy tắc đặt file

| Vị trí | Đặt ở đây | Không đặt ở đây |
| --- | --- | --- |
| `web/src/app/` | Router, provider, layout khung và khởi tạo ứng dụng | UI hoặc nghiệp vụ chỉ thuộc một tính năng |
| `web/src/features/<feature>/` | Page, component, hook, state, gọi API và type chỉ phục vụ `<feature>` | Component hoặc tiện ích dùng cho nhiều tính năng |
| `web/src/components/` | Component dùng lại giữa nhiều feature; component shadcn/ui khi được khởi tạo | Logic nghiệp vụ hoặc truy cập dữ liệu theo feature |
| `web/src/hooks/` | Hook frontend dùng chung | Hook chỉ dùng trong một feature |
| `web/src/lib/` | API transport dùng chung, utility và cấu hình frontend | API adapter hay state chỉ của một feature |
| `web/src/styles/` | CSS, token và style toàn cục | Style chỉ của một feature |
| `apps-script/src/api/` | Hàm public, endpoint và trigger nhận input rồi gọi service | Nghiệp vụ, truy cập Sheet/Drive trực tiếp |
| `apps-script/src/services/` | Use case, validation nghiệp vụ và điều phối repository | Chi tiết `SpreadsheetApp`, `DriveApp` hoặc giao thức frontend |
| `apps-script/src/repositories/` | Đọc/ghi và ánh xạ dữ liệu nghiệp vụ qua các adapter hạ tầng | Quy tắc nghiệp vụ hoặc UI |
| `apps-script/src/infrastructure/` | Wrapper/adapters cho Sheets, Drive, Properties, logging, lock và cấu hình runtime | Quyết định nghiệp vụ theo use case |
| `apps-script/src/bootstrap/` | Khởi tạo dependency và wiring ứng dụng | Mã nghiệp vụ hoặc UI |
| `shared/` | Type, DTO, schema và hằng số được cả hai phía dùng | Code cần React, `window`, `SpreadsheetApp` hoặc `DriveApp` |
| `.agents/skills/` | Workflow, reference và asset cho Codex tái sử dụng trong repository | Mã nguồn ứng dụng, secret hoặc tài liệu sản phẩm |
| `docs/architecture/modules/` | LLD theo domain: use case, state machine, contract, orchestration và test scenario | Logical/physical schema dùng chung không thuộc riêng một domain |
| `docs/data-model/tables/` | Data dictionary vật lý theo nhóm domain, tuân theo registry/migration | Nghiệp vụ, UI hoặc Sheets formula xử lý logic |
| `docs/design/` | Design System reference, Open Design registry, rule triển khai UI và handoff các màn hình đã duyệt | Requirement nghiệp vụ gốc, schema dữ liệu hoặc source code UI |
| `docs/design/screens/` | Handoff UI theo từng màn hình: artifact Open Design, trạng thái duyệt, nội dung bắt buộc, rule và acceptance checklist | Prototype HTML xuất từ Open Design, mã React/Tailwind hoặc tài liệu nháp chưa duyệt |
| `docs/product/` | PRD, yêu cầu sản phẩm, phạm vi, quy tắc nghiệp vụ và tiêu chí nghiệm thu | Chi tiết thiết kế kỹ thuật hoặc schema Google Sheets |
| `docs/product/srs/` | Bộ SRS mô-đun; `overview.md` là nguồn quy tắc chung, các tệp còn lại đặc tả theo miền và dẫn chiếu bằng mã yêu cầu | Schema Sheet chi tiết, API contract, wireframe hoặc kiến trúc mã nguồn |
| `docs/` | Tài liệu tiếng Việt về kiến trúc, dữ liệu, quyết định và tính năng | Cấu hình runtime hoặc secret |
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
