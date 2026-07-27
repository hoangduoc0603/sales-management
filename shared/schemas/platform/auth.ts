import { z } from 'zod';
import type { AuthChangeOwnPasswordRequest, AuthLoginRequest } from '@shared/contracts/platform/auth';

export const authLoginRequestSchema = z
  .object({
    loginId: z.string().trim().min(1),
    password: z.string().min(1),
  })
  .strict();

export function parseAuthLoginRequest(value: unknown): AuthLoginRequest {
  return authLoginRequestSchema.parse(value);
}

export const authChangeOwnPasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(1),
  })
  .strict();

export function parseAuthChangeOwnPasswordRequest(value: unknown): AuthChangeOwnPasswordRequest {
  return authChangeOwnPasswordRequestSchema.parse(value);
}
