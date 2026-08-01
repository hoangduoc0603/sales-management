# Reporting, Administration & Operations Design Handoff

## Trạng thái

- Status: `Approved` — đã được người dùng duyệt, được dùng làm nguồn triển khai UI.
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `reporting-administration-operations.html`

## Phạm vi artifact

- Report shell theo date semantic, Branch/Warehouse scope, `generatedAt`/`asOf`, archive coverage và drill-down; các báo cáo sales/customer, inventory/purchasing, cash/shift/aging và performance/commission.
- Export run nền, warning scope/cột, retry, download/expired; audit có filter, delivery pending/delivered và export theo quyền.
- User/Role/UserScope, cấu hình tenant future-effective, lifecycle Branch/Warehouse và blocker.
- Import Center, attachment, backup/restore theo freeze–verify–replacement–Owner confirmation–switch, Owner Operations/health/quota/capacity.

## Quy tắc bắt buộc khi triển khai

- Theo `SRS-ACC-001..018`, `SRS-OVR-005..011`, `SRS-OVR-019..024` và LLD `administration-reporting-operations.md`.
- Backend phải cắt scope/field sensitive trước projection/export. UI không được suy diễn đầy đủ coverage khi archive chưa sẵn sàng, hoặc coi stale/retry là offline write/sync.
- Backup/restore không ghi đè trực tiếp production; Owner confirmation và state từ backend là bắt buộc.
- Dùng custom listbox, Cenio Core v0.7 và loading icon-only; không có integration ngoài PRD/SRS.
- Visual theo hướng TailAdmin-inspired: AppShell dark/light đồng bộ, sidebar/top tabs có deep link hash `#reports`, `#audit`, `#admin`, `#import`, `#operations` và alias `#view-*`.

## Kiểm tra thiết kế đã thực hiện

- Dark selected/subtle 9.22:1; dark filled primary 5.94:1.
- Không có native select, gradient, selector user rộng hay nội dung ngoài phạm vi.
- Có state loading, empty, error, restricted, scope invalid, stale/archive/retry và command-in-progress.
- State lab/readiness ẩn khỏi ready view; SVG references, script parse và render desktop hash `#admin` đã được kiểm tra.
