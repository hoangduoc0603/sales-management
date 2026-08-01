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

    expect(spreadsheetApp.openedIds).toEqual(['spreadsheet-core']);
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

  it('writes registry headers before first append when a sheet is created lazily', () => {
    const spreadsheet = new FakeSpreadsheet({});
    const spreadsheetApp = new FakeSpreadsheetApp({ 'spreadsheet-core': spreadsheet });
    const gateway = createSheetGateway({
      spreadsheetApp,
      tableLocator: () => ({
        spreadsheetId: 'spreadsheet-core',
        sheetName: 'UserAccount',
      }),
    });

    gateway.appendRows({
      table: userAccountTable,
      rows: [
        {
          id: 'user-1',
          status: 'Active',
          detailsJson: { displayName: 'Admin' },
        },
      ],
    });

    expect(gateway.readTable({ table: userAccountTable })).toEqual([
      {
        id: 'user-1',
        status: 'Active',
        detailsJson: { displayName: 'Admin' },
      },
    ]);
  });

  it('uses full table scan instead of per-row reads when a column lookup returns many versioned matches', () => {
    const rows = [
      ['id', 'status', 'detailsJson'],
      ...Array.from({ length: 8 }, (_, index) => [
        `user-admin:v${index + 1}`,
        'Active',
        JSON.stringify({ loginIdNormalized: 'admin', version: index + 1 }),
      ]),
    ];
    const sheet = new FakeSheet('UserAccount', rows, { supportsRangeLookup: true });
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

    const result = gateway.findRowsByColumn({
      table: userAccountTable,
      columnName: 'status',
      value: 'Active',
    });

    expect(result).toHaveLength(8);
    expect(sheet.dataRangeReadCount).toBe(1);
    expect(sheet.rowRangeReadCount).toBe(0);
  });

  it('uses targeted unique lookup and cached full table reads for other small column lookups', () => {
    const sheet = new FakeSheet('UserAccount', [
      ['id', 'status', 'detailsJson'],
      ['user-1', 'Active', '{"schemaVersion":1,"displayName":"Admin"}'],
      ['user-2', 'Disabled', '{"schemaVersion":1,"displayName":"Disabled User"}'],
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

    expect(gateway.findRowsByColumn({ table: userAccountTable, columnName: 'id', value: 'user-1' })).toHaveLength(1);
    expect(gateway.findRowsByColumn({ table: userAccountTable, columnName: 'status', value: 'Active' })).toHaveLength(1);

    expect(sheet.dataRangeReadCount).toBe(1);
    expect(sheet.rowRangeReadCount).toBe(1);
  });

  it('uses targeted lookup for small-table unique keys instead of full-scanning the table', () => {
    const rows = [
      ['id', 'status', 'detailsJson'],
      ...Array.from({ length: 100 }, (_, index) => [
        `user-${index + 1}`,
        index % 2 === 0 ? 'Active' : 'Disabled',
        JSON.stringify({ displayName: `User ${index + 1}` }),
      ]),
    ];
    const sheet = new FakeSheet('UserAccount', rows, { supportsRangeLookup: true });
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

    expect(gateway.findRowsByColumn({ table: userAccountTable, columnName: 'id', value: 'user-99' })).toHaveLength(1);

    expect(sheet.dataRangeReadCount).toBe(0);
    expect(sheet.rowRangeReadCount).toBe(1);
  });

  it('caches repeated large-table column lookups within one execution and invalidates them on append', () => {
    const rows = [
      ['id', 'status', 'detailsJson'],
      ...Array.from({ length: 600 }, (_, index) => [
        `user-${index + 1}`,
        index % 2 === 0 ? 'Active' : 'Disabled',
        JSON.stringify({ displayName: `User ${index + 1}` }),
      ]),
    ];
    const sheet = new FakeSheet('UserAccount', rows, { supportsRangeLookup: true });
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

    expect(gateway.findRowsByColumn({ table: userAccountTable, columnName: 'id', value: 'user-599' })).toHaveLength(1);
    expect(gateway.findRowsByColumn({ table: userAccountTable, columnName: 'id', value: 'user-599' })).toHaveLength(1);
    expect(sheet.rowRangeReadCount).toBe(1);

    gateway.appendRows({
      table: userAccountTable,
      rows: [{ id: 'user-601', status: 'Active', detailsJson: { displayName: 'New User' } }],
    });

    expect(gateway.findRowsByColumn({ table: userAccountTable, columnName: 'id', value: 'user-599' })).toHaveLength(1);
    expect(sheet.rowRangeReadCount).toBe(2);
  });

  it('updates cached table rows after append so same-request lookups see new data without rereading Sheets', () => {
    const sheet = new FakeSheet('UserAccount', [
      ['id', 'status', 'detailsJson'],
      ['user-1', 'Active', '{"schemaVersion":1,"displayName":"Admin"}'],
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

    expect(gateway.findRowsByColumn({ table: userAccountTable, columnName: 'id', value: 'user-1' })).toHaveLength(1);
    gateway.appendRows({
      table: userAccountTable,
      rows: [{ id: 'user-2', status: 'Active', detailsJson: { displayName: 'New User' } }],
    });

    expect(gateway.findRowsByColumn({ table: userAccountTable, columnName: 'id', value: 'user-2' })).toHaveLength(1);
    expect(sheet.dataRangeReadCount).toBe(0);
    expect(sheet.rowRangeReadCount).toBe(2);
  });

  it('does not read the full existing sheet only to verify headers before append', () => {
    const sheet = new FakeSheet('UserAccount', [['id', 'status', 'detailsJson']], {
      supportsRangeLookup: true,
    });
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

    gateway.appendRows({
      table: userAccountTable,
      rows: [
        {
          id: 'user-2',
          status: 'Active',
          detailsJson: { displayName: 'Admin' },
        },
      ],
    });

    expect(sheet.dataRangeReadCount).toBe(0);
    expect(sheet.appendedRows).toEqual([
      ['user-2', 'Active', '{"displayName":"Admin"}'],
    ]);
  });

  it('defers multiple append calls and flushes them through one Advanced Sheets batch update', () => {
    const sheet = new FakeSheet('UserAccount', [['id', 'status', 'detailsJson']], {
      supportsRangeLookup: true,
    });
    const spreadsheetApp = new FakeSpreadsheetApp({
      'spreadsheet-core': new FakeSpreadsheet({ UserAccount: sheet }),
    });
    const sheetsAdvancedService = new FakeSheetsAdvancedService();
    const gateway = createSheetGateway({
      spreadsheetApp,
      sheetsAdvancedService,
      deferAppends: true,
      tableLocator: () => ({
        spreadsheetId: 'spreadsheet-core',
        sheetName: 'UserAccount',
      }),
    });

    gateway.appendRows({
      table: userAccountTable,
      rows: [{ id: 'user-2', status: 'Active', detailsJson: { displayName: 'Admin' } }],
    });
    gateway.appendRows({
      table: userAccountTable,
      rows: [{ id: 'user-3', status: 'Disabled', detailsJson: { displayName: 'Disabled' } }],
    });

    expect(sheet.appendedRows).toEqual([]);

    gateway.flushPendingAppends?.();

    expect(sheetsAdvancedService.batchUpdates).toEqual([
      {
        spreadsheetId: 'spreadsheet-core',
        resource: {
          valueInputOption: 'RAW',
          data: [
            {
              range: "'UserAccount'!A2:C3",
              majorDimension: 'ROWS',
              values: [
                ['user-2', 'Active', '{"displayName":"Admin"}'],
                ['user-3', 'Disabled', '{"displayName":"Disabled"}'],
              ],
            },
          ],
        },
      },
    ]);
  });

  it('reuses deferred append sheet state instead of reading last row for every append to the same sheet', () => {
    const sheet = new FakeSheet('UserAccount', [['id', 'status', 'detailsJson']], {
      supportsRangeLookup: true,
    });
    const spreadsheetApp = new FakeSpreadsheetApp({
      'spreadsheet-core': new FakeSpreadsheet({ UserAccount: sheet }),
    });
    const sheetsAdvancedService = new FakeSheetsAdvancedService();
    const gateway = createSheetGateway({
      spreadsheetApp,
      sheetsAdvancedService,
      deferAppends: true,
      tableLocator: () => ({
        spreadsheetId: 'spreadsheet-core',
        sheetName: 'UserAccount',
      }),
    });

    gateway.appendRows({
      table: userAccountTable,
      rows: [{ id: 'user-2', status: 'Active', detailsJson: { displayName: 'Admin' } }],
    });
    gateway.appendRows({
      table: userAccountTable,
      rows: [{ id: 'user-3', status: 'Disabled', detailsJson: { displayName: 'Disabled' } }],
    });
    gateway.appendRows({
      table: userAccountTable,
      rows: [{ id: 'user-4', status: 'Active', detailsJson: { displayName: 'Second' } }],
    });

    expect(sheet.lastRowReadCount).toBe(1);
    gateway.flushPendingAppends?.();
    expect(sheetsAdvancedService.batchUpdates[0]?.resource).toMatchObject({
      data: [
        {
          range: "'UserAccount'!A2:C4",
        },
      ],
    });
  });

  it('creates private tenant Drive folders without public URLs', () => {
    const driveApp = new FakeDriveApp();
    const gateway = createDriveGateway({
      driveApp,
      utilities: {
        base64Decode: (value) => [...value].map((char) => char.charCodeAt(0)),
        base64Encode: (data) => String.fromCharCode(...data),
        newBlob: (data, mimeType, fileName) => ({ data, mimeType, fileName }),
      },
    });

    const manifest = gateway.createTenantFolders({ businessName: 'Công ty Cenio Retail' });

    expect(manifest.root.name).toBe('Sales Management - Công ty Cenio Retail');
    expect(manifest.database.children.map((folder) => folder.name)).toEqual([
      'Core Data',
      'Runtime Data',
      'Transaction Data',
    ]);
    expect(manifest.attachments.name).toBe('Attachments');
    expect(JSON.stringify(manifest)).not.toContain('https://drive.google.com');
    expect(driveApp.permissionCalls).toEqual([]);
  });

  it('stores private attachment files in the configured Drive folder without public URLs', () => {
    const driveApp = new FakeDriveApp();
    const gateway = createDriveGateway({
      driveApp,
      utilities: {
        base64Decode: (value) => [...value].map((char) => char.charCodeAt(0)),
        base64Encode: (data) => String.fromCharCode(...data),
        newBlob: (data, mimeType, fileName) => ({ data, mimeType, fileName }),
      },
    });
    const manifest = gateway.createTenantFolders({ businessName: 'Công ty Cenio Retail' });

    const file = gateway.savePrivateAttachment({
      folderId: manifest.attachments.id,
      fileName: 'receipt.pdf',
      mimeType: 'application/pdf',
      contentBase64: 'cmVjZWlwdA==',
    });

    expect(file).toEqual({
      driveFileId: 'file-1-receipt.pdf',
      fileName: 'receipt.pdf',
      mimeType: 'application/pdf',
    });
    expect(driveApp.createdFiles).toEqual([
      {
        folderId: manifest.attachments.id,
        blob: {
          data: [...'cmVjZWlwdA=='].map((char) => char.charCodeAt(0)),
          mimeType: 'application/pdf',
          fileName: 'receipt.pdf',
        },
      },
    ]);
    expect(JSON.stringify(file)).not.toContain('https://drive.google.com');
    expect(driveApp.permissionCalls).toEqual([]);

    expect(gateway.readPrivateAttachment({ driveFileId: file.driveFileId })).toEqual({
      contentBase64: 'cmVjZWlwdA==',
    });
    gateway.trashPrivateAttachment({ driveFileId: file.driveFileId });
    expect(driveApp.getFileById(file.driveFileId).trashed).toBe(true);
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

  it('falls back to Apps Script script lock when document lock is unavailable', () => {
    const lockService = new FakeLockService({ documentLockAvailable: false });
    const provider = createAppsScriptLockProvider({
      lockService,
      waitTimeoutMs: 3000,
    });

    const result = provider.withLock(() => 'committed');

    expect(result).toBe('committed');
    expect(lockService.documentLock.calls).toEqual([]);
    expect(lockService.scriptLock.calls).toEqual(['waitLock:3000', 'releaseLock']);
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
  dataRangeReadCount = 0;
  rowRangeReadCount = 0;
  lastRowReadCount = 0;

  constructor(
    readonly name: string,
    private readonly values: unknown[][],
    private readonly options: { supportsRangeLookup?: boolean } = { supportsRangeLookup: true },
  ) {}

  getDataRange() {
    return {
      getValues: () => {
        this.dataRangeReadCount += 1;
        return this.values;
      },
    };
  }

  getLastRow(): number {
    this.lastRowReadCount += 1;
    return this.values.length;
  }

  getLastColumn(): number {
    return this.values[0]?.length ?? 0;
  }

  getRange(row: number, column: number, numRows = 1, numColumns = 1) {
    if (!this.options.supportsRangeLookup) {
      throw new Error('Range lookup is disabled for this fake sheet.');
    }

    const getValues = () => {
      if (row > 1 && numColumns > 1) {
        this.rowRangeReadCount += 1;
      }
      return this.values
        .slice(row - 1, row - 1 + numRows)
        .map((currentRow) => currentRow.slice(column - 1, column - 1 + numColumns));
    };

    return {
      getValues,
      setValues: (rows: unknown[][]) => {
        rows.forEach((currentRow, rowIndex) => {
          const targetRowIndex = row - 1 + rowIndex;
          this.values[targetRowIndex] = currentRow;
          this.appendedRows.push(currentRow);
        });
      },
      createTextFinder: (text: string) => ({
        matchEntireCell: () => ({
          findAll: () => {
            const matched: Array<{ getRow(): number }> = [];
            for (let rowIndex = row - 1; rowIndex < row - 1 + numRows; rowIndex += 1) {
              const cellValue = this.values[rowIndex]?.[column - 1];
              if (String(cellValue ?? '') === text) {
                matched.push({ getRow: () => rowIndex + 1 });
              }
            }
            return matched;
          },
        }),
      }),
    };
  }

  appendRow(row: unknown[]): void {
    this.appendedRows.push(row);
    this.values.push(row);
  }
}

class FakeSheetsAdvancedService {
  readonly batchUpdates: Array<{ resource: unknown; spreadsheetId: string }> = [];

  readonly Spreadsheets = {
    Values: {
      batchUpdate: (resource: unknown, spreadsheetId: string) => {
        this.batchUpdates.push({ resource, spreadsheetId });
      },
    },
  };
}

class FakeDriveApp {
  readonly root: FakeFolder;
  readonly createdFiles: Array<{ folderId: string; blob: unknown }> = [];
  readonly permissionCalls: string[] = [];

  constructor() {
    this.root = new FakeFolder('root', 'root', this);
  }

  createFolder(name: string): FakeFolder {
    return this.root.createFolder(name);
  }

  getFolderById(id: string): FakeFolder {
    const folder = this.root.findFolderById(id);
    if (folder === undefined) throw new Error(`Missing folder ${id}`);
    return folder;
  }

  getFileById(id: string): FakeDriveFile {
    const file = this.root.findFileById(id);
    if (file === undefined) throw new Error(`Missing file ${id}`);
    return file;
  }
}

class FakeFolder {
  readonly children: FakeFolder[] = [];
  readonly files: FakeDriveFile[] = [];

  constructor(
    readonly id: string,
    readonly name: string,
    private readonly driveApp?: FakeDriveApp,
  ) {}

  createFolder(name: string): FakeFolder {
    const folder = new FakeFolder(`folder-${this.children.length + 1}-${name}`, name, this.driveApp);
    this.children.push(folder);
    return folder;
  }

  createFile(blob: unknown): FakeDriveFile {
    const fileName = typeof blob === 'object' && blob !== null && 'fileName' in blob ? String(blob.fileName) : 'file';
    const file = new FakeDriveFile(`file-${this.files.length + 1}-${fileName}`, fileName, blob);
    this.files.push(file);
    this.driveApp?.createdFiles.push({ folderId: this.id, blob });
    return file;
  }

  findFolderById(id: string): FakeFolder | undefined {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findFolderById(id);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  findFileById(id: string): FakeDriveFile | undefined {
    const direct = this.files.find((file) => file.id === id);
    if (direct !== undefined) return direct;
    for (const child of this.children) {
      const found = child.findFileById(id);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }
}

class FakeDriveFile {
  trashed = false;

  constructor(
    readonly id: string,
    readonly name: string,
    private readonly blob: unknown,
  ) {}

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getBlob(): { getBytes(): number[] } {
    const data = typeof this.blob === 'object' && this.blob !== null && 'data' in this.blob && Array.isArray(this.blob.data)
      ? this.blob.data
      : [];
    return { getBytes: () => data };
  }

  setTrashed(trashed: boolean): void {
    this.trashed = trashed;
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
  readonly scriptLock = new FakeLock();

  constructor(private readonly options: { documentLockAvailable?: boolean } = {}) {}

  getDocumentLock(): FakeLock | null {
    return this.options.documentLockAvailable === false ? null : this.documentLock;
  }

  getScriptLock(): FakeLock {
    return this.scriptLock;
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
