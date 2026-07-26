# Sales Management

Đây là nền tảng kỹ thuật cho ứng dụng quản lý bán hàng trên Google Workspace.

## Bản đồ repository

- Quy ước chi tiết và nguồn chuẩn để đặt file: [`docs/architecture/folder-structure.md`](docs/architecture/folder-structure.md).
- `web/`: giao diện React/Vite. Chỉ chứa lớp trình bày, trạng thái giao diện và tiện ích phía người dùng.
- `apps-script/`: backend Google Apps Script. Các lớp `api`, `services`, `repositories` và `infrastructure` tách riêng lần lượt cho điểm vào, nghiệp vụ, truy cập dữ liệu và tích hợp nền tảng.
- `shared/`: hợp đồng TypeScript dùng chung, bao gồm contracts, schemas, types và constants.
- `.agents/skills/`: skill Codex chỉ áp dụng trong repository, gồm workflow tái sử dụng cho Product Discovery/PRD, Solution/System Design và Detailed/Low-Level Design.
- `docs/`: tài liệu sản phẩm, kiến trúc, LLD, mô hình dữ liệu, design handoff và các quyết định kỹ thuật; PRD gốc ở [`docs/product/PRD.md`](docs/product/PRD.md), SRS mô-đun tại [`docs/product/srs/overview.md`](docs/product/srs/overview.md), registry thiết kế tại [`docs/design/open-design-registry.md`](docs/design/open-design-registry.md).
- `scripts/`: script hỗ trợ và kiểm tra repository.
- `tests/`: vị trí dành cho kiểm thử khi có mã nguồn.
- `dist/`: artifact deploy sinh tự động ở root, chứa `index.html`, `code.js` và `appsscript.json` để clasp push; không theo dõi source build này.
- `tmp/`: tài liệu rà soát tạm thời, chưa phải nguồn quyết định chính thức.

## Quy ước

- Không lưu secret trong source code, Google Sheets hoặc file được theo dõi.
- Không theo dõi root `.clasp.json`; dùng `.clasp.json.example` làm mẫu an toàn. File cục bộ này có thể chứa `scriptId` của test tenant.
- Giữ ranh giới rõ ràng giữa giao diện, nghiệp vụ và truy cập dữ liệu.
- Khi code UI, đọc design registry/handoff trong `docs/design/` trước khi triển khai từ Open Design artifact đã duyệt.
- Chạy `node scripts/verify-structure.mjs` để kiểm tra skeleton nền.

## Bắt đầu và kiểm tra nền tảng

Yêu cầu Node.js `>=22.12.0`.

```bash
npm install
npm run verify
```

## Chạy local để test luồng và UI

```bash
npm run dev
```

Mở URL Vite hiển thị trên terminal, thường là `http://127.0.0.1:5173/`.

Khi chạy local không có `google.script.run`, frontend tự dùng local fake backend trong bộ nhớ để test API flow cơ bản. Tài khoản local mặc định:

- Login ID: `admin`
- Mật khẩu: `admin123`

Khi chạy trong Apps Script Web App có `google.script.run`, client sẽ ưu tiên backend Apps Script thật.

`npm run build` tạo artifact trong `dist/`; lệnh không gọi Google Workspace. Để push lên test tenant, người triển khai tự sao chép `.clasp.json.example` thành `.clasp.json`, thêm `scriptId` cục bộ, rồi chạy `npm run deploy:push`. Không đưa `scriptId`, token hay `.clasp.json` vào source, log hoặc Git.
