import type { BranchDTO, WarehouseDTO } from '@shared/contracts/platform/administration';
import type { ReportingDashboardResponse } from '@shared/contracts/reporting/reporting';
import type { ReportingRepository } from '../../repositories/reporting/reporting-repository';

export interface DashboardBaselineProjectionInput {
  repository: ReportingRepository;
  tenantId: string;
  branches: readonly BranchDTO[];
  warehouses: readonly WarehouseDTO[];
  now: () => Date;
}

export interface DashboardBaselineProjectionResult {
  dateBucket: string;
  checkedCount: number;
  createdCount: number;
}

export function ensureCurrentDashboardBaselineProjections(
  input: DashboardBaselineProjectionInput,
): DashboardBaselineProjectionResult {
  const now = input.now();
  const dateBucket = now.toISOString().slice(0, 10);
  let checkedCount = 0;
  let createdCount = 0;

  for (const branch of input.branches.filter((candidate) => candidate.status === 'Active')) {
    const activeWarehouses = input.warehouses.filter(
      (warehouse) => warehouse.status === 'Active' && warehouse.branchId === branch.branchId,
    );

    const scopes = [
      { branchId: branch.branchId, warehouseId: undefined },
      ...activeWarehouses.map((warehouse) => ({ branchId: branch.branchId, warehouseId: warehouse.warehouseId })),
    ];

    for (const scope of scopes) {
      checkedCount += 1;
      const existing = input.repository.findDashboardProjection({
        tenantId: input.tenantId,
        branchId: scope.branchId,
        warehouseId: scope.warehouseId,
        dateBucket,
      });
      if (existing !== undefined) continue;

      input.repository.saveDashboardProjection({
        tenantId: input.tenantId,
        branchId: scope.branchId,
        warehouseId: scope.warehouseId,
        dateBucket,
        response: createEmptyDashboardResponse({
          dateBucket,
          nowIso: now.toISOString(),
          branchId: scope.branchId,
          warehouseId: scope.warehouseId,
        }),
      });
      createdCount += 1;
    }
  }

  return { dateBucket, checkedCount, createdCount };
}

function createEmptyDashboardResponse(input: {
  dateBucket: string;
  nowIso: string;
  branchId: string;
  warehouseId?: string;
}): ReportingDashboardResponse {
  return {
    metadata: {
      generatedAt: input.nowIso,
      asOf: input.nowIso,
      partitionCoverage: {
        status: 'Complete',
        activeFrom: input.dateBucket,
        activeTo: input.dateBucket,
        archiveIncluded: false,
      },
      archiveIncluded: false,
    },
    scope: { branchId: input.branchId, warehouseId: input.warehouseId },
    kpis: [
      { kpiId: 'netRevenue', label: 'Doanh thu thuần', valueVnd: 0, trendPct: 0 },
      { kpiId: 'completedOrders', label: 'Đơn hoàn tất', valueCount: 0, statusLabel: 'Đã xác nhận' },
      { kpiId: 'collected', label: 'Đã thu', valueVnd: 0 },
      { kpiId: 'receivableOverdue', label: 'Phải thu / quá hạn', valueVnd: 0, secondaryValueVnd: 0 },
    ],
    revenueSeries: [],
    decisionQueue: [],
    manualOrders: [],
    restricted: { sensitiveFields: [] },
  };
}
