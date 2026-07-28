import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import {
  createAppendOnlySheetRecordRepository,
  type AppendOnlySheetRecordGateway,
} from './sheet-record-repository';

export interface AuditOutboxRecord {
  eventId: string;
  commandId: string;
  actorId: string;
  action: string;
  status: 'Pending' | 'Delivered' | 'Failed';
  createdAt: string;
}

export interface AuditOutboxRepository {
  append(record: AuditOutboxRecord): void;
  list(): readonly AuditOutboxRecord[];
}

export interface SheetAuditOutboxRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  partitionKey?: string;
}

export function createInMemoryAuditOutboxRepository(): AuditOutboxRepository {
  const records: AuditOutboxRecord[] = [];

  return {
    append(record) {
      records.push({ ...record });
    },
    list() {
      return latestRecords(records).map((record) => ({ ...record }));
    },
  };
}

export function createSheetAuditOutboxRepository(deps: SheetAuditOutboxRepositoryDependencies): AuditOutboxRepository {
  const recordRepository = createAppendOnlySheetRecordRepository<AuditOutboxSheetRow>(deps);

  return {
    append(record) {
      const existingRows = recordRepository.list().filter((row) => row.eventId === record.eventId);
      const nextVersion = existingRows.reduce((maxVersion, row) => Math.max(maxVersion, parseVersion(row.id)), 0) + 1;
      recordRepository.append(toSheetRow(record, nextVersion));
    },
    list() {
      return latestRows(recordRepository.list()).map(fromSheetRow);
    },
  };
}

interface AuditOutboxSheetRow extends Record<string, unknown> {
  id: string;
  eventId: string;
  commandId: string;
  actorId: string;
  action: string;
  status: AuditOutboxRecord['status'];
  createdAt: string;
}

function toSheetRow(record: AuditOutboxRecord, version: number): AuditOutboxSheetRow {
  return {
    id: `${record.eventId}:v${version}`,
    eventId: record.eventId,
    commandId: record.commandId,
    actorId: record.actorId,
    action: record.action,
    status: record.status,
    createdAt: record.createdAt,
  };
}

function fromSheetRow(record: AuditOutboxSheetRow): AuditOutboxRecord {
  return {
    eventId: record.eventId,
    commandId: record.commandId,
    actorId: record.actorId,
    action: record.action,
    status: record.status,
    createdAt: record.createdAt,
  };
}

function latestRecords(records: readonly AuditOutboxRecord[]): AuditOutboxRecord[] {
  const latestByEventId = new Map<string, AuditOutboxRecord>();
  for (const record of records) {
    latestByEventId.set(record.eventId, record);
  }
  return [...latestByEventId.values()];
}

function latestRows(rows: readonly AuditOutboxSheetRow[]): AuditOutboxSheetRow[] {
  const latestByEventId = new Map<string, AuditOutboxSheetRow>();
  for (const row of rows) {
    const current = latestByEventId.get(row.eventId);
    if (current === undefined || parseVersion(row.id) > parseVersion(current.id)) {
      latestByEventId.set(row.eventId, row);
    }
  }
  return [...latestByEventId.values()];
}

function parseVersion(rowId: string): number {
  const match = /:v(\d+)$/.exec(rowId);
  return match === null ? 0 : Number(match[1]);
}
