import type { CatalogPosVariantDTO } from '@shared/contracts/catalog/catalog';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type {
  SalesDraftListResponse,
  SalesDraftSaveResponse,
  SalesPosCompleteResponse,
} from '@shared/contracts/sales/sales';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CenioBrandMark } from '../../components/ui/brand-mark';
import { Button, IconButton } from '../../components/ui/button';
import { AppIcon } from '../../components/ui/icons';
import { Listbox } from '../../components/ui/listbox';
import { TextAvatar } from '../../components/ui/text-avatar';
import { useToast } from '../../components/ui/toast';
import type { ApiClient } from '../../lib/api/client';
import {
  buildPosCatalogCacheNamespace,
  clearCachedPosCatalogProjectionNamespace,
  loadPosCatalogProjection,
  PosCatalogProjectionLoadError,
  prewarmPosCheckoutContext,
  readCachedPosCatalogProjectionEntry,
  writeCachedPosCatalogProjection,
} from './catalog-cache/load-pos-catalog-projection';
import type { CatalogPosProjectionResponse } from './catalog-cache/pos-catalog-cache';
import { createPosCatalogCache } from './catalog-cache/pos-catalog-cache';
import { completePosCheckoutWithRecovery } from './pos-complete-command';
import type { PosCartLine } from './pos-cart-state';
import { printReceiptSnapshot, type ReceiptPrintContext } from './pos-receipt-print';

type PosTheme = 'light' | 'dark';
type PosShellMode = 'standalone' | 'embedded';

export interface PosCheckoutShellProps {
  scope: CurrentScopeResponse;
  selectedBranchId: string;
  selectedWarehouseId: string;
  actor?: ActorContextDTO;
  theme?: PosTheme;
  appVersion?: string;
  schemaVersion?: number;
  projection?: CatalogPosProjectionResponse;
  apiClient?: ApiClient;
  sessionToken?: string;
  shellMode?: PosShellMode;
  initialReceipt?: SalesPosCompleteResponse['receipt'];
  initialStateId?: (typeof recoveryStates)[number]['id'];
  onNavigateDashboard?(): void;
  onSessionExpired?(): void;
  onScopeChange?(input: { branchId?: string; warehouseId?: string }): void;
  onThemeToggle?(): void;
}

const localPreviewProjection: CatalogPosProjectionResponse = {
  projectionVersion: 'local-preview-catalog-v2',
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
      unitPriceVnd: 42_000,
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
      unitPriceVnd: 185_000,
      saleEnabled: true,
      inventoryMode: 'Tracked',
      lotTracking: false,
      serialTracking: false,
      isActive: true,
    },
    {
      variantId: 'variant-filter-210',
      productId: 'product-filter',
      sku: 'GD-FL-210',
      displayName: 'Lõi lọc nước gia dụng',
      barcode: '893000000003',
      unitVersionId: 'unit-set-v1',
      unitName: 'bộ',
      unitPriceVnd: 285_000,
      saleEnabled: true,
      inventoryMode: 'Tracked',
      lotTracking: false,
      serialTracking: true,
      isActive: true,
    },
    {
      variantId: 'variant-shirt-basic',
      productId: 'product-shirt',
      sku: 'FA-TS-018',
      displayName: 'Áo thun cổ tròn basic',
      barcode: '893000000004',
      unitVersionId: 'unit-piece-v1',
      unitName: 'cái',
      unitPriceVnd: 159_000,
      saleEnabled: true,
      inventoryMode: 'Tracked',
      lotTracking: false,
      serialTracking: false,
      isActive: true,
    },
  ],
};

const tenderMethods = [
  { id: 'cash', label: 'Tiền mặt', icon: 'currency' },
  { id: 'bank-transfer', label: 'Chuyển khoản thủ công', icon: 'wallet' },
  { id: 'card', label: 'Thẻ', icon: 'wallet' },
  { id: 'qr', label: 'QR hiển thị', icon: 'refresh' },
  { id: 'credit', label: 'Bán chịu', icon: 'clock' },
] as const;

