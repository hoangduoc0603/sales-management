export interface TenantDTO {
  tenantId: string;
  displayName: string;
  status: 'Active' | 'Disabled';
  timezone: string;
  activeConfigVersionId: string;
}

export interface BranchDTO {
  branchId: string;
  tenantId: string;
  branchCode: string;
  name: string;
  status: 'Active' | 'Disabled';
}

export interface WarehouseDTO {
  warehouseId: string;
  tenantId: string;
  branchId: string;
  warehouseCode: string;
  name: string;
  status: 'Active' | 'Disabled';
  directSaleEnabled: boolean;
  negativeStockPolicy: 'Block' | 'AllowWithApproval';
  lotTrackingDefault: boolean;
  serialTrackingDefault: boolean;
}

export interface RoleDTO {
  roleId: string;
  tenantId: string;
  name: string;
  status: 'Active' | 'Disabled';
}

export interface TenantConfigVersionDTO {
  configVersionId: string;
  tenantId: string;
  configType: 'TenantBaseline';
  effectiveFrom: string;
  status: 'Published';
}

export interface CurrentScopeResponse {
  tenant: TenantDTO;
  branches: readonly BranchDTO[];
  warehouses: readonly WarehouseDTO[];
  activeBranchId: string;
  activeWarehouseId: string;
}

export interface DisableWarehouseRequest {
  warehouseId: string;
  reason: string;
}

export interface DisableWarehouseResponse {
  disabled: boolean;
  blockers: readonly WarehouseDisableBlockerDTO[];
}

export interface WarehouseDisableBlockerDTO {
  type: 'OnHandStock' | 'OpenShift' | 'OpenDocument' | 'AssignedUserScope';
  objectId: string;
  message: string;
}
