# Auth và First-run Setup Design Handoff

## Trạng thái

- Status: `Approved`
- Ngày chốt: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact chính: `auth-first-run.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/auth-first-run.html`
- Handoff trong Open Design: `auth-first-run.html`

## Hash/state cần verify

- `#checking`
- `#login`
- `#cached-login`
- `#failed`
- `#check-failed`
- `#setup`
- `#revoked`

## Tài liệu nghiệp vụ/kỹ thuật liên quan

- SRS: `docs/product/srs/overview.md`
  - `SRS-OVR-001`
  - `SRS-OVR-005`
  - `SRS-OVR-006`
  - `SRS-OVR-007`
  - `SRS-OVR-022`
  - `SRS-OVR-023`
- LLD nền tảng: `docs/architecture/detailed-design.md`
- Platform technical design: `docs/architecture/platform-technical-design.md`
- LLD module: `docs/architecture/modules/administration-reporting-operations.md`
- Data dictionary: `docs/data-model/tables/operations-reporting.md`
- ADR liên quan:
  - `docs/decisions/0009-single-rpc-api-gateway.md`

## Mục tiêu màn hình

Luồng Auth và First-run setup xác định runtime config trước khi người dùng đăng nhập nội bộ. Màn hình phải tránh chặn người dùng ở các lần mở sau khi tenant đã được cài đặt, nhưng không được dùng localStorage làm nguồn quyết định cài đặt, quyền hoặc dữ liệu.

## Nội dung và state bắt buộc

- `Checking`: chỉ dùng khi trình duyệt chưa có marker `Installed` hoặc user bấm retry. Hiển thị spinner, copy “Đang kiểm tra cài đặt” và checklist: kiểm tra runtime config, đọc trạng thái dữ liệu, chuẩn bị login/setup.
- `Cached login`: nếu browser từng nhận backend status `Installed`, render ngay màn “Đăng nhập nội bộ”. `platform.install.getStatus` vẫn chạy ở nền.
- `Cached warning`: nếu background check lỗi/timeout, giữ login form và hiển thị cảnh báo non-blocking có CTA `Thử lại`.
- `Check failed`: nếu fresh open không có marker mà `platform.install.getStatus` lỗi hoặc timeout sau 15 giây, hiển thị recovery state có CTA `Thử lại`; không mở form setup.
- `Setup`: chỉ hiển thị khi backend trả `NotInstalled` hoặc sau khi runtime config bị mất. Form gồm tên cửa hàng, `loginId admin`, mật khẩu admin và xác nhận mật khẩu.
- `Revoked config`: nếu browser có marker `Installed` nhưng backend trả `NotInstalled`, xóa marker local, clear session/cache nhạy cảm và chuyển về setup.
- Artifact hỗ trợ state selector/deep link để review: `#checking`, `#login`, `#cached-login`, `#failed`, `#check-failed`, `#setup`, `#revoked` và alias `#view-*`.

## Rule triển khai

- Backend `platform.install.getStatus` là source of truth. Marker local chỉ là tối ưu trải nghiệm mở app.
- Marker local phải versioned, chỉ ghi khi backend trả `Installed` hoặc `platform.install.run` thành công.
- Không dùng Google account làm identity ứng dụng.
- Lỗi check install không được map thành `InstallStatus Failed` của setup run.
- `platform.install.run` lỗi mới hiển thị trong setup flow để admin thử lại.
- Button submit/loading giữ nguyên nhãn theo rule Cenio Core.
- Light/dark theme dùng token Cenio Core v0.7; không tạo palette cục bộ trong React.
- Visual theo hướng TailAdmin-inspired nhưng phù hợp auth/setup: panel vận hành gọn, không landing hero, không gradient/glass/neon.

## Acceptance checklist

- [ ] Fresh open chưa cài đặt: checking → setup khi backend trả `NotInstalled`.
- [ ] Fresh open lỗi/timeout: checking → recovery retry, không mở setup.
- [ ] Reload sau khi đã cài đặt: login hiển thị ngay, background check tiếp tục chạy.
- [ ] Background check lỗi/timeout khi đã có marker: login giữ nguyên, hiển thị warning retry.
- [ ] Backend trả `Installed`: marker local được ghi.
- [ ] Backend trả `NotInstalled`: marker và session local bị clear trước khi vào setup.
- [ ] `platform.install.run` thành công: clear session cũ, ghi marker `Installed`, chuyển về login nội bộ.
- [ ] UI bám artifact `auth-first-run.html` và hoạt động responsive/light/dark.
- [ ] Không native select, gradient, selector user rộng; script parse và render desktop hash `#setup` đã được kiểm tra.
