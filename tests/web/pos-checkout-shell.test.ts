import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { ApiMeta, ApiResult } from '@shared/contracts/api';
import type { SalesPosCompleteResponse } from '@shared/contracts/sales/sales';
import { PosCheckoutShell } from '../../web/src/features/pos/pos-checkout-shell';
import { completePosCheckoutWithRecovery } from '../../web/src/features/pos/pos-complete-command';
import type { ApiClient } from '../../web/src/lib/api/client';

const scope: CurrentScopeResponse = {
  tenant: {
    tenantId: 'tenant-default',
    displayName: 'Công ty Cenio Retail',
    status: 'Active',
    timezone: 'Asia/Ho_Chi_Minh',
    activeConfigVersionId: 'config-default',
  },
  branches: [
    {
      branchId: 'branch-default',
      tenantId: 'tenant-default',
      branchCode: 'BR-DEFAULT',
      name: 'Chi nhánh mặc định',
      status: 'Active',
    },
  ],
  warehouses: [
    {
      warehouseId: 'warehouse-default',
      tenantId: 'tenant-default',
      branchId: 'branch-default',
      warehouseCode: 'WH-DEFAULT',
      name: 'Kho mặc định',
      status: 'Active',
      directSaleEnabled: true,
      negativeStockPolicy: 'Block',
      lotTrackingDefault: false,
      serialTrackingDefault: false,
    },
  ],
  activeBranchId: 'branch-default',
  activeWarehouseId: 'warehouse-default',
};

const actor: ActorContextDTO = {
  userId: 'user-admin',
  loginId: 'admin',
  displayName: 'Admin Local',
  tenantId: 'tenant-default',
  authVersion: 1,
  actions: ['sales.pos.complete'],
  scope: {
    tenantId: 'tenant-default',
    branchIds: ['branch-default'],
    warehouseIds: ['warehouse-default'],
  },
};

