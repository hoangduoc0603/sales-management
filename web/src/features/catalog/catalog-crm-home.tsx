import type {
  CatalogCreateProductResponse,
  CatalogCreateVariantResponse,
  CatalogProductListItemDTO,
  CatalogProductListRequest,
  CatalogProductListResponse,
  CatalogProductListStatus,
  CatalogSetVariantActiveResponse,
  CatalogUpdateProductResponse,
  CatalogUpdateVariantResponse,
  InventoryMode,
  ProductType,
} from '@shared/contracts/catalog/catalog';
import type {
  CustomerDTO,
  CustomerQuickCreateResponse,
  CustomerSearchResponse,
} from '@shared/contracts/crm/customer';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { AppRoute } from '../../app/app-shell/app-shell';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { AppIcon } from '../../components/ui/icons';
import { Panel } from '../../components/ui/panel';
import { SkeletonTable } from '../../components/ui/skeleton';
import { StateBlock } from '../../components/ui/state-block';
import { useToast } from '../../components/ui/toast';
import type { ApiClient } from '../../lib/api/client';

export interface CatalogCrmHomeProps {
  route: Extract<AppRoute, 'catalog' | 'customers'>;
  apiClient?: ApiClient;
  sessionToken?: string;
  selectedWarehouseId?: string;
  initialProductItems?: readonly CatalogProductListItemDTO[];
}

interface ProductFormState {
  productCode: string;
  name: string;
  sku: string;
  barcode: string;
  defaultUnitId: string;
  unitPriceVnd: string;
  productType: ProductType;
  inventoryMode: InventoryMode;
  lotTracking: boolean;
  serialTracking: boolean;
}

interface VariantFormState {
  displayName: string;
  sku: string;
  barcode: string;
  defaultUnitId: string;
  unitPriceVnd: string;
  unitFactor: string;
  inventoryMode: InventoryMode;
  lotTracking: boolean;
  serialTracking: boolean;
  saleEnabled: boolean;
  purchaseEnabled: boolean;
}

interface CustomerFormState {
  displayName: string;
  phone: string;
  email: string;
  customerGroupId: string;
}

const defaultProductItems: readonly CatalogProductListItemDTO[] = [
  {
    productId: 'product-milk',
    productCode: 'SP-001',
    productName: 'Sữa hạt óc chó 1L',
    productType: 'Stocked',
    categoryId: 'food',
    brandId: 'internal',
    variantId: 'variant-milk-1l',
    sku: 'SH-OC-1L',
    displayName: 'Sữa hạt óc chó 1L',
    barcode: '893000000001',
    defaultUnitId: 'chai',
    unitPriceVnd: 42000,
    inventoryMode: 'Tracked',
    lotTracking: false,
    serialTracking: false,
    isActive: true,
    availableWarehouseId: 'warehouse-default',
    availableMilli: 4_000,
  },
  {
    productId: 'product-laundry',
    productCode: 'SP-002',
    productName: 'Nước giặt sinh học hương hoa 3,6kg',
    productType: 'Stocked',
    categoryId: 'food',
    brandId: 'internal',
    variantId: 'variant-laundry-36',
    sku: 'NG-SH-3600',
    displayName: 'Nước giặt sinh học hương hoa 3,6kg',
    barcode: '893000000002',
    defaultUnitId: 'túi',
    unitPriceVnd: 185000,
    inventoryMode: 'Tracked',
    lotTracking: false,
    serialTracking: false,
    isActive: true,
    availableWarehouseId: 'warehouse-default',
    availableMilli: 24_000,
  },
];

const defaultCustomerItems: readonly CustomerDTO[] = [
  {
    customerId: 'customer-walkin-1',
    tenantId: 'tenant-default',
    customerCode: 'CUS-001',
    displayName: 'Trần Thị Hồng Nhung',
    phone: '0909 482 176',
    phoneNormalized: '0909482176',
    email: 'nhung@example.com',
    emailNormalized: 'nhung@example.com',
    customerGroupId: 'retail-loyal',
    status: 'Active',
  },
  {
    customerId: 'customer-company-1',
    tenantId: 'tenant-default',
    customerCode: 'CUS-002',
    displayName: 'Công ty CP Văn phòng Phương Nam',
    phone: '028 3822 0187',
    phoneNormalized: '02838220187',
    email: 'mua-hang@phuongnam.example',
    emailNormalized: 'mua-hang@phuongnam.example',
    customerGroupId: 'business',
    status: 'Active',
  },
];

const emptyForm: ProductFormState = {
  productCode: '',
  name: '',
  sku: '',
  barcode: '',
  defaultUnitId: 'cái',
  unitPriceVnd: '0',
  productType: 'Stocked',
  inventoryMode: 'Tracked',
  lotTracking: false,
  serialTracking: false,
};

const emptyVariantForm: VariantFormState = {
  displayName: '',
  sku: '',
  barcode: '',
  defaultUnitId: 'cái',
  unitPriceVnd: '0',
  unitFactor: '1',
  inventoryMode: 'Tracked',
  lotTracking: false,
  serialTracking: false,
  saleEnabled: true,
  purchaseEnabled: true,
};

const emptyCustomerForm: CustomerFormState = {
  displayName: '',
  phone: '',
  email: '',
  customerGroupId: 'retail',
};

const productStatuses: readonly { value: CatalogProductListStatus; label: string }[] = [
  { value: 'All', label: 'Tất cả trạng thái' },
  { value: 'Active', label: 'Đang bán' },
  { value: 'Inactive', label: 'Ngừng bán' },
];

const productTypeOptions: readonly { value: ProductType | 'All'; label: string; description?: string }[] = [
  { value: 'All', label: 'Tất cả loại hàng' },
  { value: 'Stocked', label: 'Hàng tồn', description: 'Quản lý tồn, lô hoặc serial khi cần.' },
  { value: 'Service', label: 'Dịch vụ', description: 'Không kiểm tồn khi bán.' },
  { value: 'NonStock', label: 'Không tồn', description: 'Có SKU, barcode và giá nhưng không giữ tồn.' },
  { value: 'Bundle', label: 'Bộ sản phẩm', description: 'Trừ tồn theo công thức thành phần.' },
];

const categoryOptions = [
  { value: 'All', label: 'Tất cả nhóm hàng' },
  { value: 'food', label: 'Thực phẩm & đồ uống' },
  { value: 'fashion', label: 'Thời trang' },
] as const;

const brandOptions = [
  { value: 'All', label: 'Tất cả thương hiệu' },
  { value: 'internal', label: 'Hàng nội bộ' },
] as const;

const trackingOptions = [
  {
    value: 'none',
    label: 'Không theo dõi',
    description: 'Chỉ quản lý tổng số lượng.',
  },
  {
    value: 'lot',
    label: 'Theo dõi lô & hạn sử dụng',
    description: 'Dùng cho hàng có hạn dùng hoặc cần FEFO.',
  },
  {
    value: 'serial',
    label: 'Theo dõi serial / IMEI',
    description: 'Mỗi đơn vị bán có mã định danh riêng.',
  },
  {
    value: 'both',
    label: 'Theo dõi lô & hạn sử dụng và serial / IMEI',
    description: 'Bật đồng thời lotTracking và serialTracking.',
  },
] as const;

type CatalogDialog = 'create' | 'edit' | 'detail' | 'row-menu' | 'deactivate' | 'import' | 'export';

type TrackingMode = (typeof trackingOptions)[number]['value'];
type DrawerTab = 'overview' | 'variants' | 'units' | 'inventory';
type CatalogListLoadingReason = 'initial' | 'search' | 'filter' | 'refresh';
type RowMenuPosition = {
  left: number;
  top: number;
};
type CatalogHashState =
  | 'catalog'
  | 'detail'
  | 'create'
  | 'edit'
  | 'row-menu'
  | 'deactivate-confirm'
  | 'import'
  | 'import-validating'
  | 'import-validated'
  | 'import-confirm'
  | 'import-committing'
  | 'import-completed'
  | 'import-failed'
  | 'import-restricted'
  | 'export'
  | 'bundle-formula'
  | 'bundle-formula-validation';
type ImportState =
  | 'import'
  | 'import-validating'
  | 'import-validated'
  | 'import-confirm'
  | 'import-committing'
  | 'import-completed'
  | 'import-failed'
  | 'import-restricted';

const catalogHashStates = new Set<CatalogHashState>([
  'catalog',
  'detail',
  'create',
  'edit',
  'row-menu',
  'deactivate-confirm',
  'import',
  'import-validating',
  'import-validated',
  'import-confirm',
  'import-committing',
  'import-completed',
  'import-failed',
  'import-restricted',
  'export',
  'bundle-formula',
  'bundle-formula-validation',
]);
const catalogSearchDebounceMs = 300;
const catalogRowMenuWidthPx = 230;
const catalogRowMenuHeightPx = 185;
const catalogRowMenuViewportGapPx = 12;
const catalogRowMenuAnchorGapPx = 6;

function isImportState(state: string): state is ImportState {
  return (
    state === 'import' ||
    state === 'import-validating' ||
    state === 'import-validated' ||
    state === 'import-confirm' ||
    state === 'import-committing' ||
    state === 'import-completed' ||
    state === 'import-failed' ||
    state === 'import-restricted'
  );
}

function writeCatalogHash(state: CatalogHashState) {
  if (typeof window === 'undefined') return;
  const nextHash = `#${state}`;
  if (window.location.hash !== nextHash) {
    window.history.pushState(null, '', nextHash);
  }
}

interface CatalogProductGroup {
  productId: string;
  productCode: string;
  productName: string;
  productType: ProductType;
  variants: readonly CatalogProductListItemDTO[];
}

