# SRS — Tổng quan và yêu cầu dùng chung

**Phiên bản:** 1.0  
**Trạng thái:** Baseline được phê duyệt  
**Sản phẩm:** Ứng dụng quản lý bán hàng trên Google Workspace  
**Tài liệu nguồn:** [`PRD.md`](../PRD.md), [thiết kế bộ SRS](../../superpowers/specs/2026-07-25-sales-management-srs-design.md)

## 1. Mục đích và phạm vi

Tài liệu này là nguồn chuẩn cho các khái niệm, actor, ràng buộc và yêu cầu chung của bộ SRS. Các yêu cầu theo miền nằm ở các tài liệu cùng thư mục; khi có khác biệt, quy tắc cụ thể của miền chỉ được ưu tiên nếu có dẫn chiếu rõ đến mã yêu cầu trong tài liệu này.

Sản phẩm phục vụ cửa hàng bán lẻ hàng hóa, như tạp hóa, thời trang, mỹ phẩm và phụ tùng. Sản phẩm hỗ trợ mô hình đa chi nhánh–đa kho, nhưng tenant mới phải dùng được ngay với một chi nhánh và một kho mặc định.

Phạm vi bản đầu gồm POS tại quầy, tạo đơn online thủ công, danh mục, khách/NCC, mua–nhập–trả, tồn kho, thu–chi/công nợ, ca bán, báo cáo, in phiếu/hóa đơn bán hàng và xuất dữ liệu. Bản đầu không bao gồm đồng bộ website/sàn/đơn vị vận chuyển/ngân hàng, hóa đơn điện tử ký số, hoạt động offline hoàn toàn, F&B, sản xuất, kế toán tổng hợp hoặc API công khai.

## 2. Quy ước đặc tả

- Từ **phải** biểu thị yêu cầu bắt buộc; **có thể** biểu thị hành vi tùy quyền hoặc cấu hình.
- ID yêu cầu là duy nhất và không tái sử dụng: `SRS-OVR`, `SRS-SAL`, `SRS-INV`, `SRS-PUR`, `SRS-CRM`, `SRS-FIN`, `SRS-ACC`.
- Trạng thái viết bằng PascalCase tiếng Anh; chuyển trạng thái chỉ hợp lệ qua hành động được nêu rõ trong SRS.
- Mọi chứng từ phải có mã định danh, thời điểm, người tạo, trạng thái, tenant và phạm vi chi nhánh/kho khi áp dụng.
- “Duyệt” là xác nhận nghiệp vụ làm chứng từ có hiệu lực; “hủy” không xóa lịch sử; “đảo” tạo chứng từ đối ứng để triệt tiêu toàn bộ hoặc một phần ảnh hưởng của chứng từ đã duyệt.
- Mọi giá trị lịch sử được báo cáo phải dựa trên snapshot đã lưu trong chứng từ/sổ cái, không tính lại theo danh mục hoặc cấu hình hiện tại.

## 3. Actor và phạm vi quyền

| Actor | Mục đích chính | Phạm vi mặc định |
| --- | --- | --- |
| Owner | Sở hữu tenant, cấu hình giới hạn duyệt, sao lưu/khôi phục và kiểm soát quyền cao nhất. | Toàn tenant |
| Admin | Quản trị vận hành, người dùng và cấu hình không thuộc riêng Owner. | Toàn tenant theo quyền Owner cấp |
| Manager | Duyệt ngoại lệ và quản lý vận hành. | Chi nhánh/kho được gán |
| Cashier/Sales | Bán tại POS, tạo đơn online nhập tay, thu tiền trong quyền. | Chi nhánh/kho được gán |
| Warehouse/Purchasing | Mua, nhập, xuất, chuyển và kiểm kho. | Kho được gán |
| Accountant | Thu–chi, công nợ, đối soát và báo cáo tài chính được cấp. | Chi nhánh được gán |
| Viewer | Chỉ xem dữ liệu/báo cáo được cấp. | Tenant/chi nhánh/kho được gán |

Scope quyền chỉ có ba cấp: `tenant`, `branch`, `warehouse`. Một quyền chỉ hợp lệ khi actor có cả quyền hành động và scope bao phủ đối tượng. Backend phải kiểm tra quyền ở mọi thao tác ghi, duyệt, in và xuất; frontend chỉ ẩn/khóa UI để hỗ trợ trải nghiệm, không được là lớp kiểm soát duy nhất.

