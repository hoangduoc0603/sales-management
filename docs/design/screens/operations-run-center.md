# Operations Run Center Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `operations-run-center.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/operations-run-center.html`

## Phạm vi

- Hash/state cần verify: `#import-run`, `#export-run`, `#attachments`, `#backup`, `#restore`, `#archive`, `#worker-health`, `#quota`.
- Bao phủ run list/detail, private staging upload, validation, checkpoint/retry, export guard, Drive attachment state, backup/restore, archive, worker health và quota.
- Theo `docs/product/srs/access-reporting.md`, `docs/product/srs/overview.md`, `docs/architecture/modules/administration-reporting-operations.md`.

## Rule triển khai

- Private upload dùng toàn bộ dropzone làm trigger; không render nút hoặc copy visible `Chọn tệp`.
- Restore theo freeze, verify, replacement, Owner confirmation, switch và health check; không ghi đè trực tiếp production.
- Export phải cắt sensitive fields theo backend permission.
- Mobile Operations cần QA trực tiếp trên file artifact Open Design trước khi implement do đã có refine responsive riêng.
