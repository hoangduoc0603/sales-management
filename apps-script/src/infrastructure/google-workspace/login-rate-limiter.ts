import type { LoginRateLimiter } from '../../services/platform/auth/session-service';

export interface AppsScriptLoginRateLimiterDependencies {
  cacheService: {
    getScriptCache(): {
      get(key: string): string | null;
      put(key: string, value: string, expirationInSeconds: number): unknown;
    };
  };
  maxAttemptsPerMinute?: number;
}

export function createAppsScriptLoginRateLimiter(
  deps: AppsScriptLoginRateLimiterDependencies,
): LoginRateLimiter {
  const maxAttemptsPerMinute = deps.maxAttemptsPerMinute ?? 10;

  return {
    canAttempt(input) {
      const cache = deps.cacheService.getScriptCache();
      const key = toAttemptKey(input.loginId, input.now);
      const current = Number(cache.get(key) ?? '0');
      if (Number.isFinite(current) && current >= maxAttemptsPerMinute) {
        return false;
      }
      cache.put(key, String((Number.isFinite(current) ? current : 0) + 1), 60);
      return true;
    },
  };
}

function toAttemptKey(loginId: string, now: Date): string {
  const normalizedLoginId = loginId.trim().toLowerCase();
  const minuteBucket = Math.floor(now.getTime() / 60_000);
  return `salesManagement.loginRate.${normalizedLoginId}.${minuteBucket}`;
}
