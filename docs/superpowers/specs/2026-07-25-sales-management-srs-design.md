# Thiết kế bộ SRS — Ứng dụng quản lý bán hàng

**Ngày:** 2026-07-25  
**Trạng thái:** Đã được duyệt để soạn SRS  
**Cơ sở:** `docs/product/PRD.md`, nghiên cứu đối thủ và các quyết định nghiệp vụ đã xác nhận.

## 1. Mục tiêu

Tạo bộ **Software Requirements Specification (SRS)** đủ chặt chẽ để làm căn cứ thiết kế dữ liệu, UI/UX, kiến trúc Apps Script và kiểm thử cho ứng dụng quản lý bán hàng bán lẻ tổng quát. SRS không mô tả cách cài đặt React, Apps Script hay Google Sheets ở mức mã nguồn; các nội dung đó thuộc các tài liệu kiến trúc và thiết kế kỹ thuật tiếp theo.

## 2. Phương án tài liệu được chọn

SRS được tách theo miền nghiệp vụ, với một tệp tổng quan làm nguồn quy tắc dùng chung. Cách này thay cho một tệp SRS duy nhất rất dài, vì bán hàng, kho, tài chính và quyền có vòng đời thay đổi khác nhau nhưng vẫn cần dùng chung thuật ngữ và mã yêu cầu.

```text
docs/product/srs/
├── overview.md
├── sales-orders.md
├── inventory.md
├── purchasing.md
├── customers-promotions.md
├── finance.md
└── access-reporting.md
```

Mỗi yêu cầu sẽ có mã ổn định, phạm vi áp dụng, tiền điều kiện, luồng chính/ngoại lệ khi cần, quy tắc nghiệp vụ, quyền, dữ liệu cần lưu và tiêu chí nghiệm thu có thể kiểm thử. Liên kết chéo chỉ dùng mã yêu cầu thay vì sao chép quy tắc.

## 3. Phân rã nội dung

| Tài liệu | Trách nhiệm |
| --- | --- |
| `overview.md` | Bối cảnh, phạm vi, thuật ngữ, actor, ràng buộc nền tảng, yêu cầu phi chức năng, nguyên tắc toàn vẹn/bảo mật/backup và quy ước mã. |
| `sales-orders.md` | POS, đơn online nhập tay, giá–thuế–khuyến mại áp dụng trên đơn, thanh toán bán hàng, trả/đổi hàng, in phiếu và trạng thái đơn. |
| `inventory.md` | Sổ cái tồn, giá vốn bình quân gia quyền di động, reservation, âm kho, chuyển kho, kiểm kho, điều chỉnh, lô–hạn và serial/IMEI. |
| `purchasing.md` | Nhà cung cấp, đơn mua, nhận hàng, giá vốn/chi phí mua, trả hàng nhà cung cấp và công nợ phải trả phát sinh từ mua hàng. |
| `customers-promotions.md` | Danh mục hàng hóa, khách hàng, bảng giá, khuyến mại, voucher, tích điểm, bảo hành và hoa hồng cơ bản. |
| `finance.md` | Quỹ/tài khoản, thu–chi, công nợ, phân bổ thanh toán, ca bán/két tiền, chi phí, đối soát và đảo chứng từ tài chính. |
| `access-reporting.md` | Tài khoản nội bộ, RBAC theo tenant/chi nhánh/kho, audit, dashboard/báo cáo, import/export và vận hành dữ liệu. |

## 4. Quy tắc nghiệp vụ đã chốt

### 4.1 Mô hình tổ chức và tồn kho

- Dữ liệu hỗ trợ đa chi nhánh–đa kho ngay từ đầu; tenant mới có sẵn một chi nhánh và một kho.
- Giá vốn dùng **bình quân gia quyền di động**. Mỗi nhập tăng tồn hợp lệ tính lại giá vốn bình quân; xuất kho/bán/điều chỉnh giảm chốt giá vốn ở thời điểm phát sinh.
- POS trừ tồn khi hoàn tất bán. Đơn online nhập tay: xác nhận thì giữ hàng; giao/đưa cho đơn vị vận chuyển thì trừ tồn thực tế; hủy trước giao thì giải phóng giữ hàng; hàng trả chỉ nhập lại sau khi nhận và kiểm tra.
- Mặc định chặn âm kho. Manager/Owner có thể duyệt ngoại lệ theo kho, bắt buộc lý do và audit.
- Hàng trả mặc định vào kho chờ kiểm/quarantine; chỉ trở lại kho bán được sau quyết định kiểm tra.
- Chuyển kho giảm tồn kho nguồn lúc xuất chuyển; chỉ tăng tồn bán được tại kho đích lúc nhận. Kiểm kho không khóa bán; số hệ thống được chốt lúc mở phiên, giao dịch sau đó được tách để đối chiếu.

### 4.2 Bán hàng, tiền và giá

- POS: `Draft → Completed | Cancelled`; trạng thái thanh toán độc lập. Đơn online: `Draft → Confirmed → Packing → Shipped → Delivered | Cancelled`; trả hàng là luồng riêng.
- Doanh thu/công nợ phát sinh khi POS hoàn tất hoặc đơn online xuất giao; không phụ thuộc việc đã thu đủ tiền.
- Một khoản thu/chi được phân bổ cho một hoặc nhiều nghĩa vụ. Trả tiền dư của khách là tín dụng trả trước, không phải công nợ âm. Khoản đã duyệt chỉ được đảo bằng chứng từ đối ứng.
- Giá áp dụng theo thứ tự: giá sản phẩm/biến thể → bảng giá chi nhánh → giá nhóm khách → một khuyến mại tự động tốt nhất → voucher/điểm. Không cộng dồn khuyến mại tự động; đổi giá thủ công cần quyền và có ngưỡng duyệt.
- Giá bán mặc định gồm VAT; tenant cấu hình giá mua/bán gồm hoặc chưa gồm VAT. Chiết khấu trước thuế, tính và làm tròn VAT từng dòng theo VND, sau đó cộng đơn.
- Chỉ dùng VND, làm tròn tiền đến đồng; số lượng tối đa 3 chữ số thập phân và sản phẩm quyết định có cho phép số lượng lẻ.

