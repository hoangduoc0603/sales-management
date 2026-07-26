import { createApiClient, type ApiClient } from './client';
import { createGoogleScriptRunInvoker } from './google-script-run';
import { createLocalFakeBackendClient } from './local-fake-backend';

export type RuntimeApiMode = 'apps-script' | 'local-fake';

export interface RuntimeApiClientOptions {
  hasGoogleScriptRun?: () => boolean;
  appsScriptClient?: ApiClient;
  localClient?: ApiClient;
}

export function createRuntimeApiClient(options: RuntimeApiClientOptions = {}): ApiClient {
  if (detectRuntimeApiMode(options) === 'apps-script') {
    return options.appsScriptClient ?? createApiClient(createGoogleScriptRunInvoker());
  }

  return options.localClient ?? createLocalFakeBackendClient();
}

export function detectRuntimeApiMode(options: Pick<RuntimeApiClientOptions, 'hasGoogleScriptRun'> = {}): RuntimeApiMode {
  const hasGoogleScriptRun = options.hasGoogleScriptRun ?? defaultHasGoogleScriptRun;
  return hasGoogleScriptRun() ? 'apps-script' : 'local-fake';
}

function defaultHasGoogleScriptRun(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.google?.script?.run !== undefined
  );
}
