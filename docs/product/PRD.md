# PRD — Ứng dụng quản lý bán hàng trên Google Workspace

| Thuộc tính | Giá trị |
| --- | --- |
| Trạng thái | Đã chốt phạm vi sản phẩm |
| Phiên bản | 1.0 |
| Cập nhật | 25/07/2026 |
| Khách hàng mục tiêu | Cửa hàng bán lẻ hàng hóa: tạp hóa, thời trang, mỹ phẩm, phụ tùng và mô hình tương tự |
| Mô hình thương mại | Bán một lần, dùng lâu dài; mỗi khách tự sở hữu tài khoản Google, dữ liệu và môi trường triển khai |

## 1. Mục tiêu tài liệu

Tài liệu này là nguồn yêu cầu sản phẩm chuẩn cho ứng dụng quản lý bán hàng. Mọi thiết kế dữ liệu, quyết định kiến trúc, backlog và tiêu chí kiểm thử sau này phải truy vết được đến một yêu cầu (`FR-*`, `NFR-*`, `BR-*`) trong tài liệu này.

Đây **không phải MVP**. Phạm vi là một sản phẩm bán được và vận hành được cho cửa hàng bán lẻ hàng hóa. Tuy nhiên, nó không cố thay thế ngay mọi giải pháp SaaS đa kênh, F&B, kế toán hoặc hóa đơn điện tử trên thị trường.

## 2. Bối cảnh và định vị

### 2.1 Vấn đề cần giải quyết

Cửa hàng nhỏ và vừa thường ghi đơn, tồn kho, công nợ và báo cáo ở nhiều sổ/Excel khác nhau. Hệ quả là chậm bán tại quầy, sai tồn, khó truy nguyên thất thoát, không rõ công nợ và khó quản lý khi có thêm kho, chi nhánh hoặc nhân viên.

Sản phẩm cung cấp một web app POS và quản trị trên Google Workspace của chính khách hàng. Google Sheets là kho dữ liệu nghiệp vụ dễ sở hữu/kiểm tra; Google Drive lưu tệp đính kèm; Google Apps Script thực hiện backend. Khách không trả phí thuê bao cho nhà cung cấp sản phẩm và không bị phụ thuộc vào một cơ sở dữ liệu SaaS của nhà cung cấp.

### 2.2 Giá trị khác biệt phải bảo toàn

- Cài trên tài khoản Google của khách; khách là chủ sở hữu file dữ liệu, Drive và Apps Script.
- Mua một lần, dùng lâu dài; không khóa dữ liệu hoặc ép gia hạn để tiếp tục dùng lõi sản phẩm.
- Giao diện bán nhanh, đủ chặt chẽ cho nhiều người dùng và nhiều kho.
- Lõi chung cho bán lẻ hàng hóa; khách chỉ bật các mô-đun đặc thù họ cần.
- Báo cáo có thể đối soát ngược về chứng từ gốc và nhật ký thao tác.

### 2.3 Đối tượng và tình huống sử dụng

| Nhóm | Nhu cầu chính |
| --- | --- |
| Chủ doanh nghiệp | Thiết lập, xem toàn bộ doanh thu/lợi nhuận/công nợ/tồn kho, duyệt ngoại lệ và sao lưu dữ liệu. |
| Quản lý chi nhánh | Điều hành chi nhánh/kho được giao, duyệt phiếu và theo dõi hiệu suất. |
| Thu ngân/nhân viên bán hàng | Mở ca, quét mã, tạo–thu tiền–in phiếu, tiếp nhận trả hàng trong quyền được cấp. |
| Nhân viên kho/mua hàng | Đặt mua, nhập, chuyển, kiểm và điều chỉnh kho có chứng từ. |
| Kế toán | Theo dõi thu–chi, công nợ phải thu/phải trả, xuất dữ liệu và báo cáo. |

## 3. Nghiên cứu tham chiếu thị trường

Nghiên cứu được thực hiện từ các trang sản phẩm/tài liệu công khai ngày 25/07/2026. Mục này chỉ dùng để rút ra yêu cầu; không sao chép thiết kế, giao diện hay cam kết của bất kỳ bên nào.

