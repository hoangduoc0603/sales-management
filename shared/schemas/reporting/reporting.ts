import { z } from 'zod';
import type {
  ReportingDashboardRequest,
  ReportingDrillDownRequest,
  ReportingExportRequest,
  ReportingExportStatusRequest,
  ReportingReportQueryRequest,
} from '@shared/contracts/reporting/reporting';

const nonEmptyTrimmed = z.string().trim().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().datetime({ offset: true });

const dateRangeSchema = z
  .object({
    from: isoDate,
    to: isoDate,
  })
  .strict()
  .refine((value) => value.from <= value.to, {
    message: 'Date range from must be before or equal to to.',
    path: ['to'],
  });

const reportingScopeSchema = z
  .object({
    branchId: nonEmptyTrimmed,
    warehouseId: nonEmptyTrimmed.optional(),
  })
  .strict();

const reportQuerySchema = z
  .object({
    reportId: nonEmptyTrimmed,
    dateField: z.enum(['createdAt', 'completedOrShippedAt', 'deliveredAt', 'paidAt', 'effectiveAt']),
    dateRange: dateRangeSchema,
    scope: reportingScopeSchema,
    includeArchive: z.boolean().default(false),
    filters: z.record(z.string(), z.unknown()).optional(),
    dimensions: z.array(nonEmptyTrimmed).default([]),
    cursor: nonEmptyTrimmed.optional(),
    pageSize: z.number().int().min(1).max(500),
  })
  .strict();

export const reportingDashboardRequestSchema = z
  .object({
    branchId: nonEmptyTrimmed,
    warehouseId: nonEmptyTrimmed.optional(),
    dateRange: dateRangeSchema,
    requestedSensitiveFields: z.array(z.enum(['cogsVnd', 'grossProfitVnd', 'grossMarginPct'])).default([]),
  })
  .strict();

export function parseReportingDashboardRequest(value: unknown): ReportingDashboardRequest {
  return reportingDashboardRequestSchema.parse(value);
}

export function parseReportingReportQueryRequest(value: unknown): ReportingReportQueryRequest {
  return reportQuerySchema.parse(value);
}

export const reportingDrillDownRequestSchema = z
  .object({
    token: z
      .object({
        tokenId: nonEmptyTrimmed,
        reportId: nonEmptyTrimmed,
        dateField: z.enum(['createdAt', 'completedOrShippedAt', 'deliveredAt', 'paidAt', 'effectiveAt']),
        dateRange: dateRangeSchema,
        scope: reportingScopeSchema,
        filters: z.record(z.string(), z.unknown()).optional(),
        issuedAt: isoDateTime,
        asOf: isoDateTime,
      })
      .strict(),
    cursor: nonEmptyTrimmed.optional(),
    pageSize: z.number().int().min(1).max(500),
  })
  .strict();

export function parseReportingDrillDownRequest(value: unknown): ReportingDrillDownRequest {
  return reportingDrillDownRequestSchema.parse(value);
}

export const reportingExportRequestSchema = z
  .object({
    commandId: nonEmptyTrimmed,
    idempotencyKey: nonEmptyTrimmed,
    query: reportQuerySchema,
    format: z.enum(['CSV', 'XLSX']),
  })
  .strict();

export function parseReportingExportRequest(value: unknown): ReportingExportRequest {
  return reportingExportRequestSchema.parse(value);
}

export const reportingExportStatusRequestSchema = z
  .object({
    runId: nonEmptyTrimmed,
  })
  .strict();

export function parseReportingExportStatusRequest(value: unknown): ReportingExportStatusRequest {
  return reportingExportStatusRequestSchema.parse(value);
}