### 4.3 Kiểm soát và vận hành

- Phạm vi quyền ban đầu là tenant, chi nhánh và kho. Giá vốn/lợi nhuận, công nợ, quỹ/két và xuất dữ liệu là các quyền độc lập.
- Mỗi thu ngân chỉ mở một ca tại một két tại một thời điểm. POS yêu cầu ca mở; ca đã đóng/khóa không mở lại, điều chỉnh bằng chứng từ mới của Manager/Owner.
- Manager duyệt các ngoại lệ vận hành theo ngưỡng Owner cấu hình: âm kho, giảm giá cao, trả không có đơn, kiểm kê/điều chỉnh/hủy tồn, chênh ca và đảo thanh toán.
- Quy mô thiết kế tối thiểu: 5 chi nhánh, 10 kho, 20 người dùng hoạt động đồng thời, 10.000 SKU/biến thể đang dùng và khoảng 300 đơn/ngày/tenant; cần cơ chế archive lịch sử.
- Ứng dụng đăng nhập bằng `loginId` nội bộ (tên tài khoản hoặc email) và mật khẩu; email chỉ là định danh, không xác thực qua Google. Cài đặt tạo tài khoản admin mặc định và bắt buộc đổi mật khẩu lần đầu. Không có quên mật khẩu tự phục vụ; admin đặt lại mật khẩu.
- Khóa tài khoản 15 phút sau 5 lần đăng nhập sai; tự đăng xuất sau 1 giờ không hoạt động; phiên tối đa 8 giờ.
- Nhân viên thao tác qua ứng dụng, không sửa Sheet gốc. Chủ sở hữu Google vẫn sở hữu tài liệu nhưng chỉnh trực tiếp dữ liệu nghiệp vụ nằm ngoài luồng hỗ trợ.
- Không xóa vật lý dữ liệu đã có giao dịch; dùng ngừng hoạt động/lưu trữ. Chứng từ đã duyệt chỉ được hủy hoặc đảo/điều chỉnh, không sửa/xóa.
- Dùng lịch sử phiên bản Google như lớp khôi phục nhanh; đồng thời sao lưu bản chụp hằng ngày vào Drive, giữ 30 bản; Owner sao lưu/khôi phục thủ công, khôi phục phải xác nhận và audit.
- In qua trình duyệt với mẫu K80 và A4; không tích hợp driver/API máy in. Không phát hành hóa đơn điện tử ký số ở bản đầu.

## 5. Yêu cầu chất lượng của SRS

- Không để `TBD`, “cần xem xét” hoặc quy tắc mơ hồ trong yêu cầu bắt buộc.
- Tách rõ bắt buộc, cấu hình được và ngoài phạm vi bản đầu.
- Diễn đạt trạng thái như máy trạng thái: hành động chuyển, điều kiện, hậu quả tồn/doanh thu/công nợ và trường hợp hủy/đảo.
- Nêu rõ dữ liệu snapshot để báo cáo lịch sử không thay đổi khi danh mục, giá hay thuế được sửa sau đó.
- Thể hiện rõ ràng các giới hạn Apps Script/Sheets: xử lý có khóa khi ghi, idempotency cho thao tác nhạy cảm, audit, archive; không lưu dữ liệu nghiệp vụ trong Properties Service. Secret cấu hình chỉ được đặt ở kho thuộc tính bảo vệ phù hợp, không ở source code hoặc Google Sheets.
- Mỗi module có danh sách tiêu chí nghiệm thu để đội phát triển và QA kiểm thử độc lập.

## 6. Ngoài phạm vi SRS này

- Thiết kế schema Sheet chi tiết, API contract, wireframe, migration, chiến lược test tự động và kiến trúc mã nguồn.
- Đồng bộ thương mại điện tử, sàn, vận chuyển, ngân hàng, hóa đơn điện tử ký số, SMS/Zalo/email marketing, F&B, sản xuất và kế toán tổng hợp.
- Xác thực Google/OAuth như cơ chế đăng nhập người dùng ứng dụng.

## 7. Rủi ro và cách kiểm soát trong đặc tả

| Rủi ro | Cách SRS xử lý |
| --- | --- |
| Ghi đồng thời trên Sheets làm sai tồn/tiền | Quy định khóa ghi, idempotency, sổ cái bất biến và tiêu chí nghiệm thu đối soát. |
| Khôi phục bản sao làm mất giao dịch mới | Nêu quy trình đóng ghi, xác nhận, audit và chỉ Owner khôi phục. |
| Sai dữ liệu do chỉnh trực tiếp Sheet | Bảo vệ Sheet, thao tác qua app, audit và sao lưu. |
| Đơn online, tiền và tồn bị lẫn trạng thái | Tách trạng thái đơn, thực hiện kho và thanh toán; chỉ định thời điểm hạch toán. |
| SRS quá lớn, khó duy trì | Chia theo miền và dùng mã yêu cầu liên kết chéo. |
