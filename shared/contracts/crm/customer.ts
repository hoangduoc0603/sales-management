export interface CustomerDTO {
  customerId: string;
  tenantId: string;
  customerCode: string;
  displayName: string;
  phone?: string;
  phoneNormalized?: string;
  email?: string;
  emailNormalized?: string;
  customerGroupId?: string;
  status: 'Active' | 'Disabled' | 'Merged';
  mergedIntoCustomerId?: string;
}

export interface CustomerQuickCreateRequest {
  displayName: string;
  phone?: string;
  email?: string;
  customerGroupId?: string;
}

export interface CustomerDuplicateWarningDTO {
  field: 'phone' | 'email';
  customerId: string;
  displayName: string;
}

export interface CustomerQuickCreateResponse {
  customer?: CustomerDTO;
  duplicateWarnings: readonly CustomerDuplicateWarningDTO[];
}

export interface CustomerSearchRequest {
  query: string;
}

export interface CustomerSearchResponse {
  customers: readonly CustomerDTO[];
}
