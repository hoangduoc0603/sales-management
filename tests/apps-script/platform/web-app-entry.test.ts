import { afterEach, describe, expect, it, vi } from 'vitest';
import { doGet_, invoke_ } from '../../../apps-script/src/api/web-app';

describe('Apps Script Web App entrypoint', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('trả lỗi setup rõ ràng thay vì throw khi tenant chưa bootstrap runtime config', () => {
    vi.stubGlobal('PropertiesService', {
      getScriptProperties: () => ({
        getProperty: () => null,
        setProperty: () => undefined,
      }),
    });

    const result = invoke_({
      operation: 'platform.auth.login',
      requestId: 'req-login-not-bootstrapped',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'RUNTIME_NOT_INSTALLED',
        message: 'Hệ thống chưa được khởi tạo. Vui lòng chạy bootstrap tenant mặc định trước khi đăng nhập.',
      },
      meta: {
        requestId: 'req-login-not-bootstrapped',
        operation: 'platform.auth.login',
      },
    });
  });

  it('inject boot config từ doGet event để frontend đọc được debugApi trong iframe Apps Script', () => {
    vi.stubGlobal('HtmlService', new FakeHtmlService('<html><head></head><body><div id="root"></div></body></html>'));

    const output = doGet_({
      parameter: { debugApi: '1' },
    } as GoogleAppsScript.Events.DoGet);

    expect(output.getContent()).toContain('window.__CENIO_BOOT__');
    expect(output.getContent()).toContain('"debugApi":true');
    expect(output.getContent()).toContain('<script id="cenio-boot-config" type="application/json">{"debugApi":true}</script>');
    expect(output.getContent()).toContain('<div id="root"></div>');
  });

  it('cho phép đọc trạng thái install trước khi có runtime config', () => {
    vi.stubGlobal('PropertiesService', {
      getScriptProperties: () => new FakeProperties(),
    });

    const result = invoke_({
      operation: 'platform.install.getStatus',
      requestId: 'req-install-status',
      payload: {},
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        status: 'NotInstalled',
        installed: false,
        canRetry: true,
      },
      meta: {
        requestId: 'req-install-status',
        operation: 'platform.install.getStatus',
      },
    });
  });

  it('chạy first-run install qua Web App entrypoint và không yêu cầu runtime config có sẵn', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T00:00:00.000Z'));

    const properties = new FakeProperties();
    const spreadsheetApp = new FakeSpreadsheetApp();
    const lockService = new FakeLockService();
    const scriptApp = new FakeScriptApp();

    vi.stubGlobal('PropertiesService', {
      getScriptProperties: () => properties,
    });
    vi.stubGlobal('ScriptApp', scriptApp);
    vi.stubGlobal('SpreadsheetApp', spreadsheetApp);
    vi.stubGlobal('DriveApp', new FakeDriveApp());
    vi.stubGlobal('LockService', lockService);
    vi.stubGlobal('Utilities', {
      MacAlgorithm: { HMAC_SHA_256: 'HMAC_SHA_256' },
      base64Encode: (bytes: number[]) => `base64:${bytes.join('-')}`,
      computeHmacSignature: (_algorithm: unknown, value: string, key: string) =>
        Array.from({ length: 32 }, (_, index) => (value.charCodeAt(index % value.length) + key.length + index) % 128),
      getUuid: () => '00000000-0000-4000-8000-000000000000',
    });

    const result = invoke_({
      operation: 'platform.install.run',
      requestId: 'req-install-run',
      payload: {
        tenantDisplayName: 'Cửa hàng An Nhiên',
        adminLoginId: 'admin',
        adminPassword: 'admin123',
        confirmAdminPassword: 'admin123',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        status: 'Installed',
        installed: true,
        tenantDisplayName: 'Cửa hàng An Nhiên',
        adminLoginId: 'admin',
        branchName: 'Chi nhánh mặc định',
        warehouseName: 'Kho mặc định',
      },
    });
    expect(properties.getProperty('salesManagement.runtimeConfig.active')).toContain('tenant-default');
    expect(properties.getProperty('salesManagement.install.status')).toBe('Installed');
    expect(scriptApp.requiredScopes).toEqual([
      {
        authMode: 'FULL',
        scopes: [
          'https://www.googleapis.com/auth/script.storage',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets',
        ],
      },
    ]);
    expect(spreadsheetApp.createdNames).toEqual([
      'Core Data',
      'Runtime Data',
      'Transaction Data FY2026-P07',
      'Audit Data AUDIT-2026-07',
    ]);
    expect(lockService.scriptLock.calls).toEqual(['waitLock:30000', 'releaseLock']);

    const secondRun = invoke_({
      operation: 'platform.install.run',
      requestId: 'req-install-run-again',
      payload: {
        tenantDisplayName: 'Cửa hàng An Nhiên',
        adminLoginId: 'admin',
        adminPassword: 'admin123',
        confirmAdminPassword: 'admin123',
      },
    });

    expect(secondRun).toMatchObject({ ok: true, data: { installed: true, status: 'Installed' } });
    expect(spreadsheetApp.createdNames).toHaveLength(4);

    expect(spreadsheetApp.getSheetValues('spreadsheet-3', 'DashboardProjection')).toEqual(
      expect.arrayContaining([
        expect.arrayContaining(['tenant-default', 'branch-default', 'warehouse-default', '2026-07-27']),
      ]),
    );
  });
});

