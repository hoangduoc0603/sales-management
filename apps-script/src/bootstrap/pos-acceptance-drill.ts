import type { CatalogRepository } from '../repositories/catalog/catalog-repository';
import type { FinanceRepository } from '../repositories/finance/finance-repository';
import type { InventoryRepository } from '../repositories/inventory/inventory-repository';
import type { SalesRepository } from '../repositories/sales/sales-repository';
import type { CommandRepository } from '../repositories/platform/command-repository';
import type { LockProvider } from '../infrastructure/platform/runtime';
import { createPropertiesCredentialVerifierStore } from '../infrastructure/google-workspace/credential-verifier-store';
import { createAppsScriptCacheStore } from '../infrastructure/google-workspace/cache-store';
import { createAppsScriptLockProvider } from '../infrastructure/google-workspace/apps-script-lock-provider';
import { createPropertiesRuntimeConfigStore } from '../infrastructure/google-workspace/runtime-config-store';
import { createSheetGateway, type GoogleSheetsAdvancedService } from '../infrastructure/google-workspace/sheet-gateway';
import { createActiveRuntimeTableLocator } from '../infrastructure/google-workspace/runtime-table-locator';
import { createCatalogService } from '../services/catalog/catalog-service';
import { createPricingService } from '../services/catalog/pricing-service';
import { createFinanceService } from '../services/finance/finance-service';
import { createInventoryService } from '../services/inventory/inventory-service';
import { createCommandCoordinator } from '../services/platform/command/command-coordinator';
import { createPlatformTableDefinitions } from '../services/platform/registry/table-registry';
import { createSalesService } from '../services/sales/sales-service';
import { createProductionRepositories } from './create-production-repositories';
import { readPerformanceSnapshot, withPerformanceTracker } from '../api/performance-tracker';

const fixtureBranchId = 'branch-default';
const fixtureWarehouseId = 'warehouse-default';
const fixtureCashierId = 'user-admin';
const fixtureCashDrawerId = 'drawer-main';
const fixturePaymentMethodId = 'cash';
const fixtureShiftId = 'shift-local-open';
const fixtureSku = 'POS-ACCEPT-001';
const fixtureBarcode = '899999000001';

declare const Sheets: GoogleSheetsAdvancedService;
const fixtureQuantityTargetMilli = 50_000;
const fixtureCheckoutQuantityMilli = 2_000;
const fixtureCheckoutQuantity = 2;
const fixtureUnitPriceVnd = 42_000;
const fixtureUnitCostVnd = 20_000;

export interface PosAcceptanceDrillDependencies {
  tenantId: string;
  catalogRepository: CatalogRepository;
  inventoryRepository: InventoryRepository;
  financeRepository: FinanceRepository;
  salesRepository: SalesRepository;
  commandRepository: CommandRepository;
  lockProvider: LockProvider;
  now: () => Date;
  newId(prefix: string): string;
}

export interface PosAcceptanceDrillResult {
  fixture: {
    branchId: string;
    warehouseId: string;
    cashierId: string;
    cashDrawerId: string;
    paymentMethodId: string;
    shiftId: string;
    variantId: string;
    unitVersionId: string;
    sku: string;
    barcode: string;
  };
  projection: {
    variantCount: number;
    seededVariantVisible: boolean;
    projectionVersion: string;
  };
  checkout: {
    saleOrderId: string;
    businessNumber: string;
    orderStatus: string;
    paymentStatus: string;
    receiptFormat: string;
    totalVnd: number;
    paidVnd: number;
    inventoryMovementTypes: readonly string[];
    paymentStatusFinance?: string;
  };
  stages: PosAcceptanceDrillStageTimings;
}

export interface PosAcceptanceDrillForAppsScriptResult extends PosAcceptanceDrillResult {
  durationMs: number;
  performance: {
    stages: Record<string, number>;
    io: Record<string, number>;
  };
}

export interface PosAcceptanceDrillStageTimings {
  catalogSeedMs: number;
  inventorySeedMs: number;
  financeSeedMs: number;
  shiftSeedMs: number;
  projectionMs: number;
  quoteMs: number;
  checkoutMs: number;
  totalMeasuredMs: number;
}

