import { describe, expect, it } from 'vitest';
import type { ApiClient } from '../../web/src/lib/api/client';
import {
  loadPosCatalogProjection,
  prewarmPosCheckoutContext,
  buildPosCatalogCacheNamespace,
  clearCachedPosCatalogProjectionNamespace,
  readCachedPosCatalogProjection,
  readCachedPosCatalogProjectionEntry,
  shouldRefreshCachedPosCatalogProjection,
  writeCachedPosCatalogProjection,
} from '../../web/src/features/pos/catalog-cache/load-pos-catalog-projection';
import type {
  PosCatalogProjectionStore,
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

  it('lưu và đọc browser cache theo namespace + Branch/Warehouse mà không lưu session token', async () => {
    const store = createMemoryProjectionStore();
    const projection = {
      projectionVersion: 'catalog-pos-v2',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      generatedAt: '2026-07-27T00:00:00.000Z',
      variants: [],
    };

    await writeCachedPosCatalogProjection({
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      cacheNamespace: 'tenant-default:user-admin:v1',
      store,
      projection,
      now: () => 1_785_581_000_000,
    });

    await expect(
      readCachedPosCatalogProjection({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cacheNamespace: 'tenant-default:user-admin:v1',
        store,
      }),
    ).resolves.toEqual(projection);
    await expect(
      readCachedPosCatalogProjectionEntry({
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cacheNamespace: 'tenant-default:user-admin:v1',
        store,
      }),
    ).resolves.toMatchObject({
      cachedAt: '2026-08-01T10:43:20.000Z',
      projection,
    });
    await expect(
      readCachedPosCatalogProjection({
        branchId: 'branch-default',
        warehouseId: 'warehouse-other',
        cacheNamespace: 'tenant-default:user-admin:v1',
        store,
      }),
    ).resolves.toBeUndefined();
    expect(JSON.stringify([...store.entries()])).not.toContain('session-token');
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

  it('xóa namespace cache bị hỏng và fallback cache miss khi IndexedDB không sẵn sàng', async () => {
    let clearedNamespace: string | undefined;
    const corruptStore: PosCatalogProjectionStore = {
      async read() {
        return { cachedAt: 'not-a-valid-entry' };
      },
      async write() {},
      async clearNamespace(cacheNamespace) {
        clearedNamespace = cacheNamespace;
      },
    };

    await expect(
      readCachedPosCatalogProjectionEntry({
        branchId: 'branch-default',
        cacheNamespace: 'tenant-default:user-admin:auth-1:app-0.1.0:schema-1',
        store: corruptStore,
        warehouseId: 'warehouse-default',
      }),
    ).resolves.toBeUndefined();
    expect(clearedNamespace).toBe('tenant-default:user-admin:auth-1:app-0.1.0:schema-1');

    await expect(
      readCachedPosCatalogProjection({
        branchId: 'branch-default',
        cacheNamespace: 'tenant-default:user-admin:auth-1:app-0.1.0:schema-1',
        store: undefined,
        warehouseId: 'warehouse-default',
      }),
    ).resolves.toBeUndefined();
  });

  it('lưu cache POS qua IndexedDB-style store và xóa đúng namespace khi logout/deploy đổi version', async () => {
    const store = createMemoryProjectionStore();
    const projection = {
      projectionVersion: 'catalog-pos-v3',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      generatedAt: '2026-08-02T00:00:00.000Z',
      variants: [],
    };
    const namespace = 'tenant-default:user-admin:auth-1:app-0.1.0:schema-1';

    expect(
      buildPosCatalogCacheNamespace({
        tenantId: 'tenant-default',
        userId: 'user-admin',
        authVersion: 1,
        appVersion: '0.1.0',
        schemaVersion: 1,
      }),
    ).toBe(namespace);

    await writeCachedPosCatalogProjection({
      branchId: 'branch-default',
      cacheNamespace: namespace,
      now: () => 1_785_633_200_000,
      projection,
      store,
      warehouseId: 'warehouse-default',
    });

    await expect(
      readCachedPosCatalogProjection({
        branchId: 'branch-default',
        cacheNamespace: namespace,
        store,
        warehouseId: 'warehouse-default',
      }),
    ).resolves.toEqual(projection);

    await clearCachedPosCatalogProjectionNamespace({ cacheNamespace: namespace, store });

    await expect(
      readCachedPosCatalogProjection({
        branchId: 'branch-default',
        cacheNamespace: namespace,
        store,
        warehouseId: 'warehouse-default',
      }),
    ).resolves.toBeUndefined();
    expect(JSON.stringify([...store.entries()])).not.toContain('session-token');
  });
});

function createMemoryProjectionStore(): PosCatalogProjectionStore & { entries(): IterableIterator<[string, unknown]> } {
  const values = new Map<string, { cacheNamespace: string; value: unknown }>();

  return {
    async read(key) {
      return values.get(key)?.value;
    },
    async write(key, cacheNamespace, value) {
      values.set(key, { cacheNamespace, value });
    },
    async clearNamespace(cacheNamespace) {
      for (const [key, entry] of values) {
        if (entry.cacheNamespace === cacheNamespace) values.delete(key);
      }
    },
    entries: () => values.entries(),
  };
}
