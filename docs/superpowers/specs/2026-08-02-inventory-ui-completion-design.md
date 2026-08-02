# Hoan thien thiet ke UI Kho

| Thuoc tinh | Gia tri |
| --- | --- |
| Trang thai | Da duoc user chap thuan huong 4 artifact; cho user duyet spec truoc khi thuc hien tren Open Design |
| Ngay | 2026-08-02 |
| Pham vi | UI nghiep vu Kho theo `SRS-INV-001..017` |
| Khong thuoc pham vi | PO/GRN/landed cost/return NCC, thay doi SRS/LLD/ADR/schema/API, va code React/Apps Script |
| Design System | Cenio Core v0.7 |
| Open Design project | `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b` (`sale-management`) |

## 1. Muc tieu

Thiet ke du UI cho nguoi quan ly kho theo doi ton, xu ly chenh lech va tao chung tu kho ma khong lam mo rang gioi ledger bat bien. Moi thao tac ghi phai the hien ro scope Branch/Warehouse, state chung tu, guard phan quyen, evidence, command-in-progress va ket qua tu backend.

Thiet ke uu tien thao tac lap lai tren desktop, table data-dense, so lieu can thang hang va cac form dai co chia section. Mobile khong an trang thai, scope, tong so luong, CTA hoac evidence bat buoc.

## 2. Phuong an va pham vi artifact

Tao bon artifact rieng trong Open Design. Chua xoa `inventory-purchasing.html` hay `inventory-stocktake-transfer-adjustment-workbench.html`; hai artifact cu chi duoc supersede trong registry sau khi bon artifact moi dat QA va duoc duyet.

| Artifact | Muc dich | SRS chinh |
| --- | --- | --- |
| `inventory-operations-overview.html` | Ton, canh bao, lot/serial, reservation va trace | `SRS-INV-001..003`, `007..009`, `017` |
| `inventory-adjustment-exception.html` | Nhap dau ky, dieu chinh, scrap va ngoai le am kho/gia von tam | `SRS-INV-004..005`, `010..011` |
| `inventory-transfer-receive.html` | Tao, duyet, xuat, nhan va xu ly chenh lech chuyen kho | `SRS-INV-013`, `SRS-INV-014` |
| `inventory-stocktake.html` | Mo phien, dem, xu ly variance va duyet kiem kho | `SRS-INV-015`, `SRS-INV-016` |

## 3. Mapping day du requirement sang UI

| Requirement | Artifact/UI chu so huu | Hanh vi bat buoc |
| --- | --- | --- |
| `INV-001` movement immutable | Operations overview, trace drawer | Ledger read-only; correction luon mo chung tu moi, co source drill-down. |
| `INV-002` cac so du kho | Operations overview | Hien on-hand, available, reserved, in-transit, quarantine theo Warehouse/variant; khong goi in-transit la hang ban duoc. |
| `INV-003` moving average cost | Operations overview, adjustment detail | Cost/COGS chi hien khi backend cap quyen; hien snapshot va lien ket chung tu, khong tu tinh tren UI. |
| `INV-004` cost khong hop le | Adjustment & exception | Blocked state, ly do, approver, temporary cost va flag doi soat. |
| `INV-005` tang ton/opening | Adjustment & exception | Opening balance la wizard rieng, co bien ban; receipt/restock chi la source drill-down. |
| `INV-006` xuat POS | POS handoff hien co | Kho hien source impact read-only va deep link toi don; khong lap lai checkout. |
| `INV-007` reservation online | Operations overview; fulfillment handoff hien co | Widget reservation/read-only, expiry/actor/source; command Confirmed/Cancelled/Ship thuoc order fulfillment. |
| `INV-008` lot, HSD, serial | Operations overview; POS handoff hien co | Lot/serial list, expiry, status va trace; lua chon xuat thuoc POS. |
| `INV-009` canh bao | Operations overview | Low stock, slow moving, near/expired lot, anomalous serial; filter theo Warehouse va khong lo scope ngoai quyen. |
| `INV-010` am kho | Adjustment & exception | Moi ngoai le theo chung tu; permission-restricted va approver states ro rang. |
| `INV-011` adjustment/scrap | Adjustment & exception | Draft, submit, approved/rejected/cancelled; reason, lot/serial, quantity/value, attachment va evidence validation inline. |
| `INV-012` return quarantine | Return inspection handoff hien co | Kho chi trace/read-only va deep link return; inspection Restock/KeepQuarantine/Scrap khong bi nhan ban. |
| `INV-013` transfer state | Transfer & receive | Day du lifecycle, pick/ship, partial receive, variance, evidence va cancel guard. |
| `INV-014` transfer accounting | Transfer & receive | Hien in-transit rieng, nhan mot phan va khong tu can bang kho nguon/dich. |
| `INV-015` mo phien kiem | Stocktake | Scope, counter, snapshot va movement-after-snapshot tach rieng. |
| `INV-016` duyet chenh lech | Stocktake | Variance, separation of duties va approval lifecycle. |
| `INV-017` stock trace | Operations overview | Filter date/Branch/Warehouse/variant/lot/serial/movement/source, mo source neu co quyen. |

