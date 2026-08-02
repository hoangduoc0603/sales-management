import type { ApiMeta, ApiRequest, ApiResult } from '@shared/contracts/api';
import type { ApiErrorCode } from '@shared/contracts/errors';
import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type {
  AuthChangeOwnPasswordResponse,
  AuthLoginResponse,
  SessionBootstrapResponse,
} from '@shared/contracts/platform/auth';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { BootstrapStatusResponse } from '@shared/contracts/platform/bootstrap';
import type {
  InstallRunResponse,
  InstallStatusResponse,
} from '@shared/contracts/platform/install';
import type {
  CatalogCreateProductRequest,
  CatalogCreateProductResponse,
  CatalogCreateVariantRequest,
  CatalogCreateVariantResponse,
  CatalogProductListItemDTO,
  CatalogProductListRequest,
  CatalogProductListResponse,
  CatalogPosProjectionResponse,
  CatalogQuoteRequest,
  CatalogQuoteResponse,
  CatalogSetProductActiveRequest,
  CatalogSetProductActiveResponse,
  CatalogSetVariantActiveRequest,
  CatalogSetVariantActiveResponse,
  CatalogUpdateProductRequest,
  CatalogUpdateProductResponse,
  CatalogUpdateVariantRequest,
  CatalogUpdateVariantResponse,
  ProductDTO,
  UnitConversionVersionDTO,
  VariantBarcodeDTO,
  VariantDTO,
} from '@shared/contracts/catalog/catalog';
import type {
  CustomerDTO,
  CustomerQuickCreateResponse,
  CustomerSearchResponse,
} from '@shared/contracts/crm/customer';
import type {
  InventoryBalanceSummaryResponse,
  InventoryStocktakeResponse,
  InventoryTransferResponse,
} from '@shared/contracts/inventory/inventory';
import type {
  CashDrawerDTO,
  CashTransactionDTO,
  CustomerCreditDTO,
  FinanceAgingProjectionResponse,
  FinanceMasterDataResponse,
  FinancePaymentRecordResponse,
  FinanceSummaryResponse,
  ObligationDTO,
  PaymentDTO,
  PaymentMethodDTO,
} from '@shared/contracts/finance/finance';
import type {
  ReportingDashboardResponse,
  ReportingExportResponse,
  ReportingReportQueryResponse,
} from '@shared/contracts/reporting/reporting';
import type {
  AttachmentAccessResponse,
  AttachmentCompleteResponse,
  AttachmentDeleteResponse,
  AttachmentListResponse,
  AttachmentMetadataDTO,
  AttachmentUploadResponse,
  BackupListResponse,
  BackupResponse,
  BackupRunDTO,
  CapacityAlertDTO,
  HealthCheckDTO,
  HealthCheckResponse,
  ImportBatchDTO,
  ImportCommitResponse,
  ImportStagingRowDTO,
  ImportTemplateResponse,
  ImportUploadResponse,
  ImportValidateResponse,
  PartitionCapacityResponse,
  PartitionDTO,
  RestorePrepareResponse,
  RestoreRunDTO,
  RestoreSwitchResponse,
  RuntimeCleanupResponse,
} from '@shared/contracts/operations/operations';
import type {
  GoodsReceiptLineDTO,
  PurchaseOrderLineDTO,
  PurchasingGoodsReceiptApproveResponse,
  PurchasingGoodsReceiptCreateResponse,
  PurchasingPoResponse,
  PurchasingSupplierCreateResponse,
  PurchasingSupplierReturnApproveResponse,
  PurchasingSupplierReturnCreateResponse,
  SupplierDTO,
  SupplierReturnLineDTO,
} from '@shared/contracts/purchasing/purchasing';
import type {
  SalesDraftListResponse,
  SalesDraftSaveResponse,
  SalesExchangeCreateRequest,
  SalesExchangeCreateResponse,
  SalesOnlineTransitionResponse,
  SaleOrderStatus,
  SalesOrderDetailResponse,
  SalesOrderListResponse,
  SalesPosCompleteRequest,
  SalesPosCompleteResponse,
  SalesPosPrewarmCheckoutContextResponse,
  SalesReturnCreateResponse,
  SalesReturnDTO,
  SalesReturnResolveResponse,
  SalesWarrantyResponse,
  WarrantyCaseDTO,
} from '@shared/contracts/sales/sales';
import type { CommandStatusResponse } from '@shared/contracts/platform/command';
import type { TableDefinitionDTO, TableDefinitionsResponse } from '@shared/contracts/platform/registry';
import { parseApiRequest } from '@shared/schemas/api';
import {
  parseCatalogCreateProductRequest,
  parseCatalogCreateVariantRequest,
  parseCatalogProductListRequest,
  parseCatalogPosProjectionRequest,
  parseCatalogQuoteRequest,
  parseCatalogSetProductActiveRequest,
  parseCatalogSetVariantActiveRequest,
  parseCatalogUpdateProductRequest,
  parseCatalogUpdateVariantRequest,
} from '@shared/schemas/catalog/catalog';
import {
  parseCustomerQuickCreateRequest,
  parseCustomerSearchRequest,
} from '@shared/schemas/crm/customer';
import {
  parseInventoryBalanceSummaryRequest,
  parseInventoryStocktakeApproveRequest,
  parseInventoryStocktakeOpenRequest,
  parseInventoryStocktakeSubmitRequest,
  parseInventoryTransferApproveRequest,
  parseInventoryTransferCreateRequest,
  parseInventoryTransferReceiveRequest,
  parseInventoryTransferShipRequest,
} from '@shared/schemas/inventory/inventory';
import {
  parseFinanceAgingProjectionRequest,
  parseFinanceCashDrawerUpsertRequest,
  parseFinanceMasterDataRequest,
  parseFinancePaymentMethodUpsertRequest,
} from '@shared/schemas/finance/finance';
import { parseDisableWarehouseRequest } from '@shared/schemas/platform/administration';
import { parseAuthChangeOwnPasswordRequest, parseAuthLoginRequest } from '@shared/schemas/platform/auth';
import { parseBootstrapInstallRequest } from '@shared/schemas/platform/bootstrap';
import { parseCommandStatusRequest } from '@shared/schemas/platform/command';
import { parseInstallRunRequest } from '@shared/schemas/platform/install';
import {
  parsePurchasingGoodsReceiptApproveRequest,
  parsePurchasingGoodsReceiptCreateRequest,
  parsePurchasingPoApproveRequest,
  parsePurchasingPoCreateRequest,
  parsePurchasingSupplierCreateRequest,
  parsePurchasingSupplierReturnApproveRequest,
  parsePurchasingSupplierReturnCreateRequest,
} from '@shared/schemas/purchasing/purchasing';
import {
  parseReportingDashboardRequest,
  parseReportingExportRequest,
  parseReportingExportStatusRequest,
  parseReportingReportQueryRequest,
} from '@shared/schemas/reporting/reporting';
import {
  parseAttachmentAccessRequest,
  parseAttachmentCompleteRequest,
  parseAttachmentDeleteRequest,
  parseAttachmentListRequest,
  parseAttachmentUploadRequest,
  parseBackupRequest,
  parseHealthCheckRequest,
  parseImportCommitRequest,
  parseImportTemplateRequest,
  parseImportUploadRequest,
  parseImportValidateRequest,
  parsePartitionCapacityRequest,
  parseRestorePrepareRequest,
  parseRestoreSwitchRequest,
  parseRuntimeCleanupRequest,
} from '@shared/schemas/operations/operations';
import {
  parseSalesDraftOpenRequest,
  parseSalesDraftSaveRequest,
  parseSalesExchangeCreateRequest,
  parseSalesOnlineCancelRequest,
  parseSalesOnlineTransitionRequest,
  parseSalesOrderDetailRequest,
  parseSalesOrderListRequest,
  parseSalesPosCompleteRequest,
  parseSalesPosPrewarmCheckoutContextRequest,
  parseSalesReturnCreateRequest,
  parseSalesReturnResolveRequest,
  parseSalesWarrantyOpenRequest,
  parseSalesWarrantyTransitionRequest,
} from '@shared/schemas/sales/sales';
import { createApiClient, type ApiClient, type ApiInvoker } from './client';

interface LocalSession {
  sessionToken: string;
  actor: ActorContextDTO;
  issuedAtMs: number;
  idleExpiresAtMs: number;
  absoluteExpiresAtMs: number;
  revoked: boolean;
}

interface LocalUser {
  loginId: string;
  password: string;
  passwordChangeRequired: boolean;
  authVersion: number;
}

export interface LocalFakeBackendOptions {
  now?: () => Date;
}

export const LOCAL_DEBUG_SESSION_TOKEN = 'local-debug-session';

const idleTtlMs = 60 * 60 * 1000;
const absoluteTtlMs = 8 * 60 * 60 * 1000;

export function createLocalFakeBackendClient(options: LocalFakeBackendOptions = {}): ApiClient {
  return createApiClient(createLocalFakeBackendInvoker(options));
}

