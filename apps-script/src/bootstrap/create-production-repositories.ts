import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { PlatformCacheStore } from '../infrastructure/platform/cache';
import {
  createSheetAdministrationRepository,
  type AdministrationRepository,
} from '../repositories/platform/administration-repository';
import {
  createSheetAuthRepository,
  type AuthRepository,
  type CredentialVerifierStore,
} from '../repositories/platform/auth-repository';
import {
  createSheetCommandRepository,
  type CommandRepository,
} from '../repositories/platform/command-repository';
import type { AppendOnlySheetRecordGateway } from '../repositories/platform/sheet-record-repository';
import {
  createSheetCatalogRepository,
  type CatalogRepository,
} from '../repositories/catalog/catalog-repository';
import {
  createSheetCustomerRepository,
  type CustomerRepository,
} from '../repositories/crm/customer-repository';
import {
  createSheetInventoryRepository,
  type InventoryRepository,
} from '../repositories/inventory/inventory-repository';
import {
  createSheetFinanceRepository,
  type FinanceRepository,
} from '../repositories/finance/finance-repository';
import {
  createSheetSalesRepository,
  type SalesRepository,
} from '../repositories/sales/sales-repository';
import {
  createSheetOperationsRepository,
  type OperationsRepository,
} from '../repositories/operations/operations-repository';
import {
  createSheetPurchasingRepository,
  type PurchasingRepository,
} from '../repositories/purchasing/purchasing-repository';
import {
  createSheetReportingRepository,
  type ReportingRepository,
} from '../repositories/reporting/reporting-repository';

export interface ProductionRepositories {
  authRepository: AuthRepository;
  administrationRepository: AdministrationRepository;
  commandRepository: CommandRepository;
  catalogRepository: CatalogRepository;
  customerRepository: CustomerRepository;
  inventoryRepository: InventoryRepository;
  purchasingRepository: PurchasingRepository;
  financeRepository: FinanceRepository;
  salesRepository: SalesRepository;
  reportingRepository: ReportingRepository;
  operationsRepository: OperationsRepository;
}

export interface ProductionRepositoryDependencies {
  sheetGateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  transactionPartitionKey: string;
  credentialVerifierStore: CredentialVerifierStore;
  platformCacheStore?: PlatformCacheStore;
}

export function createProductionRepositories(deps: ProductionRepositoryDependencies): ProductionRepositories {
  return {
    authRepository: createSheetAuthRepository({
      gateway: deps.sheetGateway,
      tableDefinitions: deps.tableDefinitions,
      credentialVerifierStore: deps.credentialVerifierStore,
      cacheStore: deps.platformCacheStore,
    }),
    administrationRepository: createSheetAdministrationRepository({
      gateway: deps.sheetGateway,
      tableDefinitions: deps.tableDefinitions,
      cacheStore: deps.platformCacheStore,
    }),
    commandRepository: createSheetCommandRepository({
      gateway: deps.sheetGateway,
      table: findRequiredTable(deps.tableDefinitions, 'CommandTransaction', 'platform'),
      partitionKey: deps.transactionPartitionKey,
    }),
    catalogRepository: createSheetCatalogRepository({
      gateway: deps.sheetGateway,
      tableDefinitions: deps.tableDefinitions,
    }),
    customerRepository: createSheetCustomerRepository({
      gateway: deps.sheetGateway,
      tableDefinitions: deps.tableDefinitions,
    }),
    inventoryRepository: createSheetInventoryRepository({
      gateway: deps.sheetGateway,
      tableDefinitions: deps.tableDefinitions,
      transactionPartitionKey: deps.transactionPartitionKey,
    }),
    purchasingRepository: createSheetPurchasingRepository({
      gateway: deps.sheetGateway,
      tableDefinitions: deps.tableDefinitions,
      transactionPartitionKey: deps.transactionPartitionKey,
    }),
    financeRepository: createSheetFinanceRepository({
      gateway: deps.sheetGateway,
      tableDefinitions: deps.tableDefinitions,
      transactionPartitionKey: deps.transactionPartitionKey,
    }),
    salesRepository: createSheetSalesRepository({
      gateway: deps.sheetGateway,
      tableDefinitions: deps.tableDefinitions,
      transactionPartitionKey: deps.transactionPartitionKey,
    }),
    reportingRepository: createSheetReportingRepository({
      gateway: deps.sheetGateway,
      tableDefinitions: deps.tableDefinitions,
      transactionPartitionKey: deps.transactionPartitionKey,
    }),
    operationsRepository: createSheetOperationsRepository({
      gateway: deps.sheetGateway,
      tableDefinitions: deps.tableDefinitions,
      transactionPartitionKey: deps.transactionPartitionKey,
    }),
  };
}

function findRequiredTable(
  definitions: readonly TableDefinitionDTO[],
  tableName: string,
  ownerLabel: string,
): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) {
    throw new Error(`Missing ${ownerLabel} table definition: ${tableName}`);
  }
  return table;
}
