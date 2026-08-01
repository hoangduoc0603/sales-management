import type {
  ProductDTO,
  UnitConversionVersionDTO,
  VariantBarcodeDTO,
  VariantDTO,
} from '@shared/contracts/catalog/catalog';
import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';
import type { PlatformCacheStore } from '../../infrastructure/platform/cache';
import type { AppendOnlySheetRecordGateway } from '../platform/sheet-record-repository';

export interface CatalogRepository {
  findVariantBySkuNormalized(skuNormalized: string): VariantDTO | undefined;
  findBarcodeByNormalized(barcodeNormalized: string): VariantBarcodeDTO | undefined;
  listProducts(): readonly ProductDTO[];
  listVariants(): readonly VariantDTO[];
  listBarcodes(): readonly VariantBarcodeDTO[];
  listUnitVersions(): readonly UnitConversionVersionDTO[];
  saveProduct(product: ProductDTO): void;
  saveVariant(variant: VariantDTO): void;
  saveBarcode(barcode: VariantBarcodeDTO): void;
  saveUnitVersion(unitVersion: UnitConversionVersionDTO): void;
}

export function createInMemoryCatalogRepository(): CatalogRepository {
  const products = new Map<string, ProductDTO>();
  const variants = new Map<string, VariantDTO>();
  const barcodes = new Map<string, VariantBarcodeDTO>();
  const unitVersions = new Map<string, UnitConversionVersionDTO>();

  return {
    findVariantBySkuNormalized(skuNormalized) {
      return [...variants.values()].find((variant) => variant.skuNormalized === skuNormalized);
    },
    findBarcodeByNormalized(barcodeNormalized) {
      return [...barcodes.values()].find((barcode) => barcode.barcodeNormalized === barcodeNormalized);
    },
    listProducts: () => [...products.values()].map(clone),
    listVariants: () => [...variants.values()].map(clone),
    listBarcodes: () => [...barcodes.values()].map(clone),
    listUnitVersions: () => [...unitVersions.values()].map(clone),
    saveProduct(product) {
      products.set(product.productId, clone(product));
    },
    saveVariant(variant) {
      variants.set(variant.variantId, clone(variant));
    },
    saveBarcode(barcode) {
      barcodes.set(barcode.barcodeId, clone(barcode));
    },
    saveUnitVersion(unitVersion) {
      unitVersions.set(unitVersion.unitVersionId, clone(unitVersion));
    },
  };
}

function clone<T>(value: T): T {
  return { ...value };
}

export interface SheetCatalogRepositoryDependencies {
  gateway: AppendOnlySheetRecordGateway;
  tableDefinitions: readonly TableDefinitionDTO[];
  cacheStore?: PlatformCacheStore;
}

export function createSheetCatalogRepository(deps: SheetCatalogRepositoryDependencies): CatalogRepository {
  const products = createVersionedSheetTable<ProductDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'Product'),
    idField: 'productId',
    cacheStore: deps.cacheStore,
  });
  const variants = createVersionedSheetTable<VariantDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'Variant'),
    idField: 'variantId',
    cacheStore: deps.cacheStore,
  });
  const barcodes = createVersionedSheetTable<VariantBarcodeDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'VariantBarcode'),
    idField: 'barcodeId',
    cacheStore: deps.cacheStore,
  });
  const unitVersions = createVersionedSheetTable<UnitConversionVersionDTO>({
    gateway: deps.gateway,
    table: findTable(deps.tableDefinitions, 'UnitConversionVersion'),
    idField: 'unitVersionId',
    cacheStore: deps.cacheStore,
  });

  return {
    findVariantBySkuNormalized(skuNormalized) {
      return variants.list().find((variant) => variant.skuNormalized === skuNormalized);
    },
    findBarcodeByNormalized(barcodeNormalized) {
      return barcodes.list().find((barcode) => barcode.barcodeNormalized === barcodeNormalized);
    },
    listProducts: () => products.list(),
    listVariants: () => variants.list(),
    listBarcodes: () => barcodes.list(),
    listUnitVersions: () => unitVersions.list(),
    saveProduct(product) {
      products.save(product);
    },
    saveVariant(variant) {
      variants.save(variant);
    },
    saveBarcode(barcode) {
      barcodes.save(barcode);
    },
    saveUnitVersion(unitVersion) {
      unitVersions.save(unitVersion);
    },
  };
}

