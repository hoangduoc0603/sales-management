const activeRuntimeConfigKey = 'salesManagement.runtimeConfig.active';

export interface RuntimeConfigDTO {
  tenantId: string;
  appVersion: string;
  schemaVersion: number;
  driveRootFolderId: string;
  storage: {
    core: { spreadsheetId: string };
    runtime: { spreadsheetId: string };
    transaction: { activePartitionKey: string; spreadsheetId: string };
  };
  maintenanceMode: boolean;
}

export interface RuntimeConfigStoreDependencies {
  properties: {
    getProperty(key: string): string | null;
    setProperty(key: string, value: string): unknown;
  };
}

export interface RuntimeConfigStore {
  getActiveConfig(): RuntimeConfigDTO | undefined;
  saveActiveConfig(config: RuntimeConfigDTO): void;
}

export function createPropertiesRuntimeConfigStore(
  deps: RuntimeConfigStoreDependencies,
): RuntimeConfigStore {
  return {
    getActiveConfig() {
      const value = deps.properties.getProperty(activeRuntimeConfigKey);
      return value === null ? undefined : JSON.parse(value) as RuntimeConfigDTO;
    },
    saveActiveConfig(config) {
      deps.properties.setProperty(activeRuntimeConfigKey, JSON.stringify(config));
    },
  };
}

export { activeRuntimeConfigKey };
