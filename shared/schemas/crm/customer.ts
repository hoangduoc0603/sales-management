import { z } from 'zod';
import type {
  CustomerQuickCreateRequest,
  CustomerSearchRequest,
} from '@shared/contracts/crm/customer';

const nonEmptyTrimmed = z.string().trim().min(1);
const optionalNonEmptyTrimmed = z.string().trim().min(1).optional();

export const customerQuickCreateRequestSchema = z
  .object({
    displayName: nonEmptyTrimmed,
    phone: optionalNonEmptyTrimmed,
    email: optionalNonEmptyTrimmed,
    customerGroupId: optionalNonEmptyTrimmed,
  })
  .strict();

export function parseCustomerQuickCreateRequest(value: unknown): CustomerQuickCreateRequest {
  return customerQuickCreateRequestSchema.parse(value);
}

export const customerSearchRequestSchema = z
  .object({
    query: nonEmptyTrimmed,
  })
  .strict();

export function parseCustomerSearchRequest(value: unknown): CustomerSearchRequest {
  return customerSearchRequestSchema.parse(value);
}
