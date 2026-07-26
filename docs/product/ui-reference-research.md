# Nghiên cứu nguồn tham khảo UI cho Cenio Core

| Thuộc tính | Giá trị |
| --- | --- |
| Trạng thái | Tài liệu tham khảo thiết kế |
| Cập nhật | 25/07/2026 |
| Phạm vi | Sales Management là sản phẩm thí điểm; Cenio Core phục vụ các ứng dụng quản lý và mini ERP tiếp theo. |
| Tech stack mục tiêu | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Google Apps Script và Google Workspace. |

## 1. Mục tiêu

Tài liệu này tổng hợp các nguồn tham khảo UI đã khảo cứu để xây dựng **Cenio Core Design System**. Mục tiêu là rút ra token, component, page pattern và hành vi UX phù hợp với phần mềm B2B quản lý bán hàng, CRM, kho, mua hàng, tài chính và mini ERP.

Tài liệu không cho phép sao chép nguyên giao diện, thương hiệu, asset, nội dung, mã nguồn hoặc tuyên bố marketing của các nguồn tham khảo. Mỗi ý tưởng chỉ được đưa vào Cenio Core sau khi được diễn đạt thành quy tắc riêng, có thể kiểm chứng và phù hợp với nghiệp vụ của Cenio.

## 2. Kết luận chính

Không dùng một template hoặc component library làm toàn bộ Design System. Cenio Core nên kết hợp bốn lớp tham khảo:

```text
Triển khai UI nền     → shadcn/ui + Tailwind CSS
Chất lượng thị giác   → Tailwind Plus + TailAdmin
Dashboard / báo cáo   → Tremor
Pattern B2B / ERP     → SAP Fiori + React-admin + Refine
Hành vi DataTable     → TanStack Table
Thư viện flow thực tế → SaaSFrame
```

`shadcn/ui` là lớp component được adopt trong source code. Các nguồn khác là reference hoặc được copy/adapt có chọn lọc; không cài đồng thời nhiều component library vào ứng dụng chỉ vì chúng có giao diện đẹp.

## 3. Tiêu chí đánh giá nguồn tham khảo

| Tiêu chí | Câu hỏi đánh giá |
| --- | --- |
| Tương thích stack | Có dùng React, TypeScript, Vite, Tailwind CSS hoặc dễ adapt vào shadcn/ui không? |
| Phù hợp B2B | Có hỗ trợ bảng dữ liệu, filter, form dài, phân quyền, trạng thái và thao tác hàng loạt không? |
| Khả năng tái sử dụng | Có thể chuyển thành token/component/pattern dùng cho nhiều sản phẩm không? |
| Chất lượng UX | Hierarchy, spacing, typography, loading/empty/error state và accessibility có rõ ràng không? |
| Pháp lý và bảo trì | Có cần mua license không; có được phép dùng source không; có rủi ro lock-in hoặc xung đột dependency không? |

## 4. Nguồn triển khai và visual reference trực tiếp

### 4.1 shadcn/ui và shadcn/ui Blocks

