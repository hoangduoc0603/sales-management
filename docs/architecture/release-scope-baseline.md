# Release Scope Baseline

**Trạng thái:** Draft cần user duyệt  
**Nguồn:** Master implementation plan, SRS, LLD và `docs/architecture/release-hardening.md`.

## 1. Mục tiêu

Tài liệu này phân loại các gap còn mở trong master plan để quyết định phạm vi bản bán đầu. Mục tiêu là tránh hai lỗi: coi một baseline in-memory là production-ready, hoặc tiếp tục code lan man mà không biết item nào thật sự chặn release.

## 2. Quy ước phân loại

| Classification | Ý nghĩa |
| --- | --- |
| `MustFixBeforeRelease` | Bắt buộc hoàn thiện trước khi bán/giao khách vì ảnh hưởng dữ liệu, bảo mật, POS, triển khai hoặc vận hành cốt lõi. |
| `CanShipDisabled` | Có thể giao nếu UI/operation bị khóa rõ ràng, backend reject có mã lỗi tiếng Việt và tài liệu giao khách nêu limitation. |
| `PostRelease` | Không chặn bản bán đầu nếu không ảnh hưởng phạm vi đã cam kết; đưa vào roadmap sau release. |

## 3. Classification table

| Gap ID | Phase | Classification | Release decision | Evidence cần có |
| --- | --- | --- | --- | --- |
| `reset-password-disable-role-change-revoke-session` | 2 | `MustFixBeforeRelease` | Security account lifecycle là yêu cầu bắt buộc. | Test reset password, disable user, role/scope change làm tăng `authVersion` và revoke session cũ. |
| `price-promotion-stale-conflict-checkout` | 4 | `MustFixBeforeRelease` | POS dùng catalog/pricing cache nên backend phải trả conflict khi cache stale. | Checkout test cho `PRICE_CHANGED`/`PROMOTION_CHANGED` hoặc policy chỉ rõ promotion chưa bật. |
| `opening-balance-import-safe-flow` | 5 | `MustFixBeforeRelease` | Cửa hàng cần nhập tồn đầu kỳ để bắt đầu dùng; không được sửa trực tiếp balance. | Import/opening flow tạo InventoryMovement và projection, không ghi trực tiếp `InventoryBalance`. |
| `lot-fefo-serial-state-guard` | 5 | `CanShipDisabled` | Có thể chưa bật cho tenant nhỏ nếu UI lot/serial bị khóa và backend reject khi cấu hình theo dõi lô/serial. | UI không cho bật lot/serial, hoặc operation trả lỗi rõ nếu product yêu cầu lot/serial mà flow chưa hỗ trợ. |
| `transfer-stocktake-state` | 5 | `CanShipDisabled` | Chuyển kho/kiểm kê có thể khóa ở bản bán đầu cho cửa hàng một kho; stocktake tối thiểu nên được lên lịch ngay sau POS. | Navigation/action bị disabled, backend không nhận transfer/stocktake chưa hỗ trợ. |
| `inventory-concurrency-performance-matrix` | 5 | `MustFixBeforeRelease` | Tồn kho ảnh hưởng trực tiếp POS và dữ liệu; cần test concurrency/rounding tối thiểu. | Test two receipts average cost, issue rounding, last stock concurrency, negative stock policy. |
| `cashdrawer-paymentmethod-master` | 6 | `MustFixBeforeRelease` | POS thực tế cần phương thức thanh toán và két/ca tiền mặc định. | Seed/master command hoặc bootstrap tạo PaymentMethod/CashDrawer mặc định, test POS dùng được. |
| `receivable-payable-aging-projection` | 6 | `MustFixBeforeRelease` | Công nợ là phạm vi bản đầu; aging giúp vận hành thu/chi và báo cáo. | AR/AP aging projection test theo due date/scope. |
| `pos-checkout-orchestration` | 7 | `MustFixBeforeRelease` | Đây là luồng sellable chính. | Acceptance test checkout tạo SaleOrder Completed, InventoryMovement, Payment/AR, actor metadata và CommandTransaction đúng một lần. |
| `pos-commit-revalidation` | 7 | `MustFixBeforeRelease` | Backend phải là source of truth cho scope, ca, quote, stock, tender và idempotency. | Commit test revalidate scope/shift/quote/stock/tender/idempotency. |
| `pos-structured-conflicts` | 7 | `MustFixBeforeRelease` | UI POS cần mã lỗi ổn định để người dùng xử lý retry/conflict. | Test conflict codes `PRICE_CHANGED`, `PROMOTION_CHANGED`, `INSUFFICIENT_STOCK`, `VOUCHER_UNAVAILABLE`, `POINT_BALANCE_CHANGED` hoặc disabled policy tương ứng. |
| `pos-receipt-snapshot-print` | 7 | `MustFixBeforeRelease` | In phiếu/hóa đơn bán hàng là phạm vi đã chốt. | Receipt snapshot immutable; print/reprint không tạo ledger mới. |
| `pos-acceptance-performance-tests` | 7 | `MustFixBeforeRelease` | Hiệu năng POS quyết định app có dùng được thực tế trên Apps Script hay không. | Benchmark warm scan/search/cart, checkout p95/p99 và report/export song song. |
| `deposit-credit-refund-cancel-order` | 8 | `CanShipDisabled` | Có thể không bật nhận cọc ở bản đầu; nếu nhận cọc thì phải xử lý credit/refund khi hủy. | UI/API không cho đặt cọc, hoặc có test refund/credit khi cancel đơn có deposit. |
| `reporting-archive-drilldown-worker-export` | 10 | `MustFixBeforeRelease` | Export/report và sensitive drill-down phải không bypass quyền hoặc cạnh tranh POS. | Drill-down token revalidates permission; export lớn chạy worker; archive coverage metadata rõ. |
| `operations-import-worker-chunk` | 11 | `CanShipDisabled` | Import hàng loạt có thể chưa bật nếu có cách nhập thủ công/seed ban đầu; nếu bật phải worker/chunk. | UI import disabled hoặc ImportBatch worker test retry không duplicate. |
| `operations-private-attachment-drive` | 11 | `MustFixBeforeRelease` | File đính kèm thuộc phạm vi chứng từ/chi phí/bảo hành; không được public URL. | Drive attachment adapter private, metadata lifecycle và download kiểm quyền. |
| `operations-backup-retention` | 11 | `MustFixBeforeRelease` | Mô hình bán một lần cần backup để khách vận hành dài hạn. | Backup manifest checksum, 30 daily retention, manual backup by Owner. |
| `operations-restore-replacement` | 11 | `MustFixBeforeRelease` | Restore không overwrite production là ADR Accepted. | Replacement resources, Owner switch, revoke session, health-check và drill evidence. |
| `operations-archive-readonly-routing` | 11 | `MustFixBeforeRelease` | Archive tránh đầy Sheet và không được phá truy vấn lịch sử. | Close/archive partition read-only, report/export route theo partition registry. |
| `operations-production-test-matrix` | 11 | `MustFixBeforeRelease` | Operations liên quan dữ liệu dài hạn; không được chỉ có baseline in-memory. | Test import retry, attachment permission, backup checksum, restore switch, archive routing. |

