import type { CommandStatus } from '@shared/contracts/platform/command';

export interface CommandTransactionRecord {
  commandId: string;
  idempotencyKey: string;
  status: CommandStatus;
  resultJson?: string;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommandRepository {
  findByIdempotencyKey(idempotencyKey: string): CommandTransactionRecord | undefined;
  findByCommandId(commandId: string): CommandTransactionRecord | undefined;
  save(record: CommandTransactionRecord): void;
}

export function createInMemoryCommandRepository(): CommandRepository {
  const byCommandId = new Map<string, CommandTransactionRecord>();

  return {
    findByIdempotencyKey(idempotencyKey) {
      return [...byCommandId.values()].find((record) => record.idempotencyKey === idempotencyKey);
    },
    findByCommandId(commandId) {
      return byCommandId.get(commandId);
    },
    save(record) {
      byCommandId.set(record.commandId, { ...record });
    },
  };
}
