import type { ApiRequest, ApiResult } from '@shared/contracts/api';

declare global {
  interface Window {
    __CENIO_BOOT__?: {
      debugApi?: boolean;
    };
  }
}

export interface ApiInvoker {
  invoke<T>(request: ApiRequest): Promise<ApiResult<T>>;
}

export interface ApiClient {
  invoke<T>(request: ApiRequest): Promise<ApiResult<T>>;
}

export interface ApiClientDebugOptions {
  enabled?: () => boolean;
  log?: (...args: unknown[]) => void;
  now?: () => number;
}

export interface ApiClientOptions {
  debug?: ApiClientDebugOptions;
}

const sensitiveKeyPattern = /(password|token|secret|verifier|pepper|credential|authorization|authHeader)/i;

export function createApiClient(invoker: ApiInvoker, options: ApiClientOptions = {}): ApiClient {
  return {
    async invoke<T>(request: ApiRequest): Promise<ApiResult<T>> {
      const now = options.debug?.now ?? defaultNow;
      const startedAt = now();
      const response = await invoker.invoke<T>(request);
      if ((options.debug?.enabled ?? shouldLogApiResponses)()) {
        const log = options.debug?.log ?? console.log.bind(console);
        log(`[api] ${request.operation} ${request.requestId}`, {
          clientDurationMs: Math.max(0, Math.round(now() - startedAt)),
          response: sanitizeApiResponseForDebug(response),
        });
      }
      return response;
    },
  };
}

export function shouldLogApiResponses(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return shouldLogApiResponsesForUrl(
    window.location.href,
    isViteDevMode(),
    document.referrer,
    window.__CENIO_BOOT__?.debugApi,
  );
}

export function shouldLogApiResponsesForUrl(
  url: string,
  isDevMode: boolean,
  referrer?: string,
  bootDebugApi?: boolean,
): boolean {
  if (bootDebugApi !== undefined) return bootDebugApi;

  const candidates = [url, referrer].filter((candidate): candidate is string => Boolean(candidate));
  const explicitDebug = readExplicitDebugFlag(candidates);
  if (explicitDebug !== undefined) return explicitDebug;

  return isDevMode || candidates.some((candidate) => isAppsScriptDevUrl(candidate));
}

function readExplicitDebugFlag(urls: readonly string[]): boolean | undefined {
  for (const url of urls) {
    const parsed = new URL(url, 'http://localhost');
    const explicitDebug = parsed.searchParams.get('debugApi');
    if (explicitDebug === '0' || explicitDebug === 'false') return false;
    if (explicitDebug === '1' || explicitDebug === 'true') return true;
  }

  return undefined;
}

function isAppsScriptDevUrl(url: string): boolean {
  const parsed = new URL(url, 'http://localhost');
  return parsed.pathname.endsWith('/dev');
}

export function sanitizeApiResponseForDebug<T>(response: ApiResult<T>): ApiResult<T> {
  return sanitizeValue(response) as ApiResult<T>;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, currentValue]) => [
        key,
        sensitiveKeyPattern.test(key) ? '<redacted>' : sanitizeValue(currentValue),
      ]),
    );
  }

  return value;
}

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function isViteDevMode(): boolean {
  const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return meta.env?.DEV === true;
}
