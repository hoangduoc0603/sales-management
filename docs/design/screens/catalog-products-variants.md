# Hàng hóa & biến thể Design Handoff

## Trạng thái

- Status: `Review` — artifact mới đã tạo trên Open Design, chờ người dùng kiểm tra trước khi dùng làm nguồn code UI.
- Ngày thiết kế: 2026-08-02
- Design System: Cenio Core v0.7
- Open Design project: `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`
- Artifact: `catalog-products-variants.html`
- Đường dẫn file Open Design: `/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/catalog-products-variants.html`

## Phạm vi

- Màn hình tập trung riêng cho quản lý `Product` và `Variant`.
- Bao phủ danh sách hàng hóa/biến thể, tìm kiếm theo tên/SKU/barcode/mã hàng, bộ lọc trạng thái/loại hàng/nhóm hàng/thương hiệu, xem nhanh theo kho hiện tại, drawer chi tiết và modal thêm sản phẩm.
- Số lượng kết quả hiển thị đặt tại khu vực tiêu đề cạnh/ dưới `Hàng hóa & biến thể`, ví dụ `3 sản phẩm`; không đặt trong toolbar filter và không lặp lại thông tin kho.
- Loại Product trong form thêm/sửa dùng custom Select/Listbox gọn, bao gồm đủ mã nội bộ `Stocked`, `Service`, `NonStock`, `Bundle`; hiển thị tiếng Việt lần lượt là `Hàng tồn`, `Dịch vụ`, `Không tồn`, `Bộ sản phẩm`. Khi đổi loại Product, form phải đổi panel cấu hình tương ứng, không dùng một UI giống nhau cho mọi loại.
- Sản phẩm gốc là thông tin mô tả; biến thể là đơn vị giao dịch theo SKU/barcode, giá bán, đơn vị, tồn khả dụng và cấu hình lot/HSD/serial.
- Với `Stocked`, header `Thiết lập tồn kho` đặt switch `Quản lý tồn` căn phải. Switch là parent của progressive disclosure: khi tắt chỉ hiện một helper ngắn; khi bật mới hiện `Tồn tối thiểu` và `Phương thức theo dõi hàng hóa`. UI cho người dùng chọn một trong bốn cấu hình dễ hiểu, sau đó ánh xạ nội bộ sang hai cờ `lotTracking` và `serialTracking`; hai cờ vẫn có thể cùng bật.
- Với `Service`, UI ẩn tồn kho/lô/serial/tồn tối thiểu và giải thích rằng dịch vụ không kiểm tồn khi bán nhưng vẫn snapshot giá/thuế trên đơn.
- Với `NonStock`, UI ẩn lô/serial/tồn tối thiểu và giải thích rằng hàng không quản lý tồn; POS không kiểm tồn nhưng vẫn ghi nhận SKU, barcode và giá bán.
- Với `Bundle`, UI hiển thị là `Bộ sản phẩm` và phải giải thích ngắn gọn rằng bộ sản phẩm không quản lý tồn thành phẩm riêng; khi bán sẽ trừ tồn các thành phần theo công thức. CTA `Cấu hình công thức bộ sản phẩm` mở dialog cấu hình thực sự, không chỉ toast. Dialog có ngày hiệu lực, trạng thái công thức, danh sách thành phần variant, SKU, đơn vị cơ bản, số lượng dương, thêm/xóa dòng, trạng thái rỗng, validation và phản hồi lưu; không nhồi editor policy nâng cao hoặc Customer/Promotion vào màn danh sách core.
- Luồng thêm/sửa sản phẩm dùng modal lớn desktop và full-screen sheet mobile, chia section `Thông tin sản phẩm`, `Biến thể mặc định`, `Tồn kho/truy vết`, có validation inline. Modal phải có vùng body cuộn riêng; footer không được sticky đè hoặc che section cuối.
- Row action menu `...` trên từng variant bao gồm xem chi tiết, sửa biến thể, sao chép, ngừng bán hoặc mở bán lại theo trạng thái. Thao tác ngừng bán/mở bán lại phải đi qua confirm dialog, không hard-delete.
- Drawer chi tiết chỉ giữ CTA chính `Sửa biến thể` ở action bar; không hiển thị nút chung chung `Thao tác` trong drawer.
- CTA `Nhập dữ liệu` mở modal import danh mục dạng staging: tải mẫu, chọn/drop file, kiểm lỗi theo dòng, cho import dòng hợp lệ hoặc hủy batch.
- CTA `Xuất dữ liệu` mở modal export danh mục theo phạm vi/filter hiện tại: danh sách hiện tại, toàn bộ theo filter hoặc tem barcode; định dạng CSV/XLSX/PDF tem barcode theo quyền.
- Không bao gồm Customer/CRM, commercial policy, bảng giá nâng cao, promotion, commission, loyalty hoặc warranty policy.