export function runPosAcceptanceDrill(deps: PosAcceptanceDrillDependencies): PosAcceptanceDrillResult {
  const measuredStartedAt = Date.now();
  const stages: Partial<PosAcceptanceDrillStageTimings> = {};
  const measure = <T>(stage: keyof Omit<PosAcceptanceDrillStageTimings, 'totalMeasuredMs'>, operation: () => T): T => {
    const startedAt = Date.now();
    try {
      return operation();
    } finally {
      stages[stage] = Math.max(0, Date.now() - startedAt);
    }
  };
  const catalogService = createCatalogService({
    repository: deps.catalogRepository,
    tenantId: deps.tenantId,
    now: deps.now,
    newId: deps.newId,
  });
  const inventoryService = createInventoryService({
    repository: deps.inventoryRepository,
    tenantId: deps.tenantId,
    now: deps.now,
    newId: deps.newId,
  });
  const financeService = createFinanceService({
    repository: deps.financeRepository,
    tenantId: deps.tenantId,
    now: deps.now,
    newId: deps.newId,
  });
  const commandCoordinator = createCommandCoordinator({
    commandRepository: deps.commandRepository,
    lockProvider: deps.lockProvider,
    now: deps.now,
    newId: deps.newId,
  });
  const salesService = createSalesService({
    catalogService,
    commandCoordinator,
    financeRepository: deps.financeRepository,
    financeService,
    inventoryService,
    repository: deps.salesRepository,
    tenantId: deps.tenantId,
    now: deps.now,
    newId: deps.newId,
    requireOpenShift: true,
  });

  const product = measure('catalogSeedMs', () => ensureFixtureProduct(deps, catalogService));
  measure('inventorySeedMs', () => ensureFixtureInventory(deps, inventoryService, product.variantId));
  measure('financeSeedMs', () => ensureFixtureFinanceMaster(deps));
  measure('shiftSeedMs', () => ensureFixtureOpenShift(deps));

  const projection = measure('projectionMs', () => catalogService.getPosProjection({
    branchId: fixtureBranchId,
    warehouseId: fixtureWarehouseId,
  }));
  const projectedVariant = projection.variants.find((variant) => variant.variantId === product.variantId);
  if (projectedVariant === undefined) {
    throw new Error(`POS acceptance fixture variant is not visible in POS projection: ${product.variantId}`);
  }

  const quote = measure('quoteMs', () => createPricingService({
    variants: [{
      variantId: product.variantId,
      unitVersionId: product.unitVersionId,
      unitPriceVnd: fixtureUnitPriceVnd,
    }],
    priceRules: [],
    promotions: [],
  }).quoteCart({
    branchId: fixtureBranchId,
    warehouseId: fixtureWarehouseId,
    lines: [{
      lineId: 'pos-acceptance-line-1',
      variantId: product.variantId,
      unitVersionId: product.unitVersionId,
      quantity: fixtureCheckoutQuantity,
    }],
  }));

  const runId = deps.newId('pos-acceptance');
  const checkout = measure('checkoutMs', () => salesService.completePosSale({
    commandId: `cmd-${runId}`,
    idempotencyKey: `idem-${runId}`,
    branchId: fixtureBranchId,
    warehouseId: fixtureWarehouseId,
    cashierId: fixtureCashierId,
    cashDrawerId: fixtureCashDrawerId,
    shiftId: fixtureShiftId,
    quoteVersion: quote.quoteVersion,
    receiptFormat: 'K80',
    lines: [{
      lineId: 'pos-acceptance-line-1',
      variantId: product.variantId,
      unitVersionId: product.unitVersionId,
      quantity: fixtureCheckoutQuantity,
      quantityMilli: fixtureCheckoutQuantityMilli,
      unitPriceVnd: fixtureUnitPriceVnd,
      lineDiscountVnd: 0,
    }],
    tenders: [{
      tenderId: `tender-${runId}`,
      paymentMethodId: fixturePaymentMethodId,
      amountVnd: quote.totalVnd,
    }],
  }));
  if (!checkout.ok) {
    throw new Error(`POS acceptance checkout failed: ${checkout.error.code} ${checkout.error.message}`);
  }

  return {
    fixture: {
      branchId: fixtureBranchId,
      warehouseId: fixtureWarehouseId,
      cashierId: fixtureCashierId,
      cashDrawerId: fixtureCashDrawerId,
      paymentMethodId: fixturePaymentMethodId,
      shiftId: fixtureShiftId,
      variantId: product.variantId,
      unitVersionId: product.unitVersionId,
      sku: fixtureSku,
      barcode: fixtureBarcode,
    },
    projection: {
      variantCount: projection.variants.length,
      seededVariantVisible: true,
      projectionVersion: projection.projectionVersion,
    },
    checkout: {
      saleOrderId: checkout.data.order.saleOrderId,
      businessNumber: checkout.data.order.businessNumber,
      orderStatus: checkout.data.order.status,
      paymentStatus: checkout.data.order.paymentStatus,
      receiptFormat: checkout.data.receipt.receiptFormat,
      totalVnd: checkout.data.order.totalVnd,
      paidVnd: checkout.data.order.paidVnd,
      inventoryMovementTypes: checkout.data.inventoryMovements.map((item) => item.movement.movementType),
      paymentStatusFinance: checkout.data.financeResult?.payment.status,
    },
    stages: {
      catalogSeedMs: stages.catalogSeedMs ?? 0,
      inventorySeedMs: stages.inventorySeedMs ?? 0,
      financeSeedMs: stages.financeSeedMs ?? 0,
      shiftSeedMs: stages.shiftSeedMs ?? 0,
      projectionMs: stages.projectionMs ?? 0,
      quoteMs: stages.quoteMs ?? 0,
      checkoutMs: stages.checkoutMs ?? 0,
      totalMeasuredMs: Math.max(0, Date.now() - measuredStartedAt),
    },
  };
}

