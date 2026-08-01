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
  sheetsAdvancedService?: GoogleSheetsAdvancedService;
  deferAppends?: boolean;
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
  flushPendingAppends?(): void;
}

export interface GoogleSheetsAdvancedService {
  Spreadsheets: {
    Values: {
      batchUpdate(
        resource: {
          valueInputOption: 'RAW';
          data: Array<{
            range: string;
            majorDimension: 'ROWS';
            values: unknown[][];
          }>;
        },
        spreadsheetId: string,
      ): unknown;
    };
  };
}

interface PendingAppendGroup {
  spreadsheetId: string;
  sheetName: string;
  startRow: number;
  columnCount: number;
  rows: unknown[][];
}

interface AppendSheetState {
  headersEnsured: boolean;
  lastRow: number;
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
  const tableRecordCache = new Map<string, Record<string, unknown>[]>();
  const findRecordCache = new Map<string, Record<string, unknown>[]>();
  const pendingAppends = new Map<string, PendingAppendGroup>();
  const appendSheetStateCache = new Map<string, AppendSheetState>();

  const flushPendingAppends = () => {
    if (pendingAppends.size === 0) return;

    const startedAt = Date.now();
    const groups = [...pendingAppends.values()];
    pendingAppends.clear();

    const groupsBySpreadsheet = new Map<string, PendingAppendGroup[]>();
    for (const group of groups) {
      const existing = groupsBySpreadsheet.get(group.spreadsheetId) ?? [];
      existing.push(group);
      groupsBySpreadsheet.set(group.spreadsheetId, existing);
    }

    for (const [spreadsheetId, spreadsheetGroups] of groupsBySpreadsheet) {
      deps.sheetsAdvancedService?.Spreadsheets.Values.batchUpdate(
        {
          valueInputOption: 'RAW',
          data: spreadsheetGroups.map((group) => ({
            range: buildA1Range(group.sheetName, group.startRow, group.columnCount, group.rows.length),
            majorDimension: 'ROWS',
            values: group.rows,
          })),
        },
        spreadsheetId,
      );
      recordIo('sheetBatchAppendFlushCount');
      recordIo(
        'sheetBatchAppendFlushRows',
        spreadsheetGroups.reduce((total, group) => total + group.rows.length, 0),
      );
      recordIo('sheetBatchAppendFlushRanges', spreadsheetGroups.length);
    }

    recordStage('sheet.flushAppendsMs', Date.now() - startedAt);
  };

