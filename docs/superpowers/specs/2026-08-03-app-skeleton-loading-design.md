# Cơ chế skeleton loading chung cho ứng dụng

## Trạng thái

- Ngày: 2026-08-03
- Worktree: `.worktrees/app-skeleton-loading`
- Phạm vi: UI web React, không thay đổi API/backend/source of truth.
- Quyết định: Approved qua xác nhận trực tiếp của user trong phiên làm việc.

## Mục tiêu

Ứng dụng cần một cơ chế loading chung để các màn hình nghiệp vụ hiển thị placeholder theo layout thật khi đang đợi dữ liệu. Skeleton phải thay thế các trạng thái chờ dữ liệu dạng spinner/toàn trang rỗng, giúp người dùng hiểu khu vực nào đang tải và giảm cảm giác UI bị nhảy khi dữ liệu về.

## Nghiên cứu và quyết định

- shadcn/ui triển khai Skeleton như primitive copy-in, không yêu cầu cài runtime package riêng. Repo đã có `web/src/components/ui/skeleton.tsx`, nên mở rộng primitive nội bộ là phù hợp hơn thêm dependency.
- NN/G mô tả skeleton screen là placeholder cho full-page load, giúp giảm cảm nhận thời gian chờ vì cho người dùng thấy hình dạng trang cuối.
- web.dev về CLS khuyến nghị giữ/reserve không gian cho nội dung động; skeleton phải gần layout thật để tránh layout shift.
- UI/UX Pro Max nhắc motion phải tôn trọng `prefers-reduced-motion`.

## Thiết kế

### Primitive chung

`web/src/components/ui/skeleton.tsx` cung cấp:

- `Skeleton`: block placeholder cơ bản.
- `SkeletonText`: nhóm dòng text.
- `SkeletonCard`: card/panel placeholder.
- `SkeletonTable`: bảng/list placeholder.
- `SkeletonPage`: page skeleton theo loại layout `dashboard | table | form | detail`.

Các component dùng class `cn-skeleton*` và `aria-busy`/`role="status"` ở container phù hợp. Nội dung skeleton là decorative nên các khối con dùng `aria-hidden="true"`.

### CSS

CSS đặt trong `web/src/styles/index.css`, dùng token Cenio Core:

- màu qua `--cn-surface-inset`, `--cn-surface-subtle`, `--cn-border-subtle`;
- radius theo `--cn-radius-control`/`--cn-radius-container`;
- shimmer/pulse nhẹ;
- `@media (prefers-reduced-motion: reduce)` tắt animation skeleton.

### Áp dụng ban đầu

- `InstallCheckingScreen`: dùng skeleton trong card thay spinner chính khi đang kiểm tra cài đặt.
- `SalesManagementApp` bootstrapping: dùng `SkeletonPage kind="dashboard"` trong `AppShell` khi đang bootstrap session/scope, nếu đã có actor/scope đủ để giữ app shell; nếu không đủ thì dùng auth-card skeleton.
- `DashboardHome` loading state: dùng `SkeletonPage kind="dashboard"` thay skeleton 3 dòng cũ.

Không đổi button command loading: button vẫn dùng spinner nhỏ và giữ nguyên label theo handoff.

## Quy tắc dùng về sau

- Khi page hoặc section đang đợi dữ liệu đọc: dùng `SkeletonPage`, `SkeletonCard`, `SkeletonTable`, hoặc `SkeletonText`.
- Khi đang submit command/action: dùng `Button isLoading`, không thay bằng skeleton.
- Skeleton không được render dữ liệu giả có ý nghĩa nghiệp vụ.
- Skeleton phải giữ kích thước gần UI thật để tránh layout shift.
- Mọi loading state mới trong handoff phải ưu tiên skeleton chung trước khi tạo pattern riêng.

## Kiểm thử

- Unit/render tests cho primitive skeleton và class/accessibility.
- App stage tests cho install checking và bootstrapping.
- Dashboard loading state test.
- CSS tests cho shimmer/reduced-motion.
- Verification: typecheck, lint, targeted tests, build nếu phạm vi yêu cầu.
