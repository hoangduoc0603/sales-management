---
name: product-discovery-prd
description: Nghiên cứu sản phẩm, đối thủ, thị trường và yêu cầu nghiệp vụ để thực hiện Product Discovery và tạo hoặc cập nhật PRD. Use when the user asks to research a product, analyse business requirements, define product scope, compare competitor software, or write a PRD. Do not use for SRS, data model, architecture, UI specification, or implementation unless Product Discovery or PRD is explicitly in scope.
---

# Product Discovery & PRD

Thực hiện pha Product Discovery có bằng chứng và tạo PRD đủ làm đầu vào cho SRS/thiết kế sau này. Không tự mở rộng sang thiết kế kỹ thuật hoặc code.

## Nguyên tắc bắt buộc

- Đọc `AGENTS.md`, cấu trúc thư mục và tài liệu sản phẩm hiện có trước khi đề xuất hoặc tạo tệp.
- Tôn trọng quy ước dự án và yêu cầu trực tiếp của người dùng. Dùng ngôn ngữ mà dự án hoặc người dùng yêu cầu.
- Không hỏi lại thông tin người dùng đã cung cấp. Khi còn thiếu một thông tin có thể thay đổi đáng kể phạm vi, hỏi **một câu mỗi lượt**.
- Không tạo hoặc cập nhật PRD trước khi người dùng phê duyệt rõ ràng bản tổng hợp nghiên cứu, phạm vi và cấu trúc PRD.
- Phân biệt dữ kiện có nguồn, suy luận, giả định và quyết định đã chốt. Không trình bày suy luận hay việc không tìm thấy thông tin như sự thật.
- Không sao chép nội dung, giao diện, tuyên bố marketing hoặc thiết kế độc quyền của đối thủ.

## Quy trình

### 1. Khám phá bối cảnh

1. Đọc hướng dẫn dự án và kiểm tra các PRD, SRS, ADR, data model, roadmap hoặc tài liệu liên quan đã có.
2. Xác định output cần làm: PRD mới, PRD cập nhật, hay chỉ nghiên cứu để chuẩn bị PRD.
3. Ghi nhận mục tiêu kinh doanh, khách hàng, mô hình thương mại, ràng buộc, nguồn bắt buộc và đường dẫn đầu ra nếu người dùng đã nêu.
4. Nếu còn thiếu thông tin trọng yếu, thực hiện brainstorming/phỏng vấn ngắn; hỏi một câu ở mỗi lượt. Ưu tiên câu hỏi về khách hàng mục tiêu, vấn đề cần giải quyết, phạm vi phát hành, kênh vận hành và ràng buộc có tác động lớn.

### 2. Nghiên cứu có bằng chứng

Đọc [research-checklist.md](references/research-checklist.md) trước khi bắt đầu khảo cứu.

1. Lập danh sách câu hỏi nghiên cứu và các giả thuyết cần kiểm chứng.
2. Dùng nguồn người dùng yêu cầu trước. Với thông tin hiện hành, cạnh tranh, pháp lý, giá, tính năng hoặc giới hạn nền tảng, tra cứu web và ưu tiên nguồn chính thức/sơ cấp.
3. Ghi URL trực tiếp, ngày khảo cứu và phần nội dung hỗ trợ từng kết luận. Khi nguồn không xác nhận một khả năng, ghi “chưa xác nhận công khai”, không kết luận “không có”.
4. Tổng hợp theo vấn đề vận hành, luồng nghiệp vụ, năng lực và giới hạn; không theo bố cục trang marketing của đối thủ.

### 3. Chốt phạm vi trước khi viết

1. Tách bảng gồm: evidence, inference, assumption cần xác nhận và decision đã chốt.
2. Khi tồn tại các hướng triển khai/phạm vi thực sự khác nhau, trình bày 2–3 hướng, trade-off và khuyến nghị.
3. Trình bày định vị, persona, module lõi, module cấu hình, ngoài phạm vi, rủi ro và cấu trúc PRD dự kiến.
4. **Dừng và chờ người dùng phê duyệt rõ ràng.** Không tạo/cập nhật PRD chỉ vì người dùng đã yêu cầu nghiên cứu ban đầu.

### 4. Viết hoặc cập nhật PRD

Chỉ thực hiện sau khi được phê duyệt. Đọc [prd-template.md](references/prd-template.md) và điều chỉnh theo quy ước repository.

1. Dùng đường dẫn người dùng chỉ định. Nếu chưa có, dùng vị trí đã được quy ước trong repository; nếu chưa rõ, đề xuất vị trí và xin xác nhận trước khi tạo thư mục mới.
2. Viết yêu cầu theo kết quả đã chốt, không nhét tất cả ý tưởng thị trường vào phạm vi phát hành.
3. Gán mã duy nhất theo nhóm: `FR-<MODULE>-NNN`, `NFR-NNN`, `BR-NNN`. Viết yêu cầu kiểm chứng được, nêu actor/điều kiện/kết quả khi cần.
4. Ghi nguồn trực tiếp gần phần nghiên cứu tham chiếu. Nêu rõ đâu là suy luận từ nguồn.
5. Liệt kê các quyết định cần chốt tiếp để chuyển sang SRS, data model, kiến trúc hoặc UX; không tự viết các tài liệu đó trong scope skill này.

### 5. Tự rà và bàn giao

1. Kiểm tra không còn `TODO`, `TBD`, placeholder, yêu cầu trùng mã, mâu thuẫn phạm vi hoặc tính năng không có căn cứ.
2. Kiểm tra PRD có bối cảnh, evidence, khách hàng, phạm vi/ngoài phạm vi, requirements, quy tắc, luồng, tiêu chí nghiệm thu, rủi ro và quyết định mở.
3. Nếu thay đổi cấu trúc thư mục, cập nhật tài liệu cấu trúc, README và verifier theo `AGENTS.md`, rồi chạy kiểm tra phù hợp.
4. Báo cáo ngắn: tệp đã tạo/cập nhật, nhóm nguồn đã nghiên cứu, quyết định đã chốt, giả định/điểm mở và bước tiếp theo hợp lý.

## Ranh giới

- Không tạo SRS, schema/bảng dữ liệu, API contract, kiến trúc chi tiết, wireframe, backlog triển khai hoặc code trừ khi người dùng mở rộng phạm vi bằng một yêu cầu mới.
- Không khẳng định tuân thủ pháp lý, thuế, bảo mật hay khả năng mở rộng chỉ từ tài liệu marketing; dùng nguồn có thẩm quyền và nêu giới hạn.
- Không dùng bảng tính hoặc tài liệu người dùng làm nơi lưu secret.
