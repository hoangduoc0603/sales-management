# Cấu trúc thư mục nền Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo skeleton monorepo an toàn cho frontend React/Vite, backend Google Apps Script và các hợp đồng TypeScript dùng chung.

**Architecture:** Repository tách thành `web/`, `apps-script/` và `shared/`; các lớp backend được chia theo API, service, repository và infrastructure. Tài liệu và script kiểm tra ở cấp repository giúp skeleton có thể xác minh mà chưa cần cài dependency.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Google Apps Script, Google Sheets, Google Drive, Node.js, clasp.

## Global Constraints

- Tài liệu và nội dung hướng dẫn phải viết bằng tiếng Việt.
- Không lưu secret trong source code hoặc Google Sheets.
- Frontend, nghiệp vụ và truy cập dữ liệu phải có ranh giới rõ ràng.
- Không cài package, không tạo tính năng hay mô hình dữ liệu khi tạo skeleton.
- `.clasp.json` thật không được tạo hoặc theo dõi; chỉ có `.clasp.json.example` không chứa `scriptId`.
- Repository chưa được khởi tạo Git, nên không có bước commit trong kế hoạch này.

---

## File structure

- Create: `README.md` — bản đồ repository và quy ước ranh giới.
- Create: `.gitignore` — loại trừ dependency, artefact build, cấu hình clasp thật và file môi trường.
- Create: `apps-script/appsscript.json` — manifest Apps Script V8 không chứa secret.
- Create: `apps-script/.clasp.json.example` — mẫu cấu hình triển khai không có `scriptId`.
- Create: `apps-script/src/{api,services,repositories,infrastructure,bootstrap}/.gitkeep` — ranh giới backend.
- Create: `web/src/{app,features,components,hooks,lib,styles}/.gitkeep` và `web/public/.gitkeep` — ranh giới frontend.
- Create: `shared/{contracts,schemas,types,constants}/.gitkeep` — ranh giới hợp đồng dùng chung.
- Create: `docs/{architecture,data-model,decisions}/README.md` — điểm vào cho tài liệu.
- Create: `scripts/verify-structure.mjs` — kiểm tra các đường dẫn, manifest và sự vắng mặt của secret clasp.
- Create: `tests/.gitkeep` — vị trí dành cho kiểm thử khi có mã nguồn.

### Task 1: Tạo skeleton monorepo và công cụ xác minh

**Files:**
- Create: toàn bộ file và thư mục liệt kê tại phần *File structure*.

**Interfaces:**
- Consumes: Không có mã nguồn hoặc dependency trước đó.
- Produces: `node scripts/verify-structure.mjs`, trả mã thoát `0` khi skeleton đầy đủ và an toàn.

- [ ] **Step 1: Tạo kiểm tra cấu trúc trước để định nghĩa điều kiện hoàn thành**

Tạo `scripts/verify-structure.mjs` dùng `node:fs`, `node:path` và `node:process`. Script phải kiểm tra mọi đường dẫn trong phần *File structure*, parse `apps-script/appsscript.json`, xác nhận `runtimeVersion` là `V8`, xác nhận không tồn tại `apps-script/.clasp.json`, và in `Cấu trúc thư mục base hợp lệ.` khi thành công.

- [ ] **Step 2: Chạy kiểm tra để xác nhận skeleton chưa tồn tại**

Run: `node scripts/verify-structure.mjs`  
Expected: Thất bại vì các file và thư mục bắt buộc chưa tồn tại.

- [ ] **Step 3: Tạo các thư mục, cấu hình an toàn và tài liệu nền**

Tạo chính xác cấu trúc liệt kê ở phần *File structure*. Manifest Apps Script phải là JSON hợp lệ với `timeZone: "Asia/Ho_Chi_Minh"`, `runtimeVersion: "V8"`, `exceptionLogging: "STACKDRIVER"`; mẫu clasp chỉ chứa `{ "rootDir": "./dist" }`.

- [ ] **Step 4: Chạy kiểm tra cấu trúc**

Run: `node scripts/verify-structure.mjs`  
Expected: In `Cấu trúc thư mục base hợp lệ.` và kết thúc với mã `0`.

- [ ] **Step 5: Kiểm tra phạm vi thay đổi**

Run: `find apps-script web shared docs scripts tests -type f | sort`  
Expected: Chỉ hiển thị skeleton, tài liệu và script xác minh; không có mã tính năng, dependency hay `.clasp.json` thật.
