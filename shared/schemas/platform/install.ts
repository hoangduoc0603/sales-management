import { z } from 'zod';
import type { InstallRunRequest } from '@shared/contracts/platform/install';

export const installRunRequestSchema = z
  .object({
    tenantDisplayName: z.string().trim().min(1),
    adminLoginId: z.string().trim().min(3),
    adminPassword: z.string().min(8),
    confirmAdminPassword: z.string().min(8),
  })
  .strict()
  .refine((value) => value.adminPassword === value.confirmAdminPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmAdminPassword'],
  });

export function parseInstallRunRequest(value: unknown): InstallRunRequest {
  return installRunRequestSchema.parse(value);
}
