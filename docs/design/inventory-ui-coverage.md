# Ma Trận Bao Phủ UI Kho

## Phạm vi

Chỉ bao phủ nghiệp vụ Inventory theo `docs/product/srs/inventory.md`. Purchasing không nằm trong đợt hoàn thiện UI này.

| Nhóm nghiệp vụ | SRS | Artifact / handoff | State chính |
| --- | --- | --- | --- |
| Tồn khả dụng, cảnh báo, lot/serial, giữ chỗ, trace | `SRS-INV-001..002`, `SRS-INV-007..009`, `SRS-INV-017` | `inventory-operations-overview.html` / `screens/inventory-operations-overview.md` | `#overview`, `#alerts`, `#lot-serial`, `#reservation`, `#trace`, `#empty`, `#restricted`, `#scope-changed` |
| Điều chỉnh, số dư đầu kỳ, scrap, tồn âm, chi phí tạm tính | `SRS-INV-004..005`, `SRS-INV-010..011` | `inventory-adjustment-exception.html` / `screens/inventory-adjustment-exception.md` | `#opening-balance`, `#adjustment-draft`, `#pending-approval`, `#rejected`, `#scrap`, `#negative-stock`, `#temporary-cost`, `#permission-restricted`, `#attachment-required`, `#command-processing` |
| Điều chuyển, pick/ship, nhận, sai lệch và huỷ | `SRS-INV-013..014` | `inventory-transfer-receive.html` / `screens/inventory-transfer-receive.md` | `#draft`, `#pending-approval`, `#approved`, `#pick-ship`, `#partially-received`, `#received`, `#variance`, `#cancel-guard`, `#lot-serial-required`, `#restricted` |
| Kiểm kê, snapshot, variance, approval, lot/serial | `SRS-INV-015..016` | `inventory-stocktake.html` / `screens/inventory-stocktake.md` | `#draft`, `#in-progress`, `#count-entry`, `#movement-after-snapshot`, `#variance-reason-required`, `#submitted`, `#approval-restricted`, `#approved`, `#rejected`, `#cancelled`, `#lot-serial-count`, `#empty-scope` |
| Nhập kho theo PO hoặc trực tiếp | `SRS-INV-003`, `SRS-INV-005`, `SRS-INV-008`, `SRS-PUR-003..008` | `inventory-receiving-inbound.html` / `screens/inventory-receiving-inbound.md` | `#inbound`, `#po-receipt`, `#direct-receipt`, `#partial-receipt`, `#lot-serial-required`, `#cost-unallocated`, `#pending-approval`, `#approved`, `#rejected`, `#restricted`, `#empty`, `#command-processing` |
| Xuất kho theo chứng từ nguồn | `SRS-INV-006`, `SRS-INV-008`, `SRS-INV-010`, `SRS-PUR-009`, `SRS-SAL-009..011`, `SRS-SAL-015` | `inventory-fulfillment-outbound.html` / `screens/inventory-fulfillment-outbound.md` | `#pick-queue`, `#pick-detail`, `#lot-fefo`, `#serial-required`, `#ready-to-ship`, `#shipped`, `#insufficient-stock`, `#negative-stock-exception`, `#supplier-return`, `#warranty-issue`, `#restricted`, `#empty`, `#command-processing` |
| Hàng trả, quarantine, NXT và thẻ kho | `SRS-INV-001..003`, `SRS-INV-012`, `SRS-INV-017`, `SRS-SAL-012..015`, `SRS-ACC-012` | `inventory-return-quarantine-nxt.html` / `screens/inventory-return-quarantine-nxt.md` | `#quarantine`, `#return-receive`, `#inspection`, `#restock`, `#keep-quarantine`, `#scrap`, `#serial-trace`, `#nxt-report`, `#stock-ledger`, `#partial-coverage`, `#restricted`, `#empty` |

## Nguyên tắc chung đã thể hiện

- Sổ kho/movement ledger chỉ ghi thêm; UI không có chỉnh sửa số dư trực tiếp.
- Phạm vi Chi nhánh + Kho hiển thị toàn cục và phải dùng để đọc dữ liệu đúng scope.
- Tồn khả dụng loại trừ giữ chỗ, đang chuyển và quarantine theo đúng ngữ cảnh từng màn.
- Chứng từ cần phân tách người tạo/người duyệt và các thao tác có rủi ro phải có guard/validation/evidence.
- Lot/serial, evidence, trạng thái quyền hạn, empty/restricted và process state đều có surface cụ thể.

## Trạng thái duyệt

Các artifact mới được đặt `Review` trong registry. Chỉ chuyển sang `Approved` khi người phụ trách duyệt visual/handoff; trước đó không dùng chúng làm nguồn implement UI production.