export function createLocalFakeBackendInvoker(options: LocalFakeBackendOptions = {}): ApiInvoker {
  const now = options.now ?? (() => new Date());
  let sequence = 0;
  const sessions = new Map<string, LocalSession>();
  const user: LocalUser = {
    loginId: 'admin',
    password: 'admin123',
    passwordChangeRequired: true,
    authVersion: 1,
  };
  const debugSessionIssuedAtMs = now().getTime();
  sessions.set(LOCAL_DEBUG_SESSION_TOKEN, {
    sessionToken: LOCAL_DEBUG_SESSION_TOKEN,
    actor: createLocalDebugActor(),
    issuedAtMs: debugSessionIssuedAtMs,
    idleExpiresAtMs: debugSessionIssuedAtMs + idleTtlMs,
    absoluteExpiresAtMs: debugSessionIssuedAtMs + absoluteTtlMs,
    revoked: false,
  });

  let warehouseStatus: 'Active' | 'Disabled' = 'Active';
  const catalogProducts = new Map<string, CatalogProductListItemDTO>(createLocalCatalogProducts());
  const customers = new Map<string, CustomerDTO>();
  const purchasingSuppliers = new Map<string, SupplierDTO>();
  const purchaseOrders = new Map<string, PurchasingPoResponse>();
  const goodsReceipts = new Map<string, PurchasingGoodsReceiptCreateResponse>();
  const supplierReturns = new Map<string, PurchasingSupplierReturnCreateResponse>();
  const exportRuns = new Map<string, ReportingExportResponse>();
  const salesDrafts = new Map<string, SalesDraftSaveResponse>();
  const salesOrders = new Map<string, SalesOrderDetailResponse>();
  const commandResults = new Map<string, unknown>();
  const importBatches = new Map<string, ImportBatchDTO>();
  const importRows = new Map<string, ImportStagingRowDTO[]>();
  const attachments = new Map<string, AttachmentMetadataDTO>();
  const backupRuns = new Map<string, BackupRunDTO>();
  const restoreRuns = new Map<string, RestoreRunDTO>();
  const cashDrawers = new Map<string, CashDrawerDTO>([
    [
      'drawer-main',
      {
        cashDrawerId: 'drawer-main',
        tenantId: 'tenant-default',
        branchId: 'branch-default',
        drawerCode: 'MAIN',
        name: 'Két chính',
        drawerType: 'Cash',
        status: 'Active',
        directSaleEnabled: true,
      },
    ],
  ]);
  const paymentMethods = new Map<string, PaymentMethodDTO>([
    [
      'cash',
      {
        paymentMethodId: 'cash',
        tenantId: 'tenant-default',
        methodCode: 'CASH',
        name: 'Tiền mặt',
        methodType: 'Cash',
        status: 'Active',
        directSaleEnabled: true,
      },
    ],
    [
      'bank',
      {
        paymentMethodId: 'bank',
        tenantId: 'tenant-default',
        methodCode: 'BANK',
        name: 'Chuyển khoản',
        methodType: 'BankTransfer',
        status: 'Active',
        directSaleEnabled: true,
      },
    ],
  ]);
  const financeObligations = new Map<string, ObligationDTO>([
    [
      'local-receivable-overdue',
      {
        obligationId: 'local-receivable-overdue',
        tenantId: 'tenant-default',
        branchId: 'branch-default',
        obligationType: 'Receivable',
        partyId: 'customer-1',
        sourceDocument: { sourceType: 'SaleOrder', sourceId: 'SO-LOCAL-001' },
        dueDate: '2026-07-20',
        originalAmountVnd: 2_160_000,
        allocatedAmountVnd: 0,
        remainingAmountVnd: 2_160_000,
        status: 'Open',
      },
    ],
  ]);
  const partitions = new Map<string, PartitionDTO>([
    [
      'transaction',
      {
        partitionId: 'partition-transaction-fy2026-p01',
        storageRole: 'transaction',
        partitionKey: 'FY2026-P01',
        status: 'Active',
        activeFrom: '2026-01-01T00:00:00.000Z',
        capacityPct: 87,
        readOnly: false,
      },
    ],
  ]);
  const capacityAlerts: CapacityAlertDTO[] = [];
  const technicalRuntimeRecords = [
    { recordId: 'runtime-cache-expired', expiresAt: '2026-07-26T00:00:00.000Z', evidence: false, deleted: false },
    { recordId: 'runtime-evidence-expired', expiresAt: '2026-07-26T00:00:00.000Z', evidence: true, deleted: false },
  ];

  const nextId = (prefix: string) => {
    sequence += 1;
    return `local-${prefix}-${sequence}`;
  };

  return {
    async invoke<T>(request: ApiRequest): Promise<ApiResult<T>> {
      const startedAt = now();
      let apiRequest: ApiRequest;

      try {
        apiRequest = parseApiRequest(request);
      } catch {
        return errorResult<T>(
          'INVALID_REQUEST',
          'Yêu cầu không hợp lệ.',
          createMeta(request, startedAt, now()),
        );
      }

      const meta = createMeta(apiRequest, startedAt, now());

      switch (apiRequest.operation) {
        case 'platform.install.getStatus':
          return successResult(createLocalInstallStatus() as T, meta);
        case 'platform.install.run':
          try {
            parseInstallRunRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return successResult(
            createLocalInstallRunResponse(apiRequest.payload as {
              tenantDisplayName: string;
              adminLoginId: string;
            }) as T,
            meta,
          );
        case 'platform.bootstrap.install':
          try {
            parseBootstrapInstallRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return successResult(
            {
              installed: true,
              alreadyInstalled: true,
              ...createLocalBootstrapBaseline(warehouseStatus),
              admin: createLocalAdminActor(user.authVersion),
              adminTemporaryPasswordShownOnce: false,
              roles: [
                { tenantId: 'tenant-default', roleId: 'role-owner', name: 'Owner', status: 'Active' },
                { tenantId: 'tenant-default', roleId: 'role-manager', name: 'Manager', status: 'Active' },
              ],
            } as T,
            meta,
          );
        case 'platform.bootstrap.getStatus':
          return successResult(createLocalBootstrapStatus(warehouseStatus) as T, meta);
        case 'platform.auth.login':
          return handleLogin<T>(apiRequest, meta, sessions, now, nextId, user);
        case 'platform.auth.changeOwnPassword':
          try {
            parseAuthChangeOwnPasswordRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, AuthChangeOwnPasswordResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => handleChangeOwnPassword(apiRequest.payload, meta, user),
          );
        case 'platform.auth.logout':
          return withSession<T>(apiRequest, meta, sessions, now, user, (session) => {
            session.revoked = true;
            return { revoked: true };
          });
        case 'platform.session.me':
          return withSession<T>(apiRequest, meta, sessions, now, user, (session) => ({
            actor: session.actor,
            idleExpiresAt: new Date(session.idleExpiresAtMs).toISOString(),
            absoluteExpiresAt: new Date(session.absoluteExpiresAtMs).toISOString(),
          }));
        case 'platform.session.bootstrap':
          return withSession<T, SessionBootstrapResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            (session) => ({
              actor: session.actor,
              currentScope: createLocalCurrentScope(warehouseStatus),
              idleExpiresAt: new Date(session.idleExpiresAtMs).toISOString(),
              absoluteExpiresAt: new Date(session.absoluteExpiresAtMs).toISOString(),
            }),
          );
        case 'platform.command.getStatus':
          try {
            parseCommandStatusRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CommandStatusResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => ({ command: undefined }),
          );
        case 'platform.registry.getTableDefinitions':
          return withSession<T, TableDefinitionsResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => ({ tables: createLocalPlatformTableDefinitions() }),
          );
        case 'platform.scope.getCurrent':
          return withSession<T, CurrentScopeResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalCurrentScope(warehouseStatus),
          );
        case 'platform.warehouse.disable':
          try {
            parseDisableWarehouseRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => {
              warehouseStatus = 'Disabled';
              return { disabled: true, blockers: [] };
            },
          );
        case 'catalog.product.list':
          try {
            parseCatalogProductListRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CatalogProductListResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => listLocalCatalogProducts(apiRequest.payload as CatalogProductListRequest, catalogProducts, now),
          );
        case 'catalog.product.create':
          try {
            parseCatalogCreateProductRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CatalogCreateProductResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalCatalogProduct(apiRequest.payload as CatalogCreateProductRequest, catalogProducts, nextId),
          );
        case 'catalog.product.update':
          try {
            parseCatalogUpdateProductRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CatalogUpdateProductResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => updateLocalCatalogProduct(apiRequest.payload as CatalogUpdateProductRequest, catalogProducts),
          );
        case 'catalog.product.setActive':
          try {
            parseCatalogSetProductActiveRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CatalogSetProductActiveResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => setLocalCatalogProductActive(apiRequest.payload as CatalogSetProductActiveRequest, catalogProducts),
          );
        case 'catalog.variant.create':
          try {
            parseCatalogCreateVariantRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CatalogCreateVariantResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () =>
              createLocalCatalogVariant(
                apiRequest.payload as CatalogCreateVariantRequest,
                catalogProducts,
                nextId,
              ),
          );
        case 'catalog.variant.update':
          try {
            parseCatalogUpdateVariantRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CatalogUpdateVariantResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => updateLocalCatalogVariant(apiRequest.payload as CatalogUpdateVariantRequest, catalogProducts),
          );
        case 'catalog.variant.setActive':
          try {
            parseCatalogSetVariantActiveRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CatalogSetVariantActiveResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => setLocalCatalogVariantActive(apiRequest.payload as CatalogSetVariantActiveRequest, catalogProducts),
          );
        case 'catalog.pos.getProjection':
          try {
            parseCatalogPosProjectionRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CatalogPosProjectionResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalCatalogProjection(catalogProducts, now),
          );
        case 'catalog.quote.preview':
          try {
            parseCatalogQuoteRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CatalogQuoteResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalQuote(apiRequest.payload as CatalogQuoteRequest, catalogProducts, now),
          );
        case 'crm.customer.quickCreate':
          try {
            parseCustomerQuickCreateRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CustomerQuickCreateResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalCustomer(apiRequest.payload, customers, nextId),
          );
        case 'crm.customer.search':
          try {
            parseCustomerSearchRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, CustomerSearchResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => searchLocalCustomers(apiRequest.payload, customers),
          );
        case 'inventory.balance.getSummary':
          try {
            parseInventoryBalanceSummaryRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, InventoryBalanceSummaryResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalInventoryBalanceSummary(),
          );
        case 'inventory.transfer.create':
          try {
            parseInventoryTransferCreateRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, InventoryTransferResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalTransferResponse(apiRequest.payload, nextId, 'PendingApproval'),
          );
        case 'inventory.transfer.approve':
          try {
            parseInventoryTransferApproveRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, InventoryTransferResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalTransferResponse(apiRequest.payload, nextId, 'Approved'),
          );
        case 'inventory.transfer.ship':
          try {
            parseInventoryTransferShipRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, InventoryTransferResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalTransferResponse(apiRequest.payload, nextId, 'Shipped'),
          );
        case 'inventory.transfer.receive':
          try {
            parseInventoryTransferReceiveRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, InventoryTransferResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalTransferResponse(apiRequest.payload, nextId, 'Received'),
          );
        case 'inventory.stocktake.open':
          try {
            parseInventoryStocktakeOpenRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, InventoryStocktakeResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalStocktakeResponse(apiRequest.payload, nextId, 'InProgress'),
          );
        case 'inventory.stocktake.submit':
          try {
            parseInventoryStocktakeSubmitRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, InventoryStocktakeResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalStocktakeResponse(apiRequest.payload, nextId, 'Submitted'),
          );
        case 'inventory.stocktake.approve':
          try {
            parseInventoryStocktakeApproveRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, InventoryStocktakeResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalStocktakeResponse(apiRequest.payload, nextId, 'Approved'),
          );
        case 'finance.summary.get':
          return withSession<T, FinanceSummaryResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalFinanceSummary(),
          );
        case 'finance.master.get':
          try {
            parseFinanceMasterDataRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, FinanceMasterDataResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalFinanceMasterData(apiRequest.payload, cashDrawers, paymentMethods),
          );
        case 'finance.cashDrawer.upsert':
          try {
            parseFinanceCashDrawerUpsertRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, { cashDrawer: CashDrawerDTO }>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalCashDrawer(apiRequest.payload, cashDrawers, nextId),
          );
        case 'finance.paymentMethod.upsert':
          try {
            parseFinancePaymentMethodUpsertRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, { paymentMethod: PaymentMethodDTO }>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalPaymentMethod(apiRequest.payload, paymentMethods, nextId),
          );
        case 'finance.aging.get':
          try {
            parseFinanceAgingProjectionRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, FinanceAgingProjectionResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalFinanceAging(apiRequest.payload, financeObligations, now),
          );
        case 'purchasing.supplier.create':
          try {
            parsePurchasingSupplierCreateRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, PurchasingSupplierCreateResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalSupplier(apiRequest.payload, purchasingSuppliers, nextId, now),
          );
        case 'purchasing.po.create':
          try {
            parsePurchasingPoCreateRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, PurchasingPoResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalPurchaseOrder(apiRequest.payload, purchaseOrders, nextId, now),
          );
        case 'purchasing.po.approve':
          try {
            parsePurchasingPoApproveRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, PurchasingPoResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => approveLocalPurchaseOrder(apiRequest.payload, purchaseOrders, now),
          );
        case 'purchasing.receipt.create':
          try {
            parsePurchasingGoodsReceiptCreateRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, PurchasingGoodsReceiptCreateResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalGoodsReceipt(apiRequest.payload, goodsReceipts, nextId, now),
          );
        case 'purchasing.receipt.approve':
          try {
            parsePurchasingGoodsReceiptApproveRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, PurchasingGoodsReceiptApproveResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => approveLocalGoodsReceipt(apiRequest.payload, goodsReceipts, now),
          );
        case 'purchasing.supplierReturn.create':
          try {
            parsePurchasingSupplierReturnCreateRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, PurchasingSupplierReturnCreateResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalSupplierReturn(apiRequest.payload, supplierReturns, nextId, now),
          );
        case 'purchasing.supplierReturn.approve':
          try {
            parsePurchasingSupplierReturnApproveRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, PurchasingSupplierReturnApproveResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => approveLocalSupplierReturn(apiRequest.payload, supplierReturns, now),
          );
        case 'reporting.dashboard.get':
          try {
            parseReportingDashboardRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, ReportingDashboardResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalReportingDashboard(apiRequest.payload, now),
          );
        case 'reporting.report.query':
          try {
            parseReportingReportQueryRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, ReportingReportQueryResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalReportQuery(apiRequest.payload, now),
          );
        case 'reporting.export.request':
          try {
            parseReportingExportRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, ReportingExportResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => {
              const response = createLocalExportResponse(apiRequest.payload, nextId, now);
              exportRuns.set(response.exportRun.runId, response);
              return response;
            },
          );
        case 'reporting.export.getStatus':
          try {
            parseReportingExportStatusRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, ReportingExportResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => getLocalExportStatus(apiRequest.payload, exportRuns, now),
          );
        case 'operations.import.template':
          try {
            parseImportTemplateRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, ImportTemplateResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalImportTemplate(apiRequest.payload),
          );
        case 'operations.import.upload':
          try {
            parseImportUploadRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, ImportUploadResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            (session) => uploadLocalImport(apiRequest.payload, session.actor.userId, importBatches, nextId),
          );
        case 'operations.import.validate':
          try {
            parseImportValidateRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, ImportValidateResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => validateLocalImport(apiRequest.payload, importBatches, importRows, nextId, now),
          );
        case 'operations.import.commit':
          try {
            parseImportCommitRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, ImportCommitResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => commitLocalImport(apiRequest.payload, importBatches, importRows, now),
          );
        case 'operations.attachment.upload':
          try {
            parseAttachmentUploadRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, AttachmentUploadResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            (session) => uploadLocalAttachment(apiRequest.payload, session.actor.userId, attachments, nextId, now),
          );
        case 'operations.attachment.list':
          try {
            parseAttachmentListRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, AttachmentListResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => listLocalAttachments(apiRequest.payload, attachments),
          );
        case 'operations.attachment.complete':
          try {
            parseAttachmentCompleteRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, AttachmentCompleteResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            (session) => completeLocalAttachment(apiRequest.payload, session.actor.userId, attachments, nextId, now),
          );
        case 'operations.attachment.download':
          try {
            parseAttachmentAccessRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, AttachmentAccessResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => accessLocalAttachment(apiRequest.payload, attachments, now),
          );
        case 'operations.attachment.delete':
          try {
            parseAttachmentDeleteRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, AttachmentDeleteResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => deleteLocalAttachment(apiRequest.payload, attachments, now),
          );
        case 'operations.backup.request':
          try {
            parseBackupRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, BackupResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            (session) => requestLocalBackup(apiRequest.payload, session.actor.userId, partitions, backupRuns, nextId, now),
          );
        case 'operations.backup.list':
          return withSession<T, BackupListResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => ({ backups: [...backupRuns.values()] }),
          );
        case 'operations.restore.prepare':
          try {
            parseRestorePrepareRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, RestorePrepareResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            (session) => prepareLocalRestore(apiRequest.payload, session.actor.userId, backupRuns, restoreRuns, nextId, now),
          );
        case 'operations.restore.switch':
          try {
            parseRestoreSwitchRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, RestoreSwitchResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => switchLocalRestore(apiRequest.payload, restoreRuns, now),
          );
        case 'operations.health.check':
          try {
            parseHealthCheckRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, HealthCheckResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => checkLocalHealth(partitions, capacityAlerts, now),
          );
        case 'operations.partition.ensureNext':
          try {
            parsePartitionCapacityRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, PartitionCapacityResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => ensureLocalNextPartition(apiRequest.payload, partitions, capacityAlerts, nextId, now),
          );
        case 'operations.runtime.cleanupExpired':
          try {
            parseRuntimeCleanupRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, RuntimeCleanupResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => cleanupLocalRuntime(apiRequest.payload, technicalRuntimeRecords),
          );
        case 'sales.draft.save':
          try {
            parseSalesDraftSaveRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesDraftSaveResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => saveLocalSalesDraft(apiRequest.payload, salesDrafts, salesOrders, catalogProducts, nextId, now),
          );
        case 'sales.draft.list':
          try {
            parseSalesDraftOpenRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesDraftListResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => listLocalSalesDrafts(apiRequest.payload, salesDrafts),
          );
        case 'sales.pos.prewarmCheckoutContext': {
          let prewarmInput;
          try {
            prewarmInput = parseSalesPosPrewarmCheckoutContextRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesPosPrewarmCheckoutContextResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => ({
              warmed: {
                shift: true,
                balances: new Set(prewarmInput.variantIds).size,
              },
              generatedAt: now().toISOString(),
            }),
          );
        }
        case 'sales.pos.complete':
          try {
            parseSalesPosCompleteRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesPosCompleteResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => completeLocalPosSale(apiRequest.payload, salesOrders, commandResults, catalogProducts, nextId, now),
          );
        case 'sales.order.list':
          try {
            parseSalesOrderListRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesOrderListResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => listLocalSalesOrders(apiRequest.payload, salesOrders, now),
          );
        case 'sales.order.get':
          try {
            parseSalesOrderDetailRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesOrderDetailResponse | undefined>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => getLocalSalesOrder(apiRequest.payload, salesOrders),
          );
        case 'sales.online.confirm':
        case 'sales.online.startPacking':
        case 'sales.online.ship':
        case 'sales.online.deliver':
          try {
            parseSalesOnlineTransitionRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesOnlineTransitionResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => transitionLocalOnlineSale(apiRequest.operation, apiRequest.payload, salesDrafts, salesOrders, commandResults, now),
          );
        case 'sales.online.cancel':
          try {
            parseSalesOnlineCancelRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesOnlineTransitionResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => transitionLocalOnlineSale(apiRequest.operation, apiRequest.payload, salesDrafts, salesOrders, commandResults, now),
          );
        case 'sales.return.create':
          try {
            parseSalesReturnCreateRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesReturnCreateResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalSalesReturn(apiRequest.payload, salesOrders, commandResults, nextId, now),
          );
        case 'sales.return.resolve':
          try {
            parseSalesReturnResolveRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesReturnResolveResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => resolveLocalSalesReturn(apiRequest.payload, salesOrders, commandResults, now),
          );
        case 'sales.warranty.open':
          try {
            parseSalesWarrantyOpenRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesWarrantyResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => openLocalWarranty(apiRequest.payload, salesOrders, commandResults, nextId, now),
          );
        case 'sales.warranty.transition':
          try {
            parseSalesWarrantyTransitionRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesWarrantyResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => transitionLocalWarranty(apiRequest.payload, salesOrders, commandResults, now),
          );
        case 'sales.exchange.create':
          try {
            parseSalesExchangeCreateRequest(apiRequest.payload);
          } catch {
            return errorResult<T>('INVALID_REQUEST', 'Yêu cầu không hợp lệ.', meta);
          }

          return withSession<T, SalesExchangeCreateResponse>(
            apiRequest,
            meta,
            sessions,
            now,
            user,
            () => createLocalExchange(apiRequest.payload, salesOrders, commandResults, catalogProducts, nextId, now),
          );
        default:
          return errorResult<T>('OPERATION_NOT_SUPPORTED', 'Thao tác chưa được hỗ trợ.', meta);
      }
    },
  };
}

function handleLogin<T>(
  request: ApiRequest,
  meta: ApiMeta,
  sessions: Map<string, LocalSession>,
  now: () => Date,
  nextId: (prefix: string) => string,
  user: LocalUser,
): ApiResult<T> {
  const payload = parseAuthLoginRequest(request.payload);

  if (payload.loginId !== user.loginId || payload.password !== user.password) {
    return errorResult<T>('INVALID_CREDENTIALS', 'Tài khoản hoặc mật khẩu không đúng.', meta);
  }

  const currentTime = now().getTime();
  const sessionToken = nextId('session');
  const actor = createLocalAdminActor(user.authVersion);
  const sessionTtlMs = payload.rememberSession === true ? 7 * 24 * 60 * 60 * 1000 : idleTtlMs;
  const absoluteSessionTtlMs = payload.rememberSession === true ? 7 * 24 * 60 * 60 * 1000 : absoluteTtlMs;
  const session: LocalSession = {
    sessionToken,
    actor,
    issuedAtMs: currentTime,
    idleExpiresAtMs: currentTime + sessionTtlMs,
    absoluteExpiresAtMs: currentTime + absoluteSessionTtlMs,
    revoked: false,
  };
  sessions.set(sessionToken, session);

  const response: AuthLoginResponse = {
    sessionToken,
    actor,
    currentScope: createLocalCurrentScope('Active'),
    idleExpiresAt: new Date(session.idleExpiresAtMs).toISOString(),
    absoluteExpiresAt: new Date(session.absoluteExpiresAtMs).toISOString(),
    passwordChangeRequired: user.passwordChangeRequired,
  };

  return successResult(response as T, meta);
}

function handleChangeOwnPassword(
  payload: unknown,
  meta: ApiMeta,
  user: LocalUser,
): ApiResult<AuthChangeOwnPasswordResponse> | AuthChangeOwnPasswordResponse {
  const input = parseAuthChangeOwnPasswordRequest(payload);

  if (input.currentPassword !== user.password) {
    return errorResult<AuthChangeOwnPasswordResponse>(
      'INVALID_CREDENTIALS',
      'Tài khoản hoặc mật khẩu không đúng.',
      meta,
    );
  }

  user.password = input.newPassword;
  user.passwordChangeRequired = false;
  user.authVersion += 1;

  return { changed: true, sessionRevoked: true };
}

function withSession<T, TData = unknown>(
  request: ApiRequest,
  meta: ApiMeta,
  sessions: Map<string, LocalSession>,
  now: () => Date,
  user: LocalUser,
  handler: (session: LocalSession) => TData | ApiResult<TData>,
): ApiResult<T> {
  if (request.sessionToken === undefined) {
    return errorResult<T>('SESSION_REQUIRED', 'Phiên đăng nhập là bắt buộc.', meta);
  }

  const session = sessions.get(request.sessionToken);
  const currentTime = now().getTime();

  if (
    session === undefined ||
    session.revoked ||
    session.actor.authVersion !== user.authVersion ||
    session.idleExpiresAtMs <= currentTime ||
    session.absoluteExpiresAtMs <= currentTime
  ) {
    return errorResult<T>('SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn.', meta);
  }

  session.idleExpiresAtMs = currentTime + idleTtlMs;
  const result = handler(session);

  if (isApiResult(result)) {
    return result as unknown as ApiResult<T>;
  }

  return successResult(result as unknown as T, meta);
}

function successResult<T>(data: T, meta: ApiMeta): ApiResult<T> {
  return { ok: true, data, meta };
}

function errorResult<T>(code: ApiErrorCode, message: string, meta: ApiMeta): ApiResult<T> {
  return {
    ok: false,
    error: { code, message },
    meta,
  };
}

function isApiResult<T>(value: T | ApiResult<T>): value is ApiResult<T> {
  return typeof value === 'object' && value !== null && 'ok' in value && 'meta' in value;
}

function createMeta(request: Pick<ApiRequest, 'requestId' | 'operation'>, startedAt: Date, finishedAt: Date): ApiMeta {
  return {
    requestId: request.requestId,
    operation: request.operation,
    serverTime: finishedAt.toISOString(),
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    stages: {},
    io: {},
  };
}

