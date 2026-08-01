import { createApiClient, type ApiClient } from './client';
import { createGoogleScriptRunInvoker } from './google-script-run';
import { createLocalFakeBackendClient } from './local-fake-backend';

export type RuntimeApiMode = 'apps-script' | 'local-fake';

export interface RuntimeApiClientOptions {
  hasGoogleScriptRun?: () => boolean;
  isAppsScriptRuntime?: () => boolean;
  appsScriptClient?: ApiClient;
  localClient?: ApiClient;
}

export function createRuntimeApiClient(options: RuntimeApiClientOptions = {}): ApiClient {
  if (detectRuntimeApiMode(options) === 'apps-script') {
    return options.appsScriptClient ?? createApiClient(createGoogleScriptRunInvoker());
  }

  return options.localClient ?? createLocalFakeBackendClient();
}

export function detectRuntimeApiMode(
  options: Pick<RuntimeApiClientOptions, 'hasGoogleScriptRun' | 'isAppsScriptRuntime'> = {},
): RuntimeApiMode {
  const isAppsScriptRuntime = options.isAppsScriptRuntime ?? defaultIsAppsScriptRuntime;
  if (isAppsScriptRuntime()) {
    return 'apps-script';
  }

  const hasGoogleScriptRun = options.hasGoogleScriptRun ?? defaultHasGoogleScriptRun;
  return hasGoogleScriptRun() ? 'apps-script' : 'local-fake';
}

function defaultHasGoogleScriptRun(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.google?.script?.run !== undefined
  );
}

function defaultIsAppsScriptRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const candidates = [window.location?.href, typeof document === 'undefined' ? undefined : document.referrer].filter(
    (candidate): candidate is string => Boolean(candidate),
  );
  return candidates.some((candidate) => {
    const parsed = new URL(candidate, 'http://localhost');
    return (
      parsed.hostname === 'script.google.com' ||
      parsed.hostname.endsWith('.googleusercontent.com') ||
      parsed.pathname.includes('/macros/s/')
    );
  });
}
