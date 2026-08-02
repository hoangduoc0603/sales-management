import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { InventoryBalanceSummaryRowDTO } from '@shared/contracts/inventory/inventory';
import { AppIcon } from '../../components/ui/icons';
import { Badge } from '../../components/ui/badge';
import { Button, IconButton } from '../../components/ui/button';
import { Listbox } from '../../components/ui/listbox';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import { Table } from '../../components/ui/table';
import type { AppRoute } from '../../app/app-shell/app-shell';

export interface InventoryHomeProps {
  route: Extract<AppRoute, 'inventory' | 'purchasing'>;
  rows?: readonly InventoryHomeRow[];
  generatedAt?: string;
}

export interface InventoryHomeRow extends InventoryBalanceSummaryRowDTO {
  sku: string;
  displayName: string;
  categoryName: string;
  unitName: string;
  inTransitMilli: number;
  alertType: InventoryAlertFilter;
  status: 'available' | 'reserved' | 'quarantine';
  trackingMode: InventoryTrackingFilter;
  sourceNote: string;
}

const inventoryViewIds = [
  'overview',
  'receiving',
  'outbound',
  'transfer',
  'stocktake',
  'adjustment',
  'nxt',
  'alerts',
  'lot-serial',
  'reservation',
  'trace',
  'empty',
  'restricted',
  'scope-changed',
] as const;

type InventoryViewId = (typeof inventoryViewIds)[number];
type InventoryWorkflowViewId = (typeof inventoryWorkflowViewIds)[number];
type InventoryAlertFilter = 'low' | 'expiry' | 'serial' | 'slow' | 'none';
type InventoryTrackingFilter = 'lot' | 'serial' | 'none';
type AppIconName = Parameters<typeof AppIcon>[0]['name'];
type MetricTone = 'neutral' | 'info' | 'success' | 'warning';

const inventoryWorkflowViewIds = [
  'receiving',
  'outbound',
  'transfer',
  'stocktake',
  'adjustment',
  'nxt',
] as const;

const workflowMetricAccents: readonly { icon: AppIconName; tone: MetricTone }[] = [
  { icon: 'box', tone: 'neutral' },
  { icon: 'check', tone: 'success' },
  { icon: 'clock', tone: 'info' },
  { icon: 'warning', tone: 'warning' },
] as const;

interface InventoryWorkflowDefinition {
  title: string;
  breadcrumb: string;
  artifact: string;
  localPath: string;
  summary: string;
}

const defaultRows: readonly InventoryHomeRow[] = [
  {
    warehouseId: 'warehouse-central',
    variantId: 'variant-milk-1l',
    sku: 'SH-OC-1L',
    displayName: 'Sữa hạt óc chó 1L',
    categoryName: 'Thực phẩm & đồ uống',
    unitName: 'Thùng',
    onHandMilli: 4_000,
    availableMilli: 2_000,
    reservedMilli: 1_000,
    inTransitMilli: 0,
    quarantineMilli: 1_000,
    inventoryValueVnd: 440_000,
    alertType: 'low',
    status: 'available',
    trackingMode: 'lot',
    sourceNote: 'Giữ chỗ SO-04218 · 14:28',
  },
  {
    warehouseId: 'warehouse-central',
    variantId: 'variant-laundry-36',
    sku: 'NG-SH-3600',
    displayName: 'Nước giặt sinh học hương hoa 3,6kg',
    categoryName: 'Gia dụng',
    unitName: 'Túi',
    onHandMilli: 24_000,
    availableMilli: 24_000,
    reservedMilli: 0,
    inTransitMilli: 0,
    quarantineMilli: 0,
    inventoryValueVnd: 1_560_000,
    alertType: 'none',
    status: 'available',
    trackingMode: 'none',
    sourceNote: 'Nhập GRN-0104 · 01/08',
  },
  {
    warehouseId: 'warehouse-central',
    variantId: 'variant-shirt-black-m',
    sku: 'AT-BASIC-DEN-M',
    displayName: 'Áo thun cổ tròn basic',
    categoryName: 'Thời trang',
    unitName: 'Cái',
    onHandMilli: 38_000,
    availableMilli: 25_000,
    reservedMilli: 12_000,
    inTransitMilli: 1_000,
    quarantineMilli: 0,
    inventoryValueVnd: 1_620_000,
    alertType: 'serial',
    status: 'reserved',
    trackingMode: 'serial',
    sourceNote: 'Giữ chỗ SO-04221 · 12:42',
  },
  {
    warehouseId: 'warehouse-central',
    variantId: 'variant-honey-500',
    sku: 'MO-RUNG-500',
    displayName: 'Mật ong rừng 500ml',
    categoryName: 'Thực phẩm & đồ uống',
    unitName: 'Chai',
    onHandMilli: 86_000,
    availableMilli: 54_000,
    reservedMilli: 0,
    inTransitMilli: 0,
    quarantineMilli: 32_000,
    inventoryValueVnd: 6_880_000,
    alertType: 'expiry',
    status: 'quarantine',
    trackingMode: 'lot',
    sourceNote: 'Cách ly QT-008 · 10:20',
  },
  {
    warehouseId: 'warehouse-central',
    variantId: 'variant-towel-premium',
    sku: 'KBCC-01',
    displayName: 'Khăn bông cao cấp',
    categoryName: 'Gia dụng',
    unitName: 'Cái',
    onHandMilli: 120_000,
    availableMilli: 120_000,
    reservedMilli: 0,
    inTransitMilli: 0,
    quarantineMilli: 0,
    inventoryValueVnd: 7_200_000,
    alertType: 'slow',
    status: 'available',
    trackingMode: 'none',
    sourceNote: 'Nhập GRN-0091 · 04/05',
  },
];

const alertOptions = [
  { value: 'all', label: 'Tất cả cảnh báo' },
  { value: 'low', label: 'Tồn thấp' },
  { value: 'expiry', label: 'Lô gần hạn' },
  { value: 'serial', label: 'Serial bất thường' },
  { value: 'slow', label: 'Di chuyển chậm' },
] as const;

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'available', label: 'Có thể bán' },
  { value: 'reserved', label: 'Đã giữ chỗ' },
  { value: 'quarantine', label: 'Quarantine' },
] as const;

