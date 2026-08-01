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

export interface GoogleScriptRunInvokerOptions {
  getRun?: () => GoogleScriptRun | undefined;
  sleep?: (durationMs: number) => Promise<void>;
  now?: () => number;
  bridgeTimeoutMs?: number;
  pollIntervalMs?: number;
}

export function createGoogleScriptRunInvoker(options: GoogleScriptRunInvokerOptions = {}): ApiInvoker {
  return {
    invoke: <T>(request: ApiRequest) => invokeWithGoogleScriptRun<T>(request, options),
  };
}

export function createGoogleScriptRunClient(): ApiClient {
  return createApiClient(createGoogleScriptRunInvoker());
}

async function invokeWithGoogleScriptRun<T>(
  request: ApiRequest,
  options: GoogleScriptRunInvokerOptions,
): Promise<ApiResult<T>> {
  const run = await waitForGoogleScriptRun(options);
  if (!run) {
    return createTransportError<T>(request);
  }

  return new Promise((resolve) => {
    run
      .withSuccessHandler<T>((result) => resolve(result))
      .withFailureHandler(() => resolve(createTransportError<T>(request)))
      .invoke(request);
  });
}

async function waitForGoogleScriptRun(options: GoogleScriptRunInvokerOptions): Promise<GoogleScriptRun | undefined> {
  const getRun = options.getRun ?? defaultGetGoogleScriptRun;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const timeoutMs = options.bridgeTimeoutMs ?? 5000;
  const pollIntervalMs = options.pollIntervalMs ?? 50;
  const deadline = now() + timeoutMs;

  let run = getRun();
  while (!run && now() < deadline) {
    await sleep(pollIntervalMs);
    run = getRun();
  }

  return run;
}

function defaultGetGoogleScriptRun(): GoogleScriptRun | undefined {
  return typeof window === 'undefined' ? undefined : window.google?.script?.run;
}

function defaultSleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
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
