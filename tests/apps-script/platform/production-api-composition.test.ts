import { describe, expect, it } from 'vitest';
import { createProductionApiComposition } from '../../../apps-script/src/bootstrap/create-production-api-composition';
import { createDeterministicPasswordServiceForTest } from '../../../apps-script/src/services/platform/auth/password-service';
import type { CredentialVerifierStore } from '../../../apps-script/src/repositories/platform/auth-repository';
import type { RuntimeConfigDTO } from '../../../apps-script/src/infrastructure/google-workspace/runtime-config-store';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';

describe('Production API composition', () => {
  it('wires runtime config, sheet-backed repositories and credential store into invoke pipeline', () => {
    const gateway = new FakeSheetGateway();
    const credentialVerifierStore = new FakeCredentialVerifierStore();
    const composition = createProductionApiComposition({
      clock: { now: () => new Date('2026-07-27T09:00:00.000Z') },
      runtimeConfigStore: { getActiveConfig: () => runtimeConfig, saveActiveConfig: () => undefined },
      sheetGateway: gateway,
      credentialVerifierStore,
      passwordService: createDeterministicPasswordServiceForTest(),
      lockProvider: { withLock: (operation) => operation() },
    });

    expect(
      composition.invoke({
        operation: 'platform.bootstrap.getStatus',
        requestId: 'req-status-before',
        payload: {},
      }),
    ).toMatchObject({ ok: true, data: { installed: false } });

    const install = composition.invoke({
      operation: 'platform.bootstrap.install',
      requestId: 'req-install',
      payload: {
        tenantDisplayName: 'Cửa hàng production',
        adminLoginId: 'admin',
        temporaryPassword: 'admin123',
      },
    });
    expect(install).toMatchObject({ ok: true, data: { installed: true } });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    expect(login).toMatchObject({ ok: true });
    if (!login.ok) throw new Error('login failed');

    const registry = composition.invoke({
      operation: 'platform.registry.getTableDefinitions',
      requestId: 'req-registry',
      sessionToken: login.data.sessionToken,
      payload: {},
    });
    expect(registry).toMatchObject({ ok: true });
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey])).toContainEqual([
      'UserAccount',
      undefined,
    ]);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey])).toContainEqual([
      'Session',
      undefined,
    ]);
    expect(JSON.stringify(gateway.appendRequests)).not.toContain('test-verifier:admin123');
    expect(credentialVerifierStore.getVerifier('user-admin')).toBe('test-verifier:admin123');
  });

  it('fails fast when runtime config is missing', () => {
    expect(() =>
      createProductionApiComposition({
        clock: { now: () => new Date('2026-07-27T09:00:00.000Z') },
        runtimeConfigStore: { getActiveConfig: () => undefined, saveActiveConfig: () => undefined },
        sheetGateway: new FakeSheetGateway(),
        credentialVerifierStore: new FakeCredentialVerifierStore(),
        passwordService: createDeterministicPasswordServiceForTest(),
        lockProvider: { withLock: (operation) => operation() },
      }),
    ).toThrow(/Missing active runtime config/);
  });

  it('uses injected production id generator so sessions are unique across composition instances', () => {
    const gateway = new FakeSheetGateway();
    const credentialVerifierStore = new FakeCredentialVerifierStore();
    const idGenerator = createSequenceIdGenerator();

    const firstComposition = createProductionApiComposition({
      clock: { now: () => new Date('2026-07-27T09:00:00.000Z') },
      runtimeConfigStore: { getActiveConfig: () => runtimeConfig, saveActiveConfig: () => undefined },
      sheetGateway: gateway,
      credentialVerifierStore,
      passwordService: createDeterministicPasswordServiceForTest(),
      lockProvider: { withLock: (operation) => operation() },
      idGenerator,
    });
    expect(
      firstComposition.invoke({
        operation: 'platform.bootstrap.install',
        requestId: 'req-install-unique',
        payload: {
          tenantDisplayName: 'Cửa hàng production',
          adminLoginId: 'admin',
          temporaryPassword: 'admin123',
        },
      }),
    ).toMatchObject({ ok: true });

    const firstLogin = firstComposition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-unique-1',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    const secondComposition = createProductionApiComposition({
      clock: { now: () => new Date('2026-07-27T09:01:00.000Z') },
      runtimeConfigStore: { getActiveConfig: () => runtimeConfig, saveActiveConfig: () => undefined },
      sheetGateway: gateway,
      credentialVerifierStore,
      passwordService: createDeterministicPasswordServiceForTest(),
      lockProvider: { withLock: (operation) => operation() },
      idGenerator,
    });
    const secondLogin = secondComposition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-unique-2',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    expect(firstLogin).toMatchObject({ ok: true });
    expect(secondLogin).toMatchObject({ ok: true });
    if (!firstLogin.ok || !secondLogin.ok) throw new Error('login failed');
    expect(secondLogin.data.sessionToken).not.toBe(firstLogin.data.sessionToken);
    expect(
      secondComposition.invoke({
        operation: 'reporting.dashboard.get',
        requestId: 'req-dashboard-unique',
        sessionToken: secondLogin.data.sessionToken,
        payload: {
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          dateRange: { from: '2026-07-27', to: '2026-07-27' },
          requestedSensitiveFields: [],
        },
      }),
    ).not.toMatchObject({ ok: false, error: { code: 'SESSION_EXPIRED' } });
  });

  it('creates a current-day baseline dashboard projection during tenant bootstrap', () => {
    const gateway = new FakeSheetGateway();
    const credentialVerifierStore = new FakeCredentialVerifierStore();
    const composition = createProductionApiComposition({
      clock: { now: () => new Date('2026-07-31T09:00:00.000Z') },
      runtimeConfigStore: { getActiveConfig: () => runtimeConfig, saveActiveConfig: () => undefined },
      sheetGateway: gateway,
      credentialVerifierStore,
      passwordService: createDeterministicPasswordServiceForTest(),
      lockProvider: { withLock: (operation) => operation() },
      idGenerator: createSequenceIdGenerator(),
    });

    expect(
      composition.invoke({
        operation: 'platform.bootstrap.install',
        requestId: 'req-install-dashboard-baseline',
        payload: {
          tenantDisplayName: 'Cửa hàng production',
          adminLoginId: 'admin',
          temporaryPassword: 'admin123',
        },
      }),
    ).toMatchObject({ ok: true });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-dashboard-baseline',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    expect(login).toMatchObject({ ok: true });
    if (!login.ok) throw new Error('login failed');

    expect(
      composition.invoke({
        operation: 'reporting.dashboard.get',
        requestId: 'req-dashboard-baseline',
        sessionToken: login.data.sessionToken,
        payload: {
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          dateRange: { from: '2026-07-31', to: '2026-07-31' },
          requestedSensitiveFields: [],
        },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
        kpis: [
          { kpiId: 'netRevenue', valueVnd: 0 },
          { kpiId: 'completedOrders', valueCount: 0 },
          { kpiId: 'collected', valueVnd: 0 },
          { kpiId: 'receivableOverdue', valueVnd: 0 },
        ],
        revenueSeries: [],
        decisionQueue: [],
        manualOrders: [],
      },
    });
    expect(gateway.appendRequests.map((request) => request.tableName)).toContain('DashboardProjection');
  });
});

