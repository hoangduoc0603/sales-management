import { createApiMeta, type ApiMeta, type ApiResult } from '@shared/contracts/api';
import type { ApiError, ApiErrorCode } from '@shared/contracts/errors';

export function createSuccessResult<T>(data: T, meta: ApiMeta): ApiResult<T> {
  return {
    ok: true,
    data,
    meta: createApiMeta(meta),
  };
}

export function createErrorResult(
  code: ApiErrorCode,
  message: string,
  meta: ApiMeta,
): ApiResult<never> {
  const error: ApiError = { code, message };

  return {
    ok: false,
    error,
    meta: createApiMeta(meta),
  };
}
