# Sales Management SRS Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soạn bộ SRS mô-đun, có thể kiểm thử, cho ứng dụng quản lý bán hàng trên Google Workspace và đồng bộ các quy ước repository liên quan.

**Architecture:** `docs/product/srs/overview.md` là nguồn chuẩn cho thuật ngữ, ràng buộc chung và yêu cầu phi chức năng. Sáu tài liệu theo miền chỉ chứa yêu cầu của miền đó, liên kết bằng mã yêu cầu, và cùng dùng một định dạng gồm phạm vi, quy tắc, trạng thái, quyền, dữ liệu lưu và tiêu chí nghiệm thu.

**Tech Stack:** Markdown, Node.js (chỉ để xác minh cấu trúc), React/TypeScript/Vite, Google Apps Script, Google Sheets, Google Drive, clasp.

## Global Constraints

- Tài liệu viết bằng tiếng Việt; mã yêu cầu và tên trạng thái giữ nhất quán bằng tiếng Anh khi có giá trị kỹ thuật.
- Không suy diễn tính năng ngoài `docs/product/PRD.md` và thiết kế SRS đã được duyệt.
- Dùng VND, tiền làm tròn đến đồng, số lượng tối đa 3 chữ số thập phân khi sản phẩm cho phép.
- Tài khoản ứng dụng là nội bộ; không dùng Google account/OAuth để xác thực người dùng.
- Dữ liệu nghiệp vụ chỉ được thao tác qua ứng dụng; không lưu secret trong source code hoặc Google Sheets. Properties Service chỉ dùng cho secret/cấu hình giới hạn, không dùng cho dữ liệu nghiệp vụ.
- Không xóa cứng chứng từ đã có giao dịch; áp dụng hủy, lưu trữ hoặc chứng từ đảo/điều chỉnh.
- SRS không thay thế thiết kế schema Sheet, API contract, wireframe hay kiến trúc mã nguồn.
- Repository chưa được khởi tạo Git, nên không có bước commit.

---

## File structure

- Create: `docs/product/srs/overview.md` — quy ước, phạm vi, actor, NFR, bảo mật, backup, thuật ngữ và tiêu chí dùng chung.
- Create: `docs/product/srs/sales-orders.md` — POS, đơn online thủ công, trả/đổi, thanh toán bán hàng, thuế và in phiếu.
- Create: `docs/product/srs/inventory.md` — tồn, giá vốn, reservation, chuyển/kiểm/điều chỉnh kho, lô và serial.
- Create: `docs/product/srs/purchasing.md` — nhà cung cấp, PO, nhận/trả hàng và phải trả.
- Create: `docs/product/srs/customers-promotions.md` — danh mục, khách hàng, bảng giá, khuyến mại, tích điểm, bảo hành và hoa hồng.
- Create: `docs/product/srs/finance.md` — quỹ, thu–chi, phân bổ công nợ, ca bán, két và chi phí.
- Create: `docs/product/srs/access-reporting.md` — account nội bộ, RBAC, audit, import/export, báo cáo và vận hành dữ liệu.
- Modify: `docs/architecture/folder-structure.md` — thêm `docs/product/srs/` vào nguồn chuẩn cấu trúc.
- Modify: `README.md` — thêm liên kết đến điểm vào SRS.
- Modify: `scripts/verify-structure.mjs` — yêu cầu bảy tệp SRS để ngăn cấu trúc tài liệu bị thiếu.

### Task 1: Chuẩn hóa khung và yêu cầu dùng chung

**Files:**
- Create: `docs/product/srs/overview.md`

**Interfaces:**
- Consumes: `docs/product/PRD.md`, `docs/superpowers/specs/2026-07-25-sales-management-srs-design.md`.
- Produces: Thuật ngữ, actor, convention ID và các quy tắc chung được sáu module tham chiếu.

- [ ] **Step 1: Viết phạm vi và quy ước nhận diện yêu cầu**

Nêu rõ phạm vi POS và đơn online nhập tay, đa chi nhánh–đa kho, các ngoại lệ ngoài bản đầu. Quy định tiền tố ID: `SRS-OVR`, `SRS-SAL`, `SRS-INV`, `SRS-PUR`, `SRS-CRM`, `SRS-FIN`, `SRS-ACC`; mỗi yêu cầu có mô tả, rule, quyền, dữ liệu và tiêu chí nghiệm thu khi phù hợp.

- [ ] **Step 2: Viết actor, thuật ngữ và bất biến toàn hệ thống**

