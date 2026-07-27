import { describe, expect, it } from 'vitest';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import { createAppsScriptLockProvider } from '../../../apps-script/src/infrastructure/google-workspace/apps-script-lock-provider';
import { createDriveGateway } from '../../../apps-script/src/infrastructure/google-workspace/drive-gateway';
import { createPropertiesRuntimeConfigStore } from '../../../apps-script/src/infrastructure/google-workspace/runtime-config-store';
import { createSheetGateway } from '../../../apps-script/src/infrastructure/google-workspace/sheet-gateway';

describe('Google Workspace adapter seams', () => {
  it('reads rows by header name and serializes writes by registry order without hard-coded sheet IDs', () => {
    const sheet = new FakeSheet('UserAccount', [
      ['status', 'detailsJson', 'id'],
      ['Active', '{"schemaVersion":1,"displayName":"Admin"}', 'user-1'],
    ]);
    const spreadsheetApp = new FakeSpreadsheetApp({
      'spreadsheet-core': new FakeSpreadsheet({ UserAccount: sheet }),
    });
    const gateway = createSheetGateway({
      spreadsheetApp,
      tableLocator: () => ({
        spreadsheetId: 'spreadsheet-core',
        sheetName: 'UserAccount',
      }),
    });

    const rows = gateway.readTable({ table: userAccountTable });
    gateway.appendRows({
      table: userAccountTable,
      rows: [
        {
          id: 'user-2',
          status: 'Disabled',
          detailsJson: { schemaVersion: 1, displayName: 'Disabled User' },
        },
      ],
    });

    expect(spreadsheetApp.openedIds).toEqual(['spreadsheet-core', 'spreadsheet-core']);
    expect(rows).toEqual([
      {
        status: 'Active',
        detailsJson: { schemaVersion: 1, displayName: 'Admin' },
        id: 'user-1',
      },
    ]);
    expect(sheet.appendedRows).toEqual([
      ['user-2', 'Disabled', '{"schemaVersion":1,"displayName":"Disabled User"}'],
    ]);
  });

  it('creates private tenant Drive folders without public URLs', () => {
    const driveApp = new FakeDriveApp();
    const gateway = createDriveGateway({ driveApp });

    const manifest = gateway.createTenantFolders({ businessName: 'Công ty Cenio Retail' });

    expect(manifest.root.name).toBe('Sales Management - Công ty Cenio Retail');
    expect(manifest.database.children.map((folder) => folder.name)).toEqual([
      'Core Data',
      'Runtime Data',
      'Transaction Data',
      'Audit Data',
    ]);
    expect(manifest.attachments.name).toBe('Attachments');
    expect(JSON.stringify(manifest)).not.toContain('https://drive.google.com');
    expect(driveApp.permissionCalls).toEqual([]);
  });

  it('stores runtime config in script properties as JSON without exposing secrets in Sheets', () => {
    const properties = new FakeProperties();
    const store = createPropertiesRuntimeConfigStore({ properties });

    store.saveActiveConfig({
      tenantId: 'tenant-default',
      appVersion: '0.1.0',
      schemaVersion: 1,
      driveRootFolderId: 'folder-root',
      storage: {
        core: { spreadsheetId: 'spreadsheet-core' },
        runtime: { spreadsheetId: 'spreadsheet-runtime' },
        transaction: { activePartitionKey: 'FY2026-P01', spreadsheetId: 'spreadsheet-transaction' },
        audit: { activePartitionKey: 'FY2026-P01', spreadsheetId: 'spreadsheet-audit' },
      },
      maintenanceMode: false,
    });

    expect(store.getActiveConfig()).toMatchObject({
      tenantId: 'tenant-default',
      storage: { transaction: { activePartitionKey: 'FY2026-P01' } },
    });
    expect(properties.keys()).toEqual(['salesManagement.runtimeConfig.active']);
    expect(properties.getProperty('salesManagement.runtimeConfig.active')).not.toContain('password');
  });

  it('wraps operations in Apps Script document lock and releases lock after flush', () => {
    const lockService = new FakeLockService();
    const spreadsheetApp = { flushCalls: 0, flush() { this.flushCalls += 1; } };
    const provider = createAppsScriptLockProvider({
      lockService,
      spreadsheetApp,
      waitTimeoutMs: 3000,
    });

    const result = provider.withLock(() => 'committed');

    expect(result).toBe('committed');
    expect(lockService.documentLock.calls).toEqual(['waitLock:3000', 'releaseLock']);
    expect(spreadsheetApp.flushCalls).toBe(1);
  });
});

const userAccountTable: TableDefinitionDTO = {
  tableName: 'UserAccount',
  owner: 'platform',
  storageRole: 'core',
  sheetName: 'UserAccount',
  lifecycle: 'master',
  schemaVersion: 1,
  primaryKey: 'id',
  headers: [
    { name: 'id', type: 'string', required: true },
    { name: 'status', type: 'enum', required: true },
    { name: 'detailsJson', type: 'json', required: false },
  ],
  partitionPolicy: 'none',
  lookupKeys: [{ name: 'UserAccount.primary', columns: ['id'], unique: true }],
};

class FakeSpreadsheetApp {
  readonly openedIds: string[] = [];

  constructor(private readonly spreadsheets: Record<string, FakeSpreadsheet>) {}

  openById(spreadsheetId: string): FakeSpreadsheet {
    this.openedIds.push(spreadsheetId);
    const spreadsheet = this.spreadsheets[spreadsheetId];
    if (spreadsheet === undefined) throw new Error(`Unknown spreadsheet ${spreadsheetId}`);
    return spreadsheet;
  }
}

class FakeSpreadsheet {
  constructor(private readonly sheets: Record<string, FakeSheet>) {}

  getSheetByName(sheetName: string): FakeSheet | null {
    return this.sheets[sheetName] ?? null;
  }

  insertSheet(sheetName: string): FakeSheet {
    const sheet = new FakeSheet(sheetName, []);
    this.sheets[sheetName] = sheet;
    return sheet;
  }
}

class FakeSheet {
  readonly appendedRows: unknown[][] = [];

  constructor(
    readonly name: string,
    private readonly values: unknown[][],
  ) {}

  getDataRange() {
    return {
      getValues: () => this.values,
    };
  }

  appendRow(row: unknown[]): void {
    this.appendedRows.push(row);
    this.values.push(row);
  }
}

class FakeDriveApp {
  readonly root = new FakeFolder('root', 'root');
  readonly permissionCalls: string[] = [];

  createFolder(name: string): FakeFolder {
    return this.root.createFolder(name);
  }
}

class FakeFolder {
  readonly children: FakeFolder[] = [];

  constructor(
    readonly id: string,
    readonly name: string,
  ) {}

  createFolder(name: string): FakeFolder {
    const folder = new FakeFolder(`folder-${this.children.length + 1}-${name}`, name);
    this.children.push(folder);
    return folder;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }
}

class FakeProperties {
  private readonly values = new Map<string, string>();

  getProperty(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setProperty(key: string, value: string): FakeProperties {
    this.values.set(key, value);
    return this;
  }

  keys(): string[] {
    return [...this.values.keys()];
  }
}

class FakeLockService {
  readonly documentLock = new FakeLock();

  getDocumentLock(): FakeLock {
    return this.documentLock;
  }
}

class FakeLock {
  readonly calls: string[] = [];

  waitLock(timeoutMs: number): void {
    this.calls.push(`waitLock:${timeoutMs}`);
  }

  releaseLock(): void {
    this.calls.push('releaseLock');
  }
}
