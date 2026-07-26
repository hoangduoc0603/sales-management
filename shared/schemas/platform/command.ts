import { z } from 'zod';
import type { CommandStatusRequest } from '@shared/contracts/platform/command';

export const commandStatusRequestSchema = z
  .object({
    commandId: z.string().trim().min(1).optional(),
    idempotencyKey: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((value) => value.commandId !== undefined || value.idempotencyKey !== undefined, {
    message: 'commandId hoặc idempotencyKey là bắt buộc.',
  });

export function parseCommandStatusRequest(value: unknown): CommandStatusRequest {
  return commandStatusRequestSchema.parse(value);
}
