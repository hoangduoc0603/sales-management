# Nền tảng kỹ thuật deployable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo một toolchain React/Apps Script có thể kiểm chứng và đóng gói toàn bộ artifact deployable vào `dist/` tại gốc repository.

**Architecture:** Vite bundle React/Tailwind và inline toàn bộ browser asset thành `dist/index.html`. esbuild bundle entrypoint Apps Script cùng shared TypeScript thành `dist/code.js`, rồi footer chỉ expose `doGet` và `invoke`; `dist/appsscript.json` là manifest được copy từ source. Các lớp API được khởi tạo rỗng và chỉ trả lỗi chuẩn cho operation chưa hỗ trợ, do đó không đưa dữ liệu hoặc use case nghiệp vụ vào nền tảng này.

**Tech Stack:** Node.js 22 LTS, npm, React 19.2.8, TypeScript 5.9.3, Vite 8.1.5, Tailwind CSS 4.3.3, esbuild 0.28.1, Zod 4.4.3, Vitest 4.1.10, ESLint 10.8.0, Google Apps Script types 2.0.11, clasp 3.3.0.

## Global Constraints

- Artifact deployable bắt buộc là `dist/` ở root; không dùng `apps-script/dist/`.
- `web/` không truy cập Google Sheets/Drive; `shared/` không import React, Browser API hoặc Apps Script API.
- Public Apps Script business boundary duy nhất là `invoke(ApiRequest)`; `doGet` chỉ trả `HtmlOutput`.
- Không tạo operation/domain data, auth/session, registry/migration hoặc UI nghiệp vụ.
- Root `.clasp.json` là cục bộ, bị Git ignore và không được đọc/in bởi source, test, build hay log.
- Các script không được làm remote write; `deploy:push` chỉ chạy khi người triển khai đã tạo root `.clasp.json` cục bộ.
- Tài liệu, lỗi API và output hướng dẫn phải bằng tiếng Việt.
- Dùng `npm --cache /private/tmp/sales-management-npm-cache` khi môi trường gặp lỗi cache quyền tại `~/.npm`.

---

## File structure

- Create: `package.json` — dependency, engines và lệnh chuẩn của repository.
- Create: `package-lock.json` — dependency graph npm khóa phiên bản.
- Create: `tsconfig.web.json`, `tsconfig.apps-script.json` — typecheck độc lập browser và Apps Script.
- Create: `vite.config.ts` — React/Tailwind/single-file frontend build trực tiếp về `dist/`.
- Create: `vitest.config.ts`, `eslint.config.mjs` — cấu hình kiểm thử và lint TypeScript.
- Create: `.clasp.json.example` — ví dụ cấu hình root chỉ có `rootDir: "./dist"`.
- Create: `index.html` — Vite HTML entry có React mount point, không có nội dung nghiệp vụ.
- Create: `shared/contracts/api.ts`, `shared/contracts/errors.ts` — DTO API thuần TypeScript.
- Create: `shared/schemas/api.ts` — Zod schema cho request envelope.
- Create: `web/src/app/main.tsx`, `web/src/app/runtime-shell.tsx`, `web/src/styles/index.css` — React mount tối thiểu và Tailwind import.
- Create: `web/src/lib/api/google-script-run.ts`, `web/src/lib/api/client.ts` — adapter `google.script.run` Promise và client chỉ gọi `invoke`.
- Create: `apps-script/src/api/api-result.ts`, `apps-script/src/api/invoke.ts`, `apps-script/src/api/web-app.ts` — error mapping, API gateway rỗng và `doGet`.
- Create: `apps-script/src/bootstrap/create-api-composition.ts` — composition tối thiểu và registry operation rỗng.
- Create: `apps-script/src/bootstrap/entry.ts` — entry export để esbuild dùng trong bundle.
- Create: `scripts/build.mjs`, `scripts/verify-apps-script-artifact.mjs`, `scripts/deploy-push.mjs` — build orchestration, artifact gate, deploy guard.
- Create: `tests/shared/api-schema.test.ts`, `tests/apps-script/invoke.test.ts`, `tests/web/api-client.test.ts`, `tests/build/artifact-verification.test.ts` — kiểm thử contracts, gateway, adapter và artifact gate.
- Modify: `.gitignore`, `README.md`, `apps-script/.clasp.json.example`, `docs/architecture/folder-structure.md`, `scripts/verify-structure.mjs` — đưa root tooling/artifact vào repository map và thay mẫu clasp cũ.
- Delete: `apps-script/.clasp.json.example` — mẫu cũ không còn đúng vị trí `rootDir`.

