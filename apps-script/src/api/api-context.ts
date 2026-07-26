import type { ApiCommand, ApiMeta } from '@shared/contracts/api';
import type { ActorContextDTO, ScopeResolutionDTO } from '@shared/contracts/platform/authorization';
import type { OperationName } from '@shared/contracts/platform/operations';

export interface Clock {
  now(): Date;
}

export interface ApiContext {
  requestId: string;
  operation: OperationName;
  startedAt: Date;
  clock: Clock;
  command?: ApiCommand;
  sessionToken?: string;
  actor?: ActorContextDTO;
  scope?: ScopeResolutionDTO;
}

export function createApiContext(input: {
  requestId: string;
  operation: OperationName;
  startedAt: Date;
  clock: Clock;
  command?: ApiCommand;
  sessionToken?: string;
  actor?: ActorContextDTO;
  scope?: ScopeResolutionDTO;
}): ApiContext {
  return input;
}

export function createMeta(context: {
  requestId: string;
  operation: string;
  startedAt: Date;
  clock: Clock;
}): ApiMeta {
  const finishedAt = context.clock.now();

  return {
    requestId: context.requestId,
    operation: context.operation,
    serverTime: finishedAt.toISOString(),
    durationMs: Math.max(0, finishedAt.getTime() - context.startedAt.getTime()),
    stages: {},
    io: {},
  };
}
