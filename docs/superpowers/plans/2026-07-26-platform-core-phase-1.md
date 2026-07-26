# Platform Core Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Xây platform runtime nền tảng để mọi domain sau này đi qua cùng typed RPC gateway, session nội bộ, permission/scope backend, command idempotency và registry/schema seam.

**Architecture:** Phase này mở rộng foundation hiện có theo hướng contract-first: `shared/` định nghĩa operation/auth/session/command/table registry contract; `apps-script/src/api/` sở hữu pipeline và operation registry; `apps-script/src/services/platform/` sở hữu auth, authorization và command coordinator; `apps-script/src/repositories/` và `apps-script/src/infrastructure/` chỉ cung cấp seam testable, chưa hard-code Google Sheets thật. Mọi mutation mẫu dùng command journal và audit outbox contract trước khi domain nghiệp vụ được triển khai.

**Tech Stack:** TypeScript, Zod, Vitest, Google Apps Script type definitions, React/Vite foundation hiện có.

## Global Constraints

- Trước khi code phải đọc `AGENTS.md`, `docs/architecture/folder-structure.md`, `docs/architecture/lld-traceability-review.md`, `docs/architecture/detailed-design.md`, `docs/architecture/platform-technical-design.md`, `docs/architecture/security-and-access.md`, `docs/data-model/sheet-schema-and-registry.md`, `docs/data-model/storage-partitioning-and-lifecycle.md`, ADR `0001`, `0005`, `0008`, `0009`, `0010`.
- Không dùng Google identity làm actor ứng dụng. Login công khai duy nhất là `platform.auth.login`.
- Mọi operation ngoài login phải có session hợp lệ và được kiểm tra permission/scope ở backend trước handler.
- Không lưu password/token plaintext trong source, log, telemetry, audit hoặc command response.
- Session idle expiry là 1 giờ; absolute expiry là 8 giờ; đổi role/scope/reset password/disable user phải revoke bằng `authVersion`.
- Login sai 5 lần liên tiếp khóa account 15 phút.
- Mutation nghiệp vụ phải có `commandId` và `idempotencyKey`; retry cùng idempotency key không tạo outcome trùng.
- `CommandTransaction` có trạng thái `Preparing`, `Committed`, `Failed`; chỉ `Committed` mới được trả như success nghiệp vụ.
- Command tạo audit outbox bền vững cùng transaction hot path; worker delivery sang audit partition không nằm trong Phase 1.
- Không hard-code spreadsheet ID, sheet name, header index, Drive folder ID, row number hoặc secret.
- Table registry/migration chỉ tạo table hoặc append cột; không đổi nghĩa cột cũ.

---

## File Structure

- Create `shared/contracts/platform/operations.ts`: typed `OperationName`, operation kind, action/scope type và constants operation nền tảng.
- Create `shared/contracts/platform/auth.ts`: DTO login/session/me/logout.
- Create `shared/contracts/platform/authorization.ts`: permission action, actor context DTO, scope DTO.
- Create `shared/contracts/platform/command.ts`: command status/result DTO và command state.
- Create `shared/contracts/platform/registry.ts`: table definition, column definition, migration/table locator DTO.
- Modify `shared/contracts/errors.ts`: mở rộng error code nền tảng.
- Modify `shared/contracts/api.ts`: `ApiRequest.operation` dùng `OperationName`; bổ sung `ApiMeta` stage/I/O keys ổn định.
- Create `shared/schemas/platform/*.ts`: Zod schema cho auth, command, registry.
- Modify `shared/schemas/api.ts`: validate operation theo allowlist shared.
- Create `apps-script/src/api/operation-registry.ts`: registry entry, register/get operation và public/session/permission policy.
- Create `apps-script/src/api/api-context.ts`: tạo `ApiContext`, timing, request metadata và actor context.
- Modify `apps-script/src/api/invoke.ts`: pipeline validate -> registry -> auth -> permission/scope -> payload -> command guard -> handler -> result.
- Create `apps-script/src/services/platform/auth/session-service.ts`: login/logout/session validation/change-auth-version behavior qua repository seam.
- Create `apps-script/src/services/platform/auth/password-service.ts`: password verifier interface và deterministic test implementation seam.
- Create `apps-script/src/services/platform/authorization/authorization-service.ts`: permission and scope resolver.
- Create `apps-script/src/services/platform/command/command-coordinator.ts`: idempotent command wrapper and status lookup.
- Create `apps-script/src/services/platform/registry/table-registry.ts`: table definition validation, header map, migration planning.
- Create `apps-script/src/repositories/platform/*.ts`: repository interfaces and in-memory implementations for tests/composition.
- Create `apps-script/src/infrastructure/platform/runtime.ts`: `Clock`, `IdGenerator`, `LockProvider`, telemetry and runtime dependency interfaces.
- Modify `apps-script/src/bootstrap/create-api-composition.ts`: wire platform services, in-memory repository defaults for tests, and initial operations.
- Create `tests/apps-script/platform/*.test.ts`: TDD tests for registry, auth/session, authorization, command coordinator, API pipeline.

