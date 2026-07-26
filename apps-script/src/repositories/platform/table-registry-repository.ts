import type { TableDefinitionDTO } from '@shared/contracts/platform/registry';

export interface TableRegistryRepository {
  listDefinitions(): readonly TableDefinitionDTO[];
}

export function createStaticTableRegistryRepository(
  definitions: readonly TableDefinitionDTO[],
): TableRegistryRepository {
  return {
    listDefinitions() {
      return definitions;
    },
  };
}
