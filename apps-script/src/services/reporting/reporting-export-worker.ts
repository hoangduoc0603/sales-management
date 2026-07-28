import type { ReportingExportRunDTO } from '@shared/contracts/reporting/reporting';
import type { ReportingRepository } from '../../repositories/reporting/reporting-repository';

export interface ReportingExportWorkerDependencies {
  repository: Pick<ReportingRepository, 'listExportRuns' | 'getReportRows' | 'saveExportRun'>;
  now: () => Date;
  newFileId(run: ReportingExportRunDTO): string;
  maxRuns: number;
}

export interface ReportingExportWorkerResult {
  completedCount: number;
  failedCount: number;
  checkpointKey?: string;
}

export function runReportingExportChunk(deps: ReportingExportWorkerDependencies): ReportingExportWorkerResult {
  const requestedRuns = deps.repository
    .listExportRuns()
    .filter((run) => run.routing === 'LargeWorker')
    .filter((run) => run.status === 'Requested' || run.status === 'Running')
    .slice(0, deps.maxRuns);
  let completedCount = 0;
  let checkpointKey: string | undefined;

  for (const run of requestedRuns) {
    const rows = deps.repository.getReportRows(run.query.reportId);
    deps.repository.saveExportRun({
      ...run,
      status: 'Completed',
      completedAt: deps.now().toISOString(),
      rowCount: rows.length,
      fileId: run.fileId ?? deps.newFileId(run),
    });
    completedCount += 1;
    checkpointKey = run.runId;
  }

  return {
    completedCount,
    failedCount: 0,
    checkpointKey,
  };
}
