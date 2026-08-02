# Catalog Import Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cung cấp wizard nhập Product/Variant theo batch an toàn: chỉ tạo mới, validate theo dòng, không bao giờ ghi đè SKU/barcode hiện có và commit theo cơ chế idempotent.

**Architecture:** UI `Catalog` chỉ điều phối state wizard và gọi API; backend `Operations` sở hữu batch/staging/worker còn `CatalogService` là nơi duy nhất tạo Product/Variant. Validation Catalog được tách thành policy dùng chung cho API và worker, fresh-check SKU/barcode lại ngay trước mỗi record được commit để chống trùng do cạnh tranh. Commit chạy theo chunk/checkpoint, không giữ lock cho toàn batch và không chặn POS fast path.

**Tech Stack:** React, TypeScript, Vite, Tailwind/Cenio Core v0.7, Zod, Vitest, Google Apps Script, Google Sheets/Drive, clasp.

## Global Constraints

- Chỉ import `Catalog`; Customer, Supplier và OpeningInventory là flow riêng.
- Import chỉ tạo mới: SKU/barcode đã tồn tại là lỗi theo dòng, không có upsert hoặc ghi đè.
- Mọi request import cần `operations.import.manage`; backend là authority cho scope/permission và trạng thái batch.
- Product/Variant chỉ được tạo qua `CatalogService`; không ghi Sheet, cache POS hoặc InventoryBalance trực tiếp.
- Batch/row retry phải idempotent; dữ liệu nghiệp vụ không được tạo trước thao tác xác nhận của người dùng.
- Worker commit phải theo chunk/checkpoint, không giữ `ScriptLock` dài và không cạnh tranh POS fast path.
- UI phải theo artifact Open Design và handoff `Approved`, dùng Cenio Core v0.7, light/dark, responsive; không dùng native select và không đổi nhãn submit khi loading.
- Không lưu secret, public Drive URL, raw exception, hoặc dữ liệu file/scope không được cấp quyền vào client log/UI.

## File map

| File | Responsibility |
| --- | --- |
| `docs/superpowers/specs/2026-08-02-catalog-import-wizard-design.md` | Requirement visual/UX đã được duyệt cho wizard. |
| `docs/design/screens/catalog-products-variants.md` | Handoff hash/state, interaction, acceptance của Catalog import. |
| `shared/contracts/operations/operations.ts` | DTO import: template, upload, validate, batch status/progress/result/download. |
| `shared/schemas/operations/operations.ts` | Zod parser cho các DTO import mới. |
| `apps-script/src/services/catalog/catalog-import-policy.ts` | Parse/normalize row Catalog, validate schema/domain/duplicate và map thành `CatalogCreateProductRequest`. |
| `apps-script/src/services/operations/operations-service.ts` | Upload/validate/status/cancel/commit orchestration với permission, batch và staging. |
| `apps-script/src/services/operations/import-commit-worker.ts` | Commit chunk qua CatalogService và persist checkpoint/result chính xác. |
| `apps-script/src/bootstrap/create-api-composition.ts` | Registry operation mới và injection Catalog import policy/service. |
| `apps-script/src/bootstrap/run-production-scheduled-worker.ts` | Worker claim chunk import Catalog; không quét batch không liên quan. |
| `web/src/features/catalog/catalog-import-wizard.tsx` | Modal/sheet wizard UI, parser file ở client, filter lỗi, polling status/result. |
| `web/src/features/catalog/catalog-crm-home.tsx` | CTA mở wizard và reload list sau completed import. |
| `web/src/lib/api/local-fake-backend.ts` | Fake backend có cùng validation/commit semantics để UI test local. |
| `tests/apps-script/catalog/catalog-import-policy.test.ts` | Unit test parser/duplicate rules Catalog import. |
| `tests/apps-script/operations/catalog-import-service.test.ts` | Test permission, staging, valid-only, cancel, retry/idempotency và commit chunk. |
| `tests/web/catalog-import-wizard.test.tsx` | Test flow UI desktop/mobile semantic states qua fake API. |

---

### Task 1: Thiết kế Open Design và handoff cho toàn bộ wizard

**Files:**
- Modify: `docs/design/screens/catalog-products-variants.md`
- Modify: `docs/design/open-design-registry.md`
- Test: artifact `catalog-products-variants.html` trong Open Design project `7eaa3a02-4f8f-4b74-ad1a-d1486bbab62b`

**Consumes:** `docs/superpowers/specs/2026-08-02-catalog-import-wizard-design.md`, SRS-ACC-006, SRS-CRM-006.

