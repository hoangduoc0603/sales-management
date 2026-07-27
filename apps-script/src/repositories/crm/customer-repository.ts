import type { CustomerDTO } from '@shared/contracts/crm/customer';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { AppendOnlySheetRecordGateway } from '../platform/sheet-record-repository';

export interface CustomerRepository {
  findByPhoneNormalized(phoneNormalized: string): CustomerDTO | undefined;
  findByEmailNormalized(emailNormalized: string): CustomerDTO | undefined;
  listCustomers(): readonly CustomerDTO[];
  saveCustomer(customer: CustomerDTO): void;
}

export function createInMemoryCustomerRepository(): CustomerRepository {
  const customers = new Map<string, CustomerDTO>();

  return {
    findByPhoneNormalized(phoneNormalized) {
      return [...customers.values()].find(
        (customer) => customer.phoneNormalized === phoneNormalized && customer.status === 'Active',
      );
    },
    findByEmailNormalized(emailNormalized) {
      return [...customers.values()].find(
        (customer) => customer.emailNormalized === emailNormalized && customer.status === 'Active',
      );
    },
    listCustomers: () => [...customers.values()].map(clone),
    saveCustomer(customer) {
      customers.set(customer.customerId, clone(customer));
    },
  };
}

function clone<T>(value: T): T {
  return { ...value };
}

export interface SheetCustomerRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
}

export function createSheetCustomerRepository(deps: SheetCustomerRepositoryDependencies): CustomerRepository {
  const table = findTable(deps.tableDefinitions, 'Customer');

  function readRows(): CustomerRow[] {
    return deps.gateway.readTable({ table }).map((row) => deepClone(row) as CustomerRow);
  }

  function listLatestCustomers(): CustomerDTO[] {
    const latestByCustomerId = new Map<string, CustomerRow>();
    for (const row of readRows()) {
      const customerId = String(row.customerId ?? '');
      if (customerId === '') continue;
      const current = latestByCustomerId.get(customerId);
      if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) {
        latestByCustomerId.set(customerId, row);
      }
    }
    return [...latestByCustomerId.values()].map(customerFromRow);
  }

  return {
    findByPhoneNormalized(phoneNormalized) {
      return listLatestCustomers().find(
        (customer) => customer.phoneNormalized === phoneNormalized && customer.status === 'Active',
      );
    },
    findByEmailNormalized(emailNormalized) {
      return listLatestCustomers().find(
        (customer) => customer.emailNormalized === emailNormalized && customer.status === 'Active',
      );
    },
    listCustomers: () => listLatestCustomers(),
    saveCustomer(customer) {
      const nextVersion =
        readRows()
          .filter((row) => row.customerId === customer.customerId)
          .reduce((max, row) => Math.max(max, getRecordVersion(row)), 0) + 1;
      deps.gateway.appendRows({
        table,
        rows: [
          {
            ...deepClone(customer),
            id: `${customer.customerId}:v${nextVersion}`,
            schemaVersion: table.schemaVersion,
            recordVersion: nextVersion,
          },
        ],
      });
    },
  };
}

type CustomerRow = Record<string, unknown> & {
  id?: string;
  recordVersion?: number;
  customerId?: string;
};

function customerFromRow(row: CustomerRow): CustomerDTO {
  const customer: CustomerDTO = {
    customerId: String(row.customerId),
    tenantId: String(row.tenantId),
    customerCode: String(row.customerCode),
    displayName: String(row.displayName),
    status: row.status as CustomerDTO['status'],
  };
  assignOptionalString(customer, 'phone', row.phone);
  assignOptionalString(customer, 'phoneNormalized', row.phoneNormalized);
  assignOptionalString(customer, 'email', row.email);
  assignOptionalString(customer, 'emailNormalized', row.emailNormalized);
  assignOptionalString(customer, 'customerGroupId', row.customerGroupId);
  assignOptionalString(customer, 'mergedIntoCustomerId', row.mergedIntoCustomerId);
  return customer;
}

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) throw new Error(`Missing CRM table definition: ${tableName}`);
  return table;
}

function getRecordVersion(row: CustomerRow): number {
  const parsed = typeof row.recordVersion === 'number' ? row.recordVersion : Number(row.recordVersion);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const match = /:v(\d+)/.exec(String(row.id ?? ''));
  return match === null ? 0 : Number(match[1]);
}

function assignOptionalString<TRecord extends object>(
  record: TRecord,
  key: keyof TRecord & string,
  value: unknown,
): void {
  if (value !== undefined && value !== null && value !== '') {
    (record as Record<string, unknown>)[key] = String(value);
  }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
