import { describe, expect, it } from 'vitest';
import type { ApiResult } from '@shared/contracts/api';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';
import {
  createAdminUserFixture,
  createSessionService,
} from '../../../apps-script/src/services/platform/auth/session-service';
import { createDeterministicPasswordServiceForTest } from '../../../apps-script/src/services/platform/auth/password-service';
import { createInMemoryAuthRepository } from '../../../apps-script/src/repositories/platform/auth-repository';
import { createInMemoryReportingRepository } from '../../../apps-script/src/repositories/reporting/reporting-repository';
import { createReportingService } from '../../../apps-script/src/services/reporting/reporting-service';
import { createInMemoryOperationsRepository } from '../../../apps-script/src/repositories/operations/operations-repository';
import { createInMemoryAuditOutboxRepository } from '../../../apps-script/src/repositories/platform/audit-outbox-repository';
import { createOperationsService } from '../../../apps-script/src/services/operations/operations-service';
import type { ActorContextDTO } from '../../../shared/contracts/platform/authorization';

type ApiComposition = ReturnType<typeof createApiComposition>;

function invokeRaw(
  api: ApiComposition,
  request: Parameters<ApiComposition['invoke']>[0],
): ApiResult<unknown> {
  return api.invoke(request) as ApiResult<unknown>;
}

