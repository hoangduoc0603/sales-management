# Design Handoff

Thư mục này là nguồn chuẩn để chuyển thiết kế đã duyệt trên Open Design thành chỉ dẫn triển khai UI trong repository.

## Vai trò

- Ghi lại Design System đang dùng, registry artifact trên Open Design và trạng thái duyệt từng màn hình.
- Cung cấp rule để AI Agent/code session mới biết phải follow design nào trước khi sửa UI.
- Liên kết design với SRS/LLD liên quan để tránh triển khai UI lệch nghiệp vụ.

## Luồng làm việc chuẩn

```text
PRD/SRS/LLD
  → Open Design prototype
  → User review và duyệt
  → Cập nhật registry + handoff trong docs/design/
  → Code agent đọc handoff, lấy artifact theo project + filename và mở Local Preview để đối chiếu
  → Implement React/Tailwind/shadcn
  → Chụp screenshot implementation sau code và đối chiếu với Open Design artifact
  → Verify lại UI theo artifact/handoff, ở light và dark theme
```

## Tài liệu cần đọc khi code UI

1. `docs/design/open-design-registry.md`
2. `docs/design/design-system.md`
3. `docs/design/implementation-rules.md`
4. File handoff màn hình tương ứng trong `docs/design/screens/`
5. SRS/LLD/data dictionary/ADR được file handoff dẫn chiếu

Nếu design handoff mâu thuẫn với SRS, LLD hoặc ADR Accepted, dừng lại và nêu rõ điểm cần quyết định trước khi code.

## Mở artifact khi code UI

- `Open Design project` + `Artifact chính` trong registry là định danh chuẩn để AI Agent lấy thiết kế hiện hành qua Open Design.
- `Local preview` là link tiện dụng để mở trực tiếp artifact trên máy local, kể cả khi không mở cửa sổ ứng dụng Open Design. Dịch vụ Open Design local vẫn phải đang chạy.
- Local URL không portable sang máy khác và có thể đổi port sau khi khởi động lại; nếu link hỏng, dùng project + artifact để lấy lại thay vì dựa vào screenshot hoặc tự suy diễn UI.
- Không dùng screenshot làm nguồn triển khai. Screenshot chỉ phục vụ trao đổi hoặc review nhanh.

## Screenshot sau khi code

- Sau khi implement UI, agent phải chụp screenshot implementation ở các viewport/state được handoff yêu cầu rồi đối chiếu với artifact/Local Preview.
- Tối thiểu cần có desktop viewport cho state chính; với màn responsive hoặc nhiều state, phải chụp thêm mobile và các hash/state quan trọng trong handoff.
- Screenshot là bằng chứng QA, không thay thế Open Design artifact. Không commit screenshot vào repo trừ khi task yêu cầu hoặc team quyết định lưu preview pack.
- Khi báo hoàn tất, agent phải nêu rõ đã chụp/đối chiếu viewport nào và còn lệch visual nào nếu có.

## Trạng thái duyệt

| Trạng thái | Ý nghĩa | Được dùng để code? |
| --- | --- | --- |
| `Draft` | Đang thiết kế, chưa chốt | Không |
| `Review` | Đang chờ user kiểm tra | Không |
| `Approved` | Đã được user duyệt | Có |
| `Needs update` | Có thay đổi nghiệp vụ hoặc design system cần cập nhật | Không, trừ khi task chỉ là sửa handoff/design |

## Quy tắc cập nhật

- Màn hình chỉ được coi là nguồn triển khai khi registry và handoff đều ghi `Approved`.
- Khi chỉnh design trên Open Design, cập nhật registry/handoff trong cùng thay đổi hoặc trước khi code UI.
- Khi đổi artifact, đổi project, đổi trạng thái duyệt hoặc local preview port, cập nhật `docs/design/open-design-registry.md` trong cùng thay đổi. Nếu chỉ port local đổi, không coi design đổi nhưng registry vẫn phải trỏ đúng link mở nhanh hiện tại khi bàn giao.
- Mỗi handoff phải có mục `Hash/state cần verify` hoặc mô tả state cụ thể cần kiểm khi màn có nhiều route/state.
- Khi code phát hiện design thiếu state, thiếu nội dung hoặc mâu thuẫn nghiệp vụ, không tự suy diễn UI mới; ghi rõ khoảng trống và xin quyết định.
- Khi code UI hoàn tất, đối chiếu implementation với Local Preview/artifact ở light và dark theme trước khi báo hoàn thành.
