export type SalesManagementAppStage = 'auth' | 'bootstrapping' | 'workspace';

export interface SalesManagementAppStageInput {
  authMode: 'login' | 'change-password-required';
  sessionReady: boolean;
  actorReady: boolean;
  scopeReady: boolean;
  bootstrapping: boolean;
}

export function resolveSalesManagementAppStage({
  actorReady,
  authMode,
  bootstrapping,
  scopeReady,
  sessionReady,
}: SalesManagementAppStageInput): SalesManagementAppStage {
  if (authMode === 'change-password-required') {
    return 'auth';
  }

  if (!actorReady || !sessionReady) {
    return 'auth';
  }

  if (bootstrapping || !scopeReady) {
    return 'bootstrapping';
  }

  return 'workspace';
}
