import type {
  CatalogCreateProductResponse,
  CatalogCreateVariantResponse,
  CatalogProductListItemDTO,
  CatalogProductListResponse,
  CatalogProductListStatus,
  CatalogSetProductActiveResponse,
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
import { inventoryModes, productTypes } from '@shared/contracts/catalog/catalog';
import { useEffect, useMemo, useState } from 'react';
import type { AppRoute } from '../../app/app-shell/app-shell';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import { Table } from '../../components/ui/table';
import type { ApiClient } from '../../lib/api/client';

export interface CatalogCrmHomeProps {
  route: Extract<AppRoute, 'catalog' | 'customers'>;
  apiClient?: ApiClient;
  sessionToken?: string;
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
  },
  {
    productId: 'product-laundry',
    productCode: 'SP-002',
    productName: 'Nước giặt sinh học hương hoa 3,6kg',
    productType: 'Stocked',
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
  { value: 'Active', label: 'Đang bán' },
  { value: 'Inactive', label: 'Ngừng bán' },
  { value: 'All', label: 'Tất cả' },
];

export function CatalogCrmHome({
  apiClient,
  initialProductItems = defaultProductItems,
  route,
  sessionToken,
}: CatalogCrmHomeProps) {
  const isCustomerRoute = route === 'customers';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CatalogProductListStatus>('Active');
  const [items, setItems] = useState<readonly CatalogProductListItemDTO[]>(initialProductItems);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    initialProductItems[0]?.variantId,
  );
  const [form, setForm] = useState<ProductFormState>(() =>
    initialProductItems[0] ? formFromItem(initialProductItems[0]) : emptyForm,
  );
  const [variantForm, setVariantForm] = useState<VariantFormState>(() =>
    initialProductItems[0] ? variantFormFromItem(initialProductItems[0]) : emptyVariantForm,
  );
  const [mode, setMode] = useState<'create' | 'edit'>(initialProductItems[0] ? 'edit' : 'create');
  const [variantMode, setVariantMode] = useState<'create' | 'edit'>(
    initialProductItems[0] ? 'edit' : 'create',
  );
  const [editorTab, setEditorTab] = useState<'product' | 'variant' | 'barcode'>('product');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [barcodeCheckMessage, setBarcodeCheckMessage] = useState<string>();

  const selectedItem = useMemo(
    () => items.find((item) => item.variantId === selectedVariantId) ?? items[0],
    [items, selectedVariantId],
  );
  const selectedProductVariantCount = useMemo(
    () => (selectedItem === undefined ? 0 : items.filter((item) => item.productId === selectedItem.productId).length),
    [items, selectedItem],
  );

  useEffect(() => {
    if (selectedItem === undefined) return;
    if (mode === 'edit') {
      setForm(formFromItem(selectedItem));
      setSelectedVariantId(selectedItem.variantId);
    }
    if (variantMode === 'edit') {
      setVariantForm(variantFormFromItem(selectedItem));
    }
  }, [mode, selectedItem, variantMode]);

  useEffect(() => {
    if (apiClient === undefined || sessionToken === undefined) return;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    void loadProducts({
      apiClient,
      query,
      sessionToken,
      status,
      signal: controller.signal,
      onStart: () => {
        setIsLoading(true);
        setErrorMessage(undefined);
      },
      onFinish: () => {
        window.clearTimeout(timeoutId);
        setIsLoading(false);
      },
      onSuccess: (nextItems) => {
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
  }, [apiClient, query, sessionToken, status]);

  const rows = items.map((item) => ({
    id: item.variantId,
    code: (
      <button
        className="cn-table-link"
        onClick={() => {
          setMode('edit');
          setVariantMode('edit');
          setSelectedVariantId(item.variantId);
          setForm(formFromItem(item));
          setVariantForm(variantFormFromItem(item));
        }}
        type="button"
      >
        <strong>{item.productCode}</strong>
        <small>{item.sku}</small>
      </button>
    ),
    name: (
      <span className="cn-product-cell-copy">
        <strong>{item.displayName}</strong>
        <small>
          {item.productType} · {item.inventoryMode}
        </small>
      </span>
    ),
    barcode: item.barcode ?? '—',
    unit: item.defaultUnitId,
    price: formatVnd(item.unitPriceVnd),
    flags: (
      <span className="cn-catalog-flags">
        {item.lotTracking ? <Badge tone="info">Lô</Badge> : null}
        {item.serialTracking ? <Badge tone="warning">Serial</Badge> : null}
        {!item.lotTracking && !item.serialTracking ? <Badge tone="neutral">Chuẩn</Badge> : null}
      </span>
    ),
    status: <Badge tone={item.isActive ? 'success' : 'warning'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>,
    actions: (
      <Button
        onClick={() => {
          void toggleVariantActive(item);
        }}
        variant="ghost"
      >
        {item.isActive ? 'Ngừng bán' : 'Kích hoạt'}
      </Button>
    ),
  }));

  async function refreshProducts(nextQuery = query, nextStatus = status) {
    if (apiClient === undefined || sessionToken === undefined) return;
    setIsLoading(true);
    setErrorMessage(undefined);
    const result = await apiClient.invoke<CatalogProductListResponse>({
      operation: 'catalog.product.list',
      requestId: createRequestId('catalog-list'),
      sessionToken,
      payload: {
        query: nextQuery.trim() || undefined,
        status: nextStatus,
        limit: 100,
      },
    });
    setIsLoading(false);
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
      setMessage(mode === 'create' ? 'Đã mô phỏng tạo sản phẩm.' : 'Đã mô phỏng cập nhật sản phẩm.');
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
    setMessage(mode === 'create' ? 'Đã tạo sản phẩm.' : 'Đã cập nhật sản phẩm.');
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
      setMessage(variantMode === 'create' ? 'Đã mô phỏng tạo biến thể.' : 'Đã mô phỏng cập nhật biến thể.');
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
    setMessage(variantMode === 'create' ? 'Đã tạo biến thể.' : 'Đã cập nhật biến thể.');
    await refreshProducts();
    setVariantMode('edit');
    setSelectedVariantId(result.data.variant.variantId);
  }

  async function toggleProductActive(item: CatalogProductListItemDTO) {
    if (apiClient === undefined || sessionToken === undefined) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.productId === item.productId
            ? { ...candidate, isActive: !candidate.isActive }
            : candidate,
        ),
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);
    const result = await apiClient.invoke<CatalogSetProductActiveResponse>({
      operation: 'catalog.product.setActive',
      requestId: createRequestId('catalog-active'),
      sessionToken,
      payload: {
        productId: item.productId,
        isActive: !item.isActive,
        reason: item.isActive ? 'Ngừng bán từ màn Hàng hóa' : undefined,
      },
    });
    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    setMessage(item.isActive ? 'Đã ngừng bán sản phẩm.' : 'Đã kích hoạt sản phẩm.');
    await refreshProducts();
  }

  async function toggleVariantActive(item: CatalogProductListItemDTO) {
    if (apiClient === undefined || sessionToken === undefined) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.variantId === item.variantId
            ? { ...candidate, isActive: !candidate.isActive }
            : candidate,
        ),
      );
      return;
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
      return;
    }
    setMessage(item.isActive ? 'Đã ngừng bán biến thể.' : 'Đã kích hoạt biến thể.');
    await refreshProducts();
  }

  function checkBarcodeOrSku() {
    const sku = variantForm.sku.trim().toLocaleUpperCase('vi-VN');
    const barcode = variantForm.barcode.trim().toLocaleUpperCase('vi-VN');
    const duplicate = items.find((item) => {
      if (variantMode === 'edit' && item.variantId === selectedItem?.variantId) return false;
      return (
        (sku !== '' && item.sku.trim().toLocaleUpperCase('vi-VN') === sku) ||
        (barcode !== '' && item.barcode?.trim().toLocaleUpperCase('vi-VN') === barcode)
      );
    });
    setBarcodeCheckMessage(
      duplicate === undefined
        ? 'SKU/barcode chưa trùng trong dữ liệu đang tải.'
        : `Trùng với ${duplicate.displayName} (${duplicate.sku}).`,
    );
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
    <div className="cn-catalog-shell">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">Catalog / Hàng hóa</p>
          <h1>Hàng hóa & biến thể</h1>
          <p>
            Quản lý Product/Variant, SKU, barcode, đơn vị bán, trạng thái kinh doanh và dữ liệu
            bán hàng an toàn cho POS.
          </p>
        </div>
        <div className="cn-dashboard-actions">
          {isLoading ? <Badge tone="info">Đang xử lý</Badge> : <Badge tone="success">Sẵn sàng</Badge>}
          <Button
            onClick={() => {
              setMode('create');
              setVariantMode('create');
              setEditorTab('product');
              setForm(emptyForm);
              setVariantForm(emptyVariantForm);
              setSelectedVariantId(undefined);
            }}
            variant="primary"
          >
            Tạo sản phẩm
          </Button>
        </div>
      </header>

      <div className="cn-filter-bar cn-catalog-filter-bar" aria-label="Bộ lọc hàng hóa">
        <label className="cn-field">
          Tìm kiếm
          <input
            aria-label="Tìm kiếm hàng hóa"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên hàng, SKU hoặc barcode"
            value={query}
          />
        </label>
        <div className="cn-field">
          Trạng thái
          <div className="cn-segment-row" role="tablist">
            {productStatuses.map((option) => (
              <button
                aria-selected={status === option.value}
                className="cn-segment"
                key={option.value}
                onClick={() => setStatus(option.value)}
                role="tab"
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="cn-field">
          Thao tác
          <Button onClick={() => void refreshProducts()} variant="secondary">
            Làm mới
          </Button>
        </div>
      </div>

      {errorMessage ? <p className="cn-inline-message cn-inline-message-danger">{errorMessage}</p> : null}
      {message ? <p className="cn-inline-message cn-inline-message-success">{message}</p> : null}

      <div className="cn-catalog-view-tabs" role="tablist" aria-label="Catalog workspace">
        {[
          { value: 'catalog', label: 'Catalog' },
          { value: 'customers', label: 'Khách hàng' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'imports', label: 'Imports' },
        ].map((tab) => (
          <button
            aria-selected={tab.value === 'catalog'}
            className="cn-catalog-view-tab"
            key={tab.value}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="cn-catalog-grid cn-catalog-master-detail">
        <Panel
          action={<Badge tone="neutral">{items.length} biến thể</Badge>}
          description="Variant là đơn vị giao dịch. Product/variant đã có chứng từ chỉ ngừng bán, không xóa cứng."
          title="Catalog table"
        >
          <Table
            columns={[
              { key: 'code', header: 'Mã / SKU' },
              { key: 'name', header: 'Tên hàng' },
              { key: 'barcode', header: 'Barcode' },
              { key: 'unit', header: 'Đơn vị' },
              { key: 'price', header: 'Giá bán', align: 'right' },
              { key: 'flags', header: 'Theo dõi' },
              { key: 'status', header: 'Trạng thái' },
              { key: 'actions', header: 'Thao tác' },
            ]}
            emptyMessage="Chưa có sản phẩm phù hợp."
            getRowKey={(row) => String(row.id)}
            rows={rows}
          />
        </Panel>

        <Panel
          action={
            selectedItem ? (
              <Badge tone="neutral">{selectedProductVariantCount} variant</Badge>
            ) : (
              <Badge tone="info">New</Badge>
            )
          }
          description="Product editor và policy builder theo artifact mới; không dùng native select."
          title="Product editor"
        >
          <div className="cn-editor-tabs" role="tablist" aria-label="Product editor sections">
            {[
              { value: 'product', label: 'Product master' },
              { value: 'variant', label: 'Variant & đơn vị' },
              { value: 'barcode', label: 'Barcode search' },
            ].map((tab) => (
              <button
                aria-selected={editorTab === tab.value}
                className="cn-editor-tab"
                key={tab.value}
                onClick={() => setEditorTab(tab.value as typeof editorTab)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {editorTab === 'product' ? (
            <div className="cn-catalog-form cn-editor-card">
              <label className="cn-field">
                Mã sản phẩm
                <input
                  onChange={(event) => setForm((current) => ({ ...current, productCode: event.target.value }))}
                  value={form.productCode}
                />
              </label>
              <label className="cn-field">
                Tên hàng
                <input
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  value={form.name}
                />
              </label>
              <div className="cn-editor-grid">
                <label className="cn-field">
                  Default SKU
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
                    value={form.sku}
                  />
                </label>
                <label className="cn-field">
                  Barcode
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))}
                    value={form.barcode}
                  />
                </label>
              </div>
              <div className="cn-editor-grid">
                <label className="cn-field">
                  Đơn vị bán mặc định
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, defaultUnitId: event.target.value }))}
                    value={form.defaultUnitId}
                  />
                </label>
                <label className="cn-field">
                  Giá bán mặc định
                  <input
                    inputMode="numeric"
                    onChange={(event) => setForm((current) => ({ ...current, unitPriceVnd: event.target.value }))}
                    value={form.unitPriceVnd}
                  />
                </label>
              </div>
              <div className="cn-field">
                Loại hàng
                <div className="cn-segment-row" role="group" aria-label="Loại hàng">
                  {productTypes.map((type) => (
                    <button
                      aria-pressed={form.productType === type}
                      className="cn-segment"
                      key={type}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          productType: type,
                          inventoryMode: defaultInventoryModeForProductType(type),
                        }))
                      }
                      type="button"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cn-field">
                Chế độ tồn mặc định
                <div className="cn-segment-row" role="group" aria-label="Chế độ tồn">
                  {inventoryModes.map((modeOption) => (
                    <button
                      aria-pressed={form.inventoryMode === modeOption}
                      className="cn-segment"
                      key={modeOption}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          inventoryMode: modeOption,
                        }))
                      }
                      type="button"
                    >
                      {modeOption}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cn-action-row">
                <Button disabled={isLoading} isLoading={isLoading} onClick={() => void submitProduct()} variant="primary">
                  {mode === 'create' ? 'Tạo sản phẩm' : 'Lưu Product master'}
                </Button>
                {selectedItem ? (
                  <Button disabled={isLoading} onClick={() => void toggleProductActive(selectedItem)} variant="secondary">
                    {selectedItem.isActive ? 'Ngừng toàn bộ product' : 'Kích hoạt lại'}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {editorTab === 'variant' ? (
            <div className="cn-catalog-form cn-editor-card">
              <div className="cn-action-row cn-action-row-between">
                <Badge tone="info">{variantMode === 'create' ? 'New variant' : selectedItem?.sku ?? 'Variant'}</Badge>
                <Button
                  onClick={() => {
                    setVariantMode('create');
                    setVariantForm({
                      ...emptyVariantForm,
                      inventoryMode: selectedItem?.inventoryMode ?? emptyVariantForm.inventoryMode,
                    });
                  }}
                  variant="secondary"
                >
                  Thêm variant
                </Button>
              </div>
              <label className="cn-field">
                Tên biến thể
                <input
                  onChange={(event) => setVariantForm((current) => ({ ...current, displayName: event.target.value }))}
                  value={variantForm.displayName}
                />
              </label>
              <div className="cn-editor-grid">
                <label className="cn-field">
                  SKU
                  <input
                    onChange={(event) => setVariantForm((current) => ({ ...current, sku: event.target.value }))}
                    value={variantForm.sku}
                  />
                </label>
                <label className="cn-field">
                  Barcode
                  <input
                    onChange={(event) => setVariantForm((current) => ({ ...current, barcode: event.target.value }))}
                    value={variantForm.barcode}
                  />
                </label>
              </div>
              <div className="cn-editor-grid">
                <label className="cn-field">
                  Đơn vị bán
                  <input
                    onChange={(event) => setVariantForm((current) => ({ ...current, defaultUnitId: event.target.value }))}
                    value={variantForm.defaultUnitId}
                  />
                </label>
                <label className="cn-field">
                  Quy đổi về đơn vị gốc
                  <input
                    inputMode="decimal"
                    onChange={(event) => setVariantForm((current) => ({ ...current, unitFactor: event.target.value }))}
                    value={variantForm.unitFactor}
                  />
                </label>
              </div>
              <label className="cn-field">
                Giá bán
                <input
                  inputMode="numeric"
                  onChange={(event) => setVariantForm((current) => ({ ...current, unitPriceVnd: event.target.value }))}
                  value={variantForm.unitPriceVnd}
                />
              </label>
              <div className="cn-field">
                Chế độ tồn
                <div className="cn-segment-row" role="group" aria-label="Chế độ tồn biến thể">
                  {inventoryModes.map((modeOption) => (
                    <button
                      aria-pressed={variantForm.inventoryMode === modeOption}
                      className="cn-segment"
                      key={modeOption}
                      onClick={() =>
                        setVariantForm((current) => ({
                          ...current,
                          inventoryMode: modeOption,
                        }))
                      }
                      type="button"
                    >
                      {modeOption}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cn-catalog-toggle-row">
                <label>
                  <input
                    checked={variantForm.lotTracking}
                    onChange={(event) =>
                      setVariantForm((current) => ({ ...current, lotTracking: event.target.checked }))
                    }
                    type="checkbox"
                  />{' '}
                  Theo dõi lô/hạn
                </label>
                <label>
                  <input
                    checked={variantForm.serialTracking}
                    onChange={(event) =>
                      setVariantForm((current) => ({ ...current, serialTracking: event.target.checked }))
                    }
                    type="checkbox"
                  />{' '}
                  Theo dõi serial
                </label>
                <label>
                  <input
                    checked={variantForm.saleEnabled}
                    onChange={(event) =>
                      setVariantForm((current) => ({ ...current, saleEnabled: event.target.checked }))
                    }
                    type="checkbox"
                  />{' '}
                  Cho bán
                </label>
                <label>
                  <input
                    checked={variantForm.purchaseEnabled}
                    onChange={(event) =>
                      setVariantForm((current) => ({ ...current, purchaseEnabled: event.target.checked }))
                    }
                    type="checkbox"
                  />{' '}
                  Cho nhập
                </label>
              </div>
              <div className="cn-action-row">
                <Button disabled={isLoading} isLoading={isLoading} onClick={() => void submitVariant()} variant="primary">
                  {variantMode === 'create' ? 'Tạo variant' : 'Lưu variant'}
                </Button>
                {selectedItem ? (
                  <Button disabled={isLoading} onClick={() => void toggleVariantActive(selectedItem)} variant="secondary">
                    {selectedItem.isActive ? 'Ngừng bán variant' : 'Kích hoạt variant'}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {editorTab === 'barcode' ? (
            <div className="cn-catalog-form cn-editor-card">
              <StateBlock
                description="Kiểm tra nhanh trên catalog đã tải. Backend vẫn là nguồn quyết định cuối cùng khi lưu."
                title="Barcode search"
                tone="neutral"
              />
              <label className="cn-field">
                SKU cần kiểm tra
                <input
                  onChange={(event) => setVariantForm((current) => ({ ...current, sku: event.target.value }))}
                  value={variantForm.sku}
                />
              </label>
              <label className="cn-field">
                Barcode cần kiểm tra
                <input
                  onChange={(event) => setVariantForm((current) => ({ ...current, barcode: event.target.value }))}
                  value={variantForm.barcode}
                />
              </label>
              <Button onClick={checkBarcodeOrSku} variant="secondary">
                Kiểm tra trùng
              </Button>
              {barcodeCheckMessage ? (
                <p className="cn-inline-message cn-inline-message-warning">{barcodeCheckMessage}</p>
              ) : null}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function CustomerWorkspace(props: {
  apiClient?: ApiClient;
  initialCustomerItems: readonly CustomerDTO[];
  sessionToken?: string;
}) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<readonly CustomerDTO[]>(props.initialCustomerItems);
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [duplicateWarnings, setDuplicateWarnings] =
    useState<readonly CustomerQuickCreateResponse['duplicateWarnings'][number][]>([]);

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
      setMessage('Đã tạo khách hàng.');
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
      setMessage('Đã tạo khách hàng.');
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

      {errorMessage ? <p className="cn-inline-message cn-inline-message-danger">{errorMessage}</p> : null}
      {message ? <p className="cn-inline-message cn-inline-message-success">{message}</p> : null}
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
    payload: {
      query: input.query.trim() || undefined,
      status: input.status,
      limit: 100,
    },
  });
  if (input.signal.aborted) return;
  input.onFinish();
  if (!result.ok) {
    input.onError(result.error.message);
    return;
  }
  input.onSuccess(result.data.items);
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

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function createRequestId(scope: string): string {
  return `web-${scope}-${Date.now()}`;
}
