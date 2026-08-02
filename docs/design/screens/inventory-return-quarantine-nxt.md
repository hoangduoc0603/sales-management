# Inventory Return, Quarantine & NXT Handoff

## Trạng thái

- Status: `Review`
- Ngày thiết kế: 2026-08-02
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `inventory-return-quarantine-nxt.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-return-quarantine-nxt.html`
- Mở bằng Chrome: `open -a "Google Chrome" "/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-return-quarantine-nxt.html"`

## Phạm vi

- Hash/state cần kiểm: `#quarantine`, `#return-receive`, `#inspection`, `#restock`, `#keep-quarantine`, `#scrap`, `#serial-trace`, `#nxt-report`, `#stock-ledger`, `#partial-coverage`, `#restricted`, `#empty`.
- Return vào quarantine, inspection Restock/KeepQuarantine/Scrap, trace serial và báo cáo nhập-xuất-tồn/thẻ kho theo kỳ.
- Return thuộc Sales; `SaleReturnReceive` không tăng available. Chỉ Restock hợp lệ mới đưa hàng trở lại kho bán được.

## Handoff UI

- Workspace switch giữa Quarantine và NXT/thẻ kho. Quarantine cho thấy đơn nguồn, actor, trace và lịch sử quyết định bất biến.
- Scrap yêu cầu lý do/bằng chứng/approval theo policy; fast return thiếu quyền hiển thị restricted state.
- NXT dùng custom filter cho kỳ, Branch/Kho, variant, lot/serial và nguồn movement; hiển thị opening/nhập/xuất/điều chỉnh/closing, `asOf` và coverage.
- Partial coverage không ngụ ý báo cáo đầy đủ; drilldown mở chứng từ nguồn trong đúng scope.

## Quy tắc triển khai

- Không dùng audit log thay cho dữ liệu vận hành, không ngụ ý offline write hoặc tự thay đổi tồn.
- Command quyết định inspection chặn gửi lặp; light/dark và mobile 390 px giữ nội dung chính không tràn ngang.