const trackingOptions = [
  { value: 'all', label: 'Tất cả theo dõi' },
  { value: 'lot', label: 'Theo lô' },
  { value: 'serial', label: 'Theo serial' },
  { value: 'none', label: 'Không theo dõi' },
] as const;

const operationalSummary = {
  onHandMilli: 12_486_000,
  availableMilli: 10_972_000,
  reservedMilli: 864_000,
  inTransitMilli: 382_000,
  quarantineMilli: 268_000,
  alertCount: 6,
} as const;

const inventoryWorkflowViews = {
  receiving: {
    title: 'Nhập kho và tiếp nhận hàng',
    breadcrumb: 'Kho vận / Nhập kho',
    artifact: 'inventory-receiving-inbound.html',
    localPath:
      '/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-receiving-inbound.html',
    summary: 'Receipt theo PO hoặc nhập trực tiếp, nhận một phần, lô/serial, chi phí mua và trạng thái phê duyệt.',
  },
  outbound: {
    title: 'Xuất kho và fulfillment theo nguồn',
    breadcrumb: 'Kho vận / Xuất kho',
    artifact: 'inventory-fulfillment-outbound.html',
    localPath:
      '/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-fulfillment-outbound.html',
    summary: 'Pick/pack/ship theo đơn bán, FEFO/serial, thiếu tồn, ngoại lệ âm, trả NCC và xuất bảo hành.',
  },
  transfer: {
    title: 'Điều chuyển và nhận kho',
    breadcrumb: 'Kho vận / Điều chuyển',
    artifact: 'inventory-transfer-receive.html',
    localPath:
      '/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-transfer-receive.html',
    summary: 'Phiếu chuyển từ nháp, duyệt, pick/ship, đang chuyển, nhận một phần, nhận đủ và xử lý chênh lệch.',
  },
  stocktake: {
    title: 'Kiểm kê kho',
    breadcrumb: 'Kho vận / Kiểm kê',
    artifact: 'inventory-stocktake.html',
    localPath:
      '/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-stocktake.html',
    summary: 'Phiên kiểm theo snapshot, nhập số thực tế, lý do chênh lệch, movement sau snapshot và phê duyệt độc lập.',
  },
  adjustment: {
    title: 'Điều chỉnh kho và ngoại lệ',
    breadcrumb: 'Kho vận / Điều chỉnh',
    artifact: 'inventory-adjustment-exception.html',
    localPath:
      '/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-adjustment-exception.html',
    summary: 'Điều chỉnh có lý do, bằng chứng, phê duyệt, scrap, ngoại lệ âm kho và giá vốn tạm.',
  },
  nxt: {
    title: 'Hoàn trả, quarantine và báo cáo NXT',
    breadcrumb: 'Kho vận / Báo cáo NXT',
    artifact: 'inventory-return-quarantine-nxt.html',
    localPath:
      '/Users/hoangduoc/Library/Application Support/Open Design/namespaces/release-stable/data/projects/7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b/inventory-return-quarantine-nxt.html',
    summary: 'Return vào quarantine, inspection Restock/KeepQuarantine/Scrap, trace serial và báo cáo nhập-xuất-tồn.',
  },
} satisfies Record<InventoryWorkflowViewId, InventoryWorkflowDefinition>;

