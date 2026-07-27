import { z } from 'zod';
import type { BootstrapInstallRequest } from '@shared/contracts/platform/bootstrap';

export const bootstrapInstallRequestSchema = z
  .object({
    tenantDisplayName: z.string().trim().min(1).optional(),
    adminLoginId: z.string().trim().min(1).optional(),
    temporaryPassword: z.string().min(1).optional(),
  })
  .strict();

export function parseBootstrapInstallRequest(value: unknown): BootstrapInstallRequest {
  return bootstrapInstallRequestSchema.parse(value);
}
