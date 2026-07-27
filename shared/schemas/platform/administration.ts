import { z } from 'zod';
import type { DisableWarehouseRequest } from '@shared/contracts/platform/administration';

export const disableWarehouseRequestSchema = z
  .object({
    warehouseId: z.string().trim().min(1),
    reason: z.string().trim().min(1),
  })
  .strict();

export function parseDisableWarehouseRequest(value: unknown): DisableWarehouseRequest {
  return disableWarehouseRequestSchema.parse(value);
}