export function CatalogCrmHome({
  apiClient,
  initialProductItems = defaultProductItems,
  route,
  selectedWarehouseId,
  sessionToken,
}: CatalogCrmHomeProps) {
  const toast = useToast();
  const isCustomerRoute = route === 'customers';
  const shouldLoadProductsFromApi =
    !isCustomerRoute && apiClient !== undefined && sessionToken !== undefined;
  const initialCatalogItems = shouldLoadProductsFromApi ? [] : initialProductItems;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<CatalogProductListStatus>('All');
  const [items, setItems] = useState<readonly CatalogProductListItemDTO[]>(initialCatalogItems);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    initialCatalogItems[0]?.variantId,
  );
  const [form, setForm] = useState<ProductFormState>(() =>
    initialCatalogItems[0] ? formFromItem(initialCatalogItems[0]) : emptyForm,
  );
  const [variantForm, setVariantForm] = useState<VariantFormState>(() =>
    initialCatalogItems[0] ? variantFormFromItem(initialCatalogItems[0]) : emptyVariantForm,
  );
  const [mode, setMode] = useState<'create' | 'edit'>(initialCatalogItems[0] ? 'edit' : 'create');
  const [variantMode, setVariantMode] = useState<'create' | 'edit'>(
    initialCatalogItems[0] ? 'edit' : 'create',
  );
  const [productTypeFilter, setProductTypeFilter] = useState<ProductType | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [activeDialog, setActiveDialog] = useState<CatalogDialog>();
  const [isBundleFormulaOpen, setIsBundleFormulaOpen] = useState(false);
  const [openListbox, setOpenListbox] = useState<string>();
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('overview');
  const [importState, setImportState] = useState<ImportState>('import');
  const [formulaValidation, setFormulaValidation] = useState(false);
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('none');
  const [isLoading, setIsLoading] = useState(shouldLoadProductsFromApi);
  const [catalogListLoadingReason, setCatalogListLoadingReason] = useState<CatalogListLoadingReason | undefined>(
    shouldLoadProductsFromApi ? 'initial' : undefined,
  );
  const [rowMenuPosition, setRowMenuPosition] = useState<RowMenuPosition>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const loadedQueryRef = useRef<string | undefined>(shouldLoadProductsFromApi ? undefined : '');

  useEffect(() => {
    if (errorMessage !== undefined) toast.danger(errorMessage);
  }, [errorMessage, toast]);

  const selectedItem = useMemo(
    () => items.find((item) => item.variantId === selectedVariantId) ?? items[0],
    [items, selectedVariantId],
  );
  const selectedProductVariantCount = useMemo(
    () => (selectedItem === undefined ? 0 : items.filter((item) => item.productId === selectedItem.productId).length),
    [items, selectedItem],
  );
  const filteredItems = useMemo(
    () => {
      if (shouldLoadProductsFromApi) return items;

      const normalizedQuery = debouncedQuery.trim().toLocaleLowerCase('vi-VN');
      return items.filter((item) => {
        if (status === 'Active' && !item.isActive) return false;
        if (status === 'Inactive' && item.isActive) return false;
        if (productTypeFilter !== 'All' && item.productType !== productTypeFilter) return false;
        if (categoryFilter !== 'All' && item.categoryId !== categoryFilter) return false;
        if (brandFilter !== 'All' && item.brandId !== brandFilter) return false;
        if (
          normalizedQuery !== '' &&
          ![item.productName, item.productCode, item.displayName, item.sku, item.barcode]
            .filter((value): value is string => value !== undefined)
            .some((value) => value.toLocaleLowerCase('vi-VN').includes(normalizedQuery))
        ) {
          return false;
        }
        return true;
      });
    },
    [brandFilter, categoryFilter, debouncedQuery, items, productTypeFilter, shouldLoadProductsFromApi, status],
  );
  const groupedItems = useMemo(() => groupProductItems(filteredItems), [filteredItems]);
  const selectedProductItems = useMemo(
    () =>
      selectedItem === undefined
        ? []
        : items.filter((item) => item.productId === selectedItem.productId),
    [items, selectedItem],
  );
  const filteredProductCount = useMemo(
    () => new Set(filteredItems.map((item) => item.productId)).size,
    [filteredItems],
  );
  const isBackdropOpen =
    (activeDialog !== undefined && activeDialog !== 'row-menu') || isBundleFormulaOpen;
  const showProductLoadingSkeleton = shouldLoadProductsFromApi && isLoading && items.length === 0;
  const isRefreshingProducts = catalogListLoadingReason === 'refresh';
  const isSearchingProducts = catalogListLoadingReason === 'search';
  const hasActiveCatalogFilter =
    status !== 'All' ||
    productTypeFilter !== 'All' ||
    categoryFilter !== 'All' ||
    brandFilter !== 'All';

  function closeCatalogOverlay() {
    setActiveDialog(undefined);
    setIsBundleFormulaOpen(false);
    setFormulaValidation(false);
    setRowMenuPosition(undefined);
    writeCatalogHash('catalog');
  }

  function openCatalogDialog(dialog: CatalogDialog, hash: CatalogHashState) {
    if (dialog !== 'row-menu') setRowMenuPosition(undefined);
    setActiveDialog(dialog);
    setIsBundleFormulaOpen(false);
    setFormulaValidation(false);
    writeCatalogHash(hash);
  }

  function openRowMenu(item: CatalogProductListItemDTO, anchor: HTMLElement) {
    setSelectedVariantId(item.variantId);
    setRowMenuPosition(calculateRowMenuPosition(anchor.getBoundingClientRect()));
    openCatalogDialog('row-menu', 'row-menu');
  }

  function clearCatalogFilters() {
    setStatus('All');
    setProductTypeFilter('All');
    setCategoryFilter('All');
    setBrandFilter('All');
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, catalogSearchDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (selectedItem === undefined) return;
    if (mode === 'edit') {
      setForm(formFromItem(selectedItem));
      setSelectedVariantId(selectedItem.variantId);
      setInventoryEnabled(selectedItem.inventoryMode === 'Tracked');
      setTrackingMode(trackingModeFromFlags(selectedItem));
    }
    if (variantMode === 'edit') {
      setVariantForm(variantFormFromItem(selectedItem));
    }
  }, [mode, selectedItem, variantMode]);

  useEffect(() => {
    if (!shouldLoadProductsFromApi) return;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    const normalizedQuery = debouncedQuery.trim();
    const loadingReason: CatalogListLoadingReason =
      items.length === 0 ? 'initial' : normalizedQuery !== loadedQueryRef.current ? 'search' : 'filter';

    void loadProducts({
      apiClient,
      brandFilter,
      categoryFilter,
      productTypeFilter,
      query: debouncedQuery,
      selectedWarehouseId,
      sessionToken,
      status,
      signal: controller.signal,
      onStart: () => {
        setCatalogListLoadingReason(loadingReason);
        setIsLoading(true);
        setErrorMessage(undefined);
      },
      onFinish: () => {
        window.clearTimeout(timeoutId);
        setIsLoading(false);
        setCatalogListLoadingReason(undefined);
      },
      onSuccess: (nextItems) => {
        loadedQueryRef.current = normalizedQuery;
        setItems(nextItems);
        setSelectedVariantId((current) =>
          nextItems.some((item) => item.variantId === current) ? current : nextItems[0]?.variantId,
        );
      },
      onError: setErrorMessage,
    });

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [
    apiClient,
    brandFilter,
    categoryFilter,
    debouncedQuery,
    productTypeFilter,
    selectedWarehouseId,
    sessionToken,
    shouldLoadProductsFromApi,
    status,
  ]);

  useEffect(() => {
    if (openListbox === undefined || typeof document === 'undefined') return undefined;

    const closeOnPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.cn-catalog-artifact .listbox') !== null) return;
      setOpenListbox(undefined);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenListbox(undefined);
    };

    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openListbox]);

  useEffect(() => {
    if (isCustomerRoute || typeof window === 'undefined') return undefined;

    const applyCatalogHash = () => {
      const state = window.location.hash.replace('#', '') as CatalogHashState;
      if (!catalogHashStates.has(state)) return;

      if (state === 'catalog') {
        setActiveDialog(undefined);
        setIsBundleFormulaOpen(false);
        setFormulaValidation(false);
        return;
      }

      if (state === 'detail') {
        setDrawerTab('overview');
        setActiveDialog('detail');
        setIsBundleFormulaOpen(false);
        return;
      }

      if (state === 'create') {
        setMode('create');
        setVariantMode('create');
        setForm(emptyForm);
        setVariantForm(emptyVariantForm);
        setSelectedVariantId(undefined);
        setInventoryEnabled(true);
        setTrackingMode('none');
        setFormulaValidation(false);
        setIsBundleFormulaOpen(false);
        setActiveDialog('create');
        return;
      }

      if (state === 'edit') {
        setMode('edit');
        setVariantMode('edit');
        setFormulaValidation(false);
        setIsBundleFormulaOpen(false);
        setActiveDialog('edit');
        return;
      }

      if (state === 'row-menu') {
        setRowMenuPosition(undefined);
        setActiveDialog('row-menu');
        setIsBundleFormulaOpen(false);
        return;
      }

      if (state === 'deactivate-confirm') {
        setActiveDialog('deactivate');
        setIsBundleFormulaOpen(false);
        return;
      }

      if (isImportState(state)) {
        setImportState(state);
        setActiveDialog('import');
        setIsBundleFormulaOpen(false);
        return;
      }

      if (state === 'export') {
        setActiveDialog('export');
        setIsBundleFormulaOpen(false);
        return;
      }

      if (state === 'bundle-formula' || state === 'bundle-formula-validation') {
        setMode('create');
        setVariantMode('create');
        setForm((current) => ({ ...current, productType: 'Bundle', inventoryMode: 'Bundle' }));
        setVariantForm((current) => ({ ...current, inventoryMode: 'Bundle' }));
        setInventoryEnabled(false);
        setActiveDialog('create');
        setFormulaValidation(state === 'bundle-formula-validation');
        setIsBundleFormulaOpen(true);
      }
    };

    applyCatalogHash();
    window.addEventListener('hashchange', applyCatalogHash);
    window.addEventListener('popstate', applyCatalogHash);
    return () => {
      window.removeEventListener('hashchange', applyCatalogHash);
      window.removeEventListener('popstate', applyCatalogHash);
    };
  }, [isCustomerRoute]);

  useEffect(() => {
    if (activeDialog !== 'import') return undefined;
    if (importState !== 'import-validating' && importState !== 'import-committing') return undefined;

    const nextState = importState === 'import-validating' ? 'import-validated' : 'import-completed';
    const timeoutId = window.setTimeout(() => {
      setImportState(nextState);
      writeCatalogHash(nextState);
    }, importState === 'import-validating' ? 900 : 1200);

    return () => window.clearTimeout(timeoutId);
  }, [activeDialog, importState]);

  async function refreshProducts(
    nextQuery = query,
    nextStatus = status,
    nextProductType = productTypeFilter,
    nextCategory = categoryFilter,
    nextBrand = brandFilter,
    loadingReason: CatalogListLoadingReason = 'refresh',
  ) {
    if (apiClient === undefined || sessionToken === undefined) return;
    setCatalogListLoadingReason(loadingReason);
    setIsLoading(true);
    setErrorMessage(undefined);
    const result = await apiClient.invoke<CatalogProductListResponse>({
      operation: 'catalog.product.list',
      requestId: createRequestId('catalog-list'),
      sessionToken,
      payload: buildCatalogProductListPayload({
        brandFilter: nextBrand,
        categoryFilter: nextCategory,
        productTypeFilter: nextProductType,
        query: nextQuery,
        selectedWarehouseId,
        status: nextStatus,
      }),
    });
    setIsLoading(false);
    setCatalogListLoadingReason(undefined);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    setItems(result.data.items);
  }

  async function submitProduct() {
    const parsedPrice = Number(form.unitPriceVnd);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('Giá bán phải là số không âm.');
      return;
    }
    if (apiClient === undefined || sessionToken === undefined) {
      toast.success(mode === 'create' ? 'Đã mô phỏng tạo sản phẩm.' : 'Đã mô phỏng cập nhật sản phẩm.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);
    const payload = {
      productCode: form.productCode,
      name: form.name,
      sku: form.sku,
      barcode: form.barcode.trim() || undefined,
      defaultUnitId: form.defaultUnitId,
      unitPriceVnd: Math.round(parsedPrice),
      productType: form.productType,
      inventoryMode: form.inventoryMode,
      lotTracking: form.lotTracking,
      serialTracking: form.serialTracking,
    };
    const result =
      mode === 'create'
        ? await apiClient.invoke<CatalogCreateProductResponse>({
            operation: 'catalog.product.create',
            requestId: createRequestId('catalog-create'),
            sessionToken,
            payload,
          })
        : await apiClient.invoke<CatalogUpdateProductResponse>({
            operation: 'catalog.product.update',
            requestId: createRequestId('catalog-update'),
            sessionToken,
            payload: {
              productId: selectedItem?.productId,
              productCode: form.productCode,
              name: form.name,
              productType: form.productType,
              sku: form.sku,
              barcode: form.barcode.trim() || undefined,
              defaultUnitId: form.defaultUnitId,
              inventoryMode: form.inventoryMode,
              unitPriceVnd: Math.round(parsedPrice),
              lotTracking: form.lotTracking,
              serialTracking: form.serialTracking,
            },
          });

    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    toast.success(mode === 'create' ? 'Đã tạo sản phẩm.' : 'Đã cập nhật sản phẩm.');
    await refreshProducts();
    if (mode === 'create') {
      setSelectedVariantId(result.data.defaultVariant.variantId);
      setMode('edit');
    }
  }

  async function submitVariant() {
    const productId = selectedItem?.productId;
    if (productId === undefined) {
      setErrorMessage('Chọn một product trước khi tạo biến thể.');
      return;
    }
    const parsedPrice = Number(variantForm.unitPriceVnd);
    const parsedFactor = Number(variantForm.unitFactor);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('Giá bán biến thể phải là số không âm.');
      return;
    }
    if (!Number.isFinite(parsedFactor) || parsedFactor <= 0) {
      setErrorMessage('Quy đổi đơn vị phải lớn hơn 0.');
      return;
    }
    if (apiClient === undefined || sessionToken === undefined) {
      toast.success(variantMode === 'create' ? 'Đã mô phỏng tạo biến thể.' : 'Đã mô phỏng cập nhật biến thể.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);
    const payload = {
      displayName: variantForm.displayName,
      sku: variantForm.sku,
      barcode: variantForm.barcode.trim() || undefined,
      defaultUnitId: variantForm.defaultUnitId,
      unitPriceVnd: Math.round(parsedPrice),
      inventoryMode: variantForm.inventoryMode,
      lotTracking: variantForm.lotTracking,
      serialTracking: variantForm.serialTracking,
      unitFactor: parsedFactor,
      saleEnabled: variantForm.saleEnabled,
      purchaseEnabled: variantForm.purchaseEnabled,
    };
    const result =
      variantMode === 'create'
        ? await apiClient.invoke<CatalogCreateVariantResponse>({
            operation: 'catalog.variant.create',
            requestId: createRequestId('catalog-variant-create'),
            sessionToken,
            payload: {
              productId,
              ...payload,
            },
          })
        : await apiClient.invoke<CatalogUpdateVariantResponse>({
            operation: 'catalog.variant.update',
            requestId: createRequestId('catalog-variant-update'),
            sessionToken,
            payload: {
              variantId: selectedItem?.variantId,
              ...payload,
            },
          });

    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    toast.success(variantMode === 'create' ? 'Đã tạo biến thể.' : 'Đã cập nhật biến thể.');
    await refreshProducts();
    setVariantMode('edit');
    setSelectedVariantId(result.data.variant.variantId);
  }

  async function toggleVariantActive(item: CatalogProductListItemDTO): Promise<boolean> {
    if (apiClient === undefined || sessionToken === undefined) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.variantId === item.variantId
            ? { ...candidate, isActive: !candidate.isActive }
            : candidate,
        ),
      );
      toast.success(item.isActive ? 'Đã ngừng bán biến thể.' : 'Đã kích hoạt biến thể.');
      return true;
    }

    setIsLoading(true);
    setErrorMessage(undefined);
    const result = await apiClient.invoke<CatalogSetVariantActiveResponse>({
      operation: 'catalog.variant.setActive',
      requestId: createRequestId('catalog-variant-active'),
      sessionToken,
      payload: {
        variantId: item.variantId,
        isActive: !item.isActive,
        reason: item.isActive ? 'Ngừng bán biến thể từ màn Hàng hóa' : undefined,
      },
    });
    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return false;
    }
    toast.success(item.isActive ? 'Đã ngừng bán biến thể.' : 'Đã kích hoạt biến thể.');
    await refreshProducts();
    return true;
  }

  if (isCustomerRoute) {
    return (
      <CustomerWorkspace
        apiClient={apiClient}
        initialCustomerItems={defaultCustomerItems}
        sessionToken={sessionToken}
      />
    );
  }

  return (
    <div className="cn-catalog-artifact">
      <p className="crumb">Hàng hóa / Danh mục</p>
      <header className="page-head">
        <div>
          <div className="title-line">
            <h1>Hàng hóa & biến thể</h1>
            <span className="product-summary">{filteredProductCount} sản phẩm</span>
          </div>
          <p>Quản lý thông tin sản phẩm gốc và biến thể giao dịch theo phạm vi kho hiện tại.</p>
        </div>
        <div className="head-actions">
          {hasActiveCatalogFilter ? (
            <button className="filter-chip header-filter-chip" onClick={clearCatalogFilters} type="button">
              × Xóa lọc
            </button>
          ) : null}
          <button
            aria-label="Làm mới danh sách hàng hóa"
            className={isRefreshingProducts ? 'button subtle icon-only refresh-loading' : 'button subtle icon-only'}
            disabled={isLoading}
            onClick={() => void refreshProducts()}
            type="button"
          >
            <AppIcon name="refresh" />
          </button>
          <button className="button subtle" onClick={() => openCatalogDialog('import', 'import')} type="button">
            <AppIcon name="fileAlert" />
            Nhập dữ liệu
          </button>
          <button className="button subtle" onClick={() => openCatalogDialog('export', 'export')} type="button">
            <AppIcon name="print" />
            Xuất dữ liệu
          </button>
          <button
            className="button primary"
            onClick={() => {
              setMode('create');
              setVariantMode('create');
              setForm(emptyForm);
              setVariantForm(emptyVariantForm);
              setSelectedVariantId(undefined);
              setInventoryEnabled(true);
              setTrackingMode('none');
              setFormulaValidation(false);
              openCatalogDialog('create', 'create');
            }}
            type="button"
          >
            <span aria-hidden="true">+</span>
            Thêm sản phẩm
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="Danh sách hàng hóa và biến thể">
        <div className="toolbar" aria-label="Bộ lọc hàng hóa">
          <label className="search">
            <span
              aria-hidden="true"
              className={isSearchingProducts ? 'search-icon search-icon-loading' : 'search-icon'}
            >
              ⌕
            </span>
            <input
              aria-label="Tìm kiếm hàng hóa"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên hàng, SKU, barcode hoặc mã hàng"
              value={query}
            />
          </label>
          <CatalogDesignListbox
            id="catalog-status-filter"
            onChange={(value) => setStatus(value as CatalogProductListStatus)}
            openListbox={openListbox}
            options={productStatuses}
            prefix="Trạng thái"
            setOpenListbox={setOpenListbox}
            value={status}
          />
          <CatalogDesignListbox
            id="catalog-type-filter"
            onChange={(value) => setProductTypeFilter(value as ProductType | 'All')}
            openListbox={openListbox}
            options={productTypeOptions}
            setOpenListbox={setOpenListbox}
            triggerLabel="Loại hàng"
            value={productTypeFilter}
          />
          <CatalogDesignListbox
            id="catalog-category-filter"
            onChange={setCategoryFilter}
            openListbox={openListbox}
            options={categoryOptions}
            setOpenListbox={setOpenListbox}
            triggerLabel="Nhóm hàng"
            value={categoryFilter}
          />
          <CatalogDesignListbox
            id="catalog-brand-filter"
            onChange={setBrandFilter}
            openListbox={openListbox}
            options={brandOptions}
            setOpenListbox={setOpenListbox}
            triggerLabel="Thương hiệu"
            value={brandFilter}
          />
          <button className="button subtle filter-mobile" type="button">
            Bộ lọc
          </button>
        </div>

        {showProductLoadingSkeleton ? (
          <div className="state active" id="loading-state">
            <SkeletonTable columns={6} label="Đang tải danh sách hàng hóa" rows={6} />
          </div>
        ) : (
          <div className={filteredItems.length > 0 ? 'state active' : 'state'} id="ready-state">
            <CatalogProductsTable
              groups={groupedItems}
              onOpenMenu={openRowMenu}
              onSelect={(item) => {
                setSelectedVariantId(item.variantId);
                setDrawerTab('overview');
                openCatalogDialog('detail', 'detail');
              }}
            />
            <CatalogMobileList
              items={filteredItems}
              onOpenMenu={openRowMenu}
              onSelect={(item) => {
                setSelectedVariantId(item.variantId);
                setDrawerTab('overview');
                openCatalogDialog('detail', 'detail');
              }}
            />
          </div>
        )}
        <div className={!showProductLoadingSkeleton && filteredItems.length === 0 ? 'state empty active' : 'state empty'} id="no-result">
          Không tìm thấy hàng hóa phù hợp với bộ lọc hiện tại.
        </div>
      </section>

      <div
        className={isBackdropOpen ? 'backdrop show' : 'backdrop'}
        onClick={() => {
          if (isBundleFormulaOpen) {
            setIsBundleFormulaOpen(false);
            setFormulaValidation(false);
            writeCatalogHash(activeDialog === 'edit' ? 'edit' : 'create');
            return;
          }
          closeCatalogOverlay();
        }}
      />

      <CatalogDetailDrawer
        drawerTab={drawerTab}
        isOpen={activeDialog === 'detail'}
        item={selectedItem}
        productItems={selectedProductItems}
        selectedProductVariantCount={selectedProductVariantCount}
        onClose={closeCatalogOverlay}
        onEdit={() => {
          setMode('edit');
          setVariantMode('edit');
          openCatalogDialog('edit', 'edit');
        }}
        onTabChange={setDrawerTab}
      />

      <CatalogRowMenu
        item={selectedItem}
        isOpen={activeDialog === 'row-menu'}
        position={rowMenuPosition}
        onClose={closeCatalogOverlay}
        onDeactivate={() => openCatalogDialog('deactivate', 'deactivate-confirm')}
        onDuplicate={() => {
          if (selectedItem !== undefined) {
            setMode('create');
            setVariantMode('create');
            setForm({ ...formFromItem(selectedItem), productCode: '', sku: `${selectedItem.sku}-COPY` });
            setVariantForm({ ...variantFormFromItem(selectedItem), sku: `${selectedItem.sku}-COPY` });
            openCatalogDialog('create', 'create');
          }
        }}
        onEdit={() => {
          setMode('edit');
          setVariantMode('edit');
          openCatalogDialog('edit', 'edit');
        }}
        onView={() => {
          setDrawerTab('overview');
          openCatalogDialog('detail', 'detail');
        }}
      />

      <CatalogLifecycleDialog
        item={selectedItem}
        isLoading={isLoading}
        isOpen={activeDialog === 'deactivate'}
        onClose={closeCatalogOverlay}
        onConfirm={async () => {
          if (selectedItem === undefined) return;
          const ok = await toggleVariantActive(selectedItem);
          if (ok) closeCatalogOverlay();
        }}
      />

      <CatalogProductDialog
        form={form}
        inventoryEnabled={inventoryEnabled}
        isLoading={isLoading}
        isOpen={activeDialog === 'create' || activeDialog === 'edit'}
        mode={mode}
        openListbox={openListbox}
        setOpenListbox={setOpenListbox}
        trackingMode={trackingMode}
        variantForm={variantForm}
        onClose={closeCatalogOverlay}
        onFormChange={setForm}
        onInventoryEnabledChange={setInventoryEnabled}
        onOpenBundleFormula={() => {
          setFormulaValidation(false);
          setIsBundleFormulaOpen(true);
          writeCatalogHash('bundle-formula');
        }}
        onProductTypeChange={(productType) => {
          const nextInventoryMode = defaultInventoryModeForProductType(productType);
          setForm((current) => ({
            ...current,
            productType,
            inventoryMode: nextInventoryMode,
          }));
          setVariantForm((current) => ({
            ...current,
            inventoryMode: nextInventoryMode,
          }));
          setInventoryEnabled(nextInventoryMode === 'Tracked');
          setTrackingMode('none');
          if (productType !== 'Bundle') setIsBundleFormulaOpen(false);
        }}
        onSaveProduct={() => void submitProduct()}
        onSaveVariant={() => void submitVariant()}
        onTrackingModeChange={(nextTrackingMode) => {
          setTrackingMode(nextTrackingMode);
          const next = trackingFlagsFromMode(nextTrackingMode);
          setForm((current) => ({ ...current, ...next }));
          setVariantForm((current) => ({ ...current, ...next }));
        }}
        onVariantFormChange={setVariantForm}
      />

      <CatalogBundleFormulaDialog
        hasValidation={formulaValidation}
        isLoading={isLoading}
        isOpen={isBundleFormulaOpen}
        onClose={() => {
          setFormulaValidation(false);
          setIsBundleFormulaOpen(false);
          writeCatalogHash(mode === 'edit' ? 'edit' : 'create');
        }}
        onValidationChange={(nextValidation) => {
          setFormulaValidation(nextValidation);
          if (nextValidation) writeCatalogHash('bundle-formula-validation');
        }}
        onSaved={() => {
          setFormulaValidation(false);
          setIsBundleFormulaOpen(false);
          writeCatalogHash(mode === 'edit' ? 'edit' : 'create');
        }}
      />

      <CatalogImportWizard
        importState={importState}
        isLoading={isLoading}
        isOpen={activeDialog === 'import'}
        onClose={closeCatalogOverlay}
        onStateChange={(nextState) => {
          setImportState(nextState);
          writeCatalogHash(nextState);
        }}
      />

      <CatalogExportDialog
        isLoading={isLoading}
        isOpen={activeDialog === 'export'}
        productCount={filteredProductCount}
        onClose={closeCatalogOverlay}
      />
    </div>
  );
}

