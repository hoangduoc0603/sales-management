import type { AuthChangeOwnPasswordRequest, AuthLoginRequest } from '@shared/contracts/platform/auth';
import type {
  CatalogCreateProductRequest,
  CatalogPosProjectionRequest,
  CatalogQuoteRequest,
} from '@shared/contracts/catalog/catalog';
import type {
  CustomerQuickCreateRequest,
  CustomerSearchRequest,
} from '@shared/contracts/crm/customer';
import type {
  InventoryBalanceSummaryRequest,
  InventoryIssueForSaleRequest,
  InventoryReceiveRequest,
  InventoryReleaseRequest,
  InventoryReserveRequest,
  InventoryStocktakeApproveRequest,
  InventoryStocktakeOpenRequest,
  InventoryStocktakeSubmitRequest,
  InventoryTransferApproveRequest,
  InventoryTransferCreateRequest,
  InventoryTransferReceiveRequest,
  InventoryTransferShipRequest,
  InventoryReturnReceiveRequest,
  InventoryReturnRestockRequest,
} from '@shared/contracts/inventory/inventory';
import type {
  FinanceAgingProjectionRequest,
  FinanceCashDrawerUpsertRequest,
  FinanceExpenseApproveRequest,
  FinanceMasterDataRequest,
  FinancePaymentRecordRequest,
  FinancePaymentMethodUpsertRequest,
  FinancePaymentReverseRequest,
  FinanceShiftCloseRequest,
  FinanceShiftLockRequest,
  FinanceShiftOpenRequest,
  FinanceSupplierPaymentRecordRequest,
} from '@shared/contracts/finance/finance';
import type {
  PurchasingGoodsReceiptApproveRequest,
  PurchasingGoodsReceiptCreateRequest,
  PurchasingLandedCostAdjustRequest,
  PurchasingPoApproveRequest,
  PurchasingPoCreateRequest,
  PurchasingPoSubmitRequest,
  PurchasingSupplierCreateRequest,
  PurchasingSupplierReturnApproveRequest,
  PurchasingSupplierReturnCreateRequest,
} from '@shared/contracts/purchasing/purchasing';
import type {
  ReportingDashboardRequest,
  ReportingDrillDownRequest,
  ReportingExportRequest,
  ReportingExportStatusRequest,
  ReportingReportQueryRequest,
} from '@shared/contracts/reporting/reporting';
import type {
  AttachmentAccessRequest,
  AttachmentCompleteRequest,
  AttachmentDeleteRequest,
  AttachmentListRequest,
  AttachmentUploadRequest,
  BackupRequest,
  HealthCheckRequest,
  ImportCommitRequest,
  ImportTemplateRequest,
  ImportUploadRequest,
  ImportValidateRequest,
  PartitionCapacityRequest,
  RestorePrepareRequest,
  RestoreSwitchRequest,
  RuntimeCleanupRequest,
} from '@shared/contracts/operations/operations';
import type {
  SalesDraftCancelRequest,
  SalesDraftOpenRequest,
  SalesDraftSaveRequest,
  SalesExchangeCreateRequest,
  SalesOnlineCancelRequest,
  SalesOnlineTransitionRequest,
  SalesOrderDetailRequest,
  SalesOrderListRequest,
  SalesPosCompleteRequest,
  SalesPosCompleteResponse,
  SalesPosPrewarmCheckoutContextRequest,
  SalesReturnCreateRequest,
  SalesReturnResolveRequest,
  SalesWarrantyOpenRequest,
  SalesWarrantyTransitionRequest,
} from '@shared/contracts/sales/sales';
import type {
  BootstrapInstallRequest,
} from '@shared/contracts/platform/bootstrap';
import type { CommandStatusRequest } from '@shared/contracts/platform/command';
import type { DisableWarehouseRequest } from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';
import type { ApiError } from '@shared/contracts/errors';
import { parseDisableWarehouseRequest } from '@shared/schemas/platform/administration';
import { parseAuthChangeOwnPasswordRequest, parseAuthLoginRequest } from '@shared/schemas/platform/auth';
import { parseBootstrapInstallRequest } from '@shared/schemas/platform/bootstrap';
import { parseCommandStatusRequest } from '@shared/schemas/platform/command';
import {
  parseCatalogCreateProductRequest,
  parseCatalogPosProjectionRequest,
  parseCatalogQuoteRequest,
} from '@shared/schemas/catalog/catalog';
import {
  parseCustomerQuickCreateRequest,
  parseCustomerSearchRequest,
} from '@shared/schemas/crm/customer';
import {
  parseInventoryBalanceSummaryRequest,
  parseInventoryIssueForSaleRequest,
  parseInventoryReceiveRequest,
  parseInventoryReleaseRequest,
  parseInventoryReserveRequest,
  parseInventoryStocktakeApproveRequest,
  parseInventoryStocktakeOpenRequest,
  parseInventoryStocktakeSubmitRequest,
  parseInventoryTransferApproveRequest,
  parseInventoryTransferCreateRequest,
  parseInventoryTransferReceiveRequest,
  parseInventoryTransferShipRequest,
  parseInventoryReturnReceiveRequest,
  parseInventoryReturnRestockRequest,
} from '@shared/schemas/inventory/inventory';
import {
  parseFinanceAgingProjectionRequest,
  parseFinanceCashDrawerUpsertRequest,
  parseFinanceExpenseApproveRequest,
  parseFinanceMasterDataRequest,
  parseFinancePaymentRecordRequest,
  parseFinancePaymentMethodUpsertRequest,
  parseFinancePaymentReverseRequest,
  parseFinanceShiftCloseRequest,
  parseFinanceShiftLockRequest,
  parseFinanceShiftOpenRequest,
  parseFinanceSupplierPaymentRecordRequest,
} from '@shared/schemas/finance/finance';
import {
  parsePurchasingGoodsReceiptApproveRequest,
  parsePurchasingGoodsReceiptCreateRequest,
  parsePurchasingLandedCostAdjustRequest,
  parsePurchasingPoApproveRequest,
  parsePurchasingPoCreateRequest,
  parsePurchasingPoSubmitRequest,
  parsePurchasingSupplierCreateRequest,
  parsePurchasingSupplierReturnApproveRequest,
  parsePurchasingSupplierReturnCreateRequest,
} from '@shared/schemas/purchasing/purchasing';
import {
  parseReportingDashboardRequest,
  parseReportingDrillDownRequest,
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
  parseSalesDraftCancelRequest,
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
import { createInvokeHandler, type Clock } from '../api/invoke';
import { createOperationRegistry } from '../api/operation-registry';
import { recordStage } from '../api/performance-tracker';
import { createInMemoryCatalogRepository } from '../repositories/catalog/catalog-repository';
import { createInMemoryCustomerRepository } from '../repositories/crm/customer-repository';
import { createInMemoryFinanceRepository } from '../repositories/finance/finance-repository';
import { createInMemoryInventoryRepository } from '../repositories/inventory/inventory-repository';
import { createInMemoryPurchasingRepository } from '../repositories/purchasing/purchasing-repository';
import { createInMemoryReportingRepository } from '../repositories/reporting/reporting-repository';
import { createInMemorySalesRepository } from '../repositories/sales/sales-repository';
import { createInMemoryOperationsRepository } from '../repositories/operations/operations-repository';
import { createInMemoryAdministrationRepository } from '../repositories/platform/administration-repository';
import { createInMemoryAuthRepository } from '../repositories/platform/auth-repository';
import { createInMemoryCommandRepository } from '../repositories/platform/command-repository';
import { createStaticTableRegistryRepository } from '../repositories/platform/table-registry-repository';
import {
  createImmediateLockProvider,
  type LockProvider,
} from '../infrastructure/platform/runtime';
import { createAdministrationService } from '../services/administration/administration-service';
import { createAuthorizationService } from '../services/platform/authorization/authorization-service';
import { createInMemoryAuthorizationRepository } from '../repositories/platform/authorization-repository';
import { createBootstrapService } from '../services/platform/bootstrap/bootstrap-service';
import { createCommandCoordinator } from '../services/platform/command/command-coordinator';
import {
  actorFromSessionResult,
  createSessionService,
  type IdGenerator,
  type LoginRateLimiter,
  type TokenFingerprinter,
} from '../services/platform/auth/session-service';
import {
  createDeterministicPasswordServiceForTest,
  type PasswordService,
} from '../services/platform/auth/password-service';
import {
  createPlatformTableDefinitions,
  createTableRegistryService,
} from '../services/platform/registry/table-registry';
import { createCatalogService } from '../services/catalog/catalog-service';
import { createPricingService } from '../services/catalog/pricing-service';
import { createCustomerService } from '../services/crm/customer-service';
import { createFinanceService } from '../services/finance/finance-service';
import { createInventoryService } from '../services/inventory/inventory-service';
import { createPurchasingService } from '../services/purchasing/purchasing-service';
import { createReportingService } from '../services/reporting/reporting-service';
import { ensureCurrentDashboardBaselineProjections } from '../services/reporting/dashboard-baseline-projection';
import { createReportingPartitionCoverageResolver } from '../services/reporting/reporting-partition-coverage';
import { createOperationsService } from '../services/operations/operations-service';
import type { AttachmentStorage } from '../services/operations/operations-service';
import type { PlatformCacheStore } from '../infrastructure/platform/cache';
import { createSalesService } from '../services/sales/sales-service';
import type { ProductionRepositories } from './create-production-repositories';

export interface ApiCompositionDependencies {
  clock: Clock;
  repositories?: Partial<ProductionRepositories>;
  passwordService?: PasswordService;
  loginRateLimiter?: LoginRateLimiter;
  tokenFingerprinter?: TokenFingerprinter;
  idGenerator?: IdGenerator;
  lockProvider?: LockProvider;
  tableDefinitions?: ReturnType<typeof createPlatformTableDefinitions>;
  tenantId?: string;
  bootstrapOnStart?: boolean;
  seedDemoReadModels?: boolean;
  afterInvoke?: () => void;
  attachmentStorage?: AttachmentStorage;
  platformCacheStore?: PlatformCacheStore;
}

export function createApiComposition(clock: Clock) {
  return createApiCompositionFromDependencies({ clock });
}

function createDeterministicIdGenerator(): IdGenerator {
  let idSequence = 0;
  return {
    newId(prefix) {
      idSequence += 1;
      return `${prefix}-${idSequence}`;
    },
  };
}

export function createApiCompositionFromDependencies(input: ApiCompositionDependencies) {
  const { clock } = input;
  const idGenerator = input.idGenerator ?? createDeterministicIdGenerator();
  const newId = (prefix: string) => idGenerator.newId(prefix);
  const tenantId = input.tenantId ?? 'tenant-default';
  const passwordService = input.passwordService ?? createDeterministicPasswordServiceForTest();
  const authRepository = input.repositories?.authRepository ?? createInMemoryAuthRepository([]);
  const administrationRepository =
    input.repositories?.administrationRepository ?? createInMemoryAdministrationRepository();
  const bootstrapService = createBootstrapService({
    repository: administrationRepository,
    authRepository,
    passwordService,
  });
  if (input.bootstrapOnStart ?? true) {
    bootstrapService.install({
      tenantDisplayName: 'Cửa hàng mặc định',
      adminLoginId: 'admin',
      temporaryPassword: 'admin123',
    });
  }
  const sessionService = createSessionService({
    clock,
    idGenerator: {
      newId,
    },
    repository: authRepository,
    passwordService,
    loginRateLimiter: input.loginRateLimiter,
    tokenFingerprinter: input.tokenFingerprinter,
  });
  const authorizationService = createAuthorizationService(
    createInMemoryAuthorizationRepository([]),
  );
  const administrationService = createAdministrationService({
    repository: administrationRepository,
    cacheStore: input.platformCacheStore,
  });
  const catalogRepository = input.repositories?.catalogRepository ?? createInMemoryCatalogRepository();
  const customerRepository = input.repositories?.customerRepository ?? createInMemoryCustomerRepository();
  const inventoryRepository = input.repositories?.inventoryRepository ?? createInMemoryInventoryRepository();
  const financeRepository = input.repositories?.financeRepository ?? createInMemoryFinanceRepository();
  const purchasingRepository = input.repositories?.purchasingRepository ?? createInMemoryPurchasingRepository();
  const reportingRepository = input.repositories?.reportingRepository ?? createInMemoryReportingRepository();
  const salesRepository = input.repositories?.salesRepository ?? createInMemorySalesRepository();
  const operationsRepository = input.repositories?.operationsRepository ?? createInMemoryOperationsRepository();
  const catalogService = createCatalogService({
    repository: catalogRepository,
    tenantId,
    now: () => clock.now(),
    newId,
  });
  const customerService = createCustomerService({
    repository: customerRepository,
    tenantId,
    newId,
  });
  const inventoryService = createInventoryService({
    repository: inventoryRepository,
    tenantId,
    now: () => clock.now(),
    newId,
  });
  const financeService = createFinanceService({
    repository: financeRepository,
    tenantId,
    now: () => clock.now(),
    newId,
  });
  const purchasingService = createPurchasingService({
    repository: purchasingRepository,
    inventoryService,
    financeService,
    tenantId,
    now: () => clock.now(),
    newId,
  });
  if (input.seedDemoReadModels ?? true) {
    seedReportingRepository(reportingRepository);
    seedOperationsRepository(operationsRepository);
  }
  const reportingService = createReportingService({
    repository: reportingRepository,
    tenantId,
    now: () => clock.now(),
    newId,
    resolvePartitionCoverage: createReportingPartitionCoverageResolver({
      repository: operationsRepository,
    }),
  });
  const attachmentStorage = input.attachmentStorage ?? {
    savePrivateAttachment() {
      return { driveFileId: newId('drive-file') };
    },
  };
  const operationsService = createOperationsService({
    repository: operationsRepository,
    attachmentStorage,
    tenantId,
    appVersion: '0.1.0',
    schemaVersion: 1,
    now: () => clock.now(),
    newId,
  });
  const commandCoordinator = createCommandCoordinator({
    commandRepository: input.repositories?.commandRepository ?? createInMemoryCommandRepository(),
    lockProvider: input.lockProvider ?? createImmediateLockProvider(),
    now: () => clock.now(),
    newId,
  });
  const tableRegistryService = createTableRegistryService(
    createStaticTableRegistryRepository(input.tableDefinitions ?? createPlatformTableDefinitions()),
  );
  const salesService = createSalesService({
    catalogService,
    commandCoordinator,
    financeRepository,
    financeService,
    inventoryService,
    repository: salesRepository,
    tenantId,
    now: () => clock.now(),
    newId,
    requireOpenShift: true,
  });
  const registry = createOperationRegistry([
    {
      name: 'platform.bootstrap.install',
      kind: 'public',
      parsePayload: parseBootstrapInstallRequest,
      handler: (input) => {
        const install = bootstrapService.install(input as BootstrapInstallRequest);
        if (install.installed) {
          ensureCurrentDashboardBaselineProjections({
            repository: reportingRepository,
            tenantId,
            branches: [install.branch],
            warehouses: [install.warehouse],
            now: () => clock.now(),
          });
        }
        return install;
      },
    },
    {
      name: 'platform.bootstrap.getStatus',
      kind: 'public',
      parsePayload: () => ({}),
      handler: () => bootstrapService.getStatus(),
    },
    {
      name: 'platform.auth.login',
      kind: 'public',
      parsePayload: parseAuthLoginRequest,
      handler: (input) => {
        const login = sessionService.login(input as AuthLoginRequest);
        if (!login.ok) return login;
        const scopeStartedAt = Date.now();
        const scope = administrationService.getCurrentScope(login.data.actor);
        recordStage('login.currentScopeMs', Date.now() - scopeStartedAt);
        return {
          ok: true,
          data: {
            ...login.data,
            currentScope: scope,
          },
        };
      },
    },
    {
      name: 'platform.auth.changeOwnPassword',
      kind: 'mutation',
      requiredAction: 'platform.auth.changeOwnPassword',
      parsePayload: parseAuthChangeOwnPasswordRequest,
      handler: (input, context) =>
        sessionService.changeOwnPassword(
          context.sessionToken ?? '',
          input as AuthChangeOwnPasswordRequest,
        ),
    },
    {
      name: 'platform.auth.logout',
      kind: 'query',
      requiredAction: 'platform.auth.logout',
      parsePayload: () => ({}),
      handler: (_input, context) => sessionService.logout(context.sessionToken ?? ''),
    },
    {
      name: 'platform.session.me',
      kind: 'query',
      requiredAction: 'platform.session.view',
      parsePayload: () => ({}),
      handler: (_input, context) => ({
        actor: context.actor,
        idleExpiresAt: new Date(clock.now().getTime() + 60 * 60 * 1000).toISOString(),
        absoluteExpiresAt: new Date(clock.now().getTime() + 8 * 60 * 60 * 1000).toISOString(),
      }),
    },
    {
      name: 'platform.session.bootstrap',
      kind: 'query',
      requiredAction: 'platform.session.view',
      parsePayload: () => ({}),
      handler: (_input, context) => {
        const actor = requireActor(context.actor);
        const scope = administrationService.getCurrentScope(actor);
        return {
          actor,
          currentScope: scope,
          idleExpiresAt: new Date(clock.now().getTime() + 60 * 60 * 1000).toISOString(),
          absoluteExpiresAt: new Date(clock.now().getTime() + 8 * 60 * 60 * 1000).toISOString(),
        };
      },
    },
    {
      name: 'platform.command.getStatus',
      kind: 'query',
      requiredAction: 'platform.command.view',
      parsePayload: parseCommandStatusRequest,
      handler: (input) => ({
        command: commandCoordinator.getStatus(input as CommandStatusRequest),
      }),
    },
    {
      name: 'platform.registry.getTableDefinitions',
      kind: 'query',
      requiredAction: 'platform.registry.view',
      parsePayload: () => ({}),
      handler: () => ({
        tables: tableRegistryService.getDefinitions(),
      }),
    },
    {
      name: 'platform.scope.getCurrent',
      kind: 'query',
      requiredAction: 'platform.scope.view',
      parsePayload: () => ({}),
      handler: (_input, context) => administrationService.getCurrentScope(requireActor(context.actor)),
    },
    {
      name: 'platform.warehouse.disable',
      kind: 'mutation',
      requiredAction: 'platform.warehouse.update',
      parsePayload: parseDisableWarehouseRequest,
      handler: (input) => administrationService.disableWarehouse(input as DisableWarehouseRequest),
    },
    {
      name: 'catalog.product.create',
      kind: 'mutation',
      requiredAction: 'catalog.product.configure',
      parsePayload: parseCatalogCreateProductRequest,
      handler: (input) => catalogService.createProduct(input as CatalogCreateProductRequest),
    },
    {
      name: 'catalog.pos.getProjection',
      kind: 'query',
      requiredAction: 'catalog.pos.view',
      parsePayload: parseCatalogPosProjectionRequest,
      handler: (input) => catalogService.getPosProjection(input as CatalogPosProjectionRequest),
    },
    {
      name: 'catalog.quote.preview',
      kind: 'query',
      requiredAction: 'catalog.quote.view',
      parsePayload: parseCatalogQuoteRequest,
      handler: (input) => {
        const request = input as CatalogQuoteRequest;
        const projection = catalogService.getPosProjection({
          branchId: request.branchId,
          warehouseId: request.warehouseId,
        });

        return createPricingService({
          variants: projection.variants.map((variant) => ({
            variantId: variant.variantId,
            unitVersionId: variant.unitVersionId,
            unitPriceVnd: variant.unitPriceVnd,
          })),
          priceRules: [],
          promotions: [],
        }).quoteCart(request);
      },
    },
    {
      name: 'crm.customer.quickCreate',
      kind: 'mutation',
      requiredAction: 'crm.customer.create',
      parsePayload: parseCustomerQuickCreateRequest,
      handler: (input) => customerService.quickCreate(input as CustomerQuickCreateRequest),
    },
    {
      name: 'crm.customer.search',
      kind: 'query',
      requiredAction: 'crm.customer.view',
      parsePayload: parseCustomerSearchRequest,
      handler: (input) => customerService.search(input as CustomerSearchRequest),
    },
    {
      name: 'inventory.receive',
      kind: 'mutation',
      requiredAction: 'inventory.movement.create',
      parsePayload: parseInventoryReceiveRequest,
      handler: (input) => inventoryService.receive(input as InventoryReceiveRequest),
    },
    {
      name: 'inventory.issueForSale',
      kind: 'mutation',
      requiredAction: 'inventory.movement.create',
      parsePayload: parseInventoryIssueForSaleRequest,
      handler: (input) => inventoryService.issueForSale(input as InventoryIssueForSaleRequest),
    },
    {
      name: 'inventory.reserve',
      kind: 'mutation',
      requiredAction: 'inventory.reserve',
      parsePayload: parseInventoryReserveRequest,
      handler: (input) => inventoryService.reserve(input as InventoryReserveRequest),
    },
    {
      name: 'inventory.release',
      kind: 'mutation',
      requiredAction: 'inventory.release',
      parsePayload: parseInventoryReleaseRequest,
      handler: (input) => inventoryService.release(input as InventoryReleaseRequest),
    },
    {
      name: 'inventory.return.receive',
      kind: 'mutation',
      requiredAction: 'inventory.return.process',
      parsePayload: parseInventoryReturnReceiveRequest,
      handler: (input) => inventoryService.receiveReturnToQuarantine(input as InventoryReturnReceiveRequest),
    },
    {
      name: 'inventory.return.restock',
      kind: 'mutation',
      requiredAction: 'inventory.return.process',
      parsePayload: parseInventoryReturnRestockRequest,
      handler: (input) => inventoryService.restockReturn(input as InventoryReturnRestockRequest),
    },
    {
      name: 'inventory.balance.getSummary',
      kind: 'query',
      requiredAction: 'inventory.balance.view',
      parsePayload: parseInventoryBalanceSummaryRequest,
      handler: (input) => inventoryService.getBalanceSummary(input as InventoryBalanceSummaryRequest),
    },
    {
      name: 'inventory.transfer.create',
      kind: 'mutation',
      requiredAction: 'inventory.movement.create',
      parsePayload: parseInventoryTransferCreateRequest,
      handler: (input) => inventoryService.createTransfer(input as InventoryTransferCreateRequest),
    },
    {
      name: 'inventory.transfer.approve',
      kind: 'mutation',
      requiredAction: 'inventory.movement.create',
      parsePayload: parseInventoryTransferApproveRequest,
      handler: (input) => inventoryService.approveTransfer(input as InventoryTransferApproveRequest),
    },
    {
      name: 'inventory.transfer.ship',
      kind: 'mutation',
      requiredAction: 'inventory.movement.create',
      parsePayload: parseInventoryTransferShipRequest,
      handler: (input) => inventoryService.shipTransfer(input as InventoryTransferShipRequest),
    },
    {
      name: 'inventory.transfer.receive',
      kind: 'mutation',
      requiredAction: 'inventory.movement.create',
      parsePayload: parseInventoryTransferReceiveRequest,
      handler: (input) => inventoryService.receiveTransfer(input as InventoryTransferReceiveRequest),
    },
    {
      name: 'inventory.stocktake.open',
      kind: 'mutation',
      requiredAction: 'inventory.movement.create',
      parsePayload: parseInventoryStocktakeOpenRequest,
      handler: (input) => inventoryService.openStocktake(input as InventoryStocktakeOpenRequest),
    },
    {
      name: 'inventory.stocktake.submit',
      kind: 'mutation',
      requiredAction: 'inventory.movement.create',
      parsePayload: parseInventoryStocktakeSubmitRequest,
      handler: (input) => inventoryService.submitStocktake(input as InventoryStocktakeSubmitRequest),
    },
    {
      name: 'inventory.stocktake.approve',
      kind: 'mutation',
      requiredAction: 'inventory.movement.create',
      parsePayload: parseInventoryStocktakeApproveRequest,
      handler: (input) => inventoryService.approveStocktake(input as InventoryStocktakeApproveRequest),
    },
    {
      name: 'finance.shift.open',
      kind: 'mutation',
      requiredAction: 'finance.shift.manage',
      parsePayload: parseFinanceShiftOpenRequest,
      handler: (input) => financeService.openShift(input as FinanceShiftOpenRequest),
    },
    {
      name: 'finance.shift.close',
      kind: 'mutation',
      requiredAction: 'finance.shift.manage',
      parsePayload: parseFinanceShiftCloseRequest,
      handler: (input) => financeService.closeShift(input as FinanceShiftCloseRequest),
    },
    {
      name: 'finance.shift.lock',
      kind: 'mutation',
      requiredAction: 'finance.shift.manage',
      parsePayload: parseFinanceShiftLockRequest,
      handler: (input) => financeService.lockShift(input as FinanceShiftLockRequest),
    },
    {
      name: 'finance.payment.record',
      kind: 'mutation',
      requiredAction: 'finance.payment.record',
      parsePayload: parseFinancePaymentRecordRequest,
      handler: (input) => financeService.recordPayment(input as FinancePaymentRecordRequest),
    },
    {
      name: 'finance.supplierPayment.record',
      kind: 'mutation',
      requiredAction: 'finance.supplierPayment.record',
      parsePayload: parseFinanceSupplierPaymentRecordRequest,
      handler: (input) => financeService.recordSupplierPayment(input as FinanceSupplierPaymentRecordRequest),
    },
    {
      name: 'finance.payment.reverse',
      kind: 'mutation',
      requiredAction: 'finance.payment.reverse',
      parsePayload: parseFinancePaymentReverseRequest,
      handler: (input) => financeService.reversePayment(input as FinancePaymentReverseRequest),
    },
    {
      name: 'finance.expense.approve',
      kind: 'mutation',
      requiredAction: 'finance.expense.approve',
      parsePayload: parseFinanceExpenseApproveRequest,
      handler: (input) => financeService.approveExpense(input as FinanceExpenseApproveRequest),
    },
    {
      name: 'finance.master.get',
      kind: 'query',
      requiredAction: 'finance.shift.manage',
      parsePayload: parseFinanceMasterDataRequest,
      handler: (input) => financeService.getMasterData(input as FinanceMasterDataRequest),
    },
    {
      name: 'finance.cashDrawer.upsert',
      kind: 'mutation',
      requiredAction: 'finance.shift.manage',
      parsePayload: parseFinanceCashDrawerUpsertRequest,
      handler: (input) => financeService.upsertCashDrawer(input as FinanceCashDrawerUpsertRequest),
    },
    {
      name: 'finance.paymentMethod.upsert',
      kind: 'mutation',
      requiredAction: 'finance.shift.manage',
      parsePayload: parseFinancePaymentMethodUpsertRequest,
      handler: (input) => financeService.upsertPaymentMethod(input as FinancePaymentMethodUpsertRequest),
    },
    {
      name: 'finance.aging.get',
      kind: 'query',
      requiredAction: 'finance.summary.view',
      parsePayload: parseFinanceAgingProjectionRequest,
      handler: (input) => financeService.getAgingProjection(input as FinanceAgingProjectionRequest),
    },
    {
      name: 'finance.summary.get',
      kind: 'query',
      requiredAction: 'finance.summary.view',
      parsePayload: () => ({}),
      handler: () => financeService.getSummary(),
    },
    {
      name: 'purchasing.supplier.create',
      kind: 'mutation',
      requiredAction: 'purchasing.supplier.manage',
      parsePayload: parsePurchasingSupplierCreateRequest,
      handler: (input) => purchasingService.createSupplier(input as PurchasingSupplierCreateRequest),
    },
    {
      name: 'purchasing.po.create',
      kind: 'mutation',
      requiredAction: 'purchasing.po.manage',
      parsePayload: parsePurchasingPoCreateRequest,
      handler: (input) => purchasingService.createPurchaseOrder(input as PurchasingPoCreateRequest),
    },
    {
      name: 'purchasing.po.submit',
      kind: 'mutation',
      requiredAction: 'purchasing.po.manage',
      parsePayload: parsePurchasingPoSubmitRequest,
      handler: (input) => purchasingService.submitPurchaseOrder(input as PurchasingPoSubmitRequest),
    },
    {
      name: 'purchasing.po.approve',
      kind: 'mutation',
      requiredAction: 'purchasing.po.manage',
      parsePayload: parsePurchasingPoApproveRequest,
      handler: (input) => purchasingService.approvePurchaseOrder(input as PurchasingPoApproveRequest),
    },
    {
      name: 'purchasing.receipt.create',
      kind: 'mutation',
      requiredAction: 'purchasing.receipt.manage',
      parsePayload: parsePurchasingGoodsReceiptCreateRequest,
      handler: (input) => purchasingService.createGoodsReceipt(input as PurchasingGoodsReceiptCreateRequest),
    },
    {
      name: 'purchasing.receipt.approve',
      kind: 'mutation',
      requiredAction: 'purchasing.receipt.manage',
      parsePayload: parsePurchasingGoodsReceiptApproveRequest,
      handler: (input) => purchasingService.approveGoodsReceipt(input as PurchasingGoodsReceiptApproveRequest),
    },
    {
      name: 'purchasing.landedCost.adjust',
      kind: 'mutation',
      requiredAction: 'purchasing.cost.adjust',
      parsePayload: parsePurchasingLandedCostAdjustRequest,
      handler: (input) => purchasingService.adjustLandedCost(input as PurchasingLandedCostAdjustRequest),
    },
    {
      name: 'purchasing.supplierReturn.create',
      kind: 'mutation',
      requiredAction: 'purchasing.supplierReturn.manage',
      parsePayload: parsePurchasingSupplierReturnCreateRequest,
      handler: (input) => purchasingService.createSupplierReturn(input as PurchasingSupplierReturnCreateRequest),
    },
    {
      name: 'purchasing.supplierReturn.approve',
      kind: 'mutation',
      requiredAction: 'purchasing.supplierReturn.manage',
      parsePayload: parsePurchasingSupplierReturnApproveRequest,
      handler: (input) => purchasingService.approveSupplierReturn(input as PurchasingSupplierReturnApproveRequest),
    },
    {
      name: 'sales.draft.save',
      kind: 'mutation',
      requiredAction: 'sales.draft.manage',
      parsePayload: parseSalesDraftSaveRequest,
      handler: (input) => salesService.saveDraft(input as SalesDraftSaveRequest),
    },
    {
      name: 'sales.draft.list',
      kind: 'query',
      requiredAction: 'sales.draft.manage',
      parsePayload: parseSalesDraftOpenRequest,
      handler: (input) => salesService.listDrafts(input as SalesDraftOpenRequest),
    },
    {
      name: 'sales.draft.cancel',
      kind: 'mutation',
      requiredAction: 'sales.draft.manage',
      parsePayload: parseSalesDraftCancelRequest,
      handler: (input) => salesService.cancelDraft(input as SalesDraftCancelRequest),
    },
    {
      name: 'sales.pos.prewarmCheckoutContext',
      kind: 'query',
      requiredAction: 'sales.pos.complete',
      parsePayload: parseSalesPosPrewarmCheckoutContextRequest,
      handler: (input) => salesService.prewarmPosCheckoutContext(input as SalesPosPrewarmCheckoutContextRequest),
    },
    {
      name: 'sales.pos.complete',
      kind: 'mutation',
      requiredAction: 'sales.pos.complete',
      parsePayload: parseSalesPosCompleteRequest,
      handler: (input) =>
        slimSalesPosCompleteResult(salesService.completePosSale(input as SalesPosCompleteRequest)),
    },
    {
      name: 'sales.order.list',
      kind: 'query',
      requiredAction: 'sales.order.view',
      parsePayload: parseSalesOrderListRequest,
      handler: (input) => salesService.listOrders(input as SalesOrderListRequest),
    },
    {
      name: 'sales.order.get',
      kind: 'query',
      requiredAction: 'sales.order.view',
      parsePayload: parseSalesOrderDetailRequest,
      handler: (input) => salesService.getOrder(input as SalesOrderDetailRequest),
    },
    {
      name: 'sales.online.confirm',
      kind: 'mutation',
      requiredAction: 'sales.online.manage',
      parsePayload: parseSalesOnlineTransitionRequest,
      handler: (input) => salesService.confirmOnline(input as SalesOnlineTransitionRequest),
    },
    {
      name: 'sales.online.startPacking',
      kind: 'mutation',
      requiredAction: 'sales.online.manage',
      parsePayload: parseSalesOnlineTransitionRequest,
      handler: (input) => salesService.startPackingOnline(input as SalesOnlineTransitionRequest),
    },
    {
      name: 'sales.online.ship',
      kind: 'mutation',
      requiredAction: 'sales.online.manage',
      parsePayload: parseSalesOnlineTransitionRequest,
      handler: (input) => salesService.shipOnline(input as SalesOnlineTransitionRequest),
    },
    {
      name: 'sales.online.deliver',
      kind: 'mutation',
      requiredAction: 'sales.online.manage',
      parsePayload: parseSalesOnlineTransitionRequest,
      handler: (input) => salesService.deliverOnline(input as SalesOnlineTransitionRequest),
    },
    {
      name: 'sales.online.cancel',
      kind: 'mutation',
      requiredAction: 'sales.online.manage',
      parsePayload: parseSalesOnlineCancelRequest,
      handler: (input) => salesService.cancelOnline(input as SalesOnlineCancelRequest),
    },
    {
      name: 'sales.return.create',
      kind: 'mutation',
      requiredAction: 'sales.return.process',
      parsePayload: parseSalesReturnCreateRequest,
      handler: (input) => salesService.createReturn(input as SalesReturnCreateRequest),
    },
    {
      name: 'sales.return.resolve',
      kind: 'mutation',
      requiredAction: 'sales.return.process',
      parsePayload: parseSalesReturnResolveRequest,
      handler: (input) => salesService.resolveReturn(input as SalesReturnResolveRequest),
    },
    {
      name: 'sales.exchange.create',
      kind: 'mutation',
      requiredAction: 'sales.return.process',
      parsePayload: parseSalesExchangeCreateRequest,
      handler: (input) => salesService.createExchange(input as SalesExchangeCreateRequest),
    },
    {
      name: 'sales.warranty.open',
      kind: 'mutation',
      requiredAction: 'sales.warranty.manage',
      parsePayload: parseSalesWarrantyOpenRequest,
      handler: (input) => salesService.openWarranty(input as SalesWarrantyOpenRequest),
    },
    {
      name: 'sales.warranty.transition',
      kind: 'mutation',
      requiredAction: 'sales.warranty.manage',
      parsePayload: parseSalesWarrantyTransitionRequest,
      handler: (input) => salesService.transitionWarranty(input as SalesWarrantyTransitionRequest),
    },
    {
      name: 'reporting.dashboard.get',
      kind: 'query',
      requiredAction: 'reporting.dashboard.view',
      parsePayload: parseReportingDashboardRequest,
      handler: (input, context) =>
        reportingService.getSalesDashboard({
          actor: requireActor(context.actor),
          request: input as ReportingDashboardRequest,
        }),
    },
    {
      name: 'reporting.report.query',
      kind: 'query',
      requiredAction: 'reporting.report.view',
      parsePayload: parseReportingReportQueryRequest,
      handler: (input, context) =>
        reportingService.queryReport({
          actor: requireActor(context.actor),
          request: input as ReportingReportQueryRequest,
        }),
    },
    {
      name: 'reporting.drillDown.resolve',
      kind: 'query',
      requiredAction: 'reporting.report.view',
      parsePayload: parseReportingDrillDownRequest,
      handler: (input, context) =>
        reportingService.resolveDrillDown({
          actor: requireActor(context.actor),
          request: input as ReportingDrillDownRequest,
        }),
    },
    {
      name: 'reporting.export.request',
      kind: 'mutation',
      requiredAction: 'reporting.export',
      parsePayload: parseReportingExportRequest,
      handler: (input, context) =>
        reportingService.requestExport({
          actor: requireActor(context.actor),
          request: input as ReportingExportRequest,
        }),
    },
    {
      name: 'reporting.export.getStatus',
      kind: 'query',
      requiredAction: 'reporting.export',
      parsePayload: parseReportingExportStatusRequest,
      handler: (input, context) =>
        reportingService.getExportRun({
          actor: requireActor(context.actor),
          request: input as ReportingExportStatusRequest,
        }),
    },
    {
      name: 'operations.import.template',
      kind: 'query',
      requiredAction: 'operations.import.manage',
      parsePayload: parseImportTemplateRequest,
      handler: (input, context) =>
        operationsService.getImportTemplate({
          actor: requireActor(context.actor),
          request: input as ImportTemplateRequest,
        }),
    },
    {
      name: 'operations.import.upload',
      kind: 'mutation',
      requiredAction: 'operations.import.manage',
      parsePayload: parseImportUploadRequest,
      handler: (input, context) =>
        operationsService.uploadImport({
          actor: requireActor(context.actor),
          request: input as ImportUploadRequest,
        }),
    },
    {
      name: 'operations.import.validate',
      kind: 'mutation',
      requiredAction: 'operations.import.manage',
      parsePayload: parseImportValidateRequest,
      handler: (input, context) =>
        operationsService.validateImport({
          actor: requireActor(context.actor),
          request: input as ImportValidateRequest,
        }),
    },
    {
      name: 'operations.import.commit',
      kind: 'mutation',
      requiredAction: 'operations.import.manage',
      parsePayload: parseImportCommitRequest,
      handler: (input, context) =>
        operationsService.commitImport({
          actor: requireActor(context.actor),
          request: input as ImportCommitRequest,
        }),
    },
    {
      name: 'operations.attachment.upload',
      kind: 'mutation',
      requiredAction: 'operations.attachment.manage',
      parsePayload: parseAttachmentUploadRequest,
      handler: (input, context) =>
        operationsService.uploadAttachment({
          actor: requireActor(context.actor),
          request: input as AttachmentUploadRequest,
        }),
    },
    {
      name: 'operations.attachment.list',
      kind: 'query',
      requiredAction: 'operations.attachment.view',
      parsePayload: parseAttachmentListRequest,
      handler: (input, context) =>
        operationsService.listAttachments({
          actor: requireActor(context.actor),
          request: input as AttachmentListRequest,
        }),
    },
    {
      name: 'operations.attachment.complete',
      kind: 'mutation',
      requiredAction: 'operations.attachment.manage',
      parsePayload: parseAttachmentCompleteRequest,
      handler: (input, context) =>
        operationsService.completeAttachment({
          actor: requireActor(context.actor),
          request: input as AttachmentCompleteRequest,
        }),
    },
    {
      name: 'operations.attachment.download',
      kind: 'query',
      requiredAction: 'operations.attachment.view',
      parsePayload: parseAttachmentAccessRequest,
      handler: (input, context) =>
        operationsService.downloadAttachment({
          actor: requireActor(context.actor),
          request: input as AttachmentAccessRequest,
        }),
    },
    {
      name: 'operations.attachment.delete',
      kind: 'mutation',
      requiredAction: 'operations.attachment.manage',
      parsePayload: parseAttachmentDeleteRequest,
      handler: (input, context) =>
        operationsService.deleteAttachment({
          actor: requireActor(context.actor),
          request: input as AttachmentDeleteRequest,
        }),
    },
    {
      name: 'operations.backup.request',
      kind: 'mutation',
      requiredAction: 'operations.backup.manage',
      parsePayload: parseBackupRequest,
      handler: (input, context) =>
        operationsService.requestBackup({
          actor: requireActor(context.actor),
          request: input as BackupRequest,
        }),
    },
    {
      name: 'operations.backup.list',
      kind: 'query',
      requiredAction: 'operations.backup.manage',
      parsePayload: () => ({}),
      handler: (_input, context) =>
        operationsService.listBackups({
          actor: requireActor(context.actor),
        }),
    },
    {
      name: 'operations.restore.prepare',
      kind: 'mutation',
      requiredAction: 'operations.restore.manage',
      parsePayload: parseRestorePrepareRequest,
      handler: (input, context) =>
        operationsService.prepareRestore({
          actor: requireActor(context.actor),
          request: input as RestorePrepareRequest,
        }),
    },
    {
      name: 'operations.restore.switch',
      kind: 'mutation',
      requiredAction: 'operations.restore.manage',
      parsePayload: parseRestoreSwitchRequest,
      handler: (input, context) =>
        operationsService.switchRestore({
          actor: requireActor(context.actor),
          request: input as RestoreSwitchRequest,
        }),
    },
    {
      name: 'operations.health.check',
      kind: 'query',
      requiredAction: 'operations.health.view',
      parsePayload: parseHealthCheckRequest,
      handler: (input, context) =>
        operationsService.checkHealth({
          actor: requireActor(context.actor),
          request: input as HealthCheckRequest,
        }),
    },
    {
      name: 'operations.partition.ensureNext',
      kind: 'mutation',
      requiredAction: 'operations.partition.manage',
      parsePayload: parsePartitionCapacityRequest,
      handler: (input, context) =>
        operationsService.ensureNextPartition({
          actor: requireActor(context.actor),
          request: input as PartitionCapacityRequest,
        }),
    },
    {
      name: 'operations.runtime.cleanupExpired',
      kind: 'mutation',
      requiredAction: 'operations.runtime.cleanup',
      parsePayload: parseRuntimeCleanupRequest,
      handler: (input, context) =>
        operationsService.cleanupExpiredRuntimeData({
          actor: requireActor(context.actor),
          request: input as RuntimeCleanupRequest,
        }),
    },
  ]);

  return {
    invoke: createInvokeHandler({
      clock,
      registry,
      authenticate: (sessionToken) => actorFromSessionResult(sessionService.validateSession(sessionToken)),
      authorize: (actor, action) => authorizationService.requireAction(actor, action).ok,
      afterInvoke: input.afterInvoke,
    }),
  };
}

function seedOperationsRepository(repository: ReturnType<typeof createInMemoryOperationsRepository>): void {
  repository.savePartition({
    partitionId: 'partition-transaction-1',
    storageRole: 'transaction',
    partitionKey: 'FY2026-P01',
    status: 'Active',
    activeFrom: '2026-01-01',
    capacityPct: 87,
    readOnly: false,
    rowCount: 42,
  });
}

type CompositionServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

function slimSalesPosCompleteResult(
  result: CompositionServiceResult<SalesPosCompleteResponse>,
): CompositionServiceResult<SalesPosCompleteResponse> {
  if (!result.ok) {
    return result;
  }

  const { order, lines, receipt, conflicts, receivable } = result.data;

  return {
    ok: true,
    data: {
      order,
      lines,
      receipt,
      conflicts,
      inventoryMovements: [],
      ...(receivable === undefined ? {} : { receivable }),
    },
  };
}

function seedReportingRepository(repository: ReturnType<typeof createInMemoryReportingRepository>): void {
  repository.saveDashboardProjection({
    tenantId: 'tenant-default',
    branchId: 'branch-default',
    warehouseId: 'warehouse-default',
    dateBucket: '2026-07-26',
    response: {
      metadata: {
        generatedAt: '2026-07-27T09:00:00.000Z',
        asOf: '2026-07-27T08:59:30.000Z',
        partitionCoverage: {
          status: 'Complete',
          activeFrom: '2026-07-26',
          activeTo: '2026-07-26',
          archiveIncluded: false,
        },
        archiveIncluded: false,
      },
      scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
      kpis: [
        { kpiId: 'netRevenue', label: 'Doanh thu thuần', valueVnd: 286_450_000, trendPct: 11.6 },
        { kpiId: 'completedOrders', label: 'Đơn hoàn tất', valueCount: 1284 },
        { kpiId: 'collected', label: 'Đã thu', valueVnd: 259_830_000 },
        { kpiId: 'receivableOverdue', label: 'Phải thu / quá hạn', valueVnd: 26_620_000 },
      ],
      revenueSeries: [{ bucket: '18:00', currentNetRevenueVnd: 42_800_000, previousNetRevenueVnd: 38_350_000 }],
      decisionQueue: [
        {
          itemId: 'decision-low-stock-1',
          itemType: 'LowStock',
          title: 'Tồn thấp: Sữa hạt óc chó 1L',
          description: 'Còn 4 thùng, dưới ngưỡng tối thiểu 12.',
          priority: 'High',
          actionLabel: 'Xử lý',
        },
      ],
      manualOrders: [
        {
          orderId: 'SO-260726-01842',
          source: 'Phone',
          customerName: 'Trần Thị Hồng Nhung',
          ageMinutes: 18,
          status: 'PendingConfirmation',
          valueVnd: 2_680_000,
        },
      ],
      restricted: { sensitiveFields: [] },
    },
  });
  repository.saveReportRows('sales-profit', [
    { branchId: 'branch-default', netRevenueVnd: 286_450_000, cogsVnd: 180_000_000, grossProfitVnd: 106_450_000 },
  ]);
  repository.saveReportRows('sales-summary', [
    { branchId: 'branch-default', netRevenueVnd: 286_450_000 },
  ]);
}

function requireActor(actor: ActorContextDTO | undefined): ActorContextDTO {
  if (actor === undefined) {
    throw new Error('Authenticated actor is required.');
  }

  return actor;
}
