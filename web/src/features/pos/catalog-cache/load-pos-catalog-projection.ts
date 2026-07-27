import type { CatalogPosProjectionResponse } from '@shared/contracts/catalog/catalog';
import type { ApiClient } from '../../../lib/api/client';

export interface LoadPosCatalogProjectionInput {
  apiClient: ApiClient;
  requestId: string;
  sessionToken: string;
  branchId: string;
  warehouseId: string;
}

export async function loadPosCatalogProjection({
  apiClient,
  branchId,
  requestId,
  sessionToken,
  warehouseId,
}: LoadPosCatalogProjectionInput): Promise<CatalogPosProjectionResponse> {
  const result = await apiClient.invoke<CatalogPosProjectionResponse>({
    operation: 'catalog.pos.getProjection',
    requestId,
    sessionToken,
    payload: {
      branchId,
      warehouseId,
    },
  });

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}