**Produces:** Artifact Catalog có các state import `#import`, `#import-validating`, `#import-validated`, `#import-confirm`, `#import-committing`, `#import-completed`, `#import-failed`, `#import-restricted`; handoff đủ điều kiện để review/approve.

- [ ] **Step 1: Mở artifact và xác nhận state cũ chưa đủ**

  Kiểm tra `#import` hiện có: chỉ dropzone/preview tối giản, không có progress, retry, restricted state, radio valid-only hay mobile card preview.

- [ ] **Step 2: Refine đúng một artifact trên Open Design**

  Thiết kế modal rộng desktop/full-screen mobile theo specification. Giữ Catalog UI đã có, chỉ thay khu vực import. Trong state có lỗi, dùng copy chính xác:

  ```text
  Chỉ tạo mới. SKU hoặc barcode đã tồn tại sẽ được báo lỗi và không ghi đè.
  Chỉ nhập 98 dòng hợp lệ
  Nhập toàn bộ — còn dòng lỗi nên chưa thể dùng lựa chọn này.
  ```

  Tạo interactive controls để test chuyển state. Không thêm Customer/CRM vào artifact.

- [ ] **Step 3: Cập nhật handoff và registry**

  Bổ sung hash/state, CTA, trạng thái error/retry/restricted, detail responsive và quy tắc create-only. Giữ `Status: Review` cho đến khi chủ dự án duyệt artifact; registry không được đánh `Approved` thay người dùng.

- [ ] **Step 4: Verify artifact**

  Mở direct local path artifact; kiểm desktop light/dark, mobile, click-outside/Escape trước commit, disabled AllOrNothing khi còn lỗi, progress/result/restricted state. Đối chiếu với specification.

### Task 2: Chuẩn hóa hợp đồng import Catalog và policy validation

**Files:**
- Modify: `shared/contracts/operations/operations.ts`
- Modify: `shared/schemas/operations/operations.ts`
- Create: `apps-script/src/services/catalog/catalog-import-policy.ts`
- Test: `tests/apps-script/catalog/catalog-import-policy.test.ts`
- Test: `tests/shared/operations-contracts.test.ts`

**Consumes:** `CatalogCreateProductRequest`, `CatalogRepository.findVariantBySkuNormalized`, `CatalogRepository.findBarcodeByNormalized`, `normalizeLookup`.

**Produces:** `CatalogImportRow`, `CatalogImportValidationError`, `parseCatalogImportRow`, `validateCatalogImportRows` and DTOs for status/cancel/result/error report.

- [ ] **Step 1: Write failing policy tests**

  ```ts
  it('marks an existing normalized SKU as a row error and never returns a create request', () => {
    const result = validateCatalogImportRows(rows([{ rowNumber: 2, sku: ' sh-oc-1l ' }]), lookupWithSku('SH-OC-1L'));
    expect(result[0]).toMatchObject({ validationStatus: 'Invalid', errors: [expect.stringContaining('SKU đã tồn tại')] });
    expect(result[0].createRequest).toBeUndefined();
  });

  it('flags duplicate barcode inside the same batch independently of the existing Catalog', () => {
    const result = validateCatalogImportRows(rows([{ barcode: '893' }, { barcode: '893' }]), emptyLookup());
    expect(result.map((row) => row.validationStatus)).toEqual(['Invalid', 'Invalid']);
  });
  ```

- [ ] **Step 2: Run failing tests**

  Run: `npm run test -- tests/apps-script/catalog/catalog-import-policy.test.ts tests/shared/operations-contracts.test.ts`

  Expected: FAIL because `catalog-import-policy.ts` and the DTO operations do not exist.

- [ ] **Step 3: Add explicit DTO and parser contracts**

  Add fields needed by the design without shipping raw file content: `fileSizeBytes`, validation/result counts, `ImportBatchStatusResponse`, `ImportCancelRequest`, and a sanitized row error `{ field?: string; code: string; message: string }`. Keep the existing `ImportBatchDTO` compatible; status/result is read-only and checks actor/scope.

- [ ] **Step 4: Implement the policy as a pure service**

  ```ts
  export interface CatalogImportPolicy {
    validate(input: { rows: readonly ImportValidateRowInput[]; lookup: CatalogImportLookup }): readonly CatalogImportValidation;
    toCreateRequest(payload: Record<string, unknown>): CatalogCreateProductRequest | undefined;
  }
  ```

  Require `productCode`, `name`, `productType`, `sku`, `defaultUnitId`, `unitPriceVnd`; map Vietnamese/technical product type values deterministically; use `normalizeLookup` for both batch and existing Catalog checks. Return every error per row, do not throw an entire batch for malformed user data.

