export const apiErrorCodes = [
  'INVALID_REQUEST',
  'INVALID_INPUT',
  'OPERATION_NOT_SUPPORTED',
  'SESSION_REQUIRED',
  'SESSION_EXPIRED',
  'INVALID_CREDENTIALS',
  'AUTH_LOCKED',
  'PERMISSION_DENIED',
  'SCOPE_DENIED',
  'COMMAND_REQUIRED',
  'COMMAND_ALREADY_COMMITTED',
  'COMMAND_PENDING',
  'VERSION_CONFLICT',
  'LOCK_TIMEOUT',
  'TRANSPORT_ERROR',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, string>;
}
