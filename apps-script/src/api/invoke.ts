import type { ApiResult } from '@shared/contracts/api';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { ApiAction } from '@shared/contracts/platform/operations';
import { parseApiRequest } from '@shared/schemas/api';
import { ZodError } from 'zod';
import { createApiContext, createMeta, type Clock } from './api-context';
import { createErrorResult, createSuccessResult } from './api-result';
import type { OperationRegistry } from './operation-registry';

export type { Clock } from './api-context';

export interface InvokeDependencies {
  clock: Clock;
  registry?: OperationRegistry;
  authenticate?: (sessionToken: string) => ActorContextDTO | undefined;
  authorize?: (actor: ActorContextDTO, action: ApiAction) => boolean;
}

export function createInvokeHandler(input: Clock | InvokeDependencies): (request: unknown) => ApiResult<unknown> {
  const deps: InvokeDependencies = isInvokeDependencies(input) ? input : { clock: input };

  return (request) => {
    const startedAt = deps.clock.now();

    try {
      const apiRequest = parseApiRequest(request);
      const entry = deps.registry?.get(apiRequest.operation);

      if (entry === undefined) {
        return createErrorResult(
          'OPERATION_NOT_SUPPORTED',
          'Thao tác chưa được hỗ trợ.',
          createMeta({
            requestId: apiRequest.requestId,
            operation: apiRequest.operation,
            startedAt,
            clock: deps.clock,
          }),
        );
      }

      const actor =
        entry.kind === 'public'
          ? undefined
          : authenticateSession(apiRequest.sessionToken, deps.authenticate);

      if (entry.kind !== 'public' && actor === undefined) {
        return createErrorResult(
          apiRequest.sessionToken === undefined ? 'SESSION_REQUIRED' : 'SESSION_EXPIRED',
          apiRequest.sessionToken === undefined
            ? 'Phiên đăng nhập là bắt buộc.'
            : 'Phiên đăng nhập đã hết hạn.',
          createMeta({
            requestId: apiRequest.requestId,
            operation: apiRequest.operation,
            startedAt,
            clock: deps.clock,
          }),
        );
      }

      if (
        entry.kind !== 'public' &&
        entry.requiredAction !== undefined &&
        actor !== undefined &&
        deps.authorize !== undefined &&
        !deps.authorize(actor, entry.requiredAction)
      ) {
        return createErrorResult(
          'PERMISSION_DENIED',
          'Bạn không có quyền thực hiện thao tác này.',
          createMeta({
            requestId: apiRequest.requestId,
            operation: apiRequest.operation,
            startedAt,
            clock: deps.clock,
          }),
        );
      }

      const context = createApiContext({
        requestId: apiRequest.requestId,
        operation: apiRequest.operation,
        startedAt,
        clock: deps.clock,
        command: apiRequest.command,
        sessionToken: apiRequest.sessionToken,
        actor,
      });
      const payload = entry.parsePayload(apiRequest.payload);
      const result = entry.handler(payload, context);

      if (isApiResult(result)) {
        return result;
      }

      if (isServiceResult(result)) {
        return result.ok
          ? createSuccessResult(result.data, createMeta(context))
          : createErrorResult(result.error.code, result.error.message, createMeta(context));
      }

      return createSuccessResult(result, createMeta(context));
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResult(
          'INVALID_REQUEST',
          'Yêu cầu không hợp lệ.',
          createMeta({
            requestId: readRequestId(request, startedAt),
            operation: readOperation(request),
            startedAt,
            clock: deps.clock,
          }),
        );
      }

      return createErrorResult(
        'INTERNAL_ERROR',
        'Có lỗi hệ thống. Vui lòng thử lại hoặc cung cấp mã yêu cầu cho quản trị viên.',
        createMeta({
          requestId: readRequestId(request, startedAt),
          operation: readOperation(request),
          startedAt,
          clock: deps.clock,
        }),
      );
    }
  };
}

function readRequestId(value: unknown, now: Date): string {
  if (isRecord(value) && typeof value.requestId === 'string' && value.requestId.trim().length > 0) {
    return value.requestId.trim();
  }

  return `invalid-${now.getTime()}`;
}

function readOperation(value: unknown): string {
  if (
    isRecord(value) &&
    typeof value.operation === 'string' &&
    value.operation.trim().length > 0
  ) {
    const operation = value.operation.trim();

    if (isKnownOperation(operation)) {
      return operation;
    }
  }

  return 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isInvokeDependencies(input: Clock | InvokeDependencies): input is InvokeDependencies {
  return 'clock' in input;
}

function authenticateSession(
  sessionToken: string | undefined,
  authenticate: InvokeDependencies['authenticate'],
): ActorContextDTO | undefined {
  if (sessionToken === undefined || authenticate === undefined) {
    return undefined;
  }

  return authenticate(sessionToken);
}

function isApiResult(value: unknown): value is ApiResult<unknown> {
  return (
    isRecord(value) &&
    typeof value.ok === 'boolean' &&
    ('data' in value || 'error' in value) &&
    'meta' in value
  );
}

function isServiceResult(
  value: unknown,
): value is { ok: true; data: unknown } | { ok: false; error: { code: never; message: string } } {
  return isRecord(value) && typeof value.ok === 'boolean' && ('data' in value || 'error' in value);
}

function isKnownOperation(operation: string): operation is ReturnType<typeof readOperation> {
  return operation.startsWith('platform.');
}