function CatalogDesignListbox(props: {
  id: string;
  value: string;
  options: readonly { value: string; label: string; description?: string }[];
  openListbox: string | undefined;
  setOpenListbox(value: string | undefined): void;
  onChange(value: string): void;
  prefix?: string;
  triggerLabel?: string;
  className?: string;
}) {
  const selectedOption = props.options.find((option) => option.value === props.value) ?? props.options[0];
  const isOpen = props.openListbox === props.id;
  const triggerText = selectedOption?.label ?? props.triggerLabel ?? props.prefix ?? props.value;

  return (
    <div className={`listbox ${props.className ?? ''}`.trim()}>
      <button
        aria-controls={props.id}
        aria-expanded={isOpen}
        className="listbox-trigger"
        onClick={() => props.setOpenListbox(isOpen ? undefined : props.id)}
        type="button"
      >
        <span>{triggerText}</span>
        <AppIcon name="chevronDown" />
      </button>
      <div className="listbox-popover" hidden={!isOpen} id={props.id} role="listbox">
        {props.options.map((option) => (
          <button
            aria-selected={option.value === props.value}
            className="listbox-option"
            key={option.value}
            onClick={() => {
              props.onChange(option.value);
              props.setOpenListbox(undefined);
            }}
            role="option"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CatalogProductsTable(props: {
  groups: readonly CatalogProductGroup[];
  onOpenMenu(item: CatalogProductListItemDTO, anchor: HTMLElement): void;
  onSelect(item: CatalogProductListItemDTO): void;
}) {
  return (
    <div className="table-wrap">
      <table className="products-table">
        <thead>
          <tr>
            <th>Hàng hóa / biến thể</th>
            <th>SKU / barcode</th>
            <th>Giá bán</th>
            <th>Tồn khả dụng</th>
            <th>Đơn vị</th>
            <th>Theo dõi</th>
            <th>Trạng thái</th>
            <th aria-label="Thao tác" />
          </tr>
        </thead>
        <tbody>
          {props.groups.map((group) => (
            <Fragment key={group.productId}>
              <tr className="product-row">
                <td colSpan={8}>
                  <span className="product-name">{group.productName}</span>
                  <span className="sku">
                    {' '}
                    · {variantSummary(group.variants.length)}
                  </span>
                </td>
              </tr>
              {group.variants.map((item, index) => (
                <tr data-row="" key={item.variantId} onClick={() => props.onSelect(item)}>
                  <td className="indent">
                    <span className="variant-name">{index === 0 ? item.displayName : item.displayName}</span>
                  </td>
                  <td>
                    <div className="sku">{item.sku}</div>
                    <div className="sku">{item.barcode ?? 'Chưa có barcode'}</div>
                  </td>
                  <td className="num">{formatVnd(item.unitPriceVnd)}</td>
                  <td>{renderAvailability(item)}</td>
                  <td>{unitLabel(item.defaultUnitId)}</td>
                  <td>
                    <span className="tracking">{trackingLabel(item)}</span>
                  </td>
                  <td>
                    <span className={item.isActive ? 'status success' : 'status muted'}>
                      {item.isActive ? 'Đang bán' : 'Ngừng bán'}
                    </span>
                  </td>
                  <td>
                    <button
                      aria-label={`Mở menu thao tác ${item.sku}`}
                      className="row-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onOpenMenu(item, event.currentTarget);
                      }}
                      type="button"
                    >
                      ...
                    </button>
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CatalogMobileList(props: {
  items: readonly CatalogProductListItemDTO[];
  onOpenMenu(item: CatalogProductListItemDTO, anchor: HTMLElement): void;
  onSelect(item: CatalogProductListItemDTO): void;
}) {
  return (
    <div className="mobile-list" aria-label="Danh sách hàng hóa mobile">
      {props.items.map((item) => (
        <article className="product-card" key={item.variantId} onClick={() => props.onSelect(item)}>
          <div className="card-top">
            <div>
              <div className="card-title">{item.displayName}</div>
              <div className="sku">{item.sku}</div>
            </div>
            <button
              aria-label={`Mở menu thao tác ${item.sku}`}
              className="row-action"
              onClick={(event) => {
                event.stopPropagation();
                props.onOpenMenu(item, event.currentTarget);
              }}
              type="button"
            >
              ...
            </button>
          </div>
          <div className="card-meta">
            <span>
              <b>Barcode</b>
              {item.barcode ?? 'Chưa có'}
            </span>
            <span>
              <b>Giá bán</b>
              {formatVnd(item.unitPriceVnd)}
            </span>
            <span>
              <b>Theo dõi</b>
              {trackingLabel(item)}
            </span>
            <span>
              <b>Trạng thái</b>
              {item.isActive ? 'Đang bán' : 'Ngừng bán'}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function CatalogDetailDrawer(props: {
  drawerTab: DrawerTab;
  isOpen: boolean;
  item?: CatalogProductListItemDTO;
  productItems: readonly CatalogProductListItemDTO[];
  selectedProductVariantCount: number;
  onClose(): void;
  onEdit(): void;
  onTabChange(tab: DrawerTab): void;
}) {
  const item = props.item;
  const tabs: readonly { value: DrawerTab; label: string }[] = [
    { value: 'overview', label: 'Tổng quan' },
    { value: 'variants', label: 'Biến thể' },
    { value: 'units', label: 'Đơn vị & barcode' },
    { value: 'inventory', label: 'Thiết lập tồn' },
  ];

  return (
    <aside
      aria-hidden={!props.isOpen}
      aria-modal={props.isOpen ? 'true' : undefined}
      className={props.isOpen ? 'drawer open' : 'drawer'}
      role={props.isOpen ? 'dialog' : undefined}
    >
      <header className="drawer-head">
        <div>
          <h2>{item?.productName ?? 'Chưa chọn sản phẩm'}</h2>
          <p>
            Sản phẩm gốc · Biến thể mặc định {item?.sku ?? 'chưa xác định'}
          </p>
        </div>
        <button aria-label="Đóng drawer chi tiết" className="close" onClick={props.onClose} type="button">
          <AppIcon name="close" />
        </button>
      </header>
      <div className="drawer-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={props.drawerTab === tab.value}
            className={props.drawerTab === tab.value ? 'drawer-tab active' : 'drawer-tab'}
            key={tab.value}
            onClick={() => props.onTabChange(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="drawer-body">
        <section className={props.drawerTab === 'overview' ? 'drawer-panel active' : 'drawer-panel'}>
          <Definition label="Mã sản phẩm" value={item?.productCode ?? '—'} />
          <Definition label="Nhóm hàng" value={categoryLabel(item?.categoryId)} />
          <Definition label="Thương hiệu" value={brandLabel(item?.brandId)} />
          <Definition label="Loại hàng" value={item === undefined ? '—' : productTypeLabel(item.productType)} />
          <Definition label="Trạng thái bán" value={item?.isActive === false ? 'Ngừng bán' : 'Đang bán'} />
          <div className="drawer-note">
            <AppIcon name="warning" />
            Không hard-delete sản phẩm/biến thể đã có khả năng phát sinh chứng từ.
          </div>
        </section>
        <section className={props.drawerTab === 'variants' ? 'drawer-panel active' : 'drawer-panel'}>
          <table className="variant-table">
            <tbody>
              {props.productItems.map((variant) => (
                <tr key={variant.variantId}>
                  <td>
                    <strong>{variant.displayName}</strong>
                    <div className="sku">{variant.sku}</div>
                  </td>
                  <td className="num">{formatVnd(variant.unitPriceVnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="field-helper">{props.selectedProductVariantCount} variant thuộc product đang chọn.</p>
        </section>
        <section className={props.drawerTab === 'units' ? 'drawer-panel active' : 'drawer-panel'}>
          <Definition label="Đơn vị bán" value={unitLabel(item?.defaultUnitId)} />
          <Definition label="Barcode" value={item?.barcode ?? 'Chưa có'} />
          <Definition label="SKU" value={item?.sku ?? '—'} />
        </section>
        <section className={props.drawerTab === 'inventory' ? 'drawer-panel active' : 'drawer-panel'}>
          <Definition label="Tồn khả dụng" value={availabilityText(item)} />
          <Definition label="Phương thức theo dõi" value={item === undefined ? '—' : trackingLabel(item)} />
          <Definition label="Quản lý tồn" value={item?.inventoryMode === 'Tracked' ? 'Bật' : 'Tắt'} />
        </section>
      </div>
      <footer className="drawer-actionbar">
        <button className="button primary" onClick={props.onEdit} type="button">
          Sửa biến thể
        </button>
      </footer>
    </aside>
  );
}

function Definition(props: { label: string; value: string }) {
  return (
    <div className="definition">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function CatalogRowMenu(props: {
  isOpen: boolean;
  item?: CatalogProductListItemDTO;
  position?: RowMenuPosition;
  onClose(): void;
  onDeactivate(): void;
  onDuplicate(): void;
  onEdit(): void;
  onView(): void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { isOpen, onClose } = props;

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div
      aria-hidden={!props.isOpen}
      className={props.isOpen ? 'menu open' : 'menu'}
      hidden={!props.isOpen}
      ref={menuRef}
      role="menu"
      style={
        props.position === undefined
          ? undefined
          : ({
              '--catalog-row-menu-left': `${props.position.left}px`,
              '--catalog-row-menu-right': 'auto',
              '--catalog-row-menu-top': `${props.position.top}px`,
            } as CSSProperties)
      }
    >
      <button onClick={props.onView} role="menuitem" type="button">
        Xem chi tiết
      </button>
      <button onClick={props.onEdit} role="menuitem" type="button">
        Sửa biến thể
      </button>
      <button onClick={props.onDuplicate} role="menuitem" type="button">
        Sao chép
      </button>
      <div className="separator" />
      <button
        className={props.item?.isActive === false ? undefined : 'attention'}
        onClick={props.onDeactivate}
        role="menuitem"
        type="button"
      >
        {props.item?.isActive === false ? 'Mở bán lại' : 'Ngừng bán'}
      </button>
    </div>
  );
}

function CatalogLifecycleDialog(props: {
  isOpen: boolean;
  isLoading: boolean;
  item?: CatalogProductListItemDTO;
  onClose(): void;
  onConfirm(): void;
}) {
  const isDeactivate = props.item?.isActive !== false;

  return (
    <section
      aria-hidden={!props.isOpen}
      aria-modal={props.isOpen ? 'true' : undefined}
      className={props.isOpen ? 'modal utility open' : 'modal utility'}
      hidden={!props.isOpen}
      role={props.isOpen ? 'dialog' : undefined}
    >
      <header className="modal-head">
        <div>
          <h2>{isDeactivate ? 'Ngừng bán biến thể' : 'Mở bán lại biến thể'}</h2>
          <p>
            {isDeactivate
              ? 'Thao tác này không xóa dữ liệu lịch sử và chỉ ngăn chọn biến thể cho giao dịch mới.'
              : 'Biến thể sẽ xuất hiện lại trong luồng bán hàng nếu backend xác nhận quyền và trạng thái hợp lệ.'}
          </p>
        </div>
      </header>
      <div className="modal-body confirm-copy">
        <strong>{props.item?.displayName ?? 'Biến thể đang chọn'}</strong>
        <p>{props.item?.sku ?? 'SKU chưa xác định'}</p>
      </div>
      <footer className="modal-foot">
        <button className="button" disabled={props.isLoading} onClick={props.onClose} type="button">
          Hủy
        </button>
        <button
          aria-busy={props.isLoading || undefined}
          className="button primary"
          disabled={props.isLoading}
          onClick={props.onConfirm}
          type="button"
        >
          {props.isLoading ? <span aria-hidden="true" className="cn-spinner" /> : null}
          Xác nhận
        </button>
      </footer>
    </section>
  );
}

function CatalogProductDialog(props: {
  form: ProductFormState;
  inventoryEnabled: boolean;
  isLoading: boolean;
  isOpen: boolean;
  mode: 'create' | 'edit';
  openListbox: string | undefined;
  setOpenListbox(value: string | undefined): void;
  trackingMode: TrackingMode;
  variantForm: VariantFormState;
  onClose(): void;
  onFormChange(updater: ProductFormState | ((current: ProductFormState) => ProductFormState)): void;
  onInventoryEnabledChange(value: boolean): void;
  onOpenBundleFormula(): void;
  onProductTypeChange(productType: ProductType): void;
  onSaveProduct(): void;
  onSaveVariant(): void;
  onTrackingModeChange(mode: TrackingMode): void;
  onVariantFormChange(updater: VariantFormState | ((current: VariantFormState) => VariantFormState)): void;
}) {
  const form = props.form;
  const variantForm = props.variantForm;

  return (
    <section
      aria-hidden={!props.isOpen}
      aria-modal={props.isOpen ? 'true' : undefined}
      className={props.isOpen ? 'modal wide open' : 'modal wide'}
      hidden={!props.isOpen}
      role={props.isOpen ? 'dialog' : undefined}
    >
      <header className="modal-head">
        <div>
          <h2>{props.mode === 'create' ? 'Thêm sản phẩm' : 'Sửa biến thể'}</h2>
          <p>Tạo thông tin sản phẩm và biến thể mặc định dùng cho SKU, giá, tồn và barcode.</p>
        </div>
        <button aria-label="Đóng modal sản phẩm" className="close" onClick={props.onClose} type="button">
          <AppIcon name="close" />
        </button>
      </header>
      <div className="steps" aria-label="Các bước nhập sản phẩm">
        <span className="step active">1 · Thông tin sản phẩm</span>
        <span className="step">2 · Biến thể mặc định</span>
      </div>
      <div className="modal-body">
        <section className="form-section">
          <div className="section-title">
            <div>
              <h3>Thông tin sản phẩm</h3>
              <p>Product là mô tả gốc; variant mới là đơn vị giao dịch.</p>
            </div>
            <span>* Bắt buộc</span>
          </div>
          <div className="form-grid">
            <Field label="Mã hàng *">
              <input
                className="input"
                onChange={(event) => props.onFormChange((current) => ({ ...current, productCode: event.target.value }))}
                value={form.productCode}
              />
            </Field>
            <Field label="Tên sản phẩm *">
              <input
                className="input"
                onChange={(event) => props.onFormChange((current) => ({ ...current, name: event.target.value }))}
                value={form.name}
              />
            </Field>
            <div className="field">
              <label>Loại hàng *</label>
              <CatalogDesignListbox
                className="product-type-listbox"
                id="dialog-product-type"
                onChange={(value) => props.onProductTypeChange(value as ProductType)}
                openListbox={props.openListbox}
                options={productTypeOptions.filter((option) => option.value !== 'All')}
                setOpenListbox={props.setOpenListbox}
                triggerLabel={productTypeLabel(form.productType)}
                value={form.productType}
              />
            </div>
            <div className="field">
              <label>Nhóm hàng *</label>
              <CatalogDesignListbox
                id="dialog-category"
                onChange={() => undefined}
                openListbox={props.openListbox}
                options={categoryOptions}
                setOpenListbox={props.setOpenListbox}
                triggerLabel="Thực phẩm & đồ uống"
                value="food"
              />
            </div>
            <Field label="Thương hiệu">
              <input className="input" placeholder="Hàng nội bộ" />
            </Field>
            <div className="type-context">
              <ProductTypePanel
                form={form}
                inventoryEnabled={props.inventoryEnabled}
                openListbox={props.openListbox}
                setOpenListbox={props.setOpenListbox}
                trackingMode={props.trackingMode}
                onFormChange={props.onFormChange}
                onInventoryEnabledChange={props.onInventoryEnabledChange}
                onOpenBundleFormula={props.onOpenBundleFormula}
                onTrackingModeChange={props.onTrackingModeChange}
                onVariantFormChange={props.onVariantFormChange}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-title">
            <div>
              <h3>Biến thể mặc định</h3>
              <p>SKU, barcode, đơn vị và giá bán được ghi ở cấp variant.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="SKU *">
              <input
                className="input"
                onChange={(event) => props.onFormChange((current) => ({ ...current, sku: event.target.value }))}
                value={form.sku}
              />
            </Field>
            <Field label="Tên biến thể *">
              <input
                className="input"
                onChange={(event) =>
                  props.onVariantFormChange((current) => ({ ...current, displayName: event.target.value }))
                }
                value={variantForm.displayName}
              />
            </Field>
            <Field label="Đơn vị *">
              <input
                className="input"
                onChange={(event) => props.onFormChange((current) => ({ ...current, defaultUnitId: event.target.value }))}
                value={form.defaultUnitId}
              />
            </Field>
            <Field label="Giá bán">
              <input
                className="input num"
                inputMode="numeric"
                onChange={(event) => props.onFormChange((current) => ({ ...current, unitPriceVnd: event.target.value }))}
                value={form.unitPriceVnd}
              />
            </Field>
            <Field label="Barcode">
              <input
                className="input"
                onChange={(event) => props.onFormChange((current) => ({ ...current, barcode: event.target.value }))}
                value={form.barcode}
              />
            </Field>
            <Field label="Quy đổi về đơn vị gốc">
              <input
                className="input num"
                inputMode="decimal"
                onChange={(event) =>
                  props.onVariantFormChange((current) => ({ ...current, unitFactor: event.target.value }))
                }
                value={variantForm.unitFactor}
              />
            </Field>
          </div>
          <p className="validation show" hidden>
            <AppIcon name="warning" />
            SKU hoặc barcode đã tồn tại trong Catalog.
          </p>
        </section>
      </div>
      <footer className="modal-foot">
        <button className="button" onClick={props.onClose} type="button">
          Hủy
        </button>
        {props.mode === 'edit' ? (
          <button className="button primary" disabled={props.isLoading} onClick={props.onSaveVariant} type="button">
            Lưu biến thể
          </button>
        ) : (
          <button className="button primary" disabled={props.isLoading} onClick={props.onSaveProduct} type="button">
            Lưu sản phẩm
          </button>
        )}
      </footer>
    </section>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{props.label}</label>
      {props.children}
    </div>
  );
}

function ProductTypePanel(props: {
  form: ProductFormState;
  inventoryEnabled: boolean;
  openListbox: string | undefined;
  setOpenListbox(value: string | undefined): void;
  trackingMode: TrackingMode;
  onFormChange(updater: ProductFormState | ((current: ProductFormState) => ProductFormState)): void;
  onInventoryEnabledChange(value: boolean): void;
  onOpenBundleFormula(): void;
  onTrackingModeChange(mode: TrackingMode): void;
  onVariantFormChange(updater: VariantFormState | ((current: VariantFormState) => VariantFormState)): void;
}) {
  return (
    <>
      <section className={props.form.productType === 'Stocked' ? 'type-panel active' : 'type-panel'}>
        <div className="type-panel-head stocked-panel-head">
          <div>
            <div className="stocked-title-row">
              <h4>Thiết lập tồn kho</h4>
              <span className="status info">Hàng tồn</span>
            </div>
            <p>Bật quản lý tồn để thiết lập mức tồn và cách theo dõi hàng hóa.</p>
          </div>
          <div className="inventory-header-control">
            <span className="setting-label">Quản lý tồn</span>
            <button
              aria-checked={props.inventoryEnabled}
              aria-label="Quản lý tồn"
              className="switch"
              onClick={() => {
                const nextEnabled = !props.inventoryEnabled;
                props.onInventoryEnabledChange(nextEnabled);
                props.onFormChange((current) => ({ ...current, inventoryMode: nextEnabled ? 'Tracked' : 'NotTracked' }));
                props.onVariantFormChange((current) => ({
                  ...current,
                  inventoryMode: nextEnabled ? 'Tracked' : 'NotTracked',
                }));
              }}
              role="switch"
              type="button"
            />
          </div>
        </div>
        <p className={props.inventoryEnabled ? 'inventory-disabled-note' : 'inventory-disabled-note show'}>
          Bật quản lý tồn để thiết lập mức tồn và cách theo dõi hàng hóa.
        </p>
        <div className="form-grid inventory-config" hidden={!props.inventoryEnabled}>
          <Field label="Tồn tối thiểu">
            <input className="input num" inputMode="decimal" placeholder="0" />
          </Field>
          <div className="field inventory-track-field">
            <label>Phương thức theo dõi hàng hóa</label>
            <CatalogTrackingListbox
              onChange={props.onTrackingModeChange}
              openListbox={props.openListbox}
              setOpenListbox={props.setOpenListbox}
              value={props.trackingMode}
            />
          </div>
        </div>
      </section>
      <section className={props.form.productType === 'Service' ? 'type-panel active' : 'type-panel'}>
        <div className="type-panel-head">
          <div>
            <h4>Thiết lập dịch vụ</h4>
            <p>Dịch vụ không kiểm tồn kho khi bán; vẫn snapshot giá/thuế trên đơn.</p>
          </div>
          <span className="status info">Dịch vụ</span>
        </div>
      </section>
      <section className={props.form.productType === 'NonStock' ? 'type-panel active' : 'type-panel'}>
        <div className="type-panel-head">
          <div>
            <h4>Thiết lập không tồn</h4>
            <p>Không quản lý tồn; POS không kiểm tồn nhưng vẫn ghi nhận SKU, barcode và giá bán.</p>
          </div>
          <span className="status muted">Không tồn</span>
        </div>
      </section>
      <section className={props.form.productType === 'Bundle' ? 'type-panel active' : 'type-panel'}>
        <div className="type-panel-head">
          <div>
            <h4>Công thức bộ sản phẩm</h4>
            <p>Bộ sản phẩm không quản lý tồn thành phẩm riêng; khi bán sẽ trừ tồn các thành phần theo công thức.</p>
          </div>
          <span className="status warning">Chưa cấu hình</span>
        </div>
        <div className="bundle-warning">
          <AppIcon name="warning" />
          Cần cấu hình công thức bộ sản phẩm trước khi mở bán.
        </div>
        <button className="button subtle" onClick={props.onOpenBundleFormula} type="button">
          Cấu hình công thức bộ sản phẩm
        </button>
      </section>
    </>
  );
}

function CatalogTrackingListbox(props: {
  value: TrackingMode;
  openListbox: string | undefined;
  setOpenListbox(value: string | undefined): void;
  onChange(value: TrackingMode): void;
}) {
  const isOpen = props.openListbox === 'dialog-tracking';
  const selectedOption = trackingOptions.find((option) => option.value === props.value) ?? trackingOptions[0];

  return (
    <div className="listbox tracking-listbox">
      <button
        aria-controls="dialog-tracking"
        aria-expanded={isOpen}
        className="listbox-trigger"
        onClick={() => props.setOpenListbox(isOpen ? undefined : 'dialog-tracking')}
        type="button"
      >
        <span>{selectedOption.label}</span>
        <AppIcon name="chevronDown" />
      </button>
      <div className="listbox-popover tracking-popover" hidden={!isOpen} id="dialog-tracking" role="listbox">
        {trackingOptions.map((option) => (
          <button
            aria-checked={option.value === props.value}
            className="radio-option"
            key={option.value}
            onClick={() => {
              props.onChange(option.value);
              props.setOpenListbox(undefined);
            }}
            role="option"
            type="button"
          >
            <span className="radio-mark" />
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CatalogBundleFormulaDialog(props: {
  hasValidation: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onClose(): void;
  onSaved(): void;
  onValidationChange(value: boolean): void;
}) {
  const [components, setComponents] = useState<readonly BundleFormulaComponent[]>([
    {
      id: 'component-1',
      name: 'Sữa hạt óc chó 1L',
      sku: 'SH-OC-1L',
      unit: 'Thùng',
      quantity: '1',
    },
  ]);
  const [saveMessage, setSaveMessage] = useState('1 thành phần · Có hiệu lực từ ngày đã chọn.');

  const hasInvalidComponent =
    components.length === 0 ||
    components.some((component) => component.name.trim() === '' || Number(component.quantity) <= 0);

  return (
    <section
      aria-hidden={!props.isOpen}
      aria-modal={props.isOpen ? 'true' : undefined}
      className={props.isOpen ? 'modal utility formula-modal open' : 'modal utility formula-modal'}
      hidden={!props.isOpen}
      role={props.isOpen ? 'dialog' : undefined}
    >
      <header className="modal-head">
        <div>
          <h2>Cấu hình công thức bộ sản phẩm</h2>
          <p>Chọn các variant thành phần và số lượng trừ tồn khi bán một bộ.</p>
        </div>
        <button aria-label="Đóng công thức bộ sản phẩm" className="close" onClick={props.onClose} type="button">
          <AppIcon name="close" />
        </button>
      </header>
      <div className="modal-body">
        <div className="formula-intro">
          <div>
            <b>Hiệu lực từ</b>
            <input className="input" defaultValue="2026-08-03" type="date" />
          </div>
          <span className="status warning">Trạng thái công thức: Nháp</span>
        </div>
        {components.length > 0 ? (
          <div className="formula-table-wrap">
            <table className="formula-table">
              <thead>
                <tr>
                  <th>Thành phần</th>
                  <th>SKU</th>
                  <th>Đơn vị cơ bản</th>
                  <th>Số lượng</th>
                  <th aria-label="Xóa" />
                </tr>
              </thead>
              <tbody>
                {components.map((component) => (
                  <tr key={component.id}>
                    <td>
                      <div className="formula-combobox">
                        <input
                          className="input"
                          onChange={(event) =>
                            setComponents((current) =>
                              current.map((candidate) =>
                                candidate.id === component.id
                                  ? { ...candidate, name: event.target.value }
                                  : candidate,
                              ),
                            )
                          }
                          value={component.name}
                        />
                        <div className="formula-suggestions" hidden>
                          <button type="button">Sữa hạt óc chó 1L · SH-OC-1L</button>
                          <button type="button">Túi quà Cenio · TQ-CENIO</button>
                        </div>
                      </div>
                    </td>
                    <td className="sku">{component.sku}</td>
                    <td>{component.unit}</td>
                    <td>
                      <input
                        className="input num"
                        inputMode="decimal"
                        onChange={(event) =>
                          setComponents((current) =>
                            current.map((candidate) =>
                              candidate.id === component.id
                                ? { ...candidate, quantity: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                        value={component.quantity}
                      />
                    </td>
                    <td>
                      <button
                        aria-label="Xóa thành phần"
                        className="row-action"
                        onClick={() =>
                          setComponents((current) => current.filter((candidate) => candidate.id !== component.id))
                        }
                        type="button"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="formula-empty">Chưa có thành phần trong công thức.</p>
        )}
        <p className={props.hasValidation ? 'validation show' : 'validation'}>
          <AppIcon name="warning" />
          Công thức phải có ít nhất một thành phần và số lượng phải lớn hơn 0.
        </p>
        <button
          className="button subtle"
          onClick={() => {
            props.onValidationChange(false);
            setComponents((current) => [
              ...current,
              {
                id: `component-${Date.now()}`,
                name: '',
                sku: 'Chưa chọn',
                unit: 'Cái',
                quantity: '1',
              },
            ]);
          }}
          type="button"
        >
          + Thêm thành phần
        </button>
        <div className="formula-summary">{saveMessage}</div>
      </div>
      <footer className="modal-foot">
        <button className="button" onClick={props.onClose} type="button">
          Hủy
        </button>
        <button
          className="button primary"
          disabled={props.isLoading}
          onClick={() => {
            if (hasInvalidComponent) {
              props.onValidationChange(true);
              return;
            }
            props.onValidationChange(false);
            setSaveMessage(`${components.length} thành phần · Có hiệu lực từ ngày đã chọn.`);
            props.onSaved();
          }}
          type="button"
        >
          Lưu công thức
        </button>
      </footer>
    </section>
  );
}

interface BundleFormulaComponent {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: string;
}

function CatalogImportWizard(props: {
  importState: ImportState;
  isOpen: boolean;
  isLoading: boolean;
  onClose(): void;
  onStateChange(state: ImportState): void;
}) {
  const nextState = importNextState(props.importState);

  return (
    <section
      aria-hidden={!props.isOpen}
      aria-modal={props.isOpen ? 'true' : undefined}
      className={props.isOpen ? 'modal wide import-modal open' : 'modal wide import-modal'}
      hidden={!props.isOpen}
      role={props.isOpen ? 'dialog' : undefined}
    >
      <header className="modal-head">
        <div>
          <h2>Nhập danh mục hàng hóa</h2>
          <p>Chỉ tạo mới. SKU hoặc barcode đã tồn tại sẽ được báo lỗi và không ghi đè.</p>
          <span className="sr-only">Nhập dữ liệu Catalog</span>
          <span className="sr-only">Tải báo cáo kết quả</span>
        </div>
        <button aria-label="Đóng wizard nhập dữ liệu" className="close" onClick={props.onClose} type="button">
          <AppIcon name="close" />
        </button>
      </header>
      <div className="import-stepper" aria-label="Import stepper">
        <span className={importStepClass(props.importState, 1)}>1. Chọn tệp</span>
        <span className={importStepClass(props.importState, 2)}>2. Kiểm tra</span>
        <span className={importStepClass(props.importState, 3)}>3. Xác nhận</span>
      </div>
      <div className="modal-body">
        <section className={props.importState === 'import' ? 'import-state active' : 'import-state'}>
          <div className="import-guard">Chỉ tạo mới. SKU hoặc barcode đã tồn tại sẽ được báo lỗi và không ghi đè.</div>
          <div className="import-file-head">
            <button className="button subtle" type="button">
              Tải file mẫu
            </button>
            <span>CSV/XLSX · Chỉ Catalog</span>
          </div>
          <div className="import-dropzone" role="button" tabIndex={0}>
            <AppIcon name="fileAlert" />
            <b>Chọn hoặc thả tệp CSV/XLSX</b>
            <span>Tải file mẫu trước khi nhập để giữ đúng schema Catalog.</span>
          </div>
        </section>
        <section className={props.importState === 'import-validating' ? 'import-state active' : 'import-state'}>
          <StateBlock
            description="Batch đang được kiểm tra trước khi tạo mới. Catalog chưa thay đổi ở bước này."
            title="Kiểm tra staging nền"
            tone="neutral"
          />
          <div className="import-progress">
            <span />
          </div>
        </section>
        <section className={props.importState === 'import-validated' ? 'import-state active' : 'import-state'}>
          <ImportValidationPreview />
        </section>
        <section className={props.importState === 'import-confirm' ? 'import-state active' : 'import-state'}>
          <div className="import-summary">
            <b>Batch CAT-240802-07 có 2 dòng lỗi</b>
            <p>Chọn cách nhập phù hợp. Catalog chưa thay đổi ở bước này.</p>
          </div>
          <div className="import-mode">
            <label className="import-radio selected">
              <span className="radio-dot" />
              <span>
                <b>Chỉ nhập 98 dòng hợp lệ</b>
                <small>Các dòng lỗi được bỏ qua và có trong báo cáo kết quả.</small>
              </span>
            </label>
            <label className="import-radio disabled">
              <span className="radio-dot" />
              <span>
                <b>Nhập toàn bộ</b>
                <small>Đang bị vô hiệu hóa vì batch còn dòng lỗi.</small>
              </span>
            </label>
          </div>
        </section>
        <section className={props.importState === 'import-committing' ? 'import-state active' : 'import-state'}>
          <StateBlock
            description="Batch CAT-240802-07 đang ghi theo checkpoint. Bạn có thể đóng an toàn, không hủy commit."
            title="Đang ghi batch"
            tone="neutral"
          />
          <p className="import-batch-note">Commit đang chạy nền; không có thao tác hủy sau bước này.</p>
        </section>
        <section className={props.importState === 'import-completed' ? 'import-state active' : 'import-state'}>
          <div className="import-result">
            <h3>Import hoàn tất</h3>
            <div className="import-counts">
              <span>Committed 98</span>
              <span>Skipped 2</span>
              <span>Failed 0</span>
            </div>
          </div>
        </section>
        <section className={props.importState === 'import-failed' ? 'import-state active' : 'import-state'}>
          <StateBlock
            description="Lỗi retryable đã được sanitize. Batch ID: CAT-240802-07."
            title="Import thất bại"
            tone="danger"
          />
        </section>
        <section className={props.importState === 'import-restricted' ? 'import-state active' : 'import-state'}>
          <StateBlock
            description="Không hiển thị schema, file hoặc chi tiết batch cho người dùng thiếu quyền."
            title="Bạn chưa có quyền nhập dữ liệu Catalog"
            tone="restricted"
          />
        </section>
      </div>
      <footer className="modal-foot">
        <button className="button" onClick={props.onClose} type="button">
          {props.importState === 'import-confirm' ? 'Hủy batch' : 'Đóng'}
        </button>
        {props.importState === 'import-validated' || props.importState === 'import-completed' ? (
          <button className="button subtle" type="button">
            {props.importState === 'import-completed' ? 'Tải báo cáo kết quả' : 'Tải báo cáo lỗi'}
          </button>
        ) : null}
        {nextState !== undefined ? (
          <button
            className="button primary"
            disabled={props.isLoading}
            onClick={() => props.onStateChange(nextState)}
            type="button"
          >
            {importPrimaryLabel(props.importState)}
          </button>
        ) : null}
      </footer>
    </section>
  );
}

function ImportValidationPreview() {
  return (
    <>
      <div className="import-summary">
        <b>100 dòng · 98 hợp lệ · 2 lỗi</b>
        <p>2 dòng lỗi sẽ không được nhập. Kiểm tra từng dòng trước khi xác nhận.</p>
      </div>
      <div className="import-filter" role="group" aria-label="Lọc dòng import">
        <button className="active" type="button">
          Tất cả
        </button>
        <button type="button">Lỗi</button>
        <button type="button">Hợp lệ</button>
      </div>
      <div className="import-error-wrap">
        <table className="import-error-table">
          <thead>
            <tr>
              <th>Dòng</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>12</td>
              <td>SH-OC-1L</td>
              <td>8938501210012</td>
              <td>SKU hoặc barcode đã tồn tại.</td>
            </tr>
            <tr>
              <td>41</td>
              <td>AO-BASIC-BLACK-M</td>
              <td>—</td>
              <td>Trùng SKU trong batch.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="import-error-cards">
        <article>
          <b>Dòng 12 · SH-OC-1L</b>
          <span>SKU hoặc barcode đã tồn tại.</span>
        </article>
        <article>
          <b>Dòng 41 · AO-BASIC-BLACK-M</b>
          <span>Trùng SKU trong batch.</span>
        </article>
      </div>
    </>
  );
}

function CatalogExportDialog(props: {
  isOpen: boolean;
  isLoading: boolean;
  productCount: number;
  onClose(): void;
}) {
  return (
    <section
      aria-hidden={!props.isOpen}
      aria-modal={props.isOpen ? 'true' : undefined}
      className={props.isOpen ? 'modal utility open' : 'modal utility'}
      hidden={!props.isOpen}
      role={props.isOpen ? 'dialog' : undefined}
    >
      <header className="modal-head">
        <div>
          <h2>Xuất danh mục</h2>
          <p>Chi nhánh Nguyễn Trãi · Kho trung tâm · {props.productCount} sản phẩm hiển thị.</p>
        </div>
      </header>
      <div className="modal-body">
        <div className="import-groups">
          <div className="import-group">
            <b>Phạm vi</b>
            <button className="segmented active" type="button">
              Danh sách hiện tại
            </button>
            <button className="segmented" type="button">
              Tất cả theo filter
            </button>
            <button className="segmented" type="button">
              Tem barcode
            </button>
          </div>
          <div className="import-group">
            <b>Định dạng</b>
            <button className="segmented active" type="button">
              CSV
            </button>
            <button className="segmented" type="button">
              XLSX
            </button>
            <button className="segmented" type="button">
              PDF tem barcode
            </button>
          </div>
        </div>
        <p className="field-helper">Xuất danh mục theo filter hiện tại, toàn bộ theo filter hoặc tem barcode theo quyền.</p>
      </div>
      <footer className="modal-foot">
        <button className="button" onClick={props.onClose} type="button">
          Hủy
        </button>
        <button className="button primary" disabled={props.isLoading} type="button">
          Xuất danh mục
        </button>
      </footer>
    </section>
  );
}

function groupProductItems(items: readonly CatalogProductListItemDTO[]): readonly CatalogProductGroup[] {
  const groups = new Map<string, CatalogProductGroup>();
  for (const item of items) {
    const existing = groups.get(item.productId);
    if (existing === undefined) {
      groups.set(item.productId, {
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        productType: item.productType,
        variants: [item],
      });
      continue;
    }
    groups.set(item.productId, {
      ...existing,
      variants: [...existing.variants, item],
    });
  }
  return [...groups.values()];
}

function productTypeLabel(productType: ProductType): string {
  return productTypeOptions.find((option) => option.value === productType)?.label ?? productType;
}

function categoryLabel(categoryId: string | undefined): string {
  if (categoryId === undefined) return 'Chưa phân nhóm';
  return categoryOptions.find((option) => option.value === categoryId)?.label ?? categoryId;
}

function brandLabel(brandId: string | undefined): string {
  if (brandId === undefined) return 'Chưa gán thương hiệu';
  return brandOptions.find((option) => option.value === brandId)?.label ?? brandId;
}

function calculateRowMenuPosition(anchorRect: DOMRect): RowMenuPosition {
  const minLeft = catalogRowMenuViewportGapPx;
  const maxLeft = Math.max(minLeft, window.innerWidth - catalogRowMenuWidthPx - catalogRowMenuViewportGapPx);
  const left = clamp(anchorRect.right - catalogRowMenuWidthPx, minLeft, maxLeft);
  const topBelow = anchorRect.bottom + catalogRowMenuAnchorGapPx;
  const topAbove = anchorRect.top - catalogRowMenuHeightPx - catalogRowMenuAnchorGapPx;
  const fitsBelow =
    topBelow + catalogRowMenuHeightPx <= window.innerHeight - catalogRowMenuViewportGapPx;
  const top = fitsBelow ? topBelow : topAbove;
  const maxTop = Math.max(catalogRowMenuViewportGapPx, window.innerHeight - catalogRowMenuHeightPx - catalogRowMenuViewportGapPx);

  return {
    left,
    top: clamp(top, catalogRowMenuViewportGapPx, maxTop),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function variantSummary(count: number): string {
  if (count <= 1) return '1 biến thể mặc định';
  return `${count} biến thể màu / size`;
}

function unitLabel(value: string | undefined): string {
  if (value === undefined || value.trim() === '') return '—';
  const normalized = value.toLocaleLowerCase('vi-VN');
  if (normalized === 'chai') return 'Thùng';
  if (normalized === 'túi') return 'Túi';
  if (normalized === 'cái') return 'Cái';
  return value;
}

function renderAvailability(item: CatalogProductListItemDTO): ReactNode {
  if (item.inventoryMode !== 'Tracked') return <span className="status muted">Không kiểm tồn</span>;
  if (item.availableMilli === undefined) return <span className="num">—</span>;
  const text = `${formatQuantityMilli(item.availableMilli)} ${unitLabel(item.defaultUnitId).toLocaleLowerCase('vi-VN')}`;
  if (item.availableMilli <= 0) return <span className="status warning">! {text} · Hết tồn</span>;
  return <span className="num">{text}</span>;
}

function availabilityText(item: CatalogProductListItemDTO | undefined): string {
  if (item === undefined) return '—';
  if (item.inventoryMode !== 'Tracked') return 'Không kiểm tồn';
  if (item.availableMilli === undefined) return 'Chưa có projection tồn';
  return `${formatQuantityMilli(item.availableMilli)} ${unitLabel(item.defaultUnitId).toLocaleLowerCase('vi-VN')}`;
}

function formatQuantityMilli(quantityMilli: number): string {
  const value = quantityMilli / 1000;
  return Number.isInteger(value)
    ? value.toLocaleString('vi-VN')
    : value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}

function trackingLabel(item: Pick<CatalogProductListItemDTO, 'inventoryMode' | 'lotTracking' | 'serialTracking'>): string {
  if (item.inventoryMode === 'Bundle') return 'Theo công thức';
  if (item.lotTracking && item.serialTracking) return 'Lô · HSD · Serial';
  if (item.lotTracking) return 'Lô · HSD';
  if (item.serialTracking) return 'Serial';
  return 'Không theo dõi';
}

function importStepClass(importState: ImportState, step: 1 | 2 | 3): string {
  const currentStep = importStepNumber(importState);
  if (currentStep > step) return 'import-step done';
  if (currentStep === step) return 'import-step active';
  return 'import-step';
}

function importStepNumber(importState: ImportState): 1 | 2 | 3 {
  if (importState === 'import') return 1;
  if (importState === 'import-validating' || importState === 'import-validated') return 2;
  return 3;
}

function importNextState(importState: ImportState): ImportState | undefined {
  if (importState === 'import') return 'import-validating';
  if (importState === 'import-validated') return 'import-confirm';
  if (importState === 'import-confirm') return 'import-committing';
  if (importState === 'import-failed') return 'import-committing';
  return undefined;
}

function importPrimaryLabel(importState: ImportState): string {
  if (importState === 'import') return 'Kiểm tra tệp';
  if (importState === 'import-validating') return 'Xem kết quả';
  if (importState === 'import-validated') return 'Xác nhận nhập';
  if (importState === 'import-confirm') return 'Nhập 98 dòng hợp lệ';
  if (importState === 'import-committing') return 'Xem kết quả';
  if (importState === 'import-failed') return 'Thử lại';
  return 'Tiếp tục';
}

function CustomerWorkspace(props: {
  apiClient?: ApiClient;
  initialCustomerItems: readonly CustomerDTO[];
  sessionToken?: string;
}) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<readonly CustomerDTO[]>(props.initialCustomerItems);
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [duplicateWarnings, setDuplicateWarnings] =
    useState<readonly CustomerQuickCreateResponse['duplicateWarnings'][number][]>([]);

  useEffect(() => {
    if (errorMessage !== undefined) toast.danger(errorMessage);
  }, [errorMessage, toast]);

  async function searchCustomers(nextQuery = query) {
    const trimmedQuery = nextQuery.trim();
    if (trimmedQuery === '') {
      setCustomers(props.initialCustomerItems);
      setErrorMessage(undefined);
      return;
    }

    if (props.apiClient === undefined || props.sessionToken === undefined) {
      const normalizedQuery = trimmedQuery.toLocaleLowerCase('vi-VN');
      setCustomers(
        props.initialCustomerItems.filter((customer) =>
          [
            customer.displayName,
            customer.phoneNormalized,
            customer.emailNormalized,
            customer.customerCode,
          ]
            .filter((value): value is string => value !== undefined)
            .some((value) => value.toLocaleLowerCase('vi-VN').includes(normalizedQuery)),
        ),
      );
      setErrorMessage(undefined);
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);
    const result = await props.apiClient.invoke<CustomerSearchResponse>({
      operation: 'crm.customer.search',
      requestId: createRequestId('crm-search'),
      sessionToken: props.sessionToken,
      payload: { query: trimmedQuery },
    });
    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    setCustomers(result.data.customers);
  }

  async function createCustomer() {
    if (form.displayName.trim() === '') {
      setErrorMessage('Tên khách hàng là bắt buộc.');
      return;
    }

    const payload = {
      displayName: form.displayName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      customerGroupId: form.customerGroupId.trim(),
    };

    setIsLoading(true);
    setErrorMessage(undefined);
    setDuplicateWarnings([]);

    if (props.apiClient === undefined || props.sessionToken === undefined) {
      const duplicate = props.initialCustomerItems.find(
        (customer) =>
          form.phone.trim() !== '' &&
          customer.phoneNormalized !== undefined &&
          customer.phoneNormalized === normalizePhone(form.phone),
      );
      if (duplicate !== undefined) {
        setDuplicateWarnings([
          { field: 'phone', customerId: duplicate.customerId, displayName: duplicate.displayName },
        ]);
        setIsLoading(false);
        return;
      }
      const customer = createUiCustomer(payload, customers.length + 1);
      setCustomers((current) => [customer, ...current]);
      setForm(emptyCustomerForm);
      toast.success('Đã tạo khách hàng.');
      setIsLoading(false);
      return;
    }

    const result = await props.apiClient.invoke<CustomerQuickCreateResponse>({
      operation: 'crm.customer.quickCreate',
      requestId: createRequestId('crm-create'),
      sessionToken: props.sessionToken,
      payload: {
        displayName: payload.displayName,
        phone: payload.phone || undefined,
        email: payload.email || undefined,
        customerGroupId: payload.customerGroupId || undefined,
      },
    });
    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    if (result.data.duplicateWarnings.length > 0) {
      setDuplicateWarnings(result.data.duplicateWarnings);
      return;
    }
    if (result.data.customer !== undefined) {
      setCustomers((current) => [result.data.customer as CustomerDTO, ...current]);
      setForm(emptyCustomerForm);
      toast.success('Đã tạo khách hàng.');
    }
  }

  return (
    <div className="cn-catalog-shell">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">CRM / Khách hàng</p>
          <h1>Khách hàng & loyalty</h1>
          <p>Customer 360, cảnh báo trùng, nhóm khách và điểm thưởng theo quyền truy cập.</p>
        </div>
        <div className="cn-dashboard-actions">
          {isLoading ? <Badge tone="info">Đang xử lý</Badge> : <Badge tone="success">Sẵn sàng</Badge>}
          <Button onClick={() => void createCustomer()} variant="primary">
            Tạo nhanh khách hàng
          </Button>
        </div>
      </header>

      {duplicateWarnings.length > 0 ? (
        <p className="cn-inline-message cn-inline-message-warning">
          Cảnh báo trùng: {duplicateWarnings.map((warning) => warning.displayName).join(', ')}.
        </p>
      ) : null}

      <div className="cn-catalog-grid">
        <Panel
          action={<Badge tone="neutral">{customers.length} khách hàng</Badge>}
          description="Tìm theo tên, điện thoại, email hoặc mã khách; kết quả chỉ chứa thông tin không nhạy cảm."
          title="Tìm khách hàng"
        >
          <div className="cn-catalog-form">
            <label className="cn-field">
              Tên, số điện thoại, email hoặc mã khách
              <div className="cn-field-row">
                <input
                  aria-label="Tên, số điện thoại, email hoặc mã khách"
                  className="cn-field-input"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void searchCustomers();
                  }}
                  placeholder="Nhập từ khóa tìm khách hàng"
                  value={query}
                />
                <Button disabled={isLoading} isLoading={isLoading} onClick={() => void searchCustomers()} variant="secondary">
                  Tìm kiếm
                </Button>
              </div>
            </label>
          </div>
          <div className="cn-mini-list">
            {customers.map((customer) => (
              <div className="cn-mini-row" key={customer.customerId}>
                <span>
                  <strong>{customer.displayName}</strong>
                  <small>
                    {customer.customerCode} · {customer.phone ?? 'Chưa có SĐT'} ·{' '}
                    {customer.customerGroupId ?? 'retail'}
                  </small>
                </span>
                <Badge tone={customer.status === 'Active' ? 'success' : 'warning'}>
                  {customer.status === 'Active' ? 'Đang hoạt động' : customer.status}
                </Badge>
              </div>
            ))}
            {customers.length === 0 ? (
              <StateBlock
                description="Thử tìm bằng số điện thoại hoặc tạo nhanh khách hàng mới."
                title="Chưa có khách hàng phù hợp"
                tone="neutral"
              />
            ) : null}
          </div>
        </Panel>
        <Panel
          description="Tạo record khách hàng đủ dùng cho POS/đơn bán; merge/credit chi tiết để màn quản trị sau."
          title="Tạo nhanh khách hàng"
        >
          <div className="cn-catalog-form">
            <label className="cn-field">
              Tên khách hàng
              <input
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Ví dụ: Nguyễn Minh Tâm"
                value={form.displayName}
              />
            </label>
            <label className="cn-field">
              Số điện thoại
              <input
                inputMode="tel"
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="090..."
                value={form.phone}
              />
            </label>
            <label className="cn-field">
              Email
              <input
                inputMode="email"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="email@example.com"
                value={form.email}
              />
            </label>
            <div className="cn-field">
              Nhóm khách
              <div className="cn-segment-row" role="group" aria-label="Nhóm khách">
                {[
                  { value: 'retail', label: 'Khách lẻ' },
                  { value: 'retail-loyal', label: 'Thân thiết' },
                  { value: 'business', label: 'Doanh nghiệp' },
                ].map((group) => (
                  <button
                    aria-pressed={form.customerGroupId === group.value}
                    className="cn-segment"
                    key={group.value}
                    onClick={() => setForm((current) => ({ ...current, customerGroupId: group.value }))}
                    type="button"
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>
            <Button disabled={isLoading} isLoading={isLoading} onClick={() => void createCustomer()} variant="primary">
              Tạo nhanh khách hàng
            </Button>
            <StateBlock
              description="Không có công nợ/hạn mức nhạy cảm trong payload. Backend vẫn quyết định quyền khi mở hồ sơ chi tiết."
              title="Cảnh báo trùng theo điện thoại/email"
              tone="restricted"
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function createUiCustomer(
  input: Pick<CustomerFormState, 'displayName' | 'phone' | 'email' | 'customerGroupId'>,
  index: number,
): CustomerDTO {
  return {
    customerId: `customer-local-${index}`,
    tenantId: 'tenant-default',
    customerCode: `CUS-LOCAL-${String(index).padStart(3, '0')}`,
    displayName: input.displayName.trim(),
    phone: input.phone.trim() || undefined,
    phoneNormalized: input.phone.trim() ? normalizePhone(input.phone) : undefined,
    email: input.email.trim() || undefined,
    emailNormalized: input.email.trim() ? input.email.trim().toLocaleLowerCase('vi-VN') : undefined,
    customerGroupId: input.customerGroupId.trim() || undefined,
    status: 'Active',
  };
}

async function loadProducts(input: {
  apiClient: ApiClient;
  sessionToken: string;
  query: string;
  status: CatalogProductListStatus;
  productTypeFilter: ProductType | 'All';
  categoryFilter: string;
  brandFilter: string;
  selectedWarehouseId?: string;
  signal: AbortSignal;
  onStart: () => void;
  onFinish: () => void;
  onSuccess: (items: readonly CatalogProductListItemDTO[]) => void;
  onError: (message: string) => void;
}) {
  input.onStart();
  const result = await input.apiClient.invoke<CatalogProductListResponse>({
    operation: 'catalog.product.list',
    requestId: createRequestId('catalog-list'),
    sessionToken: input.sessionToken,
    payload: buildCatalogProductListPayload(input),
  });
  if (input.signal.aborted) return;
  input.onFinish();
  if (!result.ok) {
    input.onError(result.error.message);
    return;
  }
  input.onSuccess(result.data.items);
}

function buildCatalogProductListPayload(input: {
  query: string;
  status: CatalogProductListStatus;
  productTypeFilter: ProductType | 'All';
  categoryFilter: string;
  brandFilter: string;
  selectedWarehouseId?: string;
}): CatalogProductListRequest {
  const payload: CatalogProductListRequest = {
    status: input.status,
    limit: 100,
  };
  const query = input.query.trim();
  if (query !== '') payload.query = query;
  if (input.productTypeFilter !== 'All') payload.productType = input.productTypeFilter;
  if (input.categoryFilter !== 'All') payload.categoryId = input.categoryFilter;
  if (input.brandFilter !== 'All') payload.brandId = input.brandFilter;
  if (input.selectedWarehouseId !== undefined) payload.warehouseId = input.selectedWarehouseId;
  return payload;
}

function formFromItem(item: CatalogProductListItemDTO): ProductFormState {
  return {
    productCode: item.productCode,
    name: item.displayName,
    sku: item.sku,
    barcode: item.barcode ?? '',
    defaultUnitId: item.defaultUnitId,
    unitPriceVnd: String(item.unitPriceVnd),
    productType: item.productType,
    inventoryMode: item.inventoryMode,
    lotTracking: item.lotTracking,
    serialTracking: item.serialTracking,
  };
}

function variantFormFromItem(item: CatalogProductListItemDTO): VariantFormState {
  return {
    displayName: item.displayName,
    sku: item.sku,
    barcode: item.barcode ?? '',
    defaultUnitId: item.defaultUnitId,
    unitPriceVnd: String(item.unitPriceVnd),
    unitFactor: '1',
    inventoryMode: item.inventoryMode,
    lotTracking: item.lotTracking,
    serialTracking: item.serialTracking,
    saleEnabled: item.isActive,
    purchaseEnabled: item.inventoryMode === 'Tracked',
  };
}

function defaultInventoryModeForProductType(productType: ProductType): InventoryMode {
  if (productType === 'Service' || productType === 'NonStock') return 'NotTracked';
  if (productType === 'Bundle') return 'Bundle';
  return 'Tracked';
}

function trackingFlagsFromMode(mode: TrackingMode): Pick<ProductFormState, 'lotTracking' | 'serialTracking'> {
  return {
    lotTracking: mode === 'lot' || mode === 'both',
    serialTracking: mode === 'serial' || mode === 'both',
  };
}

function trackingModeFromFlags(
  item: Pick<CatalogProductListItemDTO, 'lotTracking' | 'serialTracking'>,
): TrackingMode {
  if (item.lotTracking && item.serialTracking) return 'both';
  if (item.lotTracking) return 'lot';
  if (item.serialTracking) return 'serial';
  return 'none';
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function createRequestId(scope: string): string {
  return `web-${scope}-${Date.now()}`;
}
