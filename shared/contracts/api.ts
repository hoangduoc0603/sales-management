import type { ApiError } from './errors';
import type { OperationName } from './platform/operations';

export interface ApiCommand {
  commandId: string;
  idempotencyKey: string;
  expectedVersions?: Record<string, string>;
}

export interface ApiClientInfo {
  appVersion: string;
  schemaVersion: string;
  cacheVersions?: Record<string, string>;
}

export interface ApiRequest {
  operation: OperationName;
  requestId: string;
  sessionToken?: string;
  payload: unknown;
  command?: ApiCommand;
  client?: ApiClientInfo;
}

export interface ApiMeta {
  requestId: string;
  operation: string;
  serverTime: string;
  durationMs: number;
  stages: Record<string, number>;
  io: Record<string, number>;
}

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
      meta: ApiMeta;
    }
  | {
      ok: false;
      error: ApiError;
      meta: ApiMeta;
    };

export function createApiMeta(input: ApiMeta): ApiMeta {
  return input;
}
