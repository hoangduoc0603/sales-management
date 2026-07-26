import type { ApiRequest, ApiResult } from '@shared/contracts/api';

export interface ApiInvoker {
  invoke<T>(request: ApiRequest): Promise<ApiResult<T>>;
}

export interface ApiClient {
  invoke<T>(request: ApiRequest): Promise<ApiResult<T>>;
}

export function createApiClient(invoker: ApiInvoker): ApiClient {
  return {
    invoke: (request) => invoker.invoke(request),
  };
}
