export interface AuthorizationScopeCheckResponse {
  authorized: true;
  checkedScopes: string[];
  rootFolderId: string;
}

export function authorizeSetupScopesForAppsScript_(): AuthorizationScopeCheckResponse {
  const properties = PropertiesService.getScriptProperties();
  properties.getKeys();

  const rootFolderId = DriveApp.getRootFolder().getId();
  SpreadsheetApp.flush();

  return {
    authorized: true,
    checkedScopes: [
      'https://www.googleapis.com/auth/script.storage',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
    rootFolderId,
  };
}
