import { describe, expect, it } from 'vitest';
import {
  getWarmupTriggerStatus,
  installWarmupTrigger,
  removeWarmupTriggers,
} from '../../../apps-script/src/infrastructure/google-workspace/warmup-trigger-manager';

describe('warm-up trigger manager', () => {
  it('cài đúng một trigger warmRuntime_ mỗi 5 phút và xoá duplicate cũ', () => {
    const scriptApp = new FakeScriptApp([
      new FakeTrigger('warmRuntime_'),
      new FakeTrigger('warmRuntime_'),
      new FakeTrigger('scheduledWorker_'),
      new FakeTrigger('warmRuntime_'),
    ]);

    const result = installWarmupTrigger({ scriptApp });

    expect(result).toEqual({
      handlerName: 'warmRuntime_',
      intervalMinutes: 5,
      removedCount: 3,
      triggerCount: 1,
    });
    expect(scriptApp.triggers.map((trigger) => trigger.getHandlerFunction())).toEqual([
      'scheduledWorker_',
      'warmRuntime_',
    ]);
    expect(scriptApp.createdIntervals).toEqual([5]);
  });

  it('chỉ xoá warm-up trigger và giữ scheduled worker trigger khác', () => {
    const scriptApp = new FakeScriptApp([
      new FakeTrigger('warmRuntime_'),
      new FakeTrigger('scheduledWorker_'),
    ]);

    const result = removeWarmupTriggers({ scriptApp });

    expect(result).toEqual({
      handlerName: 'warmRuntime_',
      removedCount: 1,
      triggerCount: 0,
    });
    expect(scriptApp.triggers.map((trigger) => trigger.getHandlerFunction())).toEqual(['scheduledWorker_']);
  });

  it('trả trạng thái trigger hiện tại để kiểm tra trong Apps Script editor', () => {
    const scriptApp = new FakeScriptApp([
      new FakeTrigger('warmRuntime_'),
      new FakeTrigger('scheduledWorker_'),
    ]);

    expect(getWarmupTriggerStatus({ scriptApp })).toEqual({
      handlerName: 'warmRuntime_',
      intervalMinutes: 5,
      triggerCount: 1,
    });
  });
});

class FakeScriptApp {
  readonly createdIntervals: number[] = [];

  constructor(readonly triggers: FakeTrigger[]) {}

  getProjectTriggers(): FakeTrigger[] {
    return this.triggers;
  }

  deleteTrigger(trigger: FakeTrigger): void {
    const index = this.triggers.indexOf(trigger);
    if (index >= 0) this.triggers.splice(index, 1);
  }

  newTrigger(handlerName: string): FakeTriggerBuilder {
    return new FakeTriggerBuilder(this, handlerName);
  }
}

class FakeTriggerBuilder {
  private intervalMinutes = 0;

  constructor(
    private readonly scriptApp: FakeScriptApp,
    private readonly handlerName: string,
  ) {}

  timeBased(): FakeTriggerBuilder {
    return this;
  }

  everyMinutes(intervalMinutes: number): FakeTriggerBuilder {
    this.intervalMinutes = intervalMinutes;
    return this;
  }

  create(): FakeTrigger {
    this.scriptApp.createdIntervals.push(this.intervalMinutes);
    const trigger = new FakeTrigger(this.handlerName);
    this.scriptApp.triggers.push(trigger);
    return trigger;
  }
}

class FakeTrigger {
  constructor(private readonly handlerName: string) {}

  getHandlerFunction(): string {
    return this.handlerName;
  }
}
