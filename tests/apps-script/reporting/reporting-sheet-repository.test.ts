import { describe, expect, it } from 'vitest';
import type { ReportingExportRunDTO } from '../../../shared/contracts/reporting/reporting';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import {
  createSheetReportingRepository,
  type DashboardProjectionRecord,
} from '../../../apps-script/src/repositories/reporting/reporting-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed ReportingRepository', () => {
  it('persists dashboard projections, report rows and export runs through SheetGateway', () => {
    const gateway = new FakeSheetGateway({
      ReportingExportRun: [
        { ...toExportRow(exportRunFixture), id: 'export-1:v1', schemaVersion: 1, recordVersion: 1, status: 'Requested' },
        { ...toExportRow(completedExportRunFixture), id: 'export-1:v2', schemaVersion: 1, recordVersion: 2 },
      ],
    });
    const repository = createSheetReportingRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      transactionPartitionKey: 'FY2026-P01',
    });

    repository.saveDashboardProjection(dashboardProjectionFixture);
    repository.saveReportRows('sales-summary', [{ branchId: 'branch-default', netRevenueVnd: 100000 }]);
    repository.saveReportRows('sales-summary', []);
    repository.saveExportRun(newExportRunFixture);

    expect(
      repository.findDashboardProjection({
        tenantId: 'tenant-default',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        dateBucket: '2026-07-27',
      }),
    ).toEqual(dashboardProjectionFixture);
    expect(repository.getReportRows('sales-summary')).toEqual([]);
    expect(repository.getExportRun('export-1')).toEqual(completedExportRunFixture);
    expect(repository.listExportRuns()).toEqual([completedExportRunFixture, newExportRunFixture]);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey, request.rows.length])).toEqual([
      ['DashboardProjection', 'FY2026-P01', 1],
      ['ReportRow', 'FY2026-P01', 1],
      ['ReportRow', 'FY2026-P01', 1],
      ['ReportingExportRun', 'FY2026-P01', 1],
    ]);
    expect(gateway.appendRequests.find((request) => request.tableName === 'DashboardProjection')?.rows[0]).toMatchObject({
      id: 'tenant-default|branch-default|warehouse-default|2026-07-27:v1',
      tenantId: 'tenant-default',
      schemaVersion: 1,
      recordVersion: 1,
      responseJson: dashboardProjectionFixture.response,
    });
    expect(gateway.appendRequests.filter((request) => request.tableName === 'ReportRow')[1]?.rows[0]).toMatchObject({
      id: 'sales-summary:rowSetVersion:s2:empty',
      reportId: 'sales-summary',
      rowSetVersion: 2,
      setIsEmpty: true,
    });
  });
});

const dashboardProjectionFixture: DashboardProjectionRecord = {
  tenantId: 'tenant-default',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  dateBucket: '2026-07-27',
  response: {
    metadata: {
      generatedAt: '2026-07-27T08:00:00.000Z',
      asOf: '2026-07-27T08:00:00.000Z',
      partitionCoverage: {
        status: 'Complete',
        activeFrom: '2026-07-01',
        activeTo: '2026-07-31',
        archiveIncluded: false,
      },
      archiveIncluded: false,
    },
    scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
    kpis: [{ kpiId: 'netRevenue', label: 'Doanh thu thuần', valueVnd: 100000 }],
    revenueSeries: [{ bucket: '08:00', currentNetRevenueVnd: 100000, previousNetRevenueVnd: 80000 }],
    decisionQueue: [],
    manualOrders: [],
    restricted: { sensitiveFields: [] },
  },
};

const exportRunFixture: ReportingExportRunDTO = {
  runId: 'export-1',
  tenantId: 'tenant-default',
  requestedBy: 'manager-1',
  status: 'Requested',
  format: 'CSV',
  query: {
    reportId: 'sales-summary',
    dateField: 'completedOrShippedAt',
    dateRange: { from: '2026-07-27', to: '2026-07-27' },
    scope: { branchId: 'branch-default' },
    pageSize: 50,
  },
  requestedAt: '2026-07-27T08:00:00.000Z',
  routing: 'SmallSync',
};

const completedExportRunFixture: ReportingExportRunDTO = {
  ...exportRunFixture,
  status: 'Completed',
  completedAt: '2026-07-27T08:01:00.000Z',
  rowCount: 12,
  fileId: 'drive-file-1',
};

const newExportRunFixture: ReportingExportRunDTO = {
  ...exportRunFixture,
  runId: 'export-2',
  requestedAt: '2026-07-27T09:00:00.000Z',
};

function toExportRow(run: ReportingExportRunDTO): Record<string, unknown> {
  const { query, ...row } = run;
  return { ...row, queryJson: query };
}

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  constructor(seed: Record<string, Record<string, unknown>[]> = {}) {
    for (const [tableName, rows] of Object.entries(seed)) {
      this.rowsByTable.set(tableName, rows.map(clone));
    }
  }

  readTable(request: { table: TableDefinitionDTO }): Record<string, unknown>[] {
    return this.getRows(request.table.tableName).map(clone);
  }

  appendRows(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    rows: readonly Record<string, unknown>[];
  }): { appendedRowCount: number } {
    const rows = request.rows.map(clone);
    this.appendRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey, rows });
    this.getRows(request.table.tableName).push(...rows);
    return { appendedRowCount: rows.length };
  }

  private getRows(tableName: string): Record<string, unknown>[] {
    let rows = this.rowsByTable.get(tableName);
    if (rows === undefined) {
      rows = [];
      this.rowsByTable.set(tableName, rows);
    }
    return rows;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
