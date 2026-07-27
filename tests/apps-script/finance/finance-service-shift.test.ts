import { describe, expect, it } from 'vitest';
import { createInMemoryFinanceRepository } from '../../../apps-script/src/repositories/finance/finance-repository';
import { createFinanceService } from '../../../apps-script/src/services/finance/finance-service';

describe('FinanceService shift', () => {
  it('opens one shift per cashier and drawer at a time', () => {
    const { repository, service } = createService();

    const opened = service.openShift(openShiftInput());
    expect(opened).toMatchObject({
      ok: true,
      data: {
        shift: {
          status: 'Open',
          openingCashVnd: 500_000,
          expectedCashVnd: 500_000,
        },
      },
    });
    expect(repository.listCashTransactions()).toEqual([
      expect.objectContaining({
        transactionType: 'ShiftOpening',
        amountVnd: 500_000,
      }),
    ]);

    const duplicate = service.openShift(openShiftInput({ commandId: 'cmd-open-2', idempotencyKey: 'idem-open-2' }));
    expect(duplicate).toMatchObject({
      ok: false,
      error: { code: 'SHIFT_ALREADY_OPEN' },
    });
  });

  it('requires variance reason when closing shift with difference and locks closed shift', () => {
    const { repository, service } = createService();
    const opened = service.openShift(openShiftInput());
    if (!opened.ok) throw new Error('Expected open shift.');

    const missingReason = service.closeShift({
      commandId: 'cmd-close-1',
      idempotencyKey: 'idem-close-1',
      shiftId: opened.data.shift.shiftId,
      expectedCashVnd: 500_000,
      actualCashVnd: 510_000,
    });
    expect(missingReason).toMatchObject({
      ok: false,
      error: { code: 'SHIFT_VARIANCE_REASON_REQUIRED' },
    });

    const closed = service.closeShift({
      commandId: 'cmd-close-2',
      idempotencyKey: 'idem-close-2',
      shiftId: opened.data.shift.shiftId,
      expectedCashVnd: 500_000,
      actualCashVnd: 510_000,
      varianceReason: 'Lệch kiểm đếm cuối ca.',
    });
    expect(closed).toMatchObject({
      ok: true,
      data: { shift: { status: 'Closed', varianceVnd: 10_000 } },
    });

    const locked = service.lockShift({
      commandId: 'cmd-lock-1',
      idempotencyKey: 'idem-lock-1',
      shiftId: opened.data.shift.shiftId,
      approverId: 'manager-1',
    });
    expect(locked).toMatchObject({
      ok: true,
      data: { shift: { status: 'Locked' } },
    });
    expect(repository.getShift(opened.data.shift.shiftId)?.status).toBe('Locked');
  });
});

function createService() {
  const repository = createInMemoryFinanceRepository();
  const service = createFinanceService({
    repository,
    tenantId: 'tenant-default',
    now: () => new Date('2026-07-27T06:00:00.000Z'),
    newId: createSequentialId(),
  });
  return { repository, service };
}

function openShiftInput(overrides: Partial<Parameters<ReturnType<typeof createService>['service']['openShift']>[0]> = {}) {
  return {
    commandId: 'cmd-open-1',
    idempotencyKey: 'idem-open-1',
    branchId: 'branch-default',
    warehouseId: 'warehouse-default',
    cashDrawerId: 'drawer-main',
    cashierId: 'cashier-1',
    openingCashVnd: 500_000,
    ...overrides,
  };
}

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