function createLocalAdminActor(authVersion: number): ActorContextDTO {
  return {
    userId: 'user-admin',
    loginId: 'admin',
    displayName: 'Admin Local',
    tenantId: 'tenant-default',
    authVersion,
    actions: [
      'platform.auth.logout',
      'platform.auth.changeOwnPassword',
      'platform.session.view',
      'platform.command.view',
      'platform.registry.view',
      'platform.scope.view',
      'platform.warehouse.update',
      'catalog.product.configure',
      'catalog.pos.view',
      'catalog.quote.view',
      'crm.customer.create',
      'crm.customer.view',
      'inventory.balance.view',
      'inventory.movement.create',
      'inventory.reserve',
      'inventory.release',
      'inventory.return.process',
      'finance.shift.manage',
      'finance.payment.record',
      'finance.payment.reverse',
      'finance.expense.approve',
      'finance.summary.view',
      'purchasing.supplier.manage',
      'purchasing.po.manage',
      'purchasing.receipt.manage',
      'purchasing.cost.adjust',
      'purchasing.supplierReturn.manage',
      'sales.draft.manage',
      'sales.pos.complete',
      'sales.order.view',
      'sales.online.manage',
      'sales.return.process',
      'sales.warranty.manage',
      'reporting.dashboard.view',
      'reporting.report.view',
      'reporting.export',
      'operations.import.manage',
      'operations.attachment.manage',
      'operations.attachment.view',
      'operations.backup.manage',
      'operations.restore.manage',
      'operations.health.view',
      'operations.partition.manage',
      'operations.runtime.cleanup',
    ],
    scope: {
      tenantId: 'tenant-default',
      branchIds: ['branch-default'],
      warehouseIds: ['warehouse-default'],
    },
  };
}

export function createLocalDebugActor(): ActorContextDTO {
  return createLocalAdminActor(1);
}

function createLocalCatalogProducts(): [string, CatalogProductListItemDTO][] {
  return [
    createLocalCatalogProductItem({
      productId: 'product-milk',
      productCode: 'SP-001',
      productName: 'Sữa hạt óc chó 1L',
      variantId: 'variant-milk-1l',
      sku: 'SH-OC-1L',
      barcode: '893000000001',
      defaultUnitId: 'chai',
      unitPriceVnd: 42000,
      serialTracking: false,
    }),
    createLocalCatalogProductItem({
      productId: 'product-laundry',
      productCode: 'SP-002',
      productName: 'Nước giặt sinh học hương hoa 3,6kg',
      variantId: 'variant-laundry-36',
      sku: 'NG-SH-3600',
      barcode: '893000000002',
      defaultUnitId: 'túi',
      unitPriceVnd: 185000,
      serialTracking: false,
    }),
    createLocalCatalogProductItem({
      productId: 'product-filter',
      productCode: 'SP-003',
      productName: 'Lõi lọc nước gia dụng',
      variantId: 'variant-filter-210',
      sku: 'GD-FL-210',
      barcode: '893000000003',
      defaultUnitId: 'Bộ',
      unitPriceVnd: 285000,
      serialTracking: true,
    }),
    createLocalCatalogProductItem({
      productId: 'product-shirt',
      productCode: 'SP-004',
      productName: 'Áo thun cổ tròn basic',
      variantId: 'variant-shirt-basic',
      sku: 'FA-TS-018',
      barcode: '893000000004',
      defaultUnitId: 'Cái',
      unitPriceVnd: 159000,
      serialTracking: false,
    }),
  ].map((item) => [item.variantId, item]);
}

function createLocalCatalogProductItem(input: {
  productId: string;
  productCode: string;
  productName: string;
  variantId: string;
  sku: string;
  barcode?: string;
  defaultUnitId: string;
  unitPriceVnd: number;
  serialTracking: boolean;
}): CatalogProductListItemDTO {
  return {
    ...input,
    productType: 'Stocked',
    displayName: input.productName,
    inventoryMode: 'Tracked',
    lotTracking: false,
    isActive: true,
  };
}

function createLocalCatalogProjection(
  products: Map<string, CatalogProductListItemDTO>,
  now: () => Date,
): CatalogPosProjectionResponse {
  return {
    projectionVersion: `local-catalog-v${products.size}`,
    branchId: 'branch-default',
    warehouseId: 'warehouse-default',
    generatedAt: now().toISOString(),
    variants: [...products.values()]
      .filter((product) => product.isActive)
      .map((product) => ({
        variantId: product.variantId,
        productId: product.productId,
        sku: product.sku,
        displayName: product.displayName,
        barcode: product.barcode,
        unitVersionId: `unit-${product.variantId}-v1`,
        unitName: product.defaultUnitId,
        unitPriceVnd: product.unitPriceVnd,
        saleEnabled: true,
        inventoryMode: product.inventoryMode,
        lotTracking: product.lotTracking,
        serialTracking: product.serialTracking,
        isActive: product.isActive,
      })),
  };
}

function listLocalCatalogProducts(
  input: CatalogProductListRequest,
  products: Map<string, CatalogProductListItemDTO>,
  now: () => Date,
): CatalogProductListResponse {
  const status = input.status ?? 'Active';
  const query = input.query?.trim().toLocaleUpperCase('vi-VN');
  const items = [...products.values()]
    .filter((item) => {
      if (status === 'Active' && !item.isActive) return false;
      if (status === 'Inactive' && item.isActive) return false;
      if (!query) return true;
      return [
        item.productCode,
        item.productName,
        item.displayName,
        item.sku,
        item.barcode ?? '',
        item.defaultUnitId,
      ].some((value) => value.toLocaleUpperCase('vi-VN').includes(query));
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'vi-VN'))
    .slice(0, input.limit ?? 100);

  return {
    generatedAt: now().toISOString(),
    items,
  };
}

function createLocalCatalogProduct(
  input: CatalogCreateProductRequest,
  products: Map<string, CatalogProductListItemDTO>,
  nextId: (prefix: string) => string,
): CatalogCreateProductResponse | ApiResult<CatalogCreateProductResponse> {
  const skuNormalized = input.sku.trim().toLocaleUpperCase('vi-VN');
  const barcodeNormalized = input.barcode?.trim().toLocaleUpperCase('vi-VN');
  if ([...products.values()].some((item) => item.sku.toLocaleUpperCase('vi-VN') === skuNormalized)) {
    return localCatalogError('DUPLICATE_SKU', 'SKU đã tồn tại.');
  }
  if (
    barcodeNormalized &&
    [...products.values()].some((item) => item.barcode?.toLocaleUpperCase('vi-VN') === barcodeNormalized)
  ) {
    return localCatalogError('DUPLICATE_BARCODE', 'Barcode đã tồn tại.');
  }

  const productId = nextId('product');
  const variantId = nextId('variant');
  const item: CatalogProductListItemDTO = {
    productId,
    productCode: input.productCode.trim(),
    productName: input.name.trim(),
    productType: input.productType,
    variantId,
    sku: input.sku.trim(),
    displayName: input.name.trim(),
    barcode: input.barcode?.trim(),
    defaultUnitId: input.defaultUnitId.trim(),
    unitPriceVnd: input.unitPriceVnd,
    inventoryMode: input.inventoryMode ?? (input.productType === 'Service' || input.productType === 'NonStock' ? 'NotTracked' : input.productType === 'Bundle' ? 'Bundle' : 'Tracked'),
    lotTracking: input.lotTracking ?? false,
    serialTracking: input.serialTracking ?? false,
    isActive: true,
  };
  products.set(variantId, item);

  return catalogItemToCreateResponse(item);
}

function updateLocalCatalogProduct(
  input: CatalogUpdateProductRequest,
  products: Map<string, CatalogProductListItemDTO>,
): CatalogUpdateProductResponse | ApiResult<CatalogUpdateProductResponse> {
  const current = findLocalDefaultCatalogItem(products, input.productId);
  if (current === undefined) {
    return localCatalogError('INVALID_INPUT', 'Sản phẩm không tồn tại.');
  }

  const nextSku = input.sku?.trim() ?? current.sku;
  const nextBarcode = input.barcode?.trim() ?? current.barcode;
  const skuNormalized = nextSku.toLocaleUpperCase('vi-VN');
  const barcodeNormalized = nextBarcode?.toLocaleUpperCase('vi-VN');
  if (
    [...products.values()].some(
      (item) => item.variantId !== current.variantId && item.sku.toLocaleUpperCase('vi-VN') === skuNormalized,
    )
  ) {
    return localCatalogError('DUPLICATE_SKU', 'SKU đã tồn tại.');
  }
  if (
    barcodeNormalized &&
    [...products.values()].some(
      (item) =>
        item.variantId !== current.variantId &&
        item.barcode?.toLocaleUpperCase('vi-VN') === barcodeNormalized,
    )
  ) {
    return localCatalogError('DUPLICATE_BARCODE', 'Barcode đã tồn tại.');
  }

  const nextName = input.name?.trim() ?? current.displayName;
  const updated: CatalogProductListItemDTO = {
    ...current,
    productCode: input.productCode?.trim() ?? current.productCode,
    productName: nextName,
    productType: input.productType ?? current.productType,
    displayName: nextName,
    sku: nextSku,
    barcode: nextBarcode,
    defaultUnitId: input.defaultUnitId?.trim() ?? current.defaultUnitId,
    inventoryMode: input.inventoryMode ?? current.inventoryMode,
    unitPriceVnd: input.unitPriceVnd ?? current.unitPriceVnd,
    lotTracking: input.lotTracking ?? current.lotTracking,
    serialTracking: input.serialTracking ?? current.serialTracking,
  };
  products.set(updated.variantId, updated);

  return catalogItemToUpdateResponse(updated);
}

function setLocalCatalogProductActive(
  input: CatalogSetProductActiveRequest,
  products: Map<string, CatalogProductListItemDTO>,
): CatalogSetProductActiveResponse | ApiResult<CatalogSetProductActiveResponse> {
  const current = findLocalDefaultCatalogItem(products, input.productId);
  if (current === undefined) {
    return localCatalogError('INVALID_INPUT', 'Sản phẩm không tồn tại.');
  }

  const variants = [...products.values()].filter((item) => item.productId === input.productId);
  for (const variant of variants) {
    products.set(variant.variantId, { ...variant, isActive: input.isActive });
  }
  const updated: CatalogProductListItemDTO = { ...current, isActive: input.isActive };

  return {
    product: catalogItemToProduct(updated),
    defaultVariant: catalogItemToVariant(updated),
  };
}

function createLocalCatalogVariant(
  input: CatalogCreateVariantRequest,
  products: Map<string, CatalogProductListItemDTO>,
  nextId: (prefix: string) => string,
): CatalogCreateVariantResponse | ApiResult<CatalogCreateVariantResponse> {
  const product = findLocalDefaultCatalogItem(products, input.productId);
  if (product === undefined) {
    return localCatalogError('INVALID_INPUT', 'Sản phẩm không tồn tại.');
  }
  const skuNormalized = normalizeLocalCatalogLookup(input.sku);
  const barcodeNormalized = input.barcode === undefined ? undefined : normalizeLocalCatalogLookup(input.barcode);
  if ([...products.values()].some((item) => normalizeLocalCatalogLookup(item.sku) === skuNormalized)) {
    return localCatalogError('DUPLICATE_SKU', 'SKU đã tồn tại.');
  }
  if (
    barcodeNormalized !== undefined &&
    [...products.values()].some((item) => item.barcode !== undefined && normalizeLocalCatalogLookup(item.barcode) === barcodeNormalized)
  ) {
    return localCatalogError('DUPLICATE_BARCODE', 'Barcode đã tồn tại.');
  }

  const variantId = nextId('variant');
  const item: CatalogProductListItemDTO = {
    ...product,
    variantId,
    sku: input.sku.trim(),
    displayName: input.displayName.trim(),
    barcode: input.barcode?.trim(),
    defaultUnitId: input.defaultUnitId.trim(),
    unitPriceVnd: input.unitPriceVnd,
    inventoryMode: input.inventoryMode ?? product.inventoryMode,
    lotTracking: input.lotTracking ?? false,
    serialTracking: input.serialTracking ?? false,
    isActive: product.isActive,
  };
  products.set(variantId, item);

  return {
    product: catalogItemToProduct(product),
    variant: catalogItemToVariant(item),
    unit: catalogItemToUnit(item, input.unitFactor ?? 1, input.saleEnabled ?? true, input.purchaseEnabled),
    barcode: item.barcode ? catalogItemToBarcode(item) : undefined,
  };
}

function updateLocalCatalogVariant(
  input: CatalogUpdateVariantRequest,
  products: Map<string, CatalogProductListItemDTO>,
): CatalogUpdateVariantResponse | ApiResult<CatalogUpdateVariantResponse> {
  const current = products.get(input.variantId);
  if (current === undefined) {
    return localCatalogError('INVALID_INPUT', 'Biến thể không tồn tại.');
  }
  const nextSku = input.sku?.trim() ?? current.sku;
  const nextBarcode = input.barcode?.trim() ?? current.barcode;
  const skuNormalized = normalizeLocalCatalogLookup(nextSku);
  const barcodeNormalized = nextBarcode === undefined ? undefined : normalizeLocalCatalogLookup(nextBarcode);
  if (
    [...products.values()].some(
      (item) => item.variantId !== current.variantId && normalizeLocalCatalogLookup(item.sku) === skuNormalized,
    )
  ) {
    return localCatalogError('DUPLICATE_SKU', 'SKU đã tồn tại.');
  }
  if (
    barcodeNormalized !== undefined &&
    [...products.values()].some(
      (item) =>
        item.variantId !== current.variantId &&
        item.barcode !== undefined &&
        normalizeLocalCatalogLookup(item.barcode) === barcodeNormalized,
    )
  ) {
    return localCatalogError('DUPLICATE_BARCODE', 'Barcode đã tồn tại.');
  }

  const updated: CatalogProductListItemDTO = {
    ...current,
    displayName: input.displayName?.trim() ?? current.displayName,
    sku: nextSku,
    barcode: nextBarcode,
    defaultUnitId: input.defaultUnitId?.trim() ?? current.defaultUnitId,
    unitPriceVnd: input.unitPriceVnd ?? current.unitPriceVnd,
    inventoryMode: input.inventoryMode ?? current.inventoryMode,
    lotTracking: input.lotTracking ?? current.lotTracking,
    serialTracking: input.serialTracking ?? current.serialTracking,
  };
  products.set(updated.variantId, updated);

  return {
    product: catalogItemToProduct(updated),
    variant: catalogItemToVariant(updated),
    unit: catalogItemToUnit(updated, input.unitFactor),
    barcode: updated.barcode ? catalogItemToBarcode(updated) : undefined,
  };
}

function setLocalCatalogVariantActive(
  input: CatalogSetVariantActiveRequest,
  products: Map<string, CatalogProductListItemDTO>,
): CatalogSetVariantActiveResponse | ApiResult<CatalogSetVariantActiveResponse> {
  const current = products.get(input.variantId);
  if (current === undefined) {
    return localCatalogError('INVALID_INPUT', 'Biến thể không tồn tại.');
  }
  const updated = { ...current, isActive: input.isActive };
  products.set(updated.variantId, updated);
  const product = findLocalDefaultCatalogItem(products, updated.productId) ?? updated;
  return {
    product: { ...catalogItemToProduct(product), isActive: true },
    variant: catalogItemToVariant(updated),
  };
}

function catalogItemToCreateResponse(item: CatalogProductListItemDTO): CatalogCreateProductResponse {
  return {
    product: catalogItemToProduct(item),
    defaultVariant: catalogItemToVariant(item),
    defaultUnit: catalogItemToUnit(item),
    barcode: item.barcode ? catalogItemToBarcode(item) : undefined,
  };
}

function catalogItemToUpdateResponse(item: CatalogProductListItemDTO): CatalogUpdateProductResponse {
  return {
    product: catalogItemToProduct(item),
    defaultVariant: catalogItemToVariant(item),
    barcode: item.barcode ? catalogItemToBarcode(item) : undefined,
  };
}

function catalogItemToProduct(item: CatalogProductListItemDTO): ProductDTO {
  return {
    productId: item.productId,
    tenantId: 'tenant-default',
    productCode: item.productCode,
    name: item.productName,
    productType: item.productType,
    isActive: item.isActive,
  };
}

function catalogItemToVariant(item: CatalogProductListItemDTO): VariantDTO {
  return {
    variantId: item.variantId,
    tenantId: 'tenant-default',
    productId: item.productId,
    sku: item.sku,
    skuNormalized: item.sku.toLocaleUpperCase('vi-VN'),
    displayName: item.displayName,
    inventoryMode: item.inventoryMode,
    lotTracking: item.lotTracking,
    serialTracking: item.serialTracking,
    defaultUnitId: item.defaultUnitId,
    isActive: item.isActive,
    unitPriceVnd: item.unitPriceVnd,
  };
}

function catalogItemToUnit(
  item: CatalogProductListItemDTO,
  factor = 1,
  saleEnabled = true,
  purchaseEnabled?: boolean,
): UnitConversionVersionDTO {
  return {
    unitVersionId: `unit-${item.variantId}-v1`,
    tenantId: 'tenant-default',
    variantId: item.variantId,
    unitId: item.defaultUnitId,
    unitName: item.defaultUnitId,
    baseUnitId: item.defaultUnitId,
    factor,
    saleEnabled,
    purchaseEnabled: purchaseEnabled ?? item.inventoryMode === 'Tracked',
    effectiveFrom: '2026-07-27T00:00:00.000Z',
    isActive: item.isActive,
  };
}