export function InventoryHome({
  route,
  rows = defaultRows,
}: InventoryHomeProps) {
  const [activeView, setActiveView] = useState<InventoryViewId>(() => readInventoryHashView() ?? 'overview');

  useEffect(() => {
    if (route === 'purchasing') return;

    const syncHash = () => setActiveView(readInventoryHashView() ?? 'overview');
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [route]);

  if (route === 'purchasing') {
    return <PurchasingReadOnlyWorkspace />;
  }

  const activeWorkflowView = getInventoryWorkflowView(activeView);

  return (
    <div className="cn-inventory-shell cn-inventory-ops-shell">
      <header className="cn-dashboard-head cn-inventory-page-head">
        <div>
          <p className="cn-breadcrumb">{inventoryViewBreadcrumb(activeView)}</p>
          <h1>{inventoryViewTitle(activeView)}</h1>
          <p>{inventoryViewDescription(activeView)}</p>
        </div>
        <div className="cn-dashboard-actions cn-inventory-actions">
          <IconButton label="Làm mới dữ liệu tồn kho">
            <AppIcon name="refresh" />
          </IconButton>
          <Button variant="primary">
            <AppIcon name="box" />
            Tạo chứng từ kho
          </Button>
        </div>
      </header>

      {activeView === 'overview' ? (
        <OverviewView rows={rows} />
      ) : activeWorkflowView ? (
        <InventoryWorkflowView viewId={activeView as InventoryWorkflowViewId} />
      ) : activeView === 'alerts' ? (
        <AlertsView />
      ) : activeView === 'lot-serial' ? (
        <LotSerialView />
      ) : activeView === 'reservation' ? (
        <ReservationView />
      ) : activeView === 'trace' ? (
        <TraceView />
      ) : activeView === 'empty' ? (
        <EmptyView />
      ) : activeView === 'restricted' ? (
        <RestrictedView />
      ) : (
        <ScopeChangedView />
      )}
    </div>
  );
}

function InventoryWorkflowView({ viewId }: { viewId: InventoryWorkflowViewId }) {
  if (viewId === 'receiving') return <ReceivingWorkflowView />;
  if (viewId === 'outbound') return <OutboundWorkflowView />;
  if (viewId === 'transfer') return <TransferWorkflowView />;
  if (viewId === 'stocktake') return <StocktakeWorkflowView />;
  if (viewId === 'adjustment') return <AdjustmentWorkflowView />;
  return <NxtWorkflowView />;
}

function ReceivingWorkflowView() {
  return (
    <div className="cn-inventory-workflow-page">
      <WorkflowMetrics
        metrics={[
          ['Chờ nhận hôm nay', '8', '5 PO · 3 nhận một phần'],
          ['Dòng hàng còn mở', '34', 'Đã loại trừ PO chưa duyệt'],
          ['Cần truy vết', '7', 'Lô / serial hoặc HSD'],
          ['Cần xử lý', '3', 'Chi phí mua hoặc nhận dư'],
        ]}
      />
      <div className="cn-inventory-workflow-grid">
        <Panel
          action={<Badge tone="warning">Chờ kiểm tra</Badge>}
          description="Receipt theo PO hoặc nhập trực tiếp được phép; chưa ghi tồn trước khi phiếu được duyệt."
          title="Hàng chờ tiếp nhận"
        >
          <WorkflowSteps activeIndex={1} steps={['Nháp', 'Kiểm tra', 'Chờ duyệt', 'Đã duyệt / ghi sổ']} />
          <Table
            columns={[
              { key: 'document', header: 'Phiếu nhận' },
              { key: 'source', header: 'Nguồn' },
              { key: 'variant', header: 'Biến thể' },
              { key: 'quantity', header: 'Thực nhận', align: 'right' },
              { key: 'trace', header: 'Lô / serial' },
              { key: 'status', header: 'Trạng thái' },
            ]}
            emptyMessage="Không có hàng chờ tiếp nhận."
            rows={[
              {
                document: 'GRN-0108',
                source: <Badge tone="info">Theo PO</Badge>,
                variant: 'Sữa hạt óc chó 1L · SH-OC-1L',
                quantity: <span className="num">72 chai</span>,
                trace: 'LOT-2508-WN · HSD 28/01/2027',
                status: <Badge tone="success">Hợp lệ</Badge>,
              },
              {
                document: 'GRN-0109',
                source: <Badge tone="warning">Nhập trực tiếp</Badge>,
                variant: 'Áo thun basic Đen / M',
                quantity: <span className="num">18 cái</span>,
                trace: '17/18 serial hợp lệ',
                status: <Badge tone="danger">Serial trùng</Badge>,
              },
              {
                document: 'GRN-0110',
                source: <Badge tone="info">Theo PO</Badge>,
                variant: 'Nước giặt sinh học 3,6kg',
                quantity: <span className="num">42 túi</span>,
                trace: 'Không bắt buộc',
                status: <Badge tone="warning">Chi phí mua</Badge>,
              },
            ]}
          />
          <div className="cn-inventory-command-bar">
            <Button>Đối soát chi phí mua</Button>
            <Button variant="primary">
              <AppIcon name="check" />
              Gửi duyệt
            </Button>
          </div>
        </Panel>
        <WorkflowSummary
          notice="Movement nhập chỉ phát sinh sau khi phiếu nhận được duyệt độc lập."
          rows={[
            ['Movement nhập', '114 đơn vị'],
            ['Kho nhận', 'Kho trung tâm'],
            ['Chi phí mua', '324.000 đ'],
            ['Trước duyệt', 'Chưa thay đổi tồn'],
          ]}
          title="Ảnh hưởng khi duyệt"
          tone="info"
        />
      </div>
    </div>
  );
}

function OutboundWorkflowView() {
  return (
    <div className="cn-inventory-workflow-page">
      <WorkflowMetrics
        metrics={[
          ['Đơn bán cần pick', '14', 'SaleIssue khi đã giao'],
          ['Trả nhà cung cấp', '3', 'PurchaseReturn khi duyệt'],
          ['Xuất bảo hành', '2', 'Theo chứng từ nguồn'],
          ['SLA nguy cơ trễ', '4', 'Ưu tiên hôm nay'],
        ]}
      />
      <div className="cn-inventory-workflow-grid">
        <Panel
          action={<Badge tone="info">19 công việc</Badge>}
          description="Pick / pack / ship theo chứng từ nguồn; không tạo xuất kho chung ngoài nguồn hợp lệ."
          title="Hàng chờ xuất"
        >
          <WorkflowSteps activeIndex={1} steps={['Đã giữ chỗ', 'Pick / pack / ship', 'Sẵn sàng giao', 'Đã ship']} />
          <Table
            columns={[
              { key: 'source', header: 'Nguồn' },
              { key: 'variant', header: 'Biến thể' },
              { key: 'request', header: 'Yêu cầu', align: 'right' },
              { key: 'rule', header: 'Luật chọn' },
              { key: 'guard', header: 'Guard' },
              { key: 'status', header: 'Trạng thái' },
            ]}
            emptyMessage="Không có hàng chờ xuất."
            rows={[
              {
                source: 'SO-260803-084',
                variant: 'Sữa hạt óc chó 1L · LOT-2407-A',
                request: <span className="num">5 thùng</span>,
                rule: 'FEFO',
                guard: 'Đủ tồn khả dụng',
                status: <Badge tone="success">Có thể pick</Badge>,
              },
              {
                source: 'SO-260803-091',
                variant: 'Áo thun basic Đen / M',
                request: <span className="num">3 cái</span>,
                rule: 'Serial bắt buộc',
                guard: 'Thiếu 2 serial',
                status: <Badge tone="danger">Bị chặn</Badge>,
              },
              {
                source: 'SO-260803-097',
                variant: 'Nước giặt sinh học 3,6kg',
                request: <span className="num">8 túi</span>,
                rule: 'Khả dụng sau reservation',
                guard: 'Thiếu tồn 3 túi',
                status: <Badge tone="warning">Thiếu tồn</Badge>,
              },
            ]}
          />
          <div className="cn-inventory-command-bar">
            <Button>Xem ngoại lệ âm kho</Button>
            <Button variant="primary">
              <AppIcon name="check" />
              Xác nhận xuất kho
            </Button>
          </div>
        </Panel>
        <WorkflowSummary
          notice="Lô/serial được ghi vào payload pick và movement khi xác nhận ship."
          rows={[
            ['Nguồn', 'SO / Return / Warranty'],
            ['Movement', 'SaleIssue / PurchaseReturn'],
            ['Reservation', 'Giải phóng khi ship'],
            ['Chi phí', 'Đang tạm tính nếu cần'],
          ]}
          title="Tóm tắt phát hành"
          tone="warning"
        />
      </div>
    </div>
  );
}

function TransferWorkflowView() {
  return (
    <div className="cn-inventory-workflow-page">
      <div className="cn-inventory-workflow-grid">
        <Panel
          action={<Badge tone="warning">Nhận một phần</Badge>}
          description="Ship làm giảm khả dụng tại kho nguồn và đưa hàng sang đang chuyển; kho đích chỉ tăng khi nhận thực tế."
          title="Phiếu điều chuyển"
        >
          <WorkflowSteps
            activeIndex={5}
            steps={['Nháp', 'Chờ duyệt', 'Đã duyệt', 'Pick / ship', 'Đang chuyển', 'Đã nhận']}
          />
          <div className="cn-inventory-detail-grid">
            <Definition label="Mã phiếu" value="TRF-240802-041" />
            <Definition label="Kho nguồn" value="Kho trung tâm" />
            <Definition label="Kho đích" value="Kho cửa hàng Quận 3" />
            <Definition label="Người nhận" value="Minh Quân" />
            <Definition label="Đã ship" value="12 thùng" />
            <Definition label="Đã nhận" value="10 thùng" />
          </div>
          <Table
            columns={[
              { key: 'variant', header: 'Biến thể' },
              { key: 'shipped', header: 'Đã ship', align: 'right' },
              { key: 'received', header: 'Đã nhận', align: 'right' },
              { key: 'transit', header: 'Đang chuyển', align: 'right' },
              { key: 'variance', header: 'Chênh lệch nhận' },
            ]}
            emptyMessage="Không có dòng điều chuyển."
            rows={[
              {
                variant: 'Sữa hạt óc chó 1L · LOT-2407-A',
                shipped: <span className="num">12</span>,
                received: <span className="num">10</span>,
                transit: <span className="num">2</span>,
                variance: <Badge tone="warning">Cần quyết định</Badge>,
              },
              {
                variant: 'Áo thun basic Đen / M',
                shipped: <span className="num">4</span>,
                received: <span className="num">4</span>,
                transit: <span className="num">0</span>,
                variance: <Badge tone="success">Khớp</Badge>,
              },
            ]}
          />
        </Panel>
        <WorkflowSummary
          notice="Không tự động đánh dấu đã nhận khi còn variance chưa có quyết định."
          rows={[
            ['Kho nguồn khả dụng', 'Giảm theo shipped'],
            ['Kho đích', 'Tăng theo received'],
            ['Còn đang chuyển', '2 thùng'],
            ['Chênh lệch', 'Cần bằng chứng'],
          ]}
          title="Guard điều chuyển"
          tone="danger"
        />
      </div>
    </div>
  );
}

function StocktakeWorkflowView() {
  return (
    <div className="cn-inventory-workflow-page">
      <div className="cn-inventory-workflow-grid">
        <Panel
          action={<Badge tone="info">Đang nhập</Badge>}
          description="Phiên kiểm kê chốt snapshot trước khi đếm; ledger chỉ ghi đối soát sau phê duyệt."
          title="Phiên kiểm kê"
        >
          <WorkflowSteps activeIndex={2} steps={['Nháp', 'Đang đếm', 'Gửi duyệt', 'Đã ghi sổ']} />
          <div className="cn-inventory-detail-grid">
            <Definition label="Mã phiên" value="STK-240802-013" />
            <Definition label="Snapshot hệ thống" value="08:00 · 02/08/2026" />
            <Definition label="Phạm vi" value="Kho trung tâm · Kệ A-B" />
          </div>
          <Table
            columns={[
              { key: 'variant', header: 'Biến thể' },
              { key: 'expected', header: 'Snapshot hệ thống', align: 'right' },
              { key: 'counted', header: 'Số thực tế', align: 'right' },
              { key: 'variance', header: 'Chênh lệch', align: 'right' },
              { key: 'reason', header: 'Lý do / bằng chứng' },
            ]}
            emptyMessage="Không có dòng kiểm kê."
            rows={[
              {
                variant: 'Sữa hạt óc chó 1L · LOT-2407-A',
                expected: <span className="num">18</span>,
                counted: <span className="num">17</span>,
                variance: <span className="num">-1</span>,
                reason: 'Vỡ thùng · ảnh kệ',
              },
              {
                variant: 'Nước giặt sinh học 3,6kg',
                expected: <span className="num">24</span>,
                counted: <span className="num">18</span>,
                variance: <span className="num">-6</span>,
                reason: 'Cần bổ sung bằng chứng',
              },
            ]}
          />
          <div className="cn-inventory-command-bar">
            <Badge tone="warning">Movement sau snapshot: 2</Badge>
            <Button variant="primary">
              <AppIcon name="check" />
              Gửi duyệt
            </Button>
          </div>
        </Panel>
        <WorkflowSummary
          notice="Biến động sau snapshot vẫn giữ nguyên trong ledger và cần rà soát trước khi gửi duyệt."
          rows={[
            ['09:14', 'Xuất bán SO-04218 · -1'],
            ['10:06', 'Điều chuyển đến TRF-041 · +4'],
            ['Nguyên tắc', 'Rà soát, không tự cộng trừ'],
          ]}
          title="Movement sau snapshot"
          tone="warning"
        />
      </div>
    </div>
  );
}

function AdjustmentWorkflowView() {
  return (
    <div className="cn-inventory-workflow-page">
      <div className="cn-inventory-workflow-grid">
        <Panel
          action={<Badge tone="warning">Nháp</Badge>}
          description="Điều chỉnh không mở ô sửa số dư trực tiếp; mọi thay đổi đi qua chứng từ có lý do, bằng chứng và phê duyệt."
          title="Phiếu điều chỉnh"
        >
          <Table
            columns={[
              { key: 'variant', header: 'Biến thể' },
              { key: 'before', header: 'Tồn trước', align: 'right' },
              { key: 'delta', header: 'Điều chỉnh', align: 'right' },
              { key: 'after', header: 'Tồn sau', align: 'right' },
              { key: 'reason', header: 'Lý do chuẩn hóa' },
              { key: 'evidence', header: 'Bằng chứng' },
            ]}
            emptyMessage="Không có dòng điều chỉnh."
            rows={[
              {
                variant: 'Sữa hạt óc chó 1L · LOT-2407-A',
                before: <span className="num">4 thùng</span>,
                delta: <span className="num">+2</span>,
                after: <span className="num">6 thùng</span>,
                reason: 'Chênh lệch kiểm kê',
                evidence: 'bien-ban-kiem-ke.pdf',
              },
              {
                variant: 'Áo thun basic Đen / M',
                before: <span className="num">1 cái</span>,
                delta: <span className="num">-3</span>,
                after: <span className="num">-2 cái</span>,
                reason: 'Ngoại lệ âm kho',
                evidence: 'Cần approver + serial',
              },
            ]}
          />
          <div className="cn-inventory-command-bar">
            <Badge tone="danger">Ngoại lệ âm kho</Badge>
            <Badge tone="info">Giá vốn đang tạm tính</Badge>
            <Button variant="primary">
              <AppIcon name="check" />
              Gửi duyệt
            </Button>
          </div>
        </Panel>
        <WorkflowSummary
          notice="Người tạo không được tự duyệt chứng từ điều chỉnh của chính mình."
          rows={[
            ['Tổng dòng', '2'],
            ['Tăng tồn', '+2 thùng'],
            ['Giảm tồn', '-3 cái'],
            ['Bằng chứng', 'Bắt buộc'],
          ]}
          title="Kiểm tra dữ liệu"
          tone="warning"
        />
      </div>
    </div>
  );
}

function NxtWorkflowView() {
  return (
    <div className="cn-inventory-workflow-page">
      <WorkflowMetrics
        metrics={[
          ['Đang Quarantine', '18', 'Không khả dụng để bán'],
          ['Chờ kiểm tra', '7', '3 dòng theo serial'],
          ['Quá SLA kiểm tra', '2', 'Cần ưu tiên'],
          ['Chờ scrap', '1', 'Cần phê duyệt'],
        ]}
      />
      <div className="cn-inventory-workflow-grid">
        <Panel
          action={<Badge tone="info">Tính đến 10:10</Badge>}
          description="Báo cáo nhập-xuất-tồn tổng hợp theo movement đã đồng bộ trong phạm vi báo cáo."
          title="Báo cáo nhập-xuất-tồn"
        >
          <div className="cn-inventory-filter-strip">
            {['Kỳ: 01-03/08/2026', 'Kho: Trung tâm', 'Biến thể: Tất cả', 'Lô / serial: Tất cả'].map((filter) => (
              <span key={filter}>{filter}</span>
            ))}
          </div>
          <Table
            columns={[
              { key: 'variant', header: 'Biến thể' },
              { key: 'opening', header: 'Opening', align: 'right' },
              { key: 'inbound', header: 'Nhập', align: 'right' },
              { key: 'outbound', header: 'Xuất', align: 'right' },
              { key: 'adjustment', header: 'Điều chỉnh', align: 'right' },
              { key: 'closing', header: 'Closing', align: 'right' },
              { key: 'coverage', header: 'Coverage' },
            ]}
            emptyMessage="Không có số liệu NXT."
            rows={[
              {
                variant: 'Sữa hạt óc chó 1L · LOT-2407-A',
                opening: <span className="num">18</span>,
                inbound: <span className="num">72</span>,
                outbound: <span className="num">14</span>,
                adjustment: <span className="num">-1</span>,
                closing: <span className="num">75</span>,
                coverage: <Badge tone="success">Đầy đủ</Badge>,
              },
              {
                variant: 'Áo thun basic Đen / M · Serial',
                opening: <span className="num">8</span>,
                inbound: <span className="num">18</span>,
                outbound: <span className="num">5</span>,
                adjustment: <span className="num">0</span>,
                closing: <span className="num">21</span>,
                coverage: <Badge tone="success">Đầy đủ</Badge>,
              },
            ]}
          />
        </Panel>
        <WorkflowSummary
          notice="Return vào Quarantine không tăng khả dụng cho đến khi inspection có quyết định hợp lệ."
          rows={[
            ['Return', 'RET-260803-017'],
            ['Trạng thái', 'Quarantine'],
            ['Quyết định', 'Restock / Keep / Scrap'],
            ['Partial coverage', 'Archive trước 01/01/2026'],
          ]}
          title="Quarantine & Partial coverage"
          tone="info"
        />
      </div>
    </div>
  );
}

function WorkflowMetrics({ metrics }: { metrics: readonly (readonly [string, string, string])[] }) {
  return (
    <div className="cn-inventory-metrics">
      {metrics.map(([label, value, note], index) => {
        const accent = workflowMetricAccents[index % workflowMetricAccents.length];
        return <MetricCard icon={accent.icon} key={label} label={label} note={note} tone={accent.tone} value={value} />;
      })}
    </div>
  );
}

function WorkflowSteps({
  activeIndex,
  steps,
}: {
  activeIndex: number;
  steps: readonly string[];
}) {
  return (
    <div className="cn-inventory-workflow-steps" aria-label="Trạng thái chứng từ">
      {steps.map((step, index) => (
        <span
          className={index < activeIndex ? 'done' : index === activeIndex ? 'active' : undefined}
          key={step}
        >
          {step}
        </span>
      ))}
    </div>
  );
}

function WorkflowSummary({
  notice,
  rows,
  title,
  tone,
}: {
  notice: string;
  rows: readonly (readonly [string, ReactNode])[];
  title: string;
  tone: 'info' | 'warning' | 'danger';
}) {
  return (
    <aside className="cn-inventory-summary-rail">
      <Panel title={title}>
        <div className="cn-inventory-impact-list">
          {rows.map(([label, value]) => (
            <Definition key={label} label={label} value={value} />
          ))}
        </div>
        <div className={`cn-inventory-notice cn-inventory-notice-${tone}`}>
          <AppIcon name={tone === 'info' ? 'check' : 'warning'} />
          <span>{notice}</span>
        </div>
      </Panel>
    </aside>
  );
}

function OverviewView({
  rows,
}: {
  rows: readonly InventoryHomeRow[];
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [trackingFilter, setTrackingFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
    return rows.filter((row) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [row.displayName, row.sku, row.categoryName, row.sourceNote]
          .join(' ')
          .toLocaleLowerCase('vi-VN')
          .includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesAlert = alertFilter === 'all' || row.alertType === alertFilter;
      const matchesTracking = trackingFilter === 'all' || row.trackingMode === trackingFilter;
      return matchesQuery && matchesStatus && matchesAlert && matchesTracking;
    });
  }, [alertFilter, query, rows, statusFilter, trackingFilter]);

  return (
    <div className="cn-inventory-overview">
      <div className="cn-inventory-metrics">
        <MetricCard
          icon="box"
          label="Tồn thực tế"
          note="Đơn vị quy đổi"
          tone="neutral"
          value={formatQuantity(operationalSummary.onHandMilli)}
        />
        <MetricCard
          icon="check"
          label="Tồn khả dụng"
          note="Không gồm quarantine/in-transit"
          tone="success"
          value={formatQuantity(operationalSummary.availableMilli)}
        />
        <MetricCard
          icon="clock"
          label="Đã giữ chỗ"
          note="Nguồn đơn/chứng từ còn mở"
          tone="info"
          value={formatQuantity(operationalSummary.reservedMilli)}
        />
        <MetricCard
          icon="warning"
          label="Cần xử lý"
          note={`${formatQuantity(operationalSummary.quarantineMilli)} quarantine · ${formatQuantity(operationalSummary.inTransitMilli)} đang chuyển`}
          tone="warning"
          value={formatQuantity(operationalSummary.alertCount * 1000)}
        />
      </div>

      <Panel
        description="Bảng desktop có tìm kiếm, trạng thái, cảnh báo và chế độ theo dõi; mobile chuyển thành thẻ tồn."
        title="Số dư theo biến thể"
      >
        <div className="cn-inventory-toolbar">
          <label className="cn-inventory-search">
            <AppIcon name="barcodeScan" />
            <span className="sr-only">Tìm hàng tồn kho</span>
            <input
              id="inventory-stock-search"
              name="inventoryStockSearch"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên biến thể, SKU, barcode"
              value={query}
            />
          </label>
          <Listbox
            label="Trạng thái"
            onChange={setStatusFilter}
            options={statusOptions}
            value={statusFilter}
          />
          <Listbox
            label="Cảnh báo"
            onChange={setAlertFilter}
            options={alertOptions}
            value={alertFilter}
          />
          <Listbox
            label="Theo dõi"
            onChange={setTrackingFilter}
            options={trackingOptions}
            value={trackingFilter}
          />
          <div className="cn-inventory-toolbar-actions">
            <IconButton label="Điều chỉnh mật độ bảng">
              <AppIcon name="reports" />
            </IconButton>
            <IconButton label="Chọn cột hiển thị">
              <AppIcon name="dashboard" />
            </IconButton>
          </div>
        </div>

        <div className="cn-inventory-table-desktop">
          <Table
            columns={[
              { key: 'variant', header: 'Biến thể' },
              { key: 'sku', header: 'SKU' },
              { key: 'onHand', header: 'Tồn thực tế', align: 'right' },
              { key: 'available', header: 'Tồn khả dụng', align: 'right' },
              { key: 'reserved', header: 'Giữ chỗ', align: 'right' },
              { key: 'inTransit', header: 'Đang chuyển', align: 'right' },
              { key: 'quarantine', header: 'Quarantine', align: 'right' },
              { key: 'alert', header: 'Cảnh báo' },
              { key: 'source', header: 'Nguồn gần nhất' },
            ]}
            emptyMessage="Không có biến thể phù hợp với điều kiện hiện tại."
            getRowKey={(row) => String(row.key)}
            rows={filteredRows.map((row) => ({
              key: row.variantId,
              variant: (
                <span className="cn-inventory-variant">
                  <strong>{row.displayName}</strong>
                  <small>
                    {row.categoryName} · {row.unitName}
                  </small>
                </span>
              ),
              sku: <span className="cn-muted">{row.sku}</span>,
              onHand: <span className="num">{formatQuantity(row.onHandMilli)}</span>,
              available: <span className="num">{formatQuantity(row.availableMilli)}</span>,
              reserved: <span className="num">{formatQuantity(row.reservedMilli)}</span>,
              inTransit: <span className="num">{formatQuantity(row.inTransitMilli)}</span>,
              quarantine: <span className="num">{formatQuantity(row.quarantineMilli)}</span>,
              alert: alertBadge(row.alertType),
              source: <span className="cn-muted">{row.sourceNote}</span>,
            }))}
          />
        </div>

        <div className="cn-inventory-card-list" aria-label="Tồn kho dạng thẻ">
          {filteredRows.length > 0 ? (
            filteredRows.map((row) => <InventoryStockCard key={row.variantId} row={row} />)
          ) : (
            <StateBlock
              description="Đổi bộ lọc hoặc phạm vi kho để tải lại projection tồn."
              title="Không có biến thể phù hợp"
              tone="neutral"
            />
          )}
        </div>
      </Panel>

      <Panel
        description="Thẻ chi tiết chỉ đọc; mở chứng từ nguồn theo quyền truy cập hiện tại."
        title="Thẻ tồn kho"
      >
        <div className="cn-inventory-detail-grid">
          <Definition label="Tồn thực tế" value="4 thùng" />
          <Definition label="Khả dụng" value="2 thùng" />
          <Definition label="Đã giữ chỗ" value="1 thùng" />
          <Definition label="Quarantine" value="1 thùng" />
          <Definition label="Gần nhất" value="Xuất bán SO-04218" />
          <Definition label="LOT-2407" value="HSD 15/10/2026" />
        </div>
        <div className="cn-inventory-readonly-note">
          <AppIcon name="warning" />
          <span>Không chỉnh sửa số dư trực tiếp</span>
        </div>
      </Panel>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  note,
  tone = 'neutral',
  value,
}: {
  icon: AppIconName;
  label: string;
  note: string;
  tone?: MetricTone;
  value: string;
}) {
  return (
    <article className="cn-inventory-metric">
      <div className="cn-inventory-metric-row">
        <div className="cn-inventory-metric-copy">
          <span className="cn-inventory-metric-label">{label}</span>
          <strong className="num">{value}</strong>
        </div>
        <span className={`cn-inventory-metric-icon ${tone}`} aria-hidden="true">
          <AppIcon name={icon} />
        </span>
      </div>
      <span className={tone === 'warning' ? 'warning' : undefined}>{note}</span>
    </article>
  );
}