- [ ] **Step 5: Run targeted tests**

  Run: `npm run test -- tests/apps-script/catalog/catalog-import-policy.test.ts tests/shared/operations-contracts.test.ts`

  Expected: PASS.

### Task 3: Make Operations staging/commit create Catalog records correctly

**Files:**
- Modify: `apps-script/src/services/operations/operations-service.ts`
- Modify: `apps-script/src/services/operations/import-commit-worker.ts`
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `apps-script/src/bootstrap/run-production-scheduled-worker.ts`
- Modify: `apps-script/src/repositories/operations/operations-repository.ts`
- Test: `tests/apps-script/operations/catalog-import-service.test.ts`
- Test: `tests/apps-script/operations/import-commit-worker.test.ts`
- Test: `tests/apps-script/platform/production-scheduled-worker.test.ts`

**Consumes:** Task 2 policy, `CatalogService.createProduct`, existing ImportBatch/ImportStagingRow storage and scheduled worker runtime.

**Produces:** `operations.import.status`, `operations.import.cancel`, actual Catalog create-only commit and batch result counts; `sourceObjectId` is a true Product/Variant source reference rather than synthetic ID.

- [ ] **Step 1: Write failing service/worker tests**

  ```ts
  it('commits only valid Catalog rows through CatalogService and records their product id', () => {
    const response = service.commitImport({ actor, request: commit(batchId, 'ValidRowsOnly') });
    expect(catalogService.createProduct).toHaveBeenCalledTimes(1);
    expect(response.data.committedRows[0].sourceObjectId).toBe('product-1');
  });

  it('revalidates SKU/barcode immediately before chunk creation and skips a concurrent duplicate', () => {
    // seed a matching SKU after staging but before worker execution
    expect(runImportCommitChunk(deps).failedCount).toBe(1);
  });

  it('cancel before commit leaves Catalog unchanged and is idempotent', () => {
    expect(service.cancelImport({ actor, request: cancel(batchId) }).data.batch.status).toBe('Cancelled');
  });
  ```

- [ ] **Step 2: Run failing tests**

  Run: `npm run test -- tests/apps-script/operations/catalog-import-service.test.ts tests/apps-script/operations/import-commit-worker.test.ts tests/apps-script/platform/production-scheduled-worker.test.ts`

  Expected: FAIL because commit currently marks synthetic source IDs and has no cancel/status operation.

- [ ] **Step 3: Inject Catalog import dependencies into Operations**

  `createOperationsService` accepts `catalogImportPolicy` and `catalogService`; it refuses non-Catalog policy misuse. `validateImport` produces `ImportStagingRowDTO` with sanitized error structure and stores no raw exception. `cancelImport` permits only actor owner or authorized manager before `Committing`.

- [ ] **Step 4: Replace synthetic `commitRow` with domain command execution**

  `runImportCommitChunk` receives a callback:

  ```ts
  commitCatalogRow(row: ImportStagingRowDTO):
    | { ok: true; sourceObjectId: string }
    | { ok: false; error: { code: string; message: string } };
  ```

  For each valid pending row: fresh validate against Catalog, then call `CatalogService.createProduct`. On duplicate or domain rejection, mark this row `Failed` with sanitized error; retain progress and continue to next row. Completion counts committed/skipped/failed and retry never replays `Committed` rows.

- [ ] **Step 5: Route API and scheduled worker**

  Register `operations.import.status` and `operations.import.cancel` with `operations.import.manage`; update worker to select only `Committing` Catalog batches and pass the Catalog commit callback. Keep chunk size bounded and checkpoint after each row/chunk.

- [ ] **Step 6: Run focused tests and performance guard**

  Run: `npm run test -- tests/apps-script/operations/catalog-import-service.test.ts tests/apps-script/operations/import-commit-worker.test.ts tests/apps-script/platform/production-scheduled-worker.test.ts tests/apps-script/catalog/catalog-service.test.ts`

  Expected: PASS. Confirm no test adds an import-wide lock or POS repository access.

### Task 4: Implement approved React wizard and local parity

**Files:**
- Create: `web/src/features/catalog/catalog-import-wizard.tsx`
- Modify: `web/src/features/catalog/catalog-crm-home.tsx`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Test: `tests/web/catalog-import-wizard.test.tsx`
- Test: `tests/web/local-fake-backend.test.ts`
- Test: `tests/web/catalog-crm-home.test.ts`

