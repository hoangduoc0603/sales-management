import { useEffect, useMemo, useState } from 'react';
import type { InventoryBalanceSummaryRowDTO } from '@shared/contracts/inventory/inventory';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import { Table } from '../../components/ui/table';
import { Tabs } from '../../components/ui/tabs';
import type { AppRoute } from '../../app/app-shell/app-shell';

export interface InventoryHomeProps {
  route: Extract<AppRoute, 'inventory' | 'purchasing'>;
  rows?: readonly InventoryHomeRow[];
  generatedAt?: string;
}

export interface InventoryHomeRow extends InventoryBalanceSummaryRowDTO {
  sku: string;
  displayName: string;
  unitName: string;
}

const defaultRows: readonly InventoryHomeRow[] = [
  {
    warehouseId: 'warehouse-default',
    variantId: 'variant-milk-1l',
    sku: 'SH-OC-1L',
    displayName: 'Sữa hạt óc chó 1L',
    unitName: 'chai',
    onHandMilli: 32_000,
    availableMilli: 26_000,
    reservedMilli: 6_000,
    quarantineMilli: 0,
    inventoryValueVnd: 3_520_000,
  },
  {
    warehouseId: 'warehouse-default',
    variantId: 'variant-laundry-36',
    sku: 'NG-SH-3600',
    displayName: 'Nước giặt sinh học hương hoa 3,6kg',
    unitName: 'túi',
    onHandMilli: 7_000,
    availableMilli: 7_000,
    reservedMilli: 0,
    quarantineMilli: 0,
    inventoryValueVnd: 630_000,
  },
];

const inventoryTabIds = [
  'inventory',
  'transfer',
  'stocktake',
  'adjustment',
  'scrap',
  'negative-cost',
  'trace',
  'purchase',
] as const;

type InventoryTabId = (typeof inventoryTabIds)[number];