const runtimeConfig: RuntimeConfigDTO = {
  tenantId: 'tenant-default',
  appVersion: '0.1.0',
  schemaVersion: 1,
  driveRootFolderId: 'drive-root',
  storage: {
    core: { spreadsheetId: 'spreadsheet-core' },
    runtime: { spreadsheetId: 'spreadsheet-runtime' },
    transaction: { activePartitionKey: 'FY2026-P01', spreadsheetId: 'spreadsheet-transaction' },
  },
  maintenanceMode: false,
};

class FakeCredentialVerifierStore implements CredentialVerifierStore {
  private readonly values = new Map<string, string>();

  getVerifier(userId: string): string | undefined {
    return this.values.get(userId);
  }

  saveVerifier(userId: string, verifier: string): void {
    this.values.set(userId, verifier);
  }
}

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  readTable(request: { table: TableDefinitionDTO; partitionKey?: string }): Record<string, unknown>[] {
    return this.getRows(request.table.tableName).map(clone);
  }

  appendRows(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    rows: readonly Record<string, unknown>[];
  }): { appendedRowCount: number } {
    const rows = request.rows.map(clone);
    this.appendRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey, rows });
    this.getRows(request.table.tableName).push(...rows);
    return { appendedRowCount: rows.length };
  }

  private getRows(tableName: string): Record<string, unknown>[] {
    let rows = this.rowsByTable.get(tableName);
    if (rows === undefined) {
      rows = [];
      this.rowsByTable.set(tableName, rows);
    }
    return rows;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createSequenceIdGenerator() {
  let sequence = 0;
  return {
    newId(prefix: string): string {
      sequence += 1;
      return `${prefix}-prod-${sequence}`;
    },
  };
}
