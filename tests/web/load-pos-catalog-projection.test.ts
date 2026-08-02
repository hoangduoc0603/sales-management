import { describe, expect, it } from 'vitest';
import type { ApiClient } from '../../web/src/lib/api/client';
import {
  loadPosCatalogProjection,
  prewarmPosCheckoutContext,
  readCachedPosCatalogProjection,
  readCachedPosCatalogProjectionEntry,
  shouldRefreshCachedPosCatalogProjection,
  writeCachedPosCatalogProjection,
} from '../../web/src/features/pos/catalog-cache/load-pos-catalog-projection';

describe('loadPosCatalogProjection', () => {
  it('gọi đúng single RPC projection một lần theo Branch/Warehouse scope', async () => {
    const calls: unknown[] = [];
    const client: ApiClient = {
      async invoke(request) {
        calls.push(request);

        return {
          ok: true,
          data: {
            projectionVersion: 'catalog-pos-v1',
            branchId: 'branch-default',
            warehouseId: 'warehouse-default',
            generatedAt: '2026-07-27T00:00:00.000Z',
            variants: [],
          },
          meta: {
            requestId: request.requestId,
            operation: request.operation,
            serverTime: '2026-07-27T00:00:00.000Z',
            durationMs: 0,
            stages: {},
            io: {},
          },
        };
      },
    };

    await expect(
      loadPosCatalogProjection({
        apiClient: client,
        requestId: 'req-pos-catalog',
        sessionToken: 'session-token',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
      }),
    ).resolves.toMatchObject({
      projectionVersion: 'catalog-pos-v1',
    });

    expect(calls).toEqual([
      {
        operation: 'catalog.pos.getProjection',
        requestId: 'req-pos-catalog',
        sessionToken: 'session-token',
        payload: {
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
        },
      },
    ]);
  });

  it('gọi prewarm checkout context ở nền với payload nhỏ và không trả business data', async () => {
    const calls: unknown[] = [];
    const client: ApiClient = {
      async invoke(request) {
        calls.push(request);

        return {
          ok: true,
          data: {
            warmed: { shift: true, balances: 2 },
            generatedAt: '2026-08-02T08:00:00.000Z',
          },
          meta: {
            requestId: request.requestId,
            operation: request.operation,
            serverTime: '2026-08-02T08:00:00.000Z',
            durationMs: 0,
            stages: {},
            io: {},
          },
        };
      },
    };

    await expect(
      prewarmPosCheckoutContext({
        apiClient: client,
        requestId: 'req-pos-prewarm',
        sessionToken: 'session-token',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'user-admin',
        shiftId: 'shift-local-open',
        variantIds: ['variant-1', 'variant-2', 'variant-1'],
      }),
    ).resolves.toEqual({ warmed: { shift: true, balances: 2 }, generatedAt: '2026-08-02T08:00:00.000Z' });

    expect(calls).toEqual([
      {
        operation: 'sales.pos.prewarmCheckoutContext',
        requestId: 'req-pos-prewarm',
        sessionToken: 'session-token',
        payload: {
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          cashierId: 'user-admin',
          shiftId: 'shift-local-open',
          variantIds: ['variant-1', 'variant-2'],
        },
      },
    ]);
    expect(JSON.stringify(calls)).not.toContain('admin123');
  });

  it('lưu và đọc browser cache theo namespace + Branch/Warehouse mà không lưu session token', () => {
    const storage = createMemoryStorage();
    const projection = {
      projectionVersion: 'catalog-pos-v2',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      generatedAt: '2026-07-27T00:00:00.000Z',
      variants: [],
    };

    writeCachedPosCatalogProjection({
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      cacheNamespace: 'tenant-default:user-admin:v1',
      storage,
      projection,
      now: () => 1_785_581_000_000,
    });

    expect(
      readCachedPosCatalogProjection({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cacheNamespace: 'tenant-default:user-admin:v1',
        storage,
      }),
    ).toEqual(projection);
    expect(
      readCachedPosCatalogProjectionEntry({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cacheNamespace: 'tenant-default:user-admin:v1',
        storage,
      }),
    ).toMatchObject({
      cachedAt: '2026-08-01T10:43:20.000Z',
      projection,
    });
    expect(
      readCachedPosCatalogProjection({
        branchId: 'branch-default',
        warehouseId: 'warehouse-other',
        cacheNamespace: 'tenant-default:user-admin:v1',
        storage,
      }),
    ).toBeUndefined();
    expect(JSON.stringify([...storage.entries()])).not.toContain('session-token');
  });

  it('xác định cache POS còn tươi để tránh gọi Apps Script lại khi vừa refresh', () => {
    expect(
      shouldRefreshCachedPosCatalogProjection({
        cachedAt: '2026-08-01T10:00:00.000Z',
        maxAgeMs: 5 * 60 * 1000,
        now: () => Date.parse('2026-08-01T10:04:59.000Z'),
      }),
    ).toBe(false);
    expect(
      shouldRefreshCachedPosCatalogProjection({
        cachedAt: '2026-08-01T10:00:00.000Z',
        maxAgeMs: 5 * 60 * 1000,
        now: () => Date.parse('2026-08-01T10:05:01.000Z'),
      }),
    ).toBe(true);
    expect(
      shouldRefreshCachedPosCatalogProjection({
        cachedAt: 'not-a-date',
        maxAgeMs: 5 * 60 * 1000,
        now: () => Date.parse('2026-08-01T10:04:59.000Z'),
      }),
    ).toBe(true);
  });

  it('luôn refresh cache POS rỗng để không kẹt danh mục sau khi sản phẩm được tạo', () => {
    expect(
      shouldRefreshCachedPosCatalogProjection({
        cachedAt: '2026-08-01T10:00:00.000Z',
        maxAgeMs: 5 * 60 * 1000,
        now: () => Date.parse('2026-08-01T10:01:00.000Z'),
        projection: {
          projectionVersion: 'catalog-pos-empty',
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          generatedAt: '2026-08-01T10:00:00.000Z',
          variants: [],
        },
      }),
    ).toBe(true);
  });
});

function createMemoryStorage(): Storage & { entries(): IterableIterator<[string, string]> } {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    entries: () => values.entries(),
  } as Storage & { entries(): IterableIterator<[string, string]> };
}