function findLocalDefaultCatalogItem(
  products: Map<string, CatalogProductListItemDTO>,
  productId: string,
): CatalogProductListItemDTO | undefined {
  return [...products.values()].find((item) => item.productId === productId);
}

function normalizeLocalCatalogLookup(value: string): string {
  return value.trim().toLocaleUpperCase('vi-VN');
}

function catalogItemToBarcode(item: CatalogProductListItemDTO): VariantBarcodeDTO | undefined {
  if (!item.barcode) return undefined;
  return {
    barcodeId: `barcode-${item.variantId}`,
    tenantId: 'tenant-default',
    variantId: item.variantId,
    unitVersionId: `unit-${item.variantId}-v1`,
    barcode: item.barcode,
    barcodeNormalized: item.barcode.toLocaleUpperCase('vi-VN'),
    barcodeKind: 'Manufacturer',
    isActive: item.isActive,
  };
}

function localCatalogError<T>(code: ApiErrorCode, message: string): ApiResult<T> {
  return {
    ok: false,
    error: { code, message },
    meta: {
      requestId: 'local-catalog-inline',
      operation: 'local.catalog',
      serverTime: '2026-07-27T00:00:00.000Z',
      durationMs: 0,
      stages: {},
      io: {},
    },
  };
}

function createLocalQuote(
  input: CatalogQuoteRequest,
  products: Map<string, CatalogProductListItemDTO>,
  now: () => Date,
): CatalogQuoteResponse {
  const projection = createLocalCatalogProjection(products, now);
  const lines = input.lines.map((line) => {
    const variant = projection.variants.find((candidate) => candidate.variantId === line.variantId);
    const unitPriceVnd = variant?.unitPriceVnd ?? 0;
    const lineSubtotalVnd = Math.round(unitPriceVnd * line.quantity);

    return {
      lineId: line.lineId,
      variantId: line.variantId,
      quantity: line.quantity,
      unitPriceVnd,
      lineSubtotalVnd,
      lineDiscountVnd: 0,
      lineTotalVnd: lineSubtotalVnd,
    };
  });
  const subtotalVnd = lines.reduce((sum, line) => sum + line.lineSubtotalVnd, 0);

  return {
    quoteVersion: `quote-${input.branchId}-${subtotalVnd}-0`,
    subtotalVnd,
    discountVnd: 0,
    totalVnd: subtotalVnd,
    lines,
    applications: [],
    rejections: [],
  };
}

function saveLocalSalesDraft(
  payload: unknown,
  drafts: Map<string, SalesDraftSaveResponse>,
  orders: Map<string, SalesOrderDetailResponse>,
  catalogProducts: Map<string, CatalogProductListItemDTO>,
  nextId: (prefix: string) => string,
  now: () => Date,
): SalesDraftSaveResponse {
  const input = parseSalesDraftSaveRequest(payload);
  const draftId = input.draftId ?? nextId('sale-draft');
  const quote = createLocalQuote(
    {
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      customerId: input.customerId,
      lines: input.lines.map((line) => ({
        lineId: line.lineId,
        variantId: line.variantId,
        unitVersionId: line.unitVersionId,
        quantity: line.quantity,
      })),
    },
    catalogProducts,
    now,
  );
  const response: SalesDraftSaveResponse = {
    order: {
      saleOrderId: draftId,
      tenantId: 'tenant-default',
      businessNumber: `SO-${draftId.toLocaleUpperCase('vi-VN')}`,
      source: input.source ?? 'POS',
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      status: 'Draft',
      paymentStatus: resolveLocalPaymentStatus(quote.totalVnd, tenderTotal(input.tenders)),
      customerId: input.customerId,
      cashierId: input.cashierId,
      subtotalVnd: quote.subtotalVnd,
      discountVnd: quote.discountVnd,
      taxVnd: 0,
      shippingFeeVnd: 0,
      totalVnd: quote.totalVnd,
      paidVnd: tenderTotal(input.tenders),
      receivableVnd: Math.max(0, quote.totalVnd - tenderTotal(input.tenders)),
      quoteVersion: quote.quoteVersion,
      draftVersion: 1,
      createdAt: now().toISOString(),
      updatedAt: now().toISOString(),
      recipient: input.recipient,
    },
    lines: input.lines.map((line) => toLocalSaleLine(draftId, line, catalogProducts, now)),
    tenders: input.tenders.map((tender) => ({
      ...tender,
      saleOrderId: draftId,
      tenderDraftId: nextId('sale-tender-draft'),
    })),
  };
  drafts.set(draftId, response);
  orders.set(draftId, {
    ...response,
    receipt: undefined,
    returns: [],
    warrantyCases: [],
  });
  return response;
}

function listLocalSalesDrafts(payload: unknown, drafts: Map<string, SalesDraftSaveResponse>): SalesDraftListResponse {
  const input = parseSalesDraftOpenRequest(payload);
  return {
    drafts: [...drafts.values()].filter(
      (draft) =>
        draft.order.status === 'Draft' &&
        draft.order.branchId === input.branchId &&
        draft.order.warehouseId === input.warehouseId,
    ),
  };
}

function listLocalSalesOrders(
  payload: unknown,
  orders: Map<string, SalesOrderDetailResponse>,
  now: () => Date,
): SalesOrderListResponse {
  const input = parseSalesOrderListRequest(payload);
  return {
    generatedAt: now().toISOString(),
    orders: [...orders.values()]
      .filter((detail) => {
        if (detail.order.branchId !== input.branchId) return false;
        if (input.warehouseId !== undefined && detail.order.warehouseId !== input.warehouseId) return false;
        if (input.statuses !== undefined && !input.statuses.includes(detail.order.status)) return false;
        if (input.sources !== undefined && !input.sources.includes(detail.order.source)) return false;
        return true;
      })
      .slice(0, input.limit ?? 50)
      .map((detail) => ({
        order: detail.order,
        lineCount: detail.lines.length,
        returnedLineCount: detail.returns.reduce((sum, returnOrder) => sum + returnOrder.lines.length, 0),
        warrantyCaseCount: detail.warrantyCases.length,
      })),
  };
}

function getLocalSalesOrder(
  payload: unknown,
  orders: Map<string, SalesOrderDetailResponse>,
): SalesOrderDetailResponse | undefined {
  const input = parseSalesOrderDetailRequest(payload);
  return orders.get(input.saleOrderId);
}

function transitionLocalOnlineSale(
  operation: string,
  payload: unknown,
  drafts: Map<string, SalesDraftSaveResponse>,
  orders: Map<string, SalesOrderDetailResponse>,
  commandResults: Map<string, unknown>,
  now: () => Date,
): ApiResult<SalesOnlineTransitionResponse> | SalesOnlineTransitionResponse {
  const input =
    operation === 'sales.online.cancel'
      ? parseSalesOnlineCancelRequest(payload)
      : parseSalesOnlineTransitionRequest(payload);
  const existing = commandResults.get(input.idempotencyKey);
  if (existing !== undefined) return existing as SalesOnlineTransitionResponse;

  const detail = orders.get(input.saleOrderId);
  if (detail === undefined || detail.order.source !== 'ManualOnline') {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy đơn online.', operation, now);
  }

  const nextStatus = resolveLocalOnlineNextStatus(operation, detail.order.status);
  if (nextStatus === undefined) {
    return localOperationError('INVALID_INPUT', 'Trạng thái đơn online không hợp lệ.', operation, now);
  }

  const timestamp = now().toISOString();
  const order = {
    ...detail.order,
    status: nextStatus,
    updatedAt: timestamp,
    confirmedAt: nextStatus === 'Confirmed' ? timestamp : detail.order.confirmedAt,
    packingAt: nextStatus === 'Packing' ? timestamp : detail.order.packingAt,
    shippedAt: nextStatus === 'Shipped' ? timestamp : detail.order.shippedAt,
    deliveredAt: nextStatus === 'Delivered' ? timestamp : detail.order.deliveredAt,
    cancelledAt: nextStatus === 'Cancelled' ? timestamp : detail.order.cancelledAt,
    receivableVnd: nextStatus === 'Shipped' ? Math.max(0, detail.order.totalVnd - detail.order.paidVnd) : detail.order.receivableVnd,
  };
  const nextDetail: SalesOrderDetailResponse = { ...detail, order };
  orders.set(order.saleOrderId, nextDetail);
  drafts.delete(order.saleOrderId);

  const response: SalesOnlineTransitionResponse = {
    order,
    inventoryMovements: [],
    receivable:
      nextStatus === 'Shipped' && order.receivableVnd > 0
        ? {
            obligationId: `local-obligation-${order.saleOrderId}`,
            tenantId: 'tenant-default',
            branchId: order.branchId,
            obligationType: 'Receivable',
            partyId: order.customerId ?? 'walk-in',
            sourceDocument: { sourceType: 'SaleOrder', sourceId: order.saleOrderId },
            dueDate: now().toISOString().slice(0, 10),
            originalAmountVnd: order.receivableVnd,
            allocatedAmountVnd: 0,
            remainingAmountVnd: order.receivableVnd,
            status: 'Open',
          }
        : undefined,
  };
  if (operation === 'sales.online.cancel' && order.paidVnd > 0) {
    const cancelInput = input as ReturnType<typeof parseSalesOnlineCancelRequest>;
    const sourceDocument = { sourceType: 'SaleOrder' as const, sourceId: order.saleOrderId };
    if ((cancelInput.depositTreatment ?? 'KeepCustomerCredit') === 'KeepCustomerCredit') {
      if (order.customerId === undefined) {
        return localOperationError('INVALID_INPUT', 'Giữ tiền cọc thành tín dụng khách cần có khách hàng trên đơn.', operation, now);
      }
      response.customerCredit = {
        creditId: `local-credit-${order.saleOrderId}`,
        tenantId: 'tenant-default',
        branchId: order.branchId,
        customerId: order.customerId,
        sourcePaymentId: order.saleOrderId,
        sourceDocument,
        amountVnd: order.paidVnd,
        consumedAmountVnd: 0,
        status: 'Open',
      } satisfies CustomerCreditDTO;
    } else {
      if (
        cancelInput.cashDrawerId === undefined ||
        cancelInput.paymentMethodId === undefined ||
        cancelInput.approverId === undefined
      ) {
        return localOperationError('INVALID_INPUT', 'Hoàn tiền cọc cần quỹ, phương thức thanh toán và người duyệt.', operation, now);
      }
      const payment: PaymentDTO = {
        paymentId: `local-refund-payment-${order.saleOrderId}`,
        tenantId: 'tenant-default',
        branchId: order.branchId,
        cashDrawerId: cancelInput.cashDrawerId,
        paymentMethodId: cancelInput.paymentMethodId,
        amountVnd: -order.paidVnd,
        payerType: order.customerId === undefined ? 'Other' : 'Customer',
        payerId: order.customerId,
        sourceDocument,
        status: 'Approved',
        effectiveAt: timestamp,
        shiftId: cancelInput.shiftId,
      };
      const cashTransaction: CashTransactionDTO = {
        cashTransactionId: `local-refund-cash-${order.saleOrderId}`,
        tenantId: 'tenant-default',
        branchId: order.branchId,
        cashDrawerId: cancelInput.cashDrawerId,
        transactionType: 'Refund',
        amountVnd: -order.paidVnd,
        effectiveAt: timestamp,
        paymentId: payment.paymentId,
        sourceDocument,
        actorId: cancelInput.approverId,
        approverId: cancelInput.approverId,
        shiftId: cancelInput.shiftId,
        idempotencyKey: `${cancelInput.idempotencyKey}-deposit-refund`,
      };
      response.financeResult = {
        payment,
        cashTransaction,
        allocations: [],
        obligations: [],
      } satisfies FinancePaymentRecordResponse;
    }
  }
  commandResults.set(input.idempotencyKey, response);
  return response;
}

function resolveLocalOnlineNextStatus(
  operation: string,
  current: SalesOrderDetailResponse['order']['status'],
): SaleOrderStatus | undefined {
  if (operation === 'sales.online.confirm' && current === 'Draft') return 'Confirmed';
  if (operation === 'sales.online.startPacking' && current === 'Confirmed') return 'Packing';
  if (operation === 'sales.online.ship' && (current === 'Confirmed' || current === 'Packing')) return 'Shipped';
  if (operation === 'sales.online.deliver' && current === 'Shipped') return 'Delivered';
  if (operation === 'sales.online.cancel' && (current === 'Draft' || current === 'Confirmed' || current === 'Packing')) return 'Cancelled';
  return undefined;
}

function createLocalSalesReturn(
  payload: unknown,
  orders: Map<string, SalesOrderDetailResponse>,
  commandResults: Map<string, unknown>,
  nextId: (prefix: string) => string,
  now: () => Date,
): ApiResult<SalesReturnCreateResponse> | SalesReturnCreateResponse {
  const input = parseSalesReturnCreateRequest(payload);
  const existing = commandResults.get(input.idempotencyKey);
  if (existing !== undefined) return existing as SalesReturnCreateResponse;

  const sourceDetail = input.sourceSaleOrderId === undefined ? undefined : orders.get(input.sourceSaleOrderId);
  if (input.fastReturn === true && input.fastReturnApproved !== true) {
    return localOperationError('PERMISSION_DENIED', 'Fast return cần quyền phê duyệt riêng.', 'sales.return.create', now);
  }
  if (input.sourceSaleOrderId !== undefined && sourceDetail === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy đơn gốc để trả hàng.', 'sales.return.create', now);
  }
  if (sourceDetail !== undefined && !['Completed', 'Shipped', 'Delivered'].includes(sourceDetail.order.status)) {
    return localOperationError('INVALID_INPUT', 'Chỉ trả hàng cho đơn đã hoàn tất hoặc đã xuất giao.', 'sales.return.create', now);
  }

  const returnId = nextId('sale-return');
  const sourceLinesById = new Map(sourceDetail?.lines.map((line) => [line.saleOrderLineId, line]) ?? []);
  const lines = input.lines.map((line) => {
    const sourceLine = line.sourceSaleLineId === undefined ? undefined : sourceLinesById.get(line.sourceSaleLineId);
    if (line.sourceSaleLineId !== undefined && sourceLine === undefined) {
      throw new Error(`Missing local source line ${line.sourceSaleLineId}`);
    }
    return {
      ...line,
      returnId,
      returnLineId: nextId('sale-return-line'),
      refundVnd: line.refundVnd ?? Math.round((sourceLine?.unitPriceVnd ?? 0) * line.quantity),
      unitCostVnd: line.unitCostVnd ?? sourceLine?.costVnd ?? 0,
    };
  });
  const returnOrder: SalesReturnDTO = {
    returnId,
    tenantId: 'tenant-default',
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    customerId: input.customerId ?? sourceDetail?.order.customerId,
    sourceSaleOrderId: input.sourceSaleOrderId,
    status: 'ReceivedForInspection',
    returnType: input.fastReturn === true ? 'FastReturn' : 'SourceReturn',
    reason: input.reason,
    receivedAt: now().toISOString(),
    actorId: input.actorId,
    lines,
  };
  const response: SalesReturnCreateResponse = { returnOrder, inventoryMovements: [] };
  if (sourceDetail !== undefined) {
    orders.set(sourceDetail.order.saleOrderId, {
      ...sourceDetail,
      returns: [...sourceDetail.returns, returnOrder],
    });
  }
  commandResults.set(input.idempotencyKey, response);
  return response;
}

