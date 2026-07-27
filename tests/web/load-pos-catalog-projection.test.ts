import { describe, expect, it } from 'vitest';
import type { ApiClient } from '../../web/src/lib/api/client';
import { loadPosCatalogProjection } from '../../web/src/features/pos/catalog-cache/load-pos-catalog-projection';

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
});
