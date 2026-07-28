import type {
  ReportingDateRangeDTO,
  ReportingPartitionCoverageDTO,
} from '@shared/contracts/reporting/reporting';
import type { OperationsRepository } from '../../repositories/operations/operations-repository';
import { selectPartitionsForDateRange } from '../operations/archive-worker';

export interface ReportingPartitionCoverageInput {
  dateRange: ReportingDateRangeDTO;
  includeArchive?: boolean;
}

export type ReportingPartitionCoverageResolver = (
  input: ReportingPartitionCoverageInput,
) => ReportingPartitionCoverageDTO;

export function createReportingPartitionCoverageResolver(deps: {
  repository: Pick<OperationsRepository, 'listPartitions'>;
}): ReportingPartitionCoverageResolver {
  return (input) => {
    const partitions = selectPartitionsForDateRange(deps.repository.listPartitions(), {
      storageRole: 'transaction',
      from: input.dateRange.from,
      to: input.dateRange.to,
    });
    const archivedPartitions = partitions.filter((partition) => partition.status === 'Archived');
    const nonArchivedPartitions = partitions.filter((partition) => partition.status !== 'Archived');
    const includeArchive = input.includeArchive === true;

    if (archivedPartitions.length > 0 && !includeArchive) {
      return {
        status: 'Partial',
        activeFrom: earliestCoveredDate(nonArchivedPartitions, input.dateRange.from, input.dateRange.to),
        activeTo: input.dateRange.to,
        archiveIncluded: false,
        missingArchiveReason:
          'Khoảng thời gian yêu cầu có dữ liệu nằm trong partition lưu trữ; cần bật includeArchive hoặc chạy export worker.',
      };
    }

    return {
      status: 'Complete',
      activeFrom: input.dateRange.from,
      activeTo: input.dateRange.to,
      archiveIncluded: includeArchive && archivedPartitions.length > 0,
    };
  };
}

function earliestCoveredDate(
  partitions: readonly { activeFrom: string }[],
  requestedFrom: string,
  fallback: string,
): string {
  if (partitions.length === 0) return fallback;
  return partitions
    .map((partition) => (partition.activeFrom > requestedFrom ? partition.activeFrom : requestedFrom))
    .sort()[0];
}