function resolveLocalSalesReturn(
  payload: unknown,
  orders: Map<string, SalesOrderDetailResponse>,
  commandResults: Map<string, unknown>,
  now: () => Date,
): ApiResult<SalesReturnResolveResponse> | SalesReturnResolveResponse {
  const input = parseSalesReturnResolveRequest(payload);
  const existing = commandResults.get(input.idempotencyKey);
  if (existing !== undefined) return existing as SalesReturnResolveResponse;

  const found = findLocalReturn(input.returnId, orders);
  if (found === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy phiếu trả hàng.', 'sales.return.resolve', now);
  }
  if (found.returnOrder.status !== 'ReceivedForInspection') {
    return localOperationError('INVALID_INPUT', 'Phiếu trả hàng không còn ở trạng thái chờ xử lý.', 'sales.return.resolve', now);
  }

  const dispositions = new Map(input.lines.map((line) => [line.returnLineId, line.disposition]));
  const nextReturnOrder: SalesReturnDTO = {
    ...found.returnOrder,
    status: 'Resolved',
    resolvedAt: now().toISOString(),
    lines: found.returnOrder.lines.map((line) => ({
      ...line,
      disposition: dispositions.get(line.returnLineId) ?? line.disposition,
    })),
  };
  const nextDetail: SalesOrderDetailResponse = {
    ...found.detail,
    returns: found.detail.returns.map((returnOrder) =>
      returnOrder.returnId === nextReturnOrder.returnId ? nextReturnOrder : returnOrder,
    ),
  };
  orders.set(nextDetail.order.saleOrderId, nextDetail);

  const response: SalesReturnResolveResponse = {
    returnOrder: nextReturnOrder,
    inventoryMovements: [],
  };
  if (input.financialAction?.treatment === 'CustomerCredit' && input.financialAction.amountVnd > 0) {
    response.customerCredit = {
      creditId: `local-return-credit-${nextReturnOrder.returnId}`,
      tenantId: nextReturnOrder.tenantId,
      branchId: nextReturnOrder.branchId,
      customerId: nextReturnOrder.customerId ?? 'walk-in',
      sourcePaymentId: nextReturnOrder.returnId,
      sourceDocument: { sourceType: 'SaleReturn', sourceId: nextReturnOrder.returnId },
      amountVnd: input.financialAction.amountVnd,
      consumedAmountVnd: 0,
      status: 'Open',
    } satisfies CustomerCreditDTO;
  }
  if (input.financialAction?.treatment === 'Refund' && input.financialAction.amountVnd > 0) {
    const sourceDocument = { sourceType: 'SaleReturn' as const, sourceId: nextReturnOrder.returnId };
    const payment: PaymentDTO = {
      paymentId: `local-return-refund-payment-${nextReturnOrder.returnId}`,
      tenantId: nextReturnOrder.tenantId,
      branchId: nextReturnOrder.branchId,
      cashDrawerId: input.financialAction.cashDrawerId ?? 'drawer-main',
      paymentMethodId: input.financialAction.paymentMethodId ?? 'cash',
      amountVnd: -input.financialAction.amountVnd,
      payerType: nextReturnOrder.customerId === undefined ? 'Other' : 'Customer',
      payerId: nextReturnOrder.customerId,
      sourceDocument,
      status: 'Approved',
      effectiveAt: now().toISOString(),
    };
    response.financeResult = {
      payment,
      cashTransaction: {
        cashTransactionId: `local-return-refund-cash-${nextReturnOrder.returnId}`,
        tenantId: nextReturnOrder.tenantId,
        branchId: nextReturnOrder.branchId,
        cashDrawerId: payment.cashDrawerId,
        transactionType: 'Refund',
        amountVnd: payment.amountVnd,
        effectiveAt: payment.effectiveAt,
        paymentId: payment.paymentId,
        sourceDocument,
        actorId: input.financialAction.approverId ?? input.actorId,
        approverId: input.financialAction.approverId,
        idempotencyKey: `${input.idempotencyKey}-refund`,
      },
      allocations: [],
      obligations: [],
    } satisfies FinancePaymentRecordResponse;
  }

  commandResults.set(input.idempotencyKey, response);
  return response;
}

function findLocalReturn(
  returnId: string,
  orders: Map<string, SalesOrderDetailResponse>,
): { detail: SalesOrderDetailResponse; returnOrder: SalesReturnDTO } | undefined {
  for (const detail of orders.values()) {
    const returnOrder = detail.returns.find((candidate) => candidate.returnId === returnId);
    if (returnOrder !== undefined) return { detail, returnOrder };
  }
  return undefined;
}

function openLocalWarranty(
  payload: unknown,
  orders: Map<string, SalesOrderDetailResponse>,
  commandResults: Map<string, unknown>,
  nextId: (prefix: string) => string,
  now: () => Date,
): ApiResult<SalesWarrantyResponse> | SalesWarrantyResponse {
  const input = parseSalesWarrantyOpenRequest(payload);
  const existing = commandResults.get(input.idempotencyKey);
  if (existing !== undefined) return existing as SalesWarrantyResponse;

  const detail = orders.get(input.saleOrderId);
  if (detail === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy đơn bán gốc để mở bảo hành.', 'sales.warranty.open', now);
  }

  const sourceLine = detail.lines.find((line) => line.saleOrderLineId === input.saleLineId);
  if (sourceLine === undefined || sourceLine.variantId !== input.variantId) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy dòng hàng/serial để bảo hành.', 'sales.warranty.open', now);
  }

  const warrantyCase: WarrantyCaseDTO = {
    warrantyCaseId: nextId('warranty-case'),
    tenantId: 'tenant-default',
    customerId: input.customerId,
    saleOrderId: input.saleOrderId,
    saleLineId: input.saleLineId,
    variantId: input.variantId,
    serialId: input.serialId,
    policyVersionId: input.policyVersionId,
    receivedAt: now().toISOString(),
    status: 'Open',
    issue: input.issue,
    attachmentIds: [...(input.attachmentIds ?? [])],
  };
  const response: SalesWarrantyResponse = { warrantyCase };

  orders.set(detail.order.saleOrderId, {
    ...detail,
    warrantyCases: [...detail.warrantyCases, warrantyCase],
  });
  commandResults.set(input.idempotencyKey, response);
  return response;
}

function transitionLocalWarranty(
  payload: unknown,
  orders: Map<string, SalesOrderDetailResponse>,
  commandResults: Map<string, unknown>,
  now: () => Date,
): ApiResult<SalesWarrantyResponse> | SalesWarrantyResponse {
  const input = parseSalesWarrantyTransitionRequest(payload);
  const existing = commandResults.get(input.idempotencyKey);
  if (existing !== undefined) return existing as SalesWarrantyResponse;

  const found = findLocalWarranty(input.warrantyCaseId, orders);
  if (found === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy ca bảo hành.', 'sales.warranty.transition', now);
  }

  const nextWarrantyCase: WarrantyCaseDTO = {
    ...found.warrantyCase,
    status: input.status,
    resolution: input.resolution ?? found.warrantyCase.resolution,
    attachmentIds: input.attachmentIds ?? found.warrantyCase.attachmentIds,
  };

  orders.set(found.detail.order.saleOrderId, {
    ...found.detail,
    warrantyCases: found.detail.warrantyCases.map((warrantyCase) =>
      warrantyCase.warrantyCaseId === nextWarrantyCase.warrantyCaseId ? nextWarrantyCase : warrantyCase,
    ),
  });

  const response: SalesWarrantyResponse = { warrantyCase: nextWarrantyCase };
  commandResults.set(input.idempotencyKey, response);
  return response;
}

function findLocalWarranty(
  warrantyCaseId: string,
  orders: Map<string, SalesOrderDetailResponse>,
): { detail: SalesOrderDetailResponse; warrantyCase: WarrantyCaseDTO } | undefined {
  for (const detail of orders.values()) {
    const warrantyCase = detail.warrantyCases.find((candidate) => candidate.warrantyCaseId === warrantyCaseId);
    if (warrantyCase !== undefined) return { detail, warrantyCase };
  }
  return undefined;
}

function localOperationError<T>(
  code: ApiErrorCode,
  message: string,
  operation: string,
  now: () => Date,
): ApiResult<T> {
  return {
    ok: false,
    error: { code, message },
    meta: {
      requestId: 'local-sales-operation',
      operation,
      serverTime: now().toISOString(),
      durationMs: 0,
      stages: {},
      io: {},
    },
  };
}

function completeLocalPosSale(
  payload: unknown,
  orders: Map<string, SalesOrderDetailResponse>,
  commandResults: Map<string, unknown>,
  catalogProducts: Map<string, CatalogProductListItemDTO>,
  nextId: (prefix: string) => string,
  now: () => Date,
): ApiResult<SalesPosCompleteResponse> | SalesPosCompleteResponse {
  const input = parseSalesPosCompleteRequest(payload);
  const existing = commandResults.get(input.idempotencyKey);
  if (existing !== undefined) return existing as SalesPosCompleteResponse;

  const quote = createLocalQuote(
    {
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      customerId: input.customerId,
      lines: input.lines.map((line) => ({
        lineId: line.lineId,
        variantId: line.variantId,
        unitVersionId: line.unitVersionId,
        quantity: line.quantity,
      })),
    },
    catalogProducts,
    now,
  );
  if (quote.quoteVersion !== input.quoteVersion) {
    return {
      ok: false,
      error: {
        code: 'PRICE_CHANGED',
        message: 'Giá hoặc khuyến mãi đã thay đổi. Vui lòng áp dụng báo giá mới.',
      },
      meta: {
        requestId: 'local-sales-conflict',
        operation: 'sales.pos.complete',
        serverTime: now().toISOString(),
        durationMs: 0,
        stages: {},
        io: {},
      },
    };
  }

  const orderId = nextId('sale-order');
  const paidVnd = tenderTotal(input.tenders);
  const receivableVnd = Math.max(0, quote.totalVnd - paidVnd);
  const lines = input.lines.map((line) => toLocalSaleLine(orderId, line, catalogProducts, now));
  const response: SalesPosCompleteResponse = {
    order: {
      saleOrderId: orderId,
      tenantId: 'tenant-default',
      businessNumber: `SO-${orderId.toLocaleUpperCase('vi-VN')}`,
      source: 'POS',
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      status: 'Completed',
      paymentStatus: resolveLocalPaymentStatus(quote.totalVnd, paidVnd),
      customerId: input.customerId,
      cashierId: input.cashierId,
      subtotalVnd: quote.subtotalVnd,
      discountVnd: quote.discountVnd,
      taxVnd: 0,
      shippingFeeVnd: 0,
      totalVnd: quote.totalVnd,
      paidVnd,
      receivableVnd,
      quoteVersion: quote.quoteVersion,
      draftVersion: 1,
      createdAt: now().toISOString(),
      updatedAt: now().toISOString(),
      completedAt: now().toISOString(),
    },
    lines,
    receipt: {
      receiptId: `receipt-${orderId}`,
      saleOrderId: orderId,
      businessNumber: `SO-${orderId.toLocaleUpperCase('vi-VN')}`,
      receiptFormat: input.receiptFormat,
      createdAt: now().toISOString(),
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      cashierId: input.cashierId,
      customerId: input.customerId,
      lines,
      totals: {
        subtotalVnd: quote.subtotalVnd,
        discountVnd: quote.discountVnd,
        taxVnd: 0,
        shippingFeeVnd: 0,
        totalVnd: quote.totalVnd,
        paidVnd,
        receivableVnd,
        changeVnd: Math.max(0, paidVnd - quote.totalVnd),
      },
    },
    inventoryMovements: [],
    conflicts: [],
  };
  orders.set(orderId, {
    order: response.order,
    lines: response.lines,
    tenders: [],
    receipt: response.receipt,
    returns: [],
    warrantyCases: [],
  });
  commandResults.set(input.idempotencyKey, response);
  return response;
}

function createLocalExchange(
  payload: unknown,
  orders: Map<string, SalesOrderDetailResponse>,
  commandResults: Map<string, unknown>,
  catalogProducts: Map<string, CatalogProductListItemDTO>,
  nextId: (prefix: string) => string,
  now: () => Date,
): ApiResult<SalesExchangeCreateResponse> | SalesExchangeCreateResponse {
  const input: SalesExchangeCreateRequest = parseSalesExchangeCreateRequest(payload);
  const existing = commandResults.get(input.idempotencyKey);
  if (existing !== undefined) return existing as SalesExchangeCreateResponse;

  const sourceDetail = orders.get(input.sourceSaleOrderId);
  if (sourceDetail === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy đơn bán gốc để đổi hàng.', 'sales.exchange.create', now);
  }

  const quote = createLocalQuote(
    {
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      customerId: input.customerId,
      lines: input.exchangeLines.map((line) => ({
        lineId: line.lineId,
        variantId: line.variantId,
        unitVersionId: line.unitVersionId,
        quantity: line.quantity,
      })),
    },
    catalogProducts,
    now,
  );
  if (quote.quoteVersion !== input.quoteVersion) {
    return localOperationError('PRICE_CHANGED', 'Giá hoặc khuyến mãi đã thay đổi.', 'sales.exchange.create', now);
  }

  const returnId = nextId('sale-return');
  const exchangeOrderId = nextId('sale-order');
  const returnedLines = input.returnLines.map((line) => {
    const sourceLine = sourceDetail.lines.find((candidate) => candidate.saleOrderLineId === line.sourceSaleLineId);
    const refundVnd =
      line.refundVnd ??
      (sourceLine === undefined ? 0 : Math.round((sourceLine.lineTotalVnd * line.quantityMilli) / sourceLine.quantityMilli));
    return {
      ...line,
      returnId,
      returnLineId: nextId('sale-return-line'),
      disposition: line.disposition,
      refundVnd,
      unitCostVnd: line.unitCostVnd ?? 20_000,
    };
  });
  const returnValueVnd = returnedLines.reduce((sum, line) => sum + line.refundVnd, 0);
  const cashTenderVnd = tenderTotal(input.tenders);
  const netSettlementVnd = quote.totalVnd - returnValueVnd;
  const paidVnd = Math.min(quote.totalVnd, returnValueVnd + cashTenderVnd);
  const exchangeLines = input.exchangeLines.map((line) =>
    toLocalSaleLine(exchangeOrderId, line, catalogProducts, now),
  );
  const timestamp = now().toISOString();
  const returnOrder: SalesExchangeCreateResponse['returnOrder'] = {
    returnId,
    tenantId: 'tenant-default',
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    customerId: input.customerId ?? sourceDetail.order.customerId,
    sourceSaleOrderId: input.sourceSaleOrderId,
    status: 'Resolved',
    returnType: 'Exchange',
    reason: input.reason,
    receivedAt: timestamp,
    resolvedAt: timestamp,
    actorId: input.actorId,
    approvedBy: input.actorId,
    linkedExchangeSaleId: exchangeOrderId,
    lines: returnedLines,
  };
  const exchangeOrder: SalesExchangeCreateResponse['exchangeOrder'] = {
    saleOrderId: exchangeOrderId,
    tenantId: 'tenant-default',
    businessNumber: `SO-${exchangeOrderId.toLocaleUpperCase('vi-VN')}`,
    source: 'POS',
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    status: 'Completed',
    paymentStatus: resolveLocalPaymentStatus(quote.totalVnd, paidVnd),
    customerId: input.customerId ?? sourceDetail.order.customerId,
    cashierId: input.cashierId,
    subtotalVnd: quote.subtotalVnd,
    discountVnd: quote.discountVnd,
    taxVnd: 0,
    shippingFeeVnd: 0,
    totalVnd: quote.totalVnd,
    paidVnd,
    receivableVnd: Math.max(0, quote.totalVnd - paidVnd),
    quoteVersion: quote.quoteVersion,
    draftVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: timestamp,
    linkedReturnId: returnId,
  };
  const receipt: SalesExchangeCreateResponse['receipt'] = {
    receiptId: `receipt-${exchangeOrderId}`,
    saleOrderId: exchangeOrderId,
    businessNumber: exchangeOrder.businessNumber,
    receiptFormat: input.receiptFormat,
    createdAt: timestamp,
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    cashierId: input.cashierId,
    customerId: exchangeOrder.customerId,
    lines: exchangeLines,
    totals: {
      subtotalVnd: exchangeOrder.subtotalVnd,
      discountVnd: exchangeOrder.discountVnd,
      taxVnd: 0,
      shippingFeeVnd: 0,
      totalVnd: exchangeOrder.totalVnd,
      paidVnd: exchangeOrder.paidVnd,
      receivableVnd: exchangeOrder.receivableVnd,
      changeVnd: Math.max(0, cashTenderVnd - Math.max(0, netSettlementVnd)),
    },
  };
  const response: SalesExchangeCreateResponse = {
    returnOrder,
    exchangeOrder,
    exchangeLines,
    receipt,
    inventoryMovements: [],
    netSettlementVnd,
  };

  sourceDetail.order = {
    ...sourceDetail.order,
    linkedReturnId: returnId,
    paymentStatus: returnValueVnd >= sourceDetail.order.totalVnd ? 'FullRefund' : 'PartialRefund',
    updatedAt: timestamp,
  };
  sourceDetail.returns = [...sourceDetail.returns, returnOrder];
  orders.set(input.sourceSaleOrderId, sourceDetail);
  orders.set(exchangeOrderId, {
    order: exchangeOrder,
    lines: exchangeLines,
    tenders: input.tenders.map((tender) => ({
      ...tender,
      saleOrderId: exchangeOrderId,
      tenderDraftId: nextId('sale-tender'),
    })),
    receipt,
    returns: [],
    warrantyCases: [],
  });
  commandResults.set(input.idempotencyKey, response);
  return response;
}

function toLocalSaleLine(
  saleOrderId: string,
  line: SalesPosCompleteRequest['lines'][number],
  catalogProducts: Map<string, CatalogProductListItemDTO>,
  now: () => Date,
): SalesPosCompleteResponse['lines'][number] {
  const variant = createLocalCatalogProjection(catalogProducts, now).variants.find(
    (candidate) => candidate.variantId === line.variantId,
  );
  const lineSubtotalVnd = Math.round(line.unitPriceVnd * line.quantity);
  return {
    ...line,
    saleOrderLineId: `${saleOrderId}-${line.lineId}`,
    sku: variant?.sku,
    displayName: variant?.displayName ?? line.variantId,
    unitName: variant?.unitName ?? line.unitVersionId,
    lineSubtotalVnd,
    lineTotalVnd: Math.max(0, lineSubtotalVnd - line.lineDiscountVnd),
  };
}

function tenderTotal(tenders: readonly { amountVnd: number }[]): number {
  return tenders.reduce((sum, tender) => sum + tender.amountVnd, 0);
}

function resolveLocalPaymentStatus(totalVnd: number, paidVnd: number): SalesPosCompleteResponse['order']['paymentStatus'] {
  if (totalVnd <= 0 || paidVnd >= totalVnd) return 'Paid';
  if (paidVnd > 0) return 'Partial';
  return 'Unpaid';
}