export function runPosAcceptanceDrillForAppsScript_(): PosAcceptanceDrillForAppsScriptResult {
  const startedAt = Date.now();
  const properties = PropertiesService.getScriptProperties();
  const runtimeConfig = createPropertiesRuntimeConfigStore({ properties }).getActiveConfig();
  if (runtimeConfig === undefined) {
    throw new Error('Missing active runtime config. Run first-run setup before POS acceptance drill.');
  }

  const tableDefinitions = createPlatformTableDefinitions();
  const sheetGateway = createSheetGateway({
    spreadsheetApp: SpreadsheetApp,
    tableLocator: createActiveRuntimeTableLocator(runtimeConfig),
    sheetsAdvancedService: Sheets,
    deferAppends: true,
  });
  const repositories = createProductionRepositories({
    sheetGateway,
    tableDefinitions,
    transactionPartitionKey: runtimeConfig.storage.transaction.activePartitionKey,
    credentialVerifierStore: createPropertiesCredentialVerifierStore({ properties }),
    platformCacheStore: createAppsScriptCacheStore({ cacheService: CacheService }),
  });
  let sequence = 0;
  const { result, performance } = withPerformanceTracker(() => {
    const drillResult = runPosAcceptanceDrill({
      tenantId: runtimeConfig.tenantId,
      catalogRepository: repositories.catalogRepository,
      inventoryRepository: repositories.inventoryRepository,
      financeRepository: repositories.financeRepository,
      salesRepository: repositories.salesRepository,
      commandRepository: repositories.commandRepository,
      lockProvider: createAppsScriptLockProvider({
        lockService: LockService,
        spreadsheetApp: SpreadsheetApp,
        waitTimeoutMs: 3000,
      }),
      now: () => new Date(),
      newId(prefix) {
        sequence += 1;
        return `${prefix}-${Utilities.getUuid()}-${sequence}`;
      },
    });
    sheetGateway.flushPendingAppends?.();
    return {
      result: drillResult,
      performance: readPerformanceSnapshot(),
    };
  });
  const response = {
    ...result,
    performance,
    durationMs: Math.max(0, Date.now() - startedAt),
  };
  console.log(JSON.stringify({
    operation: 'sales.pos.productionAcceptance',
    ok: true,
    data: response,
  }));
  return response;
}

