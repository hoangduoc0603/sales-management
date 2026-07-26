import { z } from 'zod';
import type { ApiRequest } from '@shared/contracts/api';
import { operationNames } from '@shared/contracts/platform/operations';

const versionMapSchema = z.record(z.string(), z.string());

const commandSchema = z
  .object({
    commandId: z.string().trim().min(1),
    idempotencyKey: z.string().trim().min(1),
    expectedVersions: versionMapSchema.optional(),
  })
  .strict();

const clientSchema = z
  .object({
    appVersion: z.string().trim().min(1),
    schemaVersion: z.string().trim().min(1),
    cacheVersions: versionMapSchema.optional(),
  })
  .strict();

export const apiRequestSchema = z
  .object({
    operation: z.enum(operationNames),
    requestId: z.string().trim().min(1),
    sessionToken: z.string().trim().min(1).optional(),
    payload: z.unknown(),
    command: commandSchema.optional(),
    client: clientSchema.optional(),
  })
  .strict();

export function parseApiRequest(value: unknown): ApiRequest {
  return apiRequestSchema.parse(value);
}