interface VersionedSheetTableDependencies<TRecord extends object> {
  gateway: AppendOnlySheetRecordGateway;
  table: TableDefinitionDTO;
  idField: keyof TRecord & string;
  cacheStore?: PlatformCacheStore;
}

interface VersionedSheetTable<TRecord extends object> {
  list(): TRecord[];
  save(record: TRecord): void;
}

interface VersionedSheetRow extends Record<string, unknown> {
  id: string;
  schemaVersion: number;
  recordVersion: number;
}

function createVersionedSheetTable<TRecord extends object>(
  deps: VersionedSheetTableDependencies<TRecord>,
): VersionedSheetTable<TRecord> {
  const cacheKey = `catalog.table.${deps.table.tableName}.v${deps.table.schemaVersion}`;

  function readRows(): VersionedSheetRow[] {
    return deps.gateway.readTable({ table: deps.table }).map((row) => deepClone(row) as VersionedSheetRow);
  }

  function latestRows(): VersionedSheetRow[] {
    const latestByRecordId = new Map<string, VersionedSheetRow>();
    for (const row of readRows()) {
      const recordId = String(row[deps.idField] ?? '');
      if (recordId === '') continue;
      const current = latestByRecordId.get(recordId);
      if (current === undefined || getRecordVersion(row) > getRecordVersion(current)) {
        latestByRecordId.set(recordId, row);
      }
    }
    return [...latestByRecordId.values()];
  }

  return {
    list() {
      const cached = readCachedList<TRecord>(deps.cacheStore, cacheKey);
      if (cached !== undefined) return cached;

      const records = latestRows().map((row) => stripSheetMetadata(row) as TRecord);
      writeCachedList(deps.cacheStore, cacheKey, records);
      return records.map(deepClone);
    },
    save(record) {
      deps.cacheStore?.remove(cacheKey);
      const recordData = deepClone(record) as Record<string, unknown>;
      const recordId = String(recordData[deps.idField] ?? '');
      if (recordId.trim() === '') {
        throw new Error(`MissingRecordId:${deps.table.tableName}.${deps.idField}`);
      }
      const nextVersion =
        readRows()
          .filter((row) => String(row[deps.idField] ?? '') === recordId)
          .reduce((max, row) => Math.max(max, getRecordVersion(row)), 0) + 1;
      deps.gateway.appendRows({
        table: deps.table,
        rows: [
          {
            ...recordData,
            id: `${recordId}:v${nextVersion}`,
            schemaVersion: deps.table.schemaVersion,
            recordVersion: nextVersion,
          },
        ],
      });
      deps.cacheStore?.remove(cacheKey);
    },
  };
}

const catalogCacheTtlSeconds = 21_600;
const maxCachePayloadLength = 90_000;

function readCachedList<TRecord extends object>(
  cacheStore: PlatformCacheStore | undefined,
  cacheKey: string,
): TRecord[] | undefined {
  if (cacheStore === undefined) return undefined;
  const raw = cacheStore.get(cacheKey);
  if (raw === undefined) return undefined;
  try {
    return (JSON.parse(raw) as TRecord[]).map(deepClone);
  } catch {
    cacheStore.remove(cacheKey);
    return undefined;
  }
}

function writeCachedList<TRecord extends object>(
  cacheStore: PlatformCacheStore | undefined,
  cacheKey: string,
  records: readonly TRecord[],
): void {
  if (cacheStore === undefined) return;
  const payload = JSON.stringify(records);
  if (payload.length > maxCachePayloadLength) return;
  cacheStore.put(cacheKey, payload, catalogCacheTtlSeconds);
}

function findTable(definitions: readonly TableDefinitionDTO[], tableName: string): TableDefinitionDTO {
  const table = definitions.find((definition) => definition.tableName === tableName);
  if (table === undefined) {
    throw new Error(`Missing catalog table definition: ${tableName}`);
  }
  return table;
}

function getRecordVersion(row: VersionedSheetRow): number {
  if (typeof row.recordVersion === 'number') return row.recordVersion;
  const parsedRecordVersion = Number(row.recordVersion);
  if (Number.isFinite(parsedRecordVersion) && parsedRecordVersion > 0) return parsedRecordVersion;
  const match = /:v(\d+)$/.exec(row.id);
  return match === null ? 0 : Number(match[1]);
}

function stripSheetMetadata(row: VersionedSheetRow): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key !== 'id' && key !== 'schemaVersion' && key !== 'recordVersion') {
      record[key] = value;
    }
  }
  return deepClone(record);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
