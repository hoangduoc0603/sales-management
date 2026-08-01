import type { ApiResult } from '@shared/contracts/api';
import { createAppsScriptProductionComposition } from '../bootstrap/create-apps-script-production-composition';
import {
  invokeFirstRunInstallForAppsScript_,
  isFirstRunInstallOperation,
} from '../bootstrap/first-run-install';
import { readPerformanceSnapshot, recordStage, withPerformanceTracker } from './performance-tracker';

interface AppsScriptBootConfig {
  debugApi?: boolean;
}

export function doGet_(event?: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  const html = HtmlService.createHtmlOutputFromFile('index');
  return HtmlService.createHtmlOutput(injectBootConfig(html.getContent(), createBootConfig(event)));
}

export function invoke_(request: unknown): ApiResult<unknown> {
  const startedAt = new Date();

  return withPerformanceTracker(() => {
    try {
      if (isFirstRunInstallOperation(request)) {
        return invokeFirstRunInstallForAppsScript_(request);
      }

      const compositionStartedAt = Date.now();
      const composition = createAppsScriptProductionComposition({
        now: () => new Date(),
      });
      recordStage('compositionMs', Date.now() - compositionStartedAt);
      return composition.invoke(request);
    } catch (error) {
      return createEntrypointErrorResult(request, error, startedAt);
    }
  });
}

function createEntrypointErrorResult(request: unknown, error: unknown, startedAt: Date): ApiResult<never> {
  const message = error instanceof Error ? error.message : String(error);
  const runtimeNotInstalled = message === 'Missing active runtime config.';
  const performance = readPerformanceSnapshot();

  return {
    ok: false,
    error: {
      code: runtimeNotInstalled ? 'RUNTIME_NOT_INSTALLED' : 'INTERNAL_ERROR',
      message: runtimeNotInstalled
        ? 'Hệ thống chưa được khởi tạo. Vui lòng chạy bootstrap tenant mặc định trước khi đăng nhập.'
        : 'Có lỗi hệ thống. Vui lòng thử lại hoặc cung cấp mã yêu cầu cho quản trị viên.',
    },
    meta: {
      requestId: readRequestId(request, startedAt),
      operation: readOperation(request),
      serverTime: new Date().toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      stages: performance.stages,
      io: performance.io,
    },
  };
}

function readRequestId(request: unknown, startedAt: Date): string {
  if (isRecord(request) && typeof request.requestId === 'string' && request.requestId.trim() !== '') {
    return request.requestId.trim();
  }

  return `entrypoint-error-${startedAt.getTime()}`;
}

function readOperation(request: unknown): string {
  if (isRecord(request) && typeof request.operation === 'string' && request.operation.trim() !== '') {
    return request.operation.trim();
  }

  return 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function createBootConfig(event?: GoogleAppsScript.Events.DoGet): AppsScriptBootConfig {
  const debugApi = readDebugApiFlag(event?.parameter?.debugApi);
  return debugApi === undefined ? {} : { debugApi };
}

function readDebugApiFlag(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true') return true;
  if (normalized === '0' || normalized === 'false') return false;
  return undefined;
}

function injectBootConfig(html: string, config: AppsScriptBootConfig): string {
  const serializedConfig = safeJsonForInlineScript(config);
  const script = `<script>window.__CENIO_BOOT__=${serializedConfig};</script><script id="cenio-boot-config" type="application/json">${serializedConfig}</script>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${script}</head>`);
  }

  return `${script}${html}`;
}

function safeJsonForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
