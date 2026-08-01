# Bảo mật và kiểm soát truy cập

**Nguồn tổng quan:** [Solution Design](solution-design.md). Tài liệu này quy định security architecture; yêu cầu nghiệp vụ nguồn nằm tại `SRS-OVR-005` đến `SRS-OVR-009` và `SRS-ACC-001` đến `SRS-ACC-005`.

## 1. Trust boundary

Web App URL là public và chạy bằng quyền Google account khách triển khai. Browser, request payload, cache client và hidden UI đều là không tin cậy. Chỉ backend sau khi đã xác thực session, action permission và scope mới được đọc/ghi dữ liệu.

Google identity không được dùng để suy ra actor ứng dụng. `loginId` là identity nội bộ; Google account chỉ sở hữu resource và quyền chạy Apps Script.

## 2. Credential và session

- User business profile lưu tại Core Data, nhưng credential verifier không lưu trong Spreadsheet/source/log/export. Mỗi credential dùng verifier `hmac-sha256-v1` với salt riêng từng user; tenant credential pepper nằm trong Script Properties và không xuất hiện trong Sheet, source, log hoặc export.
- Mật khẩu tạm admin được sinh/cấp một lần trong bootstrap, buộc đổi khi login thành công đầu tiên và không persisted ở dạng plaintext.
- Session token là opaque random secret; browser chỉ giữ trong `sessionStorage`/memory, server chỉ lưu HMAC fingerprint theo tenant session pepper, user ID, issued time, idle expiry, absolute expiry, auth version và revoke status. Production Apps Script phải sinh token/record ID bằng UUID/random generator; ID deterministic chỉ được dùng trong test/dev composition để có fixture ổn định.
- Session idle tối đa 1 giờ và absolute lifetime 8 giờ. Bất cứ reset password, disable user hoặc thay đổi role/scope nào đều tăng auth version và revoke session hiện có.
- Login sai năm lần liên tiếp khóa account 15 phút. Lock, reset, revoke và bất thường auth chỉ ghi telemetry/metadata kỹ thuật khi cần; không lưu password/token.

Session/permission summary có thể cache server TTL ngắn để không tạo Sheet I/O trên POS. Auth mutation phải invalidate cache ngay; protected operation có thể fresh-read khi rủi ro cao.

## 3. Authorization và data isolation

Permission là action (`view`, `create`, `update`, `cancel`, `approve`, `print`, `export` và quyền nhạy cảm), áp dụng trong `tenant`, `branch` hoặc `warehouse` scope. API handler tạo `ActorContext`; service kiểm tra action; repository nhận scope đã được kiểm chứng và query có scope ngay từ đầu.

Không được lấy dữ liệu toàn tenant rồi lọc frontend. Giá vốn/lợi nhuận, quỹ, export, backup/restore và credential/user management cần permission riêng. Disable user hoặc giảm scope phải chặn API mới và revoke session đang hoạt động.

## 4. Bảo vệ Google Workspace và client

Data spreadsheets/Drive folder không chia quyền edit cho nhân viên ứng dụng. Attachment được truy xuất qua `AttachmentService` sau permission check, không trả Drive link public. Owner vẫn có thể sửa trực tiếp vì sở hữu file; đây là ngoài luồng ứng dụng, phải có cảnh báo quản trị và integrity check định kỳ, không được coi là API hỗ trợ.

React không render raw HTML không kiểm soát; API validate schema server-side và error mapping không trả stack trace, raw Google error, resource ID nhạy cảm hoặc dữ liệu ngoài scope. Audit/telemetry sanitize trước khi persist.

Login có rate limiting theo `loginId` trước bước đọc user/credential để giảm chi phí brute-force trên Apps Script. API nhạy cảm có rate limiting theo login/session và retry policy rõ ràng. Rate limiting không dựa vào IP vì public Apps Script Web App không cung cấp một IP client đáng tin cậy cho nghiệp vụ.