## Task 1: Thiết lập tooling root và quy ước artifact

**Files:**
- Create: `package.json`, `tsconfig.web.json`, `tsconfig.apps-script.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `.clasp.json.example`, `index.html`.
- Modify: `.gitignore`, `README.md`, `docs/architecture/folder-structure.md`, `scripts/verify-structure.mjs`.
- Delete: `apps-script/.clasp.json.example`.

**Interfaces:**
- Consumes: `apps-script/appsscript.json` và skeleton thư mục hiện tại.
- Produces: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:artifact`, `npm run verify`, `npm run deploy:push`; root `.clasp.json.example` có nội dung chính xác `{ "rootDir": "./dist" }`.

- [ ] **Step 1: Viết assertion cấu trúc cho cấu hình clasp và root artifact**

Trong `scripts/verify-structure.mjs`, thay đường dẫn bắt buộc `apps-script/.clasp.json.example` bằng `.clasp.json.example`, parse file root và yêu cầu đúng một key `rootDir` với giá trị `./dist`. Giữ kiểm tra manifest Apps Script, nhưng thay kiểm tra “không tồn tại `.clasp.json`” bằng kiểm tra `.gitignore` chứa chính xác pattern `/.clasp.json` và `dist/`.

```js
const claspExamplePath = path.join(repositoryRoot, '.clasp.json.example');
const ignoredPatterns = readFileSync(path.join(repositoryRoot, '.gitignore'), 'utf8');

if (!ignoredPatterns.split(/\r?\n/).includes('/.clasp.json')) {
  console.error('`.gitignore` phải loại trừ root `.clasp.json`.');
  process.exit(1);
}
```

- [ ] **Step 2: Chạy structure check để xác nhận test đỏ trước thay đổi**

Run: `node scripts/verify-structure.mjs`

Expected: PASS với skeleton cũ. Ghi nhận đây là baseline; sau Step 3, thêm assertion root clasp rồi chạy lại để xác nhận fail vì `.clasp.json.example` chưa tồn tại.

- [ ] **Step 3: Di chuyển mẫu clasp theo đúng mô hình root build**

Tạo root `.clasp.json.example` với nội dung sau và xóa `apps-script/.clasp.json.example`:

```json
{
  "rootDir": "./dist"
}
```

Sửa `.gitignore` để dùng `/.clasp.json`, giữ `.env`, `node_modules/`, `dist/`, `coverage/`, và bỏ pattern `apps-script/.clasp.json` đã hết vai trò. Không tạo `.clasp.json` thật.

- [ ] **Step 4: Tạo package manifest và scripts xác định rõ quality gate**

Tạo `package.json` với `"private": true`, `"type": "module"`, `"engines": { "node": ">=22.12.0" }` và scripts sau:

```json
{
  "scripts": {
    "build": "node scripts/build.mjs",
    "check:artifact": "node scripts/verify-apps-script-artifact.mjs",
    "deploy:push": "node scripts/deploy-push.mjs",
    "lint": "eslint \\\"{apps-script,shared,tests,web}/**/*.{ts,tsx}\\\"",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.web.json --noEmit && tsc -p tsconfig.apps-script.json --noEmit",
    "verify": "node scripts/verify-structure.mjs && npm run typecheck && npm run lint && npm test && npm run build && npm run check:artifact"
  }
}
```

Install runtime dependencies:

```bash
npm --cache /private/tmp/sales-management-npm-cache install react@19.2.8 react-dom@19.2.8 zod@4.4.3
```

