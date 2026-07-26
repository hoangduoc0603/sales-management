import { z } from 'zod';
import type { AuthLoginRequest } from '@shared/contracts/platform/auth';

export const authLoginRequestSchema = z
  .object({
    loginId: z.string().trim().min(1),
    password: z.string().min(1),
  })
  .strict();

export function parseAuthLoginRequest(value: unknown): AuthLoginRequest {
  return authLoginRequestSchema.parse(value);
}
