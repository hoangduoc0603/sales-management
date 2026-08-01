import { describe, expect, it } from 'vitest';
import { readPerformanceSnapshot, withPerformanceTracker } from '../../../apps-script/src/api/performance-tracker';
import { createCommandCoordinatorForTest } from '../../../apps-script/src/services/platform/command/command-coordinator';

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
});
