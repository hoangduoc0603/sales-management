# Catalog, CRM & Commercial Core Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây Catalog/CRM/Commercial core đủ để POS tải catalog cache, scan/search local, quote giá/khuyến mại xác định và tạo/chọn khách nhanh.

**Architecture:** Domain Catalog/CRM nằm sau typed single RPC gateway. Backend phase này dùng repository in-memory/test seam giống các phase trước, nhưng contract/schema/table registry phải bám data dictionary để sau này thay bằng Sheets adapter không đổi API. Frontend POS không gọi backend theo từng phím; chỉ tải projection/version theo scope rồi search trong browser.

**Tech Stack:** TypeScript, Zod, Google Apps Script service seam, React/Vite local fake backend, Vitest.

## Global Constraints

- Tài liệu và thông điệp nghiệp vụ mặc định viết bằng tiếng Việt.
- Bám `SRS-CRM-001..015`, `SRS-OVR-020`, `SRS-OVR-024`, LLD `catalog-crm.md`, data dictionary `catalog-crm.md`, ADR `0011` và `0012`.
- Variant là đơn vị giao dịch; Product đơn giản phải có Default Variant.
- SKU/barcode unique không phân biệt hoa/thường trong tenant; revalidate trong mutation command.
- Unit conversion versioned; không sửa version đã snapshot.
- Quote theo thứ tự: giá variant → Branch price → customer-group price → một promotion tự động có lợi nhất → voucher/point.
- POS cache không chứa cost, supplier data, secret hoặc field sensitive.
- Scan/search/cart không gọi Apps Script theo từng thao tác khi cache warm.
- Nếu code UI Catalog/CRM, phải đọc registry/handoff `catalog-crm-commercial.html` và chỉ implement khi status `Approved`.

---

## File Structure

- Create `shared/contracts/catalog/catalog.ts`: DTO Product/Variant/Barcode/Unit/Projection/Quote.
- Create `shared/contracts/crm/customer.ts`: DTO Customer/CustomerGroup/quick lookup.
- Create `shared/schemas/catalog/catalog.ts`: Zod parser cho catalog query/mutation/quote.
- Create `shared/schemas/crm/customer.ts`: Zod parser cho customer quick create/search.
- Modify `shared/contracts/platform/operations.ts`: thêm operation/action Catalog/CRM.
- Modify `shared/schemas/api.ts`: operation enum tự cập nhật từ `operationNames`.
- Create `apps-script/src/repositories/catalog/catalog-repository.ts`: in-memory catalog repository.
- Create `apps-script/src/repositories/crm/customer-repository.ts`: in-memory customer repository.
- Create `apps-script/src/services/catalog/catalog-service.ts`: create product, index barcode/SKU, POS projection/search.
- Create `apps-script/src/services/catalog/pricing-service.ts`: deterministic quote.
- Create `apps-script/src/services/crm/customer-service.ts`: quick create/search duplicate.
- Modify `apps-script/src/services/platform/registry/table-registry.ts`: thêm table definitions Catalog/CRM.
- Modify `apps-script/src/bootstrap/create-api-composition.ts`: wire Catalog/CRM operations.
- Modify `web/src/lib/api/local-fake-backend.ts`: hỗ trợ Catalog/CRM operations local.
- Create `web/src/features/pos/catalog-cache/pos-catalog-cache.ts`: browser-local search/index helper.
- Modify `web/src/features/pos/pos-checkout-shell.tsx`: hiển thị catalog projection mẫu và search local.
- Create `web/src/features/catalog/catalog-crm-home.tsx`: shell quản lý Catalog/CRM/Commercial theo handoff Approved.
- Modify `web/src/app/sales-management-app.tsx`: route Catalog/CRM vào AppShell.
- Modify `web/src/styles/index.css`: style module surface nếu primitive hiện có chưa đủ.
- Add tests under `tests/shared`, `tests/apps-script/catalog`, `tests/apps-script/crm`, `tests/web`.

## Task 1: Shared Contracts, Schemas and Operation Registry

**Files:**
- Create: `shared/contracts/catalog/catalog.ts`
- Create: `shared/contracts/crm/customer.ts`
- Create: `shared/schemas/catalog/catalog.ts`
- Create: `shared/schemas/crm/customer.ts`
- Modify: `shared/contracts/platform/operations.ts`
- Test: `tests/shared/catalog-crm-contracts.test.ts`

**Interfaces:**
- Produces `CatalogPosProjectionResponse`, `CatalogQuoteRequest/Response`, `CustomerQuickCreateRequest/Response`.
- Produces operations `catalog.pos.getProjection`, `catalog.quote.preview`, `crm.customer.quickCreate`, `crm.customer.search`.

- [x] **Step 1:** Write failing tests for operation names, schema rejection of empty SKU/barcode and quote request with at least one line.
- [x] **Step 2:** Run `npx vitest run tests/shared/catalog-crm-contracts.test.ts` and verify fail.
- [x] **Step 3:** Implement DTOs and parsers with normalized input boundaries.
- [x] **Step 4:** Run focused shared contract test and verify pass.

## Task 2: Catalog Repository, Service and Table Registry

**Files:**
- Create: `apps-script/src/repositories/catalog/catalog-repository.ts`
- Create: `apps-script/src/services/catalog/catalog-service.ts`
- Modify: `apps-script/src/services/platform/registry/table-registry.ts`
- Test: `tests/apps-script/catalog/catalog-service.test.ts`
- Test: `tests/apps-script/platform/table-registry.test.ts`

**Interfaces:**
- Consumes contracts from Task 1.
- Produces `createCatalogService`, `createInMemoryCatalogRepository`.

