import type { CatalogPosVariantDTO } from '@shared/contracts/catalog/catalog';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type {
  SalesDraftListResponse,
  SalesDraftSaveResponse,
  SalesPosCompleteResponse,
} from '@shared/contracts/sales/sales';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import { Tabs } from '../../components/ui/tabs';
import type { ApiClient } from '../../lib/api/client';
import { loadPosCatalogProjection } from './catalog-cache/load-pos-catalog-projection';
import type { CatalogPosProjectionResponse } from './catalog-cache/pos-catalog-cache';
import { createPosCatalogCache } from './catalog-cache/pos-catalog-cache';
import type { PosCartLine } from './pos-cart-state';

export interface PosCheckoutShellProps {
  scope: CurrentScopeResponse;
  selectedBranchId: string;
  selectedWarehouseId: string;
  projection?: CatalogPosProjectionResponse;
  apiClient?: ApiClient;
  sessionToken?: string;
}

const localPreviewProjection: CatalogPosProjectionResponse = {
  projectionVersion: 'local-preview-catalog-v1',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  generatedAt: '2026-07-27T00:00:00.000Z',
  variants: [
    {
      variantId: 'variant-milk-1l',
      productId: 'product-milk',
      sku: 'SH-OC-1L',
      displayName: 'Sữa hạt óc chó 1L',
      barcode: '893000000001',
      unitVersionId: 'unit-bottle-v1',
      unitName: 'chai',
      unitPriceVnd: 42000,
      saleEnabled: true,
      inventoryMode: 'Tracked',
      lotTracking: false,
      serialTracking: false,
      isActive: true,
    },
    {
      variantId: 'variant-laundry-36',
      productId: 'product-laundry',
      sku: 'NG-SH-3600',
      displayName: 'Nước giặt sinh học hương hoa 3,6kg',
      barcode: '893000000002',
      unitVersionId: 'unit-bag-v1',
      unitName: 'túi',
      unitPriceVnd: 185000,
      saleEnabled: true,
      inventoryMode: 'Tracked',
      lotTracking: false,
      serialTracking: false,
      isActive: true,
    },
  ],
};

const tenderMethods = [
  { id: 'cash', label: 'Tiền mặt' },
  { id: 'bank-transfer', label: 'Chuyển khoản thủ công' },
  { id: 'card', label: 'Thẻ' },
  { id: 'qr', label: 'QR hiển thị' },
  { id: 'credit', label: 'Bán chịu' },
] as const;

const recoveryStates = [
  {
    id: 'shift',
    label: 'Chưa mở ca',
    title: 'Chưa có ca POS đang mở',
    description: 'Mở ca trước khi hoàn tất để khoản thu được ghi nhận đúng quầy.',
    tone: 'warning' as const,
  },
  {
    id: 'empty',
    label: 'Giỏ trống',
    title: 'Giỏ hàng đang trống',
    description: 'Quét mã vạch, nhập SKU hoặc tìm tên để thêm mặt hàng. Không autosave giỏ.',
    tone: 'neutral' as const,
  },
  {
    id: 'not-found',
    label: 'Không tìm thấy',
    title: 'Không tìm thấy mã hoặc từ khóa',
    description: 'Không tự thêm sản phẩm khi barcode/từ khóa không khớp duy nhất.',
    tone: 'danger' as const,
  },
  {
    id: 'conflict',
    label: 'Dữ liệu thay đổi',
    title: 'Dữ liệu bán đã thay đổi',
    description: 'Checkout trả conflict ổn định khi giá, promotion hoặc tồn thay đổi.',
    tone: 'danger' as const,
  },
  {
    id: 'success',
    label: 'Đã hoàn tất',
    title: 'Đã hoàn tất phiếu bán',
    description: 'Receipt snapshot đã sẵn sàng. In hoặc in lại không tạo ledger mới.',
    tone: 'info' as const,
  },
];

