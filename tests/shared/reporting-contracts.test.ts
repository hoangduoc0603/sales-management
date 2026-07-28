import { describe, expect, it } from 'vitest';
import { operationNames } from '../../shared/contracts/platform/operations';
import {
  parseReportingDashboardRequest,
  parseReportingDrillDownRequest,
  parseReportingExportRequest,
  parseReportingReportQueryRequest,
} from '../../shared/schemas/reporting/reporting';

describe('reporting shared contracts', () => {
  it('registers reporting operations', () => {
    expect(operationNames).toEqual(
      expect.arrayContaining([
        'reporting.dashboard.get',
        'reporting.report.query',
        'reporting.drillDown.resolve',
        'reporting.export.request',
        'reporting.export.getStatus',
      ]),
    );
  });

  it('validates dashboard request with scope, date range and requested sensitive fields', () => {
    expect(() =>
      parseReportingDashboardRequest({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        dateRange: { from: '2026-07-26', to: '2026-07-26' },
        requestedSensitiveFields: ['grossProfitVnd', 'cogsVnd'],
      }),
    ).not.toThrow();

    expect(() =>
      parseReportingDashboardRequest({
        branchId: '',
        dateRange: { from: '2026-07-26', to: '2026-07-25' },
      }),
    ).toThrow();
  });

  it('validates report query envelope and export request', () => {
    expect(() =>
      parseReportingReportQueryRequest({
        reportId: 'sales-summary',
        dateField: 'completedOrShippedAt',
        dateRange: { from: '2026-07-01', to: '2026-07-26' },
        scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
        filters: { status: ['Completed'] },
        dimensions: ['branchId', 'paymentStatus'],
        pageSize: 50,
      }),
    ).not.toThrow();

    expect(() =>
      parseReportingExportRequest({
        commandId: 'cmd-export',
        idempotencyKey: 'idem-export',
        format: 'XLSX',
        query: {
          reportId: 'sales-summary',
          dateField: 'completedOrShippedAt',
          dateRange: { from: '2026-07-01', to: '2026-07-26' },
          scope: { branchId: 'branch-default' },
          pageSize: 100,
        },
      }),
    ).not.toThrow();
  });

  it('validates drill-down token request envelope', () => {
    expect(() =>
      parseReportingDrillDownRequest({
        token: {
          tokenId: 'drill-1',
          reportId: 'sales-summary',
          dateField: 'completedOrShippedAt',
          dateRange: { from: '2026-07-01', to: '2026-07-26' },
          scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
          filters: { kpiId: 'netRevenue' },
          issuedAt: '2026-07-27T09:00:00.000Z',
          asOf: '2026-07-27T08:59:30.000Z',
        },
        pageSize: 50,
      }),
    ).not.toThrow();

    expect(() =>
      parseReportingDrillDownRequest({
        token: {
          tokenId: 'drill-1',
          reportId: 'sales-summary',
          dateField: 'completedOrShippedAt',
          dateRange: { from: '2026-07-27', to: '2026-07-26' },
          scope: { branchId: '' },
          issuedAt: 'not-date',
          asOf: '2026-07-27T08:59:30.000Z',
        },
        pageSize: 0,
      }),
    ).toThrow();
  });
});
