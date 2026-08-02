import type { CatalogPosProjectionResponse } from '@shared/contracts/catalog/catalog';
import type {
  SalesPosPrewarmCheckoutContextRequest,
  SalesPosPrewarmCheckoutContextResponse,
} from '@shared/contracts/sales/sales';
import type { ApiClient } from '../../../lib/api/client';

const posCatalogProjectionCachePrefix = 'cenio:pos-catalog-projection:v3';
const posCatalogProjectionDatabaseName = 'cenio-pos-catalog-projection';
const posCatalogProjectionStoreName = 'projections';

export interface LoadPosCatalogProjectionInput {
  apiClient: ApiClient;
  requestId: string;
  sessionToken: string;
  branchId: string;
  warehouseId: string;
}

export interface PrewarmPosCheckoutContextInput extends SalesPosPrewarmCheckoutContextRequest {
  apiClient: ApiClient;
  requestId: string;
  sessionToken: string;
}

export interface PosCatalogProjectionCacheKeyInput {
  branchId: string;
  warehouseId: string;
  cacheNamespace?: string;
  store?: PosCatalogProjectionStore;
}

export interface WriteCachedPosCatalogProjectionInput extends PosCatalogProjectionCacheKeyInput {
  now?: () => number;
  projection: CatalogPosProjectionResponse;
}

export interface CachedPosCatalogProjectionEntry {
  cachedAt: string;
  projection: CatalogPosProjectionResponse;
}

export interface PosCatalogProjectionStore {
  read(key: string): Promise<unknown>;
  write(key: string, cacheNamespace: string, value: CachedPosCatalogProjectionEntry): Promise<void>;
  clearNamespace(cacheNamespace: string): Promise<void>;
}

export interface ClearCachedPosCatalogProjectionNamespaceInput {
  cacheNamespace: string;
  store?: PosCatalogProjectionStore;
}

export interface PosCatalogCacheNamespaceInput {
  tenantId: string;
  userId: string;
  authVersion: number;
  appVersion: string;
  schemaVersion: number;
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

export async function prewarmPosCheckoutContext({
  apiClient,
  branchId,
  cashierId,
  requestId,
  sessionToken,
  shiftId,
  variantIds,
  warehouseId,
}: PrewarmPosCheckoutContextInput): Promise<SalesPosPrewarmCheckoutContextResponse> {
  const uniqueVariantIds = [...new Set(variantIds)].slice(0, 20);
  const result = await apiClient.invoke<SalesPosPrewarmCheckoutContextResponse>({
    operation: 'sales.pos.prewarmCheckoutContext',
    requestId,
    sessionToken,
    payload: {
      branchId,
      warehouseId,
      cashierId,
      shiftId,
      variantIds: uniqueVariantIds,
    },
  });

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export async function readCachedPosCatalogProjection({
  branchId,
  cacheNamespace,
  store = getBrowserIndexedDbStore(),
  warehouseId,
}: PosCatalogProjectionCacheKeyInput): Promise<CatalogPosProjectionResponse | undefined> {
  return (await readCachedPosCatalogProjectionEntry({ branchId, cacheNamespace, store, warehouseId }))?.projection;
}

export async function readCachedPosCatalogProjectionEntry({
  branchId,
  cacheNamespace,
  store = getBrowserIndexedDbStore(),
  warehouseId,
}: PosCatalogProjectionCacheKeyInput): Promise<CachedPosCatalogProjectionEntry | undefined> {
  if (store === undefined) return undefined;
  const key = buildPosCatalogProjectionCacheKey({ branchId, cacheNamespace, warehouseId });

  try {
    const parsed = await store.read(key);
    if (!isCachedPosCatalogProjectionEntry(parsed, branchId, warehouseId)) {
      await store.clearNamespace(cacheNamespace ?? 'anonymous');
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export async function writeCachedPosCatalogProjection({
  branchId,
  cacheNamespace,
  now = Date.now,
  projection,
  store = getBrowserIndexedDbStore(),
  warehouseId,
}: WriteCachedPosCatalogProjectionInput): Promise<void> {
  if (store === undefined) return;
  if (!isCatalogPosProjectionResponse(projection, branchId, warehouseId)) return;
  const key = buildPosCatalogProjectionCacheKey({ branchId, cacheNamespace, warehouseId });

  try {
    await store.write(key, cacheNamespace ?? 'anonymous', {
      cachedAt: new Date(now()).toISOString(),
      projection,
    });
  } catch {
    // Browser storage can be disabled or full. POS remains functional by falling
    // back to the remote projection path.
  }
}

export async function clearCachedPosCatalogProjectionNamespace({
  cacheNamespace,
  store = getBrowserIndexedDbStore(),
}: ClearCachedPosCatalogProjectionNamespaceInput): Promise<void> {
  if (store === undefined) return;
  try {
    await store.clearNamespace(cacheNamespace);
  } catch {
    // Cache cleanup is best-effort. Auth/scope remain enforced server-side.
  }
}

export function buildPosCatalogCacheNamespace({
  appVersion,
  authVersion,
  schemaVersion,
  tenantId,
  userId,
}: PosCatalogCacheNamespaceInput): string {
  return `${tenantId}:${userId}:auth-${authVersion}:app-${appVersion}:schema-${schemaVersion}`;
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

function getBrowserIndexedDbStore(): PosCatalogProjectionStore | undefined {
  if (typeof indexedDB === 'undefined') return undefined;
  return createIndexedDbPosCatalogProjectionStore(indexedDB);
}

function createIndexedDbPosCatalogProjectionStore(factory: IDBFactory): PosCatalogProjectionStore {
  return {
    async read(key) {
      const database = await openDatabase(factory);
      const transaction = database.transaction(posCatalogProjectionStoreName, 'readonly');
      const result = await requestResult<IndexedDbProjectionRecord | undefined>(
        transaction.objectStore(posCatalogProjectionStoreName).get(key),
      );
      await transactionComplete(transaction);
      database.close();
      return result?.value;
    },
    async write(key, cacheNamespace, value) {
      const database = await openDatabase(factory);
      const transaction = database.transaction(posCatalogProjectionStoreName, 'readwrite');
      transaction.objectStore(posCatalogProjectionStoreName).put({ key, cacheNamespace, value } satisfies IndexedDbProjectionRecord);
      await transactionComplete(transaction);
      database.close();
    },
    async clearNamespace(cacheNamespace) {
      const database = await openDatabase(factory);
      const transaction = database.transaction(posCatalogProjectionStoreName, 'readwrite');
      const store = transaction.objectStore(posCatalogProjectionStoreName);
      const records = await requestResult<IndexedDbProjectionRecord[]>(store.getAll());
      for (const record of records) {
        if (record.cacheNamespace === cacheNamespace) store.delete(record.key);
      }
      await transactionComplete(transaction);
      database.close();
    },
  };
}

interface IndexedDbProjectionRecord {
  key: string;
  cacheNamespace: string;
  value: CachedPosCatalogProjectionEntry;
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(posCatalogProjectionDatabaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(posCatalogProjectionStoreName)) {
        request.result.createObjectStore(posCatalogProjectionStoreName, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Không thể mở IndexedDB cache POS.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Không thể đọc IndexedDB cache POS.'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Không thể ghi IndexedDB cache POS.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB cache POS đã bị hủy.'));
  });
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