## Task 1: Shared Platform Contracts and Schemas

**Files:**
- Create: `shared/contracts/platform/operations.ts`
- Create: `shared/contracts/platform/auth.ts`
- Create: `shared/contracts/platform/authorization.ts`
- Create: `shared/contracts/platform/command.ts`
- Create: `shared/contracts/platform/registry.ts`
- Modify: `shared/contracts/errors.ts`
- Modify: `shared/contracts/api.ts`
- Create: `shared/schemas/platform/auth.ts`
- Create: `shared/schemas/platform/command.ts`
- Create: `shared/schemas/platform/registry.ts`
- Modify: `shared/schemas/api.ts`
- Test: `tests/shared/platform-contracts.test.ts`

**Interfaces:**
- Produces: `operationNames`, `OperationName`, `ApiAction`, `AuthLoginRequest`, `AuthLoginResponse`, `ActorContextDTO`, `CommandStatusDTO`, `TableDefinitionDTO`.
- Consumes: existing `ApiRequest`, `ApiResult`, `ApiError`.

- [x] **Step 1: Write failing test for operation allowlist and login schema**

```ts
import { describe, expect, it } from 'vitest';
import { operationNames } from '@shared/contracts/platform/operations';
import { parseApiRequest } from '@shared/schemas/api';
import { parseAuthLoginRequest } from '@shared/schemas/platform/auth';

describe('platform shared contracts', () => {
  it('chỉ chấp nhận operation nằm trong allowlist shared', () => {
    expect(operationNames).toContain('platform.auth.login');
    expect(() =>
      parseApiRequest({ operation: 'raw.sheet.query', requestId: 'req-1', payload: {} }),
    ).toThrow();
  });

  it('parse login request không nhận password rỗng', () => {
    expect(parseAuthLoginRequest({ loginId: 'admin', password: 'secret' })).toEqual({
      loginId: 'admin',
      password: 'secret',
    });
    expect(() => parseAuthLoginRequest({ loginId: 'admin', password: '' })).toThrow();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/platform-contracts.test.ts`

Expected: FAIL because platform contract files do not exist.

- [x] **Step 3: Implement minimal contracts/schemas**

Create the files listed in this task. `operationNames` must include exactly these Phase 1 operations:

```ts
[
  'platform.auth.login',
  'platform.auth.logout',
  'platform.session.me',
  'platform.command.getStatus',
  'platform.registry.getTableDefinitions',
] as const
```

Extend `ApiErrorCode` with: `INVALID_INPUT`, `SESSION_REQUIRED`, `SESSION_EXPIRED`, `PERMISSION_DENIED`, `SCOPE_DENIED`, `COMMAND_REQUIRED`, `COMMAND_ALREADY_COMMITTED`, `COMMAND_PENDING`, `VERSION_CONFLICT`, `LOCK_TIMEOUT`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/platform-contracts.test.ts tests/shared/api-schema.test.ts`

Expected: PASS.

## Task 2: API Operation Registry and Context Pipeline

**Files:**
- Create: `apps-script/src/api/operation-registry.ts`
- Create: `apps-script/src/api/api-context.ts`
- Modify: `apps-script/src/api/invoke.ts`
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Test: `tests/apps-script/platform/api-pipeline.test.ts`

**Interfaces:**
- Consumes: `OperationName`, shared schemas from Task 1.
- Produces: `OperationRegistry`, `OperationEntry<TInput, TOutput>`, `ApiContext`, `createInvokeHandler(deps)`.

- [x] **Step 1: Write failing test for public login and protected operation**

```ts
import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