## 4. Design system va quy uoc chung

- Dung AppShell Cenio Core v0.7; Branch/Warehouse la global context, khong lap lai thanh page selector. Page chi co filter nghiep vu va phai invalidation khi scope doi.
- Outfit 14px cho body/table/control; quantity, cost, VND, SKU va timestamp dung tabular figures. Table compact 36-44px row, numeric right-aligned.
- Dung `Panel`, `DataTable`, `FilterBar`, `Combobox`, `DateRangePicker`, `Sheet`, `Dialog`, `InlineAlert`, `StateBlock`, `Badge` va semantic token Core. Khong dung native select, gradient, card chong card hay palette cuc bo.
- CTA nguy hiem hoac irreversible dung `AlertDialog`; icon-only button co tooltip va accessible label. Form co label ro, helper text, validation tai field, error duoc announce va submit feedback.
- Ready view khong hien state gallery. Loading, empty, error, restricted, scope invalid/changed, stale/retry va command-in-progress la state dieu kien.
- Cost, COGS, valuation va source detail bi an hoan toan neu backend tu choi quyen; khong hien masked replacement value.

## 5. Artifact 1: Operations overview

### Hash/state can verify

`#overview`, `#alerts`, `#lot-serial`, `#reservation`, `#trace`, `#empty`, `#restricted`, `#scope-changed`.

### Layout va workflow

1. Object header: `Kho`, freshness (`generatedAt`/`asOf` khi backend cap), refresh icon button va CTA `Tao chung tu kho` mo action menu theo quyen.
2. Doi metric gon: available, reserved, in-transit, quarantine. Metric la entry filter, khong la card marketing.
3. Inventory table: variant, SKU, on-hand, available, reserved, in-transit, quarantine, alert state va last movement. Toolbar co search, stock state, alert type, tracking mode, saved view/density/column chooser.
4. Row detail sheet: stock card, movement mini-timeline, lot/serial summary, reservation va source links. Hanh dong ghi khong nam trong row neu user khong co quyen.
5. Alerts view: queue theo severity; tai khoan chi thay Warehouse trong scope. Mo lot/serial/variant cung scope va prefill filter.
6. Trace view: data table read-only voi filter theo yeu cau `INV-017`, source drill-down la action theo permission.

### Responsive

Desktop giu toolbar + table. Tablet chuyen column thap uu tien vao row detail. Mobile chuyen table thanh list; metric, status, variant, available va alert luon con tren row, filter nang nam trong sheet.

## 6. Artifact 2: Adjustment & exception

### Hash/state can verify

`#opening-balance`, `#adjustment-draft`, `#pending-approval`, `#rejected`, `#scrap`, `#negative-stock`, `#temporary-cost`, `#attachment-required`, `#permission-restricted`, `#command-processing`.

### Layout va workflow

- Document list ben trai/theo route va object form ben phai/chi tiet. Desktop form co section nav; mobile dung full-screen sheet.
- Opening balance wizard: Warehouse, variant/lot/serial, quantity, actual unit cost, bien ban va preflight guard "chua co movement history" tu backend.
- Adjustment form: type, reason code, note, variant, lot/serial, signed quantity, valuation khi ap dung, attachment va source reference. Error dat sat field; UI khong sua balance truc tiep.
- Scrap form mac dinh prefill quarantine neu duoc mo tu trace/return, nhung van hien reason/evidence/approval guard.
- Negative-stock exception: so sanh requested va available, temporary cost khi can, approver state va reconciliation marker. Neu user khong du quyen, CTA la request/submit theo contract, khong cho phep tu gan approver.
- Activity rail chi hien document events va evidence metadata, khong thay the movement ledger.

