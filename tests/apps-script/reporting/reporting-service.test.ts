import { describe, expect, it } from 'vitest';
import { createInMemoryReportingRepository } from '../../../apps-script/src/repositories/reporting/reporting-repository';
import { createReportingService } from '../../../apps-script/src/services/reporting/reporting-service';
import type { ActorContextDTO } from '../../../shared/contracts/platform/authorization';

describe('ReportingService', () => {
  it('returns approved dashboard projection with metadata for actor scope', () => {
    const { service } = createFixture();

    const dashboard = service.getSalesDashboard({
      actor: actor(),
      request: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        dateRange: { from: '2026-07-26', to: '2026-07-26' },
      },
    });

    expect(dashboard).toMatchObject({
      ok: true,
      data: {
        metadata: {
          generatedAt: '2026-07-27T09:00:00.000Z',
          asOf: '2026-07-27T08:59:30.000Z',
          partitionCoverage: { status: 'Complete', archiveIncluded: false },
          archiveIncluded: false,
        },
        scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
        kpis: [
          { kpiId: 'netRevenue', valueVnd: 286_450_000 },
          { kpiId: 'completedOrders', valueCount: 1284 },
          { kpiId: 'collected', valueVnd: 259_830_000 },
          { kpiId: 'receivableOverdue', valueVnd: 26_620_000 },
        ],
      },
    });
  });

  it('denies dashboard query outside actor branch or warehouse scope', () => {
    const { service } = createFixture();

    expect(
      service.getSalesDashboard({
        actor: actor({ branchIds: ['branch-other'], warehouseIds: ['warehouse-default'] }),
        request: {
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          dateRange: { from: '2026-07-26', to: '2026-07-26' },
        },
      }),
    ).toMatchObject({ ok: false, error: { code: 'SCOPE_DENIED' } });
  });

  it('removes sensitive fields from report rows when actor lacks sensitive permission', () => {
    const { service } = createFixture();

    const report = service.queryReport({
      actor: actor(),
      request: {
        reportId: 'sales-profit',
        dateField: 'completedOrShippedAt',
        dateRange: { from: '2026-07-26', to: '2026-07-26' },
        scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
        dimensions: ['branchId'],
        pageSize: 50,
      },
    });

    expect(report).toMatchObject({
      ok: true,
      data: {
        rows: [{ branchId: 'branch-default', netRevenueVnd: 286_450_000 }],
      },
    });
    if (!report.ok) throw new Error('Expected report success.');
    expect(report.data.rows[0]).not.toHaveProperty('cogsVnd');
    expect(report.data.rows[0]).not.toHaveProperty('grossProfitVnd');
  });

  it('returns partial partition coverage metadata when report query touches archive without including it', () => {
    const { service } = createFixture({
      resolvePartitionCoverage: () => ({
        status: 'Partial',
        activeFrom: '2026-07-01',
        activeTo: '2026-07-26',
        archiveIncluded: false,
        missingArchiveReason: 'Khoảng thời gian yêu cầu có dữ liệu nằm trong partition lưu trữ; cần bật includeArchive hoặc chạy export worker.',
      }),
    });

    const report = service.queryReport({
      actor: actor(),
      request: {
        reportId: 'sales-summary',
        dateField: 'completedOrShippedAt',
        dateRange: { from: '2026-06-15', to: '2026-07-26' },
        scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
        pageSize: 50,
      },
    });

    expect(report).toMatchObject({
      ok: true,
      data: {
        metadata: {
          partitionCoverage: {
            status: 'Partial',
            activeFrom: '2026-07-01',
            activeTo: '2026-07-26',
            archiveIncluded: false,
            missingArchiveReason: 'Khoảng thời gian yêu cầu có dữ liệu nằm trong partition lưu trữ; cần bật includeArchive hoặc chạy export worker.',
          },
          archiveIncluded: false,
        },
        rows: [{ branchId: 'branch-default', netRevenueVnd: 286_450_000 }],
      },
    });
  });

  it('keeps sensitive fields only for actor with sensitive permission', () => {
    const { service } = createFixture();

    const report = service.queryReport({
      actor: actor({ actions: ['reporting.report.view', 'reporting.sensitive.view'] }),
      request: {
        reportId: 'sales-profit',
        dateField: 'completedOrShippedAt',
        dateRange: { from: '2026-07-26', to: '2026-07-26' },
        scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
        pageSize: 50,
      },
    });

    expect(report).toMatchObject({
      ok: true,
      data: {
        rows: [{ branchId: 'branch-default', netRevenueVnd: 286_450_000, cogsVnd: 180_000_000, grossProfitVnd: 106_450_000 }],
      },
    });
  });

  it('routes small export sync and large export to worker without executing query under command lock', () => {
    const { repository, service } = createFixture();
    const small = service.requestExport({
      actor: actor({ actions: ['reporting.export'] }),
      request: {
        commandId: 'cmd-export-small',
        idempotencyKey: 'idem-export-small',
        format: 'CSV',
        query: {
          reportId: 'sales-summary',
          dateField: 'completedOrShippedAt',
          dateRange: { from: '2026-07-26', to: '2026-07-26' },
          scope: { branchId: 'branch-default' },
          pageSize: 50,
        },
      },
    });
    const large = service.requestExport({
      actor: actor({ actions: ['reporting.export'] }),
      request: {
        commandId: 'cmd-export-large',
        idempotencyKey: 'idem-export-large',
        format: 'XLSX',
        query: {
          reportId: 'sales-summary',
          dateField: 'completedOrShippedAt',
          dateRange: { from: '2026-01-01', to: '2026-07-26' },
          scope: { branchId: 'branch-default' },
          pageSize: 500,
        },
      },
    });

    expect(small).toMatchObject({ ok: true, data: { exportRun: { status: 'Completed', routing: 'SmallSync', rowCount: 1 } } });
    expect(large).toMatchObject({ ok: true, data: { exportRun: { status: 'Requested', routing: 'LargeWorker' } } });
    expect(repository.listExportRuns()).toHaveLength(2);
  });

  it('resolves drill-down token only after revalidating current actor scope and sensitive permission', () => {
    const { service } = createFixture();

    const allowed = service.resolveDrillDown({
      actor: actor(),
      request: {
        token: {
          tokenId: 'drill-sales-profit-branch-default',
          reportId: 'sales-profit',
          dateField: 'completedOrShippedAt',
          dateRange: { from: '2026-07-26', to: '2026-07-26' },
          scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
          filters: { kpiId: 'netRevenue' },
          issuedAt: '2026-07-27T08:59:30.000Z',
          asOf: '2026-07-27T08:59:30.000Z',
        },
        pageSize: 50,
      },
    });

    expect(allowed).toMatchObject({
      ok: true,
      data: {
        tokenId: 'drill-sales-profit-branch-default',
        reportId: 'sales-profit',
        rows: [{ branchId: 'branch-default', netRevenueVnd: 286_450_000 }],
      },
    });
    if (!allowed.ok) throw new Error('Expected drill-down success.');
    expect(allowed.data.rows[0]).not.toHaveProperty('grossProfitVnd');

    const denied = service.resolveDrillDown({
      actor: actor({ branchIds: ['branch-other'], warehouseIds: ['warehouse-default'] }),
      request: {
        token: {
          tokenId: 'drill-sales-profit-branch-default',
          reportId: 'sales-profit',
          dateField: 'completedOrShippedAt',
          dateRange: { from: '2026-07-26', to: '2026-07-26' },
          scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
          issuedAt: '2026-07-27T08:59:30.000Z',
          asOf: '2026-07-27T08:59:30.000Z',
        },
        pageSize: 50,
      },
    });

    expect(denied).toMatchObject({ ok: false, error: { code: 'SCOPE_DENIED' } });
  });
});

