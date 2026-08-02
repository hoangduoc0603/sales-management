# Inventory Extended Operations Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thiết kế và handoff đầy đủ các bề mặt vận hành nhập, xuất, quarantine và báo cáo kho còn thiếu.

**Architecture:** Ba artifact Open Design theo từng workflow thực thi, liên kết source document nhưng không thay đổi ownership Purchasing, Sales hoặc Inventory. Handoff và coverage matrix là lớp truy vết chính trong repository.

**Tech Stack:** Open Design HTML artifact, Cenio Core v0.7, Markdown handoff.

## Global Constraints

- Follow `SRS-INV`, `SRS-PUR`, `SRS-SAL` và LLD đã duyệt; không tạo generic stock mutation.
- Handoff dùng absolute local file path, không dùng loopback URL.
- Mỗi artifact ở `Review` cho đến khi user duyệt visual.

---

### Task 1: Nhập kho và nhận hàng

**Files:**
- Create: Open Design `inventory-receiving-inbound.html`
- Create: `docs/design/screens/inventory-receiving-inbound.md`
- Modify: `docs/design/open-design-registry.md`, `docs/design/inventory-ui-coverage.md`

- [x] Tạo artifact nhận hàng với receipt theo PO/direct, partial receipt, lot/serial, cost allocation và approval validation.
- [x] Kiểm thử hash routes, dialog, theme, desktop và mobile 390 px.
- [x] Thêm registry/handoff `Review` với đường dẫn local tuyệt đối và mapping SRS.

### Task 2: Xuất kho và fulfillment

**Files:**
- Create: Open Design `inventory-fulfillment-outbound.html`
- Create: `docs/design/screens/inventory-fulfillment-outbound.md`
- Modify: `docs/design/open-design-registry.md`, `docs/design/inventory-ui-coverage.md`

- [x] Tạo artifact pick/ship theo đơn bán, FEFO/serial, return NCC/warranty issue, stock exception và processing guard.
- [x] Kiểm thử hash routes, dialog, theme, desktop và mobile 390 px.
- [x] Thêm registry/handoff `Review` với đường dẫn local tuyệt đối và mapping SRS.

### Task 3: Quarantine, hoàn trả và NXT

**Files:**
- Create: Open Design `inventory-return-quarantine-nxt.html`
- Create: `docs/design/screens/inventory-return-quarantine-nxt.md`
- Modify: `docs/design/open-design-registry.md`, `docs/design/inventory-ui-coverage.md`

- [x] Tạo artifact return quarantine, inspection outcome, serial trace và báo cáo NXT/thẻ kho.
- [x] Kiểm thử hash routes, theme, desktop và mobile 390 px.
- [x] Thêm registry/handoff `Review`, sửa mapping SRS của các artifact kho hiện có và rà soát URL bị cấm.
