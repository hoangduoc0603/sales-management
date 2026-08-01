# SRS — Danh mục, khách hàng và chính sách thương mại

**Phụ thuộc:** [`overview.md`](overview.md), [`sales-orders.md`](sales-orders.md), [`inventory.md`](inventory.md)  
**Tiền tố yêu cầu:** `SRS-CRM`

## 1. Danh mục hàng hóa

### SRS-CRM-001 — Cấu trúc danh mục

Hệ thống phải quản lý nhóm hàng nhiều cấp, thương hiệu, thuộc tính, đơn vị tính, vị trí kệ, tồn tối thiểu, trạng thái kinh doanh, mô tả, ảnh và ghi chú. Product có loại `Stocked`, `Service`, `NonStock` hoặc `Bundle`; mỗi Product có một hoặc nhiều variant. Variant là đối tượng có SKU, barcode, giá, tồn, lô/serial và trạng thái độc lập khi áp dụng. Product/variant đã có chứng từ chỉ được ngừng hoạt động/lưu trữ, không xóa cứng.

### SRS-CRM-002 — SKU, barcode và tìm kiếm

SKU phải duy nhất trong tenant không phân biệt hoa/thường. Barcode phải duy nhất trong phạm vi quy tắc tenant và không được ghi đè barcode nhà sản xuất khi tạo barcode nội bộ. Hệ thống hỗ trợ một barcode cho variant/đơn vị bán quy đổi, tìm theo SKU/barcode/tên, và hiển thị rõ variant/đơn vị để tránh bán nhầm.

### SRS-CRM-003 — Đơn vị quy đổi

Mỗi variant có một đơn vị cơ bản và nhiều đơn vị quy đổi có hệ số dương. Chứng từ phải lưu đơn vị giao dịch, hệ số và quantity quy về đơn vị cơ bản. Chỉ đơn vị đánh dấu được bán/mua mới xuất hiện trong luồng tương ứng. Không được sửa hệ số quy đổi làm diễn giải lại chứng từ cũ; thay đổi về sau tạo phiên bản có hiệu lực mới hoặc unit mới.

### SRS-CRM-004 — Loại hàng, lô và serial

Product/variant phải xác định có quản lý tồn, lô–hạn dùng và serial/IMEI không. Không được tắt cờ lô/serial nếu còn tồn hoặc lịch sử cần truy vết mà không qua quy trình archive/migration được duyệt. Với hàng không quản lý tồn và dịch vụ, POS không kiểm tồn nhưng vẫn snapshot giá/thuế. Với serial, serial bán ra phải thuộc đúng variant và Warehouse.

### SRS-CRM-005 — Combo/bundle

Bundle phải có công thức thành phần gồm variant, quantity cơ bản, quy tắc thay thế nếu có và hiệu lực. Giá Bundle có thể độc lập với tổng giá thành phần. Khi đơn bán Bundle hoàn tất, hệ thống snapshot công thức và trừ tồn từng thành phần; nếu một thành phần thiếu tồn, Bundle không thể Completed trừ ngoại lệ âm kho hợp lệ. Bundle không tự tạo tồn thành phẩm ở bản đầu.

### SRS-CRM-006 — Import danh mục và tem barcode

Import product/variant phải dùng file mẫu Excel/CSV, staging kiểm tra trước khi ghi, báo lỗi theo dòng, chống trùng SKU/barcode/serial và cho user tải kết quả. Import hợp lệ không được tạo một phần âm thầm: user phải chọn chỉ import dòng hợp lệ hoặc hủy toàn bộ batch; quyết định và kết quả lưu trên ImportBatch cùng `requestedBy/committedBy`. Hệ thống hỗ trợ in/xuất tem barcode cho product/variant/đơn vị theo quyền.

## 2. Khách hàng

### SRS-CRM-007 — Hồ sơ và chống trùng

Khách có mã, tên, điện thoại, email, địa chỉ, ngày sinh, nhóm, trạng thái, người phụ trách và ghi chú. Tenant cấu hình kiểm tra trùng theo điện thoại và/hoặc email; khi phát hiện, user phải chọn dùng hồ sơ hiện có hoặc tạo mới với lý do nếu có quyền. Gộp khách chỉ dành cho Manager/Owner, phải giữ lịch sử đơn/công nợ/điểm và lưu nguồn–đích cùng `mergedBy/mergedAt`.

### SRS-CRM-008 — Nhóm khách và chính sách khách

Nhóm khách có thể gán thủ công hoặc tính theo điều kiện doanh số, số lần mua, điểm, khu vực hoặc công nợ. Hệ thống snapshot nhóm/chính sách đã áp dụng ở đơn; việc khách đổi nhóm không thay đổi đơn cũ. Khách ngừng hoạt động không được chọn cho đơn mới trừ Manager duyệt ngoại lệ có lý do và actor metadata.

## 3. Bảng giá và khuyến mại

### SRS-CRM-009 — Bảng giá

Bảng giá có tên, trạng thái, hiệu lực, Branch áp dụng, nhóm khách áp dụng, tiền tệ VND và các dòng product/variant/đơn vị. Một dòng giá phải có khoảng hiệu lực không mơ hồ; khi nhiều dòng cùng có hiệu lực tại cùng mức ưu tiên, hệ thống chặn publish hoặc yêu cầu Owner chọn rõ dòng ưu tiên. Thay đổi giá tạo lịch sử có hiệu lực về sau, không sửa snapshot đơn cũ.

