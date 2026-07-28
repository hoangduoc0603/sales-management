import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { ReportingDashboardResponse } from '@shared/contracts/reporting/reporting';
import { DashboardHome } from '../../web/src/features/dashboard/dashboard-home';
import { SalesManagementApp } from '../../web/src/app/sales-management-app';

const scope: CurrentScopeResponse = {
  tenant: {
    tenantId: 'tenant-default',
    displayName: 'Công ty Cenio Retail',
    status: 'Active',
    timezone: 'Asia/Ho_Chi_Minh',
    activeConfigVersionId: 'config-default',
  },
  branches: [
    {
      branchId: 'branch-default',
      tenantId: 'tenant-default',
      branchCode: 'BR-DEFAULT',
      name: 'Chi nhánh mặc định',
      status: 'Active',
    },
  ],
  warehouses: [
    {
      warehouseId: 'warehouse-default',
      tenantId: 'tenant-default',
      branchId: 'branch-default',
      warehouseCode: 'WH-DEFAULT',
      name: 'Kho mặc định',
      status: 'Active',
      directSaleEnabled: true,
      negativeStockPolicy: 'Block',
      lotTrackingDefault: false,
      serialTrackingDefault: false,
    },
  ],
  activeBranchId: 'branch-default',
  activeWarehouseId: 'warehouse-default',
};

const actor: ActorContextDTO = {
  userId: 'user-admin',
  loginId: 'admin',
  displayName: 'Admin Local',
  tenantId: 'tenant-default',
  authVersion: 1,
  actions: [],
  scope: {
    tenantId: 'tenant-default',
    branchIds: ['branch-default'],
    warehouseIds: ['warehouse-default'],
  },
};

describe('SalesManagementApp', () => {
  it('khởi đầu ở login nội bộ khi chưa có session', () => {
    const html = renderToStaticMarkup(createElement(SalesManagementApp, { initialSessionToken: undefined }));

    expect(html).toContain('Đăng nhập nội bộ');
  });

  it('DashboardHome có đúng 4 KPI chính theo handoff', () => {
    const html = renderToStaticMarkup(
      createElement(DashboardHome, {
        initialDashboard: dashboardResponse,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
      }),
    );

    expect(html).toContain('Doanh thu thuần');
    expect(html).toContain('Đơn hoàn tất');
    expect(html).toContain('Đã thu');
    expect(html).toContain('Phải thu / quá hạn');
    expect(html).toContain('286.450.000');
    expect(html).toContain('1.284');
    expect(html).not.toContain('cn-kpi-card netRevenue lead');
    expect(html).not.toContain('Dữ liệu sẵn sàng');
    expect(html).not.toContain('Phủ dữ liệu');
    expect(html).toContain('Giá vốn &amp; lợi nhuận bị hạn chế');
    expect(html).not.toContain('Dashboard projection chưa triển khai');
    expect(html).not.toContain('Hoạt động gần đây');
  });

  it('authenticated app có thể render route Catalog/CRM khi được chọn trong AppShell', () => {
    const html = renderToStaticMarkup(
      createElement(SalesManagementApp, {
        initialActor: actor,
        initialScope: scope,
        initialSessionToken: 'session-token',
      }),
    );

    expect(html).toContain('Hàng hóa');
    expect(html).toContain('Khách hàng');
  });

  it('route POS render trong AppShell chung, không thay bằng full-screen POS header riêng', () => {
    const html = renderToStaticMarkup(
      createElement(SalesManagementApp, {
        initialActor: actor,
        initialRoute: 'pos',
        initialScope: scope,
        initialSessionToken: 'session-token',
      }),
    );

    expect(html).toContain('cn-app-shell');
    expect(html).toContain('cn-sidebar');
    expect(html).toContain('Tổng quan');
    expect(html).toContain('Bán hàng');
    expect(html).toContain('POS tại quầy');
    expect(html).toContain('cn-pos-page cn-pos-page-embedded');
    expect(html).not.toContain('cn-pos-header');
    expect(html).not.toContain('Ca POS đang mở');
    expect(html).not.toContain('Dữ liệu quầy sẵn sàng');
  });
});

const dashboardResponse: ReportingDashboardResponse = {
  metadata: {
    generatedAt: '2026-07-27T09:00:00.000Z',
    asOf: '2026-07-27T08:59:30.000Z',
    partitionCoverage: {
      status: 'Complete',
      activeFrom: '2026-07-26',
      activeTo: '2026-07-26',
      archiveIncluded: false,
    },
    archiveIncluded: false,
  },
  scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
  kpis: [
    { kpiId: 'netRevenue', label: 'Doanh thu thuần', valueVnd: 286_450_000, trendPct: 11.6 },
    { kpiId: 'completedOrders', label: 'Đơn hoàn tất', valueCount: 1284 },
    { kpiId: 'collected', label: 'Đã thu', valueVnd: 259_830_000 },
    { kpiId: 'receivableOverdue', label: 'Phải thu / quá hạn', valueVnd: 26_620_000 },
  ],
  revenueSeries: [
    { bucket: '08h', currentNetRevenueVnd: 5_200_000, previousNetRevenueVnd: 7_000_000 },
    { bucket: '11h', currentNetRevenueVnd: 16_800_000, previousNetRevenueVnd: 14_400_000 },
    { bucket: '14h', currentNetRevenueVnd: 27_500_000, previousNetRevenueVnd: 25_000_000 },
    { bucket: '18h', currentNetRevenueVnd: 42_800_000, previousNetRevenueVnd: 38_350_000 },
  ],
  decisionQueue: [
    {
      itemId: 'decision-low-stock-1',
      itemType: 'LowStock',
      title: 'Tồn thấp: Sữa hạt óc chó 1L',
      description: 'Còn 4 thùng, dưới ngưỡng tối thiểu 12.',
      priority: 'High',
      actionLabel: 'Xử lý',
    },
  ],
  manualOrders: [
    {
      orderId: 'SO-260726-01842',
      source: 'Phone',
      customerName: 'Trần Thị Hồng Nhung',
      ageMinutes: 18,
      status: 'PendingConfirmation',
      valueVnd: 2_680_000,
    },
  ],
  restricted: {
    sensitiveFields: ['grossProfitVnd'],
    reason: 'Vai trò hiện tại không có quyền xem dữ liệu nhạy cảm.',
  },
};
