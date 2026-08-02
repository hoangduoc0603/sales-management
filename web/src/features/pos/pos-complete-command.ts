import type { ApiError, ApiErrorCode } from '@shared/contracts/errors';
import type { CommandStatusResponse } from '@shared/contracts/platform/command';
import type { SalesPosCompleteRequest, SalesPosCompleteResponse } from '@shared/contracts/sales/sales';
import type { ApiClient } from '../../lib/api/client';

export interface PosCompleteCommandIdentity {
  commandId: string;
  idempotencyKey: string;
}

export interface CompletePosCheckoutWithRecoveryInput {
  apiClient: ApiClient;
  sessionToken: string;
  requestId: string;
  command: PosCompleteCommandIdentity;
  payload: SalesPosCompleteRequest;
}

export type CompletePosCheckoutWithRecoveryResult =
  | {
      ok: true;
      data: SalesPosCompleteResponse;
      recoveredFromCommandStatus: boolean;
    }
  | {
      ok: false;
      error: ApiError;
      commandPending: boolean;
    };

const recoverableCompleteErrorCodes = new Set<ApiErrorCode>([
  'TRANSPORT_ERROR',
  'LOCK_TIMEOUT',
  'COMMAND_PENDING',
  'INTERNAL_ERROR',
]);

export async function completePosCheckoutWithRecovery(
  input: CompletePosCheckoutWithRecoveryInput,
): Promise<CompletePosCheckoutWithRecoveryResult> {
  const completeResult = await input.apiClient.invoke<SalesPosCompleteResponse>({
    operation: 'sales.pos.complete',
    requestId: input.requestId,
    sessionToken: input.sessionToken,
    payload: input.payload,
  });

  if (completeResult.ok) {
    return { ok: true, data: completeResult.data, recoveredFromCommandStatus: false };
  }

  if (!recoverableCompleteErrorCodes.has(completeResult.error.code)) {
    return { ok: false, error: completeResult.error, commandPending: false };
  }

  const commandResult = await input.apiClient.invoke<CommandStatusResponse>({
    operation: 'platform.command.getStatus',
    requestId: `${input.requestId}-status`,
    sessionToken: input.sessionToken,
    payload: {
      commandId: input.command.commandId,
      idempotencyKey: input.command.idempotencyKey,
    },
  });

  if (!commandResult.ok) {
    return { ok: false, error: completeResult.error, commandPending: true };
  }

  const command = commandResult.data.command;
  if (command?.status !== 'Committed' || command.resultJson === undefined) {
    return { ok: false, error: completeResult.error, commandPending: command?.status === 'Preparing' };
  }

  const parsed = parseCommittedPosCompleteResult(command.resultJson);
  if (parsed.ok) {
    return { ok: true, data: parsed.data, recoveredFromCommandStatus: true };
  }

  return { ok: false, error: parsed.error, commandPending: false };
}

function parseCommittedPosCompleteResult(
  resultJson: string,
):
  | { ok: true; data: SalesPosCompleteResponse }
  | { ok: false; error: ApiError } {
  try {
    const parsed = JSON.parse(resultJson) as unknown;
    if (isCommittedSuccess(parsed)) {
      return { ok: true, data: parsed.data };
    }
    if (isCommittedFailure(parsed)) {
      return { ok: false, error: parsed.error };
    }
  } catch {
    // Fall through to sanitized error below.
  }

  return {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Không đọc được kết quả hoàn tất trước đó. Vui lòng kiểm tra trạng thái phiếu.',
    },
  };
}

function isCommittedSuccess(value: unknown): value is { ok: true; data: SalesPosCompleteResponse } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { ok?: unknown }).ok === true &&
    typeof (value as { data?: unknown }).data === 'object' &&
    (value as { data?: unknown }).data !== null
  );
}

function isCommittedFailure(value: unknown): value is { ok: false; error: ApiError } {
  const error = (value as { error?: unknown })?.error;
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { ok?: unknown }).ok === false &&
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}
