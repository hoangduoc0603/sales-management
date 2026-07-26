import type { ApiMeta, ApiRequest, ApiResult } from '@shared/contracts/api';
import { createApiClient, type ApiClient, type ApiInvoker } from './client';

interface GoogleScriptRun {
  withFailureHandler(handler: (error: unknown) => void): GoogleScriptRun;
  withSuccessHandler<T>(handler: (result: ApiResult<T>) => void): GoogleScriptRun;
  invoke(request: ApiRequest): void;
}

interface GoogleScriptNamespace {
  run?: GoogleScriptRun;
}

declare global {
  interface Window {
    google?: {
      script?: GoogleScriptNamespace;
    };
  }
}

export function createGoogleScriptRunInvoker(): ApiInvoker {
  return {
    invoke: <T>(request: ApiRequest) => invokeWithGoogleScriptRun<T>(request),
  };
}

export function createGoogleScriptRunClient(): ApiClient {
  return createApiClient(createGoogleScriptRunInvoker());
}

function invokeWithGoogleScriptRun<T>(request: ApiRequest): Promise<ApiResult<T>> {
  const run = window.google?.script?.run;
  if (!run) {
    return Promise.resolve(createTransportError<T>(request));
  }

  return new Promise((resolve) => {
    run
      .withSuccessHandler<T>((result) => resolve(result))
      .withFailureHandler(() => resolve(createTransportError<T>(request)))
      .invoke(request);
  });
}

function createTransportError<T>(request: ApiRequest): ApiResult<T> {
  const meta: ApiMeta = {
    requestId: request.requestId,
    operation: request.operation,
    serverTime: new Date().toISOString(),
    durationMs: 0,
    stages: {},
    io: {},
  };

  return {
    ok: false,
    error: {
      code: 'TRANSPORT_ERROR',
      message: 'Không thể kết nối đến máy chủ.',
    },
    meta,
  };
}