## 4. Thuật ngữ và số liệu chuẩn

| Thuật ngữ | Định nghĩa bắt buộc |
| --- | --- |
| On-hand | Số lượng vật lý đã ghi nhận tại kho, gồm hàng bán được và hàng ở trạng thái không bán được nếu đang nằm tại kho đó. |
| Available | Số lượng có thể nhận thêm đơn bán: on-hand bán được trừ reserved và các lượng đã bị khóa bởi chứng từ đang thực hiện. |
| Reserved | Lượng được giữ cho đơn online đã Confirmed; chưa phải là giảm on-hand. |
| In-transit | Lượng đã Shipped khỏi kho nguồn trong phiếu chuyển nhưng chưa Received tại kho đích; không bán được ở kho đích. |
| Quarantine | Kho/vị trí hàng chờ kiểm; không tính là tồn bán được. |
| InventoryMovement | Bản ghi sổ cái bất biến diễn tả một biến động tồn kho có nguồn gốc chứng từ. |
| Ledger | Sổ cái bất biến của tồn, tiền hoặc công nợ; số dư là kết quả có thể đối soát từ các dòng sổ cái. |
| Snapshot | Bản sao giá, thuế, tên, chiết khấu, chính sách hoặc giá vốn tại thời điểm chứng từ có hiệu lực. |
| Reversal | Chứng từ đối ứng tham chiếu chứng từ đã duyệt nhằm đảo giá trị; không sửa dòng cũ. |
| K80 | Mẫu in dành cho giấy cuộn nhiệt rộng 80 mm. |

Tiền tệ duy nhất là VND; mọi giá trị tiền làm tròn đến đồng. Số lượng tối đa ba chữ số thập phân. Mỗi sản phẩm/đơn vị quy đổi phải xác định rõ có cho phép số lượng lẻ hay không.

## 5. Cấu trúc tổ chức và dữ liệu

### SRS-OVR-001 — Tenant, chi nhánh và kho

Hệ thống phải cô lập dữ liệu theo tenant. Một `Branch` thuộc một tenant; một `Warehouse` thuộc đúng một Branch. Wizard khởi tạo phải tạo một Branch và một Warehouse mặc định trước khi người dùng tạo giao dịch.

**Tiêu chí nghiệm thu:** Người dùng chỉ có quyền một Branch không thể tạo, xem, in, xuất hoặc suy đoán dữ liệu của Branch khác bằng thay đổi tham số yêu cầu.

### SRS-OVR-002 — Nguồn sự thật và tính bất biến

Số tồn, số dư quỹ và công nợ phải truy vết được đến sổ cái/chứng từ nguồn. Hệ thống có thể duy trì bảng tổng hợp để đọc nhanh nhưng không được cho phép sửa số tổng hợp để thay thế bút toán nguồn. Chứng từ đã duyệt không được sửa hoặc xóa; việc sửa sai thực hiện bằng hủy nếu chưa có ảnh hưởng kế tiếp, hoặc bằng điều chỉnh/đảo theo miền nghiệp vụ.

**Tiêu chí nghiệm thu:** Sau khi một hóa đơn Completed, người không có quy trình điều chỉnh không thể sửa hàng, số lượng, giá, thuế hay thanh toán trong hóa đơn; báo cáo lịch sử vẫn truy ra hóa đơn và các chứng từ đối ứng.

### SRS-OVR-003 — Định danh, thời gian và đánh số

Mọi thực thể nghiệp vụ phải dùng ID nội bộ bất biến, không dựa vào số dòng Sheet. Mã hiển thị chứng từ phải theo mẫu cấu hình, duy nhất trong tenant đối với loại chứng từ và không tái sử dụng sau khi hủy. Thời điểm lưu theo `Asia/Ho_Chi_Minh`; màn hình và báo cáo hiển thị ngày/giờ theo cùng múi giờ.

**Tiêu chí nghiệm thu:** Sắp xếp, thêm hoặc archive dòng trong Sheet không làm thay đổi liên kết giữa chứng từ, sổ cái và file đính kèm.

### SRS-OVR-004 — Đồng thời, khóa và idempotency