class FakeProperties {
  private readonly values = new Map<string, string>();

  getProperty(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setProperty(key: string, value: string): FakeProperties {
    this.values.set(key, value);
    return this;
  }
}

class FakeSpreadsheetApp {
  readonly createdNames: string[] = [];
  private readonly spreadsheets = new Map<string, FakeSpreadsheet>();

  create(name: string): FakeSpreadsheet {
    this.createdNames.push(name);
    const spreadsheet = new FakeSpreadsheet(`spreadsheet-${this.createdNames.length}`, name);
    this.spreadsheets.set(spreadsheet.getId(), spreadsheet);
    return spreadsheet;
  }

  openById(spreadsheetId: string): FakeSpreadsheet {
    const spreadsheet = this.spreadsheets.get(spreadsheetId);
    if (spreadsheet === undefined) throw new Error(`Unknown spreadsheet ${spreadsheetId}`);
    return spreadsheet;
  }

  getSheetValues(spreadsheetId: string, sheetName: string): unknown[][] {
    return this.openById(spreadsheetId).getSheetValues(sheetName);
  }

  flush(): void {
    // Apps Script compatibility seam.
  }
}

class FakeSpreadsheet {
  private readonly sheets = new Map<string, FakeSheet>();

  constructor(
    private readonly id: string,
    readonly name: string,
  ) {}

  getId(): string {
    return this.id;
  }

  getSheetByName(sheetName: string): FakeSheet | null {
    return this.sheets.get(sheetName) ?? null;
  }

  insertSheet(sheetName: string): FakeSheet {
    const sheet = new FakeSheet(sheetName);
    this.sheets.set(sheetName, sheet);
    return sheet;
  }

  getSheetValues(sheetName: string): unknown[][] {
    return this.sheets.get(sheetName)?.getValues() ?? [];
  }
}

class FakeSheet {
  private readonly values: unknown[][] = [];

  constructor(readonly name: string) {}

  getDataRange() {
    return {
      getValues: () => this.values,
    };
  }

  appendRow(row: unknown[]): void {
    this.values.push(row);
  }

  getValues(): unknown[][] {
    return this.values;
  }
}

class FakeDriveApp {
  readonly root = new FakeFolder('root', 'root');

  createFolder(name: string): FakeFolder {
    return this.root.createFolder(name);
  }

  getFileById(id: string): FakeFile {
    return new FakeFile(id);
  }

  getFolderById(id: string): FakeFolder {
    return new FakeFolder(id, id);
  }
}

class FakeScriptApp {
  readonly AuthMode = { FULL: 'FULL' };
  readonly requiredScopes: Array<{ authMode: string; scopes: string[] }> = [];

  requireScopes(authMode: string, scopes: string[]): void {
    this.requiredScopes.push({ authMode, scopes });
  }
}

class FakeFolder {
  readonly children: FakeFolder[] = [];

  constructor(
    private readonly id: string,
    private readonly name: string,
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

class FakeFile {
  constructor(readonly id: string) {}

  moveTo(folder: FakeFolder): void {
    void folder;
    // Apps Script compatibility seam.
  }
}

class FakeLockService {
  readonly scriptLock = new FakeLock();
  readonly documentLock = new FakeLock();

  getScriptLock(): FakeLock {
    return this.scriptLock;
  }

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

class FakeHtmlService {
  constructor(private readonly fileContent: string) {}

  createHtmlOutputFromFile(fileName: string): FakeHtmlOutput {
    expect(fileName).toBe('index');
    return new FakeHtmlOutput(this.fileContent);
  }

  createHtmlOutput(content: string): FakeHtmlOutput {
    return new FakeHtmlOutput(content);
  }
}

class FakeHtmlOutput {
  constructor(private content: string) {}

  getContent(): string {
    return this.content;
  }

  setTitle(): FakeHtmlOutput {
    return this;
  }

  setXFrameOptionsMode(): FakeHtmlOutput {
    return this;
  }
}
