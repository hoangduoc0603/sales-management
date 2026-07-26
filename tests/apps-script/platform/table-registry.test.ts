import { describe, expect, it } from 'vitest';
import { createTableRegistryServiceForTest } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('TableRegistryService', () => {
  it('tạo header map theo tên cột thay vì index hard-code', () => {
    const service = createTableRegistryServiceForTest();
    expect(service.createHeaderMap('CommandTransaction', ['status', 'id', 'commandId'])).toEqual({
      status: 0,
      id: 1,
      commandId: 2,
    });
  });

  it('migration chỉ append cột thiếu theo registry', () => {
    const service = createTableRegistryServiceForTest();
    expect(service.planMigration('CommandTransaction', ['id', 'commandId'])).toEqual({
      action: 'appendColumns',
      missingHeaders: ['idempotencyKey', 'status', 'createdAt', 'updatedAt', 'resultJson'],
    });
  });
});
