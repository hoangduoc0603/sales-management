export type InstallReadiness = 'checking' | 'check-failed' | 'required' | 'installing' | 'installed';

export type SalesManagementAppStage =
  | 'install-checking'
  | 'install-check-failed'
  | 'install-required'
  | 'installing'
  | 'auth'
  | 'bootstrapping'
  | 'workspace';

export interface SalesManagementAppStageInput {
  authMode: 'login' | 'change-password-required';
  installReadiness?: InstallReadiness;
  sessionReady: boolean;
  actorReady: boolean;
  scopeReady: boolean;
  bootstrapping: boolean;
}

export function resolveSalesManagementAppStage({
  actorReady,
  authMode,
  bootstrapping,
  installReadiness = 'installed',
  scopeReady,
  sessionReady,
}: SalesManagementAppStageInput): SalesManagementAppStage {
  if (installReadiness === 'checking') {
    return 'install-checking';
  }

  if (installReadiness === 'check-failed') {
    return 'install-check-failed';
  }

  if (installReadiness === 'required') {
    return 'install-required';
  }

  if (installReadiness === 'installing') {
    return 'installing';
  }

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
