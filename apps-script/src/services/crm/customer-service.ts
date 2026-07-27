import type {
  CustomerDTO,
  CustomerDuplicateWarningDTO,
  CustomerQuickCreateRequest,
  CustomerQuickCreateResponse,
  CustomerSearchRequest,
  CustomerSearchResponse,
} from '@shared/contracts/crm/customer';
import type { CustomerRepository } from '../../repositories/crm/customer-repository';

export interface CustomerService {
  quickCreate(input: CustomerQuickCreateRequest): CustomerQuickCreateResponse;
  search(input: CustomerSearchRequest): CustomerSearchResponse;
}

export interface CustomerServiceDependencies {
  repository: CustomerRepository;
  tenantId: string;
  newId(prefix: string): string;
}

export function createCustomerService(deps: CustomerServiceDependencies): CustomerService {
  return {
    quickCreate(input) {
      const phoneNormalized = input.phone === undefined ? undefined : normalizePhone(input.phone);
      const emailNormalized = input.email === undefined ? undefined : normalizeEmail(input.email);
      const duplicateWarnings = collectDuplicateWarnings(deps.repository, phoneNormalized, emailNormalized);

      if (duplicateWarnings.length > 0) {
        return { duplicateWarnings };
      }

      const customer: CustomerDTO = {
        customerId: deps.newId('customer'),
        tenantId: deps.tenantId,
        customerCode: deps.newId('CUS').toLocaleUpperCase('vi-VN'),
        displayName: input.displayName.trim(),
        phone: input.phone?.trim(),
        phoneNormalized,
        email: input.email?.trim(),
        emailNormalized,
        customerGroupId: input.customerGroupId?.trim(),
        status: 'Active',
      };
      deps.repository.saveCustomer(customer);

      return {
        customer,
        duplicateWarnings: [],
      };
    },
    search(input) {
      const query = normalizeText(input.query);

      return {
        customers: deps.repository
          .listCustomers()
          .filter((customer) => customer.status === 'Active')
          .filter((customer) =>
            [
              customer.displayName,
              customer.phoneNormalized,
              customer.emailNormalized,
              customer.customerCode,
            ]
              .filter((value): value is string => value !== undefined)
              .some((value) => normalizeText(value).includes(query)),
          ),
      };
    },
  };
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase('vi-VN');
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('vi-VN');
}

function collectDuplicateWarnings(
  repository: CustomerRepository,
  phoneNormalized: string | undefined,
  emailNormalized: string | undefined,
): CustomerDuplicateWarningDTO[] {
  const warnings: CustomerDuplicateWarningDTO[] = [];
  const phoneDuplicate =
    phoneNormalized === undefined ? undefined : repository.findByPhoneNormalized(phoneNormalized);
  const emailDuplicate =
    emailNormalized === undefined ? undefined : repository.findByEmailNormalized(emailNormalized);

  if (phoneDuplicate !== undefined) {
    warnings.push({
      field: 'phone',
      customerId: phoneDuplicate.customerId,
      displayName: phoneDuplicate.displayName,
    });
  }

  if (emailDuplicate !== undefined && emailDuplicate.customerId !== phoneDuplicate?.customerId) {
    warnings.push({
      field: 'email',
      customerId: emailDuplicate.customerId,
      displayName: emailDuplicate.displayName,
    });
  } else if (emailDuplicate !== undefined) {
    warnings.push({
      field: 'email',
      customerId: emailDuplicate.customerId,
      displayName: emailDuplicate.displayName,
    });
  }

  return warnings;
}