| Tham chiếu | Tín hiệu/khả năng công khai đáng chú ý | Hàm ý cho sản phẩm |
| --- | --- | --- |
| [SheetStore — Google Sheets](https://sheet.com.vn/software/phan-mem-quan-ly-ban-hang) | Định vị trả một lần, dữ liệu trên Google Sheets; công bố POS, tồn kho, công nợ, VAT, CRM, báo cáo, role và log. | Xác nhận mô hình Google Workspace có thể bán được; cần làm rõ hơn data ownership, đa kho, actor metadata và giới hạn vận hành. |
| [gsheets.vn Webapp v1.1](https://gsheets.vn/template/webapp-quan-ly-ban-hang-v1-1/) | Đơn hàng, chiết khấu/thuế, công nợ nhiều đợt, nhập–xuất–tồn, NCC, phân quyền thao tác, tích điểm, scanner, in K80. | Scanner, in phiếu và thanh toán nhiều đợt là yêu cầu nền tảng POS, không phải phần phụ. |
| [KiotViet — quản lý kho](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-thiet-lap/quan-ly-kho-hang/) | Nhiều kho trong chi nhánh, chọn kho khi bán, chuyển/kiểm/nhập/xuất theo kho, tồn theo kho. | Data model bắt buộc có `branch` và `warehouse` từ đầu; mọi biến động tồn phải có kho nguồn/đích. |
| [KiotViet — khách hàng](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-khach-hang/khach-hang/) | Hồ sơ, lịch sử, công nợ, nhóm khách, tích điểm và quản lý theo chi nhánh. | CRM không chỉ là danh bạ; công nợ, chính sách giá/ưu đãi và quyền xem dữ liệu phải nhất quán. |
| [Sapo — sản phẩm/kho](https://help.sapo.vn/tong-quan-cac-tinh-nang-quan-ly-san-pham-kho-hang) | Biến thể, combo, đơn vị quy đổi, lô–hạn, cảnh báo, kiểm kho, nhà cung cấp và chuyển chi nhánh. | Các kiểu hàng hóa phải là mô-đun cấu hình có sẵn, không phải nhánh code đặc thù từng ngành. |
| [Haravan POS](https://www.haravan.com/pages/tinh-nang-phan-mem-quan-ly-cua-hang-hararetail) | Chuỗi cửa hàng, điều chuyển, cảnh báo thiếu hàng, CRM, báo cáo ca, tiền mặt và khuyến mại. | Cần quản lý ca/két, điều chuyển và báo cáo theo chi nhánh từ bản thương mại đầu. |
| [MISA eShop](https://eshop.misa.vn/ld/eshop3) | Lô–hạn, serial/IMEI, thuộc tính, tồn kho, chi phí/dòng tiền/lãi lỗ. | Lô–hạn, serial/IMEI và giá vốn là điều kiện để bao phủ mỹ phẩm/tạp hóa/phụ tùng. |

Các kết nối sàn, website, vận chuyển, hóa đơn điện tử và kế toán là năng lực quan trọng của các SaaS trên, nhưng được tách khỏi phạm vi phát hành đầu của sản phẩm này để không tạo phụ thuộc vận hành/chi phí bên thứ ba.

## 4. Quyết định phạm vi đã phê duyệt

1. Nền tảng là bán lẻ hàng hóa đa ngành; không ưu tiên F&B, dịch vụ hay sản xuất ở bản đầu.
2. Data model hỗ trợ **nhiều chi nhánh, nhiều kho** ngay từ đầu. Tenant mới được khởi tạo sẵn một chi nhánh và một kho.
3. Kênh bán đầu: POS tại quầy và đơn online nhập thủ công. Không đồng bộ Shopee, Lazada, TikTok Shop, Facebook hay website.
4. Chỉ in phiếu/hóa đơn bán hàng và xuất dữ liệu. Không phát hành hóa đơn điện tử ký số trong phạm vi này.
5. Có sẵn nhưng cho phép bật/tắt theo tenant: biến thể, barcode, đơn vị quy đổi, combo, serial/IMEI–bảo hành, lô–hạn dùng.

## 5. Phạm vi sản phẩm

### 5.1 Phân lớp phạm vi

| Lớp | Bao gồm |
| --- | --- |
| Lõi bắt buộc | Thiết lập doanh nghiệp/chi nhánh/kho; danh mục; mua–nhập; kho; POS; đơn online thủ công; đổi/trả; khách hàng; công nợ; thu–chi; khuyến mại; tích điểm; nhân sự/phân quyền; báo cáo; log; sao lưu/xuất dữ liệu. |
| Mô-đun cấu hình | Size/màu/thuộc tính, barcode, combo, đơn vị quy đổi, lô–hạn, serial/IMEI, bảo hành, bảng giá và giới hạn tín dụng. |
| Mở rộng ngoài bản đầu | Hóa đơn điện tử ký số; kết nối ngân hàng để xác nhận tự động; sàn/mạng xã hội/website; hãng vận chuyển; SMS/Zalo/email marketing; F&B (bàn/bếp/công thức); sản xuất; kế toán tổng hợp. |

### 5.2 Không hỗ trợ trong bản đầu

- Hoạt động offline hoàn toàn hoặc đồng bộ xung đột khi mất Internet.
- Cam kết xử lý khối dữ liệu vượt giới hạn Google Sheets/Apps Script mà không có chính sách lưu trữ/archive riêng.
- Tự động nộp tờ khai thuế hay thay thế phần mềm kế toán/hóa đơn điện tử.
- Marketplace, API công khai hoặc webhook cho bên thứ ba.

## 6. Nguyên tắc dữ liệu và mô hình nghiệp vụ

### 6.1 Ranh giới tenant và quyền sở hữu

- Một lần cài đặt tạo một tenant độc lập trong Google Workspace/Google account của khách.
- Chỉ dữ liệu của tenant đó được chứa trong Spreadsheet và Drive do khách chỉ định; không gửi bản sao dữ liệu nghiệp vụ sang tài khoản của nhà cung cấp, trừ khi khách chủ động yêu cầu hỗ trợ và cấp quyền có thời hạn.
- Mọi khóa API/tokens (nếu có trong tương lai) nằm trong Apps Script Properties/secret manager phù hợp, không nằm trong source code hoặc Google Sheets.
- Chủ tenant có khả năng xuất dữ liệu nghiệp vụ, quản lý người dùng, tạo bản sao lưu và thu hồi quyền hỗ trợ.

### 6.2 Thực thể lõi

`Organization → Branch → Warehouse`; `User → Role → Permission`; `Product → Variant/Unit/Barcode`; `Supplier → PurchaseOrder → GoodsReceipt`; `Customer → SaleOrder → Payment/Return`; `InventoryMovement` là sổ cái tồn kho bất biến; `CashTransaction` và `Receivable/PayableLedger` là sổ cái tiền/công nợ; actor metadata trên record ghi người tạo/sửa/duyệt/hủy.

Không tính tồn kho bằng cách sửa một con số duy nhất. Số tồn hiển thị là kết quả của tồn đầu và các biến động đã duyệt; bản ghi tổng hợp chỉ được dùng để truy vấn nhanh và phải đối soát được với `InventoryMovement`.

## 7. Vai trò và phân quyền

### 7.1 Vai trò mẫu

| Vai trò | Phạm vi mặc định |
| --- | --- |
| Owner | Toàn quyền tenant, cấu hình, giá vốn/lợi nhuận, xuất/backup, người dùng, mọi chi nhánh. |
| Admin | Quản trị vận hành; không mặc định được chuyển quyền Owner hoặc xóa dữ liệu lịch sử. |
| Manager | Chi nhánh được giao; duyệt chứng từ/ngoại lệ trong hạn mức; xem báo cáo được cấp. |
| Cashier/Sales | Bán hàng, thu tiền, in phiếu, khách hàng; không thấy giá vốn/lợi nhuận nếu không cấp riêng. |
| Warehouse/Purchasing | Mua–nhập–xuất–chuyển–kiểm kho tại kho được giao; không tự duyệt chênh lệch vượt ngưỡng. |
| Accountant | Thu–chi, công nợ, báo cáo tài chính và xuất dữ liệu trong phạm vi được cấp. |
| Viewer | Chỉ xem dữ liệu/báo cáo đã cho phép. |

### 7.2 Yêu cầu phân quyền

| ID | Yêu cầu |
| --- | --- |
| FR-ACCESS-001 | Owner tạo, ngừng, mời lại người dùng và gán một hoặc nhiều vai trò. |
| FR-ACCESS-002 | Quyền phải cấp theo hành động `view/create/update/cancel/approve/print/export` và có thể giới hạn theo chi nhánh/kho. |
| FR-ACCESS-003 | Giá vốn, lợi nhuận, số dư quỹ, dữ liệu lương/hoa hồng và xuất dữ liệu là quyền tách biệt. |
| FR-ACCESS-004 | Hệ thống kiểm tra quyền tại backend, không chỉ ẩn nút ở frontend. |
| FR-ACCESS-005 | Không được xóa cứng chứng từ đã phát sinh; chỉ hủy/đảo chứng từ theo quyền. |

## 8. Yêu cầu chức năng

### 8.1 Thiết lập doanh nghiệp, chi nhánh và kho

| ID | Yêu cầu |
| --- | --- |
| FR-SET-001 | Wizard khởi tạo tạo Organization, một Branch, một Warehouse mặc định, tiền tệ VND và múi giờ `Asia/Ho_Chi_Minh`. |
| FR-SET-002 | Quản lý thông tin doanh nghiệp, logo, địa chỉ, MST, số điện thoại, mẫu in và đánh số chứng từ. |
| FR-SET-003 | Tạo/sửa/ngừng hoạt động Branch và Warehouse; kho thuộc đúng một chi nhánh. |
| FR-SET-004 | Mỗi giao dịch phát sinh tồn phải chọn kho nguồn; giao dịch chuyển phải chọn kho nguồn và kho đích. |
| FR-SET-005 | Cho phép cấu hình kho có được bán trực tiếp, âm kho, theo dõi lô/serial và ngưỡng duyệt hay không. |
| FR-SET-006 | Không cho ngừng/xóa chi nhánh hoặc kho còn tồn, chứng từ mở hoặc người dùng đang được gán; phải dùng quy trình đóng/điều chuyển phù hợp. |

### 8.2 Danh mục hàng hóa và cấu hình theo ngành

| ID | Yêu cầu |
| --- | --- |
| FR-CAT-001 | Quản lý nhóm hàng nhiều cấp, thương hiệu, đơn vị tính, thuộc tính, vị trí kệ và trạng thái kinh doanh. |
| FR-CAT-002 | Sản phẩm có mã nội bộ, tên, nhóm, mô tả, ảnh, thuế suất tham chiếu, giá vốn mặc định, giá bán, tồn tối thiểu và ghi chú. |
| FR-CAT-003 | SKU và barcode không được trùng trong phạm vi tenant theo quy tắc cấu hình; hỗ trợ tìm bằng SKU, barcode, tên và mã vạch của đơn vị quy đổi. |
| FR-CAT-004 | Một sản phẩm hỗ trợ biến thể theo thuộc tính; mỗi variant có SKU/barcode, giá và tồn độc lập. |
| FR-CAT-005 | Một sản phẩm hỗ trợ đơn vị cơ bản và các đơn vị quy đổi có hệ số; mọi chứng từ phải lưu cả đơn vị giao dịch và số lượng quy về đơn vị cơ bản. |
| FR-CAT-006 | Hỗ trợ hàng hóa có tồn, dịch vụ không có tồn, combo/bundle và hàng không quản lý tồn. |
| FR-CAT-007 | Combo có công thức thành phần, số lượng và quy tắc trừ tồn; giá combo có thể riêng với tổng giá thành phần. |
| FR-CAT-008 | Hỗ trợ nhiều bảng giá theo chi nhánh và/hoặc nhóm khách, hiệu lực theo khoảng thời gian; ghi rõ giá được áp dụng trên dòng chứng từ. |
| FR-CAT-009 | Sản phẩm có cờ theo dõi lô–hạn dùng và/hoặc serial/IMEI; không được thay đổi cờ làm mất truy vết tồn lịch sử. |
| FR-CAT-010 | Serial/IMEI là duy nhất trong tenant; lô lưu mã lô, ngày sản xuất/hết hạn khi được yêu cầu. |
| FR-CAT-011 | Cho phép import danh mục từ mẫu Excel/CSV có kiểm tra trước, báo lỗi theo dòng, chống tạo trùng và có báo cáo kết quả. |
| FR-CAT-012 | Ngừng kinh doanh thay vì xóa hàng đã có chứng từ; vẫn cho phép xem lịch sử. |
| FR-CAT-013 | Hỗ trợ in/xuất tem barcode từ sản phẩm/variant/đơn vị bán; việc tạo barcode nội bộ không được ghi đè barcode nhà sản xuất đã lưu. |
| FR-CAT-014 | Lưu lịch sử thay đổi giá và có hiệu lực từ thời điểm xác định; không làm thay đổi giá đã snapshot trên chứng từ cũ. |

### 8.3 Nhà cung cấp, mua hàng và nhập hàng

| ID | Yêu cầu |
| --- | --- |
| FR-PUR-001 | Quản lý NCC: mã, tên, MST, người liên hệ, điện thoại, địa chỉ, điều khoản thanh toán, hạn mức và công nợ. |
| FR-PUR-002 | Tạo đơn đặt mua (PO) theo NCC/kho, dòng hàng, số lượng, giá dự kiến, chiết khấu, thuế, chi phí mua khác và ngày dự kiến. |
| FR-PUR-003 | PO có trạng thái nháp, chờ duyệt, đã duyệt, nhận một phần, hoàn tất, hủy; không tăng tồn khi chỉ duyệt PO. |
| FR-PUR-004 | Phiếu nhập nhận một phần/toàn bộ PO hoặc nhập trực tiếp; bắt buộc kho nhận và ghi nhận giá nhập thực tế. |
| FR-PUR-005 | Khi nhập hàng theo lô/serial, bắt buộc ghi nhận lô–hạn hoặc serial hợp lệ trước khi hoàn tất. |
| FR-PUR-006 | Hỗ trợ chi phí mua bổ sung (vận chuyển, bốc xếp…) và quy tắc phân bổ vào giá vốn theo cấu hình; lưu nguyên tắc đã áp dụng. |
| FR-PUR-007 | Trả hàng NCC tham chiếu phiếu nhập khi có thể, giảm tồn đúng kho/lô/serial và tạo bút toán công nợ/hoàn tiền phù hợp. |
| FR-PUR-008 | Theo dõi phải trả theo chứng từ, hạn thanh toán và các lần thanh toán một phần. |

### 8.4 Kho và sổ cái tồn

| ID | Yêu cầu |
| --- | --- |
| FR-INV-001 | Mọi nghiệp vụ tăng/giảm tồn tạo `InventoryMovement` có mã, thời điểm, loại, kho, sản phẩm/variant, số lượng, đơn vị quy đổi, chứng từ nguồn, người tạo/duyệt. |
| FR-INV-002 | Hệ thống hiển thị tồn khả dụng, tồn thực tế, đang chuyển và tồn theo kho; không cộng gộp nhầm lô/serial. |
| FR-INV-003 | Bán hoàn tất, nhập, trả hàng, xuất hủy, chuyển, kiểm kê và điều chỉnh phải làm thay đổi tồn theo luật nghiệp vụ rõ ràng. |
| FR-INV-004 | Thiết lập chặn hoặc cảnh báo bán quá tồn theo kho; ngoại lệ phải lưu người cho phép và lý do. |
| FR-INV-005 | Chuyển kho gồm phiếu xuất chuyển, trạng thái đang chuyển và phiếu nhận; không coi hàng đang chuyển là tồn bán được ở kho đích. |
| FR-INV-005A | Kho đích phải xác nhận số nhận; số thiếu/thừa/hỏng khi nhận chuyển tạo chênh lệch có lý do, người chịu trách nhiệm và workflow duyệt, không tự âm thầm cân bằng tồn. |
| FR-INV-006 | Kiểm kho tạo phiên kiểm theo kho, phạm vi hàng, người kiểm, số hệ thống được chốt tại thời điểm bắt đầu và số thực tế; chỉ tạo điều chỉnh sau khi duyệt chênh lệch. |
| FR-INV-007 | Điều chỉnh tồn/hủy hàng phải có lý do chuẩn hóa, người duyệt theo ngưỡng và ảnh/chứng từ đính kèm khi cấu hình yêu cầu. |
| FR-INV-008 | Hỗ trợ ưu tiên xuất lô FEFO (hết hạn gần trước) khi bật; người dùng có thể chọn lô/serial trong quyền cho phép. |
| FR-INV-009 | Cảnh báo tồn dưới mức tối thiểu, hàng tồn lâu và lô sắp hết hạn; cảnh báo không được tự tạo giao dịch. |
| FR-INV-010 | Có thẻ kho/lịch sử biến động truy ngược từ hàng–kho–lô/serial đến chứng từ nguồn. |
| FR-INV-011 | Cung cấp import tồn đầu kỳ có kiểm tra và lập biên bản; không cho import đè lên tồn đã vận hành nếu không qua điều chỉnh có kiểm soát. |

### 8.5 Bán hàng POS và đơn online thủ công

| ID | Yêu cầu |
| --- | --- |
| FR-SALES-001 | Màn hình POS tối ưu desktop/tablet, dùng bàn phím và scanner như thiết bị nhập liệu; tìm hàng theo barcode/SKU/tên. |
| FR-SALES-002 | Người dùng phải chọn Branch và Warehouse bán trong phạm vi quyền trước khi tạo giao dịch. |
| FR-SALES-003 | Tạo khách nhanh ngay trên POS; tìm và hiển thị thông tin cần thiết như điểm, nợ, chính sách giá mà không lộ dữ liệu bị hạn chế. |
| FR-SALES-004 | Giỏ hàng hỗ trợ số lượng, đơn vị, giá, chiết khấu dòng/đơn, thuế, ghi chú, nhân viên bán, khuyến mại, điểm và phí giao hàng. |
| FR-SALES-005 | Hỗ trợ tiền mặt, chuyển khoản thủ công, QR thanh toán hiển thị, thẻ/COD/khác theo cấu hình; một đơn có nhiều lần và nhiều phương thức thanh toán. |
| FR-SALES-006 | QR chỉ là hướng dẫn thanh toán ở bản đầu; hệ thống không tự xác nhận biến động ngân hàng. Nhân viên phải ghi nhận/đối soát khoản thu. |
| FR-SALES-007 | Hỗ trợ bán chịu: tạo công nợ phải thu, hạn thanh toán, hạn mức và cảnh báo/chặn vượt hạn mức theo cấu hình. |
| FR-SALES-008 | Hỗ trợ đặt cọc, thanh toán một phần và thu nợ về sau; các khoản phải đối soát tổng tiền đơn. |
| FR-SALES-009 | Đơn có luồng nháp → xác nhận/hoàn thành hoặc hủy; chỉ đơn hoàn thành mới trừ tồn và ghi nhận doanh thu/công nợ chính thức. |
| FR-SALES-010 | Đơn online nhập tay lưu nguồn đơn, thông tin người nhận/địa chỉ/giao hàng, phí ship, COD, ghi chú và trạng thái giao; không đồng bộ đối tác vận chuyển. |
| FR-SALES-011 | Không được sửa dòng hàng/tiền của đơn hoàn thành trực tiếp. Sửa sai dùng hủy khi chưa phát sinh thanh toán/biến động, hoặc trả hàng/phiếu điều chỉnh theo nghiệp vụ. |
| FR-SALES-012 | In lại phiếu/hóa đơn bán hàng từ mẫu cấu hình, gồm mã chứng từ/QR, hàng hóa, thuế, thanh toán, chi nhánh và người bán; hỗ trợ khổ K80 và A4 khi mẫu được cấu hình. |
| FR-SALES-013 | Cho phép gửi/tải bản PDF hoặc dữ liệu xuất theo quyền, nhưng không tuyên bố đây là hóa đơn điện tử ký số. |
| FR-SALES-014 | Hiển thị cảnh báo giá bất thường, hết tồn, hạn mức nợ, lô sắp hết hạn, khuyến mại xung đột trước khi hoàn tất. |
| FR-SALES-015 | Lưu snapshot tên hàng, SKU, giá, thuế, chiết khấu, chính sách khuyến mại, giá vốn tính tại thời điểm giao dịch để báo cáo lịch sử không đổi khi danh mục sửa sau này. |
| FR-SALES-016 | Đơn online thủ công tách rõ trạng thái đơn, chuẩn bị/xuất kho, giao hàng và thanh toán; ngày tạo, ngày hoàn tất bán, ngày xuất kho/giao và ngày thu tiền được lưu riêng. |
| FR-SALES-017 | Hỗ trợ giữ hàng/reservation có hạn khi tenant bật tính năng; hàng giữ không được tính là tồn khả dụng nhưng chưa làm biến động tồn thực tế. Hết hạn giữ phải tự giải phóng và lưu system actor/timestamp trên reservation. |

### 8.6 Trả hàng, đổi hàng, serial và bảo hành

| ID | Yêu cầu |
| --- | --- |
| FR-RET-001 | Trả hàng tham chiếu đơn gốc; giới hạn số lượng tối đa theo số đã bán trừ số đã trả và ghi lý do. |
| FR-RET-002 | Hoàn tiền bằng tiền mặt/chuyển khoản/cấn trừ nợ/đổi hàng; mọi hoàn tiền là chứng từ thanh toán riêng có liên kết. |
| FR-RET-003 | Hàng trả được đưa về kho bán được, kho chờ kiểm hoặc hủy theo kết quả kiểm tra; không tự động cộng tồn bán được khi chưa đạt điều kiện. |
| FR-RET-004 | Đổi hàng được biểu diễn bằng một giao dịch trả và một giao dịch bán liên kết để bảo toàn doanh thu, tồn và thu/chi. |
| FR-RET-005 | Serial/IMEI bán ra phải xác định serial cụ thể; trả/bảo hành phải tra cứu được theo serial, khách và đơn gốc. |
| FR-RET-006 | Bảo hành lưu thời hạn/chính sách, trạng thái tiếp nhận–xử lý–hoàn tất, ghi chú và tệp đính kèm; không tự suy ra hạch toán nếu chưa cấu hình. |

### 8.7 Khách hàng, CRM, khuyến mại và tích điểm

| ID | Yêu cầu |
| --- | --- |
| FR-CRM-001 | Hồ sơ khách có mã, tên, điện thoại, email, địa chỉ, ngày sinh, ghi chú, nhóm, trạng thái và lịch sử giao dịch. |
| FR-CRM-002 | Quy tắc phát hiện trùng điện thoại/email theo cấu hình; người có quyền xử lý gộp hồ sơ phải để lại dấu vết. |
| FR-CRM-003 | Nhóm khách có thể xác định thủ công hoặc theo điều kiện như doanh số, số lần mua, điểm, khu vực và công nợ. |
| FR-CRM-004 | Hỗ trợ chính sách giá/chiết khấu theo nhóm khách, Branch và thời gian hiệu lực. |
| FR-CRM-005 | Khuyến mại hỗ trợ tối thiểu: giảm theo hàng, giảm theo hóa đơn, mua X tặng Y, tặng điểm, voucher/coupon; quy tắc hiệu lực, điều kiện, giới hạn sử dụng và mức ưu tiên phải minh bạch. |
| FR-CRM-006 | Hệ thống phải hiển thị chính sách áp dụng được và lý do không áp dụng; không tự cộng dồn các khuyến mại xung đột. |
| FR-CRM-007 | Tích điểm có chính sách quy đổi, điều kiện phát sinh, điều kiện dùng, ngày hết hạn và nhật ký tăng/giảm; trả hàng phải đảo/điều chỉnh điểm liên quan. |
| FR-CRM-008 | Chỉ người có quyền mới điều chỉnh điểm, công nợ hoặc giới hạn tín dụng thủ công; bắt buộc lý do. |

### 8.8 Thu–chi, công nợ, ca bán và chi phí

| ID | Yêu cầu |
| --- | --- |
| FR-FIN-001 | Ghi nhận phiếu thu/chi độc lập hoặc sinh từ đơn bán, trả hàng, mua/nhập, trả NCC; có phương thức, tài khoản/quỹ, người nộp/nhận, chứng từ tham chiếu. |
| FR-FIN-002 | Quản lý các quỹ/tài khoản thanh toán (tiền mặt, ngân hàng, ví…) theo chi nhánh; không yêu cầu kết nối ngân hàng tự động. |
| FR-FIN-003 | Công nợ phải thu/phải trả được hình thành từ chứng từ gốc và thanh toán; hỗ trợ trả nhiều đợt, cấn trừ và tra cứu chi tiết theo khách/NCC. |
| FR-FIN-004 | Không cho thanh toán vượt số phải thu/phải trả trừ khi quyền/cấu hình cho phép; chênh lệch phải có lý do. |
| FR-FIN-005 | Quản lý chi phí vận hành theo nhóm chi phí, Branch, thời gian, đối tượng nhận, phương thức chi và tệp chứng từ. |
| FR-FIN-006 | Mở ca ghi nhận tiền đầu ca, người phụ trách và quỹ; đóng ca đối chiếu tiền theo phương thức, tiền thực tế, chênh lệch và lý do. |
| FR-FIN-007 | Phiếu thu/chi và chênh lệch ca có workflow duyệt theo phân quyền/ngưỡng cấu hình. |
| FR-FIN-008 | Có sổ quỹ/tài khoản theo thời gian, Branch, người tạo và chứng từ nguồn; mọi số dư phải truy vết được. |

### 8.9 Nhân viên bán hàng và hoa hồng cơ bản

| ID | Yêu cầu |
| --- | --- |
| FR-STAFF-001 | Mỗi đơn/phiếu có thể ghi nhận thu ngân, nhân viên bán, nhân viên giao/nhập theo quyền và không cho sửa sau khi khóa nếu không có chứng từ điều chỉnh hợp lệ kèm actor metadata. |
| FR-STAFF-002 | Báo cáo hiệu suất theo nhân viên tách rõ doanh thu, doanh thu thuần, số đơn, hàng trả, giảm giá và tiền đã thu. |
| FR-STAFF-003 | Hỗ trợ cấu hình hoa hồng cơ bản theo nhân viên/nhóm hàng/sản phẩm, tỷ lệ hoặc số tiền, khoảng hiệu lực; hóa đơn trả/hủy phải đảo giá trị hoa hồng liên quan. |
| FR-STAFF-004 | Phần mềm không tính lương/chấm công đầy đủ ở bản đầu; chỉ xuất dữ liệu hoa hồng đã duyệt để dùng ở hệ thống khác. |

### 8.10 Báo cáo, dashboard và xuất dữ liệu

| ID | Yêu cầu |
| --- | --- |
| FR-REP-001 | Dashboard hiển thị KPI theo quyền và bộ lọc thời gian/Branch: doanh thu, doanh thu thuần, đơn, trả hàng, đã thu, công nợ, giá vốn, lợi nhuận gộp, tồn và cảnh báo. |
| FR-REP-002 | Báo cáo bán hàng theo thời gian, Branch, kho, kênh, nhân viên, khách, nhóm hàng, hàng/variant, phương thức thanh toán và trạng thái. |
| FR-REP-003 | Báo cáo hàng hóa/kho: tồn hiện tại, nhập–xuất–tồn, thẻ kho, tồn theo lô/serial, hàng dưới định mức, gần hết hạn, tồn lâu và chênh kiểm. |
| FR-REP-004 | Báo cáo mua hàng/NCC: PO, nhập, trả NCC, phải trả, lịch thanh toán, giá nhập và hiệu quả NCC. |
| FR-REP-005 | Báo cáo khách hàng: lịch sử mua, top khách, công nợ, tuổi nợ, điểm, nhóm và hiệu quả khuyến mại. |
| FR-REP-006 | Báo cáo tài chính vận hành: thu–chi, sổ quỹ, báo cáo ca, doanh thu–giá vốn–lợi nhuận gộp, chi phí và lãi/lỗ quản trị. |
| FR-REP-007 | Báo cáo VAT là báo cáo quản trị theo dữ liệu ghi nhận, có thể xuất để đối chiếu; không được tuyên bố là tờ khai hoặc thay thế nghiệp vụ thuế. |
| FR-REP-008 | Báo cáo cho phép drill-down đến chứng từ và export CSV/XLSX/PDF theo quyền; ExportRun phải lưu người yêu cầu, thời điểm và bộ lọc. |
| FR-REP-009 | Định nghĩa chỉ số, bộ lọc và thời điểm dữ liệu phải hiển thị ngay trong báo cáo để tránh hiểu sai. |
| FR-REP-010 | Mỗi báo cáo phải quy định và hiển thị mốc thời gian sử dụng: ngày tạo, ngày hoàn tất bán, ngày xuất/giao, ngày thanh toán hoặc ngày hạch toán; không trộn các mốc trong một chỉ số mà không ghi rõ. |

### 8.11 Tệp đính kèm và vận hành quản trị

| ID | Yêu cầu |
| --- | --- |
| FR-OPS-001 | Lưu tệp đính kèm (ảnh hàng, phiếu nhập, biên bản kiểm, bảo hành) trong Drive thư mục tenant; Sheets chỉ giữ metadata và URL/ID. |
| FR-OPS-002 | Record nghiệp vụ/vận hành quan trọng ghi tối thiểu actor metadata: người tạo/sửa/duyệt/hủy, thời điểm, Branch/kho nếu có, lý do khi bắt buộc và correlation/command ID khi áp dụng. |
| FR-OPS-003 | Thay đổi có ảnh hưởng tiền/tồn/quyền phải lưu actor metadata trên record/chứng từ/ledger liên quan; người dùng không thể tự xóa chứng từ hoặc ledger lịch sử qua UI. |
| FR-OPS-004 | Cho phép xuất toàn bộ dữ liệu nghiệp vụ theo các bảng có liên kết, kèm hướng dẫn dữ liệu, trong phạm vi quyền Owner. |
| FR-OPS-005 | Có quy trình tạo bản sao lưu Spreadsheet và tệp Drive theo lịch/cách thủ công do Owner kích hoạt; hiển thị lần backup gần nhất và kết quả. |
| FR-OPS-006 | Có kiểm tra sức khỏe vận hành: phiên bản app, quyền truy cập dữ liệu, trigger, dung lượng/cảnh báo ngưỡng và lỗi batch gần nhất. |

## 9. Quy tắc nghiệp vụ trọng yếu

| ID | Quy tắc |
| --- | --- |
| BR-001 | Mã chứng từ duy nhất trong tenant, có loại chứng từ và thời điểm tạo; không tái sử dụng sau khi hủy. |
| BR-002 | Tiền tệ kế toán mặc định VND; tiền được lưu dưới dạng số nguyên đơn vị đồng, không dùng số thực gây sai lệch làm tròn. |
| BR-003 | Một chứng từ hoàn tất phải cân bằng: tổng phải trả = hàng + thuế + phí - giảm giá - giá trị điểm/voucher hợp lệ; tổng thanh toán + công nợ = tổng phải trả. |
| BR-004 | Hủy/đảo chứng từ phải tạo dấu vết và biến động đảo, không ghi đè lịch sử biến động. |
| BR-005 | Giá vốn, giá bán, thuế, chiết khấu, tỷ lệ quy đổi, thông tin lô/serial phải được snapshot trên dòng chứng từ khi hoàn tất. |
| BR-006 | Một serial chỉ ở một trạng thái tồn tại một kho tại một thời điểm; không thể bán serial đã bán/hủy/đang bảo hành nếu không hợp lệ. |
| BR-007 | Khi bật quản lý lô, không hoàn tất xuất/bán nếu số lượng lô chọn không đủ; cảnh báo hết hạn theo cấu hình tenant. |
| BR-008 | Hàng trả chỉ tăng tồn bán được khi đã qua quy tắc kiểm nhận; giá trị hoàn tiền không vượt giá trị đã trả của dòng hàng sau khi xét giảm giá/khuyến mại. |
| BR-009 | Khuyến mại và điểm phải được đảo/điều chỉnh tương ứng khi trả/hủy đơn. |
| BR-010 | Dữ liệu của Branch/kho ngoài phạm vi người dùng không được trả về API hay xuất ra file. |
| BR-011 | Báo cáo lợi nhuận dùng giá vốn theo phương pháp giá vốn đã được chốt trong quyết định kiến trúc; không trộn lẫn phương pháp giữa các kỳ mà không có migration và actor metadata. |

## 10. Luồng nghiệp vụ bắt buộc

### 10.1 Bán tại quầy

`Mở ca → chọn Branch/kho → quét/tìm hàng → chọn/tạo khách → áp dụng giá/khuyến mại → nhận một hay nhiều khoản thanh toán hoặc ghi nợ → kiểm tra quyền/tồn/hạn mức → hoàn tất đơn → tạo biến động tồn, thu/công nợ, điểm và actor metadata → in phiếu → báo cáo cập nhật.`

### 10.2 Mua và nhập hàng

`Tạo PO → duyệt → nhận hàng một phần/toàn bộ → nhập lô/serial nếu có → xác nhận phiếu nhập → tăng tồn + cập nhật phải trả/đã trả → lưu chứng từ với actor metadata và báo cáo.`

### 10.3 Chuyển và kiểm kho

`Tạo yêu cầu chuyển → duyệt/xuất kho nguồn → trạng thái đang chuyển → kho đích nhận và đối chiếu → tăng tồn kho đích.`

`Mở phiên kiểm → chốt số hệ thống → nhập/quét số thực tế → gửi duyệt chênh lệch → tạo phiếu điều chỉnh có lý do và actor metadata.`

### 10.4 Trả/đổi/bảo hành

`Tìm đơn/serial gốc → kiểm tra điều kiện → chọn số lượng/lý do/tình trạng hàng → chọn kho nhận và cách hoàn tiền/cấn trừ → xác nhận → tạo biến động đảo, payment/debt/points tương ứng → in phiếu.`

### 10.5 Thu nợ và đóng ca

`Chọn khách/NCC và chứng từ nợ → nhận/trả một phần → tạo phiếu thu/chi + cập nhật sổ công nợ.`

`Đóng ca → hệ thống tổng hợp theo phương thức → thu ngân nhập tiền thực tế → ghi nhận chênh lệch/lý do → quản lý duyệt nếu cần → khóa ca.`

## 11. Yêu cầu phi chức năng và ràng buộc Google Workspace

| ID | Yêu cầu |
| --- | --- |
| NFR-001 | Web app responsive cho desktop/tablet; luồng bán thông thường phải hạn chế nhập liệu và hoạt động được với scanner như bàn phím. |
| NFR-002 | Thao tác ghi tiền/tồn phải idempotent theo request/correlation ID, dùng khóa phù hợp để ngăn hai giao dịch đồng thời làm sai số liệu. Apps Script có [LockService](https://developers.google.com/apps-script/reference/lock/) cho mục tiêu này. |
| NFR-003 | Batch import/export/báo cáo lớn phải phân trang/chia lô, có tiến trình và có thể chạy lại an toàn; không giả định một execution xử lý không giới hạn. Apps Script giới hạn runtime mỗi execution và quota dịch vụ có thể thay đổi. [Nguồn quota](https://developers.google.com/apps-script/guides/services/quotas) |
| NFR-004 | Ghi/đọc Google Sheets theo lô; tránh vòng lặp gọi API cho từng ô/dòng ở luồng nóng POS. |
| NFR-005 | Khi cạnh tranh ghi dữ liệu hoặc hết quota, trả lỗi có thể hiểu, không tạo chứng từ nửa vời; cơ chế retry chỉ an toàn với thao tác idempotent. |
| NFR-006 | Mọi web request yêu cầu xác thực và kiểm tra quyền backend. Deployment/execute-as phải được quyết định rõ trong ADR trước khi triển khai vì web app Apps Script có mô hình quyền khác nhau. [Tài liệu web app](https://developers.google.com/apps-script/guides/web) |
| NFR-007 | Trigger chỉ dành cho tác vụ không đồng bộ như backup/cảnh báo/báo cáo; trigger chạy theo tài khoản người tạo và chịu quota, do đó cần tạo trong tài khoản khách hoặc có hướng dẫn chuyển giao rõ ràng. [Tài liệu trigger](https://developers.google.com/apps-script/guides/triggers/installable) |
| NFR-008 | Không lưu secret, mật khẩu, token, số thẻ hoặc dữ liệu nhạy cảm không cần thiết trong source/Sheets. Configuration không nhạy cảm và user preference có thể dùng PropertiesService phù hợp. |
| NFR-009 | Các thao tác quan trọng phải có thông báo thành công/thất bại rõ ràng, mã hỗ trợ/correlation ID và log kỹ thuật không lộ bí mật. |
| NFR-010 | Dùng định dạng ngày/giờ thống nhất, timezone `Asia/Ho_Chi_Minh`; export hiển thị đúng timezone tenant. |
| NFR-011 | Tài liệu cài đặt phải nêu quyền Google cần cấp, ai là owner, cách thêm người dùng, sao lưu, khôi phục, cập nhật phiên bản và gỡ quyền hỗ trợ. |

## 12. Bảo mật, riêng tư và duy trì sản phẩm bán một lần

- Mỗi khách nhận checklist bàn giao: spreadsheet/Drive/script owner, danh sách quyền, URL production, phiên bản, backup gần nhất và hướng dẫn khôi phục.
- Quyền hỗ trợ của nhà cung cấp chỉ cấp theo yêu cầu; Owner khách có thể thu hồi bất cứ lúc nào.
- Chỉ thu thập dữ liệu khách hàng cuối cần cho bán hàng; phân quyền theo nguyên tắc tối thiểu; export chứa dữ liệu cá nhân phải lưu người yêu cầu/thời điểm/bộ lọc.
- Không coi Google Sheets là giao diện nhập liệu tự do cho các bảng sổ cái sau khi vận hành. Cần bảo vệ sheet kỹ thuật, giới hạn người sửa trực tiếp và phát hiện/ghi nhận thay đổi ngoài ứng dụng theo chính sách triển khai.
- Bản cập nhật sản phẩm phải có release note, migration có backup trước/sau, kiểm tra tương thích data model và phương án rollback.

## 13. Tiêu chí nghiệm thu cấp sản phẩm

1. Tenant mới có thể được cài đặt trên Google account của khách, tạo Branch/kho mặc định và không cần hạ tầng SaaS riêng của nhà cung cấp để dùng lõi sản phẩm.
2. Hai nhân viên được cấp quyền khác nhau không thể xem/thao tác dữ liệu giá vốn, kho hoặc chi nhánh ngoài phạm vi.
3. Một đơn POS dùng barcode, khuyến mại, thanh toán một phần và công nợ tạo đúng chứng từ, tồn, sổ tiền/công nợ, điểm và phiếu in.
4. Nhập, chuyển, kiểm, điều chỉnh, trả hàng và bảo hành đều đối soát được từ báo cáo về chứng từ gốc và actor metadata.
5. Hàng biến thể, quy đổi, combo, lô–hạn và serial/IMEI hoạt động đúng khi mô-đun được bật; tenant không bật không bị ép nhập các trường này.
6. Dashboard và mọi báo cáo nêu rõ bộ lọc/định nghĩa; số liệu drill-down được đến chứng từ nguồn và export tuân quyền.
7. Bản sao lưu và quy trình khôi phục được kiểm chứng trên một dữ liệu thử nghiệm trước khi bàn giao.
8. Kiểm thử tải và lỗi quota/concurrency xác nhận không sinh trùng đơn, trùng payment hoặc biến động tồn sai.

## 14. Các quyết định đã được đặc tả cho kiến trúc nền

Các quyết định dưới đây đã được chuyển thành SRS, Solution Design và ADR. Phân hệ triển khai phải tuân thủ các tài liệu được dẫn chiếu thay vì tự đặt lại policy.

| Chủ đề | Quyết định đã chốt | Nguồn chuẩn |
| --- | --- | --- |
| Giá vốn | Bình quân gia quyền di động; snapshot giá vốn trên chứng từ/ledger, điều chỉnh bằng chứng từ đối ứng. | `SRS-INV-*`, `SRS-SAL-*`, [logical data model](../data-model/logical-data-model.md) |
| Tồn, reservation và duyệt | Trừ tồn tại Completed/Shipped theo SRS; reservation/âm kho/ngoại lệ dùng state, approval và actor metadata. | `SRS-INV-*`, `SRS-SAL-*`, `SRS-OVR-004` |
| Ca bán và offline | Có ca/két và workflow duyệt; không hỗ trợ offline write hoặc đồng bộ xung đột. | `SRS-FIN-*`, `SRS-OVR-016` |
| Sheets, partition và archive | Core/Runtime/Transaction storage role; transaction partition theo kỳ, archive bất biến, không xóa chứng từ/ledger để lấy chỗ. | `SRS-OVR-011`, [storage lifecycle](../data-model/storage-partitioning-and-lifecycle.md) |
| Identity/deployment | Web App public, execute bằng account khách; user dùng loginId/mật khẩu/session nội bộ, không dùng Google identity. | `SRS-OVR-005` đến `SRS-OVR-008`, `SRS-OVR-022`, ADR 0001 |
| POS và in | POS local-first read, server-authoritative commit; K80/A4 in bằng browser từ receipt snapshot, PDF/Drive không chặn checkout. | `SRS-OVR-013`, `SRS-OVR-020`, `SRS-SAL-016` đến `SRS-SAL-017` |
| Backup, restore, update | Backup manifest 30 bản, restore sang resource thay thế, versioned deployment/migration có backup và compatibility check. | `SRS-OVR-010`, `SRS-OVR-023`, ADR 0006–0007 |

## 15. Phụ lục: thuật ngữ

| Thuật ngữ | Nghĩa |
| --- | --- |
| Tenant | Một môi trường cài đặt độc lập cho một khách hàng. |
| Branch | Điểm kinh doanh/chi nhánh. |
| Warehouse | Kho vật lý hoặc kho logic thuộc một Branch. |
| Biến động tồn | Bản ghi tăng/giảm/chuyển/điều chỉnh tồn có chứng từ nguồn. |
| Đơn hoàn thành | Đơn đã xác nhận nghiệp vụ, làm phát sinh tồn/doanh thu/công nợ chính thức. |
| Đơn vị cơ bản | Đơn vị chuẩn dùng để quy đổi và tính tồn. |
| FEFO | Xuất lô có hạn dùng gần nhất trước. |
| Audit log | Nhật ký truy vết ai làm gì, khi nào và thay đổi gì. |