Install development dependencies:

```bash
npm --cache /private/tmp/sales-management-npm-cache install -D @eslint/js@10.0.1 @google/clasp@3.3.0 @tailwindcss/vite@4.3.3 @types/google-apps-script@2.0.11 @types/node@26.1.1 @types/react@19.2.17 @types/react-dom@19.2.3 @vitejs/plugin-react@6.0.4 esbuild@0.28.1 eslint@10.8.0 eslint-plugin-react-hooks@7.1.1 eslint-plugin-react-refresh@0.5.3 globals@17.7.0 tailwindcss@4.3.3 typescript@5.9.3 typescript-eslint@8.65.0 vite@8.1.5 vite-plugin-singlefile@2.3.3 vitest@4.1.10
```

- [ ] **Step 5: Cấu hình TypeScript, Vite, Vitest và ESLint cho boundary đã chốt**

`tsconfig.web.json` dùng `jsx: "react-jsx"`, DOM lib, `noEmit: true`, explicit types `node`/`react`/`react-dom` để không nạp Apps Script global, alias `@shared/*` → `shared/*`; `tsconfig.apps-script.json` dùng `types: ["google-apps-script"]`, không có DOM lib, `skipLibCheck: true` cho xung đột declaration global `MimeType` của dependency graph, và cùng alias. `vite.config.ts` phải dùng `root: "."`, React plugin, `@tailwindcss/vite`, `viteSingleFile()`, `build.outDir: "dist"`, `emptyOutDir: false`, `assetsInlineLimit: 100000000` và alias `@shared` tới `shared` root. `vitest.config.ts` phải dùng cùng alias và include `tests/**/*.test.ts`; ESLint flat config phải phân biệt browser files (`web/**`) và Apps Script/shared/test files, không khai báo `SpreadsheetApp` hay `google` là browser global.

- [ ] **Step 6: Cập nhật documentation và structure check rồi chạy baseline toolchain**

Trong `docs/architecture/folder-structure.md`, thêm root-level `package.json`, `tsconfig*.json`, config tooling, `.clasp.json.example` và `dist/` vào cây repository; mô tả `dist/` là artifact sinh tự động cho clasp. Trong `README.md`, thêm lệnh `npm install`, `npm run verify`, copy `.clasp.json.example` thành `.clasp.json` cục bộ rồi đặt `scriptId` trước `npm run deploy:push`; cấm theo dõi file thật. Cập nhật `scripts/verify-structure.mjs` theo Step 1.

Run:

```bash
node scripts/verify-structure.mjs
npm run typecheck
npm run lint
```

Expected: structure check, typecheck và lint đều PASS; chưa chạy test/build cho tới khi source ở các task sau tồn tại.

- [ ] **Step 7: Commit**

Repository chưa được khởi tạo Git. Không thực hiện commit; khi Git được khởi tạo, stage các file Task 1 và commit với message:

```bash
git add package.json package-lock.json tsconfig.web.json tsconfig.apps-script.json vite.config.ts vitest.config.ts eslint.config.mjs .clasp.json.example .gitignore README.md docs/architecture/folder-structure.md scripts/verify-structure.mjs apps-script/.clasp.json.example
git commit -m "build: set up root toolchain and clasp artifact contract"
```

## Task 2: Định nghĩa API contract/schema và lỗi chuẩn trước gateway

**Files:**
- Create: `shared/contracts/api.ts`, `shared/contracts/errors.ts`, `shared/schemas/api.ts`, `tests/shared/api-schema.test.ts`.

**Interfaces:**
- Consumes: Zod từ Task 1.
- Produces: `parseApiRequest(value: unknown): ApiRequest`, `createApiMeta(input): ApiMeta`, `ApiResult<T>`, `ApiErrorCode` và `apiRequestSchema` để gateway và client dùng đúng cùng một envelope.

- [ ] **Step 1: Viết failing tests cho envelope valid/invalid và error không lộ secret**

Tạo `tests/shared/api-schema.test.ts` với các expectation sau:

