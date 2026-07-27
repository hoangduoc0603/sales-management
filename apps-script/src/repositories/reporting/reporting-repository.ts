import type {
  ReportingDashboardResponse,
  ReportingExportRunDTO,
} from '@shared/contracts/reporting/reporting';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { AppendOnlySheetRecordGateway } from '../platform/sheet-record-repository';

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

export interface SheetReportingRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  transactionPartitionKey: string;
}

export function createSheetReportingRepository(deps: SheetReportingRepositoryDependencies): ReportingRepository {
  const dashboardTable = findTable(deps.tableDefinitions, 'DashboardProjection');
  const reportRowTable = findTable(deps.tableDefinitions, 'ReportRow');
  const exportRunTable = findTable(deps.tableDefinitions, 'ReportingExportRun');

  function readDashboardRows(): ReportingRow[] {
    return deps.gateway
      .readTable({ table: dashboardTable, partitionKey: deps.transactionPartitionKey })
      .map((row) => clone(row) as ReportingRow);
  }

  function readReportRows(): ReportingRow[] {
    return deps.gateway
      .readTable({ table: reportRowTable, partitionKey: deps.transactionPartitionKey })
      .map((row) => clone(row) as ReportingRow);
  }

  function readExportRows(): ReportingRow[] {
    return deps.gateway
      .readTable({ table: exportRunTable, partitionKey: deps.transactionPartitionKey })
      .map((row) => clone(row) as ReportingRow);
  }

  function latestDashboardRows(): ReportingRow[] {
    return latestRowsBy(readDashboardRows(), 'projectionKey');
  }

  function listLatestExportRuns(): ReportingExportRunDTO[] {
    return latestRowsBy(readExportRows(), 'runId').map(exportRunFromRow);
  }

  return {
    saveDashboardProjection(record) {
      const projectionKey = dashboardKey(record);
      const nextVersion =
        readDashboardRows()
          .filter((row) => row.projectionKey === projectionKey)
          .reduce((max, row) => Math.max(max, getRecordVersion(row)), 0) + 1;
      deps.gateway.appendRows({
        table: dashboardTable,
        partitionKey: deps.transactionPartitionKey,
        rows: [
          {
            id: `${projectionKey}:v${nextVersion}`,
            schemaVersion: dashboardTable.schemaVersion,
            recordVersion: nextVersion,
            projectionKey,
            tenantId: record.tenantId,
            branchId: record.branchId,
            warehouseId: record.warehouseId,
            dateBucket: record.dateBucket,
            responseJson: clone(record.response),
          },
        ],
      });
    },
    findDashboardProjection(input) {
      const projectionKey = dashboardKey(input);
      const row = latestDashboardRows().find((candidate) => candidate.projectionKey === projectionKey);
      return row === undefined ? undefined : dashboardFromRow(row);
    },
    saveReportRows(reportId, rows) {
      const nextSetVersion =
        readReportRows()
          .filter((row) => row.reportId === reportId)
          .reduce((max, row) => Math.max(max, getPositiveInteger(row.rowSetVersion)), 0) + 1;
      const sheetRows =
        rows.length === 0
          ? [
              {
                id: `${reportId}:rowSetVersion:s${nextSetVersion}:empty`,
                schemaVersion: reportRowTable.schemaVersion,
                reportId,
                rowSetVersion: nextSetVersion,
                setIsEmpty: true,
              },
            ]
          : rows.map((row, index) => ({
              id: `${reportId}:r${index + 1}:s${nextSetVersion}`,
              schemaVersion: reportRowTable.schemaVersion,
              recordVersion: 1,
              reportId,
              rowIndex: index + 1,
              rowSetVersion: nextSetVersion,
              rowJson: clone(row),
            }));
      deps.gateway.appendRows({ table: reportRowTable, partitionKey: deps.transactionPartitionKey, rows: sheetRows });
    },
    getReportRows(reportId) {
      const rows = readReportRows().filter((row) => row.reportId === reportId);
      const latestSetVersion = rows.reduce((max, row) => Math.max(max, getPositiveInteger(row.rowSetVersion)), 0);
      if (latestSetVersion === 0) return [];
      const latestRows = rows.filter((row) => getPositiveInteger(row.rowSetVersion) === latestSetVersion);
      if (latestRows.some((row) => row.setIsEmpty === true)) return [];
      return latestRows
        .sort((left, right) => getPositiveInteger(left.rowIndex) - getPositiveInteger(right.rowIndex))
        .map((row) => clone((row.rowJson ?? {}) as Record<string, unknown>));
    },
    saveExportRun(run) {
      const nextVersion =
        readExportRows()
          .filter((row) => row.runId === run.runId)
          .reduce((max, row) => Math.max(max, getRecordVersion(row)), 0) + 1;
      deps.gateway.appendRows({
        table: exportRunTable,
        partitionKey: deps.transactionPartitionKey,
        rows: [
          {
            ...exportRunToRow(run),
            id: `${run.runId}:v${nextVersion}`,
            schemaVersion: exportRunTable.schemaVersion,
            recordVersion: nextVersion,
          },
        ],
      });
    },
    getExportRun(runId) {
      return listLatestExportRuns().find((run) => run.runId === runId);
    },
    listExportRuns() {
      return listLatestExportRuns();
    },
  };
}

type ReportingRow = Record<string, unknown>;

function dashboardFromRow(row: ReportingRow): DashboardProjectionRecord {
  return {
    tenantId: String(row.tenantId),
    branchId: String(row.branchId),
    warehouseId: optionalString(row.warehouseId),
    dateBucket: String(row.dateBucket),
    response: clone(row.responseJson as ReportingDashboardResponse),
  };
}

function exportRunToRow(run: ReportingExportRunDTO): ReportingRow {
  const { query, ...row } = clone(run);
  return { ...row, queryJson: query };
}

function exportRunFromRow(row: ReportingRow): ReportingExportRunDTO {
  const run: ReportingExportRunDTO = {
    runId: String(row.runId),
    tenantId: String(row.tenantId),
    requestedBy: String(row.requestedBy),
    status: row.status as ReportingExportRunDTO['status'],
    format: row.format as ReportingExportRunDTO['format'],
    query: clone(row.queryJson as ReportingExportRunDTO['query']),
    requestedAt: String(row.requestedAt),
    routing: row.routing as ReportingExportRunDTO['routing'],
  };
  assignOptionalString(run, 'completedAt', row.completedAt);
  if (row.rowCount !== undefined && row.rowCount !== null && row.rowCount !== '') run.rowCount = Number(row.rowCount);
  assignOptionalString(run, 'fileId', row.fileId);
  return run;
}

function latestRowsBy(rows: readonly ReportingRow[], idField: string): ReportingRow[] {
  const latestById = new Map<string, ReportingRow>();
  for (const row of rows) {
    const recordId = String(row[idField] ?? '');
    if (recordId === '') continue;
    const current = latestById.get(recordId);
    if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) latestById.set(recordId, row);
  }
  return [...latestById.values()];
}

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) throw new Error(`Missing reporting table definition: ${tableName}`);
  return table;
}

function getRecordVersion(row: ReportingRow): number {
  return getPositiveInteger(row.recordVersion) || getVersionFromId(row.id);
}

function getPositiveInteger(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getVersionFromId(value: unknown): number {
  const match = /:v(\d+)/.exec(String(value ?? ''));
  return match === null ? 0 : Number(match[1]);
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

function assignOptionalString<TRecord extends object>(
  record: TRecord,
  key: keyof TRecord & string,
  value: unknown,
): void {
  const text = optionalString(value);
  if (text !== undefined) (record as Record<string, unknown>)[key] = text;
}