const categories = ['Tất cả', 'Sữa & đồ uống', 'Mỹ phẩm', 'Gia dụng', 'Thời trang'] as const;
const recoveryStates = [
  {
    id: 'shift',
    label: 'Chưa mở ca',
    title: 'Chưa có ca POS đang mở',
    description: 'Chọn “Mở ca” trước khi bán để khoản thu được ghi nhận đúng quầy.',
    detail: 'Yêu cầu trước khi hoàn tất: xác nhận ca đang mở trong scope Branch/Warehouse hiện tại.',
    tone: 'warning' as const,
    icon: 'clock' as const,
    action: 'Mở ca',
  },
  {
    id: 'empty',
    label: 'Giỏ trống',
    title: 'Giỏ hàng đang trống',
    description: 'Quét mã vạch, nhập SKU hoặc tìm tên để thêm mặt hàng. Không tự lưu giỏ nếu chưa chọn Lưu nháp.',
    tone: 'neutral' as const,
    icon: 'orders' as const,
    action: 'Tập trung ô quét',
  },
  {
    id: 'not-found',
    label: 'Không tìm thấy',
    title: 'Không tìm thấy mã hoặc từ khóa',
    description: 'Kiểm tra lại mã quét, đơn vị bán hoặc tìm theo tên. Không tạo mới sản phẩm ngay trong POS.',
    detail: 'Mã chưa có trong danh mục đã tải trên máy này.',
    tone: 'danger' as const,
    icon: 'warning' as const,
    action: 'Quét lại',
  },
  {
    id: 'matches',
    label: 'Nhiều kết quả',
    title: 'Có nhiều biến thể phù hợp',
    description: 'Chọn đúng màu, size hoặc đơn vị trước khi thêm giỏ; không suy đoán biến thể từ mã rút gọn.',
    detail: 'Ví dụ: Đen · M · 159.000 ₫ · Trắng · M · 159.000 ₫ · Đen · L · 159.000 ₫',
    tone: 'neutral' as const,
    icon: 'catalog' as const,
    action: 'Chọn biến thể',
  },
  {
    id: 'stock',
    label: 'Thiếu tồn',
    title: 'Tồn kho không đủ',
    description: 'Điều chỉnh số lượng hoặc bỏ dòng hàng khi tồn khả dụng không đáp ứng tại thời điểm hoàn tất.',
    detail: 'Kiểm tra này được thực hiện lại bởi backend khi complete command.',
    tone: 'danger' as const,
    icon: 'warning' as const,
    action: 'Điều chỉnh',
  },
  {
    id: 'serial',
    label: 'Lô / serial',
    title: 'Cần chọn lô / serial',
    description: 'Hàng theo dõi lô hoặc serial phải chọn giá trị hợp lệ trước khi hoàn tất.',
    detail: 'Chỉ lô/serial còn khả dụng trong Warehouse bán mới được chấp nhận.',
    tone: 'warning' as const,
    icon: 'box' as const,
    action: 'Chọn serial',
  },
  {
    id: 'approval',
    label: 'Cần duyệt',
    title: 'Cần phê duyệt giá hoặc giảm giá',
    description: 'Giá hoặc giảm giá vượt quyền thu ngân phải gửi yêu cầu duyệt trước khi hoàn tất.',
    detail: 'Lý do và người duyệt được lưu cùng phiếu bán sau commit.',
    tone: 'warning' as const,
    icon: 'admin' as const,
    action: 'Gửi yêu cầu',
  },
  {
    id: 'timeout',
    label: 'Chờ xác nhận',
    title: 'Đang kiểm tra kết quả hoàn tất',
    description: 'Yêu cầu đã gửi nhưng chưa nhận phản hồi. Tra trạng thái bằng commandId trước khi retry.',
    detail: 'Không tạo lại khoản thu hoặc phiếu bán thứ hai khi timeout.',
    tone: 'neutral' as const,
    icon: 'refresh' as const,
    action: 'Tra trạng thái',
  },
  {
    id: 'conflict',
    label: 'Dữ liệu thay đổi',
    title: 'Dữ liệu bán đã thay đổi',
    description: 'Giá, promotion hoặc tồn đã khác dữ liệu cache. Thu ngân cần xác nhận dữ liệu mới trước command mới.',
    detail: 'Ví dụ: PRICE_CHANGED · PROMOTION_CHANGED · INSUFFICIENT_STOCK.',
    tone: 'danger' as const,
    icon: 'warning' as const,
    action: 'Áp dụng báo giá mới',
  },
  {
    id: 'success',
    label: 'Đã hoàn tất',
    title: 'Đã hoàn tất phiếu bán',
    description: 'Receipt snapshot đã sẵn sàng. In hoặc in lại là action riêng và không tạo ledger mới.',
    tone: 'success' as const,
    icon: 'check' as const,
    action: 'Bán mới',
  },
];