export function PosCheckoutShell({
  apiClient,
  projection = localPreviewProjection,
  sessionToken,
  scope,
  selectedBranchId,
  selectedWarehouseId,
}: PosCheckoutShellProps) {
  const [activeProjection, setActiveProjection] = useState(projection);
  const [query, setQuery] = useState('');
  const [cartLines, setCartLines] = useState<PosCartLine[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<(typeof tenderMethods)[number]['id']>('cash');
  const [receivedAmountText, setReceivedAmountText] = useState('');
  const [message, setMessage] = useState('POS sẵn sàng. Scan/search/cart xử lý tại browser cache.');
  const [activeStateId, setActiveStateId] = useState('empty');
  const [isCompleting, setIsCompleting] = useState(false);
  const [receipt, setReceipt] = useState<SalesPosCompleteResponse['receipt']>();
  const branch = scope.branches.find((candidate) => candidate.branchId === selectedBranchId);
  const warehouse = scope.warehouses.find((candidate) => candidate.warehouseId === selectedWarehouseId);
  const cache = useMemo(() => createPosCatalogCache(activeProjection), [activeProjection]);
  const productSuggestions = query.trim().length > 0 ? cache.search(query) : activeProjection.variants;
  const totals = useMemo(() => calculateTotals(cartLines), [cartLines]);
  const receivedAmountVnd = parseVnd(receivedAmountText) ?? totals.totalVnd;
  const missingTrackedSelection = cartLines.find((line) => line.lotTracking || line.serialTracking);

  useEffect(() => {
    if (apiClient === undefined || sessionToken === undefined) {
      setActiveProjection(projection);
      return;
    }

    let isActive = true;
    void loadPosCatalogProjection({
      apiClient,
      requestId: `pos-catalog-${Date.now()}`,
      sessionToken,
      branchId: selectedBranchId,
      warehouseId: selectedWarehouseId,
    })
      .then((nextProjection) => {
        if (isActive) {
          setActiveProjection(nextProjection);
          setMessage(`Cache ${nextProjection.projectionVersion} đã sẵn sàng.`);
        }
      })
      .catch(() => {
        if (isActive) {
          setActiveProjection(projection);
          setMessage('Không tải được projection mới; đang dùng projection fallback của màn hình.');
        }
      });

    return () => {
      isActive = false;
    };
  }, [apiClient, projection, selectedBranchId, selectedWarehouseId, sessionToken]);

  const addVariant = useCallback((variant: CatalogPosVariantDTO) => {
    setCartLines((current) => upsertCartLine(current, variant));
    setQuery('');
    setActiveStateId('empty');
    setMessage(`Đã thêm ${variant.displayName} vào giỏ trên máy này.`);
  }, []);

  const handleScanSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    const byBarcode = cache.findByBarcode(trimmed);
    if (byBarcode !== undefined) {
      addVariant(byBarcode);
      return;
    }
    const matches = cache.search(trimmed);
    if (matches.length === 1) {
      addVariant(matches[0]);
      return;
    }
    setActiveStateId(matches.length === 0 ? 'not-found' : 'conflict');
    setMessage(matches.length === 0 ? `Không tìm thấy “${trimmed}”.` : `Có ${matches.length} kết quả, cần chọn đúng biến thể.`);
  }, [addVariant, cache, query]);

  const saveDraft = useCallback(async () => {
    if (apiClient === undefined || sessionToken === undefined || cartLines.length === 0) return;
    const result = await apiClient.invoke<SalesDraftSaveResponse>({
      operation: 'sales.draft.save',
      requestId: `pos-draft-save-${Date.now()}`,
      sessionToken,
      payload: {
        commandId: `cmd-draft-${Date.now()}`,
        idempotencyKey: `idem-draft-${Date.now()}`,
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        cashierId: 'user-admin',
        lines: toSalesLineInputs(cartLines),
        tenders: toTenderInputs(selectedTenderId, receivedAmountVnd),
      },
    });
    setMessage(result.ok ? `Đã lưu nháp ${result.data.order.businessNumber}.` : result.error.message);
  }, [apiClient, cartLines, receivedAmountVnd, selectedBranchId, selectedTenderId, selectedWarehouseId, sessionToken]);

  const openDraft = useCallback(async () => {
    if (apiClient === undefined || sessionToken === undefined) return;
    const result = await apiClient.invoke<SalesDraftListResponse>({
      operation: 'sales.draft.list',
      requestId: `pos-draft-list-${Date.now()}`,
      sessionToken,
      payload: { branchId: selectedBranchId, warehouseId: selectedWarehouseId },
    });
    setMessage(result.ok ? `Có ${result.data.drafts.length} phiếu nháp trong scope hiện tại.` : result.error.message);
  }, [apiClient, selectedBranchId, selectedWarehouseId, sessionToken]);

  const completeSale = useCallback(async () => {
    if (apiClient === undefined || sessionToken === undefined || cartLines.length === 0) return;
    if (missingTrackedSelection !== undefined) {
      setActiveStateId('conflict');
      setMessage(`${missingTrackedSelection.displayName} cần chọn lô/serial trước khi hoàn tất.`);
      return;
    }
    setIsCompleting(true);
    const result = await apiClient.invoke<SalesPosCompleteResponse>({
      operation: 'sales.pos.complete',
      requestId: `pos-complete-${Date.now()}`,
      sessionToken,
      payload: {
        commandId: `cmd-pos-${Date.now()}`,
        idempotencyKey: `idem-pos-${Date.now()}`,
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        cashierId: 'user-admin',
        cashDrawerId: 'drawer-main',
        shiftId: 'shift-local-open',
        quoteVersion: `quote-${selectedBranchId}-${totals.totalVnd}-0`,
        receiptFormat: 'K80',
        lines: toSalesLineInputs(cartLines),
        tenders: toTenderInputs(selectedTenderId, receivedAmountVnd),
      },
    });
    setIsCompleting(false);
    if (!result.ok) {
      setActiveStateId(result.error.code === 'SHIFT_NOT_OPEN' ? 'shift' : 'conflict');
      setMessage(result.error.message);
      return;
    }
    setReceipt(result.data.receipt);
    setCartLines([]);
    setActiveStateId('success');
    setMessage(`Đã hoàn tất ${result.data.order.businessNumber}.`);
  }, [
    apiClient,
    cartLines,
    missingTrackedSelection,
    receivedAmountVnd,
    selectedBranchId,
    selectedTenderId,
    selectedWarehouseId,
    sessionToken,
    totals.totalVnd,
  ]);

  return (
    <div className="cn-pos-shell">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">Sales / POS tại quầy</p>
          <h1>POS tại quầy</h1>
          <p>
            {branch?.name ?? 'Chi nhánh chưa hợp lệ'} · {warehouse?.name ?? 'Kho chưa hợp lệ'} ·
            ca/két tiền được backend kiểm tra khi hoàn tất.
          </p>
        </div>
        <div className="cn-dashboard-actions">
          <Badge tone="success">Cache sẵn sàng</Badge>
          <Badge tone="success">Ca POS đang mở</Badge>
        </div>
      </header>

      <div className="cn-pos-grid">
        <section className="cn-pos-workspace">
          <div className="cn-scan-panel">
            <div className="cn-scan-label">
              <strong>Quét mã vạch, SKU hoặc tên hàng</strong>
              <span>Không gọi backend từng lần quét khi cache warm</span>
            </div>
            <div className="cn-scan-input-shell">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Quét mã vạch, SKU hoặc tên hàng"
                autoFocus
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleScanSubmit();
                }}
                placeholder="Quét mã hoặc nhập tên hàng..."
                value={query}
              />
              <kbd>Enter</kbd>
            </div>
          </div>

          <Panel
            description={`Projection ${cache.projectionVersion}; search chạy local từ browser cache.`}
            title="Gợi ý hàng hóa"
          >
            <div className="cn-product-grid">
              {productSuggestions.slice(0, 6).map((variant) => (
                <article className="cn-product-placeholder" key={variant.variantId}>
                  <span aria-hidden="true">◇</span>
                  <strong>{variant.displayName}</strong>
                  <p>
                    SKU {variant.sku} · {variant.unitName} · {formatVnd(variant.unitPriceVnd)}
                  </p>
                  <Button onClick={() => addVariant(variant)} variant="secondary">Thêm vào giỏ</Button>
                </article>
              ))}
            </div>
          </Panel>

          <Panel description="Tạo/chọn khách nhanh theo quyền; cảnh báo credit/công nợ xử lý từ backend." title="Khách hàng">
            <div className="cn-customer-row">
              <strong>Khách lẻ</strong>
              <span>Chọn khách để dùng điểm, hạn mức nợ hoặc chính sách giá.</span>
              <Button variant="secondary">Tìm / tạo khách</Button>
            </div>
          </Panel>
        </section>

        <aside className="cn-pos-checkout">
          <Panel
            description="Giỏ browser-local; chỉ save draft/complete mới đi qua command."
            title={`Giỏ hàng · ${cartLines.length} dòng`}
          >
            {cartLines.length === 0 ? (
              <div className="cn-cart-empty">
                <StateBlock
                  description="Chưa có dòng hàng. Reload có thể mất giỏ chưa lưu; Draft đã lưu mở lại theo scope."
                  title="Giỏ hàng đang trống"
                  tone="neutral"
                />
              </div>
            ) : (
              <div className="cn-cart-lines">
                {cartLines.map((line) => (
                  <article className="cn-cart-line" key={line.variantId}>
                    <div>
                      <strong>{line.displayName}</strong>
                      <p>{line.unitName} · {line.sku} · {formatVnd(line.unitPriceVnd)}</p>
                      <div className="cn-line-tools">
                        <button onClick={() => setCartLines((current) => changeCartQuantity(current, line.variantId, line.quantity - 1))} type="button">−</button>
                        <span className="num">{line.quantity}</span>
                        <button onClick={() => setCartLines((current) => changeCartQuantity(current, line.variantId, line.quantity + 1))} type="button">+</button>
                        {(line.lotTracking || line.serialTracking) ? <span className="cn-line-warning">Cần chọn lô/serial</span> : null}
                      </div>
                    </div>
                    <div className="cn-cart-line-side">
                      <strong className="num">{formatVnd(line.lineTotalVnd)}</strong>
                      <button onClick={() => setCartLines((current) => current.filter((candidate) => candidate.variantId !== line.variantId))} type="button">Bỏ</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <section className="cn-commerce-section">
              <h3>Khuyến mãi & ưu đãi</h3>
              <p>Promotion/voucher/điểm được revalidate khi hoàn tất; conflict sẽ hiển thị bằng mã ổn định.</p>
            </section>
            <section className="cn-commerce-section">
              <div className="cn-total-row">
                <span>Tạm tính</span>
                <strong className="num">{formatVnd(totals.subtotalVnd)}</strong>
              </div>
              <div className="cn-total-row">
                <span>Giảm giá</span>
                <strong className="num">{formatVnd(totals.discountVnd)}</strong>
              </div>
              <div className="cn-total-row cn-total-final">
                <span>Tổng thanh toán</span>
                <strong className="num">{formatVnd(totals.totalVnd)}</strong>
              </div>
            </section>
            <section className="cn-commerce-section">
              <h3>Phương thức thanh toán</h3>
              <div className="cn-tender-grid" role="tablist" aria-label="Phương thức thanh toán">
                {tenderMethods.map((tender) => (
                  <button
                    aria-selected={selectedTenderId === tender.id}
                    className={selectedTenderId === tender.id ? 'cn-tender-button active' : 'cn-tender-button'}
                    key={tender.id}
                    onClick={() => setSelectedTenderId(tender.id)}
                    role="tab"
                    type="button"
                  >
                    {tender.label}
                  </button>
                ))}
              </div>
              <input
                aria-label="Số tiền khách đưa"
                className="cn-pos-amount-input num"
                onChange={(event) => setReceivedAmountText(event.currentTarget.value)}
                placeholder={formatVnd(totals.totalVnd)}
                value={receivedAmountText}
              />
              <p className="cn-pos-change num">
                {receivedAmountVnd >= totals.totalVnd
                  ? `Tiền thừa: ${formatVnd(receivedAmountVnd - totals.totalVnd)}`
                  : `Còn phải thu: ${formatVnd(totals.totalVnd - receivedAmountVnd)}`}
              </p>
            </section>
            <div className="cn-cart-actions">
              <Button disabled={cartLines.length === 0} onClick={saveDraft} variant="secondary">Lưu nháp</Button>
              <Button onClick={openDraft} variant="secondary">Mở nháp</Button>
              <Button onClick={() => { setCartLines([]); setMessage('Đã hủy giỏ trên trình duyệt.'); }} variant="secondary">Hủy giỏ</Button>
            </div>
            <Button
              className="cn-complete-sale"
              disabled={cartLines.length === 0}
              isLoading={isCompleting}
              onClick={completeSale}
              variant="primary"
            >
              Hoàn tất bán hàng
            </Button>
          </Panel>
        </aside>
      </div>

      <Panel description={message} title="Tình huống POS & phục hồi">
        <Tabs
          items={recoveryStates.map((state) => ({
            id: state.id,
            label: state.label,
            content: (
              <StateBlock
                description={state.id === 'success' && receipt ? `${state.description} ${receipt.businessNumber} · ${formatVnd(receipt.totals.totalVnd)}.` : state.description}
                title={state.title}
                tone={state.tone}
              />
            ),
          }))}
          onChange={setActiveStateId}
          selectedId={activeStateId}
        />
      </Panel>
    </div>
  );
}

function upsertCartLine(current: readonly PosCartLine[], variant: CatalogPosVariantDTO): PosCartLine[] {
  const existing = current.find((line) => line.variantId === variant.variantId);
  if (existing !== undefined) {
    return changeCartQuantity(current, variant.variantId, existing.quantity + 1);
  }
  return [
    ...current,
    buildCartLine({
      lineId: `line-${variant.variantId}`,
      variantId: variant.variantId,
      unitVersionId: variant.unitVersionId,
      sku: variant.sku,
      displayName: variant.displayName,
      unitName: variant.unitName,
      quantity: 1,
      quantityMilli: 1_000,
      unitPriceVnd: variant.unitPriceVnd,
      lineDiscountVnd: 0,
      lineSubtotalVnd: variant.unitPriceVnd,
      lineTotalVnd: variant.unitPriceVnd,
      lotTracking: variant.lotTracking,
      serialTracking: variant.serialTracking,
    }),
  ];
}

function changeCartQuantity(current: readonly PosCartLine[], variantId: string, quantity: number): PosCartLine[] {
  if (quantity < 1) return current.filter((line) => line.variantId !== variantId);
  return current.map((line) => (line.variantId === variantId ? buildCartLine({ ...line, quantity }) : line));
}

function buildCartLine(line: PosCartLine): PosCartLine {
  const lineSubtotalVnd = Math.round(line.unitPriceVnd * line.quantity);
  return {
    ...line,
    quantityMilli: Math.round(line.quantity * 1_000),
    lineSubtotalVnd,
    lineTotalVnd: Math.max(0, lineSubtotalVnd - line.lineDiscountVnd),
  };
}

function calculateTotals(lines: readonly PosCartLine[]) {
  const subtotalVnd = lines.reduce((sum, line) => sum + line.lineSubtotalVnd, 0);
  const discountVnd = lines.reduce((sum, line) => sum + line.lineDiscountVnd, 0);
  return {
    subtotalVnd,
    discountVnd,
    totalVnd: Math.max(0, subtotalVnd - discountVnd),
  };
}

function toSalesLineInputs(lines: readonly PosCartLine[]) {
  return lines.map((line) => ({
    lineId: line.lineId,
    variantId: line.variantId,
    unitVersionId: line.unitVersionId,
    quantity: line.quantity,
    quantityMilli: line.quantityMilli,
    unitPriceVnd: line.unitPriceVnd,
    lineDiscountVnd: line.lineDiscountVnd,
  }));
}

function toTenderInputs(paymentMethodId: string, amountVnd: number) {
  return amountVnd <= 0
    ? []
    : [
        {
          tenderId: `tender-${paymentMethodId}`,
          paymentMethodId,
          amountVnd,
          cashDrawerId: 'drawer-main',
        },
      ];
}

function parseVnd(value: string): number | undefined {
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length === 0) return undefined;
  return Number(digits);
}

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}
