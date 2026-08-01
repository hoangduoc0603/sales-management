import type { CatalogPosProjectionResponse } from '@shared/contracts/catalog/catalog';
import type { ApiClient } from '../../../lib/api/client';

const posCatalogProjectionCachePrefix = 'cenio:pos-catalog-projection:v2';

export interface LoadPosCatalogProjectionInput {
  apiClient: ApiClient;
  requestId: string;
  sessionToken: string;
  branchId: string;
  warehouseId: string;
}

export interface PosCatalogProjectionCacheKeyInput {
  branchId: string;
  warehouseId: string;
  cacheNamespace?: string;
  storage?: Storage;
}

export interface WriteCachedPosCatalogProjectionInput extends PosCatalogProjectionCacheKeyInput {
  now?: () => number;
  projection: CatalogPosProjectionResponse;
}

export interface CachedPosCatalogProjectionEntry {
  cachedAt: string;
  projection: CatalogPosProjectionResponse;
}

export interface ShouldRefreshCachedPosCatalogProjectionInput {
  cachedAt: string;
  maxAgeMs: number;
  now?: () => number;
  projection?: CatalogPosProjectionResponse;
}

export async function loadPosCatalogProjection({
  apiClient,
  branchId,
  requestId,
  sessionToken,
  warehouseId,
}: LoadPosCatalogProjectionInput): Promise<CatalogPosProjectionResponse> {
  const result = await apiClient.invoke<CatalogPosProjectionResponse>({
    operation: 'catalog.pos.getProjection',
    requestId,
    sessionToken,
    payload: {
      branchId,
      warehouseId,
    },
  });

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export function readCachedPosCatalogProjection({
  branchId,
  cacheNamespace,
  storage = getBrowserLocalStorage(),
  warehouseId,
}: PosCatalogProjectionCacheKeyInput): CatalogPosProjectionResponse | undefined {
  return readCachedPosCatalogProjectionEntry({ branchId, cacheNamespace, storage, warehouseId })?.projection;
}

export function readCachedPosCatalogProjectionEntry({
  branchId,
  cacheNamespace,
  storage = getBrowserLocalStorage(),
  warehouseId,
}: PosCatalogProjectionCacheKeyInput): CachedPosCatalogProjectionEntry | undefined {
  if (storage === undefined) return undefined;
  const key = buildPosCatalogProjectionCacheKey({ branchId, cacheNamespace, warehouseId });

  try {
    const raw = storage.getItem(key);
    if (raw === null) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!isCachedPosCatalogProjectionEntry(parsed, branchId, warehouseId)) {
      storage.removeItem(key);
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function writeCachedPosCatalogProjection({
  branchId,
  cacheNamespace,
  now = Date.now,
  projection,
  storage = getBrowserLocalStorage(),
  warehouseId,
}: WriteCachedPosCatalogProjectionInput): void {
  if (storage === undefined) return;
  if (!isCatalogPosProjectionResponse(projection, branchId, warehouseId)) return;
  const key = buildPosCatalogProjectionCacheKey({ branchId, cacheNamespace, warehouseId });

  try {
    storage.setItem(
      key,
      JSON.stringify({
        cachedAt: new Date(now()).toISOString(),
        projection,
      } satisfies CachedPosCatalogProjectionEntry),
    );
  } catch {
    // Browser storage can be disabled or full. POS remains functional by falling
    // back to the remote projection path.
  }
}

export function shouldRefreshCachedPosCatalogProjection({
  cachedAt,
  maxAgeMs,
  now = Date.now,
  projection,
}: ShouldRefreshCachedPosCatalogProjectionInput): boolean {
  if (projection !== undefined && projection.variants.length === 0) return true;
  const cachedAtMs = Date.parse(cachedAt);
  if (!Number.isFinite(cachedAtMs)) return true;
  return now() - cachedAtMs > maxAgeMs;
}

function buildPosCatalogProjectionCacheKey({
  branchId,
  cacheNamespace = 'anonymous',
  warehouseId,
}: PosCatalogProjectionCacheKeyInput): string {
  return `${posCatalogProjectionCachePrefix}:${encodeURIComponent(cacheNamespace)}:${encodeURIComponent(
    branchId,
  )}:${encodeURIComponent(warehouseId)}`;
}

function getBrowserLocalStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isCachedPosCatalogProjectionEntry(
  value: unknown,
  branchId: string,
  warehouseId: string,
): value is CachedPosCatalogProjectionEntry {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<CachedPosCatalogProjectionEntry>;
  return (
    typeof candidate.cachedAt === 'string' &&
    candidate.projection !== undefined &&
    isCatalogPosProjectionResponse(candidate.projection, branchId, warehouseId)
  );
}

function isCatalogPosProjectionResponse(
  value: unknown,
  branchId: string,
  warehouseId: string,
): value is CatalogPosProjectionResponse {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<CatalogPosProjectionResponse>;
  return (
    candidate.branchId === branchId &&
    candidate.warehouseId === warehouseId &&
    typeof candidate.projectionVersion === 'string' &&
    typeof candidate.generatedAt === 'string' &&
    Array.isArray(candidate.variants)
  );
}
