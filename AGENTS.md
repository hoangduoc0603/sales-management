# Sales Management

Ứng dụng quản lý bán hàng trên Google Workspace, phát triển theo hướng và tech stack của Cenio.

## Tech stack

- Frontend: React, TypeScript, Vite
- UI: Tailwind CSS, shadcn/ui
- Backend: Google Apps Script
- Data: Google Sheets
- File đính kèm: Google Drive
- Tooling/deploy: clasp

## Quy ước khởi đầu

- Tài liệu mặc định viết bằng tiếng Việt.
- Không lưu secret trong source code hoặc Google Sheets.
- Tách UI, nghiệp vụ và truy cập dữ liệu thành các lớp rõ ràng.

## Quy tắc triển khai

Trước khi tạo hoặc sửa mã nguồn cho bất kỳ task nào:

1. Đọc `docs/architecture/folder-structure.md` để đặt tệp đúng vị trí.
2. Đọc `docs/architecture/lld-traceability-review.md` và `docs/architecture/detailed-design.md` để xác định bounded context, tài liệu LLD, data dictionary và ADR cần áp dụng.
3. Theo bounded context bị ảnh hưởng, đọc `docs/product/srs/overview.md`, SRS theo domain, tệp tại `docs/architecture/modules/`, data dictionary tương ứng tại `docs/data-model/tables/`, ADR được dẫn chiếu và mã nguồn hiện có liên quan.
4. Với task xuyên miền, đọc tài liệu của tất cả domain liên quan và kiểm tra orchestration/traceability giữa chúng.

Thứ tự ưu tiên khi có mâu thuẫn: SRS → ADR Accepted → Solution/System Design → LLD và data dictionary → mã nguồn hiện có. PRD là nguồn về mục tiêu và phạm vi sản phẩm.

Không tự thay đổi requirement, state machine, phân quyền, source of truth, ledger, schema vật lý, partition/lifecycle hoặc performance policy. Khi tài liệu thiếu, mâu thuẫn hoặc task buộc phải thay đổi các nội dung đó, dừng coding và nêu rõ điểm cần quyết định.

Khi hoàn thành task, đối chiếu test scenario/quality gate trong LLD. Nếu thay đổi hành vi, schema hoặc cấu trúc, cập nhật tài liệu nguồn liên quan trong cùng thay đổi.

## Quy tắc triển khai UI từ Design

Trước khi tạo hoặc sửa UI, phải đọc `docs/design/README.md`, `docs/design/open-design-registry.md`, `docs/design/design-system.md`, `docs/design/implementation-rules.md` và file handoff màn hình tương ứng trong `docs/design/screens/`. Xác nhận registry và handoff đều là `Approved`, lấy artifact hiện hành theo `Open Design project` + `Artifact chính`, rồi mở `Local preview` để đối chiếu trước khi code và sau khi hoàn tất. Không code UI dựa trên screenshot.

Nếu màn hình đã có Open Design artifact được duyệt, implementation phải follow artifact/handoff đó về layout, hierarchy, component behavior, state, responsive và theme. Không tự thay đổi UI pattern, token, component mapping hoặc nội dung hiển thị nếu khác với handoff.

Khi design và SRS/ADR/LLD mâu thuẫn, dừng lại và nêu rõ điểm cần quyết định. Nếu Local preview không mở được, dùng project + artifact để lấy lại qua Open Design; nếu không đủ căn cứ visual thì dừng, không tự suy diễn UI. Khi design thay đổi trên Open Design, phải cập nhật registry/handoff tương ứng trong `docs/design/` trước hoặc trong cùng thay đổi code.

## Cấu trúc thư mục

- `docs/architecture/folder-structure.md` là nguồn chuẩn về cấu trúc repository, trách nhiệm và ranh giới của từng thư mục.
- Trước khi tạo, di chuyển, đổi tên hoặc xoá tệp/thư mục; hoặc khi thêm tính năng hay luồng mới, phải đọc tài liệu này để đặt thay đổi đúng vị trí.
- Mọi thay đổi cấu trúc hoặc trách nhiệm thư mục phải cập nhật `docs/architecture/folder-structure.md` trong cùng thay đổi.
- Nếu thay đổi ảnh hưởng bản đồ repository hoặc skeleton bắt buộc, cũng cập nhật `README.md` và/hoặc `scripts/verify-structure.mjs`, rồi chạy kiểm tra cấu trúc trước khi hoàn tất.
- Khi tài liệu chưa quy định vị trí phù hợp, không tự tạo một vùng mã nguồn mới; nêu phương án và xin làm rõ trước.