function InventoryStockCard({ row }: { row: InventoryHomeRow }) {
  return (
    <article className="cn-inventory-stock-card">
      <div className="cn-inventory-stock-card-head">
        <span>
          <strong>{row.displayName}</strong>
          <small>{row.sku}</small>
        </span>
        {alertBadge(row.alertType)}
      </div>
      <div className="cn-inventory-stock-card-grid">
        <Definition label="Tồn thực tế" value={formatQuantity(row.onHandMilli)} />
        <Definition label="Khả dụng" value={formatQuantity(row.availableMilli)} />
        <Definition label="Giữ chỗ" value={formatQuantity(row.reservedMilli)} />
        <Definition label="Đang chuyển" value={formatQuantity(row.inTransitMilli)} />
        <Definition label="Quarantine" value={formatQuantity(row.quarantineMilli)} />
      </div>
    </article>
  );
}

function AlertsView() {
  return (
    <div className="cn-inventory-two-col">
      <Panel
        action={<Badge tone="warning">6 cảnh báo</Badge>}
        description="Ưu tiên theo rủi ro bán hàng và độ tin cậy của dữ liệu."
        title="Cảnh báo cần xử lý"
      >
        <div className="cn-inventory-list">
          <InventoryListRow
            badge={<Badge tone="warning">Xem tồn</Badge>}
            description="Sữa hạt óc chó 1L · Khả dụng 2 thùng, mức tối thiểu 4."
            title="Tồn thấp"
          />
          <InventoryListRow
            badge={<Badge tone="warning">Xem lô</Badge>}
            description="Mật ong rừng 500ml · LOT-2405 hết hạn sau 18 ngày."
            title="Lô gần hạn"
          />
          <InventoryListRow
            badge={<Badge tone="danger">Xem serial</Badge>}
            description="AT-BASIC-DEN-M · Một serial đã được giữ ở hai nguồn."
            title="Serial bất thường"
          />
          <InventoryListRow
            badge={<Badge tone="info">Xem tồn</Badge>}
            description="Khăn bông cao cấp · Không phát sinh xuất kho trong 90 ngày."
            title="Di chuyển chậm"
          />
        </div>
      </Panel>
      <Panel description="Cảnh báo không tự điều chỉnh số dư." title="Nguyên tắc xử lý">
        <div className="cn-inventory-notice cn-inventory-notice-warning">
          <AppIcon name="warning" />
          <span>Quarantine tách khỏi khả dụng và không được đưa vào hứa giao.</span>
        </div>
        <div className="cn-inventory-notice cn-inventory-notice-info">
          <AppIcon name="clock" />
          <span>Điều chỉnh hoặc huỷ giữ chỗ cần chứng từ và quyền phù hợp.</span>
        </div>
      </Panel>
    </div>
  );
}