## Hash/state cần verify

- `#catalog`: ready view danh sách hàng hóa.
- `#detail`: drawer chi tiết sản phẩm/biến thể.
- `#create`: modal thêm sản phẩm, gồm switch quản lý tồn ở header, state tắt chỉ có helper và state bật hiện radio listbox phương thức theo dõi hàng hóa.
- `#edit`: modal sửa biến thể.
- `#row-menu`: menu thao tác cuối dòng variant.
- `#deactivate-confirm`: confirm ngừng bán/mở bán lại.
- `#import`: modal import danh mục có staging/preview lỗi.
- `#export`: modal export danh mục theo phạm vi/filter.
- `#bundle-formula`: dialog cấu hình công thức Bộ sản phẩm.
- `#bundle-formula-validation`: dialog công thức ở trạng thái lỗi khi chưa có thành phần hoặc số lượng không hợp lệ.

## Rule triển khai

- Theo `docs/product/srs/customers-promotions.md`, `docs/architecture/modules/catalog-crm.md` và data dictionary `docs/data-model/tables/catalog-crm.md`.
- UI list-first: không chia màn hình cố định với editor; detail chỉ mở khi người dùng chọn dòng.
- Toolbar filter chỉ chứa search và filter controls. Không đặt summary như `3 sản phẩm · Kho trung tâm` ở cuối toolbar; kho đã thuộc AppShell/Header scope.
- Tạo mới/sửa nhanh dùng modal/sheet; form dài hơn hoặc policy nâng cao phải chuyển sang màn/detail riêng đã được duyệt.
- Product type selector dùng custom Select/Listbox gọn, không dùng 4 segmented button lớn. Selector phải có đủ 4 option `Hàng tồn`, `Dịch vụ`, `Không tồn`, `Bộ sản phẩm`. Khi chọn từng option, vùng cấu hình bên dưới phải thay đổi theo đúng loại:
  - `Hàng tồn`: switch `Quản lý tồn` nằm cùng hàng header `Thiết lập tồn kho`, căn phải, chỉ gồm nhãn và switch, không có card nền trắng/viền riêng hoặc copy trạng thái `Đang bật`/`Đã tắt`. Đây là parent của progressive disclosure: khi tắt, ẩn hoàn toàn hai cấu hình phụ và hiện helper `Bật quản lý tồn để thiết lập mức tồn và cách theo dõi hàng hóa.`; khi bật, đặt `Tồn tối thiểu` và `Phương thức theo dõi hàng hóa` thành hai cột bằng nhau ở hàng kế tiếp; mobile xếp dọc.
  - `Phương thức theo dõi hàng hóa`: dùng custom radio listbox, một cấu hình cho mỗi biến thể, với bốn lựa chọn: `Không theo dõi` (chỉ quản lý tổng số lượng); `Theo dõi lô & hạn sử dụng`; `Theo dõi serial / IMEI`; `Theo dõi lô & hạn sử dụng và serial / IMEI`. Đây là lớp UI ánh xạ sang hai cờ `lotTracking`/`serialTracking`, không tạo field backend mới. Popover đóng khi click ngoài hoặc Escape; keyboard focus rõ ràng.
  - `Dịch vụ`: chỉ giữ trường bán hàng cần thiết, ẩn cấu hình tồn.
  - `Không tồn`: giữ SKU/barcode/đơn vị/giá, ẩn cấu hình truy vết tồn.
  - `Bộ sản phẩm` (`Bundle` nội bộ): hiện panel công thức thành phần compact, cảnh báo cần cấu hình công thức trước khi mở bán nếu chưa có thành phần.
