import type {
  BranchDTO,
  RoleDTO,
  TenantConfigVersionDTO,
  TenantDTO,
  WarehouseDTO,
} from './administration';
import type { ActorContextDTO } from './authorization';

export interface BootstrapInstallRequest {
  tenantDisplayName?: string;
  adminLoginId?: string;
  temporaryPassword?: string;
  adminPasswordChangeRequired?: boolean;
}

export interface BootstrapInstallResponse {
  installed: boolean;
  alreadyInstalled: boolean;
  tenant: TenantDTO;
  branch: BranchDTO;
  warehouse: WarehouseDTO;
  admin: ActorContextDTO;
  adminTemporaryPasswordShownOnce: boolean;
  roles: readonly RoleDTO[];
  configVersion: TenantConfigVersionDTO;
}

export interface BootstrapStatusResponse {
  installed: boolean;
  tenant?: TenantDTO;
  branch?: BranchDTO;
  warehouse?: WarehouseDTO;
  configVersion?: TenantConfigVersionDTO;
}