function LotSerialView() {
  return (
    <div className="cn-inventory-two-col">
      <Panel
        action={<span className="cn-inventory-readonly-inline">Chỉ đọc</span>}
        description="Trạng thái truy xuất theo biến thể; không thay đổi số dư trực tiếp tại đây."
        title="Lô và serial cần theo dõi"
      >
        <div className="cn-inventory-list">
          <InventoryListRow
            badge={<Badge tone="warning">Gần hạn</Badge>}
            description="32 chai quarantine · Hết hạn 20/08/2026 · QT-008"
            title="LOT-2405 · Mật ong rừng 500ml"
          />
          <InventoryListRow
            badge={<Badge tone="danger">Bất thường</Badge>}
            description="Đang giữ chỗ ở SO-04221 · Kiểm tra nguồn trước khi xuất."
            title="SN-AT-00482 · Áo thun basic Đen / M"
          />
          <InventoryListRow
            badge={<Badge tone="success">Sẵn sàng</Badge>}
            description="3 thùng khả dụng · HSD 15/10/2026"
            title="LOT-2407 · Sữa hạt óc chó 1L"
          />
        </div>
      </Panel>
      <Panel description="Áp dụng nhất quán ở POS và kho." title="Quy tắc khả dụng">
        <Definition label="Lô quá hạn" value="Không khả dụng" />
        <Definition label="Serial đã giữ chỗ" value="Không phân bổ lại" />
        <Definition label="Đang chuyển" value="Không thể bán" />
      </Panel>
    </div>
  );
}

