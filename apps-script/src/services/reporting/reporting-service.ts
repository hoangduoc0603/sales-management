import type { ApiErrorCode } from '@shared/contracts/errors';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type {
  ReportingDashboardRequest,
  ReportingDashboardResponse,
  ReportingDrillDownRequest,
  ReportingDrillDownResponse,
  ReportingExportRequest,
  ReportingExportResponse,
  ReportingExportRunDTO,
  ReportingExportStatusRequest,
  ReportingPartitionCoverageDTO,
  ReportingReportQueryRequest,
  ReportingReportQueryResponse,
} from '@shared/contracts/reporting/reporting';
import type { ReportingRepository } from '../../repositories/reporting/reporting-repository';
import type { ReportingPartitionCoverageResolver } from './reporting-partition-coverage';

type ReportingServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string } };

export interface ReportingService {
  getSalesDashboard(input: { actor: ActorContextDTO; request: ReportingDashboardRequest }): ReportingServiceResult<ReportingDashboardResponse>;
  queryReport(input: { actor: ActorContextDTO; request: ReportingReportQueryRequest }): ReportingServiceResult<ReportingReportQueryResponse>;
  resolveDrillDown(input: { actor: ActorContextDTO; request: ReportingDrillDownRequest }): ReportingServiceResult<ReportingDrillDownResponse>;
  requestExport(input: { actor: ActorContextDTO; request: ReportingExportRequest }): ReportingServiceResult<ReportingExportResponse>;
  getExportRun(input: { actor: ActorContextDTO; request: ReportingExportStatusRequest }): ReportingServiceResult<ReportingExportResponse>;
}

export interface ReportingServiceDependencies {
  repository: ReportingRepository;
  tenantId: string;
  now: () => Date;
  newId(prefix: string): string;
  resolvePartitionCoverage?: ReportingPartitionCoverageResolver;
}

const sensitiveKeys = new Set(['cogsVnd', 'grossProfitVnd', 'grossMarginPct']);

export function createReportingService(deps: ReportingServiceDependencies): ReportingService {
  return {
    getSalesDashboard(input) {
      const scopeError = requireScope(input.actor, {
        branchId: input.request.branchId,
        warehouseId: input.request.warehouseId,
      });
      if (scopeError !== undefined) return scopeError;

      const projection = deps.repository.findDashboardProjection({
        tenantId: deps.tenantId,
        branchId: input.request.branchId,
        warehouseId: input.request.warehouseId,
        dateBucket: input.request.dateRange.to,
      });
      if (projection === undefined) {
        return failure('INVALID_INPUT', 'Dashboard projection chưa sẵn sàng cho phạm vi này.');
      }

      const hasSensitivePermission = input.actor.actions.includes('reporting.sensitive.view');
      const requestedSensitiveFields = input.request.requestedSensitiveFields ?? [];
      return {
        ok: true,
        data: {
          ...projection.response,
          restricted: hasSensitivePermission
            ? { sensitiveFields: [] }
            : {
                sensitiveFields: requestedSensitiveFields,
                reason: requestedSensitiveFields.length > 0 ? 'Vai trò hiện tại không có quyền xem dữ liệu nhạy cảm.' : undefined,
              },
        },
      };
    },
    queryReport(input) {
      const scopeError = requireScope(input.actor, input.request.scope);
      if (scopeError !== undefined) return scopeError;

      const canViewSensitive = input.actor.actions.includes('reporting.sensitive.view');
      const rows = deps.repository
        .getReportRows(input.request.reportId)
        .slice(0, input.request.pageSize)
        .map((row) => sanitizeReportRow(row, canViewSensitive));

      return {
        ok: true,
        data: {
          metadata: metadataFor(
            input.request.dateRange.to,
            deps.now().toISOString(),
            deps.resolvePartitionCoverage?.({
              dateRange: input.request.dateRange,
              includeArchive: input.request.includeArchive ?? false,
            }),
          ),
          reportId: input.request.reportId,
          rows,
        },
      };
    },
    resolveDrillDown(input) {
      const scopeError = requireScope(input.actor, input.request.token.scope);
      if (scopeError !== undefined) return scopeError;

      const canViewSensitive = input.actor.actions.includes('reporting.sensitive.view');
      const rows = deps.repository
        .getReportRows(input.request.token.reportId)
        .slice(0, input.request.pageSize)
        .map((row) => sanitizeReportRow(row, canViewSensitive));

      return {
        ok: true,
        data: {
          metadata: metadataFor(input.request.token.dateRange.to, input.request.token.asOf),
          tokenId: input.request.token.tokenId,
          reportId: input.request.token.reportId,
          rows,
        },
      };
    },
    requestExport(input) {
      const scopeError = requireScope(input.actor, input.request.query.scope);
      if (scopeError !== undefined) return scopeError;

      const rows = deps.repository.getReportRows(input.request.query.reportId);
      const routing = rows.length > 100 || input.request.query.pageSize > 100 ? 'LargeWorker' : 'SmallSync';
      const run: ReportingExportRunDTO = {
        runId: deps.newId('export-run'),
        tenantId: deps.tenantId,
        requestedBy: input.actor.userId,
        status: routing === 'SmallSync' ? 'Completed' : 'Requested',
        format: input.request.format,
        query: input.request.query,
        requestedAt: deps.now().toISOString(),
        completedAt: routing === 'SmallSync' ? deps.now().toISOString() : undefined,
        rowCount: routing === 'SmallSync' ? rows.length : undefined,
        fileId: routing === 'SmallSync' ? deps.newId('export-file') : undefined,
        routing,
      };
      deps.repository.saveExportRun(run);
      return { ok: true, data: { exportRun: run } };
    },
    getExportRun(input) {
      const run = deps.repository.getExportRun(input.request.runId);
      if (run === undefined) return failure('INVALID_INPUT', 'Không tìm thấy export run.');
      const scopeError = requireScope(input.actor, run.query.scope);
      if (scopeError !== undefined) return scopeError;
      if (run.requestedBy !== input.actor.userId && !input.actor.actions.includes('reporting.export')) {
        return failure('PERMISSION_DENIED', 'Bạn không có quyền xem export run này.');
      }

      return { ok: true, data: { exportRun: run } };
    },
  };
}

function requireScope(
  actor: ActorContextDTO,
  scope: { branchId: string; warehouseId?: string },
): ReportingServiceResult<never> | undefined {
  if (!actor.scope.branchIds.includes(scope.branchId)) {
    return failure('SCOPE_DENIED', 'Bạn không có quyền xem chi nhánh này.');
  }
  if (scope.warehouseId !== undefined && !actor.scope.warehouseIds.includes(scope.warehouseId)) {
    return failure('SCOPE_DENIED', 'Bạn không có quyền xem kho này.');
  }

  return undefined;
}

function sanitizeReportRow(row: Record<string, unknown>, canViewSensitive: boolean): Record<string, unknown> {
  if (canViewSensitive) return { ...row };

  return Object.fromEntries(Object.entries(row).filter(([key]) => !sensitiveKeys.has(key)));
}

function metadataFor(
  dateBucket: string,
  nowIso: string,
  partitionCoverage: ReportingPartitionCoverageDTO = {
    status: 'Complete',
    activeFrom: dateBucket,
    activeTo: dateBucket,
    archiveIncluded: false,
  },
) {
  return {
    generatedAt: nowIso,
    asOf: nowIso,
    partitionCoverage,
    archiveIncluded: partitionCoverage.archiveIncluded,
  };
}

function failure<T>(code: ApiErrorCode, message: string): ReportingServiceResult<T> {
  return { ok: false, error: { code, message } };
}