describe('PosCheckoutShell', () => {
  it('render POS shell theo handoff: scan, cart, checkout sticky và recovery states', () => {
    const html = renderToStaticMarkup(
      createElement(PosCheckoutShell, {
        actor,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        theme: 'light',
      }),
    );

    expect(html).toContain('POS tại quầy');
    expect(html).toContain('Quét mã vạch, SKU hoặc tên hàng');
    expect(html).toContain('Sữa hạt óc chó 1L');
    expect(html).toContain('SH-OC-1L');
    expect(html).toContain('Giỏ hàng');
    expect(html).toContain('Tổng thanh toán');
    expect(html).toContain('Hoàn tất bán hàng');
    expect(html).toContain('Lưu nháp');
    expect(html).toContain('Mở nháp');
    expect(html).toContain('Bán chịu');
    expect(html).toContain('Khách hàng');
    expect(html).toContain('Đã hoàn tất');
    expect(html).toContain('Chưa mở ca');
    expect(html).toContain('Dữ liệu thay đổi');
    expect(html).not.toContain('readOnly=""');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('Website');
    expect(html).not.toContain('Shopee');
    expect(html).not.toContain('Local cache:');
    expect(html).not.toContain('Scope hiện tại:');
    expect(html).not.toContain('thao tác giỏ chạy local-first');
  });

  it('render POS visual structure bám artifact Approved: standalone header, product cards, checkout panel và 10 state tabs', () => {
    const html = renderToStaticMarkup(
      createElement(PosCheckoutShell, {
        actor,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        theme: 'dark',
      }),
    );
    const source = readText('web/src/features/pos/pos-checkout-shell.tsx');
    const globalCss = readText('web/src/styles/index.css');

    expect(html).toContain('cn-pos-page');
    expect(html).toContain('cn-pos-header');
    expect(html).toContain('Quản lý bán hàng');
    expect(html).toContain('cn-pos-layout-grid');
    expect(html).toContain('cn-product-grid');
    expect(html).toContain('cn-product-card');
    expect(html).toContain('cn-checkout-panel');
    expect(html).toContain('cn-scope-snapshot');
    expect(html).toContain('cn-state-tabs');
    expect(html.match(/class="cn-state-tab"/g)).toHaveLength(10);
    expect(html).toContain('Không tìm thấy');
    expect(html).toContain('Nhiều kết quả');
    expect(html).toContain('Thiếu tồn');
    expect(html).toContain('Lô / serial');
    expect(html).toContain('Chờ xác nhận');
    expect(html).toContain('aria-label="Chuyển sang giao diện sáng"');
    expect(html).not.toContain('cn-app-shell');
    expect(source).not.toContain('cn-pos-session-grid');
    expect(source).not.toContain('cn-pos-result-card');
    expect(source).not.toContain('cn-pos-recovery-grid');
    expect(source).toContain('name="barcodeScan"');
    expect(html).not.toContain('Cache sẵn sàng');
    expect(html).not.toContain('Retail operations');
    expect(globalCss).toMatch(/html\[data-theme="dark"\][\s\S]*\.cn-pos-page/);
  });

  it('embedded mode dùng AppShell header chung nên không render POS header riêng', () => {
    const html = renderToStaticMarkup(
      createElement(PosCheckoutShell, {
        actor,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        shellMode: 'embedded',
        theme: 'dark',
      }),
    );

    expect(html).toContain('cn-pos-page cn-pos-page-embedded');
    expect(html).toContain('POS tại quầy');
    expect(html).toContain('Quét mã vạch, SKU hoặc tên hàng');
    expect(html).toContain('Giỏ hàng');
    expect(html).not.toContain('cn-pos-header');
    expect(html).not.toContain('Ca POS đang mở');
    expect(html).not.toContain('Dữ liệu quầy sẵn sàng');
    expect(html).not.toContain('aria-label="Chuyển sang giao diện sáng"');
    expect(html).not.toContain('Local cache:');
    expect(html).not.toContain('Scope hiện tại:');
    expect(html).not.toContain('thao tác giỏ chạy local-first');
  });

  it('embedded mode đặt ô scan là entry đầu tiên và dùng contextual recovery drawer theo artifact Approved', () => {
    const html = renderToStaticMarkup(
      createElement(PosCheckoutShell, {
        actor,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        shellMode: 'embedded',
        theme: 'light',
      }),
    );

    expect(html).not.toContain('cn-pos-page-heading');
    expect(html).not.toContain('Tình huống POS &amp; phục hồi');
    expect(html).not.toContain('cn-state-lab');
    expect(html).not.toContain('cn-state-tabs');
    expect(html).toContain('cn-pos-context-drawer');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Dữ liệu bán đã thay đổi');
    expect(html).toContain('Đang kiểm tra kết quả hoàn tất');
    expect(html).toContain('Receipt snapshot');
    expect(readText('web/src/styles/index.css')).toContain('.cn-pos-context-drawer');

    const scanPosition = html.indexOf('Quét mã vạch, SKU hoặc tên hàng');
    const productPosition = html.indexOf('Gợi ý hàng hóa');
    const cartPosition = html.indexOf('Giỏ hàng');
    expect(scanPosition).toBeGreaterThanOrEqual(0);
    expect(productPosition).toBeGreaterThan(scanPosition);
    expect(cartPosition).toBeGreaterThan(scanPosition);
  });

  it('render receipt snapshot và tác vụ in/in lại từ state hoàn tất theo artifact Approved', () => {
    const html = renderToStaticMarkup(
      createElement(PosCheckoutShell, {
        actor,
        scope,
        selectedBranchId: 'branch-default',
        selectedWarehouseId: 'warehouse-default',
        shellMode: 'embedded',
        initialStateId: 'success',
        initialReceipt: {
          receiptId: 'receipt-1',
          saleOrderId: 'sale-order-1',
          businessNumber: 'SO-260801-0001',
          receiptFormat: 'K80',
          createdAt: '2026-08-01T09:00:00.000Z',
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          cashierId: 'user-admin',
          lines: [
            {
              lineId: 'line-1',
              saleOrderLineId: 'sale-line-1',
              variantId: 'variant-milk-1l',
              unitVersionId: 'unit-bottle-v1',
              sku: 'SH-OC-1L',
              displayName: 'Sữa hạt óc chó 1L',
              quantity: 1,
              quantityMilli: 1000,
              unitName: 'chai',
              unitPriceVnd: 42_000,
              lineDiscountVnd: 0,
              lineSubtotalVnd: 42_000,
              lineTotalVnd: 42_000,
            },
          ],
          totals: {
            subtotalVnd: 42_000,
            discountVnd: 0,
            taxVnd: 0,
            shippingFeeVnd: 0,
            totalVnd: 42_000,
            paidVnd: 42_000,
            changeVnd: 0,
            receivableVnd: 0,
          },
        },
      }),
    );

    expect(html).toContain('cn-receipt-snapshot');
    expect(html).toContain('SO-260801-0001');
    expect(html).toContain('Sữa hạt óc chó 1L');
    expect(html).toContain('42.000 đ');
    expect(html).toContain('In biên lai');
    expect(html).toContain('In lại');
    expect(html).toContain('Mẫu K80');
    expect(html).toContain('không tạo ledger mới');
    expect(html).not.toContain('<select');
  });

  it('recover POS checkout timeout bằng command status với cùng commandId/idempotencyKey', async () => {
    const calls: string[] = [];
    const response = createReceiptResponse('SO-260801-0007');
    const apiClient: ApiClient = {
      async invoke(request) {
        calls.push(`${request.operation}:${(request.payload as { commandId?: string }).commandId ?? ''}`);
        if (request.operation === 'sales.pos.complete') {
          return errorResult('TRANSPORT_ERROR', 'Mất kết nối khi hoàn tất.');
        }
        if (request.operation === 'platform.command.getStatus') {
          expect(request.payload).toEqual({
            commandId: 'cmd-pos-retry-1',
            idempotencyKey: 'idem-pos-retry-1',
          });
          return okResult({
            command: {
              commandId: 'cmd-pos-retry-1',
              idempotencyKey: 'idem-pos-retry-1',
              status: 'Committed',
              resultJson: JSON.stringify({ ok: true, data: response }),
              updatedAt: '2026-08-01T09:00:03.000Z',
            },
          });
        }
        throw new Error(`Unexpected operation ${request.operation}`);
      },
    };

    const result = await completePosCheckoutWithRecovery({
      apiClient,
      sessionToken: 'session-1',
      requestId: 'req-pos-complete',
      command: {
        commandId: 'cmd-pos-retry-1',
        idempotencyKey: 'idem-pos-retry-1',
      },
      payload: {
        commandId: 'cmd-pos-retry-1',
        idempotencyKey: 'idem-pos-retry-1',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'user-admin',
        cashDrawerId: 'drawer-main',
        shiftId: 'shift-local-open',
        quoteVersion: 'quote-1',
        receiptFormat: 'K80',
        lines: [],
        tenders: [],
      },
    });

    expect(result).toEqual({ ok: true, data: response, recoveredFromCommandStatus: true });
    expect(calls).toEqual(['sales.pos.complete:cmd-pos-retry-1', 'platform.command.getStatus:cmd-pos-retry-1']);
  });
});

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function createReceiptResponse(businessNumber: string): SalesPosCompleteResponse {
  return {
    order: {
      saleOrderId: 'sale-order-1',
      tenantId: 'tenant-default',
      businessNumber,
      source: 'POS',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      status: 'Completed',
      paymentStatus: 'Paid',
      cashierId: 'user-admin',
      subtotalVnd: 42_000,
      discountVnd: 0,
      taxVnd: 0,
      shippingFeeVnd: 0,
      totalVnd: 42_000,
      paidVnd: 42_000,
      receivableVnd: 0,
      draftVersion: 1,
      createdAt: '2026-08-01T09:00:00.000Z',
      updatedAt: '2026-08-01T09:00:00.000Z',
      completedAt: '2026-08-01T09:00:00.000Z',
    },
    lines: [],
    receipt: {
      receiptId: 'receipt-1',
      saleOrderId: 'sale-order-1',
      businessNumber,
      receiptFormat: 'K80',
      createdAt: '2026-08-01T09:00:00.000Z',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      cashierId: 'user-admin',
      lines: [],
      totals: {
        subtotalVnd: 42_000,
        discountVnd: 0,
        taxVnd: 0,
        shippingFeeVnd: 0,
        totalVnd: 42_000,
        paidVnd: 42_000,
        receivableVnd: 0,
        changeVnd: 0,
      },
    },
    inventoryMovements: [],
    conflicts: [],
  };
}

function okResult<T>(data: T): ApiResult<T> {
  return {
    ok: true,
    data,
    meta: meta('test.ok'),
  };
}

function errorResult<T>(code: ApiResult<T> extends { ok: false; error: infer E } ? E extends { code: infer C } ? C : never : never, message: string): ApiResult<T> {
  return {
    ok: false,
    error: { code, message },
    meta: meta('test.error'),
  } as ApiResult<T>;
}

function meta(operation: string): ApiMeta {
  return {
    requestId: `req-${operation}`,
    operation,
    serverTime: '2026-08-01T09:00:00.000Z',
    durationMs: 1,
    stages: {},
    io: {},
  };
}