function ReservationView() {
  return (
    <Panel
      action={<Badge tone="info">864 đơn vị</Badge>}
      description="Giữ chỗ là cam kết giao hàng; số dư được ghi nhận qua chứng từ nguồn."
      title="Giữ chỗ theo nguồn"
    >
      <div className="cn-inventory-list">
        <InventoryListRow
          badge={<Badge tone="info">Đã giữ chỗ</Badge>}
          description="Áo thun cổ tròn basic · Đen / M · 12 cái · Chờ đóng gói"
          title="SO-04221 · Bán tại quầy"
        />
        <InventoryListRow
          badge={<Badge tone="info">Đã giữ chỗ</Badge>}
          description="Sữa hạt óc chó 1L · 1 thùng · Chờ xuất kho"
          title="SO-04218 · Đơn giao hàng"
        />
        <InventoryListRow
          badge={<Badge tone="neutral">Đang chuyển</Badge>}
          description="Áo thun cổ tròn basic · 1 cái · Đang chuyển, không khả dụng"
          title="TO-0086 · Điều chuyển nội bộ"
        />
      </div>
    </Panel>
  );
}

function TraceView() {
  return (
    <Panel
      action={<span className="cn-inventory-readonly-inline">Không chỉnh sửa</span>}
      description="Nhật ký bất biến, chỉ đọc; dùng để kiểm tra lịch sử và chứng từ nguồn."
      title="Truy xuất biến động kho"
    >
      <div className="cn-inventory-trace-filters">
        {['Hôm nay', 'Nguyễn Trãi', 'Kho trung tâm', 'Tất cả biến thể', 'Tất cả lô / serial', 'Tất cả biến động', 'Tất cả chứng từ nguồn'].map(
          (label) => (
            <button className="cn-inventory-filter-button" key={label} type="button">
              <span>{label}</span>
              <AppIcon name="chevronDown" />
            </button>
          ),
        )}
      </div>
      <div className="cn-inventory-trace-table">
        <Table
          columns={[
            { key: 'time', header: 'Thời điểm' },
            { key: 'movement', header: 'Biến động' },
            { key: 'variant', header: 'Biến thể / lô' },
            { key: 'source', header: 'Nguồn chứng từ' },
            { key: 'quantity', header: 'Thay đổi', align: 'right' },
          ]}
          emptyMessage="Không có movement phù hợp với bộ lọc hiện tại."
          getRowKey={(row) => String(row.key)}
          rows={[
            {
              key: 'trace-1',
              time: '14:28 · 02/08',
              movement: 'Xuất kho',
              variant: 'Sữa hạt óc chó 1L · LOT-2407',
              source: 'SO-04218',
              quantity: <span className="num">-1 thùng</span>,
            },
            {
              key: 'trace-2',
              time: '12:42 · 02/08',
              movement: 'Giữ chỗ',
              variant: 'Áo thun basic Đen / M · SN-AT-00482',
              source: 'SO-04221',
              quantity: <span className="num">-12 cái</span>,
            },
            {
              key: 'trace-3',
              time: '10:20 · 02/08',
              movement: 'Cách ly',
              variant: 'Mật ong rừng 500ml · LOT-2405',
              source: 'QT-008',
              quantity: <span className="num">-32 chai</span>,
            },
          ]}
        />
      </div>
    </Panel>
  );
}

