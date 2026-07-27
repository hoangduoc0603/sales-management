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

export function InventoryHome({
  generatedAt = '2026-07-27T00:00:00.000Z',
  route,
  rows = defaultRows,
}: InventoryHomeProps) {
  const [selectedTab, setSelectedTab] = useState(route === 'purchasing' ? 'purchase' : 'inventory');
  const selectedRow = rows[0];
  const totalAvailableMilli = useMemo(
    () => rows.reduce((sum, row) => sum + row.availableMilli, 0),
    [rows],
  );

  useEffect(() => {
    setSelectedTab(route === 'purchasing' ? 'purchase' : 'inventory');
  }, [route]);

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
        onChange={setSelectedTab}
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
            label: 'Transfers & stocktake',
            content: <TransferStocktakeWorkspace />,
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

function TransferStocktakeWorkspace() {
  return (
    <div className="cn-catalog-grid">
      <Panel
        description="Draft → Pending Approval → Approved → Shipped → Partially Received → Received."
        title="Transfers"
      >
        <div className="cn-mini-list">
          <div className="cn-mini-row">
            <span>
              <strong>TR-260726-0018 · Kho trung tâm → Kho cửa hàng</strong>
              <small>12 chai · shipped 09:20</small>
            </span>
            <Badge tone="info">Shipped</Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>TR-260725-0011 · nhận một phần</strong>
              <small>8 bộ gửi · 5 bộ đã nhận · 3 bộ in-transit.</small>
            </span>
            <Badge tone="warning">Partially received</Badge>
          </div>
        </div>
      </Panel>
      <Panel
        description="Snapshot hệ thống khi mở phiên; movement sau snapshot hiển thị riêng."
        title="Stocktake"
      >
        <StateBlock
          description="Variance phải submit để Approve/Reject; không tự ghi đè snapshot."
          title="Kiểm kho cần approval trước movement"
          tone="info"
        />
      </Panel>
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