- URL: [Components](https://ui.shadcn.com/docs/components), [Dashboard Blocks](https://ui.shadcn.com/blocks?category=dashboard)
- Vai trò: nền triển khai UI chính của Cenio Core.
- Giá trị: có Sidebar, Data Table, Chart, Field, Empty, Dialog, Sheet, Skeleton, Toast và nhiều primitive cần thiết cho ứng dụng nghiệp vụ. Dashboard block chính thức cho ví dụ ghép sidebar, chart, section card và data table.
- Cách dùng: adopt các component cần thiết vào `web/src/components/`, sau đó áp dụng semantic token của Cenio Core. Không sửa trực tiếp component theo từng feature nếu thay đổi có khả năng dùng chung.
- Không dùng để: quyết định visual identity cuối cùng; component mặc định vẫn cần token, content rule và ERP pattern của Cenio.

### 4.2 Tailwind Plus — Application UI

- URL: [Tailwind Plus Application UI](https://tailwindcss.com/plus/ui-blocks/application-ui)
- Vai trò: visual benchmark chất lượng cao cho application shell, page heading, form layout, table, drawer, empty state và navigation.
- Giá trị: catalog tách rõ sidebar/stacked/multi-column layout, table, form, combobox, pagination, modal, drawer, notification, detail page và settings page.
- Cách dùng: phân tích hierarchy, spacing, information density và trạng thái của component; dùng làm reference ưu tiên khi Cenio Core thiếu một page pattern.
- Lưu ý: đây là catalog premium. Xác nhận license hiện hành trước khi sao chép source; không đưa code vào repository khi chưa có quyền sử dụng phù hợp.

### 4.3 TailAdmin React

- URL: [Demo](https://react-demo.tailadmin.com/), [React docs](https://tailadmin.com/docs/installation/react), [GitHub source](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard)
- Vai trò: reference gần nhất với stack mục tiêu.
- Evidence: bản React công khai sử dụng React, TypeScript, Tailwind CSS và Vite; free edition được công bố theo MIT. Template có sidebar, table, chart, alert, modal, form, profile, dark mode và các layout dashboard.
- Cách dùng: tham khảo App Shell, khoảng cách card, tỷ lệ dashboard, sidebar navigation, cấu trúc page và cách phối KPI/chart/table.
- Không dùng để: sao chép toàn bộ template hoặc để TailAdmin thay thế Cenio Core. Một template dashboard không bao phủ đầy đủ DataTable lớn, form ERP phức tạp, saved views, approval và object page.

### 4.4 Tremor / Tremor Raw

- URL: [Tremor components](https://npm.tremor.so/), [Tremor Raw](https://www.tremor.so/docs/getting-started/about)
- Vai trò: reference và lựa chọn có thể đánh giá cho dashboard, KPI, chart và filter theo dữ liệu.
- Evidence: Tremor công bố 20+ component React trên Tailwind CSS cho dashboard và data visualization; Tremor Raw cung cấp component copy-and-paste, có thể tùy biến, hướng tới ứng dụng data-rich.
- Cách dùng: tham khảo MetricCard, chart palette, date range, multi-select, chart tooltip, dashboard filter và kết hợp list/table với số liệu.
- Lưu ý: không để chart library tự định nghĩa màu thương hiệu. Mọi series chart phải map về token `chart-*` của Cenio Core.

### 4.5 Preline UI

- URL: [About](https://www.preline.co/docs/about.html), [Blocks](https://www.preline.co/blocks/), [Themes](https://preline.co/docs/themes.html)
- Vai trò: thư viện block rộng để tìm phương án cho admin page, form, modal, settings, KPI, table và dashboard shell.
- Evidence: Preline công bố component/blocks Tailwind, hỗ trợ JSX copy code; block có thể adapt cho React nhưng không phải React component package mặc định. Theme dùng semantic CSS variables.
- Cách dùng: chỉ copy/adapt markup khi shadcn/ui chưa có page composition phù hợp; chuyển màu, spacing và behavior sang token/primitive của Cenio Core.
- Lưu ý: kiểm tra license của từng block/template trước khi đưa source vào sản phẩm. Không cài plugin interaction của Preline nếu Radix/shadcn đã giải quyết cùng hành vi.

### 4.6 Flowbite React

- URL: [Flowbite React](https://flowbite.com/docs/getting-started/react/), [Sidebar](https://flowbite.com/docs/components/sidebar/)
- Vai trò: reference bổ sung cho control phổ biến như date picker, dropdown, sidebar, modal, tooltip, upload và form.
- Evidence: Flowbite React hỗ trợ React + Tailwind, có theming và Storybook; thư viện open source được công bố theo MIT. Flowbite có cả admin dashboard và Figma design system ở các gói khác nhau.
- Cách dùng: xem states và khả năng component; chỉ adopt code nếu không có component shadcn tương đương hoặc nếu việc bổ sung nhỏ, có lý do rõ ràng.
- Rủi ro: dùng Flowbite song song diện rộng với shadcn/ui sẽ tạo hai conventions cho Dialog, Dropdown, Input và theme.

## 5. Nguồn pattern B2B, ERP và quản trị dữ liệu

### 5.1 SAP Fiori Design Guidelines

- URL: [Table overview](https://experience.sap.com/fiori-design-web/table-overview/), [Table personalization](https://experience.sap.com/fiori-design-web/overview-table-personalization/), [Object page](https://experience.sap.com/fiori-design-web/object-page/), [Filter bar](https://experience.sap.com/fiori-design-web/explore_group/filter/)
- Vai trò: nguồn chuẩn để học UX dữ liệu lớn và quy trình enterprise; không dùng làm visual identity.
- Evidence: guideline phân biệt table responsive và desktop-centric theo độ phức tạp dữ liệu; mô tả pattern personalisation cho show/hide/reorder columns, sort, group và filter; object page có header, navigation và content area.
- Cách dùng trong Cenio Core:
  - `DataTable`: column visibility, column order, sort, filter, group, bulk action và trạng thái filtered.
  - `SavedView`: lưu bộ filter, cột hiển thị và thứ tự cột theo người dùng khi có yêu cầu thực tế.
  - `ObjectPage`: entity header + action + section/tab cho khách hàng, đơn hàng, phiếu nhập và hóa đơn.
  - `FilterBar`: search trước, filter theo field, filter nâng cao và trạng thái filter rõ ràng.
- Không dùng để: áp dụng nguyên UI SAP vốn quá nặng hoặc quá đặc trưng doanh nghiệp lớn cho cửa hàng nhỏ.

### 5.2 React-admin

- URL: [React-admin](https://marmelab.com/react-admin/)
- Vai trò: reference về B2B CRUD, CRM, e-commerce admin, permissions, datagrid, forms, filters, import/export, batch action và error handling.
- Evidence: React-admin công bố demo CRM, e-commerce admin và HelpDesk; hỗ trợ shadcn/ui qua Shadcn Admin Kit; bản open-source theo MIT.
- Cách dùng: nghiên cứu hành vi danh sách–chi tiết–sửa, action theo quyền, column selector, bulk action, filter, notification, undo và preference.
- Quyết định hiện tại: không adopt React-admin làm framework cho Sales Management. Ứng dụng cần giữ React/Vite/shadcn và lớp Apps Script API riêng; React-admin chỉ là reference cho đến khi có quyết định kiến trúc độc lập.

### 5.3 Refine

- URL: [shadcn Layout](https://refine.dev/core/docs/ui-integrations/shadcn/components/layout/), [Admin dashboard guide](https://refine.dev/blog/building-react-admin-dashboard/)
- Vai trò: reference cho admin shell và cách ghép layout, breadcrumb, user controls, content area trong hệ React hiện đại.
- Evidence: tài liệu shadcn integration có Layout 01 với collapsible sidebar, header, breadcrumb và main content area; Refine tự mô tả là headless và có thể tích hợp nhiều UI kit.
- Cách dùng: tham khảo composition của `AppShell`; không cần đưa framework Refine vào codebase ở giai đoạn này.

### 5.4 TanStack Table

- URL: [TanStack Table](https://tanstack.com/table/latest)
- Vai trò: blueprint hành vi và API cho DataTable, không phải visual reference chính.
- Cách dùng: khi xây DataTable, đối chiếu sorting, filtering, pagination, row selection, column visibility, server-side data và virtualization với contract UI trong Cenio Core.
- Quyết định hiện tại: đánh giá khi bắt đầu feature có bảng lớn. Không cài đặt chỉ để có một table tĩnh.

## 6. Nguồn tìm flow và screen thực tế

### 6.1 SaaSFrame

- URL: [SaaSFrame](https://www.saasframe.io/)
- Vai trò: tìm reference screen và flow thật theo vấn đề UX.
- Evidence: SaaSFrame công bố thư viện UI/UX của sản phẩm SaaS thật, có filter theo Dashboard, Add & Edit, Account Setup và các user journey.
- Cách dùng: tìm 3–5 screen cùng loại trước khi thiết kế Dashboard, form tạo/sửa, onboarding, account settings hoặc payment/approval flow.
- Lưu ý: chỉ ghi nhận pattern; không copy screenshot, asset, font, nội dung hoặc Figma file vào sản phẩm khi chưa có quyền phù hợp.

## 7. Bộ reference được khuyến nghị cho Cenio Core

| Nhu cầu | Nguồn ưu tiên | Kết quả cần rút ra |
| --- | --- | --- |
| Primitive và component code | shadcn/ui | Component base, accessibility, API component và CSS variable convention |
| App shell và visual polish | Tailwind Plus, TailAdmin | Sidebar, page header, spacing, hierarchy, card và navigation density |
| Dashboard và chart | Tremor, TailAdmin | KPI, date filter, chart palette, tooltip, chart/table composition |
| DataTable nghiệp vụ | SAP Fiori, React-admin, TanStack Table | Filter, saved view, column chooser, bulk action, pagination, responsive behavior |
| Object page và form dài | SAP Fiori, Tailwind Plus, React-admin | Entity header, sections/tabs, form section, dangerous action và validation |
| Tìm inspiration theo flow | SaaSFrame | Màn hình thật, flow hoàn chỉnh, anti-pattern cần tránh |

## 8. Quy trình biến reference thành Cenio Core

Mỗi reference được chọn phải đi qua quy trình sau:

1. **Xác định vấn đề**: ví dụ cần sidebar cho nhiều module, DataTable có column chooser hoặc form tạo phiếu nhập.
2. **Chọn tối đa ba reference cùng loại**: không lấy một màn hình đẹp làm chuẩn duy nhất.
3. **Ghi nhận rule, không ghi nhận tên thương hiệu**: ví dụ “KPI card dùng một số liệu chính, nhãn ngắn, delta semantic” thay vì “làm giống TailAdmin”.
4. **Đưa rule vào Cenio Core**: token, component contract hoặc page pattern.
5. **Tạo prototype thử nghiệm**: tối thiểu Dashboard, List/Report và Object Detail.
6. **Kiểm tra với nghiệp vụ**: dữ liệu dài, tên tiếng Việt, số tiền VND, loading/empty/error, phân quyền và action rủi ro.
7. **Chỉ sau đó mới triển khai code**: component dùng chung vào `web/src/components/`; token toàn cục vào `web/src/styles/`; UI đặc thù vào `web/src/features/<feature>/`.

## 9. Quy tắc không pha tạp Design System

- Chỉ có một hệ semantic token của Cenio Core.
- shadcn/ui là component base; không dùng nhiều library giải cùng một vấn đề nếu không có quyết định rõ ràng.
- Không hard-code màu, spacing, radius hoặc shadow của reference vào feature.
- Không đưa status nghiệp vụ cụ thể của Sales Management vào Core; Core chỉ có `success`, `warning`, `danger`, `info`, `neutral`.
- Một pattern chỉ được thêm vào Core khi đã xuất hiện ở ít nhất hai screen hoặc có lý do tái sử dụng rõ ràng cho nhiều sản phẩm.
- Mọi action delete/cancel/approve/adjust có hậu quả nghiệp vụ phải theo một dangerous-action pattern thống nhất.

## 10. Backlog nghiên cứu thiết kế tiếp theo

1. Chọn một App Shell reference từ TailAdmin hoặc Tailwind Plus và chuẩn hóa `AppShell`, `Sidebar`, `TopBar`, `PageHeader`.
2. Chọn ba DataTable reference từ SAP Fiori, React-admin và shadcn để viết contract cho `DataTable`, `FilterBar`, `SavedView` và `BulkActionBar`.
3. Chọn một dashboard reference từ Tremor để chốt `MetricCard`, chart token và dashboard filter.
4. Dùng Cenio Core tạo ba prototype: Sales Dashboard, Sales Order List và Sales Order Detail.
5. Sau khi prototype được duyệt, tạo quyết định kỹ thuật riêng nếu cần thêm dependency như TanStack Table hoặc chart library.

## 11. Prompt dùng trong Open Design

```text
Refine Cenio Core Design System bằng các nguồn reference đã chọn.

Không sao chép thương hiệu, màu sắc, layout, asset hoặc source code nguyên bản.
Chỉ chuyển các đặc điểm tốt thành token, component contract và page pattern
riêng cho Cenio Core:

- Visual quality và application shell: Tailwind Plus, TailAdmin.
- Dashboard, KPI, chart và filter: Tremor.
- DataTable, FilterBar, SavedView, bulk action và Object Page:
  SAP Fiori, React-admin và TanStack Table.
- Luôn giữ React, Tailwind CSS và shadcn/ui là nền triển khai duy nhất.

Xuất các thay đổi cụ thể cho DESIGN.md: visual refinement, App Shell,
DataTable pattern, form pattern, dashboard pattern, accessibility và states.
```
