import type { ApiCommand } from '@shared/contracts/api';
import type { CommandStatusDTO } from '@shared/contracts/platform/command';
import {
  createInMemoryCommandRepository,
  type CommandRepository,
} from '../../../repositories/platform/command-repository';
import {
  createImmediateLockProvider,
  type LockProvider,
} from '../../../infrastructure/platform/runtime';
import { recordStage } from '../../../api/performance-tracker';

export interface CommandActorInput {
  actorId: string;
  action: string;
}

export interface CommandCoordinator {
  run<T>(command: ApiCommand, handler: () => T, actor?: CommandActorInput): T;
  getStatus(input: { commandId?: string; idempotencyKey?: string }): CommandStatusDTO | undefined;
}

interface CommandCoordinatorDependencies {
  commandRepository: CommandRepository;
  lockProvider: LockProvider;
  now: () => Date;
  newId: (prefix: string) => string;
}

export function createCommandCoordinator(deps: CommandCoordinatorDependencies): CommandCoordinator {
  return {
    run(command, handler) {
      const totalStartedAt = Date.now();
      try {
        return deps.lockProvider.withLock(() => {
          const measure = <T>(stage: string, operation: () => T): T => {
            const startedAt = Date.now();
            try {
              return operation();
            } finally {
              recordStage(stage, Date.now() - startedAt);
            }
          };

          const cachedExisting =
            deps.commandRepository.findCachedByIdempotencyKey === undefined
              ? undefined
              : measure('command.findCachedExistingMs', () =>
                  deps.commandRepository.findCachedByIdempotencyKey?.(command.idempotencyKey),
                );
          const existing =
            cachedExisting ??
            (deps.commandRepository.findCachedByIdempotencyKey === undefined
              ? measure('command.findExistingMs', () => deps.commandRepository.findByIdempotencyKey(command.idempotencyKey))
              : undefined);

          if (existing?.status === 'Committed' && existing.resultJson !== undefined) {
            return JSON.parse(existing.resultJson) as ReturnType<typeof handler>;
          }

          const now = deps.now().toISOString();
          try {
            const result = measure('command.handlerMs', handler);
            const resultJson = JSON.stringify(result);
            measure('command.appendCommittedMs', () => {
              deps.commandRepository.appendNew({
                commandId: command.commandId,
                idempotencyKey: command.idempotencyKey,
                status: 'Committed',
                resultJson,
                createdAt: now,
                updatedAt: deps.now().toISOString(),
              });
            });

            return result;
          } catch (error) {
            measure('command.appendFailedMs', () => {
              deps.commandRepository.appendNew({
                commandId: command.commandId,
                idempotencyKey: command.idempotencyKey,
                status: 'Failed',
                errorCode: toCommandErrorCode(error),
                createdAt: now,
                updatedAt: deps.now().toISOString(),
              });
            });
            throw error;
          }
        });
      } finally {
        recordStage('command.totalWithLockMs', Date.now() - totalStartedAt);
      }
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

function toCommandErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim() !== '') return code.trim();
  }
  return 'COMMAND_HANDLER_FAILED';
}

export function createCommandCoordinatorForTest() {
  let sequence = 0;
  const coordinator = createCommandCoordinator({
    commandRepository: createInMemoryCommandRepository(),
    lockProvider: createImmediateLockProvider(),
    now: () => new Date('2026-07-26T00:00:00.000Z'),
    newId(prefix) {
      sequence += 1;
      return `${prefix}-${sequence}`;
    },
  });

  return {
    ...coordinator,
  };
}