  return {
    readTable(request) {
      const startedAt = Date.now();
      const tableKey = getTableCacheKey(deps, request.table, request.partitionKey);
      const cachedRows = tableRecordCache.get(tableKey);
      if (cachedRows !== undefined) {
        recordIo('sheetReadCacheHit');
        recordStage('sheet.readTableMs', Date.now() - startedAt);
        return cachedRows.map(deepCloneRecord);
      }

      flushPendingAppends();

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
      tableRecordCache.set(tableKey, result.map(deepCloneRecord));
      recordStage('sheet.readTableMs', Date.now() - startedAt);
      return result;
    },
    findRowsByColumn(request) {
      const startedAt = Date.now();
      const tableKey = getTableCacheKey(deps, request.table, request.partitionKey);
      const findCacheKey = getFindCacheKey(tableKey, request.columnName, request.value);
      const cachedFindRows = findRecordCache.get(findCacheKey);
      if (cachedFindRows !== undefined) {
        recordIo('sheetFindCount');
        recordIo('sheetFindCacheHit');
        recordIo('sheetFindRows', cachedFindRows.length);
        recordStage('sheet.findRowsByColumnMs', Date.now() - startedAt);
        return cachedFindRows.map(deepCloneRecord);
      }

      const cachedRows = tableRecordCache.get(tableKey);
      if (cachedRows !== undefined) {
        const result = filterRecordsByColumn(cachedRows, request.columnName, request.value);
        findRecordCache.set(findCacheKey, result.map(deepCloneRecord));
        recordIo('sheetFindCount');
        recordIo('sheetFindCacheHit');
        recordIo('sheetFindRows', result.length);
        recordStage('sheet.findRowsByColumnMs', Date.now() - startedAt);
        return result;
      }

      flushPendingAppends();

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

        if (
          sheet.getLastRow() - 1 <= smallTableFullScanRowThreshold &&
          !isUniqueSingleColumnLookup(request.table, request.columnName)
        ) {
          const values = sheet.getDataRange().getValues();
          recordIo('sheetReadCount');
          recordIo('sheetReadRows', Math.max(0, values.length - 1));
          const rows = values.slice(1).map((row) => rowToRecord(row, actualHeaders, request.table.headers));
          tableRecordCache.set(tableKey, rows.map(deepCloneRecord));
          const result = filterRecordsByColumn(rows, request.columnName, request.value);
          findRecordCache.set(findCacheKey, result.map(deepCloneRecord));
          recordIo('sheetFindRows', result.length);
          recordIo('sheetFindSmallFullScanCount');
          recordStage('sheet.findRowsByColumnMs', Date.now() - startedAt);
          return result;
        }

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
        findRecordCache.set(findCacheKey, result.map(deepCloneRecord));
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
      findRecordCache.set(findCacheKey, matchedRows.map(deepCloneRecord));
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

      const location = deps.tableLocator({ table: request.table, partitionKey: request.partitionKey });
      const sheetKey = `${location.spreadsheetId}:${location.sheetName}`;
      const appendState = ensureHeaders(sheet, request.table, created, appendSheetStateCache, sheetKey);

      const serializedRows = request.rows.map((row) =>
        request.table.headers.map((column) => serializeCell(row[column.name], column)),
      );
      recordIo('sheetAppendCount');
      recordIo('sheetAppendRows', serializedRows.length);
      if (
        serializedRows.length > 0 &&
        sheet.getLastRow !== undefined &&
        deps.deferAppends === true &&
        deps.sheetsAdvancedService !== undefined
      ) {
        const location = deps.tableLocator({ table: request.table, partitionKey: request.partitionKey });
        const existingGroup = pendingAppends.get(sheetKey);
        if (existingGroup === undefined) {
          pendingAppends.set(sheetKey, {
            spreadsheetId: location.spreadsheetId,
            sheetName: location.sheetName,
            startRow: appendState.lastRow + 1,
            columnCount: request.table.headers.length,
            rows: serializedRows,
          });
        } else {
          existingGroup.rows.push(...serializedRows);
        }
        appendState.lastRow += serializedRows.length;
        recordIo('sheetAppendDeferredCount');
        recordIo('sheetAppendDeferredRows', serializedRows.length);
      } else if (
        serializedRows.length > 0 &&
        sheet.getLastRow !== undefined &&
        sheet.getRange !== undefined
      ) {
        const startRow = appendState.lastRow + 1;
        const targetRange = sheet.getRange(
          startRow,
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
        appendState.lastRow += serializedRows.length;
      } else {
        for (const row of serializedRows) {
          sheet.appendRow(row);
        }
        appendState.lastRow += serializedRows.length;
      }

      const tableKey = getTableCacheKey(deps, request.table, request.partitionKey);
      invalidateFindCacheForTable(findRecordCache, tableKey);
      const cachedRows = tableRecordCache.get(tableKey);
      if (cachedRows !== undefined) {
        cachedRows.push(...request.rows.map(deepCloneRecord));
      }

      recordStage('sheet.appendRowsMs', Date.now() - startedAt);
      return { appendedRowCount: request.rows.length };
    },
    flushPendingAppends,
  };
}

const maxIndividualFindRowReads = 5;
const smallTableFullScanRowThreshold = 500;

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

function ensureHeaders(
  sheet: SheetLike,
  table: TableDefinitionDTO,
  created: boolean,
  appendSheetStateCache: Map<string, AppendSheetState>,
  sheetKey: string,
): AppendSheetState {
  const cachedState = appendSheetStateCache.get(sheetKey);
  if (cachedState !== undefined) return cachedState;

  let lastRow: number | undefined;
  if (!created) {
    if (sheet.getLastRow !== undefined) {
      lastRow = sheet.getLastRow();
      if (lastRow > 0) {
        const state = { headersEnsured: true, lastRow };
        appendSheetStateCache.set(sheetKey, state);
        return state;
      }
    } else if (sheet.getDataRange().getValues().length > 0) {
      const state = { headersEnsured: true, lastRow: 0 };
      appendSheetStateCache.set(sheetKey, state);
      return state;
    }
  }

  sheet.appendRow(table.headers.map((column) => column.name));
  const state = { headersEnsured: true, lastRow: (lastRow ?? 0) + 1 };
  appendSheetStateCache.set(sheetKey, state);
  return state;
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

function getTableCacheKey(
  deps: SheetGatewayDependencies,
  table: TableDefinitionDTO,
  partitionKey: string | undefined,
): string {
  const location = deps.tableLocator({ table, partitionKey });
  return `${location.spreadsheetId}:${location.sheetName}`;
}

function getFindCacheKey(tableKey: string, columnName: string, value: string): string {
  return `${tableKey}\u0000${columnName}\u0000${value}`;
}

function invalidateFindCacheForTable(
  findRecordCache: Map<string, Record<string, unknown>[]>,
  tableKey: string,
): void {
  const prefix = `${tableKey}\u0000`;
  for (const key of findRecordCache.keys()) {
    if (key.startsWith(prefix)) findRecordCache.delete(key);
  }
}

function filterRecordsByColumn(
  rows: readonly Record<string, unknown>[],
  columnName: string,
  value: string,
): Record<string, unknown>[] {
  return rows.filter((row) => String(row[columnName] ?? '') === value).map(deepCloneRecord);
}

function isUniqueSingleColumnLookup(table: TableDefinitionDTO, columnName: string): boolean {
  return table.lookupKeys.some(
    (lookupKey) => lookupKey.unique && lookupKey.columns.length === 1 && lookupKey.columns[0] === columnName,
  );
}

function deepCloneRecord(record: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
}

function buildA1Range(sheetName: string, startRow: number, columnCount: number, rowCount: number): string {
  const endRow = startRow + rowCount - 1;
  return `'${sheetName.replace(/'/g, "''")}'!A${startRow}:${columnIndexToLetters(columnCount)}${endRow}`;
}

function columnIndexToLetters(columnIndex: number): string {
  let remaining = columnIndex;
  let result = '';
  while (remaining > 0) {
    const mod = (remaining - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    remaining = Math.floor((remaining - mod) / 26);
  }
  return result;
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
