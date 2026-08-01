import { describe, expect, it } from 'vitest';
import { createInMemoryInventoryRepository } from '../../../apps-script/src/repositories/inventory/inventory-repository';
import { createInventoryService } from '../../../apps-script/src/services/inventory/inventory-service';

describe('InventoryService opening balance, lot and serial guards', () => {
  it('rejects opening balance when the same warehouse and variant already has movement history', () => {
    const { service } = createService();
    const firstOpening = service.receive(receiveInput());

    const secondOpening = service.receive(
      receiveInput({
        commandId: 'cmd-opening-2',
        idempotencyKey: 'idem-opening-2',
        quantityMilli: 2_000,
        sourceDocument: { sourceType: 'OpeningBalance', sourceId: 'opening-2' },
      }),
    );

    expect(firstOpening.ok).toBe(true);
    expect(secondOpening).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('updates lot projection on receive and blocks expired lot issue', () => {
    const { repository, service } = createService();
    const receive = service.receive(
      receiveInput({
        lotId: 'lot-expired',
        lotCode: 'LOT-OLD',
        expiryDate: '2026-07-26',
        sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-1' },
      }),
    );

    expect(receive.ok).toBe(true);
    expect(repository.getLotBalance('warehouse-1', 'variant-1', 'lot-expired')).toMatchObject({
      onHandMilli: 1_000,
      availableMilli: 1_000,
      expiryDate: '2026-07-26',
    });

    const issue = service.issueForSale({
      commandId: 'cmd-issue-expired-lot',
      idempotencyKey: 'idem-issue-expired-lot',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 1_000,
      lotId: 'lot-expired',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1', sourceLineId: 'line-1' },
    });

    expect(issue).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('issues a saleable lot and decrements lot projection', () => {
    const { repository, service } = createService();
    service.receive(
      receiveInput({
        lotId: 'lot-saleable',
        lotCode: 'LOT-NEW',
        expiryDate: '2026-08-31',
        quantityMilli: 5_000,
        sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-1' },
      }),
    );

    const issue = service.issueForSale({
      commandId: 'cmd-issue-lot',
      idempotencyKey: 'idem-issue-lot',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 2_000,
      lotId: 'lot-saleable',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-1', sourceLineId: 'line-1' },
    });

    expect(issue.ok).toBe(true);
    expect(repository.getLotBalance('warehouse-1', 'variant-1', 'lot-saleable')).toMatchObject({
      onHandMilli: 3_000,
      availableMilli: 3_000,
    });
  });

  it('enforces serial uniqueness and transitions serial to Sold on issue', () => {
    const { repository, service } = createService();
    const firstReceive = service.receive(
      receiveInput({
        serialId: 'SERIAL-001',
        sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-serial-1' },
      }),
    );
    const duplicateReceive = service.receive(
      receiveInput({
        commandId: 'cmd-receive-serial-2',
        idempotencyKey: 'idem-receive-serial-2',
        serialId: 'SERIAL-001',
        sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: 'receipt-serial-2' },
      }),
    );

    expect(firstReceive.ok).toBe(true);
    expect(duplicateReceive).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });

    const issue = service.issueForSale({
      commandId: 'cmd-issue-serial',
      idempotencyKey: 'idem-issue-serial',
      warehouseId: 'warehouse-1',
      variantId: 'variant-1',
      quantityMilli: 1_000,
      serialId: 'SERIAL-001',
      sourceDocument: { sourceType: 'SaleOrder', sourceId: 'sale-serial-1', sourceLineId: 'line-serial-1' },
    });

    expect(issue.ok).toBe(true);
    expect(repository.getSerialState('SERIAL-001')).toMatchObject({
      status: 'Sold',
      sourceSaleLineId: 'line-serial-1',
    });
  });
});

function createService() {
  const repository = createInMemoryInventoryRepository();
  const service = createInventoryService({
    repository,
    tenantId: 'tenant-default',
    now: () => new Date('2026-07-27T02:00:00.000Z'),
    newId: createSequentialId(),
  });
  return { repository, service };
}

function receiveInput(
  overrides: Partial<Parameters<ReturnType<typeof createService>['service']['receive']>[0]> = {},
) {
  return {
    commandId: 'cmd-receive-1',
    idempotencyKey: 'idem-receive-1',
    warehouseId: 'warehouse-1',
    variantId: 'variant-1',
    quantityMilli: 1_000,
    unitCostVnd: 100_000,
    sourceDocument: { sourceType: 'OpeningBalance' as const, sourceId: 'opening-1' },
    ...overrides,
  };
}

function createSequentialId() {
  let sequence = 0;
  return (prefix: string) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}
