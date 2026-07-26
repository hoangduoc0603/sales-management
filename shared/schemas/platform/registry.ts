import { z } from 'zod';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';

export const columnDefinitionSchema = z
  .object({
    name: z.string().trim().min(1),
    type: z.enum(['string', 'integer', 'boolean', 'timestamp', 'enum', 'json']),
    required: z.boolean(),
  })
  .strict();

export const lookupKeyDefinitionSchema = z
  .object({
    name: z.string().trim().min(1),
    columns: z.array(z.string().trim().min(1)).min(1),
    unique: z.boolean(),
  })
  .strict();

export const tableDefinitionSchema = z
  .object({
    tableName: z.string().trim().min(1),
    owner: z.enum([
      'platform',
      'catalog',
      'crm',
      'sales',
      'inventory',
      'purchasing',
      'finance',
      'reporting',
      'operations',
    ]),
    storageRole: z.enum(['core', 'runtime', 'transaction', 'audit']),
    sheetName: z.string().trim().min(1),
    lifecycle: z.enum(['master', 'runtime', 'document', 'ledger', 'projection', 'audit']),
    schemaVersion: z.number().int().positive(),
    primaryKey: z.string().trim().min(1),
    headers: z.array(columnDefinitionSchema).min(1),
    partitionPolicy: z.enum(['none', 'transaction-period', 'audit-period']),
    lookupKeys: z.array(lookupKeyDefinitionSchema),
  })
  .strict();

export function parseTableDefinition(value: unknown): TableDefinitionDTO {
  return tableDefinitionSchema.parse(value);
}
