import { describe, expect, it } from 'vitest';
import { readPerformanceSnapshot, withPerformanceTracker } from '../../../apps-script/src/api/performance-tracker';
import type { CommandTransactionRecord } from '../../../apps-script/src/repositories/platform/command-repository';
import {
  createCommandCoordinator,
  createCommandCoordinatorForTest,
} from '../../../apps-script/src/services/platform/command/command-coordinator';
import { createImmediateLockProvider } from '../../../apps-script/src/infrastructure/platform/runtime';

describe('CommandCoordinator', () => {
  it('retry cùng idempotency key trả committed result cũ và không chạy handler lần hai', () => {
    const coordinator = createCommandCoordinatorForTest();
    let calls = 0;

    const first = coordinator.run(
      { commandId: 'cmd-1', idempotencyKey: 'sale-1' },
      () => {
        calls += 1;
        return { receiptId: 'receipt-1' };
      },
      { actorId: 'user-admin', action: 'test.command' },
    );
    const second = coordinator.run(
      { commandId: 'cmd-1', idempotencyKey: 'sale-1' },
      () => {
        calls += 1;
        return { receiptId: 'receipt-2' };
      },
      { actorId: 'user-admin', action: 'test.command' },
    );

    expect(first).toEqual(second);
    expect(calls).toBe(1);
    expect(coordinator.getStatus({ idempotencyKey: 'sale-1' })).toMatchObject({
      commandId: 'cmd-1',
      status: 'Committed',
    });
  });

  it('records command execution stages when a performance tracker is active', () => {
    const coordinator = createCommandCoordinatorForTest();

    const performance = withPerformanceTracker(() => {
      coordinator.run(
        { commandId: 'cmd-1', idempotencyKey: 'idem-1' },
        () => ({ ok: true }),
        { actorId: 'user-admin', action: 'test.command' },
      );
      return readPerformanceSnapshot();
    });

    expect(performance.stages['command.findExistingMs']).toBeGreaterThanOrEqual(0);
    expect(performance.stages['command.handlerMs']).toBeGreaterThanOrEqual(0);
    expect(performance.stages['command.appendCommittedMs']).toBeGreaterThanOrEqual(0);
    expect(performance.stages['command.totalWithLockMs']).toBeGreaterThanOrEqual(0);
    expect(performance.stages).not.toHaveProperty('command.auditAppendMs');
    expect(performance.stages).not.toHaveProperty('command.savePreparingMs');
  });

  it('skips durable idempotency preflight on fast path when cached lookup is available and misses', () => {
    const repository = new FastPathCommandRepository();
    const coordinator = createCommandCoordinator({
      commandRepository: repository,
      lockProvider: createImmediateLockProvider(),
      now: () => new Date('2026-07-27T00:00:00.000Z'),
      newId: (prefix) => `${prefix}-1`,
    });

    const result = coordinator.run(
      { commandId: 'cmd-fast-1', idempotencyKey: 'idem-fast-1' },
      () => ({ receiptId: 'receipt-fast-1' }),
      { actorId: 'user-admin', action: 'sales.pos.complete' },
    );

    expect(result).toEqual({ receiptId: 'receipt-fast-1' });
    expect(repository.cachedFindCalls).toEqual(['idem-fast-1']);
    expect(repository.durableFindCalls).toEqual([]);
    expect(repository.records).toHaveLength(1);
  });
});

class FastPathCommandRepository {
  readonly records: CommandTransactionRecord[] = [];
  readonly cachedFindCalls: string[] = [];
  readonly durableFindCalls: string[] = [];

  findCachedByIdempotencyKey(idempotencyKey: string): CommandTransactionRecord | undefined {
    this.cachedFindCalls.push(idempotencyKey);
    return undefined;
  }

  findByIdempotencyKey(idempotencyKey: string): CommandTransactionRecord | undefined {
    this.durableFindCalls.push(idempotencyKey);
    return this.records.find((record) => record.idempotencyKey === idempotencyKey);
  }

  findByCommandId(commandId: string): CommandTransactionRecord | undefined {
    return this.records.find((record) => record.commandId === commandId);
  }

  appendNew(record: CommandTransactionRecord): void {
    this.records.push(record);
  }

  save(record: CommandTransactionRecord): void {
    this.records.push(record);
  }
}
