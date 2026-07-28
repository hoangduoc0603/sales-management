import { describe, expect, it } from 'vitest';
import { createInMemoryOperationsRepository } from '../../../apps-script/src/repositories/operations/operations-repository';
import { createReportingPartitionCoverageResolver } from '../../../apps-script/src/services/reporting/reporting-partition-coverage';

describe('reporting partition coverage', () => {
  it('marks report coverage partial when date range needs archived partition but archive is not included', () => {
    const repository = createRepositoryWithTransactionPartitions();
    const resolveCoverage = createReportingPartitionCoverageResolver({ repository });

    expect(
      resolveCoverage({
        dateRange: { from: '2026-06-15', to: '2026-07-26' },
        includeArchive: false,
      }),
    ).toEqual({
      status: 'Partial',
      activeFrom: '2026-07-01',
      activeTo: '2026-07-26',
      archiveIncluded: false,
      missingArchiveReason: 'Khoảng thời gian yêu cầu có dữ liệu nằm trong partition lưu trữ; cần bật includeArchive hoặc chạy export worker.',
    });
  });

  it('marks report coverage complete when archived partitions are explicitly included', () => {
    const repository = createRepositoryWithTransactionPartitions();
    const resolveCoverage = createReportingPartitionCoverageResolver({ repository });

    expect(
      resolveCoverage({
        dateRange: { from: '2026-06-15', to: '2026-07-26' },
        includeArchive: true,
      }),
    ).toEqual({
      status: 'Complete',
      activeFrom: '2026-06-15',
      activeTo: '2026-07-26',
      archiveIncluded: true,
    });
  });
});

function createRepositoryWithTransactionPartitions() {
  const repository = createInMemoryOperationsRepository();
  repository.savePartition({
    partitionId: 'partition-transaction-1',
    storageRole: 'transaction',
    partitionKey: 'FY2026-P01',
    status: 'Archived',
    activeFrom: '2026-01-01',
    closedAt: '2026-06-30',
    archivedAt: '2026-07-01T00:00:00.000Z',
    capacityPct: 91,
    readOnly: true,
    rowCount: 50_000,
  });
  repository.savePartition({
    partitionId: 'partition-transaction-2',
    storageRole: 'transaction',
    partitionKey: 'FY2026-P02',
    status: 'Active',
    activeFrom: '2026-07-01',
    capacityPct: 12,
    readOnly: false,
    rowCount: 42,
  });
  return repository;
}
