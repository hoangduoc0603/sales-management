import type { ColumnDefinitionDTO, TableDefinitionDTO } from '@shared/contracts/platform/registry';
import { recordIo, recordStage } from '../../api/performance-tracker';

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

export interface SheetGatewayFindByColumnRequest {
  table: TableDefinitionDTO;
  partitionKey?: string;
  columnName: string;
  value: string;
}

export interface SheetGateway {
  readTable(request: SheetGatewayReadRequest): Record<string, unknown>[];
  findRowsByColumn(request: SheetGatewayFindByColumnRequest): Record<string, unknown>[];
  appendRows(request: SheetGatewayAppendRequest): { appendedRowCount: number };
}

interface SpreadsheetLike {
  getSheetByName(sheetName: string): SheetLike | null;
  insertSheet?(sheetName: string): SheetLike;
}

interface SheetLike {
  getDataRange(): { getValues(): unknown[][] };
  getLastRow?(): number;
  getLastColumn?(): number;
  getRange?(
    row: number,
    column: number,
    numRows?: number,
    numColumns?: number,
  ): {
    getValues(): unknown[][];
    setValues?(values: unknown[][]): unknown;
    createTextFinder?(text: string): {
      matchEntireCell(match: boolean): { findAll(): Array<{ getRow(): number }> };
    };
  };
  appendRow(row: unknown[]): void;
}

export function createSheetGateway(deps: SheetGatewayDependencies): SheetGateway {
  const spreadsheetCache = new Map<string, SpreadsheetLike>();
  const sheetCache = new Map<string, SheetLike | null>();

  return {
    readTable(request) {
      const startedAt = Date.now();
      const { sheet } = openLocatedSheet(
        deps,
        request.table,
        request.partitionKey,
        false,
        spreadsheetCache,
        sheetCache,
      );
      if (sheet === null) return [];

      const values = sheet.getDataRange().getValues();
      recordIo('sheetReadCount');
      recordIo('sheetReadRows', Math.max(0, values.length - 1));
      if (values.length === 0) return [];

      const actualHeaders = values[0].map((value) => String(value));
      const result = values.slice(1).map((row) => rowToRecord(row, actualHeaders, request.table.headers));
      recordStage('sheet.readTableMs', Date.now() - startedAt);
      return result;
    },
    findRowsByColumn(request) {
      const startedAt = Date.now();
      const { sheet } = openLocatedSheet(
        deps,
        request.table,
        request.partitionKey,
        false,
        spreadsheetCache,
        sheetCache,
      );
      if (sheet === null) return [];

      recordIo('sheetFindCount');
      if (
        sheet.getLastRow !== undefined &&
        sheet.getLastColumn !== undefined &&
        sheet.getRange !== undefined &&
        sheet.getLastRow() > 1
      ) {
        const lastColumn = sheet.getLastColumn();
        const actualHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map((value) => String(value));
        const columnIndex = actualHeaders.indexOf(request.columnName);
        if (columnIndex === -1) return [];

        const finder = sheet
          .getRange(2, columnIndex + 1, sheet.getLastRow() - 1, 1)
          .createTextFinder?.(request.value)
          .matchEntireCell(true);
        const matchedCells = finder?.findAll() ?? [];
        const result =
          matchedCells.length > maxIndividualFindRowReads
            ? filterRowsByColumnFromFullScan(sheet, actualHeaders, request.table, columnIndex, request.value)
            : matchedCells.map((cell) => {
                recordIo('sheetFindRowReadCount');
                const row = sheet
                  .getRange?.(cell.getRow(), 1, 1, lastColumn)
                  .getValues()[0] ?? [];
                return rowToRecord(row, actualHeaders, request.table.headers);
              });
        recordIo('sheetFindRows', result.length);
        recordStage('sheet.findRowsByColumnMs', Date.now() - startedAt);
        return result;
      }

      const values = sheet.getDataRange().getValues();
      if (values.length === 0) return [];

      const actualHeaders = values[0].map((value) => String(value));
      const columnIndex = actualHeaders.indexOf(request.columnName);
      if (columnIndex === -1) return [];

      const matchedRows = values
        .slice(1)
        .filter((row) => String(row[columnIndex] ?? '') === request.value)
        .map((row) => rowToRecord(row, actualHeaders, request.table.headers));
      recordIo('sheetFindRows', matchedRows.length);
      recordIo('sheetFindFullScanCount');
      recordIo('sheetFindFullScanRows', Math.max(0, values.length - 1));
      recordStage('sheet.findRowsByColumnMs', Date.now() - startedAt);
      return matchedRows;
    },
    appendRows(request) {
      const startedAt = Date.now();
      const { sheet, created } = openLocatedSheet(
        deps,
        request.table,
        request.partitionKey,
        true,
        spreadsheetCache,
        sheetCache,
      );
      if (sheet === null) {
        throw new Error(`Cannot append to missing sheet ${request.table.sheetName}.`);
      }

      ensureHeaders(sheet, request.table, created);

      const serializedRows = request.rows.map((row) =>
        request.table.headers.map((column) => serializeCell(row[column.name], column)),
      );
      recordIo('sheetAppendCount');
      recordIo('sheetAppendRows', serializedRows.length);
      if (
        serializedRows.length > 0 &&
        sheet.getLastRow !== undefined &&
        sheet.getRange !== undefined
      ) {
        const targetRange = sheet.getRange(
          sheet.getLastRow() + 1,
          1,
          serializedRows.length,
          request.table.headers.length,
        );
        if (targetRange.setValues !== undefined) {
          targetRange.setValues(serializedRows);
        } else {
          for (const row of serializedRows) {
            sheet.appendRow(row);
          }
        }
      } else {
        for (const row of serializedRows) {
          sheet.appendRow(row);
        }
      }

      recordStage('sheet.appendRowsMs', Date.now() - startedAt);
      return { appendedRowCount: request.rows.length };
    },
  };
}