### SRS-CRM-010 — Điều kiện và loại promotion

Promotion hỗ trợ tối thiểu: giảm theo hàng, giảm theo hóa đơn, mua X tặng Y, tặng điểm và voucher/coupon. Mỗi promotion phải có điều kiện thời gian, scope Branch, nhóm khách/hàng, ngưỡng số lượng/giá trị, giới hạn lượt dùng/toàn tenant/mỗi khách, giá trị giảm, ngân sách khi dùng và trạng thái. Voucher có mã, hiệu lực, số lượt, điều kiện và usage record có `redeemedBy/redeemedAt`. Promotion hết hạn/ngừng không áp dụng cho đơn mới nhưng vẫn hiển thị snapshot trên đơn cũ.

### SRS-CRM-011 — Thứ tự áp dụng giá và chống cộng dồn

Hệ thống xác định giá cuối bằng thứ tự cố định:

```text
Giá sản phẩm/variant
→ Bảng giá Branch
→ Bảng giá nhóm khách
→ Một promotion tự động có lợi nhất
→ Voucher hoặc điểm
```

Promotion tự động không cộng dồn với promotion tự động khác. Voucher/điểm chỉ dùng nếu điều kiện cho phép và không làm tổng dòng/đơn âm. “Có lợi nhất” được tính theo giá trị giảm tuyệt đối của toàn đơn sau các bước trước; nếu bằng nhau, dùng promotion có `priority` số nhỏ hơn, sau đó ID nhỏ hơn để cho kết quả xác định. Hệ thống phải hiển thị policy được chọn và lý do từ chối policy khác.

### SRS-CRM-012 — Giá thủ công

Giá thủ công/chiết khấu thủ công chỉ được áp dụng sau khi giá/promotion tự động đã tính. User phải có quyền riêng; hệ thống phải xác nhận việc thay thế giá, ghi lý do và áp dụng workflow duyệt khi vượt ngưỡng Owner cấu hình. Giá thủ công không được làm mất dòng snapshot promotion đã từng đủ điều kiện; hệ thống lưu rõ promotion bị bỏ qua do giá thủ công.

## 4. Tích điểm, bảo hành và hoa hồng

### SRS-CRM-013 — Sổ cái điểm

Điểm khách hàng phải dùng ledger tăng/giảm bất biến, có nguồn đơn/return/điều chỉnh, quy tắc quy đổi, thời điểm có hiệu lực và hết hạn. Điểm chỉ được dùng trong số dư khả dụng; trả hàng phải đảo/điều chỉnh điểm đã cấp hoặc điểm đã dùng theo quan hệ đơn gốc. Điều chỉnh điểm tay cần quyền, lý do và actor metadata.

### SRS-CRM-014 — Bảo hành

Bảo hành phải lưu chính sách/thời hạn snapshot tại lúc bán, product/serial khi có, khách, đơn gốc, ngày tiếp nhận, trạng thái `Received → InProgress → Completed | Rejected`, kết quả, ghi chú và file đính kèm. Bảo hành không tự tạo bút toán tồn/tiền nếu tenant chưa cấu hình workflow nghiệp vụ tương ứng.

### SRS-CRM-015 — Hoa hồng cơ bản

Tenant có thể cấu hình hoa hồng theo nhân viên, nhóm hàng hoặc product, theo tỷ lệ hoặc số tiền, trong khoảng hiệu lực. Hệ thống snapshot quy tắc và giá trị hoa hồng khi đơn có hiệu lực; hủy/return phải đảo giá trị liên quan theo số lượng/giá trị trả. Bản đầu chỉ báo cáo/xuất hoa hồng đã duyệt, không tính lương/chấm công.

## 5. Tiêu chí nghiệm thu trọng yếu

| Mã | Kịch bản kiểm thử | Kết quả bắt buộc |
| --- | --- | --- |
| CRM-AT-01 | Import hai dòng có SKU trùng. | Báo lỗi theo dòng, không tạo SKU trùng; ImportBatch lưu kết quả và người thực hiện. |
| CRM-AT-02 | Bán Bundle có thành phần thiếu tồn. | POS chặn Completed hoặc yêu cầu ngoại lệ âm kho; không trừ Bundle như một tồn độc lập. |
| CRM-AT-03 | Một khách có bảng giá nhóm và hai promotion tự động hợp lệ. | Chỉ bảng giá ưu tiên và một promotion lợi nhất được áp dụng; lý do hiển thị/snapshot. |
| CRM-AT-04 | Hai promotion cho cùng giá trị giảm. | Hệ thống chọn priority thấp hơn, sau đó ID nhỏ hơn; kết quả lặp lại xác định. |
| CRM-AT-05 | Dùng điểm rồi trả một phần đơn. | Ledger điểm được điều chỉnh theo return, không cho số dư khả dụng sai hoặc âm. |
| CRM-AT-06 | Gộp hai khách đã có đơn/công nợ. | Lịch sử được giữ và truy vết nguồn–đích; thao tác không xóa chứng từ. |
