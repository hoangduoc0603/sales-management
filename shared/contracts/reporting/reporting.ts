export type ReportingDateField = 'createdAt' | 'completedOrShippedAt' | 'deliveredAt' | 'paidAt' | 'effectiveAt';
export type ReportingSensitiveField = 'cogsVnd' | 'grossProfitVnd' | 'grossMarginPct';
export type ReportingExportFormat = 'CSV' | 'XLSX';
export type ReportingExportStatus = 'Requested' | 'Running' | 'Completed' | 'Failed' | 'Expired';

export interface ReportingDateRangeDTO {
  from: string;
  to: string;
}

export interface ReportingScopeDTO {
  branchId: string;
  warehouseId?: string;
}

export interface ReportingPartitionCoverageDTO {
  status: 'Complete' | 'Partial';
  activeFrom: string;
  activeTo: string;
  archiveIncluded: boolean;
  missingArchiveReason?: string;
}

export interface ReportingMetadataDTO {
  generatedAt: string;
  asOf: string;
  partitionCoverage: ReportingPartitionCoverageDTO;
  archiveIncluded: boolean;
}

export interface ReportingDashboardRequest {
  branchId: string;
  warehouseId?: string;
  dateRange: ReportingDateRangeDTO;
  requestedSensitiveFields?: readonly ReportingSensitiveField[];
}

export interface DashboardKpiDTO {
  kpiId: 'netRevenue' | 'completedOrders' | 'collected' | 'receivableOverdue';
  label: string;
  valueVnd?: number;
  valueCount?: number;
  trendPct?: number;
  restricted?: boolean;
}

export interface DashboardRevenuePointDTO {
  bucket: string;
  currentNetRevenueVnd: number;
  previousNetRevenueVnd: number;
}

export interface DashboardDecisionItemDTO {
  itemId: string;
  itemType: 'LowStock' | 'ExpiringLot' | 'ManualOrderSla' | 'ShiftVariance' | 'OverdueReceivable';
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  actionLabel: string;
}

export interface DashboardManualOrderDTO {
  orderId: string;
  source: 'Phone' | 'CustomerMessage' | 'Preorder' | 'StaffCreated';
  customerName: string;
  ageMinutes: number;
  status: 'PendingConfirmation' | 'Picking' | 'NeedStock';
  valueVnd: number;
}

export interface ReportingDashboardResponse {
  metadata: ReportingMetadataDTO;
  scope: ReportingScopeDTO;
  kpis: readonly DashboardKpiDTO[];
  revenueSeries: readonly DashboardRevenuePointDTO[];
  decisionQueue: readonly DashboardDecisionItemDTO[];
  manualOrders: readonly DashboardManualOrderDTO[];
  restricted: {
    sensitiveFields: readonly ReportingSensitiveField[];
    reason?: string;
  };
}

export interface ReportingReportQueryRequest {
  reportId: string;
  dateField: ReportingDateField;
  dateRange: ReportingDateRangeDTO;
  scope: ReportingScopeDTO;
  filters?: Record<string, unknown>;
  dimensions?: readonly string[];
  cursor?: string;
  pageSize: number;
}

export interface ReportingReportQueryResponse {
  metadata: ReportingMetadataDTO;
  reportId: string;
  rows: readonly Record<string, unknown>[];
  nextCursor?: string;
}

export interface ReportingCommandBase {
  commandId: string;
  idempotencyKey: string;
}

export interface ReportingExportRequest extends ReportingCommandBase {
  query: ReportingReportQueryRequest;
  format: ReportingExportFormat;
}

export interface ReportingExportStatusRequest {
  runId: string;
}

export interface ReportingExportRunDTO {
  runId: string;
  tenantId: string;
  requestedBy: string;
  status: ReportingExportStatus;
  format: ReportingExportFormat;
  query: ReportingReportQueryRequest;
  requestedAt: string;
  completedAt?: string;
  rowCount?: number;
  fileId?: string;
  routing: 'SmallSync' | 'LargeWorker';
}

export interface ReportingExportResponse {
  exportRun: ReportingExportRunDTO;
}