function EmptyView() {
  return (
    <Panel>
      <StateBlock
        actionLabel="Tạo chứng từ kho"
        description="Không có số dư kho để hiển thị sau khi áp dụng phạm vi hiện tại."
        onAction={() => undefined}
        title="Chưa có biến thể trong phạm vi này"
        tone="neutral"
      />
      <p className="cn-inventory-state-foot">Hiển thị theo quyền tạo chứng từ kho của bạn.</p>
    </Panel>
  );
}

function RestrictedView() {
  return (
    <Panel>
      <StateBlock
        description="Bạn vẫn có thể xem số lượng, cảnh báo và truy xuất trong kho được phân quyền."
        title="Phạm vi xem tồn kho bị giới hạn"
        tone="restricted"
      />
      <div className="cn-inventory-notice cn-inventory-notice-info cn-inventory-centered-notice">
        <AppIcon name="warning" />
        <span>Các trường giá vốn và giá trị tồn không nằm trong quyền hiện tại nên không được hiển thị.</span>
      </div>
    </Panel>
  );
}

function ScopeChangedView() {
  return (
    <Panel>
      <StateBlock
        actionLabel="Làm mới tồn kho"
        description="Dữ liệu cũ đã được xoá để tránh dùng số dư không đúng phạm vi. Hãy làm mới để tải số dư mới."
        onAction={() => undefined}
        title="Phạm vi kho đã thay đổi"
        tone="info"
      />
    </Panel>
  );
}