Mọi thao tác có thể làm thay đổi tồn, tiền, công nợ, trạng thái chứng từ hoặc quyền phải chạy trong cơ chế commit có khóa và idempotency. Baseline phải dùng `ScriptLock` chỉ trong đoạn commit nghiệp vụ ngắn; không dùng logical lock theo SKU/kho ở baseline. Trước khi ghi, backend phải đọc lại dữ liệu quyết định từ nguồn hiện hành, kiểm tra idempotency lần cuối, rồi batch-write chứng từ, ledger, materialized balance và `CommandTransaction`. Không ghi audit riêng trong hot path; record được tạo/cập nhật phải lưu actor metadata như `createdBy`, `updatedBy`, `approvedBy`, `cancelledBy` hoặc field `...By` phù hợp.

Mỗi yêu cầu tạo/hoàn tất/duyệt/đảo phải mang `commandId` và khóa idempotency do client tạo. `CommandTransaction` phải hỗ trợ tối thiểu `Preparing`, `Committed`, `Failed`; fast path cho command mới được phép append trực tiếp `Committed` sau khi document/ledger/projection bắt buộc đã ghi thành công theo [ADR 0016](../../decisions/0016-command-journal-single-commit-fast-path.md) và [ADR 0017](../../decisions/0017-record-actor-metadata-no-standalone-audit.md). Chỉ dữ liệu của command `Committed` được tính vào số dư, báo cáo và kết quả nghiệp vụ. Sau timeout, client phải tra cứu `commandId` hoặc gửi lại cùng idempotency key; backend trả kết quả commit cũ hoặc kết quả recovery, không tạo nhóm chứng từ/ledger thứ hai.

**Tiêu chí nghiệm thu:** Hai thao tác đồng thời hoàn tất đơn cuối cùng của cùng một SKU tại một kho không thể cùng làm tồn giảm vượt quy tắc âm kho; gửi lại cùng yêu cầu hoàn tất đơn chỉ tạo một hóa đơn và một nhóm ledger; execution lỗi hoặc timeout giữa command không làm report/số dư tính dữ liệu chưa `Committed`.

### SRS-OVR-019 — Vòng đời Branch và Warehouse

Owner/Admin trong quyền phải tạo, sửa, ngừng hoạt động Branch và Warehouse; Warehouse phải thuộc đúng một Branch và có cờ bán trực tiếp, chặn âm kho, theo dõi lô/serial và ngưỡng duyệt theo cấu hình. Không được ngừng Branch/Warehouse khi còn tồn, reservation/in-transit, chứng từ mở, ca mở hoặc user còn được gán; user phải hoàn tất điều chuyển/đóng ca/gỡ quyền theo quy trình rồi mới ngừng. Không xóa cứng Branch/Warehouse đã từng có chứng từ.

**Tiêu chí nghiệm thu:** Thử ngừng Warehouse đang có tồn hoặc ca Open bị chặn và hiển thị đối tượng cần xử lý; Warehouse ngừng hoạt động không xuất hiện trong giao dịch mới nhưng lịch sử vẫn truy vấn được.

### SRS-OVR-020 — Cache POS phiên bản hóa

Sau khi POS đã sẵn sàng, catalog, barcode index, bảng giá, policy promotion và cấu hình POS trong Branch/Warehouse hiện hành phải được dùng từ cache read-only tại browser. Quét mã, tìm hàng, đổi số lượng và tính giỏ không được gọi Apps Script theo từng thao tác. Cache phải có version và invalidation phù hợp khi logout, đổi quyền/scope, deployment/schema mới hoặc dữ liệu liên quan thay đổi.

Cache không được là nguồn quyết định tồn, quỹ, công nợ, quyền hoặc kết quả commit. Tồn hiển thị từ cache chỉ là tham khảo đến lúc backend kiểm tra lại; stale cache chỉ dùng để đọc, không cho phép ghi.

### SRS-OVR-021 — Tác vụ nền

Worker phải có `runId`, checkpoint, execution budget và retry giới hạn. Worker chỉ xử lý backup, export lớn, archive, import batch, reconcile/read-model rebuild, integrity check, dọn runtime TTL và cảnh báo quota/capacity. Worker không được hoàn tất POS hoặc tự tạo inventory/cash/receivable ledger thay cho command đồng bộ của người dùng.

### SRS-OVR-022 — Web App công khai và session nội bộ

Web App được mở qua URL công khai để nhân viên không cần Google account, nhưng mọi API trừ login phải xác thực session nội bộ và kiểm tra permission/scope ở backend. Google account của khách chỉ là account sở hữu/triển khai và quyền chạy Apps Script, không là identity của nhân viên. `doGet`/bootstrap chưa xác thực không được trả business data.