describe('release security review', () => {
  it('revokes existing sessions by authVersion after reset password, disable user and access change', () => {
    const repository = createInMemoryAuthRepository([createAdminUserFixture()]);
    let sequence = 0;
    const service = createSessionService({
      clock: { now: () => new Date('2026-07-27T00:00:00.000Z') },
      idGenerator: {
        newId(prefix) {
          sequence += 1;
          return `${prefix}-${sequence}`;
        },
      },
      repository,
      passwordService: createDeterministicPasswordServiceForTest(),
    });

    const resetSession = service.login({ loginId: 'admin', password: 'admin123' });
    if (!resetSession.ok) throw new Error('login failed');
    expect(
      service.resetPassword({
        userId: 'user-admin',
        temporaryPassword: 'temporary456',
      }),
    ).toMatchObject({ ok: true, data: { passwordChangeRequired: true, authVersion: 2 } });
    expect(service.validateSession(resetSession.data.sessionToken)).toMatchObject({
      ok: false,
      error: { code: 'SESSION_EXPIRED' },
    });
    expect(service.login({ loginId: 'admin', password: 'temporary456' })).toMatchObject({
      ok: true,
      data: { passwordChangeRequired: true },
    });

    const accessSession = service.login({ loginId: 'admin', password: 'temporary456' });
    if (!accessSession.ok) throw new Error('second login failed');
    expect(
      service.applyAccessChange({
        userId: 'user-admin',
        actions: ['platform.session.view'],
        branchIds: ['branch-default'],
        warehouseIds: ['warehouse-default'],
      }),
    ).toMatchObject({ ok: true, data: { authVersion: 3 } });
    expect(service.validateSession(accessSession.data.sessionToken)).toMatchObject({
      ok: false,
      error: { code: 'SESSION_EXPIRED' },
    });

    const disableSession = service.login({ loginId: 'admin', password: 'temporary456' });
    if (!disableSession.ok) throw new Error('third login failed');
    expect(service.disableUser({ userId: 'user-admin' })).toMatchObject({
      ok: true,
      data: { disabled: true, authVersion: 4 },
    });
    expect(service.validateSession(disableSession.data.sessionToken)).toMatchObject({
      ok: false,
      error: { code: 'SESSION_EXPIRED' },
    });
    expect(service.login({ loginId: 'admin', password: 'temporary456' })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS' },
    });
  });

  it('does not expose session token or password through API meta, error, audit summary or export payload', () => {
    const api = createApiComposition({ now: () => new Date('2026-07-27T09:00:00.000Z') });
    const login = invokeRaw(api, {
      operation: 'platform.auth.login',
      requestId: 'req-security-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    expect(login.ok).toBe(true);
    if (!login.ok) throw new Error('login failed');
    const sessionToken = (login.data as { sessionToken: string }).sessionToken;

    const invalid = invokeRaw(api, {
      operation: 'platform.auth.login',
      requestId: 'req-security-invalid',
      payload: { loginId: 'admin', password: 'wrong-secret-password' },
    });
    expect(JSON.stringify(invalid)).not.toContain('wrong-secret-password');

    const exportRequest = invokeRaw(api, {
      operation: 'reporting.export.request',
      requestId: 'req-security-export',
      sessionToken,
      payload: {
        commandId: 'cmd-security-export',
        idempotencyKey: 'idem-security-export',
        format: 'CSV',
        query: {
          reportId: 'sales-summary',
          dateField: 'completedOrShippedAt',
          dateRange: { from: '2026-07-26', to: '2026-07-26' },
          scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
          pageSize: 50,
        },
      },
    });
    expect(exportRequest.ok).toBe(true);
    expect(JSON.stringify(exportRequest)).not.toContain(sessionToken);
    expect(JSON.stringify(exportRequest)).not.toContain('admin123');

    const audit = invokeRaw(api, {
      operation: 'operations.audit.search',
      requestId: 'req-security-audit',
      sessionToken,
      payload: {
        dateRange: { from: '2026-07-27', to: '2026-07-27' },
        pageSize: 50,
      },
    });
    expect(audit.ok).toBe(true);
    const serializedAudit = JSON.stringify(audit);
    expect(serializedAudit).not.toContain(sessionToken);
    expect(serializedAudit).not.toContain('admin123');
    expect(serializedAudit).not.toContain('wrong-secret-password');
  });

  it('denies warehouse scope bypass by edited payload before returning data', () => {
    const { operationsService, reportingService } = createSecurityServices();
    const limitedActor = actor({
      actions: ['operations.attachment.manage', 'operations.attachment.view', 'reporting.dashboard.view'],
      warehouseIds: ['warehouse-allowed'],
    });

    const attachmentWrite = operationsService.completeAttachment({
      actor: limitedActor,
      request: {
        objectType: 'Expense',
        objectId: 'expense-other-warehouse',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        driveFileId: 'drive-file-secret',
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        checksum: 'checksum',
        commandId: 'cmd-security-attachment',
        idempotencyKey: 'idem-security-attachment',
      },
    });
    expect(attachmentWrite).toMatchObject({ ok: false, error: { code: 'SCOPE_DENIED' } });

    const dashboard = reportingService.getSalesDashboard({
      actor: limitedActor,
      request: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        dateRange: { from: '2026-07-26', to: '2026-07-26' },
      },
    });
    expect(dashboard).toMatchObject({ ok: false, error: { code: 'SCOPE_DENIED' } });
  });

  it('removes sensitive fields from dashboard, report and export state when actor lacks permission', () => {
    const { reportingService } = createSecurityServices();
    const manager = actor({
      actions: ['reporting.dashboard.view', 'reporting.report.view', 'reporting.export'],
    });

    const dashboard = reportingService.getSalesDashboard({
      actor: manager,
      request: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        dateRange: { from: '2026-07-26', to: '2026-07-26' },
        requestedSensitiveFields: ['cogsVnd', 'grossProfitVnd'],
      },
    });
    expect(dashboard).toMatchObject({
      ok: true,
      data: { restricted: { sensitiveFields: ['cogsVnd', 'grossProfitVnd'] } },
    });
    expect(JSON.stringify(dashboard)).not.toContain('106450000');

    const report = reportingService.queryReport({
      actor: manager,
      request: {
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
    expect(JSON.stringify(report)).not.toContain('grossProfitVnd');
    expect(JSON.stringify(report)).not.toContain('cogsVnd');

    const exportRequest = reportingService.requestExport({
      actor: manager,
      request: {
        commandId: 'cmd-security-sensitive-export',
        idempotencyKey: 'idem-security-sensitive-export',
        format: 'CSV',
        query: {
          reportId: 'sales-profit',
          dateField: 'completedOrShippedAt',
          dateRange: { from: '2026-07-26', to: '2026-07-26' },
          scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
          pageSize: 50,
        },
      },
    });
    expect(exportRequest).toMatchObject({
      ok: true,
      data: { exportRun: { routing: 'SmallSync', status: 'Completed' } },
    });
    expect(JSON.stringify(exportRequest)).not.toContain('grossProfitVnd');
    expect(JSON.stringify(exportRequest)).not.toContain('cogsVnd');
  });
});

function createSecurityServices() {
  const reportingRepository = createInMemoryReportingRepository();
  const reportingService = createReportingService({
    repository: reportingRepository,
    tenantId: 'tenant-default',
    now: () => new Date('2026-07-27T09:00:00.000Z'),
    newId: createSequentialId(),
  });
  reportingRepository.saveDashboardProjection({
    tenantId: 'tenant-default',
    branchId: 'branch-default',
    warehouseId: 'warehouse-default',
    dateBucket: '2026-07-26',
    response: {
      metadata: {
        generatedAt: '2026-07-27T09:00:00.000Z',
        asOf: '2026-07-27T08:59:30.000Z',
        partitionCoverage: {
          status: 'Complete',
          activeFrom: '2026-07-26',
          activeTo: '2026-07-26',
          archiveIncluded: false,
        },
        archiveIncluded: false,
      },
      scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
      kpis: [
        { kpiId: 'netRevenue', label: 'Doanh thu thuần', valueVnd: 286_450_000, trendPct: 11.6 },
        { kpiId: 'completedOrders', label: 'Đơn hoàn tất', valueCount: 1284 },
        { kpiId: 'collected', label: 'Đã thu', valueVnd: 259_830_000 },
        { kpiId: 'receivableOverdue', label: 'Phải thu / quá hạn', valueVnd: 26_620_000 },
      ],
      revenueSeries: [{ bucket: '18:00', currentNetRevenueVnd: 42_800_000, previousNetRevenueVnd: 38_350_000 }],
      decisionQueue: [],
      manualOrders: [],
      restricted: { sensitiveFields: [] },
    },
  });
  reportingRepository.saveReportRows('sales-profit', [
    { branchId: 'branch-default', netRevenueVnd: 286_450_000, cogsVnd: 180_000_000, grossProfitVnd: 106_450_000 },
  ]);

  const operationsService = createOperationsService({
    repository: createInMemoryOperationsRepository(),
    auditOutboxRepository: createInMemoryAuditOutboxRepository(),
    tenantId: 'tenant-default',
    appVersion: '0.1.0',
    schemaVersion: 1,
    now: () => new Date('2026-07-27T09:00:00.000Z'),
    newId: createSequentialId(),
  });

  return { operationsService, reportingService };
}

function actor(input: {
  actions?: readonly string[];
  branchIds?: readonly string[];
  warehouseIds?: readonly string[];
} = {}): ActorContextDTO {
  return {
    userId: 'user-manager',
    loginId: 'manager',
    displayName: 'Quản lý',
    tenantId: 'tenant-default',
    authVersion: 1,
    actions: input.actions ?? [],
    scope: {
      tenantId: 'tenant-default',
      branchIds: input.branchIds ?? ['branch-default'],
      warehouseIds: input.warehouseIds ?? ['warehouse-default'],
    },
  };
}

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
