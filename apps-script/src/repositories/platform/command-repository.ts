import type { CommandStatus } from '@shared/contracts/platform/command';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { PlatformCacheStore } from '../../infrastructure/platform/cache';
import {
  createAppendOnlySheetRecordRepository,
  type AppendOnlySheetRecordGateway,
} from './sheet-record-repository';

export interface CommandTransactionRecord {
  commandId: string;
  idempotencyKey: string;
  status: CommandStatus;
  resultJson?: string;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommandRepository {
  findCachedByIdempotencyKey?(idempotencyKey: string): CommandTransactionRecord | undefined;
  findByIdempotencyKey(idempotencyKey: string): CommandTransactionRecord | undefined;
  findByCommandId(commandId: string): CommandTransactionRecord | undefined;
  appendNew(record: CommandTransactionRecord): void;
  save(record: CommandTransactionRecord): void;
}

export interface SheetCommandRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  partitionKey?: string;
  cacheStore?: PlatformCacheStore;
}

export function createInMemoryCommandRepository(): CommandRepository {
  const byCommandId = new Map<string, CommandTransactionRecord>();

  return {
    findCachedByIdempotencyKey(idempotencyKey) {
      return [...byCommandId.values()].find((record) => record.idempotencyKey === idempotencyKey);
    },
    findByIdempotencyKey(idempotencyKey) {
      return [...byCommandId.values()].find((record) => record.idempotencyKey === idempotencyKey);
    },
    findByCommandId(commandId) {
      return byCommandId.get(commandId);
    },
    appendNew(record) {
      byCommandId.set(record.commandId, { ...record });
    },
    save(record) {
      byCommandId.set(record.commandId, { ...record });
    },
  };
}

export function createSheetCommandRepository(deps: SheetCommandRepositoryDependencies): CommandRepository {
  const recordRepository = createAppendOnlySheetRecordRepository<CommandTransactionSheetRow>(deps);

  function findRowsByColumn(columnName: string, value: string): CommandTransactionSheetRow[] {
    const rows =
      deps.gateway.findRowsByColumn?.({
        table: deps.table,
        partitionKey: deps.partitionKey,
        columnName,
        value,
      }) ?? deps.gateway.readTable({ table: deps.table, partitionKey: deps.partitionKey });
    return rows
      .filter((row) => String(row[columnName] ?? '') === value)
      .map((row) => row as CommandTransactionSheetRow);
  }

  function listLatest(): CommandTransactionRecord[] {
    const latestByCommandId = new Map<string, CommandTransactionSheetRow>();
    for (const row of recordRepository.list()) {
      const current = latestByCommandId.get(row.commandId);
      if (current === undefined || compareCommandRows(row, current) > 0) {
        latestByCommandId.set(row.commandId, row);
      }
    }
    return [...latestByCommandId.values()].map(fromSheetRow);
  }

  function latestFromRows(rows: readonly CommandTransactionSheetRow[]): CommandTransactionRecord | undefined {
    let latest: CommandTransactionSheetRow | undefined;
    for (const row of rows) {
      if (latest === undefined || compareCommandRows(row, latest) > 0) latest = row;
    }
    return latest === undefined ? undefined : fromSheetRow(latest);
  }

  return {
    findCachedByIdempotencyKey:
      deps.cacheStore === undefined
        ? undefined
        : (idempotencyKey) => readCachedCommand(deps.cacheStore, idempotencyKey),
    findByIdempotencyKey(idempotencyKey) {
      if (deps.gateway.findRowsByColumn !== undefined) {
        return latestFromRows(findRowsByColumn('idempotencyKey', idempotencyKey));
      }
      return listLatest().find((record) => record.idempotencyKey === idempotencyKey);
    },
    findByCommandId(commandId) {
      if (deps.gateway.findRowsByColumn !== undefined) {
        return latestFromRows(findRowsByColumn('commandId', commandId));
      }
      return listLatest().find((record) => record.commandId === commandId);
    },
    appendNew(record) {
      deps.gateway.appendRows({
        table: deps.table,
        partitionKey: deps.partitionKey,
        rows: [toSheetRow(record, 1)],
      });
      cacheCommand(deps.cacheStore, record);
    },
    save(record) {
      const existingRows =
        deps.gateway.findRowsByColumn !== undefined
          ? findRowsByColumn('commandId', record.commandId)
          : recordRepository.list().filter((row) => row.commandId === record.commandId);
      const nextVersion = existingRows.reduce((maxVersion, row) => Math.max(maxVersion, parseVersion(row.id)), 0) + 1;
      recordRepository.append(toSheetRow(record, nextVersion));
      cacheCommand(deps.cacheStore, record);
    },
  };
}

const commandCacheTtlSeconds = 21_600;
const maxCommandCachePayloadBytes = 90_000;

function cacheCommand(cacheStore: PlatformCacheStore | undefined, record: CommandTransactionRecord): void {
  if (cacheStore === undefined) return;
  const payload = JSON.stringify(record);
  if (payload.length > maxCommandCachePayloadBytes) return;
  cacheStore.put(commandCacheKey(record.idempotencyKey), payload, commandCacheTtlSeconds);
}

function readCachedCommand(
  cacheStore: PlatformCacheStore | undefined,
  idempotencyKey: string,
): CommandTransactionRecord | undefined {
  if (cacheStore === undefined) return undefined;
  const key = commandCacheKey(idempotencyKey);
  const raw = cacheStore.get(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as CommandTransactionRecord;
  } catch {
    cacheStore.remove(key);
    return undefined;
  }
}

function commandCacheKey(idempotencyKey: string): string {
  return `command:idempotency:${idempotencyKey}`;
}

interface CommandTransactionSheetRow extends Record<string, unknown> {
  id: string;
  commandId: string;
  idempotencyKey: string;
  status: CommandStatus;
  resultJson?: string;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}

function toSheetRow(record: CommandTransactionRecord, version: number): CommandTransactionSheetRow {
  return {
    id: `${record.commandId}:v${version}`,
    commandId: record.commandId,
    idempotencyKey: record.idempotencyKey,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    resultJson: record.resultJson,
    errorCode: record.errorCode,
  };
}

function fromSheetRow(row: CommandTransactionSheetRow): CommandTransactionRecord {
  return {
    commandId: row.commandId,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    resultJson: row.resultJson,
    errorCode: row.errorCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function compareCommandRows(left: CommandTransactionSheetRow, right: CommandTransactionSheetRow): number {
  const byUpdatedAt = left.updatedAt.localeCompare(right.updatedAt);
  if (byUpdatedAt !== 0) return byUpdatedAt;
  return parseVersion(left.id) - parseVersion(right.id);
}

function parseVersion(rowId: string): number {
  const match = /:v(\d+)$/.exec(rowId);
  return match === null ? 0 : Number(match[1]);
}