### SRS-OVR-023 — Vòng đời tenant, deploy và migration

Installer phải chạy trên Google account của khách, hỗ trợ Gmail cá nhân và Google Workspace; Shared Drive là tùy chọn của Workspace. Mọi tài nguyên phải nằm dưới một thư mục Drive gốc của tenant; ID tài nguyên, active partition, schema/app version và deployment profile được quản lý qua runtime config, không hard-code.

Upgrade phải có compatibility check, backup trước migration, migration versioned/idempotent, maintenance mode khi ảnh hưởng ghi và release note. Chỉ rollback deployment nếu schema tương thích; migration không tương thích phải restore hoặc migration tiến.

### SRS-OVR-024 — Observability và chứng nhận hiệu năng

API phải có `requestId`, `durationMs`, stage timing và chỉ số I/O cần thiết; chỉ warning/error mới cần persist telemetry. Mỗi release ảnh hưởng POS phải benchmark cold/warm cache với tối thiểu 1 Branch, 1 Warehouse, 10.000 SKU/variant và dữ liệu giao dịch đại diện; phải đo mở POS, scan, search, cart change, checkout đơn giản/phức tạp, retry timeout, hai checkout đồng thời, report/export chạy song song. Release cũng phải có kịch bản 20 user hoạt động theo `SRS-OVR-012` để chứng minh không có duplicate, bypass permission hoặc command outcome không xác định.

## 6. Xác thực, tài khoản và bảo mật

### SRS-OVR-005 — Tách Google deployment khỏi đăng nhập ứng dụng

Google account của khách chỉ dùng để sở hữu Drive/Spreadsheet, triển khai Apps Script và chạy Web App. Hệ thống không được suy ra danh tính, quyền hay trạng thái đăng nhập ứng dụng từ Google account đó. `loginId` là tên tài khoản hoặc email do admin tạo, duy nhất không phân biệt hoa/thường; email chỉ là định danh, không yêu cầu xác minh qua Google hay gửi email.

### SRS-OVR-006 — Khởi tạo và vòng đời tài khoản

Lần triển khai đầu phải tạo một tài khoản admin mặc định với mật khẩu tạm một lần. Hệ thống bắt buộc admin đổi mật khẩu ở lần đăng nhập thành công đầu tiên trước khi truy cập dữ liệu. Admin/Owner phải tạo, ngừng hoạt động, đặt lại mật khẩu và gán vai trò cho tài khoản; không có quên mật khẩu tự phục vụ. Không được xóa cứng user đã tạo chứng từ.

### SRS-OVR-007 — Mật khẩu và phiên

Mật khẩu chỉ được truyền qua kết nối HTTPS và lưu dưới dạng credential verifier HMAC-SHA256 có salt riêng từng user và tenant pepper trong Script Properties; không được lưu plaintext trong source, log, Google Sheets, tệp export hay giao diện. Credential verifier/pepper chỉ được giữ trong vùng cấu hình bảo mật Apps Script phù hợp quota, tách khỏi dữ liệu nghiệp vụ. Session token là opaque token; phiên thường chỉ giữ trong browser session, còn phiên “ghi nhớ đăng nhập” chỉ được lưu persistent phía browser khi người dùng chủ động chọn trên thiết bị cá nhân. Server chỉ lưu HMAC fingerprint, user, scope snapshot, issued time, idle/absolute expiry và revoke state.

Sau 5 lần đăng nhập sai liên tiếp, tài khoản phải bị khóa 15 phút. Login phải có rate limit theo `loginId` trước bước đọc user/credential; API nhạy cảm phải có rate limit theo session khi áp dụng. Audit/telemetry không được chứa mật khẩu hay token. Phiên thường phải tự kết thúc sau 1 giờ không hoạt động và không tồn tại quá 8 giờ kể từ lúc đăng nhập. Nếu người dùng tick “Ghi nhớ đăng nhập trên thiết bị này trong 7 ngày”, session có idle expiry và absolute expiry tối đa 7 ngày để mở lại App không phải login lại. Đổi mật khẩu, đặt lại mật khẩu, ngừng user và thay đổi quyền/scope phải thu hồi toàn bộ phiên đang hoạt động của user đó và invalidation permission/session cache ngay.