## 7. Artifact 3: Transfer & receive

### Hash/state can verify

`#draft`, `#pending-approval`, `#approved`, `#pick-ship`, `#partially-received`, `#received`, `#variance`, `#cancel-guard`, `#lot-serial-required`, `#restricted`.

### Layout va workflow

- Transfer list co status, source/destination, expected/received quantity, age va owner; filter theo state, Warehouse va exception.
- Create/edit form bao gom source/destination Warehouse, reason, lines, lot/serial allocation, quantity va evidence. Chon cung kho bi validate inline.
- Object detail hien lifecycle, pick list, immutable shipped quantity, in-transit impact va receive table.
- Receive form cho phep nhap partial quantity theo line; thieu/thua/hong bat buoc reason, note va attachment khi policy yeu cau. Submit khong tu can bang kho nguon/dich.
- Cancel chi hien truoc Shipped. Sau Shipped, UI chi goi flow return transfer/approved adjustment khi backend cho phep.

## 8. Artifact 4: Stocktake

### Hash/state can verify

`#draft`, `#in-progress`, `#count-entry`, `#movement-after-snapshot`, `#variance-reason-required`, `#submitted`, `#approval-restricted`, `#approved`, `#rejected`, `#cancelled`, `#lot-serial-count`, `#empty-scope`.

### Layout va workflow

- Stocktake list: Warehouse, scope, owner/counter, status, snapshot time, variance count va updated time.
- Start form: Warehouse, product/lot/serial scope, counters va start time. UI cho biet snapshot khong khoa ban/nhap/xuat.
- Count workbench: searchable/scannable row list, system snapshot, counted input, movement after snapshot tach cot, variance va reason. Group theo product/lot/serial, khong che data tai cho.
- Submit validate reason cho moi variance. Approval view cho phep doc evidence/movement sau snapshot; neu actor cung la counter, action approve bi restricted theo backend. Approved tao CountAdjustment; rejected/cancelled khong tao movement.

## 9. Lien ket artifact khac

- `app-pos-checkout.html`: `INV-006`, lot/serial selection va checkout negative-stock conflict.
- `manual-order-fulfillment-detail.html`: `INV-007` reservation lifecycle.
- `return-inspection-refund-exchange.html`: `INV-012` quarantine inspection/restock/scrap.

Handoff cua bon artifact moi phai lien ket ro den cac artifact nay bang ten artifact va duong dan file tuyet doi, khong dung `127.0.0.1`.

## 10. Quy uoc Open Design va handoff

Moi handoff ghi ca `Open Design project`, `Artifact` va `Duong dan file Open Design` dang tuyet doi:

```text
/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/<artifact>.html
```

`docs/design/open-design-registry.md` khong dung cot URL localhost. Cot nay doi thanh `Duong dan file Open Design`, cung gia tri tuyet doi nhu handoff. File path la shortcut local; project ID + artifact name van la dinh danh de khoi phuc artifact khi path khong ton tai.

## 11. Acceptance criteria

- Bon artifact cover du mapping `SRS-INV-001..017` hoac link den artifact chu so huu cua luong lien mien, khong bo sot requirement.
- Moi artifact co ready, loading, empty, error, restricted, scope changed, command processing va hash/state nghiep vu tuong ung.
- UI khong tao them state machine, permission, API, schema hay business rule ngoai SRS/LLD.
- Light/dark, desktop/tablet/mobile, keyboard/focus va form validation duoc visual QA tren Open Design.
- Registry, UI coverage gap analysis va bon handoff duoc cap nhat cung dot khi artifact da duoc user duyet; tat ca dung absolute local file path.

## 12. Thu tu thuc hien sau khi spec duoc duyet

1. Tao bon artifact tren Open Design theo thu tu overview, adjustment, transfer, stocktake.
2. QA visual va state/hash, doi chieu SRS/LLD va Design System.
3. Cap nhat registry, UI coverage gap analysis va bon handoff sang artifact moi, trang thai `Approved` chi sau khi user duyet.
4. Lap implementation plan; UI code chi bat dau khi registry/handoff da `Approved` va artifact da duoc mo tu local file path.
