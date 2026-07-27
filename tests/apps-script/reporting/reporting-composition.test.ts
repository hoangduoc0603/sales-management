import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

describe('reporting API composition', () => {
  it('serves dashboard/report/export operations through the single API gateway', () => {
    const api = createApiComposition({ now: () => new Date('2026-07-27T09:00:00.000Z') });
    const login = api.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-reporting',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    expect(login).toMatchObject({ ok: true });
    if (!login.ok) throw new Error('login failed');

    const dashboard = api.invoke({
      operation: 'reporting.dashboard.get',
      requestId: 'req-dashboard',
      sessionToken: login.data.sessionToken,
      payload: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        dateRange: { from: '2026-07-26', to: '2026-07-26' },
        requestedSensitiveFields: ['grossProfitVnd'],
      },
    });
    if (!dashboard.ok) throw new Error(JSON.stringify(dashboard.error));

    expect(dashboard).toMatchObject({
      ok: true,
      data: {
        kpis: [{ kpiId: 'netRevenue' }, { kpiId: 'completedOrders' }, { kpiId: 'collected' }, { kpiId: 'receivableOverdue' }],
        restricted: { sensitiveFields: ['grossProfitVnd'] },
      },
    });

    const report = api.invoke({
      operation: 'reporting.report.query',
      requestId: 'req-report-query',
      sessionToken: login.data.sessionToken,
      payload: {
        reportId: 'sales-profit',
        dateField: 'completedOrShippedAt',
        dateRange: { from: '2026-07-26', to: '2026-07-26' },
        scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
        pageSize: 50,
      },
    });

    expect(report).toMatchObject({
      ok: true,
      data: { rows: [{ branchId: 'branch-default', netRevenueVnd: 286_450_000 }] },
    });
    if (!report.ok) throw new Error('report failed');
    expect(report.data.rows[0]).not.toHaveProperty('grossProfitVnd');

    const exportRequest = api.invoke({
        operation: 'reporting.export.request',
        requestId: 'req-export',
        sessionToken: login.data.sessionToken,
        payload: {
          commandId: 'cmd-export',
          idempotencyKey: 'idem-export',
          format: 'CSV',
          query: {
            reportId: 'sales-summary',
            dateField: 'completedOrShippedAt',
            dateRange: { from: '2026-07-26', to: '2026-07-26' },
            scope: { branchId: 'branch-default' },
            pageSize: 50,
          },
        },
      });
    expect(exportRequest).toMatchObject({ ok: true, data: { exportRun: { status: 'Completed', routing: 'SmallSync' } } });
    if (!exportRequest.ok) throw new Error('export request failed');

    expect(
      api.invoke({
        operation: 'reporting.export.getStatus',
        requestId: 'req-export-status',
        sessionToken: login.data.sessionToken,
        payload: { runId: exportRequest.data.exportRun.runId },
      }),
    ).toMatchObject({ ok: true, data: { exportRun: { runId: exportRequest.data.exportRun.runId, status: 'Completed' } } });
  });
});
