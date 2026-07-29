import type { ApiResult } from '@shared/contracts/api';
import { createAppsScriptProductionComposition } from '../bootstrap/create-apps-script-production-composition';

export function doGet_(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('index');
}

export function invoke_(request: unknown): ApiResult<unknown> {
  const startedAt = new Date();

  try {
    const composition = createAppsScriptProductionComposition({
      now: () => new Date(),
    });
    return composition.invoke(request);
  } catch (error) {
    return createEntrypointErrorResult(request, error, startedAt);
  }
}

function createEntrypointErrorResult(request: unknown, error: unknown, startedAt: Date): ApiResult<never> {
  const message = error instanceof Error ? error.message : String(error);
  const runtimeNotInstalled = message === 'Missing active runtime config.';

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
      stages: {},
      io: {},
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