**Tiêu chí nghiệm thu:** Lần đăng nhập sai thứ năm trả trạng thái bị khóa; thử lại trước 15 phút bị chặn; phiên thường không thao tác trong 60 phút bị yêu cầu đăng nhập; phiên ghi nhớ còn hiệu lực khi mở lại App trong 7 ngày; người dùng có phiên cũ không truy cập được sau khi admin đặt lại mật khẩu.

### SRS-OVR-008 — Bảo vệ dữ liệu nền tảng

Nhân viên nghiệp vụ chỉ thao tác qua ứng dụng; các Sheet dữ liệu được bảo vệ và không chia sẻ quyền chỉnh sửa cho user ứng dụng chỉ vì họ có tài khoản nội bộ. Chủ sở hữu Google vẫn sở hữu tệp và có thể sửa trực tiếp, nhưng SRS coi việc đó là ngoài luồng hỗ trợ và phải được cảnh báo tại khu vực quản trị. Không lưu secret trong source code hoặc Google Sheets. Properties Service chỉ được dùng cho cấu hình/secret giới hạn phù hợp quota, không dùng làm cơ sở dữ liệu nghiệp vụ hoặc bản sao lưu. File Drive không được cấp URL công khai hoặc quyền edit trực tiếp cho user nội bộ chỉ để mở/tải file.

## 7. Audit, lưu trữ và khôi phục

### SRS-OVR-009 — Actor metadata và lịch sử thao tác

Baseline không lưu audit nghiệp vụ riêng bằng `AuditOutbox` hoặc `AuditLog`. Mọi record nghiệp vụ hoặc record vận hành quan trọng phải lưu người thực hiện trực tiếp trên record: `createdBy/createdAt`, `updatedBy/updatedAt`, và với chuyển trạng thái phải có field phù hợp như `approvedBy/approvedAt`, `cancelledBy/cancelledAt`, `reversedBy/reversedAt`, `uploadedBy/uploadedAt`, `requestedBy/requestedAt`.

Chứng từ, ledger và snapshot đã `Committed` vẫn là nguồn truy vết chính và không được sửa trực tiếp. Đăng nhập, lỗi, quota, health và cảnh báo kỹ thuật chỉ persist telemetry khi cần điều tra warning/error; success bình thường không tạo audit/telemetry bền vững.

### SRS-OVR-010 — Sao lưu và khôi phục

Hệ thống phải tạo một bản sao lưu dữ liệu hằng ngày trong thư mục Drive riêng của tenant và giữ 30 bản gần nhất. Owner có thể tạo backup thủ công. Backup phải có manifest gồm app version, schema version, danh sách Core/Runtime/Transaction/Audit partition, row count, checksum, runtime config và metadata Drive; attachment được backup tăng dần theo metadata/file version.

Chỉ Owner được yêu cầu khôi phục. Restore không được ghi đè trực tiếp bộ tài nguyên production: hệ thống phải khóa thao tác ghi, hiển thị định danh/thời điểm backup, yêu cầu xác nhận rõ ràng và lưu `requestedBy/switchedBy` trên record restore; tạo bộ Spreadsheet/Drive phục hồi riêng; kiểm tra manifest/checksum/liên kết; rồi yêu cầu Owner xác nhận chuyển runtime config sang bộ mới. Bộ cũ phải được giữ để rollback khôi phục; session bị thu hồi và health check phải thành công trước khi mở lại ghi. Lịch sử phiên bản Google Sheets/Drive chỉ là lớp khôi phục bổ sung, không thay thế backup ứng dụng.

### SRS-OVR-011 — Archive và dung lượng

Dữ liệu phải được phân vai thành Core Data, Runtime Data và Transaction Data. Transaction Data phải được partition theo kỳ; partition đang hoạt động là vùng ghi nóng, partition đã đóng là chỉ đọc nhưng vẫn tra cứu/xuất được. Hệ thống phải tạo partition tiếp theo trước ngưỡng dung lượng/hiệu năng, không chờ Spreadsheet đầy và không tự xóa dữ liệu nghiệp vụ lịch sử.

Archive chuyển partition đóng sang vùng lưu trữ vẫn tra cứu/xuất được nhưng không làm chậm truy vấn vận hành. Archive không được phá vỡ ID, partition routing, liên kết sổ cái, file đính kèm hoặc actor metadata; truy vấn lịch sử phải route theo partition key/reference, không quét toàn bộ Spreadsheet lịch sử. Runtime Data có TTL và chỉ dữ liệu kỹ thuật hết hạn mới được dọn theo chính sách. Owner quyết định thời điểm archive theo hướng dẫn vận hành; thao tác archive và phục hồi archive phải lưu actor metadata trên record vận hành tương ứng.

