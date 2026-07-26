# Thiết kế nền tảng kỹ thuật deployable

**Ngày:** 2026-07-26  
**Trạng thái:** Đã triển khai và kiểm chứng local  
**Nguồn:** `AGENTS.md`, [Folder structure](../../architecture/folder-structure.md), [Platform technical design](../../architecture/platform-technical-design.md), [ADR 0002](../../decisions/0002-htmlservice-modular-monolith.md), [ADR 0009](../../decisions/0009-single-rpc-api-gateway.md)

## Mục tiêu

Thiết lập nền tảng có thể build và triển khai cho React/Vite trong Google Apps Script `HtmlService`, đồng thời giữ ranh giới frontend, backend và hợp đồng dùng chung. Kết quả phải tạo được một artifact Apps Script tự đủ ở thư mục `dist/` tại gốc repository, sẵn sàng cho `clasp push` từ cấu hình cục bộ không được theo dõi.

## Phạm vi

- Dùng một `package.json` gốc và npm cho dependency, script và lockfile.
- Biên dịch frontend React/TypeScript/Vite/Tailwind thành HTML tự chứa, gồm JavaScript và CSS inline, để không phụ thuộc static asset URL bên ngoài khi chạy qua `HtmlService`.
- Bundle Apps Script TypeScript và mã TypeScript thuần trong `shared/` bằng esbuild thành JavaScript tương thích V8 Apps Script.
- Đóng gói frontend HTML, backend bundle và bản sao `appsscript.json` vào `dist/` ở gốc repository.
- Tạo `doGet` chỉ phục vụ HtmlService và `invoke` là public business boundary duy nhất. Chưa đăng ký operation nghiệp vụ; lời gọi operation không được phép trả `ApiResult` lỗi đã sanitize.
- Cung cấp API envelope/result/error contract và frontend adapter bọc `google.script.run`; không có feature component gọi Apps Script trực tiếp.
- Thiết lập typecheck, lint, unit test, build verification và kiểm tra artifact.
- Cập nhật tài liệu cấu trúc, README và cấu hình kiểm tra repository khi thay đổi bản đồ repository.

## Ngoài phạm vi

- UI nghiệp vụ, router, component theo Cenio Core, dữ liệu mẫu hoặc màn hình chưa được handoff phê duyệt.
- Đăng nhập nội bộ, session, permission, TableRegistry, migration, Google Sheets/Drive, command coordinator, worker hoặc telemetry hoàn chỉnh. Đây là Platform vertical slice kế tiếp.
- Tạo Apps Script thật, test tenant, `scriptId` mới hoặc deploy lên Google Workspace.
- Thêm endpoint nghiệp vụ, schema Sheet hay domain service.

## Kiến trúc và luồng build

```text
web/ + shared/             apps-script/src/ + shared/
        |                              |
        | Vite, single-file build      | esbuild bundle
        v                              v
  HTML/CSS/JS tự chứa             Apps Script JavaScript globals
        \                              /
         \                            /
          +-- copy appsscript.json --+
                         |
                         v
                    /dist (root)
              |- index.html
              |- code.js
              `- appsscript.json
                         |
                         v
              clasp push (cấu hình cục bộ)