```ts
import { describe, expect, it } from 'vitest';
import { parseApiRequest } from '@shared/schemas/api';

describe('parseApiRequest', () => {
  it('chấp nhận query envelope tối thiểu', () => {
    expect(parseApiRequest({ operation: 'catalog.search', requestId: 'req-1', payload: {} }))
      .toMatchObject({ operation: 'catalog.search', requestId: 'req-1', payload: {} });
  });

  it('từ chối command thiếu idempotency key', () => {
    expect(() => parseApiRequest({ operation: 'sales.complete', requestId: 'req-2', payload: {}, command: { commandId: 'cmd-1' } }))
      .toThrow();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail vì module chưa tồn tại**

Run: `npm test -- tests/shared/api-schema.test.ts`

Expected: FAIL với lỗi không resolve được `@shared/schemas/api`.

- [ ] **Step 3: Viết DTO và schema thuần TypeScript**

Trong `shared/contracts/api.ts`, định nghĩa `ApiRequest` có `operation`, `requestId`, `payload`, `sessionToken?`, `command?` và `client?`; `ApiMeta` có `requestId`, `operation`, `serverTime`, `durationMs`, `stages` và `io`; `ApiResult<T>` là discriminated union `{ ok: true; data; meta } | { ok: false; error; meta }`. Trong `shared/contracts/errors.ts`, chỉ cho phép codes `INVALID_REQUEST`, `OPERATION_NOT_SUPPORTED`, `TRANSPORT_ERROR`, `INTERNAL_ERROR` và shape `{ code, message, details? }`; không có field stack/cause/token.

Trong `shared/schemas/api.ts`, dùng Zod để giới hạn `operation` và `requestId` là non-empty string, `payload` là unknown, `command` yêu cầu đồng thời `commandId` và `idempotencyKey` non-empty; export `parseApiRequest` gọi `.parse`.

- [ ] **Step 4: Chạy contract test và typecheck**

Run:

```bash
npm test -- tests/shared/api-schema.test.ts
npm run typecheck
```

Expected: PASS. Test không in request `sessionToken` dù request có field này.

- [ ] **Step 5: Commit**

```bash
git add shared/contracts shared/schemas tests/shared/api-schema.test.ts
git commit -m "feat(platform): add shared API envelope contracts"
```

## Task 3: Tạo Apps Script API gateway rỗng, an toàn và testable

**Files:**
- Create: `apps-script/src/api/api-result.ts`, `apps-script/src/api/invoke.ts`, `apps-script/src/api/web-app.ts`, `apps-script/src/bootstrap/create-api-composition.ts`, `apps-script/src/bootstrap/entry.ts`, `tests/apps-script/invoke.test.ts`.

**Interfaces:**
- Consumes: `ApiRequest`, `ApiResult`, `ApiMeta`, `parseApiRequest` từ Task 2.
- Produces: `createInvokeHandler(clock): (request: unknown) => ApiResult<never>`, `createApiComposition(clock)`, `doGet_(): GoogleAppsScript.HTML.HtmlOutput`, `invoke_(): ApiResult<never>`, `doGet`/`invoke` exports từ entry.

- [ ] **Step 1: Viết failing gateway tests cho invalid và unsupported operation**

Tạo fake clock và tests sau trong `tests/apps-script/invoke.test.ts`:

```ts
const invoke = createInvokeHandler({ now: () => new Date('2026-07-26T00:00:00.000Z') });

it('trả INVALID_REQUEST thay vì throw khi envelope không hợp lệ', () => {
  expect(invoke({ operation: '', requestId: '', payload: {} })).toMatchObject({
    ok: false,
    error: { code: 'INVALID_REQUEST' },
  });
});

