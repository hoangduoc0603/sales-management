import type { CatalogPosProjectionResponse, CatalogQuoteResponse } from '@shared/contracts/catalog/catalog';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type {
  SaleOrderSource,
  SaleOrderStatus,
  SalesDraftSaveResponse,
  SalesExchangeCreateResponse,
  SalesOrderDetailResponse,
  SalesOrderListItemDTO,
  SalesOrderListResponse,
  SalesOnlineTransitionResponse,
  SalesReturnCreateResponse,
  SalesReturnDisposition,
  SalesReturnResolveResponse,
  SalesWarrantyResponse,
  WarrantyCaseStatus,
} from '@shared/contracts/sales/sales';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Listbox } from '../../components/ui/listbox';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import { Table } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import type { ApiClient } from '../../lib/api/client';

export interface SalesOrdersReturnsHomeProps {
  actorId?: string;
  apiClient?: ApiClient;
  scope: CurrentScopeResponse;
  selectedBranchId: string;
  selectedWarehouseId: string;
  sessionToken?: string;
}

const defaultOrderItems: readonly SalesOrderListItemDTO[] = [
  createOrderItem({
    businessNumber: 'SO-260726-01842',
    customerId: 'Trần Thị Hồng Nhung',
    note: 'Tin nhắn khách hàng',
    saleOrderId: 'sale-order-demo-1',
    status: 'Confirmed',
    totalVnd: 2_680_000,
  }),
  createOrderItem({
    businessNumber: 'SO-260726-01837',
    customerId: 'Công ty CP Văn phòng Phương Nam',
    note: 'Khách đặt trước',
    saleOrderId: 'sale-order-demo-2',
    status: 'Packing',
    totalVnd: 18_450_000,
  }),
  createOrderItem({
    businessNumber: 'SO-260726-01815',
    customerId: 'Nguyễn Minh Tâm',
    note: 'Nhân viên tạo',
    saleOrderId: 'sale-order-demo-3',
    status: 'Draft',
    totalVnd: 1_249_000,
  }),
];

const FULFILLMENT_STEPS: readonly SaleOrderStatus[] = ['Draft', 'Confirmed', 'Packing', 'Shipped', 'Delivered'];
const MANUAL_ORDER_SOURCE_OPTIONS = [
  { value: 'Điện thoại', label: 'Điện thoại' },
  { value: 'Tin nhắn khách hàng', label: 'Tin nhắn khách hàng' },
  { value: 'Khách đặt trước', label: 'Khách đặt trước' },
  { value: 'Nhân viên tạo', label: 'Nhân viên tạo' },
] as const;
const MANUAL_PAYMENT_OPTIONS = [
  { value: 'deposit', label: 'Đặt cọc' },
  { value: 'partial', label: 'Thu một phần' },
  { value: 'credit', label: 'Bán chịu' },
] as const;

type ManualPaymentMode = (typeof MANUAL_PAYMENT_OPTIONS)[number]['value'];

