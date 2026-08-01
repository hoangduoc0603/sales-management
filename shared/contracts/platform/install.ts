export type InstallStatus = 'NotInstalled' | 'Installing' | 'Installed' | 'Failed';

export interface InstallStatusResponse {
  status: InstallStatus;
  installed: boolean;
  canRetry: boolean;
  appVersion: string;
  schemaVersion: number;
  tenantDisplayName?: string;
  startedAt?: string;
  completedAt?: string;
  lastErrorMessage?: string;
}

export interface InstallRunRequest {
  tenantDisplayName: string;
  adminLoginId: string;
  adminPassword: string;
  confirmAdminPassword: string;
}

export interface InstallRunResponse {
  status: 'Installed';
  installed: true;
  tenantDisplayName: string;
  adminLoginId: string;
  branchName: string;
  warehouseName: string;
}
