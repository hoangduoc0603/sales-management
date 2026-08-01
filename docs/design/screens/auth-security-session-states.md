# Auth Security & Session States Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `auth-security-session-states.html`

## Phạm vi

- Hash/state cần verify: `#login`, `#lockout`, `#expired`, `#idle-warning`, `#password-reset`, `#permission-revoked`, `#install-check-warning`.
- Bao phủ login, failed attempts lockout, expired session, idle warning modal, password reset, permission revoked và Apps Script/install health warning.
- Theo `docs/product/srs/overview.md`, `docs/product/srs/access-reporting.md`, `docs/architecture/modules/administration-reporting-operations.md`.

## Rule triển khai

- Lockout/expired/revoked state lấy từ backend/session; UI không tự cấp lại quyền.
- Password reset và request access là flow rõ trạng thái, không marketing page.
- Giữ visual gần `auth-first-run.html` nhưng dùng Cenio Core v0.7.