## 4. UI-disabled items nếu ship trước khi hoàn thiện

Các item `CanShipDisabled` chỉ hợp lệ khi thỏa cả ba điều kiện:

1. Entry point UI bị disabled hoặc ẩn khỏi navigation/hành động chính.
2. Backend operation tương ứng reject bằng mã lỗi nghiệp vụ tiếng Việt, không silently no-op.
3. Runbook giao khách ghi rõ limitation và điều kiện bật lại.

| Gap ID | UI/API phải khóa nếu chưa implement |
| --- | --- |
| `lot-fefo-serial-state-guard` | Không cho bật cấu hình lot/serial trên Variant/Warehouse; POS/Inventory reject product requiring lot/serial nếu flow chưa hỗ trợ. |
| `transfer-stocktake-state` | Ẩn hoặc disabled thao tác chuyển kho/kiểm kê; backend reject transfer/stocktake command chưa hỗ trợ. |
| `deposit-credit-refund-cancel-order` | Không cho nhận cọc trên đơn online/manual nếu cancel deposit behavior chưa có. |
| `operations-import-worker-chunk` | Ẩn import hàng loạt; chỉ cho tạo dữ liệu qua form/manual hoặc seed được kiểm soát. |

## 5. Decision required

1. User cần duyệt nhóm `CanShipDisabled` nào được phép khóa ở bản bán đầu.
2. Nếu user muốn hỗ trợ lot/serial, chuyển kho, kiểm kê hoặc import hàng loạt ngay từ bản đầu, các item tương ứng phải đổi sang `MustFixBeforeRelease`.
3. Nếu nhận cọc trên đơn online/manual là yêu cầu bán hàng thực tế, `deposit-credit-refund-cancel-order` phải đổi sang `MustFixBeforeRelease`.