- [x] **Step 1:** Write failing tests: product create creates Default Variant, duplicate SKU/barcode case-insensitive is blocked, POS projection excludes cost/supplier fields.
- [x] **Step 2:** Run focused catalog/table tests and verify fail.
- [x] **Step 3:** Implement in-memory repository and catalog service with normalized lookup maps.
- [x] **Step 4:** Add Catalog/CRM table definitions from data dictionary to registry.
- [x] **Step 5:** Run focused tests and verify pass.

## Task 3: Pricing and Promotion Quote

**Files:**
- Create: `apps-script/src/services/catalog/pricing-service.ts`
- Test: `tests/apps-script/catalog/pricing-service.test.ts`

**Interfaces:**
- Consumes `CatalogQuoteRequest`.
- Produces deterministic `quoteCart(input): CatalogQuoteResponse`.

- [x] **Step 1:** Write failing tests for base price → branch price → customer group price → best automatic promotion.
- [x] **Step 2:** Write failing tie-break test: larger discount wins, then lower priority, then lower promotion ID.
- [x] **Step 3:** Implement quote calculation with integer VND and rejection reasons.
- [x] **Step 4:** Run focused pricing tests and verify pass.

## Task 4: CRM Customer Quick Lookup/Create

**Files:**
- Create: `apps-script/src/repositories/crm/customer-repository.ts`
- Create: `apps-script/src/services/crm/customer-service.ts`
- Test: `tests/apps-script/crm/customer-service.test.ts`

**Interfaces:**
- Produces `createCustomerService`, `createInMemoryCustomerRepository`.

- [x] **Step 1:** Write failing tests for phone/email normalization, duplicate warning and quick create.
- [x] **Step 2:** Run focused CRM tests and verify fail.
- [x] **Step 3:** Implement quick search/create without hard delete or source rewrite.
- [x] **Step 4:** Run focused CRM tests and verify pass.

## Task 5: API Composition and Local Fake Backend

**Files:**
- Modify: `apps-script/src/bootstrap/create-api-composition.ts`
- Modify: `web/src/lib/api/local-fake-backend.ts`
- Test: `tests/apps-script/platform/platform-composition.test.ts`
- Test: `tests/web/local-fake-backend.test.ts`

**Interfaces:**
- Exposes Catalog/CRM operations through the same single RPC pipeline.

- [x] **Step 1:** Write failing composition/local fake tests for authenticated `catalog.pos.getProjection`, `catalog.quote.preview`, `crm.customer.quickCreate`, `crm.customer.search`.
- [x] **Step 2:** Run focused composition/local fake tests and verify fail.
- [x] **Step 3:** Wire services into operation registry and local fake backend seed.
- [x] **Step 4:** Run focused tests and verify pass.

## Task 6: POS Browser Cache and Local Search

**Files:**
- Create: `web/src/features/pos/catalog-cache/pos-catalog-cache.ts`
- Modify: `web/src/features/pos/pos-checkout-shell.tsx`
- Test: `tests/web/pos-catalog-cache.test.ts`
- Test: `tests/web/pos-checkout-shell.test.ts`

**Interfaces:**
- Produces `createPosCatalogCache(projection)` with `search(term)` and `findByBarcode(barcode)`.

- [x] **Step 1:** Write failing tests proving search/barcode runs against local projection data and does not call API per lookup.
- [x] **Step 2:** Run focused POS cache tests and verify fail.
- [x] **Step 3:** Implement cache index using normalized SKU/barcode/name.
- [x] **Step 4:** Render seed projection in POS shell and keep checkout command disabled/placeholder until Inventory/Finance phases exist.
- [x] **Step 5:** Run focused POS tests and verify pass.

## Task 7: Catalog/CRM UI Shell

**Files:**
- Create: `web/src/features/catalog/catalog-crm-home.tsx`
- Modify: `web/src/app/sales-management-app.tsx`
- Modify: `web/src/styles/index.css`
- Test: `tests/web/catalog-crm-home.test.ts`
- Test: `tests/web/sales-management-app.test.ts`

**Interfaces:**
- Produces route surfaces for `products`, `customers` using approved `catalog-crm-commercial.html` handoff.

- [x] **Step 1:** Fetch/open approved Open Design artifact `catalog-crm-commercial.html` through registry/local preview.
- [x] **Step 2:** Write failing SSR tests for Catalog/CRM shell sections: Product/Variant, Customer, Price list, Promotion, state/restricted copy.
- [x] **Step 3:** Implement shell with existing primitives; no native select and no sensitive data.
- [x] **Step 4:** Run focused web tests and verify pass.

## Task 8: Phase Verification and Tracking

**Files:**
- Modify: `docs/superpowers/plans/2026-07-27-catalog-crm-commercial-core-phase-4.md`
- Modify: `docs/superpowers/plans/2026-07-26-sales-management-implementation-planning.md`

- [x] **Step 1:** Run `npm run verify`.
- [x] **Step 2:** Run local browser smoke: login, open Hàng hóa, Khách hàng, POS; verify projection/search UI renders and no console error.
- [x] **Step 3:** Mark only completed Phase 4 checkboxes in this plan and master plan.
- [x] **Step 4:** Report verification evidence and any intentionally deferred dependency on Inventory/Finance/Sales checkout.

## Self-Review

- Spec coverage: Task 1–7 cover variant/unit/barcode, POS projection, quote determinism, promotion tie-break, customer quick create/search, POS cache loader/search and UI shell. Loyalty ledger, warranty case, commission ledger and checkout stale conflict effects are implemented with Sales/Returns phases because they require sale/return source documents and Inventory/Finance ledgers.
- Placeholder scan: no TBD/TODO placeholders; each task has concrete files and verification commands.
- Type consistency: operation names and DTO names are introduced in Task 1 and reused in later tasks.