function createLocalCustomer(
  payload: unknown,
  customers: Map<string, CustomerDTO>,
  nextId: (prefix: string) => string,
): CustomerQuickCreateResponse {
  const input = parseCustomerQuickCreateRequest(payload);
  const phoneNormalized = input.phone?.replace(/\D/g, '');
  const existing =
    phoneNormalized === undefined
      ? undefined
      : [...customers.values()].find((customer) => customer.phoneNormalized === phoneNormalized);

  if (existing !== undefined) {
    return {
      duplicateWarnings: [
        {
          field: 'phone',
          customerId: existing.customerId,
          displayName: existing.displayName,
        },
      ],
    };
  }

  const customer: CustomerDTO = {
    customerId: nextId('customer'),
    tenantId: 'tenant-default',
    customerCode: nextId('CUS').toLocaleUpperCase('vi-VN'),
    displayName: input.displayName.trim(),
    phone: input.phone?.trim(),
    phoneNormalized,
    email: input.email?.trim(),
    emailNormalized: input.email?.trim().toLocaleLowerCase('vi-VN'),
    customerGroupId: input.customerGroupId,
    status: 'Active',
  };
  customers.set(customer.customerId, customer);

  return { customer, duplicateWarnings: [] };
}

function searchLocalCustomers(payload: unknown, customers: Map<string, CustomerDTO>): CustomerSearchResponse {
  const input = parseCustomerSearchRequest(payload);
  const query = input.query.trim().toLocaleLowerCase('vi-VN');

  return {
    customers: [...customers.values()].filter((customer) =>
      [customer.displayName, customer.phoneNormalized, customer.emailNormalized, customer.customerCode]
        .filter((value): value is string => value !== undefined)
        .some((value) => value.toLocaleLowerCase('vi-VN').includes(query)),
    ),
  };
}

function createLocalInventoryBalanceSummary(): InventoryBalanceSummaryResponse {
  return {
    generatedAt: '2026-07-27T00:00:00.000Z',
    rows: [
      {
        warehouseId: 'warehouse-default',
        variantId: 'variant-milk-1l',
        onHandMilli: 32_000,
        availableMilli: 26_000,
        reservedMilli: 6_000,
        quarantineMilli: 0,
        inventoryValueVnd: 3_520_000,
      },
      {
        warehouseId: 'warehouse-default',
        variantId: 'variant-laundry-36',
        onHandMilli: 7_000,
        availableMilli: 7_000,
        reservedMilli: 0,
        quarantineMilli: 0,
        inventoryValueVnd: 630_000,
      },
    ],
  };
}

function createLocalTransferResponse(
  payload: unknown,
  nextId: (prefix: string) => string,
  status: InventoryTransferResponse['transfer']['status'],
): InventoryTransferResponse {
  const request = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
  const transferId = String(request.transferId ?? nextId('transfer'));
  const createLines = Array.isArray(request.lines) ? (request.lines as Record<string, unknown>[]) : [];
  const receiveLines = Array.isArray(request.receivedLines) ? (request.receivedLines as Record<string, unknown>[]) : [];
  const sourceWarehouseId = String(request.sourceWarehouseId ?? 'warehouse-default');
  const destinationWarehouseId = String(request.destinationWarehouseId ?? 'warehouse-secondary');
  const lines =
    createLines.length > 0
      ? createLines.map((line, index) => ({
          transferLineId: String(line.transferLineId ?? `local-transfer-line-${index + 1}`),
          transferId,
          variantId: String(line.variantId ?? 'variant-milk-1l'),
          quantityMilli: Number(line.quantityMilli ?? 4_000),
          receivedQuantityMilli: status === 'Received' ? Number(line.quantityMilli ?? 4_000) : 0,
          unitCostVnd: 100_000,
        }))
      : receiveLines.map((line, index) => ({
          transferLineId: String(line.transferLineId ?? `local-transfer-line-${index + 1}`),
          transferId,
          variantId: 'variant-milk-1l',
          quantityMilli: Number(line.receivedQuantityMilli ?? 4_000),
          receivedQuantityMilli: Number(line.receivedQuantityMilli ?? 4_000),
          unitCostVnd: 100_000,
        }));

  return {
    transfer: {
      transferId,
      tenantId: 'tenant-default',
      sourceWarehouseId,
      destinationWarehouseId,
      status,
      reasonCode: typeof request.reasonCode === 'string' ? request.reasonCode : 'replenishment',
      createdBy: 'user-admin',
      createdAt: '2026-07-27T00:00:00.000Z',
      approvedBy: status === 'Approved' || status === 'Shipped' || status === 'Received' ? 'manager-1' : undefined,
      approvedAt: status === 'Approved' || status === 'Shipped' || status === 'Received' ? '2026-07-27T00:05:00.000Z' : undefined,
      shippedBy: status === 'Shipped' || status === 'Received' ? 'warehouse-1' : undefined,
      shippedAt: status === 'Shipped' || status === 'Received' ? '2026-07-27T00:10:00.000Z' : undefined,
      receivedBy: status === 'Received' ? 'warehouse-2' : undefined,
      receivedAt: status === 'Received' ? '2026-07-27T00:15:00.000Z' : undefined,
    },
    lines,
  };
}

function createLocalStocktakeResponse(
  payload: unknown,
  nextId: (prefix: string) => string,
  status: InventoryStocktakeResponse['session']['status'],
): InventoryStocktakeResponse {
  const request = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
  const stocktakeSessionId = String(request.stocktakeSessionId ?? nextId('stocktake'));
  const submittedLines = Array.isArray(request.lines) ? (request.lines as Record<string, unknown>[]) : [];
  const lines =
    submittedLines.length > 0
      ? submittedLines.map((line, index) => ({
          stocktakeLineId: String(line.stocktakeLineId ?? `local-stocktake-line-${index + 1}`),
          stocktakeSessionId,
          variantId: 'variant-milk-1l',
          snapshotQuantityMilli: 10_000,
          countedQuantityMilli: Number(line.countedQuantityMilli ?? 9_000),
          varianceMilli: Number(line.countedQuantityMilli ?? 9_000) - 10_000,
          movementsAfterSnapshotCount: 1,
          reasonCode: typeof line.reasonCode === 'string' ? line.reasonCode : 'count-diff',
        }))
      : [
          {
            stocktakeLineId: 'local-stocktake-line-1',
            stocktakeSessionId,
            variantId: 'variant-milk-1l',
            snapshotQuantityMilli: 10_000,
            movementsAfterSnapshotCount: 0,
          },
        ];

  return {
    session: {
      stocktakeSessionId,
      tenantId: 'tenant-default',
      warehouseId: String(request.warehouseId ?? 'warehouse-default'),
      status,
      snapshotAt: '2026-07-27T00:00:00.000Z',
      scopeVariantIds: ['variant-milk-1l'],
      createdBy: 'counter-1',
      createdAt: '2026-07-27T00:00:00.000Z',
      submittedBy: status === 'Submitted' || status === 'Approved' ? 'counter-1' : undefined,
      submittedAt: status === 'Submitted' || status === 'Approved' ? '2026-07-27T00:10:00.000Z' : undefined,
      approvedBy: status === 'Approved' ? 'manager-1' : undefined,
      approvedAt: status === 'Approved' ? '2026-07-27T00:15:00.000Z' : undefined,
    },
    lines,
  };
}

function createLocalFinanceSummary(): FinanceSummaryResponse {
  return {
    generatedAt: '2026-07-27T00:00:00.000Z',
    openShiftCount: 1,
    cashInVnd: 9_420_000,
    cashOutVnd: 760_000,
    receivableOpenVnd: 2_160_000,
    payableOpenVnd: 0,
  };
}

function createLocalFinanceMasterData(
  payload: unknown,
  cashDrawers: Map<string, CashDrawerDTO>,
  paymentMethods: Map<string, PaymentMethodDTO>,
): FinanceMasterDataResponse {
  const input = parseFinanceMasterDataRequest(payload);
  const includeDisabled = input.includeDisabled ?? false;
  return {
    cashDrawers: [...cashDrawers.values()]
      .filter((drawer) => input.branchId === undefined || drawer.branchId === input.branchId)
      .filter((drawer) => includeDisabled || drawer.status === 'Active')
      .sort((a, b) => a.drawerCode.localeCompare(b.drawerCode)),
    paymentMethods: [...paymentMethods.values()]
      .filter((method) => includeDisabled || method.status === 'Active')
      .sort((a, b) => a.methodCode.localeCompare(b.methodCode)),
  };
}

function createLocalCashDrawer(
  payload: unknown,
  cashDrawers: Map<string, CashDrawerDTO>,
  nextId: (prefix: string) => string,
): { cashDrawer: CashDrawerDTO } {
  const input = parseFinanceCashDrawerUpsertRequest(payload);
  const cashDrawer: CashDrawerDTO = {
    cashDrawerId: input.cashDrawerId ?? nextId('cash-drawer'),
    tenantId: 'tenant-default',
    branchId: input.branchId,
    drawerCode: input.drawerCode,
    name: input.name,
    drawerType: input.drawerType,
    status: input.status,
    directSaleEnabled: input.directSaleEnabled ?? true,
  };
  cashDrawers.set(cashDrawer.cashDrawerId, cashDrawer);
  return { cashDrawer };
}

function createLocalPaymentMethod(
  payload: unknown,
  paymentMethods: Map<string, PaymentMethodDTO>,
  nextId: (prefix: string) => string,
): { paymentMethod: PaymentMethodDTO } {
  const input = parseFinancePaymentMethodUpsertRequest(payload);
  const paymentMethod: PaymentMethodDTO = {
    paymentMethodId: input.paymentMethodId ?? nextId('payment-method'),
    tenantId: 'tenant-default',
    methodCode: input.methodCode,
    name: input.name,
    methodType: input.methodType,
    status: input.status,
    directSaleEnabled: input.directSaleEnabled ?? true,
  };
  paymentMethods.set(paymentMethod.paymentMethodId, paymentMethod);
  return { paymentMethod };
}

