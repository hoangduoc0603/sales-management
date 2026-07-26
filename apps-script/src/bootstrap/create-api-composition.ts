import type { AuthLoginRequest } from '@shared/contracts/platform/auth';
import type { CommandStatusRequest } from '@shared/contracts/platform/command';
import { parseAuthLoginRequest } from '@shared/schemas/platform/auth';
import { parseCommandStatusRequest } from '@shared/schemas/platform/command';
import { createInvokeHandler, type Clock } from '../api/invoke';
import { createOperationRegistry } from '../api/operation-registry';
import { createInMemoryAuditOutboxRepository } from '../repositories/platform/audit-outbox-repository';
import { createInMemoryAuthRepository } from '../repositories/platform/auth-repository';
import { createInMemoryCommandRepository } from '../repositories/platform/command-repository';
import { createStaticTableRegistryRepository } from '../repositories/platform/table-registry-repository';
import { createImmediateLockProvider } from '../infrastructure/platform/runtime';
import { createAuthorizationService } from '../services/platform/authorization/authorization-service';
import { createInMemoryAuthorizationRepository } from '../repositories/platform/authorization-repository';
import { createCommandCoordinator } from '../services/platform/command/command-coordinator';
import {
  actorFromSessionResult,
  createAdminUserFixture,
  createSessionService,
} from '../services/platform/auth/session-service';
import { createDeterministicPasswordServiceForTest } from '../services/platform/auth/password-service';
import {
  createPlatformTableDefinitions,
  createTableRegistryService,
} from '../services/platform/registry/table-registry';

export function createApiComposition(clock: Clock) {
  let idSequence = 0;
  const newId = (prefix: string) => {
    idSequence += 1;
    return `${prefix}-${idSequence}`;
  };
  const sessionService = createSessionService({
    clock,
    idGenerator: {
      newId,
    },
    repository: createInMemoryAuthRepository([createAdminUserFixture()]),
    passwordService: createDeterministicPasswordServiceForTest(),
  });
  const authorizationService = createAuthorizationService(
    createInMemoryAuthorizationRepository([
      {
        userId: 'user-admin',
        actions: [
          'platform.auth.logout',
          'platform.session.view',
          'platform.command.view',
          'platform.registry.view',
        ],
        tenantId: 'tenant-default',
        branchIds: ['branch-default'],
        warehouseIds: ['warehouse-default'],
      },
    ]),
  );
  const commandCoordinator = createCommandCoordinator({
    commandRepository: createInMemoryCommandRepository(),
    auditOutboxRepository: createInMemoryAuditOutboxRepository(),
    lockProvider: createImmediateLockProvider(),
    now: () => clock.now(),
    newId,
  });
  const tableRegistryService = createTableRegistryService(
    createStaticTableRegistryRepository(createPlatformTableDefinitions()),
  );
  const registry = createOperationRegistry([
    {
      name: 'platform.auth.login',
      kind: 'public',
      parsePayload: parseAuthLoginRequest,
      handler: (input) => {
        return sessionService.login(input as AuthLoginRequest);
      },
    },
    {
      name: 'platform.auth.logout',
      kind: 'query',
      requiredAction: 'platform.auth.logout',
      parsePayload: () => ({}),
      handler: (_input, context) => sessionService.logout(context.sessionToken ?? ''),
    },
    {
      name: 'platform.session.me',
      kind: 'query',
      requiredAction: 'platform.session.view',
      parsePayload: () => ({}),
      handler: (_input, context) => ({
        actor: context.actor,
        idleExpiresAt: new Date(clock.now().getTime() + 60 * 60 * 1000).toISOString(),
        absoluteExpiresAt: new Date(clock.now().getTime() + 8 * 60 * 60 * 1000).toISOString(),
      }),
    },
    {
      name: 'platform.command.getStatus',
      kind: 'query',
      requiredAction: 'platform.command.view',
      parsePayload: parseCommandStatusRequest,
      handler: (input) => ({
        command: commandCoordinator.getStatus(input as CommandStatusRequest),
      }),
    },
    {
      name: 'platform.registry.getTableDefinitions',
      kind: 'query',
      requiredAction: 'platform.registry.view',
      parsePayload: () => ({}),
      handler: () => ({
        tables: tableRegistryService.getDefinitions(),
      }),
    },
  ]);

  return {
    invoke: createInvokeHandler({
      clock,
      registry,
      authenticate: (sessionToken) => actorFromSessionResult(sessionService.validateSession(sessionToken)),
      authorize: (actor, action) => authorizationService.requireAction(actor, action).ok,
    }),
  };
}