const composition = createApiComposition({
  now: () => new Date('2026-07-26T00:00:00.000Z'),
});

describe('platform API pipeline', () => {
  it('cho phép gọi login public không cần session', () => {
    const result = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    expect(result).toMatchObject({ ok: true });
    expect(JSON.stringify(result)).not.toContain('admin123');
  });

  it('chặn protected operation khi thiếu session', () => {
    const result = composition.invoke({
      operation: 'platform.session.me',
      requestId: 'req-me',
      payload: {},
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'SESSION_REQUIRED' },
      meta: { requestId: 'req-me', operation: 'platform.session.me' },
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/apps-script/platform/api-pipeline.test.ts`

Expected: FAIL because registry and login operation are not implemented.

- [x] **Step 3: Implement registry and invoke pipeline**

Implement:

```ts
type OperationKind = 'public' | 'query' | 'mutation';
type OperationEntry<TInput, TOutput> = {
  name: OperationName;
  kind: OperationKind;
  requiredAction?: ApiAction;
  parsePayload: (payload: unknown) => TInput;
  handler: (input: TInput, context: ApiContext) => TOutput;
};
```

`createInvokeHandler` must:

1. parse envelope;
2. reject missing operation with `INVALID_REQUEST`;
3. reject unsupported operation with `OPERATION_NOT_SUPPORTED`;
4. authenticate for non-public operation;
5. parse payload;
6. call handler;
7. return sanitized `ApiResult`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/apps-script/platform/api-pipeline.test.ts tests/apps-script/invoke.test.ts`

Expected: PASS.

## Task 3: Auth, Session, Lockout and Revoke

**Files:**
- Create: `apps-script/src/services/platform/auth/password-service.ts`
- Create: `apps-script/src/services/platform/auth/session-service.ts`
- Create: `apps-script/src/repositories/platform/auth-repository.ts`
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Test: `tests/apps-script/platform/auth-session.test.ts`

**Interfaces:**
- Produces: `SessionService.login`, `SessionService.validateSession`, `SessionService.logout`, `SessionService.revokeUserSessions`.
- Consumes: `Clock`, `IdGenerator`, repository interfaces.

- [x] **Step 1: Write failing tests for lockout, idle expiry and auth version revoke**

```ts
import { describe, expect, it } from 'vitest';
import { createSessionServiceForTest } from '../../../apps-script/src/services/platform/auth/session-service';

describe('SessionService', () => {
  it('khóa 15 phút sau 5 lần sai mật khẩu', () => {
    const service = createSessionServiceForTest({ nowIso: '2026-07-26T00:00:00.000Z' });

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect(service.login({ loginId: 'admin', password: 'wrong' }).ok).toBe(false);
    }

    const locked = service.login({ loginId: 'admin', password: 'admin123' });
    expect(locked).toMatchObject({ ok: false, error: { code: 'AUTH_LOCKED' } });
  });

  it('hết hạn idle sau 1 giờ và absolute sau 8 giờ', () => {
    const service = createSessionServiceForTest({ nowIso: '2026-07-26T00:00:00.000Z' });
    const login = service.login({ loginId: 'admin', password: 'admin123' });
    if (!login.ok) throw new Error('login failed');

    service.setNow('2026-07-26T01:00:01.000Z');
    expect(service.validateSession(login.data.sessionToken)).toMatchObject({
      ok: false,
      error: { code: 'SESSION_EXPIRED' },
    });
  });

  it('từ chối session khi authVersion của user thay đổi', () => {
    const service = createSessionServiceForTest({ nowIso: '2026-07-26T00:00:00.000Z' });
    const login = service.login({ loginId: 'admin', password: 'admin123' });
    if (!login.ok) throw new Error('login failed');

    service.bumpAuthVersion('user-admin');

    expect(service.validateSession(login.data.sessionToken)).toMatchObject({
      ok: false,
      error: { code: 'SESSION_EXPIRED' },
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/apps-script/platform/auth-session.test.ts`

Expected: FAIL because session service does not exist.

- [x] **Step 3: Implement auth/session service**

Use deterministic password verifier only for tests and local composition. Store only password verifier label in memory fixture, never plaintext in returned DTO. Session tokens are opaque generated IDs.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/apps-script/platform/auth-session.test.ts`

Expected: PASS.

## Task 4: Authorization and Scope Resolver

**Files:**
- Create: `apps-script/src/services/platform/authorization/authorization-service.ts`
- Create: `apps-script/src/repositories/platform/authorization-repository.ts`
- Modify: `apps-script/src/api/invoke.ts`
- Test: `tests/apps-script/platform/authorization.test.ts`

**Interfaces:**
- Produces: `AuthorizationService.requireAction`, `AuthorizationService.resolveScope`.
- Consumes: `ActorContextDTO`, `ApiAction`.

- [x] **Step 1: Write failing tests for permission and warehouse scope denial**

```ts
import { describe, expect, it } from 'vitest';
import { createAuthorizationServiceForTest } from '../../../apps-script/src/services/platform/authorization/authorization-service';

describe('AuthorizationService', () => {
  it('từ chối action không nằm trong role permission', () => {
    const service = createAuthorizationServiceForTest();
    const result = service.requireAction({ userId: 'cashier-1' }, 'platform.registry.view');
    expect(result).toEqual({ ok: false, code: 'PERMISSION_DENIED' });
  });

  it('từ chối warehouse ngoài scope đã cấp', () => {
    const service = createAuthorizationServiceForTest();
    const result = service.resolveScope({ userId: 'cashier-1' }, { warehouseId: 'warehouse-2' });
    expect(result).toEqual({ ok: false, code: 'SCOPE_DENIED' });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/apps-script/platform/authorization.test.ts`

Expected: FAIL because authorization service does not exist.

- [x] **Step 3: Implement permission/scope service and integrate API pipeline**

Protected operations must call authorization before handler. Repository/service must receive verified actor/scope, not raw session token.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/apps-script/platform/authorization.test.ts tests/apps-script/platform/api-pipeline.test.ts`

Expected: PASS.

## Task 5: Command Coordinator, Idempotency and Audit Outbox Contract

**Files:**
- Create: `apps-script/src/services/platform/command/command-coordinator.ts`
- Create: `apps-script/src/repositories/platform/command-repository.ts`
- Create: `apps-script/src/repositories/platform/audit-outbox-repository.ts`
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Test: `tests/apps-script/platform/command-coordinator.test.ts`

**Interfaces:**
- Produces: `CommandCoordinator.run`, `CommandCoordinator.getStatus`.
- Consumes: `LockProvider`, `Clock`, command repository, audit outbox repository.

- [x] **Step 1: Write failing test for idempotent committed command**

```ts
import { describe, expect, it } from 'vitest';
import { createCommandCoordinatorForTest } from '../../../apps-script/src/services/platform/command/command-coordinator';

describe('CommandCoordinator', () => {
  it('retry cùng idempotency key trả committed result cũ và không chạy handler lần hai', () => {
    const coordinator = createCommandCoordinatorForTest();
    let calls = 0;

    const first = coordinator.run(
      { commandId: 'cmd-1', idempotencyKey: 'sale-1' },
      () => {
        calls += 1;
        return { receiptId: 'receipt-1' };
      },
      { actorId: 'user-admin', action: 'test.command' },
    );
    const second = coordinator.run(
      { commandId: 'cmd-1', idempotencyKey: 'sale-1' },
      () => {
        calls += 1;
        return { receiptId: 'receipt-2' };
      },
      { actorId: 'user-admin', action: 'test.command' },
    );

    expect(first).toEqual(second);
    expect(calls).toBe(1);
    expect(coordinator.getAuditOutbox()).toHaveLength(1);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/apps-script/platform/command-coordinator.test.ts`

Expected: FAIL because command coordinator does not exist.

- [x] **Step 3: Implement coordinator**

Within lock provider:

1. check existing committed command by idempotency key;
2. create/update `Preparing`;
3. run handler;
4. store sanitized result JSON;
5. append audit outbox event;
6. mark `Committed`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/apps-script/platform/command-coordinator.test.ts`

Expected: PASS.

## Task 6: Table Registry and Migration Planner

**Files:**
- Create: `apps-script/src/services/platform/registry/table-registry.ts`
- Create: `apps-script/src/repositories/platform/table-registry-repository.ts`
- Test: `tests/apps-script/platform/table-registry.test.ts`

**Interfaces:**
- Produces: `TableRegistryService.getDefinitions`, `TableRegistryService.createHeaderMap`, `TableRegistryService.planMigration`.
- Consumes: `TableDefinitionDTO`.

- [x] **Step 1: Write failing test for header mapping and append-only migration**

```ts
import { describe, expect, it } from 'vitest';
import { createTableRegistryServiceForTest } from '../../../apps-script/src/services/platform/registry/table-registry';

describe('TableRegistryService', () => {
  it('tạo header map theo tên cột thay vì index hard-code', () => {
    const service = createTableRegistryServiceForTest();
    expect(service.createHeaderMap('CommandTransaction', ['status', 'id', 'commandId'])).toEqual({
      status: 0,
      id: 1,
      commandId: 2,
    });
  });

  it('migration chỉ append cột thiếu theo registry', () => {
    const service = createTableRegistryServiceForTest();
    expect(service.planMigration('CommandTransaction', ['id', 'commandId'])).toEqual({
      action: 'appendColumns',
      missingHeaders: ['idempotencyKey', 'status', 'createdAt', 'updatedAt', 'resultJson'],
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/apps-script/platform/table-registry.test.ts`

Expected: FAIL because table registry service does not exist.

- [x] **Step 3: Implement registry service**

Include Phase 1 logical tables: `CommandTransaction`, `AuditOutbox`, `Session`, `UserAccount`, `RolePermission`, `UserScope`, `SchemaMigration`, `PartitionRegistry`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/apps-script/platform/table-registry.test.ts`

Expected: PASS.

## Task 7: Bootstrap Composition and Full Platform Verification

**Files:**
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `apps-script/src/api/invoke.ts`
- Test: `tests/apps-script/platform/platform-composition.test.ts`

**Interfaces:**
- Consumes: services from Tasks 2-6.
- Produces: default composition with seed admin, login, me, logout, command status, registry query.

- [x] **Step 1: Write failing integration test across login -> me -> registry**

```ts
import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

describe('platform composition', () => {
  it('login rồi gọi protected registry query qua cùng invoke pipeline', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-26T00:00:00.000Z'),
    });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const registry = composition.invoke({
      operation: 'platform.registry.getTableDefinitions',
      requestId: 'req-registry',
      sessionToken: login.data.sessionToken,
      payload: {},
    });

    expect(registry).toMatchObject({ ok: true });
    if (!registry.ok) throw new Error('registry failed');
    expect(registry.data.tables.map((table) => table.tableName)).toContain('CommandTransaction');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/apps-script/platform/platform-composition.test.ts`

Expected: FAIL until all services are wired.

- [x] **Step 3: Wire operations**

Register:

- `platform.auth.login` as `public`;
- `platform.auth.logout` as protected query-like operation that revokes session;
- `platform.session.me` as protected query;
- `platform.command.getStatus` as protected query;
- `platform.registry.getTableDefinitions` as protected query requiring `platform.registry.view`.

- [x] **Step 4: Run focused platform tests**

Run: `npx vitest run tests/shared/platform-contracts.test.ts tests/apps-script/platform`

Expected: PASS.

- [x] **Step 5: Run full verification**

Run: `npm run verify`

Expected: PASS.

## Self-Review

- Spec coverage: Phase 1 covers API boundary, internal session, backend permission/scope seam, command journal, audit outbox contract, table registry/header mapping and operation allowlist. It deliberately does not implement Google Sheets physical adapter, Drive folders, worker delivery, tenant bootstrap UI or domain services; those belong to later phases in the master implementation plan.
- Placeholder scan: clear; each task includes exact files, interfaces, tests and commands.
- Type consistency: operation names and produced service names are reused consistently across tasks.