Định nghĩa Owner, Admin, Manager, Cashier/Sales, Warehouse/Purchasing, Accountant và Viewer; các thuật ngữ on-hand, available, reserved, in-transit, ledger, reversal, snapshot, K80, A4. Ghi rõ nguyên tắc không xóa chứng từ, snapshot lịch sử, audit và khóa ghi.

- [ ] **Step 3: Đặc tả NFR, bảo mật, backup và khả năng vận hành**

Ghi quy mô 5 branch/10 warehouse/20 người dùng đồng thời/10.000 SKU/300 đơn ngày; thời gian phản hồi, khóa đồng thời, idempotency, logging, archive. Đưa vào xác thực nội bộ, quy tắc session, password reset bởi admin, quyền Google chỉ để triển khai, bảo vệ Sheet, sao lưu hằng ngày 30 bản và khôi phục Owner có audit.

- [ ] **Step 4: Kiểm tra độc lập tính rõ ràng của `overview.md`**

Run: `rg -n "TBD|TODO|cần xem xét" docs/product/srs/overview.md`  
Expected: Không có kết quả.

### Task 2: Đặc tả bán hàng, đơn hàng và hoàn trả

**Files:**
- Create: `docs/product/srs/sales-orders.md`

**Interfaces:**
- Consumes: thuật ngữ và NFR từ `overview.md`; tồn/reservation từ `inventory.md`; bảng giá/khuyến mại từ `customers-promotions.md`; thu–chi/công nợ từ `finance.md`.
- Produces: yêu cầu `SRS-SAL-*`, trạng thái đơn và điều kiện tạo biến động liên miền.

- [ ] **Step 1: Đặc tả POS, giỏ hàng và thanh toán bán hàng**

Nêu tìm hàng barcode/SKU/tên, quyền Branch/Warehouse, tạo khách nhanh, nhiều phương thức/thanh toán một phần, QR chỉ để hiển thị, bán chịu, snapshot và ngưỡng đổi giá/giảm giá.

- [ ] **Step 2: Đặc tả máy trạng thái và hậu quả hạch toán**

Mô tả chính xác `Draft → Completed | Cancelled` của POS và `Draft → Confirmed → Packing → Shipped → Delivered | Cancelled` của đơn online. Xác định Completed và Shipped là thời điểm phát sinh doanh thu/công nợ/tồn tương ứng; payment không chi phối trạng thái hoàn tất đơn.

- [ ] **Step 3: Đặc tả trả/đổi, thuế và in phiếu**

Ghi trả hàng tham chiếu đơn gốc trong thời hạn cấu hình; fast return chỉ Manager/Owner, có lý do/audit; đổi hàng là trả và bán liên kết. Ghi thứ tự giảm giá–VAT, snapshot thuế, làm tròn VND, in qua browser K80/A4 và không phải hóa đơn điện tử ký số.

- [ ] **Step 4: Bổ sung tiêu chí nghiệm thu theo luồng**

Bao phủ ít nhất: bán đủ tiền, bán thiếu tiền, bán chịu, đơn online hủy trước giao, giao online, trả về kiểm, fast return bị chặn khi thiếu quyền, và in lại phiếu.

### Task 3: Đặc tả danh mục, khách hàng và chính sách thương mại

**Files:**
- Create: `docs/product/srs/customers-promotions.md`

**Interfaces:**
- Consumes: `overview.md`; giá được áp dụng từ `sales-orders.md`; hậu quả tồn từ `inventory.md`.
- Produces: `SRS-CRM-*` và các contract nghiệp vụ cho giá, promotion, điểm và danh mục.

- [ ] **Step 1: Đặc tả sản phẩm và biến thể**

Nêu nhóm/brand/variant/SKU/barcode, đơn vị quy đổi, hàng tồn/dịch vụ/combo, lô–hạn/serial, giá trị snapshot và import danh mục có kiểm tra theo dòng.

- [ ] **Step 2: Đặc tả khách hàng, bảng giá và khuyến mại**

Nêu chống trùng, nhóm khách, bảng giá theo Branch/nhóm/thời gian. Cố định thứ tự áp dụng giá đã duyệt: giá sản phẩm → branch price list → customer group price → một promotion tự động tốt nhất → voucher/points; không tự cộng dồn promotion xung đột.

- [ ] **Step 3: Đặc tả điểm, bảo hành và hoa hồng cơ bản**

