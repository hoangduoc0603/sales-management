import { describe, expect, it } from 'vitest';
import {
  createSheetAuthRepository,
  type CredentialVerifierStore,
} from '../../../apps-script/src/repositories/platform/auth-repository';
import { createPlatformTableDefinitions } from '../../../apps-script/src/services/platform/registry/table-registry';
import type { TableDefinitionDTO } from '../../../shared/contracts/platform/registry';

describe('SheetAuthRepository', () => {
  it('persists user/session metadata through Sheets while keeping credential verifier outside Sheets', () => {
    const gateway = new FakeSheetGateway();
    const credentialStore = new FakeCredentialVerifierStore();
    const repository = createSheetAuthRepository({
      gateway,
      tableDefinitions: createPlatformTableDefinitions(),
      credentialVerifierStore: credentialStore,
    });

    repository.saveUser({
      userId: 'user-admin',
      loginId: 'admin',
      displayName: 'Admin',
      tenantId: 'tenant-default',
      authVersion: 1,
      disabled: false,
      passwordChangeRequired: true,
      passwordVerifier: 'pbkdf2:secret-verifier',
      failedLoginCount: 0,
      actions: ['platform.session.view', 'sales.pos.complete'],
      branchIds: ['branch-default'],
      warehouseIds: ['warehouse-default'],
    });
    repository.saveUser({
      userId: 'user-admin',
      loginId: 'admin',
      displayName: 'Admin',
      tenantId: 'tenant-default',
      authVersion: 2,
      disabled: false,
      passwordChangeRequired: false,
      passwordVerifier: 'pbkdf2:rotated-verifier',
      failedLoginCount: 5,
      lockedUntil: '2026-07-27T09:15:00.000Z',
      actions: ['platform.session.view'],
      branchIds: ['branch-default'],
      warehouseIds: ['warehouse-default'],
    });
    repository.saveSession({
      sessionId: 'session-1',
      tokenFingerprint: 'fingerprint-only',
      userId: 'user-admin',
      authVersion: 2,
      issuedAt: '2026-07-27T09:00:00.000Z',
      idleExpiresAt: '2026-07-27T10:00:00.000Z',
      absoluteExpiresAt: '2026-07-27T17:00:00.000Z',
    });
    repository.saveUpdatedSession({
      sessionId: 'session-1',
      tokenFingerprint: 'fingerprint-only',
      userId: 'user-admin',
      authVersion: 2,
      issuedAt: '2026-07-27T09:00:00.000Z',
      idleExpiresAt: '2026-07-27T10:30:00.000Z',
      absoluteExpiresAt: '2026-07-27T17:00:00.000Z',
      revokedAt: '2026-07-27T09:30:00.000Z',
    });

    expect(repository.findUserByLoginId('admin')).toMatchObject({
      userId: 'user-admin',
      authVersion: 2,
      passwordVerifier: 'pbkdf2:rotated-verifier',
      failedLoginCount: 5,
      lockedUntil: '2026-07-27T09:15:00.000Z',
      actions: ['platform.session.view'],
      branchIds: ['branch-default'],
      warehouseIds: ['warehouse-default'],
    });
    expect(repository.findUserById('user-admin')?.passwordVerifier).toBe('pbkdf2:rotated-verifier');
    expect(repository.findSessionByFingerprint('fingerprint-only')).toMatchObject({
      sessionId: 'session-1',
      revokedAt: '2026-07-27T09:30:00.000Z',
    });
    expect(credentialStore.saved).toEqual([
      ['user-admin', 'pbkdf2:secret-verifier'],
      ['user-admin', 'pbkdf2:rotated-verifier'],
    ]);
    expect(gateway.appendRequests.map((request) => [request.tableName, request.partitionKey])).toEqual([
      ['UserAccount', undefined],
      ['UserAccount', undefined],
      ['Session', undefined],
      ['Session', undefined],
    ]);
    expect(JSON.stringify(gateway.appendRequests)).not.toContain('pbkdf2:secret-verifier');
    expect(JSON.stringify(gateway.appendRequests)).not.toContain('pbkdf2:rotated-verifier');
    expect(JSON.stringify(gateway.appendRequests)).not.toContain('session-token');
  });
});

class FakeCredentialVerifierStore implements CredentialVerifierStore {
  readonly saved: Array<[string, string]> = [];
  private readonly values = new Map<string, string>();

  getVerifier(userId: string): string | undefined {
    return this.values.get(userId);
  }

  saveVerifier(userId: string, verifier: string): void {
    this.saved.push([userId, verifier]);
    this.values.set(userId, verifier);
  }
}

class FakeSheetGateway {
  readonly appendRequests: Array<{ tableName: string; partitionKey?: string; rows: Record<string, unknown>[] }> = [];
  private readonly rowsByTable = new Map<string, Record<string, unknown>[]>();

  readTable(request: { table: TableDefinitionDTO; partitionKey?: string }): Record<string, unknown>[] {
    return this.getRows(request.table.tableName).map(clone);
  }

  appendRows(request: {
    table: TableDefinitionDTO;
    partitionKey?: string;
    rows: readonly Record<string, unknown>[];
  }): { appendedRowCount: number } {
    const rows = request.rows.map(clone);
    this.appendRequests.push({ tableName: request.table.tableName, partitionKey: request.partitionKey, rows });
    this.getRows(request.table.tableName).push(...rows);
    return { appendedRowCount: rows.length };
  }

  private getRows(tableName: string): Record<string, unknown>[] {
    let rows = this.rowsByTable.get(tableName);
    if (rows === undefined) {
      rows = [];
      this.rowsByTable.set(tableName, rows);
    }
    return rows;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