export function PosCheckoutShell({
  actor,
  apiClient,
  onNavigateDashboard,
  onSessionExpired,
  onScopeChange,
  onThemeToggle,
  projection = localPreviewProjection,
  scope,
  selectedBranchId,
  selectedWarehouseId,
  sessionToken,
  shellMode = 'standalone',
  theme = 'light',
  initialReceipt,
  initialStateId = 'empty',
  appVersion = '0.1.0',
  schemaVersion = 1,
}: PosCheckoutShellProps) {
  const toast = useToast();
  const [activeProjection, setActiveProjection] = useState(projection);
  const [query, setQuery] = useState('');
  const [cartLines, setCartLines] = useState<PosCartLine[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<(typeof tenderMethods)[number]['id']>('cash');
  const [receivedAmountText, setReceivedAmountText] = useState('');
  const [activeStateId, setActiveStateId] = useState(initialStateId);
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>('Tất cả');
  const [message, setMessage] = useState('POS sẵn sàng. Quét, tìm hàng và chỉnh giỏ được xử lý nhanh trên máy này.');
  const [isCompleting, setIsCompleting] = useState(false);
  const [receipt, setReceipt] = useState<SalesPosCompleteResponse['receipt'] | undefined>(initialReceipt);
  const pendingCompleteCommandRef = useRef<{ commandId: string; idempotencyKey: string } | undefined>(undefined);
  const branch = scope.branches.find((candidate) => candidate.branchId === selectedBranchId);
  const warehouse = scope.warehouses.find((candidate) => candidate.warehouseId === selectedWarehouseId);
  const activeActor = actor ?? createFallbackActor();
  const cache = useMemo(() => createPosCatalogCache(activeProjection), [activeProjection]);
  const productSuggestions = query.trim().length > 0 ? cache.search(query) : activeProjection.variants;
  const visibleProducts = productSuggestions.slice(0, 6);
  const totals = useMemo(() => calculateTotals(cartLines), [cartLines]);
  const receivedAmountVnd = parseVnd(receivedAmountText) ?? totals.totalVnd;
  const missingTrackedSelection = cartLines.find((line) => line.lotTracking || line.serialTracking);
  const activeState = recoveryStates.find((state) => state.id === activeStateId) ?? recoveryStates[1];
  const isStandaloneShell = shellMode === 'standalone';
  const MainTag = isStandaloneShell ? 'main' : 'div';
  const catalogCacheNamespace = buildPosCatalogCacheNamespace({
    tenantId: activeActor.tenantId,
    userId: activeActor.userId,
    authVersion: activeActor.authVersion,
    appVersion,
    schemaVersion,
  });
  const receiptPrintContext = useMemo<ReceiptPrintContext>(
    () => ({
      branchName: branch?.name,
      warehouseName: warehouse?.name,
      cashierName: activeActor.displayName,
    }),
    [activeActor.displayName, branch?.name, warehouse?.name],
  );
  const prewarmRequestKeyRef = useRef<string | undefined>(undefined);
  const prewarmCheckoutContext = useCallback(
    (sourceProjection: CatalogPosProjectionResponse) => {
      if (apiClient === undefined || sessionToken === undefined) return;
      const variantIds = sourceProjection.variants
        .filter((variant) => variant.inventoryMode === 'Tracked')
        .slice(0, 6)
        .map((variant) => variant.variantId);
      const requestKey = `${selectedBranchId}:${selectedWarehouseId}:${activeActor.userId}:shift-local-open:${variantIds.join(',')}`;
      if (prewarmRequestKeyRef.current === requestKey) return;
      prewarmRequestKeyRef.current = requestKey;

      void prewarmPosCheckoutContext({
        apiClient,
        requestId: `pos-prewarm-${Date.now()}`,
        sessionToken,
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        cashierId: activeActor.userId,
        shiftId: 'shift-local-open',
        variantIds,
      }).catch(() => {
        prewarmRequestKeyRef.current = undefined;
      });
    },
    [activeActor.userId, apiClient, selectedBranchId, selectedWarehouseId, sessionToken],
  );

  useEffect(() => {
    if (apiClient === undefined || sessionToken === undefined) {
      setActiveProjection(projection);
      return;
    }

    let isActive = true;
    void (async () => {
      const cachedProjectionEntry = await readCachedPosCatalogProjectionEntry({
        branchId: selectedBranchId,
        cacheNamespace: catalogCacheNamespace,
        warehouseId: selectedWarehouseId,
      });
      if (!isActive) return;

      const cachedProjection = cachedProjectionEntry?.projection;
      if (cachedProjection !== undefined) {
        setActiveProjection(cachedProjection);
        setMessage(`Dữ liệu hàng hóa đã sẵn sàng từ cache phiên bản ${cachedProjection.projectionVersion}.`);
        prewarmCheckoutContext(cachedProjection);
      }

      void loadPosCatalogProjection({
        apiClient,
        requestId: `pos-catalog-${Date.now()}`,
        sessionToken,
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
      })
        .then((nextProjection) => {
          prewarmCheckoutContext(nextProjection);
          const projectionChanged = cachedProjection?.projectionVersion !== nextProjection.projectionVersion;
          if (projectionChanged) {
            void writeCachedPosCatalogProjection({
              branchId: selectedBranchId,
              cacheNamespace: catalogCacheNamespace,
              projection: nextProjection,
              warehouseId: selectedWarehouseId,
            });
          }
          if (isActive && projectionChanged) {
            setActiveProjection(nextProjection);
            setMessage(`Dữ liệu hàng hóa đã cập nhật phiên bản ${nextProjection.projectionVersion}.`);
          }
        })
        .catch((error) => {
          if (!isActive) return;
          if (isCacheRevocationError(error)) {
            void clearCachedPosCatalogProjectionNamespace({ cacheNamespace: catalogCacheNamespace });
            setActiveProjection(createUnavailableProjection(selectedBranchId, selectedWarehouseId));
            setMessage('Quyền hoặc phiên đăng nhập đã thay đổi; dữ liệu POS trên máy đã được xóa.');
            if (error.code === 'SESSION_EXPIRED' || error.code === 'SESSION_REQUIRED') {
              onSessionExpired?.();
            }
            return;
          }
          if (isActive && cachedProjection === undefined) {
            setActiveProjection(projection);
            setMessage('Không tải được dữ liệu hàng hóa mới; đang dùng dữ liệu dự phòng của màn hình.');
          } else if (isActive) {
            setMessage('Không tải được dữ liệu hàng hóa mới; tiếp tục dùng dữ liệu đã lưu trên máy.');
          }
        });
    })();

    return () => {
      isActive = false;
    };
  }, [
    apiClient,
    catalogCacheNamespace,
    prewarmCheckoutContext,
    projection,
    onSessionExpired,
    selectedBranchId,
    selectedWarehouseId,
    sessionToken,
  ]);

  useEffect(() => {
    pendingCompleteCommandRef.current = undefined;
  }, [cartLines, receivedAmountVnd, selectedBranchId, selectedTenderId, selectedWarehouseId]);

  const addVariant = useCallback((variant: CatalogPosVariantDTO) => {
    setCartLines((current) => upsertCartLine(current, variant));
    setQuery('');
    setActiveStateId(variant.lotTracking || variant.serialTracking ? 'serial' : 'empty');
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
    setActiveStateId(matches.length === 0 ? 'not-found' : 'matches');
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
        cashierId: activeActor.userId,
        lines: toSalesLineInputs(cartLines),
        tenders: toTenderInputs(selectedTenderId, receivedAmountVnd),
      },
    });
    if (result.ok) {
      const message = `Đã lưu nháp ${result.data.order.businessNumber}.`;
      setMessage(message);
      toast.success(message);
      return;
    }
    setMessage(result.error.message);
    toast.danger(result.error.message);
  }, [
    activeActor.userId,
    apiClient,
    cartLines,
    receivedAmountVnd,
    selectedBranchId,
    selectedTenderId,
    selectedWarehouseId,
    sessionToken,
    toast,
  ]);

  const openDraft = useCallback(async () => {
    if (apiClient === undefined || sessionToken === undefined) return;
    const result = await apiClient.invoke<SalesDraftListResponse>({
      operation: 'sales.draft.list',
      requestId: `pos-draft-list-${Date.now()}`,
      sessionToken,
      payload: { branchId: selectedBranchId, warehouseId: selectedWarehouseId },
    });
    if (result.ok) {
      const message = `Có ${result.data.drafts.length} phiếu nháp trong scope hiện tại.`;
      setMessage(message);
      toast.info(message);
      return;
    }
    setMessage(result.error.message);
    toast.danger(result.error.message);
  }, [apiClient, selectedBranchId, selectedWarehouseId, sessionToken, toast]);

  const completeSale = useCallback(async () => {
    if (apiClient === undefined || sessionToken === undefined || cartLines.length === 0) return;
    if (missingTrackedSelection !== undefined) {
      setActiveStateId('serial');
      const message = `${missingTrackedSelection.displayName} cần chọn lô/serial trước khi hoàn tất.`;
      setMessage(message);
      toast.warning(message);
      return;
    }
    setIsCompleting(true);
    const command = pendingCompleteCommandRef.current ?? createPosCompleteCommand();
    pendingCompleteCommandRef.current = command;
    const payload = {
      commandId: command.commandId,
      idempotencyKey: command.idempotencyKey,
      branchId: selectedBranchId,
      warehouseId: selectedWarehouseId,
      cashierId: activeActor.userId,
      cashDrawerId: 'drawer-main',
      shiftId: 'shift-local-open',
      quoteVersion: `quote-${selectedBranchId}-${totals.totalVnd}-0`,
      receiptFormat: 'K80' as const,
      lines: toSalesLineInputs(cartLines),
      tenders: toTenderInputs(selectedTenderId, receivedAmountVnd),
    };
    const result = await completePosCheckoutWithRecovery({
      apiClient,
      requestId: `pos-complete-${Date.now()}`,
      sessionToken,
      command,
      payload,
    });
    setIsCompleting(false);
    if (!result.ok) {
      setActiveStateId(result.commandPending ? 'timeout' : result.error.code === 'SHIFT_NOT_OPEN' ? 'shift' : 'conflict');
      const message = result.commandPending
        ? `${result.error.message} Đang tra cứu commandId trước khi cho phép retry.`
        : result.error.message;
      setMessage(message);
      toast.danger(message);
      return;
    }
    setReceipt(result.data.receipt);
    pendingCompleteCommandRef.current = undefined;
    setCartLines([]);
    setActiveStateId('success');
    const message = `Đã hoàn tất ${result.data.order.businessNumber}.`;
    setMessage(message);
    toast.success(message);
  }, [
    activeActor.userId,
    apiClient,
    cartLines,
    missingTrackedSelection,
    receivedAmountVnd,
    selectedBranchId,
    selectedTenderId,
    selectedWarehouseId,
    sessionToken,
    toast,
    totals.totalVnd,
  ]);

  return (
    <div className={isStandaloneShell ? 'cn-pos-page' : 'cn-pos-page cn-pos-page-embedded'}>
      {isStandaloneShell ? (
        <header className="cn-pos-header">
          <div className="cn-pos-header-left">
            <button className="cn-pos-brand" onClick={onNavigateDashboard} type="button">
              <CenioBrandMark className="cn-pos-brand-mark" />
              <span>
                <strong>Cenio Sales</strong>
                <span>Quản lý bán hàng</span>
              </span>
            </button>
            <div className="cn-pos-context-row">
              <Listbox
                className="cn-pos-context-control"
                label="Chi nhánh"
                onChange={(branchId) => onScopeChange?.({ branchId })}
                options={scope.branches.map((candidate) => ({ value: candidate.branchId, label: candidate.name }))}
                value={selectedBranchId}
              />
              <Listbox
                className="cn-pos-context-control"
                label="Kho"
                onChange={(warehouseId) => onScopeChange?.({ warehouseId })}
                options={scope.warehouses.map((candidate) => ({
                  value: candidate.warehouseId,
                  label: candidate.name,
                  disabled: !candidate.directSaleEnabled,
                }))}
                value={selectedWarehouseId}
              />
              <span className="cn-pos-chip success">
                <span className="cn-chip-dot" />
                Ca POS đang mở
              </span>
            </div>
          </div>
          <div className="cn-pos-header-right">
            <span className="cn-pos-chip success">Dữ liệu quầy sẵn sàng</span>
            <IconButton
              className="cn-pos-icon-button"
              label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              onClick={onThemeToggle}
            >
              <AppIcon name={theme === 'dark' ? 'sun' : 'moon'} />
            </IconButton>
            <IconButton className="cn-pos-icon-button" label="Thông báo">
              <AppIcon name="bell" />
            </IconButton>
            <div className="cn-pos-user">
              <TextAvatar initials={getInitials(activeActor.displayName)} label={activeActor.displayName} size="sm" />
              <span>
                <strong>{activeActor.displayName}</strong>
                <span>{activeActor.loginId}</span>
              </span>
            </div>
          </div>
        </header>
      ) : null}

      <MainTag className="cn-pos-main">
        {isStandaloneShell ? (
          <section className="cn-pos-page-heading">
            <div>
              <p className="cn-pos-crumb">Sales / POS tại quầy</p>
              <h1>POS tại quầy</h1>
            </div>
          </section>
        ) : null}

        <div className="cn-pos-layout-grid">
          <section className="cn-pos-workspace">
            <section className="cn-scan-panel">
              <div className="cn-scan-label">
                <strong>Quét mã vạch, SKU hoặc tên hàng</strong>
                <span>Sẵn sàng nhận scanner</span>
              </div>
              <div className="cn-scan-input-wrap">
                <AppIcon aria-hidden="true" name="barcodeScan" />
                <input
                  aria-label="Quét mã vạch, SKU hoặc tên hàng"
                  autoFocus
                  className="cn-scan-input"
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleScanSubmit();
                  }}
                  placeholder="Quét mã hoặc nhập tên hàng..."
                  value={query}
                />
                <span className="cn-shortcut">
                  Nhấn <kbd>Enter</kbd>
                </span>
              </div>
              <p className="cn-scan-hint">
                <AppIcon name="check" />
                Scan, tìm và chỉnh quantity không gọi Apps Script từng thao tác.
              </p>
            </section>

            <div className="cn-category-row" aria-label="Danh mục gợi ý">
              {categories.map((category) => (
                <button
                  className={category === selectedCategory ? 'cn-category active' : 'cn-category'}
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>

            <section className="cn-pos-panel">
              <header className="cn-pos-panel-head">
                <div>
                  <h2>Gợi ý hàng hóa</h2>
                  <p>Có {visibleProducts.length} gợi ý trong dữ liệu đã tải; tồn được kiểm tra lại khi hoàn tất.</p>
                </div>
              </header>
              <div className="cn-pos-panel-body">
                <div className="cn-product-grid">
                  {visibleProducts.map((variant, index) => (
                    <article className="cn-product-card" key={variant.variantId}>
                      <div className="cn-product-top">
                        <span className={`cn-product-icon cn-product-icon-${index % 4}`} aria-hidden="true">
                          <AppIcon name="box" />
                        </span>
                        <span className="cn-stock num">{getStockPreview(variant)}</span>
                      </div>
                      <h3 className="cn-product-name">{variant.displayName}</h3>
                      <p className="cn-product-meta num">
                        SKU {variant.sku} · {variant.unitName}
                      </p>
                      <strong className="cn-product-price num">{formatVnd(variant.unitPriceVnd)}</strong>
                      <div className="cn-product-foot">
                        <span className="cn-indicator">
                          <AppIcon name={variant.serialTracking ? 'warning' : variant.lotTracking ? 'orders' : 'catalog'} />
                          {getProductIndicator(variant)}
                        </span>
                        <Button onClick={() => addVariant(variant)} variant="secondary">
                          Thêm
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section aria-label="Khách hàng" className="cn-pos-panel">
              <div className="cn-customer-panel">
                <span className="cn-customer-icon" aria-hidden="true">
                  <AppIcon name="customers" />
                </span>
                <div className="cn-customer-copy">
                  <strong>Khách lẻ</strong>
                  <span>Chưa chọn khách hàng · có thể tích điểm sau khi chọn</span>
                </div>
                <div className="cn-customer-actions">
                  <Button variant="ghost">Tìm khách</Button>
                  <Button variant="secondary">Tạo nhanh</Button>
                </div>
              </div>
            </section>
          </section>

          <aside className="cn-checkout-panel">
            <section className="cn-pos-panel">
              <header className="cn-pos-panel-head">
                <div className="cn-cart-title">
                  <h2>Giỏ hàng</h2>
                  <span className="cn-cart-count">{cartLines.length} mặt hàng</span>
                  <span className="cn-pos-chip warning">Chưa lưu</span>
                </div>
              </header>
              <div className="cn-scope-snapshot">
                <AppIcon name="inventory" />
                <span>{formatScopeSnapshot(branch?.name, warehouse?.name)}</span>
              </div>

              {cartLines.length === 0 ? (
                <div className="cn-cart-empty-state">
                  <span className="cn-state-symbol">
                    <AppIcon name="orders" />
                  </span>
                  <strong>Giỏ hàng đang trống</strong>
                  <p>Quét mã vạch, nhập SKU hoặc tìm tên để thêm mặt hàng. Không autosave giỏ chưa lưu.</p>
                </div>
              ) : (
                <div className="cn-cart-lines">
                  {cartLines.map((line) => (
                    <article className="cn-cart-line" key={line.variantId}>
                      <div className="cn-cart-line-main">
                        <div className="cn-cart-line-name">
                          {line.displayName}
                          {line.lineDiscountVnd > 0 ? <span className="cn-pos-chip success">KM</span> : null}
                        </div>
                        <p className="cn-cart-line-meta num">
                          {line.unitName} · {line.sku} · {formatVnd(line.unitPriceVnd)}
                        </p>
                        <div className="cn-line-tools">
                          <div className="cn-stepper" aria-label={`Số lượng ${line.displayName}`}>
                            <button
                              aria-label="Giảm số lượng"
                              onClick={() => setCartLines((current) => changeCartQuantity(current, line.variantId, line.quantity - 1))}
                              type="button"
                            >
                              −
                            </button>
                            <span className="num">{line.quantity}</span>
                            <button
                              aria-label="Tăng số lượng"
                              onClick={() => setCartLines((current) => changeCartQuantity(current, line.variantId, line.quantity + 1))}
                              type="button"
                            >
                              +
                            </button>
                          </div>
                          {(line.lotTracking || line.serialTracking) ? (
                            <button className="cn-line-link" onClick={() => setActiveStateId('serial')} type="button">
                              {line.serialTracking ? 'Chọn serial' : 'Chọn lô'}
                            </button>
                          ) : (
                            <button className="cn-line-link" type="button">Giảm giá</button>
                          )}
                        </div>
                      </div>
                      <div className="cn-cart-line-side">
                        <strong className="cn-line-total num">{formatVnd(line.lineTotalVnd)}</strong>
                        <button
                          className="cn-remove-line"
                          onClick={() => setCartLines((current) => current.filter((candidate) => candidate.variantId !== line.variantId))}
                          type="button"
                        >
                          Bỏ
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {missingTrackedSelection !== undefined ? (
                <div className="cn-inline-warning">
                  <AppIcon name="warning" />
                  <span>{missingTrackedSelection.displayName} cần chọn lô/serial trước khi hoàn tất.</span>
                </div>
              ) : null}

              <section className="cn-commerce-section">
                <div className="cn-commerce-heading">
                  <strong>Khuyến mãi & ưu đãi</strong>
                  <span>Tự động áp dụng khi có policy hợp lệ</span>
                </div>
                <div className="cn-field-row">
                  <input aria-label="Mã giảm giá" className="cn-field-input" placeholder="Nhập mã giảm giá" />
                  <Button variant="secondary">Áp dụng</Button>
                </div>
                <div className="cn-points-row">
                  <span>Điểm thành viên</span>
                  <strong>Chọn khách để dùng điểm</strong>
                </div>
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
                <div className="cn-total-row">
                  <span>VAT</span>
                  <strong className="num">0 đ</strong>
                </div>
                <div className="cn-total-row">
                  <span>Phí giao hàng</span>
                  <strong className="num">0 đ</strong>
                </div>
                <div className="cn-total-row cn-total-final">
                  <span>Tổng thanh toán</span>
                  <strong className="num">{formatVnd(totals.totalVnd)}</strong>
                </div>
              </section>

              <section className="cn-commerce-section">
                <div className="cn-commerce-heading">
                  <strong>Phương thức thanh toán</strong>
                  <span>Có thể ghi nhiều khoản thu</span>
                </div>
                <div className="cn-tender-tabs" role="tablist" aria-label="Phương thức thanh toán">
                  {tenderMethods.map((tender) => (
                    <button
                      aria-selected={selectedTenderId === tender.id}
                      className={selectedTenderId === tender.id ? 'cn-tender active' : 'cn-tender'}
                      key={tender.id}
                      onClick={() => setSelectedTenderId(tender.id)}
                      role="tab"
                      type="button"
                    >
                      <AppIcon name={tender.icon} />
                      {tender.label}
                    </button>
                  ))}
                </div>
                <div className="cn-received-grid">
                  <input
                    aria-label="Số tiền khách đưa"
                    className="cn-field-input num"
                    onChange={(event) => setReceivedAmountText(event.currentTarget.value)}
                    placeholder={formatVnd(totals.totalVnd)}
                    value={receivedAmountText}
                  />
                  <button
                    className="cn-quick-amount"
                    onClick={() => setReceivedAmountText(String(totals.totalVnd))}
                    type="button"
                  >
                    Đủ tiền
                  </button>
                </div>
                <div className="cn-amount-result">
                  <span>{receivedAmountVnd >= totals.totalVnd ? 'Tiền thừa trả khách' : 'Còn phải thu'}</span>
                  <strong className="num">
                    {receivedAmountVnd >= totals.totalVnd
                      ? formatVnd(receivedAmountVnd - totals.totalVnd)
                      : formatVnd(totals.totalVnd - receivedAmountVnd)}
                  </strong>
                </div>
              </section>

              <div className="cn-cart-actions">
                <Button disabled={cartLines.length === 0} onClick={saveDraft} variant="secondary">Lưu nháp</Button>
                <Button onClick={openDraft} variant="secondary">Mở nháp</Button>
                <Button
                  onClick={() => {
                    const message = 'Đã hủy giỏ trên trình duyệt.';
                    setCartLines([]);
                    setMessage(message);
                    toast.info(message);
                  }}
                  variant="secondary"
                >
                  Hủy giỏ
                </Button>
              </div>
              <div className="cn-complete-wrap">
                <Button
                  className="cn-complete"
                  disabled={cartLines.length === 0}
                  isLoading={isCompleting}
                  onClick={completeSale}
                  variant="primary"
                >
                  Hoàn tất bán hàng
                </Button>
              </div>
              <div className="cn-checkout-contract">
                <AppIcon name="admin" />
                <span>Khi hoàn tất, hệ thống kiểm tra lại phạm vi, ca mở, tồn, lô/serial, giá, ưu đãi, điểm, thuế, công nợ và khoản thu trước khi ghi nhận phiếu bán.</span>
              </div>
            </section>
          </aside>
        </div>

        {isStandaloneShell ? (
          <section className="cn-pos-panel cn-state-lab">
            <header className="cn-pos-panel-head">
              <div>
                <h2>Tình huống POS & phục hồi</h2>
                <p>{message}</p>
              </div>
              <span className="cn-pos-chip info">10 trạng thái</span>
            </header>
            <div className="cn-state-tabs" role="tablist" aria-label="Trạng thái POS">
              {recoveryStates.map((state) => (
                <button
                  aria-selected={state.id === activeStateId}
                  className="cn-state-tab"
                  key={state.id}
                  onClick={() => setActiveStateId(state.id)}
                  role="tab"
                  type="button"
                >
                  {state.label}
                </button>
              ))}
            </div>
            <RecoveryStateContent activeState={activeState} printContext={receiptPrintContext} receipt={receipt} />
          </section>
        ) : (
          <PosContextDrawer
            activeState={activeState}
            message={message}
            onClose={() => setActiveStateId('empty')}
            printContext={receiptPrintContext}
            receipt={receipt}
          />
        )}
      </MainTag>
    </div>
  );
}

function isCacheRevocationError(error: unknown): error is PosCatalogProjectionLoadError {
  return (
    error instanceof PosCatalogProjectionLoadError &&
    (error.code === 'SESSION_EXPIRED' ||
      error.code === 'SESSION_REQUIRED' ||
      error.code === 'PERMISSION_DENIED' ||
      error.code === 'SCOPE_DENIED')
  );
}

function createUnavailableProjection(branchId: string, warehouseId: string): CatalogPosProjectionResponse {
  return {
    projectionVersion: 'catalog-pos-unavailable',
    branchId,
    warehouseId,
    generatedAt: new Date().toISOString(),
    variants: [],
  };
}

function RecoveryStateContent({
  activeState,
  printContext,
  receipt,
}: {
  activeState: (typeof recoveryStates)[number];
  printContext?: ReceiptPrintContext;
  receipt?: SalesPosCompleteResponse['receipt'];
}) {
  const handlePrintReceipt = useCallback(() => {
    if (receipt === undefined) return;
    printReceiptSnapshot(receipt, printContext);
  }, [printContext, receipt]);

  return (
    <div className={`cn-state-content cn-state-${activeState.tone}`} role="tabpanel">
      <span className="cn-state-symbol">
        <AppIcon name={activeState.icon} />
      </span>
      <div className="cn-state-copy">
        <h3>{activeState.title}</h3>
        <p>
          {activeState.id === 'success' && receipt
            ? `${activeState.description} ${receipt.businessNumber} · ${formatVnd(receipt.totals.totalVnd)}.`
            : activeState.description}
        </p>
        {activeState.detail ? <div className="cn-state-detail">{activeState.detail}</div> : null}
        {activeState.id === 'success' && receipt ? <ReceiptSnapshot receipt={receipt} /> : null}
      </div>
      {activeState.id === 'success' && receipt ? (
        <div className="cn-receipt-actions">
          <Button onClick={handlePrintReceipt} variant="primary">
            <AppIcon name="print" />
            In biên lai
          </Button>
          <Button onClick={handlePrintReceipt} variant="secondary">In lại</Button>
          <span className="cn-pos-chip info">Mẫu {receipt.receiptFormat}</span>
        </div>
      ) : (
        <Button variant={activeState.id === 'conflict' ? 'primary' : 'secondary'}>{activeState.action}</Button>
      )}
    </div>
  );
}

function ReceiptSnapshot({ receipt }: { receipt: SalesPosCompleteResponse['receipt'] }) {
  return (
    <section aria-label="Receipt snapshot" className="cn-receipt-snapshot">
      <header>
        <strong>{receipt.businessNumber}</strong>
        <span>{receipt.receiptFormat} · {formatShortDateTime(receipt.createdAt)}</span>
      </header>
      <div className="cn-receipt-lines">
        {receipt.lines.map((line) => (
          <div className="cn-receipt-line" key={line.saleOrderLineId}>
            <span>
              {line.displayName}
              <small className="num">{line.sku ?? line.variantId} · {formatQuantity(line.quantityMilli)} {line.unitName}</small>
            </span>
            <strong className="num">{formatVnd(line.lineTotalVnd)}</strong>
          </div>
        ))}
      </div>
      <div className="cn-receipt-total">
        <span>Thanh toán</span>
        <strong className="num">{formatVnd(receipt.totals.totalVnd)}</strong>
      </div>
      <p>Receipt snapshot là dữ liệu in chính thức; in hoặc in lại không tạo ledger mới.</p>
    </section>
  );
}

function PosContextDrawer({
  activeState,
  message,
  onClose,
  printContext,
  receipt,
}: {
  activeState: (typeof recoveryStates)[number];
  message: string;
  onClose(): void;
  printContext?: ReceiptPrintContext;
  receipt?: SalesPosCompleteResponse['receipt'];
}) {
  const isOpen = activeState.id !== 'empty';
  return (
    <aside
      aria-labelledby="pos-context-drawer-title"
      aria-modal="true"
      className="cn-pos-context-drawer"
      hidden={!isOpen}
      role="dialog"
    >
      <div className="cn-pos-context-drawer-panel">
        <header className="cn-pos-context-drawer-head">
          <div>
            <p>POS tại quầy</p>
            <h2 id="pos-context-drawer-title">Chi tiết xử lý</h2>
          </div>
          <IconButton label="Đóng panel xử lý" onClick={onClose}>
            <AppIcon name="close" />
          </IconButton>
        </header>
        <div className="cn-pos-context-drawer-body">
          <RecoveryStateContent activeState={activeState} printContext={printContext} receipt={receipt} />
          <div className="cn-pos-context-drawer-note">{message}</div>
          <section className="cn-pos-context-reference" aria-label="Các trạng thái phục hồi POS">
            <h3>Dữ liệu bán đã thay đổi</h3>
            <p>PRICE_CHANGED, PROMOTION_CHANGED hoặc INSUFFICIENT_STOCK giữ nguyên giỏ và yêu cầu áp dụng quote mới.</p>
            <h3>Đang kiểm tra kết quả hoàn tất</h3>
            <p>Timeout phải tra cứu cùng commandId/idempotency key trước khi thử lại để không tạo chứng từ trùng.</p>
            <h3>Receipt snapshot</h3>
            <p>Biên lai K80/A4 được render từ snapshot đã trả về; in hoặc in lại không tạo ledger mới.</p>
          </section>
        </div>
      </div>
    </aside>
  );
}

function createFallbackActor(): ActorContextDTO {
  return {
    userId: 'user-admin',
    loginId: 'admin',
    displayName: 'Admin Local',
    tenantId: 'tenant-default',
    authVersion: 1,
    actions: [],
    scope: {
      tenantId: 'tenant-default',
      branchIds: ['branch-default'],
      warehouseIds: ['warehouse-default'],
    },
  };
}

function getStockPreview(variant: CatalogPosVariantDTO): string {
  if (variant.serialTracking) return 'Còn 8 bộ';
  if (variant.lotTracking) return 'Còn 36 chai';
  if (variant.sku.includes('TS')) return 'Còn 19 cái';
  return 'Còn 24 chai';
}

function getProductIndicator(variant: CatalogPosVariantDTO): string {
  if (variant.serialTracking) return 'Chọn serial';
  if (variant.lotTracking) return 'Lô theo dõi';
  if (variant.sku.includes('TS')) return 'Màu / size';
  return 'Có thể bán';
}

function formatScopeSnapshot(branchName?: string, warehouseName?: string): string {
  return `${branchName ?? 'Chi nhánh chưa hợp lệ'} · ${warehouseName ?? 'Kho chưa hợp lệ'} · Ca POS #CA-017`;
}

function getInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';
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

function createPosCompleteCommand(): { commandId: string; idempotencyKey: string } {
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    commandId: `cmd-pos-${suffix}`,
    idempotencyKey: `idem-pos-${suffix}`,
  };
}

function parseVnd(value: string): number | undefined {
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length === 0) return undefined;
  return Number(digits);
}

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function formatQuantity(quantityMilli: number): string {
  const quantity = quantityMilli / 1000;
  return Number.isInteger(quantity) ? String(quantity) : quantity.toLocaleString('vi-VN');
}

function formatShortDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}
