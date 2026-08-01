import type { ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type {
  DashboardDecisionItemDTO,
  DashboardKpiDTO,
  DashboardManualOrderDTO,
  DashboardRevenuePointDTO,
  ReportingDashboardResponse,
} from '@shared/contracts/reporting/reporting';
import { Badge, type BadgeTone } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { AppIcon, type AppIconName } from '../../components/ui/icons';
import { Listbox } from '../../components/ui/listbox';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import { Tabs } from '../../components/ui/tabs';
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

type LoadStatus = 'idle' | 'loading' | 'ready' | 'not-ready' | 'error';
type DateRangePreset = 'today' | 'yesterday' | 'last7';

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
  const [selectedStateId, setSelectedStateId] = useState('loading');
  const today = useMemo(() => formatISODate(new Date()), []);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('today');
  const dateRange = useMemo(() => resolveDateRange(dateRangePreset, today), [dateRangePreset, today]);
  const dateRangeOptions = useMemo(
    () => [
      { value: 'today', label: `Hôm nay · ${formatShortDate(dateRange.today)}` },
      { value: 'yesterday', label: `Hôm qua · ${formatShortDate(dateRange.yesterday)}` },
      { value: 'last7', label: '7 ngày gần nhất' },
    ],
    [dateRange.today, dateRange.yesterday],
  );

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
        dateRange: { from: dateRange.from, to: dateRange.to },
        requestedSensitiveFields: ['cogsVnd', 'grossProfitVnd', 'grossMarginPct'],
      },
    });

    if (!result.ok) {
      setStatus(result.error.code === 'DASHBOARD_NOT_READY' ? 'not-ready' : 'error');
      setErrorMessage(result.error.message);
      return;
    }

    setDashboard(result.data);
    setStatus('ready');
  }, [apiClient, dateRange.from, dateRange.to, selectedBranchId, selectedWarehouseId, sessionToken]);

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
          {dashboard ? (
            <p className="cn-dashboard-metadata">
              Hiệu lực: chứng từ đã ghi nhận · Cập nhật lúc{' '}
              <span className="num">{formatDateTime(dashboard.metadata.generatedAt)}</span>
            </p>
          ) : null}
        </div>
        <div className="cn-dashboard-actions">
          <Listbox
            className="cn-dashboard-date-range"
            label="Khoảng thời gian"
            onChange={(value) => setDateRangePreset(value as DateRangePreset)}
            options={dateRangeOptions}
            value={dateRangePreset}
          />
          <Button isLoading={status === 'loading'} onClick={handleRefresh} variant="primary">
            <AppIcon name="refresh" />
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
      ) : status === 'not-ready' ? (
        <StateBlock
          actionLabel="Tải lại"
          description="Hệ thống đã đăng nhập và xác định phạm vi, nhưng DashboardProjection cho phạm vi/ngày này chưa được tạo. Bạn vẫn có thể dùng các màn nghiệp vụ khác."
          detail={errorMessage}
          onAction={handleRefresh}
          title="Dashboard chưa có dữ liệu tổng hợp"
          tone="warning"
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
              <KpiCard key={kpi.kpiId} kpi={kpi} kpis={dashboard.kpis} />
            ))}
          </section>

          <div className="cn-dashboard-grid cn-dashboard-primary-grid">
            <Panel action={<Button variant="ghost">Mở báo cáo</Button>} description="So sánh kỳ đang xem với kỳ trước" title="Doanh thu theo thời gian">
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

          <Panel
            className="cn-state-panel"
            description="Mẫu phụ trợ cho loading, phạm vi, dữ liệu cũ, lưu trữ và phân quyền"
            title="Trạng thái dữ liệu & phục hồi"
          >
            <Tabs
              items={dashboardStateTabs(branch?.name ?? 'Chi nhánh hiện tại', warehouse?.name ?? 'Kho hiện tại')}
              onChange={setSelectedStateId}
              selectedId={selectedStateId}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

