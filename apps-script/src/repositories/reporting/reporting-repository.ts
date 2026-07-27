import type {
  ReportingDashboardResponse,
  ReportingExportRunDTO,
} from '@shared/contracts/reporting/reporting';

export interface DashboardProjectionRecord {
  tenantId: string;
  branchId: string;
  warehouseId?: string;
  dateBucket: string;
  response: ReportingDashboardResponse;
}

export interface ReportingRepository {
  saveDashboardProjection(record: DashboardProjectionRecord): void;
  findDashboardProjection(input: { tenantId: string; branchId: string; warehouseId?: string; dateBucket: string }): DashboardProjectionRecord | undefined;
  saveReportRows(reportId: string, rows: readonly Record<string, unknown>[]): void;
  getReportRows(reportId: string): readonly Record<string, unknown>[];
  saveExportRun(run: ReportingExportRunDTO): void;
  getExportRun(runId: string): ReportingExportRunDTO | undefined;
  listExportRuns(): ReportingExportRunDTO[];
}

export function createInMemoryReportingRepository(): ReportingRepository {
  const dashboardProjections = new Map<string, DashboardProjectionRecord>();
  const reportRows = new Map<string, Record<string, unknown>[]>();
  const exportRuns = new Map<string, ReportingExportRunDTO>();

  return {
    saveDashboardProjection(record) {
      dashboardProjections.set(dashboardKey(record), clone(record));
    },
    findDashboardProjection(input) {
      return cloneOptional(dashboardProjections.get(dashboardKey(input)));
    },
    saveReportRows(reportId, rows) {
      reportRows.set(reportId, rows.map(clone));
    },
    getReportRows(reportId) {
      return (reportRows.get(reportId) ?? []).map(clone);
    },
    saveExportRun(run) {
      exportRuns.set(run.runId, clone(run));
    },
    getExportRun(runId) {
      return cloneOptional(exportRuns.get(runId));
    },
    listExportRuns() {
      return [...exportRuns.values()].map(clone);
    },
  };
}

function dashboardKey(input: { tenantId: string; branchId: string; warehouseId?: string; dateBucket: string }): string {
  return [input.tenantId, input.branchId, input.warehouseId ?? '', input.dateBucket].join('|');
}

function cloneOptional<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : clone(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
