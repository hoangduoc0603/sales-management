import type { CommandStatus } from '@shared/contracts/platform/command';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
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
  findByIdempotencyKey(idempotencyKey: string): CommandTransactionRecord | undefined;
  findByCommandId(commandId: string): CommandTransactionRecord | undefined;
  save(record: CommandTransactionRecord): void;
}

export interface SheetCommandRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  partitionKey?: string;
}

export function createInMemoryCommandRepository(): CommandRepository {
  const byCommandId = new Map<string, CommandTransactionRecord>();

  return {
    findByIdempotencyKey(idempotencyKey) {
      return [...byCommandId.values()].find((record) => record.idempotencyKey === idempotencyKey);
    },
    findByCommandId(commandId) {
      return byCommandId.get(commandId);
    },
    save(record) {
      byCommandId.set(record.commandId, { ...record });
    },
  };
}

export function createSheetCommandRepository(deps: SheetCommandRepositoryDependencies): CommandRepository {
  const recordRepository = createAppendOnlySheetRecordRepository<CommandTransactionSheetRow>(deps);

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

  return {
    findByIdempotencyKey(idempotencyKey) {
      return listLatest().find((record) => record.idempotencyKey === idempotencyKey);
    },
    findByCommandId(commandId) {
      return listLatest().find((record) => record.commandId === commandId);
    },
    save(record) {
      const existingRows = recordRepository.list().filter((row) => row.commandId === record.commandId);
      const nextVersion = existingRows.reduce((maxVersion, row) => Math.max(maxVersion, parseVersion(row.id)), 0) + 1;
      recordRepository.append(toSheetRow(record, nextVersion));
    },
  };
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