function KpiCard({ kpi, kpis }: { kpi: DashboardKpiDTO; kpis: readonly DashboardKpiDTO[] }) {
  const value = kpi.valueVnd !== undefined ? formatVnd(kpi.valueVnd) : formatKpiCount(kpi);
  const meta = kpiMeta(kpi, kpis);

  return (
    <article className={`cn-kpi-card ${kpi.kpiId}`}>
      <div className="cn-kpi-row">
        <div>
          <div className="cn-kpi-label">{kpi.label}</div>
          <div className="cn-kpi-value num">{kpi.restricted ? 'Không có quyền' : value}</div>
        </div>
        <span aria-hidden="true" className={`cn-kpi-icon ${kpi.kpiId}`}>
          <AppIcon name={kpiIcon(kpi.kpiId)} />
        </span>
      </div>
      <div className="cn-kpi-foot">
        <Badge className="cn-trend-badge" tone={meta.tone}>
          <AppIcon name={meta.icon} />
          {meta.badge}
        </Badge>
        <span>{meta.description}</span>
      </div>
      <button className="cn-kpi-link" type="button">
        {meta.actionLabel}
        <AppIcon name="chevronRight" />
      </button>
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
            <AppIcon name={decisionIcon(item.itemType)} />
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
    <div className="cn-manual-orders-region">
      <div className="cn-table-wrap">
        <table className="cn-table cn-manual-orders-table">
          <thead>
            <tr>
              <th>Đơn</th>
              <th>Khách hàng</th>
              <th className="right">Giá trị</th>
              <th>Trạng thái</th>
              <th>Tuổi / SLA</th>
              <th>Nguồn nhập tay</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderId}>
                <td>
                  <span className="cn-cell-main num">{order.orderId}</span>
                </td>
                <ManualOrderCustomerCell order={order} />
                <td className="right">
                  <span className="cn-cell-main num">{formatVnd(order.valueVnd)}</span>
                </td>
                <td>
                  <ManualOrderStatusPill status={order.status} />
                </td>
                <td>
                  <span className="cn-cell-main num">{order.ageMinutes} phút</span>
                  <span className="cn-cell-sub">{formatManualOrderSla(order.ageMinutes, order.slaTargetMinutes)}</span>
                </td>
                <td>
                  <span className="cn-cell-main">{manualOrderSource(order.source)}</span>
                </td>
                <td>
                  <Button variant="ghost">Xử lý</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cn-table-contract">
        {orders.length} đơn hợp lệ trong hàng đợi · Mục tiêu xác nhận trong 15 phút.
      </div>
    </div>
  );
}

