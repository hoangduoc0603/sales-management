# Khung PRD

Chỉ dùng các phần phù hợp. Giữ tài liệu đủ chi tiết để làm đầu vào cho SRS và thiết kế, nhưng không biến PRD thành schema hoặc hướng dẫn code.

```markdown
# PRD — <Tên sản phẩm>

| Thuộc tính | Giá trị |
| --- | --- |
| Trạng thái | Draft / Đã chốt phạm vi |
| Phiên bản | 0.1 |
| Cập nhật | YYYY-MM-DD |
| Owner | <vai trò/người phụ trách> |

## 1. Mục tiêu tài liệu

Nêu mục đích, ai dùng tài liệu và các tài liệu/lớp công việc nó làm đầu vào.

## 2. Bối cảnh, vấn đề và định vị

Nêu vấn đề vận hành, giá trị sản phẩm, mô hình thương mại và ranh giới giải pháp.

## 3. Nghiên cứu tham chiếu

| Nguồn/sản phẩm | Dữ kiện có nguồn | Hàm ý/suy luận cho sản phẩm |
| --- | --- | --- |

Đặt URL trực tiếp gần dữ kiện. Nêu rõ nội dung chưa xác nhận công khai.

## 4. Khách hàng, persona và tình huống sử dụng

Mô tả người mua, người dùng, vai trò, mục tiêu và các tình huống/lần sử dụng quan trọng.

## 5. Quyết định phạm vi đã phê duyệt

Liệt kê quyết định đã được người dùng/stakeholder phê duyệt. Không lẫn với giả định.

## 6. Phạm vi và ngoài phạm vi

| Lớp | Bao gồm | Lý do |
| --- | --- | --- |
| Lõi | | |
| Cấu hình/mở rộng | | |
| Ngoài phạm vi | | |

## 7. Yêu cầu chức năng

### <Phân hệ>

| ID | Yêu cầu kiểm chứng được | Ưu tiên/phạm vi |
| --- | --- | --- |
| FR-<MODULE>-001 | <Actor, điều kiện, hành vi và kết quả khi cần> | Lõi |

## 8. Quy tắc nghiệp vụ

| ID | Quy tắc | Lý do/tác động |
| --- | --- | --- |
| BR-001 | | |

## 9. Luồng nghiệp vụ trọng yếu

Mô tả theo chuỗi: actor → hành động → kiểm tra → kết quả → dữ liệu/chứng từ phát sinh. Nêu ngoại lệ quan trọng.

## 10. Yêu cầu phi chức năng và ràng buộc

| ID | Yêu cầu/ràng buộc kiểm chứng được | Nguồn hoặc lý do |
| --- | --- | --- |
| NFR-001 | | |

## 11. Tiêu chí nghiệm thu cấp sản phẩm

Liệt kê các kịch bản chứng minh người dùng có thể vận hành sản phẩm như đã hứa.

## 12. Rủi ro, giả định và quyết định cần chốt tiếp

Tách rõ rủi ro, assumption chưa xác nhận và quyết định cần ADR/SRS/thiết kế xử lý tiếp.
```

## Quy tắc viết requirements

- Mỗi mã chỉ dùng một lần. Dùng `FR-<MODULE>-NNN`, `BR-NNN`, `NFR-NNN`.
- Dùng động từ, actor, điều kiện và kết quả quan sát được; tránh “hỗ trợ đầy đủ”, “thân thiện”, “nhanh” khi không có tiêu chí.
- Tách yêu cầu chức năng khỏi lựa chọn kiến trúc. Ví dụ “lưu audit log bất biến” là yêu cầu; tên bảng/công nghệ lưu là thiết kế sau.
- Dùng ngoài phạm vi để bảo vệ lời hứa sản phẩm. Những mục này là đầu vào roadmap, không phải cam kết ngầm.

## Tự rà PRD

- Có tất cả phần cần thiết hoặc lý do loại bỏ rõ ràng.
- Không có `TODO`, `TBD`, placeholder, mã trùng hay câu mơ hồ.
- Mọi tuyên bố thị trường/đối thủ quan trọng có URL trực tiếp.
- Quy tắc, luồng, yêu cầu và nghiệm thu không mâu thuẫn phạm vi đã duyệt.
- Các quyết định chưa đủ thông tin để code được tách ra thành bước tiếp theo.