Nêu ledger điểm, expiry, trả hàng đảo/điều chỉnh điểm; bảo hành theo serial/đơn gốc; hoa hồng xuất dữ liệu, không thay thế payroll.

- [ ] **Step 4: Bổ sung tiêu chí nghiệm thu và truy vết**

Bao phủ tìm hàng, chống SKU/serial trùng, combo, price precedence, promotion conflict, voucher/point reversal và lịch sử giá.

### Task 4: Đặc tả kho và giá vốn

**Files:**
- Create: `docs/product/srs/inventory.md`

**Interfaces:**
- Consumes: `overview.md`, sự kiện bán từ `sales-orders.md`, sự kiện nhận/trả mua từ `purchasing.md`.
- Produces: `SRS-INV-*`, quy tắc `InventoryMovement`, giá vốn và trạng thái tồn.

- [ ] **Step 1: Đặc tả sổ cái tồn và số dư**

Định nghĩa InventoryMovement bất biến, available/on-hand/reserved/in-transit, kho nguồn/đích, đơn vị cơ bản và snapshot giá vốn. Nêu không dùng một ô tồn có thể sửa làm nguồn sự thật.

- [ ] **Step 2: Đặc tả moving weighted average và reservation**

Nêu công thức/điểm tính lại giá vốn sau tăng tồn hợp lệ, chốt giá vốn ở giảm tồn, tách FEFO với phương pháp giá vốn. Xác định Confirmed online tạo reservation, Shipped giảm on-hand, cancel giải phóng reservation.

- [ ] **Step 3: Đặc tả ngoại lệ tồn, chuyển kho, kiểm kho và điều chỉnh**

Nêu chặn âm kho và workflow Manager/Owner; trạng thái chuyển kho, giảm nguồn lúc Shipped và tăng đích lúc Received; kiểm kho snapshot không khóa bán, phê duyệt chênh và phân tách người kiểm/người duyệt; quarantine, scrap, lô/serial và cảnh báo.

- [ ] **Step 4: Bổ sung tiêu chí nghiệm thu đối soát**

Bao phủ bán POS, đơn online, âm kho, chuyển một phần, nhận chênh, kiểm trong khi bán, điều chỉnh/hủy hàng, FEFO và truy vết movement đến chứng từ nguồn.

### Task 5: Đặc tả mua hàng và phải trả

**Files:**
- Create: `docs/product/srs/purchasing.md`

**Interfaces:**
- Consumes: `overview.md`, giá vốn/tồn từ `inventory.md`, thu–chi/phải trả từ `finance.md`.
- Produces: `SRS-PUR-*`, sự kiện PO, receipt, purchase return và payable.

- [ ] **Step 1: Đặc tả nhà cung cấp, PO và nhận hàng**

Nêu dữ liệu NCC, trạng thái PO, nhận một phần/toàn bộ, kho nhận bắt buộc, lô/serial, giá nhập thực tế và không tăng tồn chỉ vì duyệt PO.

- [ ] **Step 2: Đặc tả chi phí mua, trả NCC và phải trả**

Nêu chi phí mua bổ sung, nguyên tắc phân bổ được snapshot; trả tham chiếu receipt, giảm tồn đúng kho/lô/serial; phải trả theo chứng từ/hạn thanh toán/thanh toán từng phần.

- [ ] **Step 3: Bổ sung tiêu chí nghiệm thu**

Bao phủ PO không tăng tồn, receipt một phần, receipt lô/serial không hợp lệ bị chặn, phân bổ chi phí, trả NCC và thanh toán một phần.

### Task 6: Đặc tả tài chính, công nợ và ca bán

**Files:**
- Create: `docs/product/srs/finance.md`

**Interfaces:**
- Consumes: nghĩa vụ từ `sales-orders.md` và `purchasing.md`; quy tắc quyền từ `overview.md`.
- Produces: `SRS-FIN-*`, cash/debt ledger, allocation, shift và reconciliation.

- [ ] **Step 1: Đặc tả quỹ/tài khoản, thu–chi và phân bổ**

Nêu cash/bank/wallet theo Branch, phiếu thu/chi độc lập hoặc từ chứng từ nguồn, payment allocation nhiều-nhiều, credit/prepayment, lý do và reversal bằng chứng từ mới.

- [ ] **Step 2: Đặc tả phải thu, phải trả, chi phí và ca bán**

Nêu công nợ theo chứng từ, hạn mức/hạn thanh toán, chi phí vận hành. Đặc tả mở/đóng ca: một cashier–một drawer, POS cần ca mở, đối chiếu thực tế, chênh cần lý do/duyệt và không mở lại ca đã khóa.