function createFixture(
  input: Partial<Parameters<typeof createReportingService>[0]> = {},
) {
  const tenantId = 'tenant-default';
  const repository = createInMemoryReportingRepository();
  const service = createReportingService({
    repository,
    tenantId,
    now: () => new Date('2026-07-27T09:00:00.000Z'),
    newId: createSequentialId(),
    ...input,
  });

  repository.saveDashboardProjection({
    tenantId,
    branchId: 'branch-default',
    warehouseId: 'warehouse-default',
    dateBucket: '2026-07-26',
    response: {
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
      revenueSeries: [{ bucket: '18:00', currentNetRevenueVnd: 42_800_000, previousNetRevenueVnd: 38_350_000 }],
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
      restricted: { sensitiveFields: [] },
    },
  });
  repository.saveReportRows('sales-profit', [
    { branchId: 'branch-default', netRevenueVnd: 286_450_000, cogsVnd: 180_000_000, grossProfitVnd: 106_450_000 },
  ]);
  repository.saveReportRows('sales-summary', [
    { branchId: 'branch-default', netRevenueVnd: 286_450_000 },
  ]);

  return { repository, service };
}

function actor(input: { actions?: readonly string[]; branchIds?: readonly string[]; warehouseIds?: readonly string[] } = {}): ActorContextDTO {
  return {
    userId: 'user-manager',
    loginId: 'manager',
    displayName: 'Quản lý',
    tenantId: 'tenant-default',
    authVersion: 1,
    actions: input.actions ?? ['reporting.dashboard.view', 'reporting.report.view', 'reporting.export'],
    scope: {
      tenantId: 'tenant-default',
      branchIds: input.branchIds ?? ['branch-default'],
      warehouseIds: input.warehouseIds ?? ['warehouse-default'],
    },
  };
}

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
