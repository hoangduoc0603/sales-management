import type { ColumnDefinitionDTO, TableDefinitionDTO } from '@shared/contracts/platform/registry';

export interface SheetLocation {
  spreadsheetId: string;
  sheetName: string;
}

export interface SheetGatewayTableLocator {
  (input: { table: TableDefinitionDTO; partitionKey?: string }): SheetLocation;
}

export interface SheetGatewayDependencies {
  spreadsheetApp: {
    openById(spreadsheetId: string): SpreadsheetLike;
  };
  tableLocator: SheetGatewayTableLocator;
}

export interface SheetGatewayReadRequest {
  table: TableDefinitionDTO;
  partitionKey?: string;
}

export interface SheetGatewayAppendRequest {
  table: TableDefinitionDTO;
  partitionKey?: string;
  rows: readonly Record<string, unknown>[];
}

export interface SheetGateway {
  readTable(request: SheetGatewayReadRequest): Record<string, unknown>[];
  appendRows(request: SheetGatewayAppendRequest): { appendedRowCount: number };
}

interface SpreadsheetLike {
  getSheetByName(sheetName: string): SheetLike | null;
  insertSheet?(sheetName: string): SheetLike;
}

interface SheetLike {
  getDataRange(): { getValues(): unknown[][] };
  appendRow(row: unknown[]): void;
}

export function createSheetGateway(deps: SheetGatewayDependencies): SheetGateway {
  return {
    readTable(request) {
      const { sheet } = openLocatedSheet(deps, request.table, request.partitionKey, false);
      if (sheet === null) return [];

      const values = sheet.getDataRange().getValues();
      if (values.length === 0) return [];

      const actualHeaders = values[0].map((value) => String(value));
      return values.slice(1).map((row) => rowToRecord(row, actualHeaders, request.table.headers));
    },
    appendRows(request) {
      const { sheet, created } = openLocatedSheet(deps, request.table, request.partitionKey, true);
      if (sheet === null) {
        throw new Error(`Cannot append to missing sheet ${request.table.sheetName}.`);
      }

      ensureHeaders(sheet, request.table, created);

      for (const row of request.rows) {
        sheet.appendRow(request.table.headers.map((column) => serializeCell(row[column.name], column)));
      }

      return { appendedRowCount: request.rows.length };
    },
  };
}

function openLocatedSheet(
  deps: SheetGatewayDependencies,
  table: TableDefinitionDTO,
  partitionKey: string | undefined,
  createIfMissing: boolean,
): { sheet: SheetLike | null; created: boolean } {
  const location = deps.tableLocator({ table, partitionKey });
  const spreadsheet = deps.spreadsheetApp.openById(location.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(location.sheetName);
  if (sheet !== null) return { sheet, created: false };
  if (createIfMissing && spreadsheet.insertSheet !== undefined) {
    return { sheet: spreadsheet.insertSheet(location.sheetName), created: true };
  }
  return { sheet: null, created: false };
}

function ensureHeaders(sheet: SheetLike, table: TableDefinitionDTO, created: boolean): void {
  if (!created && sheet.getDataRange().getValues().length > 0) return;

  sheet.appendRow(table.headers.map((column) => column.name));
}

function rowToRecord(
  row: readonly unknown[],
  actualHeaders: readonly string[],
  columns: readonly ColumnDefinitionDTO[],
): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  for (const column of columns) {
    const actualIndex = actualHeaders.indexOf(column.name);
    if (actualIndex === -1) {
      record[column.name] = undefined;
      continue;
    }
    record[column.name] = deserializeCell(row[actualIndex], column);
  }

  return record;
}

export function serializeCell(value: unknown, column: ColumnDefinitionDTO): unknown {
  if (value === undefined || value === null) return '';
  if (column.type === 'json') return JSON.stringify(value);
  if (column.type === 'boolean') return Boolean(value);
  if (column.type === 'integer') return Number(value);
  return String(value);
}

export function deserializeCell(value: unknown, column: ColumnDefinitionDTO): unknown {
  if (value === '' || value === undefined || value === null) return undefined;
  if (column.type === 'json') {
    if (typeof value !== 'string') return value;
    return JSON.parse(value);
  }
  if (column.type === 'boolean') return value === true || value === 'true';
  if (column.type === 'integer') return Number(value);
  return String(value);
}
