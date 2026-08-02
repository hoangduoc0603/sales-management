# Admin Access, Config & Lifecycle Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `admin-access-config-lifecycle.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/admin-access-config-lifecycle.html`

## Phạm vi

- Hash/state cần verify: `#users`, `#roles`, `#permission-scope`, `#session-revoke`, `#tenant-config`, `#branch-warehouse-lifecycle`.
- Bao phủ user/role matrix, Branch/Warehouse scope, sensitive permission, reset/revoke session, future-effective tenant config và lifecycle blockers.
- Theo `docs/product/srs/access-reporting.md`, `docs/product/srs/overview.md`, `docs/architecture/modules/administration-reporting-operations.md`.

## Rule triển khai

- Permission/scope là backend source of truth; UI chỉ phản ánh restricted/allowed states.
- Tenant config future effective không được áp dụng sớm ở UI.
- Branch/Warehouse disable phải hiển thị blockers thay vì tự cho disable.