const maxIndividualFindRowReads = 5;

function openLocatedSheet(
  deps: SheetGatewayDependencies,
  table: TableDefinitionDTO,
  partitionKey: string | undefined,
  createIfMissing: boolean,
  spreadsheetCache: Map<string, SpreadsheetLike>,
  sheetCache: Map<string, SheetLike | null>,
): { sheet: SheetLike | null; created: boolean } {
  const location = deps.tableLocator({ table, partitionKey });
  const spreadsheet = openSpreadsheet(deps, location.spreadsheetId, spreadsheetCache);
  const sheetKey = `${location.spreadsheetId}:${location.sheetName}`;
  if (sheetCache.has(sheetKey)) {
    const cachedSheet = sheetCache.get(sheetKey) ?? null;
    if (cachedSheet !== null || !createIfMissing || spreadsheet.insertSheet === undefined) {
      return { sheet: cachedSheet, created: false };
    }

    const createdSheet = spreadsheet.insertSheet(location.sheetName);
    sheetCache.set(sheetKey, createdSheet);
    return { sheet: createdSheet, created: true };
  }

  const sheet = spreadsheet.getSheetByName(location.sheetName);
  if (sheet !== null) {
    sheetCache.set(sheetKey, sheet);
    return { sheet, created: false };
  }
  if (createIfMissing && spreadsheet.insertSheet !== undefined) {
    const createdSheet = spreadsheet.insertSheet(location.sheetName);
    sheetCache.set(sheetKey, createdSheet);
    return { sheet: createdSheet, created: true };
  }
  sheetCache.set(sheetKey, null);
  return { sheet: null, created: false };
}

function ensureHeaders(sheet: SheetLike, table: TableDefinitionDTO, created: boolean): void {
  if (!created) {
    if (sheet.getLastRow !== undefined) {
      if (sheet.getLastRow() > 0) return;
    } else if (sheet.getDataRange().getValues().length > 0) {
      return;
    }
  }

  sheet.appendRow(table.headers.map((column) => column.name));
}

function openSpreadsheet(
  deps: SheetGatewayDependencies,
  spreadsheetId: string,
  spreadsheetCache: Map<string, SpreadsheetLike>,
): SpreadsheetLike {
  const cached = spreadsheetCache.get(spreadsheetId);
  if (cached !== undefined) {
    recordIo('sheetOpenCacheHit');
    return cached;
  }

  const startedAt = Date.now();
  const spreadsheet = deps.spreadsheetApp.openById(spreadsheetId);
  spreadsheetCache.set(spreadsheetId, spreadsheet);
  recordIo('sheetOpenCount');
  recordStage('sheet.openSpreadsheetMs', Date.now() - startedAt);
  return spreadsheet;
}

function filterRowsByColumnFromFullScan(
  sheet: SheetLike,
  actualHeaders: readonly string[],
  table: TableDefinitionDTO,
  columnIndex: number,
  value: string,
): Record<string, unknown>[] {
  const values = sheet.getDataRange().getValues();
  recordIo('sheetFindFullScanCount');
  recordIo('sheetFindFullScanRows', Math.max(0, values.length - 1));
  return values
    .slice(1)
    .filter((row) => String(row[columnIndex] ?? '') === value)
    .map((row) => rowToRecord(row, actualHeaders, table.headers));
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
