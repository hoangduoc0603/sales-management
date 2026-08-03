# App Skeleton Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa skeleton loading chung cho app React và áp dụng vào các loading state nền tảng/dashboard hiện có.

**Architecture:** Mở rộng primitive `web/src/components/ui/skeleton.tsx` thành bộ component layout-agnostic, style bằng token Cenio Core trong `web/src/styles/index.css`, rồi thay các loading state đọc dữ liệu bằng skeleton. Command/action loading vẫn giữ spinner trong Button.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS token global, shadcn-style internal primitives.

## Global Constraints

- Không thêm dependency mới cho skeleton.
- Không thay đổi API/backend/source of truth.
- Skeleton dùng cho loading dữ liệu đọc/page/section; command/action dùng `Button isLoading`.
- Skeleton phải hỗ trợ light/dark theme và `prefers-reduced-motion`.
- Documentation phải nêu rõ cách dùng skeleton cho màn mới.

---

### Task 1: Skeleton primitive chung

**Files:**
- Modify: `web/src/components/ui/skeleton.tsx`
- Modify: `web/src/styles/index.css`
- Modify: `tests/web/ui-primitives-completion.test.ts`

**Interfaces:**
- Produces: `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonTable`, `SkeletonPage`.

- [x] Viết failing test cho `SkeletonPage`, `SkeletonTable`, `SkeletonText` markup và class.
- [x] Chạy `npm test -- tests/web/ui-primitives-completion.test.ts` để xác nhận RED.
- [x] Implement component và CSS token/reduced-motion.
- [x] Chạy lại test để GREEN.

### Task 2: Áp dụng cho app loading

**Files:**
- Modify: `web/src/app/install/install-flow.tsx`
- Modify: `web/src/app/sales-management-app.tsx`
- Modify: `web/src/features/dashboard/dashboard-home.tsx`
- Modify: `tests/web/sales-management-app.test.ts`
- Modify: `tests/web/sales-management-app-auth-stage.test.ts`

**Interfaces:**
- Consumes: `SkeletonPage`, `SkeletonCard`, `SkeletonText`.

- [x] Viết failing tests cho install checking và bootstrapping dùng skeleton chung.
- [x] Viết/cập nhật test dashboard loading dùng skeleton dashboard.
- [x] Implement thay thế spinner/page loading read-state bằng skeleton.
- [x] Chạy targeted tests để GREEN.

### Task 3: Documentation

**Files:**
- Modify: `docs/design/design-system.md`
- Modify: `docs/design/implementation-rules.md`

**Interfaces:**
- Produces: quy tắc skeleton loading chung cho agent/dev về sau.

- [x] Cập nhật design-system: Skeleton là Cenio Core primitive.
- [x] Cập nhật implementation-rules: khi nào dùng skeleton, khi nào dùng button spinner.
- [x] Chạy test/lint/typecheck liên quan.

### Task 4: Verification

- [x] Chạy `npm run typecheck`.
- [x] Chạy `npm run lint`.
- [x] Chạy targeted tests: `npm test -- tests/web/ui-primitives-completion.test.ts tests/web/install-flow.test.tsx tests/web/sales-management-app.test.ts tests/web/sales-management-app-auth-stage.test.ts`.
- [ ] Chạy full `npm test` — fail baseline ở `tests/web/release-ui-acceptance.test.ts` với màn `Tổng quan vận hành tồn kho`; xác nhận main hiện tại cũng fail cùng lỗi.
- [x] Chạy `npm run build`.
- [x] Kiểm tra `git diff --check`.
