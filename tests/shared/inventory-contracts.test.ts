import { describe, expect, it } from 'vitest';
import { operationNames } from '../../shared/contracts/platform/operations';
import {
  parseInventoryIssueForSaleRequest,
  parseInventoryReceiveRequest,
  parseInventoryReserveRequest,
} from '../../shared/schemas/inventory/inventory';

describe('inventory shared contracts', () => {
  it('registers inventory operations in the shared operation list', () => {
    expect(operationNames).toContain('inventory.receive');
    expect(operationNames).toContain('inventory.issueForSale');
    expect(operationNames).toContain('inventory.reserve');
    expect(operationNames).toContain('inventory.release');
    expect(operationNames).toContain('inventory.return.receive');
    expect(operationNames).toContain('inventory.return.restock');
    expect(operationNames).toContain('inventory.balance.getSummary');
  });

  it('requires positive milli quantity and integer VND values for receive', () => {
    expect(() =>
      parseInventoryReceiveRequest({
        commandId: 'cmd-receive-1',
        idempotencyKey: 'idem-receive-1',
        warehouseId: 'warehouse-default',
        variantId: 'variant-1',
        quantityMilli: 1_000,
        unitCostVnd: 100_000,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
      }),
    ).not.toThrow();

    expect(() =>
      parseInventoryReceiveRequest({
        commandId: 'cmd-receive-1',
        idempotencyKey: 'idem-receive-1',
        warehouseId: 'warehouse-default',
        variantId: 'variant-1',
        quantityMilli: 0,
        unitCostVnd: 100_000,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
      }),
    ).toThrow();

    expect(() =>
      parseInventoryReceiveRequest({
        commandId: 'cmd-receive-1',
        idempotencyKey: 'idem-receive-1',
        warehouseId: 'warehouse-default',
        variantId: 'variant-1',
        quantityMilli: 1_000,
        unitCostVnd: 100_000.5,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-1' },
      }),
    ).toThrow();
  });

  it('requires source document for all movement-producing commands', () => {
    expect(() =>
      parseInventoryIssueForSaleRequest({
        commandId: 'cmd-issue-1',
        idempotencyKey: 'idem-issue-1',
        warehouseId: 'warehouse-default',
        variantId: 'variant-1',
        quantityMilli: 1_000,
      }),
    ).toThrow();

    expect(() =>
      parseInventoryReserveRequest({
        commandId: 'cmd-reserve-1',
        idempotencyKey: 'idem-reserve-1',
        warehouseId: 'warehouse-default',
        variantId: 'variant-1',
        quantityMilli: 1_000,
        sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1' },
      }),
    ).not.toThrow();
  });
});
