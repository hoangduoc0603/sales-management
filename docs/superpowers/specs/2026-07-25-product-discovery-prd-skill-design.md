# Thiết kế skill `product-discovery-prd`

## Mục tiêu

Tạo một skill chỉ dùng trong repository này, giúp Codex thực hiện nhất quán pha Product Discovery và tạo PRD. Skill tái sử dụng quy trình đã áp dụng cho ứng dụng quản lý bán hàng: làm rõ mục tiêu trước, nghiên cứu nguồn tham chiếu, phân biệt dữ kiện với suy luận, chốt phạm vi với người dùng rồi mới viết tài liệu.

## Vị trí và phạm vi

- Vị trí: `.agents/skills/product-discovery-prd/`.
- Phạm vi phát hiện: repository hiện tại và các thư mục con theo cơ chế repo-scoped skills của Codex.
- Phạm vi nghiệp vụ hiện tại: Product Discovery và PRD; không thực hiện SRS, data model, kiến trúc chi tiết, UI hay code.
- Ngôn ngữ đầu ra: theo quy ước repository hoặc yêu cầu người dùng; mặc định tiếng Việt khi dự án không quy định khác.

## Hành vi kích hoạt

Skill phải mô tả rõ các tình huống sau trong frontmatter: nghiên cứu sản phẩm/đối thủ/thị trường, Product Discovery, phân tích yêu cầu nghiệp vụ, xác định phạm vi sản phẩm, hoặc tạo/cập nhật PRD. Skill không tự kích hoạt chỉ vì người dùng yêu cầu SRS, data model, kiến trúc hay lập trình nếu không có yêu cầu Product Discovery/PRD liên quan.

## Quy trình

1. Đọc `AGENTS.md`, cấu trúc repository và tài liệu sản phẩm hiện có.
2. Xác định những thông tin bắt buộc còn thiếu: mục tiêu kinh doanh, khách hàng mục tiêu, mô hình thương mại, kênh/luồng, ranh giới phát hành, ràng buộc, nguồn tham chiếu và nơi lưu tài liệu.
3. Phỏng vấn từng câu một khi thông tin đó có thể làm thay đổi đáng kể phạm vi; không hỏi lại điều người dùng đã cung cấp.
4. Lập kế hoạch nghiên cứu theo giả thuyết cần kiểm chứng. Ưu tiên nguồn chính thức/sơ cấp, tuân thủ yêu cầu nguồn cụ thể của người dùng và ghi URL trực tiếp.
5. Tách rõ trong ghi chú: dữ kiện có nguồn, suy luận từ dữ kiện, giả định cần người dùng xác nhận và quyết định đã chốt.
6. Đưa ra 2–3 cách tổ chức/phạm vi khi có lựa chọn thực sự, kèm khuyến nghị có lý do.
7. Trình bày phạm vi PRD, các module, ranh giới và cấu trúc tài liệu; **bắt buộc chờ người dùng duyệt** trước khi tạo/cập nhật PRD.
8. Viết PRD dựa trên template; mã hóa yêu cầu để truy vết và không biến danh sách tính năng thành lời hứa vô kiểm soát.
9. Tự rà: nguồn/citation, tính nhất quán, `TODO`/mơ hồ, yêu cầu trùng, phạm vi ngoài tài liệu, tiêu chí nghiệm thu và liên kết với quy ước thư mục.
10. Báo cáo tài liệu đã tạo, nghiên cứu đã dùng, các quyết định còn mở và bước kế tiếp hợp lý.

## Cấu trúc skill

```text
.agents/skills/product-discovery-prd/
  SKILL.md
  agents/
    openai.yaml
  references/
    research-checklist.md
    prd-template.md
```

- `SKILL.md`: workflow bắt buộc, quy tắc hỏi–duyệt–viết, ranh giới và tiêu chuẩn chất lượng; giữ ngắn để tải nhanh.
- `references/research-checklist.md`: chiến lược nguồn, bảng trích xuất cạnh tranh, cách tách evidence/inference/assumption và checklist nghiên cứu.
- `references/prd-template.md`: khung PRD, quy ước mã yêu cầu, bảng yêu cầu và checklist tự rà.
- `agents/openai.yaml`: metadata giao diện tối thiểu để skill dễ nhận biết; không yêu cầu tool đặc biệt vì chỉ dùng công cụ đã sẵn có trong môi trường.

Không dùng script ở phiên bản đầu: nhiệm vụ phụ thuộc mạnh vào ngữ cảnh và đánh giá chuyên môn, trong khi checklist/template đủ để ổn định hành vi. Có thể thêm validator sau khi nhiều PRD lặp lại cho thấy một lỗi cơ học rõ ràng.

## Tiêu chí chấp nhận

1. Frontmatter kích hoạt đúng cho Product Discovery/PRD và không tuyên bố làm SRS hoặc code.
2. Skill luôn khám phá quy ước dự án trước khi tạo tài liệu.
3. Skill không viết PRD trước khi người dùng duyệt phạm vi/tóm tắt nghiên cứu.
4. PRD kết quả có đủ: bối cảnh, nghiên cứu, khách hàng, phạm vi, yêu cầu chức năng/phi chức năng, quy tắc, luồng, nghiệm thu, rủi ro/giả định và quyết định tiếp theo.
5. Dữ kiện bên ngoài có URL trực tiếp; suy luận không được trình bày như sự thật nguồn.
6. `quick_validate.py` xác nhận cấu trúc/frontmatter skill hợp lệ.

## Mở rộng sau này

Khi đã thực hiện và đánh giá các pha tiếp theo, mở rộng bằng các skill riêng hoặc bổ sung có kiểm soát cho SRS, data model, architecture, UX specification và implementation planning. Không mở rộng phạm vi hiện tại trước khi có quy trình thực tế để đúc kết.
