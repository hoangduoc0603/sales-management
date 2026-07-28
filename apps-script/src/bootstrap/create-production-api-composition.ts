import type { Clock } from '../api/invoke';
import type { LockProvider } from '../infrastructure/platform/runtime';
import type { RuntimeConfigStore } from '../infrastructure/google-workspace/runtime-config-store';
import type { AppendOnlySheetRecordGateway } from '../repositories/platform/sheet-record-repository';
import type { CredentialVerifierStore } from '../repositories/platform/auth-repository';
import {
  createAppsScriptPbkdf2PasswordService,
  type PasswordService,
} from '../services/platform/auth/password-service';
import { createPlatformTableDefinitions } from '../services/platform/registry/table-registry';
import {
  createApiCompositionFromDependencies,
  type ApiCompositionDependencies,
} from './create-api-composition';
import { createProductionRepositories } from './create-production-repositories';

export interface ProductionApiCompositionDependencies {
  clock: Clock;
  runtimeConfigStore: RuntimeConfigStore;
  sheetGateway: AppendOnlySheetRecordGateway;
  credentialVerifierStore: CredentialVerifierStore;
  lockProvider: LockProvider;
  passwordService?: PasswordService;
}

export function createProductionApiComposition(deps: ProductionApiCompositionDependencies) {
  const runtimeConfig = deps.runtimeConfigStore.getActiveConfig();
  if (runtimeConfig === undefined) {
    throw new Error('Missing active runtime config.');
  }

  const tableDefinitions = createPlatformTableDefinitions();
  const repositories = createProductionRepositories({
    sheetGateway: deps.sheetGateway,
    tableDefinitions,
    transactionPartitionKey: runtimeConfig.storage.transaction.activePartitionKey,
    auditPartitionKey: runtimeConfig.storage.audit.activePartitionKey,
    credentialVerifierStore: deps.credentialVerifierStore,
  });
  const compositionDeps: ApiCompositionDependencies = {
    clock: deps.clock,
    repositories,
    passwordService: deps.passwordService ?? createAppsScriptPbkdf2PasswordService(),
    lockProvider: deps.lockProvider,
    tableDefinitions,
    tenantId: runtimeConfig.tenantId,
    bootstrapOnStart: false,
    seedDemoReadModels: false,
  };

  return createApiCompositionFromDependencies(compositionDeps);
}
