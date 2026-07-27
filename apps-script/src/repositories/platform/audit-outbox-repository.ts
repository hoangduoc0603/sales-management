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
      return records.map((record) => ({ ...record }));
    },
  };
}

export function createSheetAuditOutboxRepository(deps: SheetAuditOutboxRepositoryDependencies): AuditOutboxRepository {
  const recordRepository = createAppendOnlySheetRecordRepository<AuditOutboxSheetRow>(deps);

  return {
    append(record) {
      recordRepository.append(toSheetRow(record));
    },
    list() {
      return recordRepository.list().map(fromSheetRow);
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

function toSheetRow(record: AuditOutboxRecord): AuditOutboxSheetRow {
  return {
    id: record.eventId,
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
