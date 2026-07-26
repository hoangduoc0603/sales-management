import type { ApiErrorCode } from '@shared/contracts/errors';
import type { ScopeSelectionDTO } from '@shared/contracts/platform/authorization';
import type { ApiAction } from '@shared/contracts/platform/operations';
import {
  createInMemoryAuthorizationRepository,
  type AuthorizationRepository,
} from '../../../repositories/platform/authorization-repository';

export type AuthorizationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: Extract<ApiErrorCode, 'PERMISSION_DENIED' | 'SCOPE_DENIED'>;
    };

export interface AuthorizationService {
  requireAction(actor: { userId: string; actions?: readonly string[] }, action: ApiAction): AuthorizationResult;
  resolveScope(actor: { userId: string }, scope: ScopeSelectionDTO): AuthorizationResult;
}

export function createAuthorizationService(repository: AuthorizationRepository): AuthorizationService {
  return {
    requireAction(actor, action) {
      const actions = actor.actions ?? repository.findUserAuthorization(actor.userId)?.actions ?? [];

      if (!actions.includes(action)) {
        return { ok: false, code: 'PERMISSION_DENIED' };
      }

      return { ok: true };
    },
    resolveScope(actor, scope) {
      const authorization = repository.findUserAuthorization(actor.userId);

      if (authorization === undefined) {
        return { ok: false, code: 'SCOPE_DENIED' };
      }

      if (scope.tenantId !== undefined && scope.tenantId !== authorization.tenantId) {
        return { ok: false, code: 'SCOPE_DENIED' };
      }

      if (scope.branchId !== undefined && !authorization.branchIds.includes(scope.branchId)) {
        return { ok: false, code: 'SCOPE_DENIED' };
      }

      if (scope.warehouseId !== undefined && !authorization.warehouseIds.includes(scope.warehouseId)) {
        return { ok: false, code: 'SCOPE_DENIED' };
      }

      return { ok: true };
    },
  };
}

export function createAuthorizationServiceForTest(): AuthorizationService {
  return createAuthorizationService(
    createInMemoryAuthorizationRepository([
      {
        userId: 'cashier-1',
        actions: ['platform.session.view'],
        tenantId: 'tenant-default',
        branchIds: ['branch-default'],
        warehouseIds: ['warehouse-1'],
      },
    ]),
  );
}