## 8. Yêu cầu phi chức năng

| ID | Yêu cầu |
| --- | --- |
| SRS-OVR-012 | Thiết kế phải hỗ trợ tối thiểu 5 Branch, 10 Warehouse, 20 user hoạt động đồng thời, 10.000 SKU/variant đang hoạt động và khoảng 300 đơn/ngày/tenant khi có archive vận hành. Mục tiêu tốc độ tại `SRS-OVR-013` được chứng nhận cho baseline cửa hàng nhỏ một Branch, một Warehouse, một thu ngân; ở mức 20 user hoạt động, hệ thống vẫn phải bảo toàn idempotency/quyền/tồn–tiền và trả trạng thái hoặc lỗi retry rõ ràng, không tạo chứng từ nửa vời. |
| SRS-OVR-013 | Với mạng bình thường và profile kiểm thử tại `SRS-OVR-024`: quét barcode sau khi POS sẵn sàng phải p95 ≤ 150 ms tại browser; tìm catalog đã đồng bộ p95 ≤ 250 ms; đổi giỏ/tính giá tại browser p95 ≤ 100 ms; hoàn tất POS cửa hàng nhỏ p95 ≤ 3 giây và p99 ≤ 5 giây, không tính thao tác in; mở POS/lần reload đầu p95 ≤ 5 giây. Báo cáo/export lớn phải chạy nền, có trạng thái và không cạnh tranh POS. |
| SRS-OVR-014 | Khi tác vụ vượt khả năng xử lý đồng bộ, UI phải hiển thị trạng thái đang xử lý và kết quả có thể tra cứu lại; backend không được để người dùng không biết chứng từ đã được tạo hay chưa. |
| SRS-OVR-015 | Mọi lỗi nghiệp vụ phải có mã lỗi, thông điệp tiếng Việt dễ hiểu và không để lộ secret, chi tiết nội bộ hoặc dữ liệu ngoài scope quyền. |
| SRS-OVR-016 | Ứng dụng phải hoạt động trên trình duyệt desktop hiện đại; POS phải dùng được scanner barcode như thiết bị nhập bàn phím. Không cam kết offline hoặc đồng bộ xung đột khi mất Internet. |
| SRS-OVR-017 | UI phải hiển thị rõ trạng thái chứng từ, trạng thái thanh toán, kho tác động, người duyệt và cảnh báo ngoại lệ trước khi người dùng xác nhận thao tác không thể sửa trực tiếp. |
| SRS-OVR-018 | Thay đổi cấu hình có hiệu lực về sau; không được tự tính lại snapshot lịch sử của giá, thuế, giá vốn, promotion hoặc quyền đã áp dụng trên chứng từ cũ. |

## 9. Ma trận phê duyệt mặc định

Owner cấu hình ngưỡng số tiền/số lượng cho từng hành động. Dưới ngưỡng, Manager là người duyệt mặc định; từ ngưỡng Owner quy định, Owner phải duyệt. Người tạo không được tự duyệt cùng chứng từ/ngoại lệ trừ khi Owner cấu hình rõ một ngoại lệ đặc biệt và hệ thống lưu cấu hình cùng `createdBy/updatedBy` trên record cấu hình.

| Hành động cần duyệt | Người duyệt mặc định |
| --- | --- |
| Bán âm kho | Manager |
| Đổi giá/giảm giá vượt ngưỡng | Manager |
| Trả nhanh không có đơn gốc | Manager |
| Điều chỉnh, hủy hoặc scrap tồn | Manager |
| Chênh lệch kiểm kê | Manager |
| Chênh lệch đóng ca | Manager |
| Đảo phiếu thu/chi hoặc thanh toán đã duyệt | Manager |

## 10. Tiêu chí hoàn thành chung

Bộ SRS được coi là triển khai được khi mọi yêu cầu bắt buộc có ID, không mâu thuẫn về trạng thái/tồn/tiền/quyền, có tiêu chí nghiệm thu cho hành vi rủi ro cao, và mọi mô-đun dẫn chiếu các quy tắc chung thay vì sao chép biến thể.