function ensureFixtureProduct(
  deps: PosAcceptanceDrillDependencies,
  catalogService: ReturnType<typeof createCatalogService>,
): { variantId: string; unitVersionId: string } {
  const existingVariant = deps.catalogRepository.listVariants().find((variant) => variant.sku === fixtureSku);
  if (existingVariant !== undefined) {
    const existingUnit = deps.catalogRepository
      .listUnitVersions()
      .find((unit) => unit.variantId === existingVariant.variantId && unit.isActive && unit.saleEnabled);
    if (existingUnit === undefined) {
      throw new Error(`POS acceptance fixture unit not found for ${existingVariant.variantId}`);
    }
    return {
      variantId: existingVariant.variantId,
      unitVersionId: existingUnit.unitVersionId,
    };
  }

  const created = catalogService.createProduct({
    productCode: 'P-POS-ACCEPT-001',
    name: 'Sữa hạt óc chó POS acceptance',
    productType: 'Stocked',
    sku: fixtureSku,
    barcode: fixtureBarcode,
    defaultUnitId: 'chai',
    unitPriceVnd: fixtureUnitPriceVnd,
  });
  if (!created.ok) {
    throw new Error(`POS acceptance fixture product failed: ${created.error.code} ${created.error.message}`);
  }
  return {
    variantId: created.data.defaultVariant.variantId,
    unitVersionId: created.data.defaultUnit.unitVersionId,
  };
}

function ensureFixtureInventory(
  deps: PosAcceptanceDrillDependencies,
  inventoryService: ReturnType<typeof createInventoryService>,
  variantId: string,
): void {
  const current = deps.inventoryRepository.getBalance(fixtureWarehouseId, variantId);
  const currentAvailable = current?.availableMilli ?? 0;
  if (currentAvailable >= fixtureQuantityTargetMilli) return;

  const deltaMilli = fixtureQuantityTargetMilli - currentAvailable;
  const received = inventoryService.receive({
    commandId: `cmd-pos-acceptance-opening-${variantId}-${deltaMilli}`,
    idempotencyKey: `idem-pos-acceptance-opening-${variantId}-${deltaMilli}`,
    warehouseId: fixtureWarehouseId,
    variantId,
    quantityMilli: deltaMilli,
    unitCostVnd: fixtureUnitCostVnd,
    sourceDocument: {
      sourceType: 'OpeningBalance',
      sourceId: `opening-pos-acceptance-${variantId}`,
    },
  });
  if (!received.ok) {
    throw new Error(`POS acceptance opening inventory failed: ${received.error.code} ${received.error.message}`);
  }
}

function ensureFixtureFinanceMaster(deps: PosAcceptanceDrillDependencies): void {
  deps.financeRepository.saveCashDrawer({
    cashDrawerId: fixtureCashDrawerId,
    tenantId: deps.tenantId,
    branchId: fixtureBranchId,
    drawerCode: 'DRAWER-MAIN',
    name: 'Két tiền chính',
    drawerType: 'Cash',
    status: 'Active',
  });
  deps.financeRepository.savePaymentMethod({
    paymentMethodId: fixturePaymentMethodId,
    tenantId: deps.tenantId,
    methodCode: 'CASH',
    name: 'Tiền mặt',
    methodType: 'Cash',
    status: 'Active',
  });
}

function ensureFixtureOpenShift(deps: PosAcceptanceDrillDependencies): void {
  const existing = deps.financeRepository.getShift(fixtureShiftId);
  if (existing?.status === 'Open') return;

  deps.financeRepository.saveShift({
    shiftId: fixtureShiftId,
    tenantId: deps.tenantId,
    branchId: fixtureBranchId,
    warehouseId: fixtureWarehouseId,
    cashDrawerId: fixtureCashDrawerId,
    cashierId: fixtureCashierId,
    status: 'Open',
    openedAt: deps.now().toISOString(),
    openingCashVnd: 500_000,
    expectedCashVnd: 500_000,
  });
}
