import type { ApiCommand } from '@shared/contracts/api';
import type { CommandStatusDTO } from '@shared/contracts/platform/command';
import {
  createInMemoryAuditOutboxRepository,
  type AuditOutboxRecord,
  type AuditOutboxRepository,
} from '../../../repositories/platform/audit-outbox-repository';
import {
  createInMemoryCommandRepository,
  type CommandRepository,
} from '../../../repositories/platform/command-repository';
import {
  createImmediateLockProvider,
  type LockProvider,
} from '../../../infrastructure/platform/runtime';

export interface CommandAuditInput {
  actorId: string;
  action: string;
}

export interface CommandCoordinator {
  run<T>(command: ApiCommand, handler: () => T, audit: CommandAuditInput): T;
  getStatus(input: { commandId?: string; idempotencyKey?: string }): CommandStatusDTO | undefined;
}

interface CommandCoordinatorDependencies {
  commandRepository: CommandRepository;
  auditOutboxRepository: AuditOutboxRepository;
  lockProvider: LockProvider;
  now: () => Date;
  newId: (prefix: string) => string;
}

export function createCommandCoordinator(deps: CommandCoordinatorDependencies): CommandCoordinator {
  return {
    run(command, handler, audit) {
      return deps.lockProvider.withLock(() => {
        const existing = deps.commandRepository.findByIdempotencyKey(command.idempotencyKey);

        if (existing?.status === 'Committed' && existing.resultJson !== undefined) {
          return JSON.parse(existing.resultJson) as ReturnType<typeof handler>;
        }

        const now = deps.now().toISOString();
        deps.commandRepository.save({
          commandId: command.commandId,
          idempotencyKey: command.idempotencyKey,
          status: 'Preparing',
          createdAt: now,
          updatedAt: now,
        });

        const result = handler();
        const resultJson = JSON.stringify(result);
        deps.auditOutboxRepository.append({
          eventId: deps.newId('audit'),
          commandId: command.commandId,
          actorId: audit.actorId,
          action: audit.action,
          status: 'Pending',
          createdAt: deps.now().toISOString(),
        });
        deps.commandRepository.save({
          commandId: command.commandId,
          idempotencyKey: command.idempotencyKey,
          status: 'Committed',
          resultJson,
          createdAt: now,
          updatedAt: deps.now().toISOString(),
        });

        return result;
      });
    },
    getStatus(input) {
      const record =
        input.commandId !== undefined
          ? deps.commandRepository.findByCommandId(input.commandId)
          : input.idempotencyKey !== undefined
            ? deps.commandRepository.findByIdempotencyKey(input.idempotencyKey)
            : undefined;

      if (record === undefined) {
        return undefined;
      }

      return {
        commandId: record.commandId,
        idempotencyKey: record.idempotencyKey,
        status: record.status,
        resultJson: record.resultJson,
        errorCode: record.errorCode,
        updatedAt: record.updatedAt,
      };
    },
  };
}

export function createCommandCoordinatorForTest() {
  let sequence = 0;
  const auditOutboxRepository = createInMemoryAuditOutboxRepository();
  const coordinator = createCommandCoordinator({
    commandRepository: createInMemoryCommandRepository(),
    auditOutboxRepository,
    lockProvider: createImmediateLockProvider(),
    now: () => new Date('2026-07-26T00:00:00.000Z'),
    newId(prefix) {
      sequence += 1;
      return `${prefix}-${sequence}`;
    },
  });

  return {
    ...coordinator,
    getAuditOutbox(): readonly AuditOutboxRecord[] {
      return auditOutboxRepository.list();
    },
  };
}
