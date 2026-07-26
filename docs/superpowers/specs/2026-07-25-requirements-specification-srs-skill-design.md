# Thiết kế skill `requirements-specification-srs`

**Ngày:** 2026-07-25  
**Trạng thái:** Đã được duyệt để triển khai  
**Phạm vi:** Skill repo-scoped để thực hiện Requirements Specification và tạo/cập nhật SRS.

## 1. Mục tiêu

Tạo skill tái sử dụng cho giai đoạn Requirements Specification, sau Product Discovery/PRD. Skill giúp Codex chuyển mục tiêu sản phẩm, nghiên cứu liên quan và quyết định stakeholder thành SRS kiểm chứng được; không biến SRS thành thiết kế kỹ thuật hoặc mã nguồn.

## 2. Phạm vi và ranh giới

- Vị trí: `.agents/skills/requirements-specification-srs/`.
- Kích hoạt khi người dùng yêu cầu phân tích yêu cầu, Requirements Specification, tạo/cập nhật SRS hoặc chuẩn hóa yêu cầu nghiệp vụ để thiết kế/QA triển khai.
- Hỗ trợ SRS mới và cập nhật SRS hiện có. Mặc định dùng vị trí/quy ước docs của repository; nếu chưa có, đề xuất vị trí trước khi tạo thư mục.
- Dùng PRD đã có làm đầu vào. Nếu chưa có PRD hoặc Product Discovery chưa đủ, nêu rõ thiếu đầu vào và dùng skill Product Discovery & PRD trước thay vì tự suy đoán phạm vi sản phẩm.
- Có thể nghiên cứu thêm nguồn chính thức hoặc đối thủ khi một năng lực, quy tắc vận hành, ràng buộc nền tảng/pháp lý hoặc thuật ngữ chưa đủ rõ để đặc tả. Không lặp lại toàn bộ Product Discovery.
- Không tạo schema Sheet/database, API contract, kiến trúc, wireframe, backlog triển khai hoặc code trong phạm vi skill.

## 3. Cấu trúc

```text
.agents/skills/requirements-specification-srs/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── srs-checklist.md
    └── srs-template.md
```

`SKILL.md` giữ workflow và cổng kiểm soát ở mức ngắn gọn. `srs-checklist.md` cung cấp câu hỏi/rà soát theo ngữ cảnh; `srs-template.md` chứa khung đầu ra. Không thêm script ở phiên bản đầu vì kiểm tra quan trọng là tính đúng đắn ngữ nghĩa/liên miền, không chỉ là format cơ học.

## 4. Workflow bắt buộc

1. Đọc `AGENTS.md`, bản đồ cấu trúc và toàn bộ PRD/SRS/ADR/data model có liên quan.
2. Xác định output: SRS mới, cập nhật SRS hay chỉ phân tích chuẩn bị. Ghi nhận stakeholder, nguồn bắt buộc, phạm vi và đường dẫn đầu ra đã nêu.
3. Đọc checklist. Phân biệt evidence, inference, assumption và decision; chỉ nghiên cứu bổ sung cho điểm có ảnh hưởng đáng kể và chưa được đầu vào xác nhận.
4. Khi còn quyết định làm thay đổi trạng thái, thời điểm hạch toán, dữ liệu, quyền, bảo mật, phạm vi hoặc nghiệm thu, phỏng vấn **một câu mỗi lượt**. Không hỏi lại điều đã có trong tài liệu/cuộc trao đổi.
5. Trình bày cấu trúc SRS, module, quyết định đã chốt, assumption và ngoài phạm vi; với lựa chọn thực sự khác nhau, nêu 2–3 hướng và trade-off.
6. **Dừng và chờ người dùng phê duyệt rõ ràng** nghiên cứu/phạm vi/quyết định/cấu trúc trước khi tạo hoặc cập nhật SRS.
7. Sau phê duyệt, đọc template phù hợp, soạn SRS theo module hoặc một tệp theo độ lớn sản phẩm. Mỗi requirement có mã duy nhất; nội dung rủi ro cao phải có actor, tiền điều kiện, trạng thái/quy tắc, hậu quả, quyền, dữ liệu snapshot và tiêu chí nghiệm thu.
8. Tự rà: ID trùng/placeholder, trạng thái không hợp lệ, mâu thuẫn liên miền, thiếu ảnh hưởng tồn–tiền–công nợ/dữ liệu khi áp dụng, quyền/audit, NFR/bảo mật/backup, ngoài phạm vi, liên kết cục bộ. Cập nhật tài liệu cấu trúc/README/verifier nếu thêm cấu trúc docs theo quy ước repo.
9. Bàn giao ngắn gọn các tệp, quyết định, giả định/điểm mở và bước tiếp theo; không tự chuyển sang thiết kế kỹ thuật.

## 5. Chất lượng đầu ra

- SRS phải tách requirement, business rule, NFR, assumption và decision; không biến giả định thành requirement bắt buộc.
- Requirement dùng động từ, quan sát/kiểm thử được; không dùng “hỗ trợ đầy đủ”, “nhanh”, “an toàn” mà không có ngữ cảnh/tiêu chí.
- Trạng thái có chuyển hợp lệ, điều kiện, ngoại lệ và ảnh hưởng sổ cái/dữ liệu khi sản phẩm có giao dịch.
- SRS chỉ đưa vào yêu cầu đã được phê duyệt hoặc được ghi rõ là giả định cần chốt.
- Cấu trúc có thể thay đổi theo sản phẩm; không áp đặt bảy module của Sales Management cho mọi SRS.

## 6. Kế hoạch kiểm tra skill

Trước khi viết skill, chạy baseline với yêu cầu SRS đã có PRD nhưng thiếu quyết định ảnh hưởng trạng thái/thanh toán. Kết quả cần chứng minh agent không có skill có xu hướng viết SRS ngay hoặc bỏ qua quyết định mở. Sau khi có skill, chạy lại cùng tình huống với skill; agent phải đọc PRD, hỏi từng câu hoặc nêu rõ phần còn thiếu, trình bày cấu trúc/phạm vi và chờ phê duyệt.

Kiểm tra kỹ thuật gồm `quick_validate.py`, kiểm tra YAML metadata, scan placeholder và xác nhận `openai.yaml` phù hợp SKILL. Không forward-test nếu việc đó tạo/chỉnh sửa tài liệu sản phẩm thật; chỉ dùng tình huống không ghi file.
