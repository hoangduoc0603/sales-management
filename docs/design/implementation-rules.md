# UI Implementation Rules

Tài liệu này quy định cách AI Agent triển khai UI từ design đã duyệt trên Open Design.

## Quy trình bắt buộc trước khi code UI

1. Đọc `AGENTS.md`.
2. Đọc `docs/architecture/folder-structure.md`.
3. Đọc `docs/design/README.md`.
4. Đọc `docs/design/open-design-registry.md`.
5. Đọc `docs/design/design-system.md`.
6. Đọc file handoff màn hình trong `docs/design/screens/`.
7. Đọc SRS/LLD/data dictionary/ADR được handoff dẫn chiếu.
8. Xác nhận registry và handoff của màn hình đều là `Approved`; nếu không, không implement UI.
9. Dùng `Open Design project` + `Artifact chính` trong registry để lấy artifact hiện hành trực tiếp qua Open Design. Đây phải là bản mới nhất tại thời điểm code, không phải bản đã cache từ session trước.
10. Mở `Local preview` của artifact để đối chiếu trực quan trước khi code và sau khi hoàn tất: layout, hierarchy, component behavior, state, responsive, light theme và dark theme.
11. Sau khi code UI, chụp screenshot implementation ở desktop và các viewport/state handoff yêu cầu; đối chiếu ảnh với artifact/Local Preview trước khi báo hoàn tất.

Không code UI chỉ từ screenshot, source UI cũ, hay artifact đã đọc ở session trước. Local Preview là shortcut trên máy local, không phải định danh chuẩn. Nếu link local không mở được, lấy artifact bằng project + filename qua Open Design. Nếu cả artifact lẫn handoff không đủ để xác định thay đổi visual, dừng lại và nêu rõ khoảng trống; không tự suy diễn UI.

## Quy tắc screenshot sau code

- Screenshot sau code là bằng chứng QA bắt buộc, không phải source of truth.
- Tối thiểu chụp state chính ở desktop. Nếu handoff có nhiều `Hash/state cần verify`, phải chụp hoặc kiểm trực quan các state đó; với màn responsive phải có thêm mobile.
- Khi có khác biệt so với artifact, chỉ sửa implementation nếu artifact/handoff/SRS ủng hộ. Nếu phải đổi design, cập nhật Open Design + handoff/registry trước hoặc dừng để xin quyết định.
- Không commit screenshot vào repo theo mặc định. Agent phải báo trong final các viewport/state đã kiểm và đường dẫn ảnh tạm nếu cần review nhanh.

## Quy tắc hash/state handoff

- Màn nhiều view/state phải ghi rõ `Hash/state cần verify` trong file handoff.
- Agent code phải mở đúng hash/state từ artifact trước khi implement state tương ứng.
- Nếu handoff thiếu hash/state cho luồng đang code, dừng và cập nhật handoff/design trước khi implement.

## Thứ tự ưu tiên khi có mâu thuẫn UI

1. SRS
2. ADR Accepted
3. Solution/System Design
4. LLD và data dictionary
5. Design handoff đã duyệt
6. Open Design artifact đã duyệt
7. Mã nguồn hiện có

Design handoff quyết định layout, hierarchy, visual treatment và component behavior, nhưng không được tự thay đổi requirement, phân quyền, state machine, source of truth, schema hoặc performance policy.

## Mapping triển khai

| Design intent | Hướng code |
| --- | --- |
| Layout màn hình | Implement trong `web/src/features/<feature>/` nếu chỉ thuộc một feature; layout dùng chung đặt ở `web/src/app/` hoặc `web/src/components/`. |
| Component dùng chung | Dùng shadcn/ui hoặc component nội bộ trong `web/src/components/`, style bằng Tailwind token theo Cenio Core. |
| Component riêng màn hình | Đặt trong feature tương ứng, không đẩy lên shared khi chưa dùng lại. |
| Token/theme | Đặt token global trong `web/src/styles/`; không hard-code palette cục bộ nếu đã có token. |
| API data | UI gọi qua API client/hook; không truy cập trực tiếp Google Sheets/Drive. |
| State nghiệp vụ | Follow SRS/LLD; không tự thêm trạng thái mới chỉ vì design trông tiện hơn. |

## Quy tắc context, báo cáo và command

- UI không tự quyết định phạm vi dữ liệu. Mọi truy vấn dùng `ActorContext` và scope Branch/Warehouse do backend xác thực; không fallback sang dữ liệu rộng hơn khi scope không hợp lệ.
- Khi người dùng đổi Branch/Warehouse hoặc backend trả scope không hợp lệ, xoá context/view cache cũ, tải lại quyền và dữ liệu trước khi render kết quả mới.
- Với dashboard/report, hiển thị metadata backend trả về: `generatedAt`, `asOf`, `partitionCoverage`, `archiveIncluded`. Coverage một phần phải được diễn đạt là kết quả một phần, không phải báo cáo đầy đủ.
- “Dữ liệu cũ”, lỗi mạng và retry là trạng thái đọc/khôi phục. Không được suy diễn thành chế độ ghi offline hoặc đồng bộ sau mất Internet nếu SRS không quy định.
- Command đang chạy phải chặn gửi trùng, giữ nhãn action và chỉ hiển thị loading icon. Trước khi retry, tra cứu kết quả theo `commandId`/idempotency theo contract backend.
- Dữ liệu hoạt động gần đây chỉ được hiển thị khi có query/projection và permission contract đã duyệt. Không dùng Audit Log thay thế cho feed vận hành thông thường.

## Checklist verify UI

- [ ] Đúng màn hình/artifact `Approved` trong registry.
- [ ] Đã lấy artifact theo `Open Design project` + `Artifact chính`, và đã đối chiếu Local Preview trước khi code.
- [ ] Handoff có `Hash/state cần verify` hoặc danh sách state cần kiểm; đã mở đúng các state liên quan trên artifact.
- [ ] Layout, hierarchy, nội dung chính và CTA bám theo handoff.
- [ ] Light/dark theme hoạt động.
- [ ] Không dùng native `<select>` nếu handoff yêu cầu custom select/listbox.
- [ ] Loading, empty, error, restricted, scope invalid/changed, stale/retry, archive coverage và command-in-progress đầy đủ nếu handoff/SRS yêu cầu.
- [ ] Scope cũ không còn hiển thị sau khi đổi Branch/Warehouse hoặc backend từ chối phạm vi.
- [ ] Report/dashboard hiển thị đúng metadata freshness và coverage từ backend; không ngụ ý có offline write/sync.
- [ ] Không hiển thị dữ liệu sensitive nếu thiếu quyền.
- [ ] Responsive desktop/tablet/mobile không vỡ layout.
- [ ] Đã chụp screenshot implementation sau code ở desktop và các viewport/state handoff yêu cầu; đã đối chiếu với artifact/Local Preview.
- [ ] Không thêm nguồn dữ liệu, kênh bán, tích hợp hoặc nội dung ngoài requirement.
- [ ] Nếu thay đổi UI khác handoff, cập nhật handoff hoặc dừng để xin duyệt.
- [ ] Đã đối chiếu implementation với artifact/Local Preview ở light và dark theme trước khi hoàn tất.
