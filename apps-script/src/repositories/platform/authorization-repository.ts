export interface UserAuthorizationRecord {
  userId: string;
  actions: readonly string[];
  tenantId: string;
  branchIds: readonly string[];
  warehouseIds: readonly string[];
}

export interface AuthorizationRepository {
  findUserAuthorization(userId: string): UserAuthorizationRecord | undefined;
}

export function createInMemoryAuthorizationRepository(
  records: readonly UserAuthorizationRecord[],
): AuthorizationRepository {
  const byUserId = new Map(records.map((record) => [record.userId, record]));

  return {
    findUserAuthorization(userId) {
      return byUserId.get(userId);
    },
  };
}
