import { describe, expect, it } from 'vitest';
import { createInMemoryOperationsRepository } from '../../../apps-script/src/repositories/operations/operations-repository';
import { createInMemoryAuditOutboxRepository } from '../../../apps-script/src/repositories/platform/audit-outbox-repository';
import { runAuditDeliveryChunk } from '../../../apps-script/src/services/operations/audit-delivery-worker';

describe('Audit delivery worker', () => {
  it('copies pending AuditOutbox events to AuditLog idempotently and marks latest outbox state delivered', () => {
    const operationsRepository = createInMemoryOperationsRepository();
    const auditOutboxRepository = createInMemoryAuditOutboxRepository();
    auditOutboxRepository.append({
      eventId: 'audit-1',
      commandId: 'cmd-1',
      actorId: 'user-admin',
      action: 'sales.checkout.complete',
      status: 'Pending',
      createdAt: '2026-07-27T09:00:00.000Z',
    });
    auditOutboxRepository.append({
      eventId: 'audit-2',
      commandId: 'cmd-2',
      actorId: 'user-admin',
      action: 'finance.payment.record',
      status: 'Pending',
      createdAt: '2026-07-27T09:01:00.000Z',
    });
    operationsRepository.saveAuditLog({
      eventId: 'audit-2',
      action: 'finance.payment.record',
      objectType: 'AuditOutbox',
      objectId: 'cmd-2',
      actorId: 'user-admin',
      occurredAt: '2026-07-27T09:01:00.000Z',
      result: 'Delivered',
      summary: { commandId: 'cmd-2' },
    });

    const first = runAuditDeliveryChunk({
      auditOutboxRepository,
      operationsRepository,
      maxEvents: 10,
    });
    const second = runAuditDeliveryChunk({
      auditOutboxRepository,
      operationsRepository,
      maxEvents: 10,
    });

    expect(first).toEqual({ deliveredCount: 2, failedCount: 0, checkpointKey: 'audit-2' });
    expect(second).toEqual({ deliveredCount: 0, failedCount: 0, checkpointKey: undefined });
    expect(operationsRepository.listAuditLogs().map((event) => event.eventId).sort()).toEqual([
      'audit-1',
      'audit-2',
    ]);
    expect(auditOutboxRepository.list()).toEqual([
      expect.objectContaining({ eventId: 'audit-1', status: 'Delivered' }),
      expect.objectContaining({ eventId: 'audit-2', status: 'Delivered' }),
    ]);
    expect(JSON.stringify(operationsRepository.listAuditLogs())).not.toContain('password');
    expect(JSON.stringify(operationsRepository.listAuditLogs())).not.toContain('token');
  });
});