function PurchasingReadOnlyWorkspace() {
  return (
    <div className="cn-inventory-shell">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">Kho vận / Mua hàng</p>
          <h1>Mua hàng và tiếp nhận</h1>
          <p>Goods Receipt Approved mới ghi nhận tồn, giá vốn và công nợ.</p>
        </div>
      </header>
      <div className="cn-catalog-grid">
        <Panel
          description="PO không tạo tồn/cost/payable; chỉ Goods Receipt Approved mới ghi ledger."
          title="Purchase orders & goods receipt"
        >
          <InventoryListRow
            badge={<Badge tone="warning">Partially received</Badge>}
            description="24 chai đặt · 16 chai đã nhận."
            title="PO-260726-00031 · Nhà cung cấp An Phú"
          />
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
        <Panel description="Giữ source evidence, lot/serial và settlement rõ." title="Supplier return">
          <InventoryListRow
            badge={<Badge tone="info">Source evidence</Badge>}
            description="Không vượt số lượng receipt nguồn còn được trả."
            title="Reduce payable / Refund / Replacement"
          />
        </Panel>
      </div>
    </div>
  );
}

function InventoryListRow({
  badge,
  description,
  title,
}: {
  badge: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="cn-inventory-list-row">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {badge}
    </div>
  );
}

function Definition({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="cn-inventory-definition">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function alertBadge(alertType: InventoryAlertFilter): ReactNode {
  if (alertType === 'low') return <Badge tone="warning">Tồn thấp</Badge>;
  if (alertType === 'expiry') return <Badge tone="warning">Lô gần hạn</Badge>;
  if (alertType === 'serial') return <Badge tone="danger">Serial bất thường</Badge>;
  if (alertType === 'slow') return <Badge tone="info">Di chuyển chậm</Badge>;
  return <Badge tone="neutral">Ổn định</Badge>;
}

function readInventoryHashView(): InventoryViewId | undefined {
  if (typeof window === 'undefined') return undefined;
  const hash = window.location.hash.replace('#', '');
  return isInventoryViewId(hash) ? hash : undefined;
}

function isInventoryViewId(value: string): value is InventoryViewId {
  return inventoryViewIds.includes(value as InventoryViewId);
}

function isInventoryWorkflowViewId(value: InventoryViewId): value is InventoryWorkflowViewId {
  return inventoryWorkflowViewIds.includes(value as InventoryWorkflowViewId);
}

function getInventoryWorkflowView(viewId: InventoryViewId): InventoryWorkflowDefinition | undefined {
  return isInventoryWorkflowViewId(viewId) ? inventoryWorkflowViews[viewId] : undefined;
}

function inventoryViewTitle(viewId: InventoryViewId): string {
  const workflowView = getInventoryWorkflowView(viewId);
  if (workflowView) return workflowView.title;
  if (viewId === 'alerts') return 'Cảnh báo tồn kho';
  if (viewId === 'lot-serial') return 'Lô & serial';
  if (viewId === 'reservation') return 'Giữ chỗ tồn kho';
  if (viewId === 'trace') return 'Truy xuất biến động';
  if (viewId === 'empty') return 'Tồn kho trống';
  if (viewId === 'restricted') return 'Quyền xem tồn kho';
  if (viewId === 'scope-changed') return 'Phạm vi kho đã thay đổi';
  return 'Tổng quan tồn kho';
}

function inventoryViewBreadcrumb(viewId: InventoryViewId): string {
  return getInventoryWorkflowView(viewId)?.breadcrumb ?? 'Kho vận / Tồn kho';
}

function inventoryViewDescription(viewId: InventoryViewId): string {
  return getInventoryWorkflowView(viewId)?.summary
    ?? 'Kiểm soát số dư khả dụng, cảnh báo và truy xuất theo phạm vi kho hiện tại.';
}

function formatQuantity(quantityMilli: number): string {
  return (quantityMilli / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}