function ManualOrderCustomerCell({ order }: { order: DashboardManualOrderDTO }) {
  const nameRef = useRef<HTMLSpanElement>(null);
  const [hasTooltip, setHasTooltip] = useState(false);

  useLayoutEffect(() => {
    const element = nameRef.current;
    if (!element) return undefined;

    const measure = () => {
      const style = getComputedStyle(element);
      const lineHeight = parseFloat(style.lineHeight) || 18;
      const nextHasTooltip =
        element.getBoundingClientRect().height > lineHeight * 1.45 ||
        element.scrollWidth > element.clientWidth ||
        element.scrollHeight > element.clientHeight + 1;

      setHasTooltip((current) => (current === nextHasTooltip ? current : nextHasTooltip));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.parentElement) {
      observer.observe(element.parentElement);
    }
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [order.customerName]);

  return (
    <td
      className="cn-customer-cell"
      data-has-tooltip={hasTooltip ? 'true' : undefined}
      data-tooltip={hasTooltip ? order.customerName : undefined}
      tabIndex={hasTooltip ? 0 : undefined}
    >
      <span className="cn-cell-main" ref={nameRef}>{order.customerName}</span>
      {order.customerSubtitle ? <span className="cn-cell-sub">{order.customerSubtitle}</span> : null}
    </td>
  );
}

function ManualOrderStatusPill({ status }: { status: DashboardManualOrderDTO['status'] }) {
  const tone = manualOrderStatusTone(status);

  return (
    <span className={`cn-status cn-status-${tone}`}>
      <AppIcon name={manualOrderStatusIcon(status)} />
      {manualOrderStatus(status)}
    </span>
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

function DashboardState({
  actionLabel,
  detail,
  description,
  icon,
  title,
  tone = 'info',
}: {
  actionLabel?: string;
  detail?: ReactNode;
  description: string;
  icon: AppIconName;
  title: string;
  tone?: BadgeTone | 'restricted';
}) {
  return (
    <div className="cn-dashboard-state-content">
      <span aria-hidden="true" className={`cn-dashboard-state-icon ${tone}`}>
        <AppIcon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {detail ? <div className="cn-dashboard-state-detail">{detail}</div> : null}
      {actionLabel ? (
        <Button variant={tone === 'danger' ? 'secondary' : 'ghost'}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}

function dashboardStateTabs(branchName: string, warehouseName: string) {
  return [
    {
      id: 'loading',
      label: 'Đang tải',
      content: (
        <div className="cn-dashboard-state-content">
          <DashboardSkeleton />
        </div>
      ),
    },
    {
      id: 'empty',
      label: 'Không có dữ liệu',
      content: (
        <DashboardState
          actionLabel="Đặt lại khoảng thời gian"
          description="Không có chứng từ hợp lệ trong kỳ đang xem. Có thể đổi kỳ, chọn lại phạm vi hoặc quay về hôm nay."
          icon="box"
          title="Không có dữ liệu vận hành"
          tone="neutral"
        />
      ),
    },
    {
      id: 'error',
      label: 'Lỗi có thể thử lại',
      content: (
        <DashboardState
          actionLabel="Thử lại"
          description="Kết nối dữ liệu bị gián đoạn. Đây là trạng thái đọc dữ liệu, không tạo command ghi hoặc đồng bộ offline."
          icon="refresh"
          title="Chưa tải được DashboardProjection"
          tone="danger"
        />
      ),
    },
    {
      id: 'scope',
      label: 'Phạm vi không có dữ liệu',
      content: (
        <DashboardState
          actionLabel="Chọn lại phạm vi"
          description="Backend không trả dữ liệu cho phạm vi này. UI không fallback sang dữ liệu tenant-wide và không giữ dữ liệu cũ."
          detail={`${branchName} · ${warehouseName}`}
          icon="warning"
          title="Không có dữ liệu cho phạm vi đang chọn"
          tone="warning"
        />
      ),
    },
    {
      id: 'stale',
      label: 'Dữ liệu cũ',
      content: (
        <DashboardState
          actionLabel="Làm mới"
          description="Dữ liệu đang hiển thị có as-of cũ hơn kỳ vọng. Người dùng cần thấy rõ thời điểm dữ liệu trước khi ra quyết định."
          detail="Giữ nguyên bộ lọc hiện tại khi thử lại."
          icon="clock"
          title="Dữ liệu cần làm mới"
          tone="warning"
        />
      ),
    },
    {
      id: 'archive',
      label: 'Chưa có dữ liệu lưu trữ',
      content: (
        <DashboardState
          actionLabel="Tải dữ liệu lưu trữ"
          description="Kỳ báo cáo có phần dữ liệu trong archive nhưng partition lưu trữ chưa sẵn sàng, nên coverage phải hiển thị là một phần."
          detail="Không trình bày kết quả một phần như báo cáo đầy đủ."
          icon="reports"
          title="Archive chưa sẵn sàng"
          tone="info"
        />
      ),
    },
    {
      id: 'processing',
      label: 'Đang xử lý',
      content: (
        <DashboardState
          description="Command đang chạy phải giữ nguyên nhãn nút, chỉ thêm loading icon và chặn submit trùng theo commandId/idempotency."
          icon="refresh"
          title="Tác vụ đang xử lý"
          tone="info"
        />
      ),
    },
    {
      id: 'restricted',
      label: 'Không có quyền',
      content: (
        <DashboardState
          description="Dữ liệu giá vốn, lợi nhuận hoặc field nhạy cảm phải bị loại ở backend projection; UI chỉ render trạng thái restricted backend trả về."
          icon="warning"
          title="Dữ liệu nhạy cảm bị hạn chế"
          tone="restricted"
        />
      ),
    },
  ];
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

function formatKpiCount(kpi: DashboardKpiDTO): string {
  const count = formatCount(kpi.valueCount ?? 0);
  return kpi.kpiId === 'completedOrders' ? `${count} đơn` : count;
}

function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatShortVnd(value: number): string {
  return `${Math.round(value / 1_000_000)}tr`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  const time = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
  const day = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
  }).format(date);

  return `${time}, ${day}`;
}

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatShortDate(value: string): string {
  const [, , month, day] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  return day && month ? `${day}/${month}` : value;
}

function resolveDateRange(preset: DateRangePreset, today: string): { from: string; to: string; today: string; yesterday: string } {
  const todayDate = new Date(`${today}T00:00:00+07:00`);
  const yesterdayDate = addDays(todayDate, -1);
  const last7Start = addDays(todayDate, -6);
  const yesterday = formatISODate(yesterdayDate);

  if (preset === 'yesterday') {
    return { from: yesterday, to: yesterday, today, yesterday };
  }

  if (preset === 'last7') {
    return { from: formatISODate(last7Start), to: today, today, yesterday };
  }

  return { from: today, to: today, today, yesterday };
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function kpiMeta(kpi: DashboardKpiDTO, kpis: readonly DashboardKpiDTO[]): {
  actionLabel: string;
  badge: string;
  description: string;
  icon: AppIconName;
  tone: BadgeTone;
} {
  switch (kpi.kpiId) {
    case 'netRevenue':
      return {
        actionLabel: 'Xem doanh thu',
        badge: kpi.trendPct !== undefined ? formatPercent(kpi.trendPct) : 'Đang theo dõi',
        description: 'so với kỳ trước',
        icon: 'check',
        tone: kpi.trendPct !== undefined && kpi.trendPct < 0 ? 'danger' : 'success',
      };
    case 'completedOrders':
      return {
        actionLabel: 'Xem đơn hoàn tất',
        badge: kpi.statusLabel ?? 'Đã xác nhận',
        description: 'POS + đơn nhập tay',
        icon: 'check',
        tone: 'info',
      };
    case 'collected': {
      const netRevenue = kpis.find((candidate) => candidate.kpiId === 'netRevenue')?.valueVnd;
      const ratio = netRevenue && kpi.valueVnd !== undefined ? `${formatPercent((kpi.valueVnd / netRevenue) * 100).replace('+', '')}` : 'Đã ghi nhận';

      return {
        actionLabel: 'Đối chiếu thu tiền',
        badge: ratio,
        description: 'trên doanh thu thuần',
        icon: 'check',
        tone: 'success',
      };
    }
    case 'receivableOverdue':
      return {
        actionLabel: 'Xem tuổi nợ',
        badge: kpi.secondaryValueVnd !== undefined ? `${formatVnd(kpi.secondaryValueVnd)} quá hạn` : 'Cần theo dõi',
        description: 'cần theo dõi hôm nay',
        icon: 'warning',
        tone: kpi.secondaryValueVnd !== undefined ? 'danger' : 'warning',
      };
  }
}

function kpiIcon(kpiId: DashboardKpiDTO['kpiId']): AppIconName {
  switch (kpiId) {
    case 'netRevenue':
      return 'trendUp';
    case 'completedOrders':
      return 'orders';
    case 'collected':
      return 'wallet';
    case 'receivableOverdue':
      return 'clock';
  }
}

function decisionIcon(itemType: DashboardDecisionItemDTO['itemType']): AppIconName {
  switch (itemType) {
    case 'LowStock':
      return 'box';
    case 'ExpiringLot':
      return 'clock';
    case 'ManualOrderSla':
      return 'fileAlert';
    case 'ShiftVariance':
      return 'warning';
    case 'OverdueReceivable':
      return 'currency';
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

function manualOrderStatusTone(status: DashboardManualOrderDTO['status']): BadgeTone {
  switch (status) {
    case 'PendingConfirmation':
      return 'warning';
    case 'Picking':
      return 'info';
    case 'NeedStock':
      return 'danger';
  }
}

function manualOrderStatusIcon(status: DashboardManualOrderDTO['status']): AppIconName {
  switch (status) {
    case 'PendingConfirmation':
      return 'warning';
    case 'Picking':
      return 'box';
    case 'NeedStock':
      return 'warning';
  }
}

function formatManualOrderSla(ageMinutes: number, slaTargetMinutes = 15): string {
  const slaMinutes = slaTargetMinutes;
  if (ageMinutes > slaMinutes) {
    return `quá SLA ${ageMinutes - slaMinutes} phút`;
  }
  return `còn ${slaMinutes - ageMinutes} phút SLA`;
}
