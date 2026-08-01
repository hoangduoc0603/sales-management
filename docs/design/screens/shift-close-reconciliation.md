# Shift Close Reconciliation Handoff

## Trạng thái

- Status: `Approved`
- Ngày thiết kế: 2026-08-01
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `shift-close-reconciliation.html`

## Phạm vi

- Hash/state cần verify: `#open`, `#closing`, `#variance`, `#locked`, `#after-lock-adjustment`.
- Bao phủ shift timeline, expected vs actual cash, payment breakdown, variance reason/approval, locked state, after-lock adjustment, drawer events và print summary.
- Theo `docs/product/srs/finance.md`, `docs/architecture/modules/finance-shifts.md`.

## Rule triển khai

- Shift lock là state backend; sau lock chỉ adjustment/reversal theo quy trình.
- Variance phải có reason/approval khi vượt ngưỡng.
- Cash/account numbers dùng tabular numbers; không dùng UI để thay audit.