```

Vite chỉ đọc code trong `web/` và import TypeScript thuần từ `shared/` qua alias. esbuild chỉ đọc code trong `apps-script/src/` và import TypeScript thuần từ `shared/`; không bundle React hoặc Browser API vào backend. Cả hai build đều xóa và tái tạo `dist/` một lần trong script điều phối để artifact không còn file cũ.

`doGet` dùng `HtmlService.createHtmlOutputFromFile('index')`. Build bắt buộc sinh `index.html` trực tiếp trong `dist/`; Vite không được để lại tham chiếu tới `/assets/*`, module script URL hay stylesheet URL bên ngoài. `invoke(request)` là global Apps Script duy nhất cho business API; helper không được public.

## Ranh giới mã nguồn

| Vị trí | Trách nhiệm trong nền tảng |
| --- | --- |
| `web/src/app/` | Bootstrap React tối thiểu, không chứa màn hình nghiệp vụ. |
| `web/src/lib/api/` | Promise wrapper cho `google.script.run`, typed API client và chuẩn hóa lỗi transport. |
| `apps-script/src/api/` | `doGet`, `invoke`, validate envelope và map lỗi API. |
| `apps-script/src/bootstrap/` | Tạo composition tối thiểu cho API registry rỗng. |
| `shared/contracts/` | `ApiRequest`, `ApiResult`, `ApiMeta` và error DTO. |
| `shared/schemas/` | Schema envelope và error shape dùng chung. |
| `scripts/` | Điều phối build, kiểm tra artifact và utility không thuộc runtime ứng dụng. |
| `dist/` | Artifact build sinh tự động, không được theo dõi và không chứa source/secret. |

Không thêm `web/src/features/` hay domain service trong slice này. `shared/` vẫn không import React, Browser API hay Apps Script API.

## Công cụ và lệnh chuẩn

- Node.js 22 LTS và npm được yêu cầu qua `package.json`.
- Vite build frontend; plugin single-file được phép dùng duy nhất để inline artifact HtmlService.
- esbuild bundle backend ở định dạng không còn `import`/`export` runtime.
- TypeScript 5.9.3 kiểm tra độc lập web, Apps Script và shared qua project config phù hợp; phiên bản này nằm trong peer range chính thức của `typescript-eslint`. Web typecheck giới hạn explicit types `node`, `react`, `react-dom` để không nạp Apps Script global; Apps Script typecheck dùng `skipLibCheck` vì declaration của Apps Script khai báo global `MimeType` không tương thích declaration DOM trong dependency graph; source vẫn được kiểm tra strict.
- ESLint kiểm tra TypeScript source; Vitest chạy unit test cho contract, API mapping và frontend transport adapter với fake `google.script.run`.
- `npm run verify` chạy structure check, typecheck, lint, test, build và artifact verification theo thứ tự.
- `npm run deploy:push` chỉ chạy sau `npm run verify`, dùng `clasp` trong thư mục gốc với `rootDir` trỏ tới `./dist`. Lệnh phải dừng với hướng dẫn an toàn nếu thiếu cấu hình cục bộ.

## Hành vi API tối thiểu

- `doGet` không tạo config runtime và không trả dữ liệu nghiệp vụ.
- `invoke` nhận request theo envelope đã định nghĩa, tạo request ID an toàn khi thiếu, và luôn trả `ApiResult` có `meta`.
- Vì chưa có operation registry, bất kỳ operation nào cũng trả lỗi `OPERATION_NOT_SUPPORTED`; không trả stack trace, token, Apps Script resource ID hoặc raw error.
- Frontend adapter chỉ gọi global `invoke`, chuyển successful `ApiResult` về typed data và giữ nguyên API error có cấu trúc; transport failure được chuẩn hóa thành lỗi runtime an toàn.
- Runtime shell không render UI nghiệp vụ hay copy giả lập sản phẩm; chỉ tạo React mount point để chứng minh bundle chạy.

## Bảo mật và vận hành

- `.clasp.json` ở root là cấu hình cục bộ có thể chứa `scriptId`, bắt buộc bị Git ignore và không được đọc/ghi bởi source, test hoặc build. `.env*`, `dist/`, dependency và coverage tiếp tục bị Git ignore.
- Bản mẫu clasp được đổi từ `apps-script/.clasp.json.example` sang mẫu root `.clasp.json.example` có đúng một `rootDir: "./dist"`, vì `clasp` chạy từ repository root và artifact ở `dist/`.
- Không có deploy tự động hay remote API call trong build/test. Việc tạo Apps Script, thêm `scriptId` vào `.clasp.json` cục bộ và chạy `clasp push` thuộc người triển khai/test tenant.

## Quality gate

1. `node scripts/verify-structure.mjs` chấp nhận cấu trúc mới, xác nhận `.gitignore` loại trừ root `.clasp.json`, và không đọc hoặc từ chối cấu hình clasp cục bộ đang tồn tại.
2. `npm run typecheck`, `npm run lint` và `npm test` đều thành công.
3. `npm run build` tạo chính xác `dist/index.html`, `dist/code.js` và `dist/appsscript.json`.
4. Artifact verification xác nhận HTML không tham chiếu asset URL bên ngoài, backend bundle không còn `import`/`export` runtime, manifest có V8/Asia-Ho_Chi_Minh và artifact không chứa secret/config clasp.
5. Unit test chứng minh API envelope lỗi không lộ implementation detail, unknown operation trả lỗi chuẩn, và adapter frontend gọi đúng `invoke`.
6. `npm run deploy:push` không push khi thiếu `.clasp.json` cục bộ; hướng dẫn tạo cấu hình an toàn được ghi trong README.

## Tác động tài liệu

`docs/architecture/folder-structure.md`, `README.md`, `.gitignore` và `scripts/verify-structure.mjs` sẽ được cập nhật để `dist/` root và root-level tooling là thành phần có chủ đích của repository. Không thay đổi ADR, SRS, state machine, data dictionary hay design handoff.
