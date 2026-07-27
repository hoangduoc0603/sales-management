import { describe, expect, it } from 'vitest';
import { createInMemoryCustomerRepository } from '../../../apps-script/src/repositories/crm/customer-repository';
import { createCustomerService } from '../../../apps-script/src/services/crm/customer-service';

function createService() {
  let sequence = 0;

  return createCustomerService({
    repository: createInMemoryCustomerRepository(),
    tenantId: 'tenant-default',
    newId(prefix) {
      sequence += 1;
      return `${prefix}-${sequence}`;
    },
  });
}

describe('CustomerService', () => {
  it('quick create chuẩn hóa phone/email và search được theo phone/name', () => {
    const service = createService();

    const created = service.quickCreate({
      displayName: 'Trần Thị Hồng Nhung',
      phone: '0909 482 176',
      email: 'NHUNG@example.com',
      customerGroupId: 'retail',
    });

    expect(created.duplicateWarnings).toEqual([]);
    expect(created.customer).toMatchObject({
      displayName: 'Trần Thị Hồng Nhung',
      phoneNormalized: '0909482176',
      emailNormalized: 'nhung@example.com',
      customerGroupId: 'retail',
    });

    expect(service.search({ query: '0909482176' }).customers).toHaveLength(1);
    expect(service.search({ query: 'hồng nhung' }).customers[0]?.displayName).toBe('Trần Thị Hồng Nhung');
  });

  it('duplicate phone/email trả cảnh báo và không tạo hồ sơ mới âm thầm', () => {
    const service = createService();

    const first = service.quickCreate({
      displayName: 'Trần Thị Hồng Nhung',
      phone: '0909 482 176',
      email: 'nhung@example.com',
    });
    expect(first.customer).toBeDefined();

    const duplicate = service.quickCreate({
      displayName: 'Nhung duplicate',
      phone: '0909482176',
      email: 'NHUNG@example.com',
    });

    expect(duplicate.customer).toBeUndefined();
    expect(duplicate.duplicateWarnings).toEqual([
      {
        field: 'phone',
        customerId: first.customer?.customerId,
        displayName: 'Trần Thị Hồng Nhung',
      },
      {
        field: 'email',
        customerId: first.customer?.customerId,
        displayName: 'Trần Thị Hồng Nhung',
      },
    ]);
  });
});
