export interface ScopeSelectionDTO {
  tenantId?: string;
  branchId?: string;
  warehouseId?: string;
}

export interface GrantedScopeDTO {
  tenantId: string;
  branchIds: readonly string[];
  warehouseIds: readonly string[];
}

export interface ActorContextDTO {
  userId: string;
  loginId: string;
  displayName: string;
  tenantId: string;
  authVersion: number;
  actions: readonly string[];
  scope: GrantedScopeDTO;
}

export interface ScopeResolutionDTO {
  tenantId: string;
  branchId?: string;
  warehouseId?: string;
}
