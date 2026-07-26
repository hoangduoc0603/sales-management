import { describe, expect, it } from 'vitest';
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
    expect(coordinator.getAuditOutbox()).toHaveLength(1);
  });
});
