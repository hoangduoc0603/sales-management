import { describe, expect, it } from 'vitest';
import type { CustomerDTO } from '../../../shared/contracts/crm/customer';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';
import { createSheetCustomerRepository } from '../../../apps-script/src/repositories/crm/customer-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('Sheet-backed CustomerRepository', () => {
  it('persists customers as versioned records and searches active normalized contact fields', () => {
    const gateway = new FakeSheetGateway({
      Customer: [
        { ...customerFixture, id: 'customer-1:v1', schemaVersion: 1, recordVersion: 1, displayName: 'Tên cũ' },
        { ...customerFixture, id: 'customer-1:v2', schemaVersion: 1, recordVersion: 2 },
        { ...disabledCustomerFixture, id: 'customer-2:v1', schemaVersion: 1, recordVersion: 1 },
      ],
    });
    const repository = createSheetCustomerRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
    });

    repository.saveCustomer(newCustomerFixture);

    expect(repository.listCustomers()).toEqual([customerFixture, disabledCustomerFixture, newCustomerFixture]);
    expect(repository.findByPhoneNormalized('0900000000')).toEqual(customerFixture);
    expect(repository.findByEmailNormalized('a@example.com')).toEqual(customerFixture);
    expect(repository.findByPhoneNormalized('0911111111')).toBeUndefined();
    expect(gateway.appendRequests).toEqual([
      {
        tableName: 'Customer',
        partitionKey: undefined,
        rows: [
          expect.objectContaining({
            id: 'customer-3:v1',
            tenantId: 'tenant-default',
            schemaVersion: 1,
            recordVersion: 1,
            customerId: 'customer-3',
            phoneNormalized: '0922222222',
          }),
        ],
      },
    ]);
  });
});

const customerFixture: CustomerDTO = {
  customerId: 'customer-1',
  tenantId: 'tenant-default',
  customerCode: 'C001',
  displayName: 'Nguyễn An',
  phone: '0900000000',
  phoneNormalized: '0900000000',
  email: 'a@example.com',
  emailNormalized: 'a@example.com',
  customerGroupId: 'retail',
  status: 'Active',
};

const disabledCustomerFixture: CustomerDTO = {
  customerId: 'customer-2',
  tenantId: 'tenant-default',
  customerCode: 'C002',
  displayName: 'Khách đã khóa',
  phone: '0911111111',
  phoneNormalized: '0911111111',
  status: 'Disabled',
};

const newCustomerFixture: CustomerDTO = {
  customerId: 'customer-3',
  tenantId: 'tenant-default',
  customerCode: 'C003',
  displayName: 'Khách mới',
  phone: '0922222222',
  phoneNormalized: '0922222222',
  status: 'Active',
};

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  constructor(seed: Record<string, Record<string, unknown>[]> = {}) {
    for (const [tableName, rows] of Object.entries(seed)) {
      this.rowsByTable.set(tableName, rows.map(clone));
    }
  }

  readTable(request: { table: TableDefinitionDTO }): Record<string, unknown>[] {
    return this.getRows(request.table.tableName).map(clone);
  }

  appendRows(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    rows: readonly Record<string, unknown>[];
  }): { appendedRowCount: number } {
    const rows = request.rows.map(clone);
    this.appendRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey, rows });
    this.getRows(request.table.tableName).push(...rows);
    return { appendedRowCount: rows.length };
  }

  private getRows(tableName: string): Record<string, unknown>[] {
    let rows = this.rowsByTable.get(tableName);
    if (rows === undefined) {
      rows = [];
      this.rowsByTable.set(tableName, rows);
    }
    return rows;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
