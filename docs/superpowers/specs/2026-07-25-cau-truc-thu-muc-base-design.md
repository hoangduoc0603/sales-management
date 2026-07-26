# Thiết kế cấu trúc thư mục nền

**Ngày:** 2026-07-25  
**Trạng thái:** Đã được phê duyệt để triển khai

## Mục tiêu

Thiết lập một monorepo tối giản cho ứng dụng quản lý bán hàng trên Google Workspace. Cấu trúc phải giúp phát triển nhanh ở giai đoạn vibe coding, đồng thời giữ frontend, nghiệp vụ và truy cập Google Workspace tách biệt để có thể mở rộng an toàn.

## Bối cảnh và ràng buộc

- Frontend dùng React, TypeScript, Vite, Tailwind CSS và shadcn/ui.
- Backend dùng Google Apps Script; dữ liệu nằm trên Google Sheets và tệp đính kèm ở Google Drive.
- Không lưu secret trong source code hoặc Google Sheets.
- Tài liệu mặc định bằng tiếng Việt.
- Phạm vi hiện tại chỉ là skeleton tổng quan; không tạo tính năng, mô hình Sheet, dependency hay mã nghiệp vụ.

## Quyết định kiến trúc

Một repository chứa ba vùng mã nguồn độc lập:

1. `web/` chứa frontend React/Vite. Đây là nơi đặt giao diện, router, feature và API client.
2. `apps-script/` chứa backend Apps Script. API, service nghiệp vụ và repository Sheets/Drive tách thành từng lớp.
3. `shared/` là hợp đồng giao tiếp thuần TypeScript: DTO, schema validation, type miền nghiệp vụ và hằng số. Mã ở đây không được phụ thuộc API trình duyệt hay Apps Script.

`web/` không được gọi Sheets hoặc Drive trực tiếp. `apps-script/` là lớp duy nhất truy cập các dịch vụ Google. Cả hai phía chỉ trao đổi dữ liệu qua các hợp đồng trong `shared/`.

## Cấu trúc được tạo

```text
apps-script/
  src/{api,services,repositories,infrastructure,bootstrap}/
  appsscript.json
  .clasp.json.example
web/
  src/{app,features,components,hooks,lib,styles}/
  public/
shared/
  {contracts,schemas,types,constants}/
docs/
  architecture/
  data-model/
  decisions/
scripts/
tests/
```

Mỗi thư mục rỗng được giữ bằng `.gitkeep` và có mô tả tại chỗ khi cần. Các cấu hình tạo ở giai đoạn này chỉ là mẫu không chứa secret; `.clasp.json` thực tế luôn nằm trong `.gitignore`.

## Tài liệu và xác minh

- `README.md` ở gốc mô tả ranh giới thư mục và cách bắt đầu.
- `docs/architecture/README.md`, `docs/data-model/README.md` và `docs/decisions/README.md` nêu mục đích của từng vùng tài liệu.
- Skeleton được xác minh bằng script Node không phụ thuộc package bên thứ ba: kiểm tra toàn bộ đường dẫn bắt buộc, JSON hợp lệ và không có file `.clasp.json`.

## Ngoài phạm vi

- Khởi tạo dự án Vite hoặc cài npm dependency.
- Tạo spreadsheet, Drive folder hoặc script Apps Script thật.
- Định nghĩa phân hệ nghiệp vụ, schema Sheet hoặc endpoints.
- Khởi tạo Git repository; thư mục hiện chưa phải Git repository.