function createLocalFinanceAging(
  payload: unknown,
  obligations: Map<string, ObligationDTO>,
  now: () => Date,
): FinanceAgingProjectionResponse {
  const input = parseFinanceAgingProjectionRequest(payload);
  const asOfDate = toLocalDateOnly(input.asOfDate);
  const rows = [...obligations.values()]
    .filter((obligation) => input.branchId === undefined || obligation.branchId === input.branchId)
    .filter((obligation) => input.obligationType === undefined || obligation.obligationType === input.obligationType)
    .filter((obligation) => (input.includeSettled ?? false) || obligation.status !== 'Settled')
    .filter((obligation) => obligation.status !== 'Reversed')
    .map((obligation) => {
      const daysOverdue = Math.max(0, diffLocalDays(asOfDate, toLocalDateOnly(obligation.dueDate)));
      return {
        obligationId: obligation.obligationId,
        branchId: obligation.branchId,
        obligationType: obligation.obligationType,
        partyId: obligation.partyId,
        sourceDocument: obligation.sourceDocument,
        dueDate: obligation.dueDate,
        daysOverdue,
        bucket: resolveLocalAgingBucket(daysOverdue),
        originalAmountVnd: obligation.originalAmountVnd,
        allocatedAmountVnd: obligation.allocatedAmountVnd,
        remainingAmountVnd: obligation.remainingAmountVnd,
        status: obligation.status,
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue || b.remainingAmountVnd - a.remainingAmountVnd);

  return {
    generatedAt: now().toISOString(),
    asOfDate: input.asOfDate,
    branchId: input.branchId,
    obligationType: input.obligationType,
    rows,
    totals: rows.reduce(
      (totals, row) => {
        totals.totalRemainingVnd += row.remainingAmountVnd;
        if (row.bucket === 'Current') totals.currentVnd += row.remainingAmountVnd;
        if (row.bucket === '1-30') totals.bucket1To30Vnd += row.remainingAmountVnd;
        if (row.bucket === '31-60') totals.bucket31To60Vnd += row.remainingAmountVnd;
        if (row.bucket === '61-90') totals.bucket61To90Vnd += row.remainingAmountVnd;
        if (row.bucket === '90+') totals.bucket90PlusVnd += row.remainingAmountVnd;
        return totals;
      },
      {
        totalRemainingVnd: 0,
        currentVnd: 0,
        bucket1To30Vnd: 0,
        bucket31To60Vnd: 0,
        bucket61To90Vnd: 0,
        bucket90PlusVnd: 0,
      },
    ),
  };
}

function resolveLocalAgingBucket(daysOverdue: number): 'Current' | '1-30' | '31-60' | '61-90' | '90+' {
  if (daysOverdue <= 0) return 'Current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

function toLocalDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function diffLocalDays(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000);
}

function createLocalSupplier(
  payload: unknown,
  suppliers: Map<string, SupplierDTO>,
  nextId: (prefix: string) => string,
  now: () => Date,
): PurchasingSupplierCreateResponse {
  const input = parsePurchasingSupplierCreateRequest(payload);
  const supplier: SupplierDTO = {
    supplierId: nextId('supplier'),
    tenantId: 'tenant-default',
    supplierCode: input.supplierCode,
    name: input.name,
    taxCode: input.taxCode,
    status: 'Active',
    paymentTerms: input.paymentTerms ?? { dueDays: 0 },
    contact: input.contact,
    note: input.note,
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
  };
  suppliers.set(supplier.supplierId, supplier);
  return { supplier };
}

function createLocalPurchaseOrder(
  payload: unknown,
  purchaseOrders: Map<string, PurchasingPoResponse>,
  nextId: (prefix: string) => string,
  now: () => Date,
): PurchasingPoResponse {
  const input = parsePurchasingPoCreateRequest(payload);
  const purchaseOrderId = nextId('purchase-order');
  const lines: PurchaseOrderLineDTO[] = input.lines.map((line) => {
    const lineSubtotalVnd = Math.round(line.unitCostVnd * line.quantity);
    return {
      ...line,
      purchaseOrderId,
      purchaseOrderLineId: nextId('purchase-order-line'),
      receivedQuantityMilli: 0,
      lineSubtotalVnd,
      lineTotalVnd: lineSubtotalVnd - line.lineDiscountVnd + line.vatVnd,
    };
  });
  const response: PurchasingPoResponse = {
    purchaseOrder: {
      purchaseOrderId,
      tenantId: 'tenant-default',
      businessNumber: `PO-${purchaseOrderId.toLocaleUpperCase('vi-VN')}`,
      supplierId: input.supplierId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      status: 'Draft',
      expectedDate: input.expectedDate,
      attachmentIds: input.attachmentIds ?? [],
      subtotalVnd: lines.reduce((sum, line) => sum + line.lineSubtotalVnd, 0),
      discountVnd: lines.reduce((sum, line) => sum + line.lineDiscountVnd, 0),
      vatVnd: lines.reduce((sum, line) => sum + line.vatVnd, 0),
      totalVnd: lines.reduce((sum, line) => sum + line.lineTotalVnd, 0),
      note: input.note,
      createdAt: now().toISOString(),
      updatedAt: now().toISOString(),
    },
    lines,
  };
  purchaseOrders.set(purchaseOrderId, response);
  return response;
}

function approveLocalPurchaseOrder(
  payload: unknown,
  purchaseOrders: Map<string, PurchasingPoResponse>,
  now: () => Date,
): PurchasingPoResponse | ApiResult<PurchasingPoResponse> {
  const input = parsePurchasingPoApproveRequest(payload);
  const existing = purchaseOrders.get(input.purchaseOrderId);
  if (existing === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy PO.', 'purchasing.po.approve', now);
  }

  const response: PurchasingPoResponse = {
    ...existing,
    purchaseOrder: {
      ...existing.purchaseOrder,
      status: 'Approved',
      approvedAt: now().toISOString(),
      updatedAt: now().toISOString(),
    },
  };
  purchaseOrders.set(response.purchaseOrder.purchaseOrderId, response);
  return response;
}

function createLocalGoodsReceipt(
  payload: unknown,
  goodsReceipts: Map<string, PurchasingGoodsReceiptCreateResponse>,
  nextId: (prefix: string) => string,
  now: () => Date,
): PurchasingGoodsReceiptCreateResponse {
  const input = parsePurchasingGoodsReceiptCreateRequest(payload);
  const goodsReceiptId = nextId('goods-receipt');
  const lines: GoodsReceiptLineDTO[] = input.lines.map((line) => {
    const lineSubtotalVnd = Math.round(line.unitCostVnd * line.quantity);
    const actualCostVnd = lineSubtotalVnd - line.lineDiscountVnd + (line.allocatedLandedCostVnd ?? 0);
    return {
      ...line,
      goodsReceiptId,
      goodsReceiptLineId: nextId('goods-receipt-line'),
      allocatedLandedCostVnd: line.allocatedLandedCostVnd ?? 0,
      lineSubtotalVnd,
      lineTotalVnd: lineSubtotalVnd - line.lineDiscountVnd + line.vatVnd,
      actualCostVnd,
      returnedQuantityMilli: 0,
    };
  });
  const subtotalVnd = lines.reduce((sum, line) => sum + line.lineSubtotalVnd, 0);
  const discountVnd = lines.reduce((sum, line) => sum + line.lineDiscountVnd, 0);
  const vatVnd = lines.reduce((sum, line) => sum + line.vatVnd, 0);
  const landedCostVnd = lines.reduce((sum, line) => sum + (line.allocatedLandedCostVnd ?? 0), 0);
  const response: PurchasingGoodsReceiptCreateResponse = {
    goodsReceipt: {
      goodsReceiptId,
      tenantId: 'tenant-default',
      businessNumber: `GR-${goodsReceiptId.toLocaleUpperCase('vi-VN')}`,
      supplierId: input.supplierId,
      purchaseOrderId: input.purchaseOrderId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      status: 'Draft',
      receivedDate: input.receivedDate,
      subtotalVnd,
      discountVnd,
      vatVnd,
      landedCostVnd,
      totalPayableVnd: subtotalVnd - discountVnd + landedCostVnd,
      actorId: input.actorId,
      createdAt: now().toISOString(),
      updatedAt: now().toISOString(),
    },
    lines,
  };
  goodsReceipts.set(goodsReceiptId, response);
  return response;
}

function approveLocalGoodsReceipt(
  payload: unknown,
  goodsReceipts: Map<string, PurchasingGoodsReceiptCreateResponse>,
  now: () => Date,
): PurchasingGoodsReceiptApproveResponse | ApiResult<PurchasingGoodsReceiptApproveResponse> {
  const input = parsePurchasingGoodsReceiptApproveRequest(payload);
  const existing = goodsReceipts.get(input.goodsReceiptId);
  if (existing === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy receipt.', 'purchasing.receipt.approve', now);
  }

  const response: PurchasingGoodsReceiptApproveResponse = {
    ...existing,
    goodsReceipt: {
      ...existing.goodsReceipt,
      status: 'Approved',
      approvedBy: input.approverId,
      approvedAt: now().toISOString(),
      updatedAt: now().toISOString(),
    },
    inventoryMovements: existing.lines.map((line) => ({
      movement: {
        movementId: `local-movement-${line.goodsReceiptLineId}`,
        tenantId: 'tenant-default',
        movementType: 'PurchaseReceipt',
        warehouseId: existing.goodsReceipt.warehouseId,
        variantId: line.variantId,
        quantityMilli: line.quantityMilli,
        unitVersionId: line.unitVersionId,
        unitCostVnd: Math.round((line.actualCostVnd * 1000) / line.quantityMilli),
        totalCostVnd: line.actualCostVnd,
        sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: existing.goodsReceipt.goodsReceiptId, sourceLineId: line.goodsReceiptLineId },
        effectiveAt: now().toISOString(),
        actorId: input.approverId,
        idempotencyKey: input.idempotencyKey,
      },
      balance: {
        balanceId: `local-balance-${line.variantId}`,
        tenantId: 'tenant-default',
        warehouseId: existing.goodsReceipt.warehouseId,
        variantId: line.variantId,
        onHandMilli: line.quantityMilli,
        availableMilli: line.quantityMilli,
        reservedMilli: 0,
        inTransitMilli: 0,
        quarantineMilli: 0,
        inventoryValueVnd: line.actualCostVnd,
      },
    })),
    payable: {
      obligationId: `local-payable-${existing.goodsReceipt.goodsReceiptId}`,
      tenantId: 'tenant-default',
      branchId: existing.goodsReceipt.branchId,
      obligationType: 'Payable',
      partyId: existing.goodsReceipt.supplierId,
      sourceDocument: { sourceType: 'PurchaseReceipt', sourceId: existing.goodsReceipt.goodsReceiptId },
      dueDate: now().toISOString().slice(0, 10),
      originalAmountVnd: existing.goodsReceipt.totalPayableVnd,
      allocatedAmountVnd: 0,
      remainingAmountVnd: existing.goodsReceipt.totalPayableVnd,
      status: 'Open',
    },
  };
  goodsReceipts.set(input.goodsReceiptId, response);
  return response;
}

function createLocalSupplierReturn(
  payload: unknown,
  supplierReturns: Map<string, PurchasingSupplierReturnCreateResponse>,
  nextId: (prefix: string) => string,
  now: () => Date,
): PurchasingSupplierReturnCreateResponse {
  const input = parsePurchasingSupplierReturnCreateRequest(payload);
  const supplierReturnId = nextId('supplier-return');
  const lines: SupplierReturnLineDTO[] = input.lines.map((line) => ({
    ...line,
    supplierReturnId,
    supplierReturnLineId: nextId('supplier-return-line'),
    lineTotalVnd: Math.round((line.quantityMilli * line.unitCostVnd) / 1000),
  }));
  const response: PurchasingSupplierReturnCreateResponse = {
    supplierReturn: {
      supplierReturnId,
      tenantId: 'tenant-default',
      supplierId: input.supplierId,
      goodsReceiptId: input.goodsReceiptId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      status: 'Draft',
      treatment: input.treatment,
      reason: input.reason,
      actorId: input.actorId,
      totalVnd: lines.reduce((sum, line) => sum + line.lineTotalVnd, 0),
      createdAt: now().toISOString(),
      updatedAt: now().toISOString(),
    },
    lines,
  };
  supplierReturns.set(supplierReturnId, response);
  return response;
}

function approveLocalSupplierReturn(
  payload: unknown,
  supplierReturns: Map<string, PurchasingSupplierReturnCreateResponse>,
  now: () => Date,
): PurchasingSupplierReturnApproveResponse | ApiResult<PurchasingSupplierReturnApproveResponse> {
  const input = parsePurchasingSupplierReturnApproveRequest(payload);
  const existing = supplierReturns.get(input.supplierReturnId);
  if (existing === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy phiếu trả NCC.', 'purchasing.supplierReturn.approve', now);
  }

  const payableAdjustment =
    existing.supplierReturn.treatment === 'ReducePayable'
      ? {
          obligationId: `local-payable-${existing.supplierReturn.goodsReceiptId}`,
          tenantId: 'tenant-default',
          branchId: existing.supplierReturn.branchId,
          obligationType: 'Payable' as const,
          partyId: existing.supplierReturn.supplierId,
          sourceDocument: { sourceType: 'PurchaseReceipt' as const, sourceId: existing.supplierReturn.goodsReceiptId ?? 'receipt-local' },
          dueDate: now().toISOString().slice(0, 10),
          originalAmountVnd: 110_000,
          allocatedAmountVnd: existing.supplierReturn.totalVnd,
          remainingAmountVnd: 110_000 - existing.supplierReturn.totalVnd,
          status: 'PartiallyPaid' as const,
        }
      : undefined;
  const supplierPrepayment =
    existing.supplierReturn.treatment === 'Refund'
      ? {
          prepaymentId: `local-supplier-prepayment-${existing.supplierReturn.supplierReturnId}`,
          tenantId: 'tenant-default',
          branchId: existing.supplierReturn.branchId,
          supplierId: existing.supplierReturn.supplierId,
          sourceDocument: { sourceType: 'SupplierReturn' as const, sourceId: existing.supplierReturn.supplierReturnId },
          amountVnd: existing.supplierReturn.totalVnd,
          consumedAmountVnd: 0,
          status: 'Open' as const,
        }
      : undefined;
  const response: PurchasingSupplierReturnApproveResponse = {
    ...existing,
    supplierReturn: {
      ...existing.supplierReturn,
      status: 'Approved',
      approvedBy: input.approverId,
      approvedAt: now().toISOString(),
      updatedAt: now().toISOString(),
    },
    inventoryMovements: existing.lines.map((line) => ({
      movement: {
        movementId: `local-purchase-return-${line.supplierReturnLineId}`,
        tenantId: 'tenant-default',
        movementType: 'PurchaseReturn',
        warehouseId: existing.supplierReturn.warehouseId,
        variantId: line.variantId,
        quantityMilli: -line.quantityMilli,
        unitCostVnd: line.unitCostVnd,
        totalCostVnd: -line.lineTotalVnd,
        sourceDocument: { sourceType: 'SupplierReturn', sourceId: existing.supplierReturn.supplierReturnId, sourceLineId: line.supplierReturnLineId },
        effectiveAt: now().toISOString(),
        actorId: input.approverId,
        idempotencyKey: input.idempotencyKey,
      },
      balance: {
        balanceId: `local-balance-${line.variantId}`,
        tenantId: 'tenant-default',
        warehouseId: existing.supplierReturn.warehouseId,
        variantId: line.variantId,
        onHandMilli: 4_000,
        availableMilli: 4_000,
        reservedMilli: 0,
        inTransitMilli: 0,
        quarantineMilli: 0,
        inventoryValueVnd: 88_000,
      },
    })),
    payableAdjustment,
    supplierPrepayment,
  };
  supplierReturns.set(input.supplierReturnId, response);
  return response;
}

function createLocalReportingDashboard(payload: unknown, now: () => Date): ReportingDashboardResponse {
  const input = parseReportingDashboardRequest(payload);
  return {
    metadata: {
      generatedAt: now().toISOString(),
      asOf: now().toISOString(),
      partitionCoverage: {
        status: 'Complete',
        activeFrom: input.dateRange.from,
        activeTo: input.dateRange.to,
        archiveIncluded: false,
      },
      archiveIncluded: false,
    },
    scope: { branchId: input.branchId, warehouseId: input.warehouseId },
    kpis: [
      { kpiId: 'netRevenue', label: 'Doanh thu thuần', valueVnd: 286_450_000, trendPct: 11.6 },
      { kpiId: 'completedOrders', label: 'Đơn hoàn tất', valueCount: 184, statusLabel: 'Đã xác nhận' },
      { kpiId: 'collected', label: 'Đã thu', valueVnd: 259_830_000 },
      { kpiId: 'receivableOverdue', label: 'Phải thu / quá hạn', valueVnd: 26_620_000, secondaryValueVnd: 8_450_000 },
    ],
    revenueSeries: [
      { bucket: '08h', currentNetRevenueVnd: 5_200_000, previousNetRevenueVnd: 7_000_000 },
      { bucket: '11h', currentNetRevenueVnd: 16_800_000, previousNetRevenueVnd: 14_400_000 },
      { bucket: '14h', currentNetRevenueVnd: 27_500_000, previousNetRevenueVnd: 25_000_000 },
      { bucket: '16h', currentNetRevenueVnd: 24_300_000, previousNetRevenueVnd: 31_900_000 },
      { bucket: '18h', currentNetRevenueVnd: 42_800_000, previousNetRevenueVnd: 38_350_000 },
      { bucket: '20h', currentNetRevenueVnd: 26_100_000, previousNetRevenueVnd: 23_500_000 },
    ],
    decisionQueue: [
      {
        itemId: 'decision-low-stock-1',
        itemType: 'LowStock',
        title: 'Tồn thấp: Sữa hạt óc chó 1L',
        description: 'Còn 4 thùng, dưới ngưỡng tối thiểu 12 · rủi ro thiếu hàng trong ca chiều.',
        priority: 'Medium',
        actionLabel: 'Xử lý',
      },
      {
        itemId: 'decision-expiring-lot-1',
        itemType: 'ExpiringLot',
        title: 'Hàng sắp hết hạn cần luân chuyển',
        description: '12 chai Sữa hạt hạnh nhân 1L còn 4 ngày hạn dùng · cần ưu tiên bán hoặc điều chuyển.',
        priority: 'Medium',
        actionLabel: 'Xem lô hàng',
      },
      {
        itemId: 'decision-manual-order-sla-1',
        itemType: 'ManualOrderSla',
        title: 'Đơn nhập tay quá SLA xác nhận',
        description: '3 đơn chờ quá 15 phút; đơn lâu nhất 46 phút · có nguy cơ bỏ lỡ khách.',
        priority: 'High',
        actionLabel: 'Mở hàng đợi',
      },
      {
        itemId: 'decision-shift-variance-1',
        itemType: 'ShiftVariance',
        title: 'Chênh lệch ca cần đối soát',
        description: '2 ca chưa đối soát trước hạn đóng 10:30 · ảnh hưởng bàn giao quầy.',
        priority: 'High',
        actionLabel: 'Đối soát',
      },
      {
        itemId: 'decision-receivable-1',
        itemType: 'OverdueReceivable',
        title: 'Công nợ quá hạn cần theo dõi',
        description: '8.450.000 ₫ đã quá hạn · cần chốt người phụ trách liên hệ trong hôm nay.',
        priority: 'Medium',
        actionLabel: 'Phân công',
      },
    ],
    manualOrders: [
      {
        orderId: 'SO-260726-01842',
        source: 'Phone',
        customerName: 'Trần Thị Hồng Nhung',
        customerSubtitle: 'Khách lẻ',
        ageMinutes: 18,
        slaTargetMinutes: 15,
        status: 'PendingConfirmation',
        valueVnd: 2_680_000,
      },
      {
        orderId: 'SO-260726-01837',
        source: 'CustomerMessage',
        customerName: 'Công ty CP Văn phòng Phương Nam',
        customerSubtitle: 'Khách doanh nghiệp',
        ageMinutes: 31,
        slaTargetMinutes: 15,
        status: 'Picking',
        valueVnd: 18_450_000,
      },
      {
        orderId: 'SO-260726-01815',
        source: 'StaffCreated',
        customerName: 'Nguyễn Minh Tâm',
        customerSubtitle: 'Khách lẻ',
        ageMinutes: 46,
        slaTargetMinutes: 15,
        status: 'NeedStock',
        valueVnd: 1_249_000,
      },
      {
        orderId: 'SO-260726-01811',
        source: 'Preorder',
        customerName: 'Cửa hàng Gia Hân',
        customerSubtitle: 'Khách doanh nghiệp',
        ageMinutes: 12,
        slaTargetMinutes: 15,
        status: 'PendingConfirmation',
        valueVnd: 6_870_000,
      },
    ],
    restricted: {
      sensitiveFields: input.requestedSensitiveFields ?? [],
      reason: (input.requestedSensitiveFields ?? []).length > 0 ? 'Vai trò hiện tại không có quyền xem dữ liệu nhạy cảm.' : undefined,
    },
  };
}

function createLocalReportQuery(payload: unknown, now: () => Date): ReportingReportQueryResponse {
  const input = parseReportingReportQueryRequest(payload);
  return {
    metadata: {
      generatedAt: now().toISOString(),
      asOf: now().toISOString(),
      partitionCoverage: {
        status: 'Complete',
        activeFrom: input.dateRange.from,
        activeTo: input.dateRange.to,
        archiveIncluded: false,
      },
      archiveIncluded: false,
    },
    reportId: input.reportId,
    rows: [{ branchId: input.scope.branchId, netRevenueVnd: 286_450_000 }],
  };
}

function createLocalExportResponse(
  payload: unknown,
  nextId: (prefix: string) => string,
  now: () => Date,
): ReportingExportResponse {
  const input = parseReportingExportRequest(payload);
  const routing = input.query.pageSize > 100 ? 'LargeWorker' : 'SmallSync';
  return {
    exportRun: {
      runId: nextId('export-run'),
      tenantId: 'tenant-default',
      requestedBy: 'user-admin',
      status: routing === 'SmallSync' ? 'Completed' : 'Requested',
      format: input.format,
      query: input.query,
      requestedAt: now().toISOString(),
      completedAt: routing === 'SmallSync' ? now().toISOString() : undefined,
      rowCount: routing === 'SmallSync' ? 1 : undefined,
      fileId: routing === 'SmallSync' ? nextId('export-file') : undefined,
      routing,
    },
  };
}

function getLocalExportStatus(
  payload: unknown,
  exportRuns: Map<string, ReportingExportResponse>,
  now: () => Date,
): ReportingExportResponse | ApiResult<ReportingExportResponse> {
  const input = parseReportingExportStatusRequest(payload);
  const response = exportRuns.get(input.runId);
  if (response === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy export run.', 'reporting.export.getStatus', now);
  }

  return response;
}

function createLocalImportTemplate(payload: unknown): ImportTemplateResponse {
  const input = parseImportTemplateRequest(payload);
  const columnsByType: Record<string, readonly string[]> = {
    Catalog: ['sku', 'name', 'unitName', 'unitPriceVnd', 'inventoryMode'],
    Customer: ['customerCode', 'displayName', 'phone', 'email', 'customerGroup'],
    Supplier: ['supplierCode', 'displayName', 'phone', 'email', 'taxCode'],
    OpeningInventory: ['sku', 'warehouseCode', 'quantity', 'unitCostVnd', 'lotCode'],
  };

  return {
    importType: input.importType,
    schemaVersion: input.schemaVersion,
    columns: columnsByType[input.importType],
  };
}

function uploadLocalImport(
  payload: unknown,
  actorId: string,
  batches: Map<string, ImportBatchDTO>,
  nextId: (prefix: string) => string,
): ImportUploadResponse {
  const input = parseImportUploadRequest(payload);
  const batch: ImportBatchDTO = {
    batchId: nextId('import-batch'),
    importType: input.importType,
    schemaVersion: input.schemaVersion,
    actorId,
    scopeKey: input.scopeKey,
    status: 'Uploaded',
    rowCount: input.rowCount,
    validCount: 0,
    invalidCount: 0,
    sourceFileName: input.fileName,
    checksum: input.checksum,
  };
  batches.set(batch.batchId, batch);
  return { batch };
}

function validateLocalImport(
  payload: unknown,
  batches: Map<string, ImportBatchDTO>,
  rowsByBatch: Map<string, ImportStagingRowDTO[]>,
  nextId: (prefix: string) => string,
  now: () => Date,
): ImportValidateResponse | ApiResult<ImportValidateResponse> {
  const input = parseImportValidateRequest(payload);
  const batch = batches.get(input.batchId);
  if (batch === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy import batch.', 'operations.import.validate', now);
  }

  const seen = new Set<string>();
  const rows = input.rows.map((row) => {
    const errors: string[] = [];
    if (seen.has(row.rowKey)) errors.push('Dòng bị trùng khóa import.');
    seen.add(row.rowKey);
    for (const [key, value] of Object.entries(row.payload)) {
      if (typeof value === 'string' && value.trim() === '') errors.push(`Thiếu giá trị ${key}.`);
    }

    return {
      stagingRowId: nextId('import-row'),
      batchId: input.batchId,
      rowNumber: row.rowNumber,
      rowKey: row.rowKey,
      validationStatus: errors.length === 0 ? 'Valid' : 'Invalid',
      errors,
      commitStatus: 'Pending',
      payload: { ...row.payload },
    } satisfies ImportStagingRowDTO;
  });
  const validCount = rows.filter((row) => row.validationStatus === 'Valid').length;
  const nextBatch: ImportBatchDTO = {
    ...batch,
    status: validCount > 0 ? 'AwaitingConfirmation' : 'FailedValidation',
    rowCount: rows.length,
    validCount,
    invalidCount: rows.length - validCount,
  };
  batches.set(input.batchId, nextBatch);
  rowsByBatch.set(input.batchId, rows);
  return { batch: nextBatch, rows };
}

function commitLocalImport(
  payload: unknown,
  batches: Map<string, ImportBatchDTO>,
  rowsByBatch: Map<string, ImportStagingRowDTO[]>,
  now: () => Date,
): ImportCommitResponse | ApiResult<ImportCommitResponse> {
  const input = parseImportCommitRequest(payload);
  const batch = batches.get(input.batchId);
  const rows = rowsByBatch.get(input.batchId) ?? [];
  if (batch === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy import batch.', 'operations.import.commit', now);
  }
  if (batch.status === 'Completed') {
    return { batch, committedRows: rows.filter((row) => row.commitStatus === 'Committed') };
  }
  if (input.selectionMode === 'AllOrNothing' && rows.some((row) => row.validationStatus === 'Invalid')) {
    return localOperationError('INVALID_INPUT', 'Import còn dòng lỗi, không thể commit AllOrNothing.', 'operations.import.commit', now);
  }

  const committedRows = rows
    .filter((row) => row.validationStatus === 'Valid')
    .map((row) => ({ ...row, commitStatus: 'Committed', sourceObjectId: `source-${row.rowKey}` }) satisfies ImportStagingRowDTO);
  const nextRows = rows.map((row) => {
    const committed = committedRows.find((candidate) => candidate.stagingRowId === row.stagingRowId);
    if (committed !== undefined) return committed;
    return { ...row, commitStatus: 'Skipped' } satisfies ImportStagingRowDTO;
  });
  const nextBatch: ImportBatchDTO = {
    ...batch,
    status: 'Completed',
    selectionMode: input.selectionMode,
    committedAt: now().toISOString(),
  };
  batches.set(input.batchId, nextBatch);
  rowsByBatch.set(input.batchId, nextRows);
  return { batch: nextBatch, committedRows };
}

function completeLocalAttachment(
  payload: unknown,
  actorId: string,
  attachments: Map<string, AttachmentMetadataDTO>,
  nextId: (prefix: string) => string,
  now: () => Date,
): AttachmentCompleteResponse {
  const input = parseAttachmentCompleteRequest(payload);
  const attachment: AttachmentMetadataDTO = {
    attachmentId: nextId('attachment'),
    objectType: input.objectType,
    objectId: input.objectId,
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    driveFileId: input.driveFileId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksum: input.checksum,
    status: 'Available',
    uploadedBy: actorId,
    uploadedAt: now().toISOString(),
  };
  attachments.set(attachment.attachmentId, attachment);
  return { attachment };
}

function uploadLocalAttachment(
  payload: unknown,
  actorId: string,
  attachments: Map<string, AttachmentMetadataDTO>,
  nextId: (prefix: string) => string,
  now: () => Date,
): AttachmentUploadResponse {
  const input = parseAttachmentUploadRequest(payload);
  const attachment: AttachmentMetadataDTO = {
    attachmentId: nextId('attachment'),
    objectType: input.objectType,
    objectId: input.objectId,
    branchId: input.branchId,
    warehouseId: input.warehouseId,
    driveFileId: `local-private-drive-file-${nextId('file')}`,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksum: input.checksum,
    status: 'Available',
    uploadedBy: actorId,
    uploadedAt: now().toISOString(),
  };
  attachments.set(attachment.attachmentId, attachment);
  return { attachment };
}

function accessLocalAttachment(
  payload: unknown,
  attachments: Map<string, AttachmentMetadataDTO>,
  now: () => Date,
): AttachmentAccessResponse | ApiResult<AttachmentAccessResponse> {
  const input = parseAttachmentAccessRequest(payload);
  const attachment = attachments.get(input.attachmentId);
  if (
    attachment === undefined ||
    attachment.status !== 'Available' ||
    attachment.objectType !== input.objectType ||
    attachment.objectId !== input.objectId
  ) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy tệp đính kèm hợp lệ.', 'operations.attachment.download', now);
  }

  return {
    attachment,
    accessToken: `attachment-access-token-${attachment.attachmentId}`,
    expiresAt: new Date(now().getTime() + 10 * 60 * 1000).toISOString(),
    contentBase64: `local-private-content-${attachment.driveFileId}`,
  };
}