- [ ] **Step 3: Bổ sung tiêu chí nghiệm thu**

Bao phủ một khoản thu phân bổ nhiều hóa đơn, khách trả dư, reverse payment, mở ca bị chặn, closing variance, sửa ca bị cấm và chi phí có chứng từ đính kèm.

### Task 7: Đặc tả truy cập, báo cáo, import/export và vận hành

**Files:**
- Create: `docs/product/srs/access-reporting.md`

**Interfaces:**
- Consumes: `overview.md` và snapshots/sổ cái từ mọi mô-đun.
- Produces: `SRS-ACC-*`, matrix quyền, yêu cầu audit/report/export và điều kiện vận hành.

- [ ] **Step 1: Đặc tả account nội bộ và RBAC**

Nêu `loginId` duy nhất không phân biệt hoa thường, mật khẩu băm/salt, admin mặc định đổi mật khẩu ở lần đầu, admin tạo/ngừng/reset người dùng, khóa 5 lần/15 phút, idle 1 giờ, session tối đa 8 giờ. Phân quyền backend theo tenant/branch/warehouse và quyền riêng với COGS/profit/debt/cash/export.

- [ ] **Step 2: Đặc tả audit, import/export, backup/restore và archive**

Nêu event audit không thể sửa, dữ liệu bắt buộc của log; import staging/validate/error theo dòng; export theo quyền; 30 daily snapshots, manual backup, restore Owner có freeze/confirm/audit; archive lịch sử để giữ hiệu năng quota.

- [ ] **Step 3: Đặc tả báo cáo và KPI**

Nêu dashboard/báo cáo bán, kho, mua, công nợ, quỹ, ca bán, trả hàng, hàng sắp hết hạn, hiệu suất và lợi nhuận gộp; bắt buộc tuân thủ scope quyền và snapshot lịch sử.

- [ ] **Step 4: Bổ sung tiêu chí nghiệm thu**

Bao phủ login lockout/session, boundary branch/warehouse, COGS/export bị chặn, audit yêu cầu duyệt, import lỗi từng dòng, export phạm vi quyền, backup/restore và report không lộ dữ liệu bị hạn chế.

### Task 8: Đồng bộ cấu trúc repository và kiểm tra toàn bộ bộ SRS

**Files:**
- Modify: `docs/architecture/folder-structure.md`
- Modify: `README.md`
- Modify: `scripts/verify-structure.mjs`
- Verify: `docs/product/srs/*.md`

**Interfaces:**
- Consumes: Bảy tài liệu SRS từ Task 1–7.
- Produces: repository ghi nhận `docs/product/srs/` là cấu trúc chuẩn và verifier phát hiện tệp SRS thiếu.

- [ ] **Step 1: Cập nhật bản đồ cấu trúc và README**

Thêm `docs/product/srs/` vào cây và bảng ý nghĩa ở `docs/architecture/folder-structure.md`; mô tả đây là SRS mô-đun. Thêm liên kết `docs/product/srs/overview.md` ở phần tài liệu sản phẩm của `README.md`.

- [ ] **Step 2: Mở rộng verifier**

Thêm chính xác bảy đường dẫn SRS vào `requiredPaths` của `scripts/verify-structure.mjs`, để thiếu bất kỳ tệp nào thì script in tên đường dẫn và kết thúc khác `0`.

- [ ] **Step 3: Kiểm tra cấu trúc và nội dung cấm**

Run: `node scripts/verify-structure.mjs`  
Expected: In `Cấu trúc thư mục base hợp lệ.` và kết thúc mã `0`.

Run: `rg -n "TBD|TODO|cần xem xét" docs/product/srs`  
Expected: Không có kết quả.

- [ ] **Step 4: Kiểm tra liên kết và nhất quán nghiệp vụ**

Đối chiếu các ID liên miền, trạng thái đơn/kho, thời điểm trừ tồn/doanh thu, giá vốn, quyền phê duyệt, login/session, backup và ngoài phạm vi giữa bảy tệp. Sửa trực tiếp mọi mâu thuẫn trước khi bàn giao.

- [ ] **Step 5: Kiểm tra phạm vi thay đổi**

Run: `git status --short`  
Expected: Nếu repository được khởi tạo Git sau này, chỉ thấy bảy tệp SRS, tài liệu cấu trúc, README và verifier trong phạm vi kế hoạch; hiện tại có thể báo `not a git repository`.
