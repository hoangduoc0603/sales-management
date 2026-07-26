import type { ApiResult } from '@shared/contracts/api';
import type { ApiAction, OperationKind, OperationName } from '@shared/contracts/platform/operations';
import type { ApiContext } from './api-context';

export interface OperationEntry<TInput = unknown, TOutput = unknown> {
  name: OperationName;
  kind: OperationKind;
  requiredAction?: ApiAction;
  parsePayload: (payload: unknown) => TInput;
  handler: (input: TInput, context: ApiContext) => TOutput | ApiResult<TOutput>;
}

export interface OperationRegistry {
  get(name: OperationName): OperationEntry | undefined;
}

export function createOperationRegistry(entries: readonly OperationEntry[]): OperationRegistry {
  const byName = new Map<OperationName, OperationEntry>();

  for (const entry of entries) {
    byName.set(entry.name, entry);
  }

  return {
    get(name) {
      return byName.get(name);
    },
  };
}