**Consumes:** Task 1 artifact/handoff after both registry and handoff are `Approved`; Task 2/3 contracts and local-fake parity.

**Produces:** CTA `Nhập dữ liệu` launches accessible wizard with required states; completed import refreshes only the Catalog list query.

- [ ] **Step 1: Gate implementation on approval and write failing UI tests**

  Do not start source changes until `catalog-products-variants` is `Approved`. Then test:

  ```tsx
  it('shows create-only copy and disables all-or-nothing while staging contains errors', async () => {
    render(<CatalogImportWizard apiClient={fakeApi} sessionToken="session" onClose={vi.fn()} onCompleted={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Nhập 98 dòng hợp lệ' }));
    expect(screen.getByText(/SKU hoặc barcode đã tồn tại.*không ghi đè/i)).toBeVisible();
    expect(screen.getByRole('radio', { name: /Nhập toàn bộ/i })).toBeDisabled();
  });
  ```

- [ ] **Step 2: Run failing UI tests**

  Run: `npm run test -- tests/web/catalog-import-wizard.test.tsx tests/web/local-fake-backend.test.ts tests/web/catalog-crm-home.test.ts`

  Expected: FAIL because the wizard does not exist and local fake backend does not create catalog records.

- [ ] **Step 3: Implement API-driven state machine**

  Use an explicit union `SelectFile | Validating | ValidationResult | Confirming | Committing | Completed | RetryableError | Restricted`. Parse CSV/XLSX on client only into staged rows, send file metadata/rows through API, never place raw file or session token in logs. Poll only while `Committing`, exponentially bounded (e.g. 1s → 2s → 4s max 5s) and stop on unmount/close.

- [ ] **Step 4: Implement responsive states from artifact**

  Use modal with body scroll/footer stable on desktop and full-screen sheet on mobile. Use custom segmented filters/listbox; table on desktop and error cards on mobile. Focus first error after validation, preserve primary CTA label while showing spinner, prevent accidental close only during request in flight (not background commit).

- [ ] **Step 5: Mirror actual semantics in local fake backend**

  The fake backend must use the same normalized duplicate rules, create product/variant data in its local catalog maps on committed rows, and serve status/cancel. Never fake a successful committed row without making it searchable in Catalog.

- [ ] **Step 6: Verify code, visual fidelity and local flow**

  Run: `npm run test -- tests/web/catalog-import-wizard.test.tsx tests/web/local-fake-backend.test.ts tests/web/catalog-crm-home.test.ts && npm run typecheck && npm run lint && npm run build`

  Then open artifact direct file and implementation: check desktop light/dark, mobile, validation errors, validation pass, confirm, background progress, result, retry, restricted. Capture temporary screenshots but do not add them to Git.

### Task 5: Update traceability and release checks

**Files:**
- Modify: `docs/design/screens/catalog-products-variants.md`
- Modify: `docs/design/open-design-registry.md`
- Modify: `docs/architecture/lld-traceability-review.md` only if its catalog import traceability lacks the completed operation names/tests
- Test: `tests/release/sellable-scope.test.ts`
- Test: `tests/release/release-readiness.test.ts`

**Consumes:** Tasks 1–4.

**Produces:** Approved design traceability and verifiable test/release coverage.

- [ ] **Step 1: Mark only verified handoff acceptance items**

  Flip the registry/handoff to `Approved` only after owner review. Check individual acceptance boxes only for tested artifact/source states; leave non-implemented items unchecked.

- [ ] **Step 2: Add/adjust traceability test references**

  Map SRS-ACC-006/SRS-CRM-006 to Catalog import policy, Operations service and wizard tests. Do not modify requirement text.

- [ ] **Step 3: Run final gates**

  Run: `npm run test -- tests/release/sellable-scope.test.ts tests/release/release-readiness.test.ts && npm run typecheck && npm run lint && npm run build`

  Expected: PASS, with no unapproved design-driven UI code.

## Self-review

- Spec coverage: Task 1 covers all visual/interaction states; Tasks 2–3 cover staging, errors, create-only, idempotency, worker and authorization; Task 4 covers responsive UI/local parity; Task 5 covers traceability and gates.
- Placeholder scan: không có placeholder hoặc bước validation/testing chung chung; mỗi hành vi đều nêu interface và assertion cần kiểm.
- Type consistency: `CatalogImportPolicy` produces `CatalogCreateProductRequest`; `runImportCommitChunk.commitCatalogRow` consumes `ImportStagingRowDTO`; UI consumes Operations contract status/result endpoints.