it('trả OPERATION_NOT_SUPPORTED cho operation chưa đăng ký', () => {
  expect(invoke({ operation: 'catalog.search', requestId: 'req-1', payload: {} })).toMatchObject({
    ok: false,
    error: { code: 'OPERATION_NOT_SUPPORTED' },
    meta: { requestId: 'req-1', operation: 'catalog.search' },
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail vì gateway chưa tồn tại**

Run: `npm test -- tests/apps-script/invoke.test.ts`

Expected: FAIL với lỗi không resolve được `apps-script/src/api/invoke`.

- [ ] **Step 3: Implement gateway theo public boundary**

`createInvokeHandler` parse envelope trong try/catch, dùng `requestId` hợp lệ hoặc tạo request ID không dựa vào token, và luôn tạo `ApiMeta` với `durationMs: 0`, stages/io rỗng. Validation exception map sang `{ code: 'INVALID_REQUEST', message: 'Yêu cầu không hợp lệ.' }`; mọi request hợp lệ map sang `{ code: 'OPERATION_NOT_SUPPORTED', message: 'Thao tác chưa được hỗ trợ.' }`. Không serialize exception object.

`createApiComposition` chỉ nhận clock và trả `{ invoke }`; không thêm registry/domain. `web-app.ts` gọi `HtmlService.createHtmlOutputFromFile('index')` qua `doGet_`, còn `invoke_` gọi composition. `entry.ts` export hai function này cho bundle; không import Browser API, Sheet, Drive, Properties hoặc Lock.

- [ ] **Step 4: Chạy test/typecheck/lint**

Run:

```bash
npm test -- tests/apps-script/invoke.test.ts
npm run typecheck
npm run lint
```

Expected: PASS. Assert thêm rằng `JSON.stringify(result)` không chứa `stack`, `cause`, `sessionToken` hoặc `scriptId`.

- [ ] **Step 5: Commit**

```bash
git add apps-script/src/api apps-script/src/bootstrap tests/apps-script/invoke.test.ts
git commit -m "feat(platform): add safe empty Apps Script API gateway"
```

## Task 4: Tạo React runtime shell và typed `google.script.run` adapter

**Files:**
- Create: `web/src/app/main.tsx`, `web/src/app/runtime-shell.tsx`, `web/src/styles/index.css`, `web/src/lib/api/google-script-run.ts`, `web/src/lib/api/client.ts`, `tests/web/api-client.test.ts`.

**Interfaces:**
- Consumes: `ApiRequest`, `ApiResult`, `ApiError` từ Task 2.
- Produces: `GoogleScriptRunInvoker.invoke<T>(request): Promise<ApiResult<T>>`, `createApiClient(invoker)`, `ApiClient.invoke<T>(request)`, React `RuntimeShell` mount.

- [ ] **Step 1: Viết failing adapter test với fake `google.script.run`**

Trong `tests/web/api-client.test.ts`, inject fake invoker thay vì truy cập global thật:

```ts
it('chỉ gửi request qua global invoke', async () => {
  const calls: unknown[] = [];
  const client = createApiClient({
    invoke: async (request) => {
      calls.push(request);
      return { ok: false, error: { code: 'OPERATION_NOT_SUPPORTED', message: 'Thao tác chưa được hỗ trợ.' }, meta };
    },
  });

  await expect(client.invoke({ operation: 'catalog.search', requestId: 'req-1', payload: {} })).resolves.toMatchObject({ ok: false });
  expect(calls).toHaveLength(1);
});
```

- [ ] **Step 2: Chạy test để xác nhận fail vì client chưa tồn tại**

Run: `npm test -- tests/web/api-client.test.ts`

Expected: FAIL với lỗi không resolve được `web/src/lib/api/client`.

- [ ] **Step 3: Implement transport adapter và runtime shell không có UI nghiệp vụ**

`google-script-run.ts` phải dùng `.withSuccessHandler` và `.withFailureHandler` để Promise resolve `ApiResult` hoặc resolve error `{ ok: false, error: { code: 'TRANSPORT_ERROR', message: 'Không thể kết nối đến máy chủ.' } }`; call duy nhất là `.invoke(request)`. `client.ts` nhận injected invoker để test và không log request payload/token.

`main.tsx` import `styles/index.css`, render `<RuntimeShell />` vào `#root`; `RuntimeShell` trả fragment trống với stable `data-runtime="sales-management"`, không có content, route hay component nghiệp vụ. `index.css` chỉ import `tailwindcss`, không tạo token/palette cục bộ trước Design System implementation.

- [ ] **Step 4: Chạy test và build frontend**

Run:

```bash
npm test -- tests/web/api-client.test.ts
npm run typecheck
npm run lint
npx vite build --config vite.config.ts
```

Expected: PASS; `dist/index.html` tồn tại và có `id="root"` nhưng không chứa `/assets/`, `<script src=`, hoặc `<link href=`.

- [ ] **Step 5: Commit**

```bash
git add web/src/app web/src/lib/api web/src/styles tests/web/api-client.test.ts index.html
git commit -m "feat(web): add runtime shell and typed Apps Script adapter"
```

## Task 5: Đóng gói root `dist/`, kiểm tra artifact và bảo vệ deploy

**Files:**
- Create: `scripts/build.mjs`, `scripts/verify-apps-script-artifact.mjs`, `scripts/deploy-push.mjs`, `tests/build/artifact-verification.test.ts`.
- Modify: `package.json` nếu cần bổ sung import/build script sau Task 1.

**Interfaces:**
- Consumes: Vite config, Apps Script entrypoint, source manifest và build output của Tasks 3–4.
- Produces: `dist/index.html`, `dist/code.js`, `dist/appsscript.json`; `verifyArtifact(root): void`; `deploy:push` fail-safe khi root `.clasp.json` thiếu.

- [ ] **Step 1: Viết failing tests cho artifact verifier**

Tạo fixture temporary directory trong `tests/build/artifact-verification.test.ts`, sau đó assert:

```ts
expect(() => verifyArtifact(tempDir)).toThrow('index.html phải là HTML tự chứa');
writeFileSync(join(tempDir, 'index.html'), '<script src="/assets/app.js"></script>');
expect(() => verifyArtifact(tempDir)).toThrow('asset URL ngoài');
```

Thêm fixture valid có `index.html` với inline `<script>`, `code.js` không có `import`/`export`, và `appsscript.json` V8/Asia-Ho_Chi_Minh; test phải pass.

- [ ] **Step 2: Chạy test để xác nhận fail vì verifier chưa tồn tại**

Run: `npm test -- tests/build/artifact-verification.test.ts`

Expected: FAIL với lỗi không resolve được `scripts/verify-apps-script-artifact.mjs`.

- [ ] **Step 3: Implement build orchestration không ghi ngoài root `dist/`**

`scripts/build.mjs` phải gọi `rmSync('dist', { recursive: true, force: true })`, `mkdirSync('dist', { recursive: true })`, chạy Vite qua `execa`-free Node `spawnSync(process.execPath, ['./node_modules/vite/bin/vite.js', 'build', '--config', 'vite.config.ts'])`, rồi gọi esbuild JavaScript API với `entryPoints: ['apps-script/src/bootstrap/entry.ts']`, `bundle: true`, `platform: 'neutral'`, `format: 'iife'`, `globalName: 'SalesManagement'`, `outfile: 'dist/code.js'`.

Append footer sau bundle để Apps Script chỉ thấy hai global:

```js
function doGet(event) {
  return SalesManagement.doGet(event);
}

function invoke(request) {
  return SalesManagement.invoke(request);
}
```

Cuối script copy `apps-script/appsscript.json` thành `dist/appsscript.json`, chạy `verifyArtifact(resolve('dist'))`, và dừng non-zero khi bất kỳ child process/build/verify lỗi.

- [ ] **Step 4: Implement artifact verifier và deploy guard**

`verifyArtifact` yêu cầu đúng ba file named `index.html`, `code.js`, `appsscript.json`; từ chối HTML chứa `src=` hoặc `href=` trỏ `http`, `/assets/`, `./assets/`, hoặc file `.js`/`.css`; từ chối `code.js` có line bắt đầu `import ` hoặc `export `; parse manifest và yêu cầu `runtimeVersion === 'V8'`, `timeZone === 'Asia/Ho_Chi_Minh'`; từ chối artifact có `.clasp.json`, `.env`, `scriptId`, `client_secret` hoặc `refresh_token` trong filename/content.

`deploy-push.mjs` chạy `npm run verify`, kiểm tra `existsSync(resolve('.clasp.json'))` nhưng không đọc hoặc in nội dung file. Khi thiếu, throw `Thiếu .clasp.json cục bộ. Sao chép .clasp.json.example, thêm scriptId của test tenant và chạy lại.` Khi có, dùng `spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['clasp', 'push'], { stdio: 'inherit' })` và forward exit code.

- [ ] **Step 5: Chạy full quality gate và kiểm tra artifact bằng mắt**

Run:

```bash
npm run verify
find dist -maxdepth 1 -type f -print | sort
rg -n 'scriptId|refresh_token|client_secret|from |^export ' dist
npm run deploy:push
```

Expected: `verify` PASS; danh sách dist chỉ là `appsscript.json`, `code.js`, `index.html`; rg không tìm thấy; `deploy:push` dừng an toàn với hướng dẫn vì root `.clasp.json` không tồn tại trong workspace.

- [ ] **Step 6: Commit**

```bash
git add scripts/build.mjs scripts/verify-apps-script-artifact.mjs scripts/deploy-push.mjs tests/build/artifact-verification.test.ts package.json
git commit -m "build: package root Apps Script deployment artifact"
```

## Task 6: Rà soát tài liệu vận hành và nghiệm thu cuối slice

**Files:**
- Modify: `README.md`, `docs/architecture/folder-structure.md`, `docs/superpowers/specs/2026-07-26-technical-foundation-design.md`.

**Interfaces:**
- Consumes: Lệnh thực tế, artifact và quality gates hoàn thành ở Tasks 1–5.
- Produces: Hướng dẫn local build/deploy rõ ràng và tài liệu kiến trúc khớp với source.

- [ ] **Step 1: Viết test scenario thủ công cho deploy guard trong README**

Thêm mục “Kiểm thử nền tảng” có lệnh `npm install`, `npm run verify`, và kịch bản `npm run deploy:push` khi thiếu `.clasp.json` phải fail không remote write. Nêu rõ root `.clasp.json` chỉ do owner/test tenant tạo; không paste script ID vào issue/log/source.

- [ ] **Step 2: Đối chiếu tài liệu với artifact thực tế**

Kiểm tra `README.md` và folder map cùng nói `dist/` root, `.clasp.json.example` root, `apps-script/appsscript.json` là source manifest, và `apps-script/` không còn chứa `.clasp.json.example`. Sửa spec status thành `Đã triển khai` chỉ nếu các lệnh ở Step 3 pass.

- [ ] **Step 3: Chạy final verification theo LLD quality gate áp dụng**

Run:

```bash
node scripts/verify-structure.mjs
npm run typecheck
npm run lint
npm test
npm run build
npm run check:artifact
npm run verify
```

Expected: tất cả PASS. Đây mới là bằng chứng cho việc nền tảng build được; không khẳng định deploy Google Workspace đã thành công vì không có test tenant/script ID trong scope.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/architecture/folder-structure.md docs/superpowers/specs/2026-07-26-technical-foundation-design.md
git commit -m "docs: document deployable technical foundation"
```

## Self-review

- Spec coverage: Tasks 1–6 bao phủ npm/toolchain, single-file HtmlService output, Apps Script bundle, root `dist`, single gateway, shared contract, adapter, test/lint/type/build gates, deploy guard và tài liệu.
- Placeholder scan: Không có TODO/TBD hoặc bước “thêm test phù hợp”; mỗi test và command có expected outcome cụ thể.
- Type consistency: `ApiRequest`/`ApiResult` được định nghĩa tại Task 2, được Task 3/4 tiêu thụ; `entry.ts` được Task 3 tạo trước Task 5 bundle; `verifyArtifact` được Task 5 tạo và dùng bởi build/deploy.