- Drawer chi tiết ưu tiên read-only summary và tabs/section. Không rải các nút phụ như “Sửa biến thể”, “Kiểm tra barcode” trong nội dung panel; drawer action bar chỉ giữ `Sửa biến thể`, còn lifecycle/duplicate/xem chi tiết nằm ở row menu `...`.
- Dùng custom listbox/toggle/segmented control theo Cenio Core v0.7; không dùng native select.
- Không hard-delete record đã phát sinh giao dịch; dùng ngừng bán/khôi phục theo quyền.
- Duplicate SKU/barcode phải được validate rõ ràng trước khi lưu.
- Command loading chỉ hiển thị icon/spinner, không đổi nhãn nút.
- Form `Thông tin sản phẩm` đặt `Loại hàng *` và `Nhóm hàng *` trong grid hai cột có chiều rộng bằng nhau trên desktop; mobile chuyển thành một cột.
- Light/dark theme, responsive desktop/tablet/mobile phải bám artifact.

## Acceptance checklist

- [ ] Người dùng duyệt artifact trên Open Design.
- [ ] Registry đổi `Status` sang `Approved` trước khi code UI theo artifact này.
- [ ] Đường dẫn file Open Design mở được và render đúng desktop và mobile.
- [ ] Không còn nội dung Customer/Commercial/Promotion/Commission trong màn hàng hóa core.
- [ ] Summary số lượng sản phẩm nằm ở title/header area, chỉ hiển thị số lượng như `3 sản phẩm`, không hiển thị kho trong toolbar.
- [ ] Product type selector là custom Select/Listbox gọn, có đủ `Hàng tồn`, `Dịch vụ`, `Không tồn`, `Bộ sản phẩm`; mỗi loại hiển thị panel cấu hình khác nhau theo requirement.
- [ ] `Quản lý tồn` trong panel `Hàng tồn` nằm cùng hàng header, căn phải, không hiển thị chữ trạng thái hoặc card nền trắng/viền riêng. Khi tắt, hai thiết lập phụ bị ẩn hoàn toàn và chỉ hiện helper ngắn; khi bật, chúng hiện lại.
- [ ] `Tồn tối thiểu` và `Phương thức theo dõi hàng hóa` nằm cùng hàng, hai cột bằng nhau trên desktop và xếp dọc trên mobile.
- [ ] `Phương thức theo dõi hàng hóa` dùng custom radio listbox với bốn cấu hình truy xuất rõ nghĩa; không dùng checkbox độc lập hoặc segmented button.
- [ ] Bộ sản phẩm có CTA mở dialog cấu hình công thức với thành phần variant, ngày hiệu lực, validation, empty/save state và helper copy về tồn thành phần.
- [ ] Có đủ ready, no-result, duplicate validation, drawer detail, create/edit modal và command loading state.
- [ ] Create/edit modal không bị footer che nội dung; desktop body cuộn riêng, mobile full-screen sheet có safe-area footer.
- [ ] Drawer chi tiết chỉ có CTA `Sửa biến thể`, không có nút `Thao tác`.
- [ ] Row menu có đủ xem chi tiết, sửa, sao chép, ngừng bán/mở bán lại và confirm lifecycle.
- [ ] Modal `Nhập dữ liệu` thể hiện tải mẫu, upload/dropzone, staging preview lỗi, import dòng hợp lệ và hủy batch.
- [ ] Modal `Xuất dữ liệu` thể hiện phạm vi/filter hiện tại, loại dữ liệu xuất và định dạng xuất.
