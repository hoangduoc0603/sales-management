# Catalog Inventory Tracking UI Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm rõ và cân đối khu vực thiết lập tồn kho trong form Product/Variant mà không thay đổi contract `lotTracking`/`serialTracking`.

**Architecture:** Open Design artifact là nguồn visual trước; handoff mô tả mapping từ một lựa chọn UI sang hai cờ hiện có ở `Variant`. Chỉ sau khi artifact và handoff được duyệt mới được thay implementation React; request API và schema giữ nguyên.

**Tech Stack:** Open Design, Markdown handoff, React/TypeScript, Vitest.

## Global Constraints

- Không thay đổi nghĩa dữ liệu hoặc schema của `Variant.inventoryMode`, `Variant.lotTracking`, `Variant.serialTracking`.
- Không dùng native `<select>`; dùng custom listbox/radio theo Cenio Core v0.7.
- Thiết kế phải hoạt động ở light/dark theme và mobile.
- Artifact Catalog đang `Review`; không sửa UI React trước khi user duyệt artifact và handoff.

---

### Task 1: Refine Open Design artifact và handoff

**Files:**
- Modify: Open Design `catalog-products-variants.html`
- Modify: `docs/design/screens/catalog-products-variants.md`

**Interfaces:**
- Consumes: `inventoryMode`, `lotTracking`, `serialTracking`.
- Produces: một custom listbox `Phương thức theo dõi hàng hóa` với bốn trạng thái visual; mỗi trạng thái ánh xạ deterministically sang hai boolean.

- [x] Đặt switch `Quản lý tồn` cùng hàng header panel, căn phải, chỉ gồm nhãn + switch, không card nền trắng/viền riêng và không copy trạng thái.
- [x] Đặt `Tồn tối thiểu` và `Phương thức theo dõi hàng hóa` cùng hàng, hai field chia chiều rộng bằng nhau trên desktop và xếp dọc trên mobile.
- [x] Dùng switch làm parent của progressive disclosure: khi tắt, ẩn hoàn toàn hai field phụ thuộc và chỉ hiện helper ngắn; khi bật, hiện lại hai field cùng giá trị đã cấu hình.
- [x] Thay popup checkbox độc lập bằng danh sách radio gồm: Không theo dõi; Lô & hạn sử dụng; Serial / IMEI; Lô & hạn sử dụng + Serial / IMEI.
- [x] Thêm mô tả một dòng cho từng lựa chọn và keyboard/click-outside/Escape behavior.
- [x] Cập nhật handoff, hash/state cần verify và giữ trạng thái `Review` cho đến khi user duyệt.

### Task 2: Implement React sau khi artifact được duyệt

**Files:**
- Modify: `web/src/features/catalog/catalog-crm-home.tsx`
- Modify: `tests/web/catalog-crm-home.test.ts`

**Interfaces:**
- Consumes: custom control trả một giá trị UI (`none | lot | serial | lot-and-serial`).
- Produces: `{ lotTracking, serialTracking }` gửi vào các operation catalog hiện có.

- [ ] Viết test fail kiểm tra copy tiếng Việt và mapping cả bốn lựa chọn.
- [ ] Chạy test để xác nhận fail do control/mapping chưa có.
- [ ] Implement control và mapping tối thiểu, không thay đổi API payload/schema.
- [ ] Chạy test Catalog, typecheck và screenshot QA light/dark/mobile.
- [ ] Cập nhật registry/handoff sang `Approved` chỉ khi user xác nhận artifact.
