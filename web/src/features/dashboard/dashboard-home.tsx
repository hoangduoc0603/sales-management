import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type {
  DashboardDecisionItemDTO,
  DashboardKpiDTO,
  DashboardManualOrderDTO,
  DashboardRevenuePointDTO,
  ReportingDashboardResponse,
} from '@shared/contracts/reporting/reporting';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import type { ApiClient } from '../../lib/api/client';

export interface DashboardHomeProps {
  scope: CurrentScopeResponse;
  selectedBranchId: string;
  selectedWarehouseId: string;
  apiClient?: ApiClient;
  sessionToken?: string;
  initialDashboard?: ReportingDashboardResponse;
  onRefresh?: () => void;
}

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export function DashboardHome({
  apiClient,
  initialDashboard,
  onRefresh,
  scope,
  selectedBranchId,
  selectedWarehouseId,
  sessionToken,
}: DashboardHomeProps) {
  const branch = scope.branches.find((candidate) => candidate.branchId === selectedBranchId);
  const warehouse = scope.warehouses.find((candidate) => candidate.warehouseId === selectedWarehouseId);
  const [dashboard, setDashboard] = useState<ReportingDashboardResponse | undefined>(initialDashboard);
  const [status, setStatus] = useState<LoadStatus>(initialDashboard ? 'ready' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string>();
  const today = useMemo(() => formatISODate(new Date()), []);

  const loadDashboard = useCallback(async () => {
    if (!apiClient || !sessionToken) {
      return;
    }

    setDashboard(undefined);
    setStatus('loading');
    setErrorMessage(undefined);

    const result = await apiClient.invoke<ReportingDashboardResponse>({
      operation: 'reporting.dashboard.get',
      requestId: `web-dashboard-${Date.now()}`,
      sessionToken,
      payload: {
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        dateRange: { from: today, to: today },
        requestedSensitiveFields: ['cogsVnd', 'grossProfitVnd', 'grossMarginPct'],
      },
    });

    if (!result.ok) {
      setStatus('error');
      setErrorMessage(result.error.message);
      return;
    }

    setDashboard(result.data);
    setStatus('ready');
  }, [apiClient, selectedBranchId, selectedWarehouseId, sessionToken, today]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = useCallback(() => {
    onRefresh?.();
    void loadDashboard();
  }, [loadDashboard, onRefresh]);

  const hasValidScope = Boolean(branch && warehouse && warehouse.branchId === selectedBranchId);

  return (
    <div className="cn-dashboard">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">Sales / Tổng quan vận hành</p>
          <h1>Tổng quan vận hành</h1>
          <p>Scope hiện tại: {branch?.name ?? 'Chưa có chi nhánh hợp lệ'} · {warehouse?.name ?? 'Chưa có kho hợp lệ'}</p>
          {dashboard ? (
            <p className="cn-dashboard-metadata">
              Cập nhật lúc {formatDateTime(dashboard.metadata.generatedAt)} · Số liệu chốt đến{' '}
              {formatDateTime(dashboard.metadata.asOf)} · Phủ dữ liệu{' '}
              {formatCoverage(dashboard.metadata.partitionCoverage.activeFrom, dashboard.metadata.partitionCoverage.activeTo)}
              {dashboard.metadata.archiveIncluded ? ' · gồm dữ liệu lưu trữ' : ''}
              {dashboard.metadata.partitionCoverage.status === 'Partial' ? ' · dữ liệu một phần' : ''}
            </p>
          ) : null}
        </div>
        <div className="cn-dashboard-actions">
          <Badge tone={status === 'error' ? 'danger' : status === 'loading' ? 'info' : 'success'}>
            {status === 'error' ? 'Cần thử lại' : status === 'loading' ? 'Đang tải' : 'Dữ liệu sẵn sàng'}
          </Badge>
          <Button isLoading={status === 'loading'} onClick={handleRefresh} variant="primary">
            Làm mới
          </Button>
        </div>
      </header>

      {!hasValidScope ? (
        <StateBlock
          actionLabel="Chọn lại phạm vi"
          description="Chi nhánh hoặc Kho hiện tại không hợp lệ với phạm vi đang xem. UI không giữ dữ liệu cũ hoặc fallback sang dữ liệu rộng hơn."
          title="Không có dữ liệu cho phạm vi đang chọn"
          tone="warning"
        />
      ) : status === 'error' ? (
        <StateBlock
          actionLabel="Thử lại"
          description="Kết nối dữ liệu bị gián đoạn. Những vùng khác vẫn có thể tiếp tục sử dụng."
          detail={errorMessage}
          onAction={handleRefresh}
          title="Chưa tải được Dashboard"
          tone="danger"
        />
      ) : !dashboard ? (
        <StateBlock
          description="Đang tải DashboardProjection theo Branch, Warehouse, as-of và quyền truy cập của phiên hiện tại."
          detail={<DashboardSkeleton />}
          title="Đang tải tổng quan vận hành"
          tone="info"
        />
      ) : (
        <>
          <section className="cn-kpi-grid" aria-label="KPI chính">
            {normalizeKpis(dashboard.kpis).map((kpi) => (
              <KpiCard key={kpi.kpiId} kpi={kpi} />
            ))}
          </section>

          <div className="cn-dashboard-grid">
            <Panel
              action={<Button variant="ghost">Mở báo cáo</Button>}
              description="Doanh thu thuần theo thời gian so với kỳ trước"
              title="Xu hướng doanh thu"
            >
              <RevenueTrend series={dashboard.revenueSeries} totalNetRevenueVnd={readKpiValue(dashboard.kpis, 'netRevenue')} />
            </Panel>
            <Panel
              description="Ưu tiên theo tác động, tuổi việc và hạn xử lý"
              title="Việc cần quyết định"
              action={<Badge tone={dashboard.decisionQueue.length > 0 ? 'warning' : 'neutral'}>{dashboard.decisionQueue.length} cần xử lý</Badge>}
            >
              <DecisionQueue items={dashboard.decisionQueue} />
            </Panel>
          </div>

          <div className="cn-dashboard-grid">
            <Panel
              action={<Button variant="ghost">Mở hàng đợi</Button>}
              description="Chỉ gồm đơn hợp lệ đang chờ thao tác; không bao gồm nháp, từ chối hoặc đã hủy"
              title="Đơn nhập tay cần xử lý"
            >
              <ManualOrdersTable orders={dashboard.manualOrders} />
            </Panel>
            <Panel description="Việc quan trọng nhưng không cạnh tranh với quyết định ưu tiên" title="Theo dõi thứ cấp">
              <SecondaryFollowUp dashboard={dashboard} />
            </Panel>
          </div>

          <Panel description="Mẫu trạng thái runtime theo handoff Dashboard" title="Trạng thái dữ liệu & phục hồi">
            <div className="cn-state-grid">
              <StateBlock
                description="Skeleton giữ vùng nội dung ổn định trong lúc tải projection."
                detail={<DashboardSkeleton />}
                title="Đang tải"
                tone="info"
              />
              <StateBlock
                description="Không có chứng từ phù hợp trong kỳ đang xem. Người dùng có thể đổi kỳ hoặc quay về hôm nay."
                title="Không có dữ liệu"
                tone="neutral"
              />
              <StateBlock
                description="Kết nối bị gián đoạn, có thể thử lại mà không tạo command ghi."
                title="Lỗi có thể thử lại"
                tone="danger"
              />
              <StateBlock
                description="Không hiển thị số liệu nhạy cảm khi backend trả danh sách field bị hạn chế."
                title="Không có quyền"
                tone="restricted"
              />
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: DashboardKpiDTO }) {
  const value = kpi.valueVnd !== undefined ? formatVnd(kpi.valueVnd) : formatCount(kpi.valueCount ?? 0);
  return (
    <article className={`cn-kpi-card ${kpi.kpiId === 'netRevenue' ? 'lead' : ''}`}>
      <div className="cn-kpi-row">
        <div>
          <div className="cn-kpi-label">{kpi.label}</div>
          <div className="cn-kpi-value num">{kpi.restricted ? 'Không có quyền' : value}</div>
        </div>
        <span aria-hidden="true" className={`cn-kpi-icon ${kpi.kpiId}`}>
          {kpiIcon(kpi.kpiId)}
        </span>
      </div>
      <p>
        {kpi.trendPct !== undefined ? (
          <Badge tone={kpi.trendPct >= 0 ? 'success' : 'danger'}>
            {kpi.trendPct >= 0 ? '✓ ' : '↓ '}
            {formatPercent(kpi.trendPct)}
          </Badge>
        ) : (
          kpiDescription(kpi.kpiId)
        )}
      </p>
    </article>
  );
}

function RevenueTrend({
  series,
  totalNetRevenueVnd,
}: {
  series: readonly DashboardRevenuePointDTO[];
  totalNetRevenueVnd: number;
}) {
  if (series.length === 0) {
    return (
      <StateBlock
        description="Không có điểm dữ liệu doanh thu phù hợp với phạm vi và kỳ đang chọn."
        title="Chưa có dữ liệu xu hướng"
        tone="neutral"
      />
    );
  }

  const maxValue = Math.max(...series.flatMap((point) => [point.currentNetRevenueVnd, point.previousNetRevenueVnd]), 1);
  const width = 640;
  const height = 220;
  const chartTop = 18;
  const chartBottom = 184;
  const chartLeft = 46;
  const chartRight = 620;
  const plotHeight = chartBottom - chartTop;
  const xStep = series.length > 1 ? (chartRight - chartLeft) / (series.length - 1) : 0;
  const toX = (index: number) => chartLeft + index * xStep;
  const toY = (value: number) => chartBottom - (value / maxValue) * plotHeight;
  const currentPoints = series.map((point, index) => `${toX(index).toFixed(1)},${toY(point.currentNetRevenueVnd).toFixed(1)}`).join(' ');
  const previousPoints = series.map((point, index) => `${toX(index).toFixed(1)},${toY(point.previousNetRevenueVnd).toFixed(1)}`).join(' ');
  const peak = series.reduce((best, point) =>
    point.currentNetRevenueVnd > best.currentNetRevenueVnd ? point : best,
  );
  const peakDelta =
    peak.previousNetRevenueVnd === 0
      ? undefined
      : ((peak.currentNetRevenueVnd - peak.previousNetRevenueVnd) / peak.previousNetRevenueVnd) * 100;

  return (
    <div>
      <div className="cn-chart-summary">
        <div>
          <strong className="num">{formatVnd(totalNetRevenueVnd)}</strong>
          <p>
            Đỉnh doanh thu {peak.bucket} · {formatVnd(peak.currentNetRevenueVnd)}
            {peakDelta !== undefined ? ` · ${formatPercent(peakDelta)} so với kỳ trước` : ''}
          </p>
        </div>
        <div className="cn-chart-legend" aria-label="Chú thích biểu đồ">
          <span><i className="current" /> Kỳ hiện tại</span>
          <span><i className="previous" /> Kỳ trước</span>
        </div>
      </div>
      <div className="cn-chart-wrap">
        <svg aria-label="Biểu đồ doanh thu theo thời gian" className="cn-revenue-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartBottom - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line className="grid" x1={chartLeft} x2={chartRight} y1={y} y2={y} />
                <text x="8" y={y + 4}>{formatShortVnd(maxValue * ratio)}</text>
              </g>
            );
          })}
          <polyline className="previous" points={previousPoints} />
          <polyline className="current" points={currentPoints} />
          {series.map((point, index) => (
            <g key={point.bucket}>
              <circle className="point" cx={toX(index)} cy={toY(point.currentNetRevenueVnd)} r="4" />
              <text textAnchor="middle" x={toX(index)} y={204}>{point.bucket}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function DecisionQueue({ items }: { items: readonly DashboardDecisionItemDTO[] }) {
  if (items.length === 0) {
    return (
      <StateBlock
        description="Không có tồn thấp, đơn quá SLA, chênh ca hoặc công nợ cần ưu tiên trong phạm vi hiện tại."
        title="Không có việc cần quyết định"
        tone="neutral"
      />
    );
  }

  return (
    <div className="cn-decision-list">
      {items.map((item) => (
        <article className="cn-decision-item" key={item.itemId}>
          <span aria-hidden="true" className={`cn-decision-icon ${priorityTone(item.priority)}`}>
            {decisionIcon(item.itemType)}
          </span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <small>{decisionMeta(item)}</small>
          </div>
          <Button variant="ghost">{item.actionLabel}</Button>
        </article>
      ))}
    </div>
  );
}

function ManualOrdersTable({ orders }: { orders: readonly DashboardManualOrderDTO[] }) {
  if (orders.length === 0) {
    return (
      <StateBlock
        description="Không có đơn nhập tay hợp lệ đang chờ thao tác trong kỳ đang xem."
        title="Không có đơn cần xử lý"
        tone="neutral"
      />
    );
  }

  return (
    <div className="cn-table-wrap">
      <table className="cn-table">
        <thead>
          <tr>
            <th>Đơn</th>
            <th>Nguồn nhập tay</th>
            <th>Khách hàng</th>
            <th>Tuổi đơn</th>
            <th>Trạng thái</th>
            <th className="right">Giá trị</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderId}>
              <td className="num">{order.orderId}</td>
              <td>{manualOrderSource(order.source)}</td>
              <td>{order.customerName}</td>
              <td className="num">{order.ageMinutes} phút</td>
              <td>
                <Badge tone={order.status === 'NeedStock' ? 'danger' : order.status === 'Picking' ? 'info' : 'warning'}>
                  {manualOrderStatus(order.status)}
                </Badge>
              </td>
              <td className="right num">{formatVnd(order.valueVnd)}</td>
              <td>
                <Button variant="ghost">Xử lý</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SecondaryFollowUp({ dashboard }: { dashboard: ReportingDashboardResponse }) {
  return (
    <div className="cn-secondary-followup">
      <div className="cn-followup-item">
        <strong>{dashboard.manualOrders.length} đơn nhập tay trong hàng đợi</strong>
        <span>Ưu tiên xử lý theo SLA xác nhận và trạng thái tồn kho.</span>
      </div>
      <div className="cn-followup-item">
        <strong>{dashboard.decisionQueue.filter((item) => item.itemType === 'ShiftVariance').length} chênh lệch ca cần đối soát</strong>
        <span>Chỉ hiển thị khi backend trả hàng việc trong phạm vi được phép.</span>
      </div>
      {dashboard.restricted.sensitiveFields.length > 0 ? (
        <div className="cn-restricted-box">
          <strong>Giá vốn &amp; lợi nhuận bị hạn chế</strong>
          <span>{dashboard.restricted.reason ?? 'Vai trò hiện tại không có quyền truy cập số liệu nhạy cảm.'}</span>
        </div>
      ) : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="cn-skeleton" aria-label="Đang tải dữ liệu Dashboard">
      <div className="cn-skeleton-line" />
      <div className="cn-skeleton-line" />
      <div className="cn-skeleton-line" />
    </div>
  );
}

function normalizeKpis(kpis: readonly DashboardKpiDTO[]): DashboardKpiDTO[] {
  const byId = new Map(kpis.map((kpi) => [kpi.kpiId, kpi]));
  return (['netRevenue', 'completedOrders', 'collected', 'receivableOverdue'] as const).map((kpiId) => {
    const fallbackLabel =
      kpiId === 'netRevenue'
        ? 'Doanh thu thuần'
        : kpiId === 'completedOrders'
          ? 'Đơn hoàn tất'
          : kpiId === 'collected'
            ? 'Đã thu'
            : 'Phải thu / quá hạn';
    return byId.get(kpiId) ?? { kpiId, label: fallbackLabel, valueCount: 0 };
  });
}

function readKpiValue(kpis: readonly DashboardKpiDTO[], kpiId: DashboardKpiDTO['kpiId']): number {
  const kpi = kpis.find((candidate) => candidate.kpiId === kpiId);
  return kpi?.valueVnd ?? kpi?.valueCount ?? 0;
}

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatShortVnd(value: number): string {
  return `${Math.round(value / 1_000_000)}tr`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
  }).format(new Date(value));
}

function formatCoverage(activeFrom: string, activeTo: string): string {
  return activeFrom === activeTo ? activeTo : `${activeFrom}–${activeTo}`;
}

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function kpiDescription(kpiId: DashboardKpiDTO['kpiId']): string {
  switch (kpiId) {
    case 'completedOrders':
      return 'Đã xác nhận POS, cửa hàng và đơn nhập tay';
    case 'collected':
      return 'Theo thanh toán đã ghi nhận';
    case 'receivableOverdue':
      return 'Theo công nợ phải thu và quá hạn';
    case 'netRevenue':
      return 'So với cùng kỳ trước';
  }
}

function kpiIcon(kpiId: DashboardKpiDTO['kpiId']): string {
  switch (kpiId) {
    case 'netRevenue':
      return '↗';
    case 'completedOrders':
      return '▣';
    case 'collected':
      return '▤';
    case 'receivableOverdue':
      return '◷';
  }
}

function decisionIcon(itemType: DashboardDecisionItemDTO['itemType']): string {
  switch (itemType) {
    case 'LowStock':
      return '▧';
    case 'ExpiringLot':
      return '◷';
    case 'ManualOrderSla':
      return '▤';
    case 'ShiftVariance':
      return '△';
    case 'OverdueReceivable':
      return '₫';
  }
}

function decisionMeta(item: DashboardDecisionItemDTO): string {
  switch (item.itemType) {
    case 'LowStock':
    case 'ExpiringLot':
      return 'Hàng hóa · giữ nguyên scope Warehouse khi drill-down';
    case 'ManualOrderSla':
      return 'Đơn bán hàng · hàng đợi xử lý';
    case 'ShiftVariance':
      return 'Quầy POS · đối soát ca';
    case 'OverdueReceivable':
      return 'Công nợ phải thu · theo dõi hôm nay';
  }
}

function priorityTone(priority: DashboardDecisionItemDTO['priority']): string {
  return priority === 'High' ? 'danger' : priority === 'Medium' ? 'warning' : 'info';
}

function manualOrderSource(source: DashboardManualOrderDTO['source']): string {
  switch (source) {
    case 'Phone':
      return 'Điện thoại';
    case 'CustomerMessage':
      return 'Tin nhắn khách hàng';
    case 'Preorder':
      return 'Khách đặt trước';
    case 'StaffCreated':
      return 'Nhân viên tạo';
  }
}

function manualOrderStatus(status: DashboardManualOrderDTO['status']): string {
  switch (status) {
    case 'PendingConfirmation':
      return 'Chờ xác nhận';
    case 'Picking':
      return 'Chờ soạn hàng';
    case 'NeedStock':
      return 'Cần bổ sung tồn';
  }
}
