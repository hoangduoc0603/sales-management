import type { AuditEventDTO } from '@shared/contracts/operations/operations';
import type { OperationsRepository } from '../../repositories/operations/operations-repository';
import type {
  AuditOutboxRecord,
  AuditOutboxRepository,
} from '../../repositories/platform/audit-outbox-repository';

export interface AuditDeliveryChunkDependencies {
  auditOutboxRepository: AuditOutboxRepository;
  operationsRepository: Pick<OperationsRepository, 'listAuditLogs' | 'saveAuditLog'>;
  maxEvents: number;
}

export interface AuditDeliveryChunkResult {
  deliveredCount: number;
  failedCount: number;
  checkpointKey?: string;
}

export function runAuditDeliveryChunk(deps: AuditDeliveryChunkDependencies): AuditDeliveryChunkResult {
  const existingAuditLogIds = new Set(deps.operationsRepository.listAuditLogs().map((event) => event.eventId));
  const pendingEvents = deps.auditOutboxRepository
    .list()
    .filter((event) => event.status === 'Pending')
    .slice(0, deps.maxEvents);
  let deliveredCount = 0;
  let checkpointKey: string | undefined;

  for (const event of pendingEvents) {
    if (!existingAuditLogIds.has(event.eventId)) {
      deps.operationsRepository.saveAuditLog(auditLogFromOutbox(event));
      existingAuditLogIds.add(event.eventId);
    }
    deps.auditOutboxRepository.append({
      ...event,
      status: 'Delivered',
    });
    deliveredCount += 1;
    checkpointKey = event.eventId;
  }

  return {
    deliveredCount,
    failedCount: 0,
    checkpointKey,
  };
}

function auditLogFromOutbox(event: AuditOutboxRecord): AuditEventDTO {
  return {
    eventId: event.eventId,
    action: event.action,
    objectType: 'AuditOutbox',
    objectId: event.commandId,
    actorId: event.actorId,
    occurredAt: event.createdAt,
    result: 'Delivered',
    summary: {
      commandId: event.commandId,
      deliveryStatus: 'Delivered',
    },
  };
}
