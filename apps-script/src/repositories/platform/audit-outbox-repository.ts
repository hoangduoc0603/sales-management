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
