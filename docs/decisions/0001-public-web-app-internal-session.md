# ADR 0001 — Public Web App với internal session

**Trạng thái:** Accepted  
**Liên quan:** [Solution Design](../architecture/solution-design.md), `SRS-OVR-005` đến `SRS-OVR-008`

## Bối cảnh

Nhân viên không được yêu cầu có Google account; Google account khách chỉ dùng để triển khai và sở hữu resource. Web App cần mở được qua URL nhưng không được làm lộ dữ liệu.

## Quyết định

Deploy Web App public, chạy bằng quyền tài khoản Google khách triển khai. Dùng `loginId`/mật khẩu, opaque internal session và backend permission/scope cho mọi API nghiệp vụ. Google identity không tham gia identity/authorization ứng dụng.

## Hệ quả

API phải xác thực cả read/print/export/file; URL public không trả business data. Cần credential verifier bảo mật, session revoke, lockout, rate limit và actor metadata trên record thay đổi. Browser cache/UI không phải security boundary.

## Phương án không chọn

Buộc mỗi nhân viên dùng Google account hoặc dùng Google account làm role; hai phương án trái với yêu cầu đăng nhập nội bộ và làm vận hành khách nhỏ phức tạp.
