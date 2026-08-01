import { describe, expect, it } from 'vitest';
import { operationNames } from '../../shared/contracts/platform/operations';
import {
  parseInventoryIssueForSaleRequest,
  parseInventoryReceiveRequest,
  parseInventoryReserveRequest,
  parseInventoryStocktakeOpenRequest,
  parseInventoryStocktakeSubmitRequest,
  parseInventoryTransferCreateRequest,
  parseInventoryTransferReceiveRequest,
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
    expect(operationNames).toContain('inventory.transfer.create');
    expect(operationNames).toContain('inventory.transfer.approve');
    expect(operationNames).toContain('inventory.transfer.ship');
    expect(operationNames).toContain('inventory.transfer.receive');
    expect(operationNames).toContain('inventory.stocktake.open');
    expect(operationNames).toContain('inventory.stocktake.submit');
    expect(operationNames).toContain('inventory.stocktake.approve');
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

  it('accepts lot and serial metadata but rejects invalid expiry date', () => {
    expect(() =>
      parseInventoryReceiveRequest({
        commandId: 'cmd-receive-lot-1',
        idempotencyKey: 'idem-receive-lot-1',
        warehouseId: 'warehouse-default',
        variantId: 'variant-1',
        quantityMilli: 1_000,
        unitCostVnd: 100_000,
        lotId: 'lot-1',
        lotCode: 'LOT-2408-A',
        expiryDate: '2026-08-31',
        serialId: 'SERIAL-001',
        sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-1' },
      }),
    ).not.toThrow();

    expect(() =>
      parseInventoryReceiveRequest({
        commandId: 'cmd-receive-lot-2',
        idempotencyKey: 'idem-receive-lot-2',
        warehouseId: 'warehouse-default',
        variantId: 'variant-1',
        quantityMilli: 1_000,
        unitCostVnd: 100_000,
        lotId: 'lot-1',
        lotCode: 'LOT-2408-A',
        expiryDate: '31/08/2026',
        sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-1' },
      }),
    ).toThrow();
  });

  it('accepts transfer payloads and rejects same-warehouse transfer', () => {
    expect(() =>
      parseInventoryTransferCreateRequest({
        commandId: 'cmd-transfer-1',
        idempotencyKey: 'idem-transfer-1',
        sourceWarehouseId: 'warehouse-source',
        destinationWarehouseId: 'warehouse-destination',
        reasonCode: 'replenishment',
        lines: [
          {
            transferLineId: 'transfer-line-1',
            variantId: 'variant-1',
            quantityMilli: 5_000,
            unitVersionId: 'unit-default',
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      parseInventoryTransferCreateRequest({
        commandId: 'cmd-transfer-1',
        idempotencyKey: 'idem-transfer-1',
        sourceWarehouseId: 'warehouse-source',
        destinationWarehouseId: 'warehouse-source',
        lines: [
          {
            variantId: 'variant-1',
            quantityMilli: 5_000,
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      parseInventoryTransferReceiveRequest({
        commandId: 'cmd-transfer-receive-1',
        idempotencyKey: 'idem-transfer-receive-1',
        transferId: 'transfer-1',
        receivedLines: [
          {
            transferLineId: 'transfer-line-1',
            receivedQuantityMilli: 3_000,
            varianceReasonCode: 'short',
          },
        ],
      }),
    ).not.toThrow();
  });

  it('accepts stocktake open and submit payloads with snapshot lines', () => {
    expect(() =>
      parseInventoryStocktakeOpenRequest({
        commandId: 'cmd-stocktake-open-1',
        idempotencyKey: 'idem-stocktake-open-1',
        warehouseId: 'warehouse-default',
        scopeVariantIds: ['variant-1', 'variant-2'],
      }),
    ).not.toThrow();

    expect(() =>
      parseInventoryStocktakeSubmitRequest({
        commandId: 'cmd-stocktake-submit-1',
        idempotencyKey: 'idem-stocktake-submit-1',
        stocktakeSessionId: 'stocktake-1',
        lines: [
          {
            stocktakeLineId: 'stocktake-line-1',
            countedQuantityMilli: 9_000,
            reasonCode: 'count-diff',
          },
        ],
      }),
    ).not.toThrow();
  });
});