export function SalesOrdersReturnsHome({
  actorId = 'user-admin',
  apiClient,
  scope,
  selectedBranchId,
  selectedWarehouseId,
  sessionToken,
}: SalesOrdersReturnsHomeProps) {
  const toast = useToast();
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('active');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<readonly SalesOrderListItemDTO[]>(defaultOrderItems);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(defaultOrderItems[0]?.order.saleOrderId ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingManualDraft, setIsSavingManualDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [manualSource, setManualSource] = useState<string>(MANUAL_ORDER_SOURCE_OPTIONS[0].value);
  const [manualPaymentMode, setManualPaymentMode] = useState<ManualPaymentMode>('deposit');
  const [manualRecipientName, setManualRecipientName] = useState('Khách lẻ');
  const [manualRecipientPhone, setManualRecipientPhone] = useState('');
  const [manualRecipientAddress, setManualRecipientAddress] = useState('');
  const [manualDepositVnd, setManualDepositVnd] = useState('300000');
  const [manualSavedDraftId, setManualSavedDraftId] = useState<string>();
  const [manualSavedDraftNumber, setManualSavedDraftNumber] = useState<string>();
  const [isConfirmingManualDraft, setIsConfirmingManualDraft] = useState(false);
  const [activeReturnId, setActiveReturnId] = useState<string>();
  const [activeReturnLineIds, setActiveReturnLineIds] = useState<readonly string[]>([]);
  const [activeReturnRefundVnd, setActiveReturnRefundVnd] = useState(0);
  const [isCreatingReturn, setIsCreatingReturn] = useState(false);
  const [isResolvingReturn, setIsResolvingReturn] = useState(false);
  const [activeExchangeOrderNumber, setActiveExchangeOrderNumber] = useState<string>();
  const [activeExchangeNetSettlementVnd, setActiveExchangeNetSettlementVnd] = useState<number>();
  const [isCreatingExchange, setIsCreatingExchange] = useState(false);
  const [warrantySerialId, setWarrantySerialId] = useState('SERIAL-LOCAL-001');
  const [warrantyIssue, setWarrantyIssue] = useState('Không lên nguồn.');
  const [activeWarrantyCaseId, setActiveWarrantyCaseId] = useState<string>();
  const [activeWarrantyStatus, setActiveWarrantyStatus] = useState<WarrantyCaseStatus>();
  const [isOpeningWarranty, setIsOpeningWarranty] = useState(false);
  const [isTransitioningWarranty, setIsTransitioningWarranty] = useState(false);

  useEffect(() => {
    if (errorMessage !== undefined) toast.danger(errorMessage);
  }, [errorMessage, toast]);
  const branch = scope.branches.find((item) => item.branchId === selectedBranchId);
  const warehouse = scope.warehouses.find((item) => item.warehouseId === selectedWarehouseId);

  const filteredOrders = useMemo(
    () => filterOrders(orders, { query, source, status }),
    [orders, query, source, status],
  );
  const selectedItem =
    filteredOrders.find((item) => item.order.saleOrderId === selectedOrderId) ?? filteredOrders[0];

  useEffect(() => {
    if (apiClient === undefined || sessionToken === undefined) return;
    void loadOrders();
  }, [apiClient, selectedBranchId, selectedWarehouseId, sessionToken, source, status]);

  async function loadOrders(nextQuery = query) {
    if (apiClient === undefined || sessionToken === undefined) {
      setOrders(defaultOrderItems);
      setErrorMessage(undefined);
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);
    const result = await apiClient.invoke<SalesOrderListResponse>({
      operation: 'sales.order.list',
      requestId: createRequestId('sales-order-list'),
      sessionToken,
      payload: {
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        statuses: statusesForFilter(status),
        sources: sourcesForFilter(source),
        query: nextQuery.trim() || undefined,
        limit: 100,
      },
    });
    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    setOrders(result.data.orders);
    setSelectedOrderId((current) =>
      result.data.orders.some((item) => item.order.saleOrderId === current)
        ? current
        : result.data.orders[0]?.order.saleOrderId ?? '',
    );
  }

  async function transitionSelectedOrder(operation: SalesOnlineOperation) {
    if (selectedItem === undefined) return;
    if (apiClient === undefined || sessionToken === undefined) {
      setOrders((current) =>
        current.map((item) =>
          item.order.saleOrderId === selectedItem.order.saleOrderId
            ? { ...item, order: { ...item.order, status: localNextStatus(operation, item.order.status) ?? item.order.status } }
            : item,
        ),
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);
    const result = await apiClient.invoke<SalesOnlineTransitionResponse>({
      operation,
      requestId: createRequestId(operation),
      sessionToken,
      payload: {
        saleOrderId: selectedItem.order.saleOrderId,
        actorId,
        commandId: createRequestId(`${operation}-cmd`),
        idempotencyKey: createRequestId(`${operation}-idem`),
        note: `Thao tác từ màn Đơn bán: ${operation}`,
        ...(operation === 'sales.online.cancel'
          ? {
              depositTreatment: 'KeepCustomerCredit',
              reason: 'Hủy trước Shipped từ màn Đơn bán',
            }
          : {}),
      },
    });
    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    toast.success(`Đã cập nhật đơn ${result.data.order.businessNumber}.`);
    await loadOrders();
  }

  async function createSourceReturnForSelectedOrder() {
    if (selectedItem === undefined) {
      setErrorMessage('Chọn một đơn bán trước khi tạo phiếu trả.');
      return;
    }
    if (!canCreateSourceReturn(selectedItem.order.status)) {
      setErrorMessage('Chỉ tạo phiếu trả cho đơn Completed, Shipped hoặc Delivered.');
      return;
    }

    if (apiClient === undefined || sessionToken === undefined) {
      setActiveReturnId(`return-demo-${selectedItem.order.saleOrderId}`);
      setActiveReturnLineIds([`return-line-demo-${selectedItem.order.saleOrderId}`]);
      setActiveReturnRefundVnd(Math.min(42_000, selectedItem.order.totalVnd));
      toast.success(`Đã tạo phiếu trả demo cho ${selectedItem.order.businessNumber}.`);
      setErrorMessage(undefined);
      return;
    }

    setIsCreatingReturn(true);
    setErrorMessage(undefined);
    const detailResult = await apiClient.invoke<SalesOrderDetailResponse | undefined>({
      operation: 'sales.order.get',
      requestId: createRequestId('source-return-order-detail'),
      sessionToken,
      payload: { saleOrderId: selectedItem.order.saleOrderId },
    });
    if (!detailResult.ok) {
      setIsCreatingReturn(false);
      setErrorMessage(detailResult.error.message);
      return;
    }

    const sourceLine = detailResult.data?.lines[0];
    if (sourceLine === undefined) {
      setIsCreatingReturn(false);
      setErrorMessage('Đơn gốc chưa có dòng hàng để tạo phiếu trả.');
      return;
    }

    const returnQuantityMilli = Math.min(1_000, Math.max(1, sourceLine.quantityMilli));
    const returnQuantity = returnQuantityMilli / 1_000;
    const refundVnd = Math.round(sourceLine.unitPriceVnd * returnQuantity);
    const result = await apiClient.invoke<SalesReturnCreateResponse>({
      operation: 'sales.return.create',
      requestId: createRequestId('source-return-create'),
      sessionToken,
      payload: {
        commandId: createRequestId('source-return-create-command'),
        idempotencyKey: createRequestId('source-return-create-idempotency'),
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        actorId,
        customerId: selectedItem.order.customerId,
        sourceSaleOrderId: selectedItem.order.saleOrderId,
        reason: 'Khách trả hàng theo đơn gốc.',
        lines: [
          {
            sourceSaleLineId: sourceLine.saleOrderLineId,
            variantId: sourceLine.variantId,
            quantity: returnQuantity,
            quantityMilli: returnQuantityMilli,
            disposition: 'Quarantine',
            refundVnd,
          },
        ],
      },
    });

    setIsCreatingReturn(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    setActiveReturnId(result.data.returnOrder.returnId);
    setActiveReturnLineIds(result.data.returnOrder.lines.map((line) => line.returnLineId));
    setActiveReturnRefundVnd(result.data.returnOrder.lines.reduce((sum, line) => sum + line.refundVnd, 0));
    toast.success(`Đã tạo phiếu trả ${result.data.returnOrder.returnId}; hàng đang chờ kiểm.`);
    await loadOrders();
  }

  async function resolveSourceReturn(disposition: SalesReturnDisposition) {
    if (activeReturnId === undefined || activeReturnLineIds.length === 0) {
      setErrorMessage('Cần tạo phiếu trả trước khi hoàn tất kiểm hàng.');
      return;
    }

    if (apiClient === undefined || sessionToken === undefined) {
      setActiveReturnId(undefined);
      setActiveReturnLineIds([]);
      setActiveReturnRefundVnd(0);
      toast.success(`Đã hoàn tất kiểm hàng demo với phương án ${disposition}.`);
      setErrorMessage(undefined);
      return;
    }

    setIsResolvingReturn(true);
    setErrorMessage(undefined);
    const result = await apiClient.invoke<SalesReturnResolveResponse>({
      operation: 'sales.return.resolve',
      requestId: createRequestId('source-return-resolve'),
      sessionToken,
      payload: {
        commandId: createRequestId('source-return-resolve-command'),
        idempotencyKey: createRequestId('source-return-resolve-idempotency'),
        returnId: activeReturnId,
        actorId,
        lines: activeReturnLineIds.map((returnLineId) => ({ returnLineId, disposition })),
        ...(activeReturnRefundVnd > 0 && selectedItem?.order.customerId
          ? {
              financialAction: {
                treatment: 'CustomerCredit',
                amountVnd: activeReturnRefundVnd,
              },
            }
          : {}),
      },
    });

    setIsResolvingReturn(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    setActiveReturnId(undefined);
    setActiveReturnLineIds([]);
    setActiveReturnRefundVnd(0);
    toast.success(`Đã hoàn tất kiểm hàng ${result.data.returnOrder.returnId} với phương án ${disposition}.`);
    await loadOrders();
  }

  async function createExchangeForSelectedOrder() {
    if (selectedItem === undefined) {
      setErrorMessage('Chọn một đơn bán trước khi tạo đổi hàng.');
      return;
    }
    if (!canCreateSourceReturn(selectedItem.order.status)) {
      setErrorMessage('Chỉ đổi hàng cho đơn Completed, Shipped hoặc Delivered.');
      return;
    }

    if (apiClient === undefined || sessionToken === undefined) {
      setActiveExchangeOrderNumber(`SO-EX-DEMO-${selectedItem.order.businessNumber.slice(-5)}`);
      setActiveExchangeNetSettlementVnd(143_000);
      toast.success(`Đã tạo đơn đổi hàng demo từ ${selectedItem.order.businessNumber}.`);
      setErrorMessage(undefined);
      return;
    }

    setIsCreatingExchange(true);
    setErrorMessage(undefined);
    const detailResult = await apiClient.invoke<SalesOrderDetailResponse | undefined>({
      operation: 'sales.order.get',
      requestId: createRequestId('exchange-source-detail'),
      sessionToken,
      payload: { saleOrderId: selectedItem.order.saleOrderId },
    });
    if (!detailResult.ok) {
      setIsCreatingExchange(false);
      setErrorMessage(detailResult.error.message);
      return;
    }
    const sourceLine = detailResult.data?.lines[0];
    if (sourceLine === undefined) {
      setIsCreatingExchange(false);
      setErrorMessage('Đơn gốc chưa có dòng hàng để đổi.');
      return;
    }

    const projectionResult = await apiClient.invoke<CatalogPosProjectionResponse>({
      operation: 'catalog.pos.getProjection',
      requestId: createRequestId('exchange-catalog'),
      sessionToken,
      payload: {
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
      },
    });
    if (!projectionResult.ok) {
      setIsCreatingExchange(false);
      setErrorMessage(projectionResult.error.message);
      return;
    }
    const exchangeVariant =
      projectionResult.data.variants.find((variant) => variant.saleEnabled && variant.isActive && variant.variantId !== sourceLine.variantId) ??
      projectionResult.data.variants.find((variant) => variant.saleEnabled && variant.isActive);
    if (exchangeVariant === undefined) {
      setIsCreatingExchange(false);
      setErrorMessage('Chưa có hàng hóa khả dụng để tạo đơn đổi hàng.');
      return;
    }

    const exchangeLine = {
      lineId: createRequestId('exchange-line'),
      variantId: exchangeVariant.variantId,
      unitVersionId: exchangeVariant.unitVersionId,
      quantity: 1,
      quantityMilli: 1_000,
      unitPriceVnd: exchangeVariant.unitPriceVnd,
      lineDiscountVnd: 0,
    };
    const quoteResult = await apiClient.invoke<CatalogQuoteResponse>({
      operation: 'catalog.quote.preview',
      requestId: createRequestId('exchange-quote'),
      sessionToken,
      payload: {
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        customerId: selectedItem.order.customerId,
        lines: [
          {
            lineId: exchangeLine.lineId,
            variantId: exchangeLine.variantId,
            unitVersionId: exchangeLine.unitVersionId,
            quantity: exchangeLine.quantity,
          },
        ],
      },
    });
    if (!quoteResult.ok) {
      setIsCreatingExchange(false);
      setErrorMessage(quoteResult.error.message);
      return;
    }

    const returnQuantityMilli = Math.min(1_000, Math.max(1, sourceLine.quantityMilli));
    const refundVnd = Math.round((sourceLine.lineTotalVnd * returnQuantityMilli) / sourceLine.quantityMilli);
    const netSettlementVnd = quoteResult.data.totalVnd - refundVnd;
    const result = await apiClient.invoke<SalesExchangeCreateResponse>({
      operation: 'sales.exchange.create',
      requestId: createRequestId('exchange-create'),
      sessionToken,
      payload: {
        commandId: createRequestId('exchange-create-command'),
        idempotencyKey: createRequestId('exchange-create-idempotency'),
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        actorId,
        cashierId: actorId,
        cashDrawerId: 'drawer-main',
        customerId: selectedItem.order.customerId,
        sourceSaleOrderId: selectedItem.order.saleOrderId,
        reason: 'Khách đổi hàng theo đơn gốc.',
        quoteVersion: quoteResult.data.quoteVersion,
        receiptFormat: 'K80',
        returnLines: [
          {
            sourceSaleLineId: sourceLine.saleOrderLineId,
            variantId: sourceLine.variantId,
            quantity: returnQuantityMilli / 1_000,
            quantityMilli: returnQuantityMilli,
            disposition: 'Quarantine',
            refundVnd,
          },
        ],
        exchangeLines: [exchangeLine],
        tenders:
          netSettlementVnd > 0
            ? [{ tenderId: createRequestId('exchange-tender'), paymentMethodId: 'cash', amountVnd: netSettlementVnd }]
            : [],
      },
    });

    setIsCreatingExchange(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    setActiveExchangeOrderNumber(result.data.exchangeOrder.businessNumber);
    setActiveExchangeNetSettlementVnd(result.data.netSettlementVnd);
    toast.success(`Đã tạo đơn đổi hàng ${result.data.exchangeOrder.businessNumber}.`);
    await loadOrders();
  }

  async function openWarrantyForSelectedOrder() {
    if (selectedItem === undefined) {
      setErrorMessage('Chọn một đơn bán trước khi mở ca bảo hành.');
      return;
    }
    const serialId = warrantySerialId.trim();
    const issue = warrantyIssue.trim();
    if (serialId === '' || issue === '') {
      setErrorMessage('Nhập Serial / IMEI và mô tả lỗi trước khi mở bảo hành.');
      return;
    }
    if (selectedItem.order.customerId === undefined) {
      setErrorMessage('Mở bảo hành cần khách hàng trên đơn gốc.');
      return;
    }

    if (apiClient === undefined || sessionToken === undefined) {
      setActiveWarrantyCaseId(`warranty-demo-${selectedItem.order.saleOrderId}`);
      setActiveWarrantyStatus('Open');
      toast.success(`Đã mở ca bảo hành demo cho ${selectedItem.order.businessNumber}.`);
      setErrorMessage(undefined);
      return;
    }

    setIsOpeningWarranty(true);
    setErrorMessage(undefined);
    const detailResult = await apiClient.invoke<SalesOrderDetailResponse | undefined>({
      operation: 'sales.order.get',
      requestId: createRequestId('warranty-order-detail'),
      sessionToken,
      payload: { saleOrderId: selectedItem.order.saleOrderId },
    });
    if (!detailResult.ok) {
      setIsOpeningWarranty(false);
      setErrorMessage(detailResult.error.message);
      return;
    }

    const sourceLine = detailResult.data?.lines[0];
    if (sourceLine === undefined) {
      setIsOpeningWarranty(false);
      setErrorMessage('Đơn gốc chưa có dòng hàng/serial để mở bảo hành.');
      return;
    }

    const result = await apiClient.invoke<SalesWarrantyResponse>({
      operation: 'sales.warranty.open',
      requestId: createRequestId('warranty-open'),
      sessionToken,
      payload: {
        commandId: createRequestId('warranty-open-command'),
        idempotencyKey: createRequestId('warranty-open-idempotency'),
        actorId,
        customerId: selectedItem.order.customerId,
        saleOrderId: selectedItem.order.saleOrderId,
        saleLineId: sourceLine.saleOrderLineId,
        variantId: sourceLine.variantId,
        serialId,
        issue,
        attachmentIds: ['attachment-local-1'],
      },
    });

    setIsOpeningWarranty(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    setActiveWarrantyCaseId(result.data.warrantyCase.warrantyCaseId);
    setActiveWarrantyStatus(result.data.warrantyCase.status);
    toast.success(`Đã mở ca bảo hành ${result.data.warrantyCase.warrantyCaseId}.`);
    await loadOrders();
  }

  async function transitionWarranty(status: WarrantyCaseStatus) {
    if (activeWarrantyCaseId === undefined) {
      setErrorMessage('Cần mở ca bảo hành trước khi chuyển trạng thái.');
      return;
    }

    if (apiClient === undefined || sessionToken === undefined) {
      setActiveWarrantyStatus(status);
      toast.success(`Đã chuyển ca bảo hành demo sang ${status}.`);
      setErrorMessage(undefined);
      return;
    }

    setIsTransitioningWarranty(true);
    setErrorMessage(undefined);
    const result = await apiClient.invoke<SalesWarrantyResponse>({
      operation: 'sales.warranty.transition',
      requestId: createRequestId('warranty-transition'),
      sessionToken,
      payload: {
        commandId: createRequestId('warranty-transition-command'),
        idempotencyKey: createRequestId('warranty-transition-idempotency'),
        warrantyCaseId: activeWarrantyCaseId,
        actorId,
        status,
        ...(status === 'Resolved' ? { resolution: 'Đã đổi sản phẩm.' } : {}),
      },
    });

    setIsTransitioningWarranty(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    setActiveWarrantyStatus(result.data.warrantyCase.status);
    toast.success(`Đã chuyển ca bảo hành ${result.data.warrantyCase.warrantyCaseId} sang ${result.data.warrantyCase.status}.`);
    await loadOrders();
  }

  async function saveManualOrderDraft() {
    const normalizedDepositVnd =
      manualPaymentMode === 'credit' ? 0 : Math.max(0, parseCurrencyInput(manualDepositVnd));
    const recipientName = manualRecipientName.trim() || 'Khách lẻ';
    const recipientPhone = manualRecipientPhone.trim();
    const recipientAddress = manualRecipientAddress.trim();

    if (apiClient === undefined || sessionToken === undefined) {
      const demoOrder = createOrderItem({
        businessNumber: `SO-DEMO-${Date.now().toString().slice(-5)}`,
        customerId: recipientName,
        note: manualSource,
        saleOrderId: `sale-order-demo-manual-${Date.now()}`,
        status: 'Draft',
        totalVnd: 42_000,
      });
      setOrders((current) => [demoOrder, ...current]);
      setSelectedOrderId(demoOrder.order.saleOrderId);
      setManualSavedDraftId(demoOrder.order.saleOrderId);
      setManualSavedDraftNumber(demoOrder.order.businessNumber);
      toast.success(`Đã lưu nháp đơn ${demoOrder.order.businessNumber}.`);
      setErrorMessage(undefined);
      return;
    }

    setIsSavingManualDraft(true);
    setErrorMessage(undefined);
    const projectionResult = await apiClient.invoke<CatalogPosProjectionResponse>({
      operation: 'catalog.pos.getProjection',
      requestId: createRequestId('manual-order-catalog'),
      sessionToken,
      payload: {
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
      },
    });

    if (!projectionResult.ok) {
      setIsSavingManualDraft(false);
      setErrorMessage(projectionResult.error.message);
      return;
    }

    const variant = projectionResult.data.variants.find((item) => item.saleEnabled && item.isActive);
    if (variant === undefined) {
      setIsSavingManualDraft(false);
      setErrorMessage('Chưa có hàng hóa khả dụng để tạo đơn nhập tay.');
      return;
    }

    const depositVnd = Math.min(normalizedDepositVnd, variant.unitPriceVnd);
    const result = await apiClient.invoke<SalesDraftSaveResponse>({
      operation: 'sales.draft.save',
      requestId: createRequestId('manual-order-save-draft'),
      sessionToken,
      payload: {
        commandId: createRequestId('manual-order-save-command'),
        idempotencyKey: createRequestId('manual-order-save-idempotency'),
        source: 'ManualOnline',
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        cashierId: actorId,
        note: manualSource,
        recipient: {
          name: recipientName,
          phone: recipientPhone || undefined,
          address: recipientAddress || undefined,
          shippingMethod: manualSource,
          codVnd: Math.max(0, variant.unitPriceVnd - depositVnd),
        },
        lines: [
          {
            lineId: createRequestId('manual-order-line'),
            variantId: variant.variantId,
            unitVersionId: variant.unitVersionId,
            quantity: 1,
            quantityMilli: 1000,
            unitPriceVnd: variant.unitPriceVnd,
            lineDiscountVnd: 0,
          },
        ],
        tenders:
          depositVnd > 0
            ? [
                {
                  tenderId: createRequestId('manual-order-deposit'),
                  paymentMethodId: 'cash',
                  cashDrawerId: 'drawer-main',
                  amountVnd: depositVnd,
                },
              ]
            : [],
      },
    });

    setIsSavingManualDraft(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    toast.success(`Đã lưu nháp đơn ${result.data.order.businessNumber}.`);
    setManualSavedDraftId(result.data.order.saleOrderId);
    setManualSavedDraftNumber(result.data.order.businessNumber);
    setSelectedOrderId(result.data.order.saleOrderId);
    await loadOrders();
  }

  async function confirmManualSavedDraft() {
    if (manualSavedDraftId === undefined) {
      setErrorMessage('Cần lưu nháp trước khi xác nhận.');
      return;
    }

    if (apiClient === undefined || sessionToken === undefined) {
      setOrders((current) =>
        current.map((item) =>
          item.order.saleOrderId === manualSavedDraftId
            ? { ...item, order: { ...item.order, status: 'Confirmed', confirmedAt: new Date().toISOString() } }
            : item,
        ),
      );
      setSelectedOrderId(manualSavedDraftId);
      setManualSavedDraftId(undefined);
      setManualSavedDraftNumber(undefined);
      toast.success('Đã xác nhận đơn nhập tay demo.');
      setErrorMessage(undefined);
      return;
    }

    setIsConfirmingManualDraft(true);
    setErrorMessage(undefined);
    const result = await apiClient.invoke<SalesOnlineTransitionResponse>({
      operation: 'sales.online.confirm',
      requestId: createRequestId('manual-order-confirm'),
      sessionToken,
      payload: {
        saleOrderId: manualSavedDraftId,
        actorId,
        commandId: createRequestId('manual-order-confirm-command'),
        idempotencyKey: createRequestId('manual-order-confirm-idempotency'),
        note: 'Xác nhận đơn nhập tay từ composer.',
      },
    });

    setIsConfirmingManualDraft(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    setManualSavedDraftId(undefined);
    setManualSavedDraftNumber(undefined);
    setSelectedOrderId(result.data.order.saleOrderId);
    toast.success(`Đã xác nhận đơn ${result.data.order.businessNumber}.`);
    await loadOrders();
  }

  function resetManualOrderDraft() {
    setManualSource(MANUAL_ORDER_SOURCE_OPTIONS[0].value);
    setManualPaymentMode('deposit');
    setManualRecipientName('Khách lẻ');
    setManualRecipientPhone('');
    setManualRecipientAddress('');
    setManualDepositVnd('300000');
    setManualSavedDraftId(undefined);
    setManualSavedDraftNumber(undefined);
    toast.info('Đã hủy nội dung nháp đang nhập trên màn hình.');
    setErrorMessage(undefined);
  }

  return (
    <div className="cn-sales-shell">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">Sales / Đơn bán / Trả hàng</p>
          <h1>Đơn bán & hậu mãi</h1>
          <p>
            Quản lý chứng từ bán, đơn nhập tay, trả/đổi hàng và bảo hành theo scope{' '}
            {branch?.name ?? selectedBranchId} · {warehouse?.name ?? selectedWarehouseId}.
          </p>
        </div>
        <div className="cn-dashboard-actions">
          {isLoading ? <Badge tone="info">Đang tải</Badge> : <Badge tone="success">Sẵn sàng</Badge>}
          <Button disabled={isLoading} isLoading={isLoading} onClick={() => void loadOrders()} variant="secondary">
            Làm mới
          </Button>
          <Button variant="primary">Tạo đơn nhập tay</Button>
        </div>
      </header>

      <div className="cn-filter-bar" aria-label="Bộ lọc đơn bán">
        <Listbox
          label="Nguồn đơn"
          onChange={setSource}
          options={[
            { value: 'all', label: 'Tất cả nguồn' },
            { value: 'pos', label: 'POS tại quầy' },
            { value: 'manual', label: 'Đơn nhập tay' },
          ]}
          value={source}
        />
        <Listbox
          label="Trạng thái đơn"
          onChange={setStatus}
          options={[
            { value: 'active', label: 'Đang xử lý' },
            { value: 'completed', label: 'Completed / Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          value={status}
        />
        <label className="cn-field" role="search">
          Tìm mã đơn, khách hàng hoặc SĐT
          <div className="cn-field-row">
            <input
              className="cn-field-input"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void loadOrders();
              }}
              placeholder="Nhập mã đơn, khách hàng hoặc SĐT"
              value={query}
            />
            <Button disabled={isLoading} onClick={() => void loadOrders()} variant="secondary">
              Tìm
            </Button>
          </div>
        </label>
      </div>

      <div className="cn-kpi-grid">
        <SalesMetric
          label="Đơn online cần xử lý"
          value={String(filteredOrders.filter((item) => item.order.source === 'ManualOnline').length)}
          caption="Mục tiêu xác nhận trong 15 phút"
          tone="warning"
        />
        <SalesMetric
          label="Đơn đã xuất giao"
          value={String(filteredOrders.filter((item) => item.order.status === 'Shipped' || item.order.status === 'Delivered').length)}
          caption="Delivered không ghi ledger lần hai"
          tone="success"
        />
        <SalesMetric label="Phiếu trả chờ kiểm" value="6" caption="Quarantine trước khi Restock/Scrap" tone="info" />
        <SalesMetric label="Ca bảo hành mở" value="3" caption="Theo serial và đơn gốc" tone="neutral" />
      </div>

      <ManualOrderComposer
        branchName={branch?.name ?? selectedBranchId}
        depositVnd={manualDepositVnd}
        isSaving={isSavingManualDraft}
        onDepositVndChange={setManualDepositVnd}
        onPaymentModeChange={setManualPaymentMode}
        onConfirmDraft={() => void confirmManualSavedDraft()}
        onRecipientAddressChange={setManualRecipientAddress}
        onRecipientNameChange={setManualRecipientName}
        onRecipientPhoneChange={setManualRecipientPhone}
        onReset={resetManualOrderDraft}
        onSaveDraft={() => void saveManualOrderDraft()}
        onSourceChange={setManualSource}
        paymentMode={manualPaymentMode}
        recipientAddress={manualRecipientAddress}
        recipientName={manualRecipientName}
        recipientPhone={manualRecipientPhone}
        savedDraftNumber={manualSavedDraftNumber}
        source={manualSource}
        warehouseName={warehouse?.name ?? selectedWarehouseId}
        canConfirmDraft={manualSavedDraftId !== undefined}
        isConfirming={isConfirmingManualDraft}
      />

      <div className="cn-sales-grid">
        <Panel
          action={<Button variant="secondary">Mở hàng đợi</Button>}
          description="Chỉ gồm đơn hợp lệ đang chờ thao tác; không gồm Draft bị hủy hoặc chứng từ ngoài scope."
          title="Đơn online cần xử lý"
        >
          <span className="sr-only">Chưa có đơn phù hợp.</span>
          <Table
            columns={[
              { key: 'order', header: 'Đơn / nguồn' },
              { key: 'customer', header: 'Khách hàng' },
              { key: 'age', header: 'Tuổi đơn' },
              { key: 'status', header: 'Trạng thái' },
              { key: 'payment', header: 'Thanh toán' },
              { key: 'value', header: 'Giá trị', align: 'right' },
              { key: 'action', header: '' },
            ]}
            emptyMessage="Chưa có đơn phù hợp."
            getRowKey={(row) => String(row.key)}
            rows={filteredOrders.map((item) => ({
              key: item.order.saleOrderId,
              order: (
                <button
                  className="cn-table-link"
                  onClick={() => setSelectedOrderId(item.order.saleOrderId)}
                  type="button"
                >
                  <strong>{item.order.businessNumber}</strong>
                  <small>{sourceLabel(item.order.source)}</small>
                </button>
              ),
              customer: (
                <span>
                  <strong>{item.order.customerId ?? 'Khách lẻ'}</strong>
                  <small>{item.order.note ?? 'Không có ghi chú'}</small>
                </span>
              ),
              age: relativeAge(item.order.createdAt),
              status: <OrderStatusBadge status={item.order.status} />,
              payment: <Badge tone={paymentTone(item.order.paymentStatus)}>{item.order.paymentStatus}</Badge>,
              value: <span className="num">{formatVnd(item.order.totalVnd)}</span>,
              action: (
                <Button onClick={() => setSelectedOrderId(item.order.saleOrderId)} variant="ghost">
                  Xử lý
                </Button>
              ),
            }))}
          />
        </Panel>

        <Panel
          description="Chi tiết chứng từ bất biến; mọi sửa sai đi qua return/reversal/adjustment."
          title="Detail chứng từ"
        >
          {selectedItem ? (
            <>
              <div className="cn-document-detail">
                <div>
                  <span>Mã đơn</span>
                  <strong>{selectedItem.order.businessNumber}</strong>
                </div>
                <div>
                  <span>Lifecycle</span>
                  <strong>Draft → Confirmed → Packing → Shipped → Delivered</strong>
                </div>
                <div>
                  <span>Khách / nhận hàng</span>
                  <strong>{selectedItem.order.customerId ?? selectedItem.order.recipient?.name ?? 'Khách lẻ'}</strong>
                </div>
                <div>
                  <span>Reservation</span>
                  <strong>{reservationCopy(selectedItem.order.status, selectedItem.lineCount)}</strong>
                </div>
              </div>
              <div className="cn-action-row">
                <Button
                  disabled={selectedItem.order.status !== 'Draft' || isLoading}
                  onClick={() => void transitionSelectedOrder('sales.online.confirm')}
                  variant="secondary"
                >
                  Xác nhận giữ hàng
                </Button>
                <Button
                  disabled={selectedItem.order.status !== 'Confirmed' || isLoading}
                  onClick={() => void transitionSelectedOrder('sales.online.startPacking')}
                  variant="secondary"
                >
                  Bắt đầu soạn hàng
                </Button>
                <Button
                  disabled={!['Confirmed', 'Packing'].includes(selectedItem.order.status) || isLoading}
                  onClick={() => void transitionSelectedOrder('sales.online.ship')}
                  variant="primary"
                >
                  Xuất giao
                </Button>
                <Button
                  disabled={selectedItem.order.status !== 'Shipped' || isLoading}
                  onClick={() => void transitionSelectedOrder('sales.online.deliver')}
                  variant="secondary"
                >
                  Giao thành công
                </Button>
                <Button
                  disabled={!['Draft', 'Confirmed', 'Packing'].includes(selectedItem.order.status) || isLoading}
                  onClick={() => void transitionSelectedOrder('sales.online.cancel')}
                  variant="ghost"
                >
                  Hủy trước Shipped
                </Button>
              </div>
            </>
          ) : (
            <StateBlock description="Chọn một đơn trong danh sách để xem chi tiết." title="Chưa chọn đơn" />
          )}
        </Panel>
      </div>

      {selectedItem ? (
        <ManualFulfillmentDetail
          isLoading={isLoading}
          item={selectedItem}
          onTransition={(operation) => void transitionSelectedOrder(operation)}
        />
      ) : null}

      <div className="cn-sales-grid">
        <SourceReturnPanel
          activeReturnId={activeReturnId}
          isCreating={isCreatingReturn}
          isResolving={isResolvingReturn}
          onCreateReturn={() => void createSourceReturnForSelectedOrder()}
          onResolveReturn={(disposition) => void resolveSourceReturn(disposition)}
          selectedItem={selectedItem}
        />

        <ExchangePanel
          exchangeOrderNumber={activeExchangeOrderNumber}
          isCreating={isCreatingExchange}
          netSettlementVnd={activeExchangeNetSettlementVnd}
          onCreateExchange={() => void createExchangeForSelectedOrder()}
          selectedItem={selectedItem}
        />

        <WarrantyPanel
          activeWarrantyCaseId={activeWarrantyCaseId}
          activeWarrantyStatus={activeWarrantyStatus}
          issue={warrantyIssue}
          isOpening={isOpeningWarranty}
          isTransitioning={isTransitioningWarranty}
          onIssueChange={setWarrantyIssue}
          onOpenWarranty={() => void openWarrantyForSelectedOrder()}
          onSerialIdChange={setWarrantySerialId}
          onTransition={(nextStatus) => void transitionWarranty(nextStatus)}
          selectedItem={selectedItem}
          serialId={warrantySerialId}
        />

        <Panel
          description="COGS/lợi nhuận, cost detail và dữ liệu nhạy cảm phải bị loại từ backend khi thiếu quyền."
          title="Dữ liệu nhạy cảm bị hạn chế"
        >
          <StateBlock
            description="Không che số bằng UI. API phải trả permission-restricted state thay vì gửi giá vốn/lợi nhuận."
            title="Không có quyền xem cost/profit"
            tone="restricted"
          />
        </Panel>
      </div>
    </div>
  );
}

function ManualFulfillmentDetail({
  isLoading,
  item,
  onTransition,
}: {
  isLoading: boolean;
  item: SalesOrderListItemDTO;
  onTransition: (operation: SalesOnlineOperation) => void;
}) {
  const order = item.order;
  return (
    <section className="cn-manual-fulfillment">
      <Panel
        description="Đơn nhập tay/online order detail, reservation, COD/deposit, bàn giao và cancel guard theo trạng thái backend."
        title="Chi tiết đơn nhập tay & fulfillment"
      >
        <div className="cn-workflow-steps" aria-label="Timeline trạng thái đơn nhập tay">
          {FULFILLMENT_STEPS.map((step) => (
            <span
              className={
                step === order.status
                  ? 'cn-workflow-step cn-workflow-step-active'
                  : isFulfillmentStepDone(step, order.status)
                    ? 'cn-workflow-step cn-workflow-step-done'
                    : 'cn-workflow-step'
              }
              key={step}
            >
              {step}
            </span>
          ))}
        </div>

        <div className="cn-manual-detail-grid">
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>{order.businessNumber}</strong>
                <small>
                  {sourceLabel(order.source)} · {item.lineCount} dòng · snapshot không chỉnh trực tiếp sau khi xuất giao.
                </small>
              </span>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="cn-mini-row">
              <span>
                <strong>Reservation</strong>
                <small>{reservationCopy(order.status, item.lineCount)}</small>
              </span>
              <Badge tone={order.status === 'Draft' || order.status === 'Cancelled' ? 'neutral' : 'success'}>
                {order.status === 'Draft' ? 'Chưa giữ' : order.status === 'Cancelled' ? 'Đã giải phóng' : 'Theo backend'}
              </Badge>
            </div>
            <div className="cn-mini-row">
              <span>
                <strong>Phí giao / COD</strong>
                <small>
                  Phí giao {formatVnd(order.shippingFeeVnd)} · COD còn lại {formatVnd(Math.max(0, order.receivableVnd))}
                </small>
              </span>
              <Badge tone={paymentTone(order.paymentStatus)}>{order.paymentStatus}</Badge>
            </div>
          </div>

          <div className="cn-manual-card">
            <h3>Khách nhận</h3>
            <p>{order.recipient?.name ?? order.customerId ?? 'Khách lẻ'}</p>
            <small>{order.recipient?.phone ?? 'Chưa có số điện thoại'} · {order.recipient?.address ?? 'Chưa có địa chỉ'}</small>
          </div>

          <div className="cn-manual-card">
            <h3>Nghĩa vụ thanh toán</h3>
            <dl className="cn-workbench-kv">
              <div>
                <dt>Đã thu / đặt cọc</dt>
                <dd className="num">{formatVnd(order.paidVnd)}</dd>
              </div>
              <div>
                <dt>Còn phải thu</dt>
                <dd className="num">{formatVnd(order.receivableVnd)}</dd>
              </div>
              <div>
                <dt>Tổng đơn</dt>
                <dd className="num">{formatVnd(order.totalVnd)}</dd>
              </div>
            </dl>
          </div>

          <div className="cn-manual-card">
            <h3>Kiểm tra trước xác nhận</h3>
            <div className="cn-mini-list">
              <div className="cn-mini-row">
                <span>Giá / ưu đãi / voucher</span>
                <Badge tone="success">Hợp lệ</Badge>
              </div>
              <div className="cn-mini-row">
                <span>Tồn khả dụng & reservation</span>
                <Badge tone={order.status === 'Draft' ? 'warning' : 'success'}>
                  {order.status === 'Draft' ? 'Cần kiểm tra' : 'Đã kiểm'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="cn-manual-card">
            <h3>Thông tin bàn giao</h3>
            <p>{order.recipient?.shippingMethod ?? 'Tự giao / nhân viên tạo'}</p>
            <small>Delivered không tạo tồn/doanh thu lần hai; sau Shipped sửa sai bằng return/reversal.</small>
          </div>

          <div className="cn-manual-card cn-manual-card-danger">
            <h3>Cancel guard</h3>
            <p>Không thể hủy trực tiếp sau Shipped.</p>
            <small>Hủy chỉ khả dụng trước trạng thái đã gửi; sau đó cần tạo return hoặc reversal đối ứng.</small>
          </div>
        </div>

        <div className="cn-action-row">
          <Button disabled={order.status !== 'Draft' || isLoading} onClick={() => onTransition('sales.online.confirm')} variant="secondary">
            Xác nhận đơn
          </Button>
          <Button
            disabled={order.status !== 'Confirmed' || isLoading}
            onClick={() => onTransition('sales.online.startPacking')}
            variant="secondary"
          >
            Bắt đầu đóng gói
          </Button>
          <Button disabled={!['Confirmed', 'Packing'].includes(order.status) || isLoading} onClick={() => onTransition('sales.online.ship')} variant="primary">
            Xác nhận bàn giao
          </Button>
          <Button disabled={order.status !== 'Shipped' || isLoading} onClick={() => onTransition('sales.online.deliver')} variant="secondary">
            Giao thành công
          </Button>
          <Button
            disabled={!['Draft', 'Confirmed', 'Packing'].includes(order.status) || isLoading}
            onClick={() => onTransition('sales.online.cancel')}
            variant="ghost"
          >
            Hủy nháp / hủy trước Shipped
          </Button>
        </div>
      </Panel>
    </section>
  );
}

function ExchangePanel({
  exchangeOrderNumber,
  isCreating,
  netSettlementVnd,
  onCreateExchange,
  selectedItem,
}: {
  exchangeOrderNumber?: string;
  isCreating: boolean;
  netSettlementVnd?: number;
  onCreateExchange: () => void;
  selectedItem?: SalesOrderListItemDTO;
}) {
  const selectedOrder = selectedItem?.order;
  const canCreate = selectedOrder !== undefined && canCreateSourceReturn(selectedOrder.status);

  return (
    <Panel
      action={<Badge tone={exchangeOrderNumber === undefined ? 'neutral' : 'success'}>{exchangeOrderNumber ?? 'Exchange'}</Badge>}
      description="Đổi hàng là Return + SaleOrder mới liên kết hai chiều; phần chênh lệch thu thêm/hoàn/credit xử lý qua Finance."
      title="Đổi hàng & thanh toán chênh lệch"
    >
      <div className="cn-exchange-workbench">
        <div className="cn-mini-list">
          <div className="cn-mini-row">
            <span>
              <strong>Tạo đổi hàng từ đơn đã chọn</strong>
              <small>
                {selectedOrder === undefined
                  ? 'Chọn đơn bán trước khi tạo exchange.'
                  : `${selectedOrder.businessNumber} · ${selectedOrder.status} · ${formatVnd(selectedOrder.totalVnd)}`}
              </small>
            </span>
            <Badge tone={canCreate ? 'success' : 'warning'}>{canCreate ? 'Đủ điều kiện' : 'Chờ hoàn tất'}</Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>Hàng nhận lại</strong>
              <small>Nhận hàng theo source line, đưa vào Quarantine và lưu snapshot giá gốc.</small>
            </span>
            <Badge tone="info">Return</Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>Hàng đổi mới</strong>
              <small>Quote hàng đổi mới được tính lại ngay trước command để tránh sai giá/promotion.</small>
            </span>
            <Badge tone="neutral">SaleOrder mới</Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>Thu / hoàn chênh lệch</strong>
              <small>
                {netSettlementVnd === undefined
                  ? 'Backend quyết định thu thêm, hoàn hoặc customer credit theo net settlement.'
                  : `Net settlement: ${formatVnd(netSettlementVnd)}.`}
              </small>
            </span>
            <Badge tone={netSettlementVnd === undefined ? 'neutral' : netSettlementVnd >= 0 ? 'warning' : 'success'}>
              {netSettlementVnd === undefined ? 'Chưa tạo' : netSettlementVnd >= 0 ? 'Thu thêm' : 'Hoàn/credit'}
            </Badge>
          </div>
        </div>

        <div className="cn-source-return-actions">
          <Button disabled={!canCreate || isCreating} isLoading={isCreating} onClick={onCreateExchange} variant="primary">
            Tạo đơn đổi hàng
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function SourceReturnPanel({
  activeReturnId,
  isCreating,
  isResolving,
  onCreateReturn,
  onResolveReturn,
  selectedItem,
}: {
  activeReturnId?: string;
  isCreating: boolean;
  isResolving: boolean;
  onCreateReturn: () => void;
  onResolveReturn: (disposition: SalesReturnDisposition) => void;
  selectedItem?: SalesOrderListItemDTO;
}) {
  const selectedOrder = selectedItem?.order;
  const canCreate = selectedOrder !== undefined && canCreateSourceReturn(selectedOrder.status);
  const canResolve = activeReturnId !== undefined;
  const isBusy = isCreating || isResolving;

  return (
    <Panel
      action={<Badge tone={canResolve ? 'warning' : canCreate ? 'success' : 'neutral'}>{canResolve ? 'Chờ kiểm hàng' : 'Source return'}</Badge>}
      description="Return tham chiếu source order dùng snapshot giá/thuế/cost gốc; hàng vào Quarantine trước khi quyết định."
      title="Trả hàng theo đơn gốc"
    >
      <div className="cn-source-return-workbench">
        <div className="cn-mini-list">
          <div className="cn-mini-row">
            <span>
              <strong>Tạo phiếu trả từ đơn đã chọn</strong>
              <small>
                {selectedOrder === undefined
                  ? 'Chọn đơn bán trước khi tạo return.'
                  : `${selectedOrder.businessNumber} · ${selectedOrder.status} · ${formatVnd(selectedOrder.totalVnd)}`}
              </small>
            </span>
            <Badge tone={canCreate ? 'success' : 'warning'}>
              {canCreate ? 'Đủ điều kiện' : 'Chưa đủ'}
            </Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>Đơn hợp lệ: Completed / Shipped / Delivered.</strong>
              <small>Draft/Confirmed/Packing cần hoàn tất hoặc xuất giao; không sửa ngược chứng từ gốc.</small>
            </span>
            <Badge tone="info">{selectedItem?.returnedLineCount ?? 0} dòng đã trả</Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>Chờ kiểm hàng</strong>
              <small>{activeReturnId ?? 'Tạo phiếu trả để đưa hàng vào Quarantine trước khi quyết định.'}</small>
            </span>
            <Badge tone={canResolve ? 'warning' : 'neutral'}>{canResolve ? 'Quarantine' : 'Chưa tạo'}</Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>Fast return cần quyền riêng</strong>
              <small>Không có đơn gốc phải có phê duyệt và lý do; UI không tự suy diễn quyền.</small>
            </span>
            <Badge tone="danger">Restricted</Badge>
          </div>
        </div>

        <div className="cn-source-return-actions">
          <Button disabled={!canCreate || isBusy} isLoading={isCreating} onClick={onCreateReturn} variant="secondary">
            Tạo phiếu trả
          </Button>
          <span>Hoàn tất kiểm hàng</span>
          <Button disabled={!canResolve || isBusy} isLoading={isResolving} onClick={() => onResolveReturn('Restock')} variant="secondary">
            Restock
          </Button>
          <Button disabled={!canResolve || isBusy} isLoading={isResolving} onClick={() => onResolveReturn('KeepQuarantine')} variant="ghost">
            KeepQuarantine
          </Button>
          <Button disabled={!canResolve || isBusy} isLoading={isResolving} onClick={() => onResolveReturn('Scrap')} variant="ghost">
            Scrap
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function WarrantyPanel({
  activeWarrantyCaseId,
  activeWarrantyStatus,
  issue,
  isOpening,
  isTransitioning,
  onIssueChange,
  onOpenWarranty,
  onSerialIdChange,
  onTransition,
  selectedItem,
  serialId,
}: {
  activeWarrantyCaseId?: string;
  activeWarrantyStatus?: WarrantyCaseStatus;
  issue: string;
  isOpening: boolean;
  isTransitioning: boolean;
  onIssueChange: (value: string) => void;
  onOpenWarranty: () => void;
  onSerialIdChange: (value: string) => void;
  onTransition: (status: WarrantyCaseStatus) => void;
  selectedItem?: SalesOrderListItemDTO;
  serialId: string;
}) {
  const selectedOrder = selectedItem?.order;
  const hasOpenCase = activeWarrantyCaseId !== undefined;
  const isBusy = isOpening || isTransitioning;

  return (
    <Panel
      action={<Badge tone={hasOpenCase ? 'info' : 'neutral'}>{activeWarrantyStatus ?? 'Serial case'}</Badge>}
      description="Tra cứu theo serial/IMEI, khách hàng, đơn gốc và attachment metadata."
      title="Bảo hành theo serial"
    >
      <div className="cn-warranty-workbench">
        <div className="cn-mini-list">
          <div className="cn-mini-row">
            <span>
              <strong>Mở ca bảo hành từ đơn đã chọn</strong>
              <small>
                {selectedOrder === undefined
                  ? 'Chọn đơn bán trước khi mở bảo hành.'
                  : `${selectedOrder.businessNumber} · ${selectedOrder.customerId ?? 'chưa có khách'} · ${selectedOrder.status}`}
              </small>
            </span>
            <Badge tone={selectedOrder?.customerId ? 'success' : 'warning'}>
              {selectedOrder?.customerId ? 'Đủ thông tin' : 'Cần khách hàng'}
            </Badge>
          </div>
          <div className="cn-mini-row">
            <span>
              <strong>{activeWarrantyCaseId ?? 'Chưa có ca bảo hành'}</strong>
              <small>Attachment chỉ lưu metadata/private Drive; không dùng public URL.</small>
            </span>
            <Badge tone={hasOpenCase ? 'info' : 'neutral'}>{activeWarrantyStatus ?? 'Chưa mở'}</Badge>
          </div>
        </div>

        <div className="cn-warranty-grid">
          <label className="cn-field">
            Serial / IMEI
            <input
              className="cn-field-input"
              onChange={(event) => onSerialIdChange(event.target.value)}
              placeholder="Nhập serial hoặc IMEI"
              value={serialId}
            />
          </label>
          <label className="cn-field cn-warranty-issue-field">
            Mô tả lỗi
            <textarea
              className="cn-field-input cn-textarea-input"
              onChange={(event) => onIssueChange(event.target.value)}
              placeholder="Ví dụ: Không lên nguồn"
              value={issue}
            />
          </label>
        </div>

        <div className="cn-source-return-actions">
          <Button disabled={selectedOrder === undefined || isBusy} isLoading={isOpening} onClick={onOpenWarranty} variant="secondary">
            Mở bảo hành
          </Button>
          <Button
            disabled={!hasOpenCase || isBusy || activeWarrantyStatus === 'InReview'}
            isLoading={isTransitioning}
            onClick={() => onTransition('InReview')}
            variant="secondary"
          >
            Chuyển InReview
          </Button>
          <Button
            disabled={!hasOpenCase || isBusy || activeWarrantyStatus === 'Resolved'}
            isLoading={isTransitioning}
            onClick={() => onTransition('Resolved')}
            variant="primary"
          >
            Đóng bảo hành
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function ManualOrderComposer({
  branchName,
  canConfirmDraft,
  depositVnd,
  isConfirming,
  isSaving,
  onConfirmDraft,
  onDepositVndChange,
  onPaymentModeChange,
  onRecipientAddressChange,
  onRecipientNameChange,
  onRecipientPhoneChange,
  onReset,
  onSaveDraft,
  onSourceChange,
  paymentMode,
  recipientAddress,
  recipientName,
  recipientPhone,
  savedDraftNumber,
  source,
  warehouseName,
}: {
  branchName: string;
  canConfirmDraft: boolean;
  depositVnd: string;
  isConfirming: boolean;
  isSaving: boolean;
  onConfirmDraft: () => void;
  onDepositVndChange: (value: string) => void;
  onPaymentModeChange: (value: ManualPaymentMode) => void;
  onRecipientAddressChange: (value: string) => void;
  onRecipientNameChange: (value: string) => void;
  onRecipientPhoneChange: (value: string) => void;
  onReset: () => void;
  onSaveDraft: () => void;
  onSourceChange: (value: string) => void;
  paymentMode: ManualPaymentMode;
  recipientAddress: string;
  recipientName: string;
  recipientPhone: string;
  savedDraftNumber?: string;
  source: string;
  warehouseName: string;
}) {
  const isBusy = isSaving || isConfirming;
  return (
    <Panel
      action={
        savedDraftNumber === undefined ? (
          <Badge tone="warning">Nháp chưa lưu</Badge>
        ) : (
          <Badge tone="success">Đã lưu {savedDraftNumber}</Badge>
        )
      }
      description="Nháp được lưu rõ ràng theo lựa chọn; không tự lưu."
      title="Tạo / sửa đơn nhập tay"
    >
      <div className="cn-manual-composer">
        <div className="cn-manual-composer-grid">
          <Listbox
            label="Nguồn nhập tay"
            onChange={onSourceChange}
            options={MANUAL_ORDER_SOURCE_OPTIONS}
            value={source}
          />
          <label className="cn-field">
            Khách nhận
            <input
              className="cn-field-input"
              onChange={(event) => onRecipientNameChange(event.target.value)}
              placeholder="Tên khách nhận"
              value={recipientName}
            />
          </label>
          <label className="cn-field">
            Số điện thoại
            <input
              className="cn-field-input"
              inputMode="tel"
              onChange={(event) => onRecipientPhoneChange(event.target.value)}
              placeholder="Số điện thoại nhận hàng"
              value={recipientPhone}
            />
          </label>
          <label className="cn-field cn-manual-address-field">
            Địa chỉ nhận
            <textarea
              className="cn-field-input cn-textarea-input"
              onChange={(event) => onRecipientAddressChange(event.target.value)}
              placeholder="Địa chỉ giao/nhận hoặc ghi chú lấy hàng"
              value={recipientAddress}
            />
          </label>
          <div className="cn-manual-card">
            <h3>Kho xuất / reservation</h3>
            <p>{warehouseName}</p>
            <small>{branchName} · reservation chỉ tạo khi xác nhận đơn.</small>
          </div>
          <div className="cn-manual-card">
            <h3>Thanh toán</h3>
            <div className="cn-segment-row cn-manual-payment-options" role="tablist" aria-label="Phương án thanh toán">
              {MANUAL_PAYMENT_OPTIONS.map((option) => (
                <button
                  aria-selected={paymentMode === option.value}
                  className="cn-segment"
                  key={option.value}
                  onClick={() => onPaymentModeChange(option.value)}
                  role="tab"
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="cn-field">
              Đặt cọc
              <input
                className="cn-field-input"
                disabled={paymentMode === 'credit'}
                inputMode="numeric"
                onChange={(event) => onDepositVndChange(event.target.value)}
                placeholder="0"
                value={paymentMode === 'credit' ? '0' : depositVnd}
              />
            </label>
          </div>
        </div>

        <div className="cn-manual-composer-footer">
          <span>
            Hủy chỉ khả dụng trước trạng thái Đã gửi.{' '}
            {canConfirmDraft ? 'Có thể xác nhận nháp đã lưu.' : 'Lưu nháp trước khi xác nhận.'}
          </span>
          <div className="cn-action-row">
            <Button disabled={isBusy} onClick={onReset} variant="ghost">
              Hủy nháp
            </Button>
            <Button disabled={isBusy} isLoading={isSaving} onClick={onSaveDraft} variant="secondary">
              Lưu nháp đơn
            </Button>
            <Button
              disabled={!canConfirmDraft || isBusy}
              isLoading={isConfirming}
              onClick={onConfirmDraft}
              variant="primary"
            >
              Xác nhận đơn
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function SalesMetric({
  caption,
  label,
  tone,
  value,
}: {
  caption: string;
  label: string;
  tone: 'success' | 'warning' | 'info' | 'neutral';
  value: string;
}) {
  return (
    <article className="cn-metric-card">
      <span>{label}</span>
      <strong className="num">{value}</strong>
      <Badge tone={tone}>{caption}</Badge>
    </article>
  );
}

function createOrderItem(input: {
  businessNumber: string;
  customerId: string;
  note: string;
  saleOrderId: string;
  status: SaleOrderStatus;
  totalVnd: number;
}): SalesOrderListItemDTO {
  const now = '2026-07-26T10:00:00.000Z';
  return {
    order: {
      saleOrderId: input.saleOrderId,
      tenantId: 'tenant-default',
      businessNumber: input.businessNumber,
      source: 'ManualOnline',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      status: input.status,
      paymentStatus: input.status === 'Draft' ? 'Unpaid' : 'Partial',
      customerId: input.customerId,
      cashierId: 'user-admin',
      note: input.note,
      subtotalVnd: input.totalVnd,
      discountVnd: 0,
      taxVnd: 0,
      shippingFeeVnd: 0,
      totalVnd: input.totalVnd,
      paidVnd: input.status === 'Draft' ? 0 : Math.round(input.totalVnd * 0.4),
      receivableVnd: input.status === 'Draft' ? input.totalVnd : Math.round(input.totalVnd * 0.6),
      draftVersion: 1,
      createdAt: now,
      updatedAt: now,
    },
    lineCount: 2,
    returnedLineCount: 0,
    warrantyCaseCount: 0,
  };
}

function filterOrders(
  orders: readonly SalesOrderListItemDTO[],
  filters: { query: string; source: string; status: string },
): readonly SalesOrderListItemDTO[] {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase('vi-VN');
  return orders.filter((item) => {
    const sourceFilter = sourcesForFilter(filters.source);
    const statusFilter = statusesForFilter(filters.status);
    if (sourceFilter !== undefined && !sourceFilter.includes(item.order.source)) return false;
    if (statusFilter !== undefined && !statusFilter.includes(item.order.status)) return false;
    if (normalizedQuery === '') return true;
    return [item.order.businessNumber, item.order.customerId, item.order.note]
      .filter((value): value is string => value !== undefined)
      .some((value) => value.toLocaleLowerCase('vi-VN').includes(normalizedQuery));
  });
}

function statusesForFilter(value: string): readonly SaleOrderStatus[] | undefined {
  if (value === 'active') return ['Draft', 'Confirmed', 'Packing', 'Shipped'];
  if (value === 'completed') return ['Completed', 'Delivered'];
  if (value === 'cancelled') return ['Cancelled'];
  return undefined;
}

function sourcesForFilter(value: string): readonly SaleOrderSource[] | undefined {
  if (value === 'pos') return ['POS'];
  if (value === 'manual') return ['ManualOnline'];
  return undefined;
}

type SalesOnlineOperation =
  | 'sales.online.confirm'
  | 'sales.online.startPacking'
  | 'sales.online.ship'
  | 'sales.online.deliver'
  | 'sales.online.cancel';

function localNextStatus(operation: SalesOnlineOperation, current: SaleOrderStatus): SaleOrderStatus | undefined {
  if (operation === 'sales.online.confirm' && current === 'Draft') return 'Confirmed';
  if (operation === 'sales.online.startPacking' && current === 'Confirmed') return 'Packing';
  if (operation === 'sales.online.ship' && (current === 'Confirmed' || current === 'Packing')) return 'Shipped';
  if (operation === 'sales.online.deliver' && current === 'Shipped') return 'Delivered';
  if (operation === 'sales.online.cancel' && ['Draft', 'Confirmed', 'Packing'].includes(current)) return 'Cancelled';
  return undefined;
}

function isFulfillmentStepDone(step: SaleOrderStatus, current: SaleOrderStatus): boolean {
  const stepIndex = FULFILLMENT_STEPS.indexOf(step);
  const currentIndex = FULFILLMENT_STEPS.indexOf(current);
  return stepIndex >= 0 && currentIndex >= 0 && stepIndex < currentIndex;
}

function OrderStatusBadge({ status }: { status: SaleOrderStatus }) {
  const tone = status === 'Draft' ? 'warning' : status === 'Packing' ? 'info' : status === 'Cancelled' ? 'danger' : 'success';
  return <Badge tone={tone}>{status}</Badge>;
}

function paymentTone(status: string): 'success' | 'warning' | 'info' | 'neutral' | 'danger' {
  if (status === 'Paid') return 'success';
  if (status === 'Partial') return 'warning';
  if (status === 'Unpaid') return 'neutral';
  return 'info';
}

function sourceLabel(source: SaleOrderSource): string {
  return source === 'POS' ? 'POS tại quầy' : 'Đơn nhập tay';
}

function reservationCopy(status: SaleOrderStatus, lineCount: number): string {
  if (status === 'Draft') return 'Chưa giữ tồn; Draft không tạo ledger.';
  if (status === 'Confirmed' || status === 'Packing') return `Đã giữ ${lineCount} dòng tại kho bán.`;
  if (status === 'Shipped' || status === 'Delivered') return 'Đã xuất kho; Delivered không ghi ledger lần hai.';
  return 'Đơn đã hủy trước Shipped; không tạo doanh thu/tồn.';
}

function canCreateSourceReturn(status: SaleOrderStatus): boolean {
  return status === 'Completed' || status === 'Shipped' || status === 'Delivered';
}

function relativeAge(createdAt: string): string {
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return '—';
  const minutes = Math.max(1, Math.round((Date.now() - createdMs) / 60_000));
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} giờ`;
  return `${Math.round(minutes / (24 * 60))} ngày`;
}

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function parseCurrencyInput(value: string): number {
  const digits = value.replace(/[^\d]/g, '');
  if (digits === '') return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createRequestId(scope: string): string {
  return `web-${scope}-${Date.now()}`;
}
