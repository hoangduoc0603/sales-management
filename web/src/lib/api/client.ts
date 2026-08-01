import type { ApiRequest, ApiResult } from '@shared/contracts/api';

declare global {
  interface Window {
    __CENIO_BOOT__?: {
      debugApi?: boolean;
    };
    __CENIO_API_DEBUG_LOGS__?: ApiDebugLogEntry[];
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

export interface ApiDebugLogEntry {
  operation: string;
  requestId: string;
  clientDurationMs: number;
  response: unknown;
}

interface BootConfigDocument {
  getElementById(id: string): { textContent: string | null } | null;
}

interface ApiDebugDocument extends BootConfigDocument {
  createElement?(tagName: string): { id?: string; type?: string; hidden?: boolean; textContent: string | null };
  head?: { appendChild<T>(element: T): T };
  body?: { appendChild<T>(element: T): T };
  documentElement?: { appendChild<T>(element: T): T };
}

const sensitiveKeyPattern = /(password|token|secret|verifier|pepper|credential|authorization|authHeader)/i;
const maxDebugLogEntries = 50;
const apiDebugLogBuffer: ApiDebugLogEntry[] = [];
const apiDebugLogElementId = 'cenio-api-debug-logs';

export function createApiClient(invoker: ApiInvoker, options: ApiClientOptions = {}): ApiClient {
  return {
    async invoke<T>(request: ApiRequest): Promise<ApiResult<T>> {
      const now = options.debug?.now ?? defaultNow;
      const startedAt = now();
      const response = await invoker.invoke<T>(request);
      if ((options.debug?.enabled ?? shouldLogApiResponses)()) {
        const debugEntry = {
          operation: request.operation,
          requestId: request.requestId,
          clientDurationMs: Math.max(0, Math.round(now() - startedAt)),
          response: sanitizeApiResponseForDebug(response),
        };
        appendApiDebugLog(debugEntry);
        const log = options.debug?.log ?? console.warn.bind(console);
        log(`[api] ${request.operation} ${request.requestId}`, JSON.stringify(debugEntry));
      }
      return response;
    },
  };
}

export function appendApiDebugLog(entry: ApiDebugLogEntry): void {
  apiDebugLogBuffer.push(entry);
  apiDebugLogBuffer.splice(0, Math.max(0, apiDebugLogBuffer.length - maxDebugLogEntries));

  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentLogs = window.__CENIO_API_DEBUG_LOGS__ ?? [];
    currentLogs.push(entry);
    window.__CENIO_API_DEBUG_LOGS__ = currentLogs.slice(-maxDebugLogEntries);
  } catch {
    // Apps Script HtmlService can expose a non-extensible window. Console logging
    // remains the source for debugApi=1 in that runtime; the in-memory buffer keeps
    // local/test behavior without breaking the API response path.
  }

  writeApiDebugLogToDocument(apiDebugLogBuffer);
}

function writeApiDebugLogToDocument(entries: readonly ApiDebugLogEntry[]): void {
  if (typeof document === 'undefined') {
    return;
  }

  const currentDocument = document as ApiDebugDocument;
  let element = currentDocument.getElementById(apiDebugLogElementId) as
    | { id?: string; type?: string; hidden?: boolean; textContent: string | null }
    | null;

  if (element === null) {
    element = currentDocument.createElement?.('script') ?? null;
    if (element === null) return;
    element.id = apiDebugLogElementId;
    element.type = 'application/json';
    element.hidden = true;
    const parent = currentDocument.body ?? currentDocument.head ?? currentDocument.documentElement;
    parent?.appendChild(element);
  }

  element.textContent = JSON.stringify(entries);
}

export function shouldLogApiResponses(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return shouldLogApiResponsesForUrl(
    window.location.href,
    isViteDevMode(),
    document.referrer,
    window.__CENIO_BOOT__?.debugApi ?? readBootDebugApiFromDocument(document),
  );
}

export function readBootDebugApiFromDocument(currentDocument: BootConfigDocument): boolean | undefined {
  const textContent = currentDocument.getElementById('cenio-boot-config')?.textContent;
  if (!textContent) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(textContent) as { debugApi?: unknown };
    return typeof parsed.debugApi === 'boolean' ? parsed.debugApi : undefined;
  } catch {
    return undefined;
  }
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
