# Kiến trúc

Các tài liệu tại đây mô tả Solution/System Design đã được phê duyệt cho Sales Management. [Solution Design](solution-design.md) là nguồn tổng quan chuẩn; các tài liệu còn lại đi sâu vào từng mối quan tâm và không được mâu thuẫn với tài liệu này.

- [Solution Design](solution-design.md): system context, nguyên tắc, module boundaries, luồng xuyên miền và truy vết SRS.
- [Kiến trúc ứng dụng](application-architecture.md): lớp mã nguồn, API boundary và orchestration theo domain.
- [Runtime và hiệu năng](runtime-and-performance.md): POS fast path, cache, commit, lock, idempotency và worker.
- [Performance playbook](performance-playbook.md): checklist bắt buộc để thiết kế, code và kiểm thử mọi thay đổi ảnh hưởng I/O, cache, lock hoặc dữ liệu lớn.
- [Bảo mật và truy cập](security-and-access.md): public Web App, identity nội bộ, session, permission và bảo vệ dữ liệu.
- [Triển khai và vòng đời](deployment-and-lifecycle.md): bootstrap tenant, upgrade, migration, backup/restore và health.
- [Deployment Runbook](deployment-runbook.md): checklist triển khai/customer installation, bootstrap, upgrade, backup trước migration và emergency restore.
- [Release Hardening](release-hardening.md): release gates, P0/P1 gaps và evidence nghiệm thu.
- [Detailed Design](detailed-design.md): convention LLD, package ownership, traceability và quality gate trước implementation.
- [Platform technical design](platform-technical-design.md): typed RPC gateway, command protocol, error contract, worker và test seam.
- [LLD modules](modules/): thiết kế chi tiết theo bounded context.
- [LLD Sales, POS và Return](modules/sales-pos-returns.md): cart/draft, checkout, online fulfillment, return/exchange và receipt.
- [LLD Inventory](modules/inventory.md): ledger/balance, moving average, lot/serial, transfer và stocktake.
- [LLD Purchasing](modules/purchasing.md): PO, receipt, chi phí mua muộn và return NCC.
- [LLD Finance và Shift](modules/finance-shifts.md): payment, allocation, công nợ, két/ca và chi phí.
- [LLD Administration, Reporting và Operations](modules/administration-reporting-operations.md): user/role/scope, import/export, báo cáo, backup/restore, actor metadata và vận hành.
- [Rà soát mức sẵn sàng LLD](lld-traceability-review.md): truy vết SRS–LLD–schema–ADR và quality gate trước implementation.
- [Cấu trúc thư mục](folder-structure.md): nguồn chuẩn về vị trí, trách nhiệm và ranh giới của các thư mục.