function listLocalAttachments(
  payload: unknown,
  attachments: Map<string, AttachmentMetadataDTO>,
): AttachmentListResponse {
  const input = parseAttachmentListRequest(payload);
  return {
    attachments: [...attachments.values()]
      .filter((attachment) => attachment.objectType === input.objectType)
      .filter((attachment) => attachment.objectId === input.objectId)
      .filter((attachment) => attachment.status !== 'Deleted')
      .filter((attachment) => input.branchId === undefined || attachment.branchId === input.branchId)
      .filter((attachment) => input.warehouseId === undefined || attachment.warehouseId === input.warehouseId),
  };
}

function deleteLocalAttachment(
  payload: unknown,
  attachments: Map<string, AttachmentMetadataDTO>,
  now: () => Date,
): AttachmentDeleteResponse | ApiResult<AttachmentDeleteResponse> {
  const input = parseAttachmentDeleteRequest(payload);
  const attachment = attachments.get(input.attachmentId);
  if (attachment === undefined || attachment.objectType !== input.objectType || attachment.objectId !== input.objectId) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy tệp đính kèm hợp lệ.', 'operations.attachment.delete', now);
  }
  const deleted: AttachmentMetadataDTO = {
    ...attachment,
    status: 'Deleted',
    deletedAt: now().toISOString(),
  };
  attachments.set(deleted.attachmentId, deleted);
  return { attachment: deleted };
}

function requestLocalBackup(
  payload: unknown,
  actorId: string,
  partitions: Map<string, PartitionDTO>,
  backups: Map<string, BackupRunDTO>,
  nextId: (prefix: string) => string,
  now: () => Date,
): BackupResponse {
  const input = parseBackupRequest(payload);
  const backupRunId = nextId('backup-run');
  const manifestWithoutChecksum = {
    appVersion: 'local-dev',
    schemaVersion: 1,
    generatedAt: now().toISOString(),
    partitions: [...partitions.values()].map((partition) => ({
      storageRole: partition.storageRole,
      partitionKey: partition.partitionKey,
      status: partition.status,
      rowCount: partition.capacityPct,
    })),
    resources: [
      {
        resourceKey: 'runtime-config',
        resourceId: 'local-runtime-config',
        checksum: 'checksum-runtime-config',
      },
    ],
  };
  const backup: BackupRunDTO = {
    backupRunId,
    status: 'Completed',
    backupType: input.backupType,
    requestedBy: actorId,
    requestedAt: now().toISOString(),
    completedAt: now().toISOString(),
    manifest: {
      ...manifestWithoutChecksum,
      checksum: stableLocalChecksum(manifestWithoutChecksum),
    },
  };
  backups.set(backupRunId, backup);
  return { backup };
}

function prepareLocalRestore(
  payload: unknown,
  actorId: string,
  backups: Map<string, BackupRunDTO>,
  restores: Map<string, RestoreRunDTO>,
  nextId: (prefix: string) => string,
  now: () => Date,
): RestorePrepareResponse | ApiResult<RestorePrepareResponse> {
  const input = parseRestorePrepareRequest(payload);
  if (!backups.has(input.backupRunId)) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy backup.', 'operations.restore.prepare', now);
  }
  if (input.confirmationText !== `RESTORE ${input.backupRunId}`) {
    return localOperationError('INVALID_INPUT', 'Xác nhận restore không hợp lệ.', 'operations.restore.prepare', now);
  }
  const restore: RestoreRunDTO = {
    restoreRunId: nextId('restore-run'),
    backupRunId: input.backupRunId,
    status: 'Prepared',
    requestedBy: actorId,
    preparedAt: now().toISOString(),
    oldConfigVersion: 'config-default',
    writeFrozen: true,
  };
  restores.set(restore.restoreRunId, restore);
  return { restore };
}

function switchLocalRestore(
  payload: unknown,
  restores: Map<string, RestoreRunDTO>,
  now: () => Date,
): RestoreSwitchResponse | ApiResult<RestoreSwitchResponse> {
  const input = parseRestoreSwitchRequest(payload);
  const restore = restores.get(input.restoreRunId);
  if (restore === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy restore run.', 'operations.restore.switch', now);
  }
  if (input.ownerConfirmationText !== `SWITCH ${input.restoreRunId}`) {
    return localOperationError('INVALID_INPUT', 'Xác nhận switch không hợp lệ.', 'operations.restore.switch', now);
  }
  const switched: RestoreRunDTO = {
    ...restore,
    status: 'Switched',
    switchedAt: now().toISOString(),
    newConfigVersion: `config-restored-${restore.backupRunId}`,
    healthResult: 'Ok',
    writeFrozen: false,
  };
  restores.set(input.restoreRunId, switched);
  return { restore: switched };
}

function checkLocalHealth(
  partitions: Map<string, PartitionDTO>,
  capacityAlerts: CapacityAlertDTO[],
  now: () => Date,
): HealthCheckResponse {
  const activePartition = partitions.get('transaction');
  const checks: HealthCheckDTO[] = [
    {
      checkId: 'local-health-registry',
      checkType: 'Registry',
      status: 'Ok',
      observedAt: now().toISOString(),
      resourceKey: 'table-registry',
      message: 'Registry local sẵn sàng.',
    },
    {
      checkId: 'local-health-partition',
      checkType: 'PartitionCapacity',
      status: activePartition !== undefined && activePartition.capacityPct >= 90 ? 'Warning' : 'Ok',
      observedAt: now().toISOString(),
      resourceKey: activePartition?.partitionKey ?? 'transaction',
      message: 'Dung lượng partition trong ngưỡng kiểm soát.',
    },
  ];
  return {
    status: checks.some((check) => check.status === 'Error') ? 'Error' : checks.some((check) => check.status === 'Warning') ? 'Warning' : 'Ok',
    checks,
    capacityAlerts,
  };
}

function ensureLocalNextPartition(
  payload: unknown,
  partitions: Map<string, PartitionDTO>,
  capacityAlerts: CapacityAlertDTO[],
  nextId: (prefix: string) => string,
  now: () => Date,
): PartitionCapacityResponse | ApiResult<PartitionCapacityResponse> {
  const input = parsePartitionCapacityRequest(payload);
  const activePartition = partitions.get(input.storageRole);
  if (activePartition === undefined) {
    return localOperationError('INVALID_INPUT', 'Không tìm thấy partition đang hoạt động.', 'operations.partition.ensureNext', now);
  }

  if (activePartition.capacityPct < input.thresholdPct) {
    return { activePartition };
  }

  const nextPartition: PartitionDTO = {
    partitionId: nextId(`${input.storageRole}-partition`),
    storageRole: input.storageRole,
    partitionKey: 'FY2026-P02',
    status: 'Active',
    activeFrom: now().toISOString(),
    capacityPct: 0,
    readOnly: false,
  };
  partitions.set(`${input.storageRole}:next`, nextPartition);
  const alert: CapacityAlertDTO = {
    alertId: nextId('capacity-alert'),
    alertType: 'PartitionCapacity',
    status: 'Warning',
    observedAt: now().toISOString(),
    resourceKey: activePartition.partitionKey,
    threshold: input.thresholdPct,
    observedValue: activePartition.capacityPct,
  };
  capacityAlerts.push(alert);
  return { activePartition, nextPartition, alert };
}

function cleanupLocalRuntime(
  payload: unknown,
  records: { expiresAt: string; evidence: boolean; deleted: boolean }[],
): RuntimeCleanupResponse {
  const input = parseRuntimeCleanupRequest(payload);
  const cutoff = new Date(input.now).getTime();
  let deletedTechnicalRecordCount = 0;
  let preservedEvidenceCount = 0;

  for (const record of records) {
    if (new Date(record.expiresAt).getTime() > cutoff || record.deleted) continue;
    if (record.evidence) {
      preservedEvidenceCount += 1;
    } else {
      record.deleted = true;
      deletedTechnicalRecordCount += 1;
    }
  }

  return {
    runId: input.runId,
    deletedTechnicalRecordCount,
    preservedEvidenceCount,
  };
}

function stableLocalChecksum(value: unknown): string {
  const json = stableLocalStringify(value);
  let hash = 0;
  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 31 + json.charCodeAt(index)) >>> 0;
  }
  return `checksum-${hash.toString(16)}`;
}

function stableLocalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableLocalStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableLocalStringify(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function createLocalBootstrapStatus(warehouseStatus: 'Active' | 'Disabled'): BootstrapStatusResponse {
  return {
    installed: true,
    ...createLocalBootstrapBaseline(warehouseStatus),
  };
}

function createLocalInstallStatus(): InstallStatusResponse {
  return {
    status: 'Installed',
    installed: true,
    canRetry: false,
    appVersion: '0.1.0',
    schemaVersion: 1,
    tenantDisplayName: 'Cửa hàng mặc định',
  };
}

function createLocalInstallRunResponse(input: {
  tenantDisplayName: string;
  adminLoginId: string;
}): InstallRunResponse {
  return {
    status: 'Installed',
    installed: true,
    tenantDisplayName: input.tenantDisplayName,
    adminLoginId: input.adminLoginId,
    branchName: 'Chi nhánh mặc định',
    warehouseName: 'Kho mặc định',
  };
}

function createLocalCurrentScope(warehouseStatus: 'Active' | 'Disabled'): CurrentScopeResponse {
  const baseline = createLocalBootstrapBaseline(warehouseStatus);

  return {
    tenant: baseline.tenant,
    branches: [baseline.branch],
    warehouses: [baseline.warehouse],
    activeBranchId: baseline.branch.branchId,
    activeWarehouseId: baseline.warehouse.warehouseId,
  };
}

export function createLocalDebugScope(): CurrentScopeResponse {
  return createLocalCurrentScope('Active');
}

function createLocalBootstrapBaseline(warehouseStatus: 'Active' | 'Disabled') {
  const tenant = {
    tenantId: 'tenant-default',
    displayName: 'Cửa hàng mặc định',
    status: 'Active' as const,
    timezone: 'Asia/Ho_Chi_Minh',
    activeConfigVersionId: 'config-default',
  };
  const branch = {
    branchId: 'branch-default',
    tenantId: tenant.tenantId,
    branchCode: 'BR-DEFAULT',
    name: 'Chi nhánh mặc định',
    status: 'Active' as const,
  };
  const warehouse = {
    warehouseId: 'warehouse-default',
    tenantId: tenant.tenantId,
    branchId: branch.branchId,
    warehouseCode: 'WH-DEFAULT',
    name: 'Kho mặc định',
    status: warehouseStatus,
    directSaleEnabled: true,
    negativeStockPolicy: 'Block' as const,
    lotTrackingDefault: false,
    serialTrackingDefault: false,
  };
  const configVersion = {
    configVersionId: 'config-default',
    tenantId: tenant.tenantId,
    configType: 'TenantBaseline' as const,
    effectiveFrom: '2026-07-27T00:00:00.000+07:00',
    status: 'Published' as const,
  };

  return { tenant, branch, warehouse, configVersion };
}

function createLocalPlatformTableDefinitions(): readonly TableDefinitionDTO[] {
  return [
    table('CommandTransaction', 'transaction', 'ledger', 'transaction-period', [
      'id',
      'commandId',
      'idempotencyKey',
      'status',
      'createdAt',
      'updatedAt',
      'resultJson',
    ]),
    table('Session', 'runtime', 'runtime', 'none', [
      'id',
      'tokenFingerprint',
      'userId',
      'authVersion',
      'issuedAt',
      'idleExpiresAt',
      'absoluteExpiresAt',
      'revokedAt',
    ]),
  ];
}

function table(
  tableName: string,
  storageRole: TableDefinitionDTO['storageRole'],
  lifecycle: TableDefinitionDTO['lifecycle'],
  partitionPolicy: TableDefinitionDTO['partitionPolicy'],
  headers: readonly string[],
): TableDefinitionDTO {
  return {
    tableName,
    owner: 'platform',
    storageRole,
    sheetName: tableName,
    lifecycle,
    schemaVersion: 1,
    primaryKey: 'id',
    headers: headers.map((name) => ({
      name,
      type: name.endsWith('Json') ? 'json' : name.endsWith('At') ? 'timestamp' : 'string',
      required: name !== 'revokedAt' && name !== 'resultJson',
    })),
    partitionPolicy,
    lookupKeys: [{ name: `${tableName}.primary`, columns: ['id'], unique: true }],
  };
}
