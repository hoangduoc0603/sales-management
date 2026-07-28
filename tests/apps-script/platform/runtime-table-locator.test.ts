import { describe, expect, it } from 'vitest';
import {
  createActiveRuntimeTableLocator,
} from '../../../apps-script/src/infrastructure/google-workspace/runtime-table-locator';
import type { RuntimeConfigDTO } from '../../../apps-script/src/infrastructure/google-workspace/runtime-config-store';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';

describe('Active runtime table locator', () => {
  it('routes tables by storage role through runtime config without changing logical sheet name', () => {
    const locator = createActiveRuntimeTableLocator(runtimeConfig);

    expect(locator({ table: table('UserAccount', 'core') })).toEqual({
      spreadsheetId: 'spreadsheet-core',
      sheetName: 'UserAccount',
    });
    expect(locator({ table: table('Session', 'runtime') })).toEqual({
      spreadsheetId: 'spreadsheet-runtime',
      sheetName: 'Session',
    });
    expect(locator({ table: table('SaleOrder', 'transaction'), partitionKey: 'FY2026-P01' })).toEqual({
      spreadsheetId: 'spreadsheet-transaction',
      sheetName: 'SaleOrder',
    });
    expect(locator({ table: table('AuditLog', 'audit'), partitionKey: 'AUDIT-2026-07' })).toEqual({
      spreadsheetId: 'spreadsheet-audit',
      sheetName: 'AuditLog',
    });
  });

  it('fails fast when asked to route non-active partitions through active runtime config', () => {
    const locator = createActiveRuntimeTableLocator(runtimeConfig);

    expect(() =>
      locator({ table: table('SaleOrder', 'transaction'), partitionKey: 'FY2026-P02' }),
    ).toThrow(/Unsupported non-active transaction partition/);
    expect(() =>
      locator({ table: table('AuditLog', 'audit'), partitionKey: 'AUDIT-2026-08' }),
    ).toThrow(/Unsupported non-active audit partition/);
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
    audit: { activePartitionKey: 'AUDIT-2026-07', spreadsheetId: 'spreadsheet-audit' },
  },
  maintenanceMode: false,
};

function table(tableName: string, storageRole: TableDefinitionDTO['storageRole']): TableDefinitionDTO {
  return {
    tableName,
    owner: 'platform',
    storageRole,
    sheetName: tableName,
    lifecycle: storageRole === 'transaction' ? 'document' : storageRole === 'audit' ? 'audit' : 'master',
    schemaVersion: 1,
    primaryKey: 'id',
    headers: [{ name: 'id', type: 'string', required: true }],
    partitionPolicy: storageRole === 'transaction'
      ? 'transaction-period'
      : storageRole === 'audit'
        ? 'audit-period'
        : 'none',
    lookupKeys: [{ name: `${tableName}.primary`, columns: ['id'], unique: true }],
  };
}