export function InventoryHome({
  generatedAt = '2026-07-27T00:00:00.000Z',
  route,
  rows = defaultRows,
}: InventoryHomeProps) {
  const [selectedTab, setSelectedTab] = useState<InventoryTabId>(() =>
    route === 'purchasing' ? 'purchase' : readInventoryHashTab() ?? 'inventory',
  );
  const selectedRow = rows[0];
  const totalAvailableMilli = useMemo(
    () => rows.reduce((sum, row) => sum + row.availableMilli, 0),
    [rows],
  );

  useEffect(() => {
    if (route === 'purchasing') {
      setSelectedTab('purchase');
      return;
    }

    const syncHash = () => setSelectedTab(readInventoryHashTab() ?? 'inventory');
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [route]);

  const handleTabChange = (tabId: string) => {
    const nextTab = isInventoryTabId(tabId) ? tabId : 'inventory';
    setSelectedTab(nextTab);
    if (route !== 'purchasing' && nextTab !== 'inventory') {
      window.history.replaceState(null, '', `#${nextTab}`);
    } else if (route !== 'purchasing') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  return (
    <div className="cn-inventory-shell">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">Sales / Inventory &amp; Purchasing</p>
          <h1>Kho, luân chuyển &amp; mua hàng</h1>
          <p>
            InventoryMovement là ledger bất biến; số tồn là projection đọc nhanh theo Branch/Warehouse scope.
          </p>
        </div>
        <div className="cn-dashboard-actions">
          <Badge tone="success">Snapshot sẵn sàng</Badge>
          <Button variant="secondary">Làm mới</Button>
          <Button variant="primary">Tạo điều chỉnh</Button>
        </div>
      </header>

      <Tabs
        onChange={handleTabChange}
        selectedId={selectedTab}
        items={[
          {
            id: 'inventory',
            label: 'Inventory',
            content: (
              <InventoryWorkspace
                generatedAt={generatedAt}
                rows={rows}
                selectedRow={selectedRow}
                totalAvailableMilli={totalAvailableMilli}
              />
            ),
          },
          {
            id: 'transfer',
            label: 'Transfer',
            content: <TransferWorkbench />,
          },
          {
            id: 'stocktake',
            label: 'Stocktake',
            content: <StocktakeWorkbench />,
          },
          {
            id: 'adjustment',
            label: 'Adjustment',
            content: <AdjustmentWorkbench />,
          },
          {
            id: 'scrap',
            label: 'Scrap',
            content: <ScrapWorkbench />,
          },
          {
            id: 'negative-cost',
            label: 'Negative cost',
            content: <NegativeCostWorkbench />,
          },
          {
            id: 'trace',
            label: 'Trace',
            content: <TraceWorkbench />,
          },
          {
            id: 'purchase',
            label: 'Purchasing',
            content: <PurchasingWorkspace />,
          },
        ]}
      />

      <Panel
        className="cn-state-lab"
        description="Loading, empty, error, restricted, scope và command processing trong bối cảnh nghiệp vụ."
        title="State lab"
      >
        <div className="cn-state-grid">
          <StateBlock
            description="Giữ context Branch/Warehouse; không thay màn hình bằng số liệu tạm."
            title="Đang tải stock snapshot"
            tone="info"
          />
          <StateBlock
            description="Cost/payable chỉ render khi backend cấp quyền; không có masked value."
            title="Cost / payable bị giới hạn theo quyền"
            tone="warning"
          />
        </div>
      </Panel>
    </div>
  );
}

function readInventoryHashTab(): InventoryTabId | undefined {
  if (typeof window === 'undefined') return undefined;
  const hash = window.location.hash.replace('#', '');
  return isInventoryTabId(hash) ? hash : undefined;
}

function isInventoryTabId(value: string): value is InventoryTabId {
  return inventoryTabIds.includes(value as InventoryTabId);
}

function InventoryWorkspace({
  generatedAt,
  rows,
  selectedRow,
  totalAvailableMilli,
}: {
  generatedAt: string;
  rows: readonly InventoryHomeRow[];
  selectedRow: InventoryHomeRow | undefined;
  totalAvailableMilli: number;
}) {
  return (
    <div className="cn-inventory-layout">
      <Panel
        description={`Snapshot ${formatDateTime(generatedAt)} · Available tổng ${formatQuantity(totalAvailableMilli)}`}
        title="Tồn kho theo biến thể"
      >
        <Table
          columns={[
            { key: 'item', header: 'Hàng hóa' },
            { key: 'onHand', header: 'On-hand', align: 'right' },
            { key: 'available', header: 'Available', align: 'right' },
            { key: 'reserved', header: 'Reserved', align: 'right' },
            { key: 'status', header: 'Trạng thái' },
          ]}
          emptyMessage="Không có biến thể trong phạm vi này."
          getRowKey={(row) => String(row.key)}
          rows={rows.map((row) => ({
            key: row.variantId,
            item: (
              <span>
                <strong>{row.displayName}</strong>
                <small>
                  {row.sku} · {row.unitName}
                </small>
              </span>
            ),
            onHand: <span className="num">{formatQuantity(row.onHandMilli)}</span>,
            available: <span className="num">{formatQuantity(row.availableMilli)}</span>,
            reserved: <span className="num">{formatQuantity(row.reservedMilli)}</span>,
            status: row.availableMilli > 0 ? (
              <Badge tone="success">Available</Badge>
            ) : (
              <Badge tone="warning">Cần xử lý</Badge>
            ),
          }))}
        />
      </Panel>

      <aside className="cn-inventory-aside">
        <Panel
          description={selectedRow ? `${selectedRow.sku} · ${selectedRow.unitName}` : undefined}
          title="Stock card"
        >
          {selectedRow ? (
            <div className="cn-stock-card">
              <h3>{selectedRow.displayName}</h3>
              <dl>
                <div>
                  <dt>On-hand</dt>
                  <dd className="num">{formatQuantity(selectedRow.onHandMilli)}</dd>
                </div>
                <div>
                  <dt>Available</dt>
                  <dd className="num">{formatQuantity(selectedRow.availableMilli)}</dd>
                </div>
                <div>
                  <dt>Reserved</dt>
                  <dd className="num">{formatQuantity(selectedRow.reservedMilli)}</dd>
                </div>
                <div>
                  <dt>Quarantine</dt>
                  <dd className="num">{formatQuantity(selectedRow.quarantineMilli)}</dd>
                </div>
              </dl>
              <div className="cn-restricted-box">
                <strong>COGS bị giới hạn theo quyền.</strong>
                <span>Không hiển thị chi phí hay số thay thế trong stock card.</span>
              </div>
            </div>
          ) : (
            <StateBlock description="Đổi filter hoặc scope để tải dữ liệu tồn." title="Chưa có stock card" />
          )}
        </Panel>
      </aside>

      <Panel
        description="Không sửa số dư trực tiếp; mọi exception có lý do, tệp đính kèm và approval."
        title="Adjustment & scrap"
      >
        <div className="cn-mini-list">
          <div className="cn-mini-row">
            <span>
              <strong>Adjustment</strong>
              <small>Create → Submit → Approve / Reject · approval mới tạo movement.</small>
            </span>
            <Badge tone="info">Ledger-safe</Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>Negative-stock exception</strong>
              <small>Yêu cầu lý do, approver và temporary cost khi chưa có giá vốn hợp lệ.</small>
            </span>
            <Badge tone="warning">Approval</Badge>
          </div>
        </div>
      </Panel>

      <Panel
        description="Tra cứu theo scope kho hiện tại; hàng quarantine/expired/serial khóa không bán được."
        title="Lot / serial / expiry"
      >
        <div className="cn-mini-list">
          <div className="cn-mini-row">
            <span>
              <strong>FL-210-88</strong>
              <small>Serial · chờ kiểm sau trả hàng</small>
            </span>
            <Badge tone="warning">Quarantine</Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>L2407</strong>
              <small>Lô gần hết hạn · ưu tiên FEFO khi xuất</small>
            </span>
            <Badge tone="warning">Expiry alert</Badge>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function TransferWorkbench() {
  return (
    <div className="cn-inventory-workbench-grid">
      <Panel
        action={<Badge tone="info">Partially received</Badge>}
        description="Kho nguồn và kho nhận đều được kiểm tra lại khi duyệt/xuất/nhận."
        title="Điều chuyển TRF-240726-041"
      >
        <WorkflowSteps
          steps={[
            { label: 'Draft', state: 'done' },
            { label: 'Approved', state: 'done' },
            { label: 'Shipped', state: 'done' },
            { label: 'Partially received', state: 'active' },
          ]}
        />
        <div className="cn-workbench-list">
          <div className="cn-workbench-row">
            <span>
              <strong>Kho nguồn · Kho bán lẻ</strong>
              <small>Người tạo: Linh Nguyễn · đã xuất 4 dòng.</small>
            </span>
            <Badge tone="success">Shipped</Badge>
          </div>
          <div className="cn-workbench-row">
            <span>
              <strong>Kho nhận · Kho Hàng mẫu</strong>
              <small>Còn 1 line chênh lệch nhận thực tế.</small>
            </span>
            <Badge tone="warning">Cần xử lý</Badge>
          </div>
        </div>
        <div className="cn-table-scroll cn-workbench-table">
          <table>
            <thead>
              <tr>
                <th>Variant</th>
                <th>Xuất</th>
                <th>Đã nhận</th>
                <th>Chênh lệch</th>
                <th>Lot / serial</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Senka 120g</strong>
                  <small>SRM-120</small>
                </td>
                <td className="num">12</td>
                <td className="num">10</td>
                <td className="num">−2</td>
                <td><Badge tone="info">LOT-2407-A</Badge></td>
              </tr>
              <tr>
                <td>
                  <strong>Khăn giấy 80 tờ</strong>
                  <small>KG-80</small>
                </td>
                <td className="num">24</td>
                <td className="num">24</td>
                <td className="num">0</td>
                <td><Badge tone="success">Khớp</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        description="Không sửa quantity đã ship; chênh lệch nhận cần lý do và approval."
        title="Approval guard"
      >
        <div className="cn-notice cn-notice-warning">
          <strong>Chênh lệch cần xử lý</strong>
          <span>Nhận thiếu/hỏng phải có lý do chuẩn hóa trước khi hoàn tất phiếu nhận.</span>
        </div>
        <div className="cn-workbench-actions">
          <Button variant="primary">Gửi duyệt chênh lệch</Button>
          <Button variant="secondary">Từ chối nhận</Button>
        </div>
      </Panel>
    </div>
  );
}

function StocktakeWorkbench() {
  return (
    <div className="cn-inventory-workbench-grid">
      <Panel
        action={<Badge tone="info">Đang đếm</Badge>}
        description="System snapshot được giữ cùng scope trước lúc nhập count."
        title="Stocktake STK-240726-08"
      >
        <div className="cn-workbench-list">
          <div className="cn-workbench-row">
            <span>
              <strong>Snapshot lúc 09:00</strong>
              <small>CN Quận 3 · Kho bán lẻ · 428 variants.</small>
            </span>
            <Badge tone="success">Locked snapshot</Badge>
          </div>
        </div>
        <div className="cn-notice cn-notice-warning">
          <strong>Có 03 movement sau snapshot</strong>
          <span>Variance phải tách rõ movement-after-snapshot trước khi gửi duyệt.</span>
        </div>
        <div className="cn-table-scroll cn-workbench-table">
          <table>
            <thead>
              <tr>
                <th>Variant</th>
                <th>System</th>
                <th>Counted</th>
                <th>After snapshot</th>
                <th>Variance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Senka 120g</td>
                <td className="num">18</td>
                <td className="num">16</td>
                <td className="num">−1 sale</td>
                <td className="num">−1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Variance approval">
        <StateBlock
          description="Counter không được tự duyệt phiên kiểm kho. Approved mới tạo CountAdjustment movement."
          title="Cần người duyệt"
          tone="warning"
        />
        <div className="cn-workbench-actions">
          <Button variant="primary">Gửi duyệt variance</Button>
          <Button variant="secondary">Lưu nháp</Button>
        </div>
      </Panel>
    </div>
  );
}

function AdjustmentWorkbench() {
  return (
    <div className="cn-inventory-workbench-grid">
      <Panel
        action={<Badge tone="warning">Pending approval</Badge>}
        description="Không ghi số dư trực tiếp; chỉ tạo movement có lý do/evidence."
        title="Điều chỉnh tồn"
      >
        <div className="cn-choice-row">
          <button className="active" type="button">Sai lệch kiểm kê</button>
          <button type="button">Hàng hỏng</button>
          <button type="button">Khác</button>
        </div>
        <div className="cn-workbench-row">
          <span>
            <strong>SRM-120 · Kho bán lẻ</strong>
            <small>Điều chỉnh <span className="num">−1</span> · evidence: bien-ban-kiem-ke.pdf</small>
          </span>
          <Badge tone="info">Draft movement</Badge>
        </div>
      </Panel>
      <Panel title="Evidence policy">
        <div className="cn-notice cn-notice-warning">
          <strong>Attachment bắt buộc nếu vượt ngưỡng</strong>
          <span>Approval mới thay đổi stock card; không update trực tiếp balance.</span>
        </div>
        <div className="cn-workbench-actions">
          <Button variant="primary">Submit approval</Button>
        </div>
      </Panel>
    </div>
  );
}

function ScrapWorkbench() {
  return (
    <div className="cn-inventory-workbench-grid">
      <Panel
        action={<Badge tone="warning">Quarantine</Badge>}
        description="Chọn lot/serial, lý do và bằng chứng trước khi submit."
        title="Scrap & quarantine"
      >
        <div className="cn-workbench-row">
          <span>
            <strong>LOT-2407-A</strong>
            <small>Senka 120g · hết hạn 30/07/2026 · 4 units.</small>
          </span>
          <Badge tone="warning">Blocked sale</Badge>
        </div>
        <div className="cn-choice-row">
          <button className="active" type="button">Quarantine</button>
          <button type="button">Scrap</button>
          <button type="button">Restock</button>
        </div>
      </Panel>
      <Panel title="Approval">
        <StateBlock
          description="Scrap chỉ có hiệu lực sau approval; hàng quarantine không được bán."
          title="Guard theo trạng thái hàng"
          tone="info"
        />
        <div className="cn-workbench-actions">
          <Button variant="primary">Gửi duyệt</Button>
        </div>
      </Panel>
    </div>
  );
}

function NegativeCostWorkbench() {
  return (
    <div className="cn-inventory-workbench-grid">
      <Panel
        action={<Badge tone="danger">Blocked</Badge>}
        description="Temporary cost là state có approval, không phải silent balance edit."
        title="Negative stock exception"
      >
        <div className="cn-notice cn-notice-danger">
          <strong>Tồn khả dụng không đủ cho SRM-120</strong>
          <span>Chỉ Manager/Owner có thể phê duyệt ngoại lệ, có temporary cost và lý do.</span>
        </div>
        <dl className="cn-workbench-kv">
          <div><dt>Available</dt><dd className="num">0</dd></div>
          <div><dt>Requested</dt><dd className="num">2</dd></div>
          <div><dt>Temporary cost</dt><dd className="num">92.000 ₫</dd></div>
        </dl>
      </Panel>
      <Panel title="Quyền hiện tại">
        <Badge tone="danger">Không có quyền duyệt</Badge>
        <div className="cn-workbench-actions">
          <Button variant="secondary">Yêu cầu ngoại lệ</Button>
        </div>
      </Panel>
    </div>
  );
}

function TraceWorkbench() {
  return (
    <div className="cn-inventory-workbench-grid">
      <Panel
        action={<Badge tone="info">LOT-2407-A</Badge>}
        description="Tra cứu trail từ receipt, transfer, adjustment đến sale/return nguồn."
        title="Trace lot / serial"
      >
        <div className="cn-workbench-list">
          <div className="cn-workbench-row">
            <span>
              <strong>GRN-240701-12</strong>
              <small>Nhập 48 · 01/07 · supplier receipt.</small>
            </span>
            <Badge tone="success">Nguồn</Badge>
          </div>
          <div className="cn-workbench-row">
            <span>
              <strong>TRF-240726-041</strong>
              <small>Xuất 12 · kho bán lẻ → kho Hàng mẫu.</small>
            </span>
            <Badge tone="info">Transfer</Badge>
          </div>
          <div className="cn-workbench-row">
            <span>
              <strong>SCR-240730-02</strong>
              <small>Quarantine 4 · expiry guard.</small>
            </span>
            <Badge tone="warning">Quarantine</Badge>
          </div>
        </div>
      </Panel>
      <Panel description="Immutable card." title="Movement ledger">
        <Button variant="secondary">Mở source drill-down</Button>
      </Panel>
    </div>
  );
}

function WorkflowSteps({ steps }: { steps: readonly { label: string; state: 'active' | 'done' | 'todo' }[] }) {
  return (
    <div className="cn-workflow-steps" aria-label="Trạng thái chứng từ">
      {steps.map((step) => (
        <span className={`cn-workflow-step cn-workflow-step-${step.state}`} key={step.label}>
          {step.label}
        </span>
      ))}
    </div>
  );
}

function PurchasingWorkspace() {
  return (
    <div className="cn-catalog-grid">
      <Panel
        description="PO không tạo tồn/cost/payable; chỉ Goods Receipt Approved mới ghi ledger."
        title="Purchase orders & goods receipt"
      >
        <div className="cn-mini-list">
          <div className="cn-mini-row">
            <span>
              <strong>PO-260726-00031 · Nhà cung cấp An Phú</strong>
              <small>24 chai đặt · 16 chai đã nhận.</small>
            </span>
            <Badge tone="warning">Partially received</Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>GR-260726-00042</strong>
              <small>Validate lot/serial, attachment và approval trước cập nhật tồn/cost/payable.</small>
            </span>
            <Button variant="secondary">Mở receipt</Button>
          </div>
        </div>
      </Panel>
      <Panel
        description="Allocation theo value/quantity/manual, bắt buộc exact reconciliation."
        title="Landed cost & late invoice"
      >
        <StateBlock
          description="Phần còn on-hand phân bổ lại; phần đã xuất chuyển PurchaseCostVariance."
          title="Late supplier invoice"
          tone="info"
        />
      </Panel>
      <Panel
        description="Giữ source evidence, lot/serial và settlement rõ."
        title="Supplier return"
      >
        <div className="cn-mini-list">
          <div className="cn-mini-row">
            <span>
              <strong>Reduce payable / Refund / Replacement</strong>
              <small>Không vượt số lượng receipt nguồn còn được trả.</small>
            </span>
            <Badge tone="info">Source evidence</Badge>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function formatQuantity(quantityMilli: number): string {
  return (quantityMilli / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  });
}
