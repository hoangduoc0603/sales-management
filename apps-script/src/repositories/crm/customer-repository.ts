import type { CustomerDTO } from '@shared/contracts/crm/customer';

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
