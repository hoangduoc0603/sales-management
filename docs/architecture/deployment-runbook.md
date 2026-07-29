# Deployment Runbook — Customer Installation

**Trạng thái:** Release hardening baseline  
**Nguồn:** [Deployment and lifecycle](deployment-and-lifecycle.md), [ADR 0006](../decisions/0006-customer-owned-deployment-migration.md), [Release hardening](release-hardening.md)

## 1. Mục tiêu

Runbook này dùng cho một phiên triển khai ứng dụng Sales Management lên Google account do khách sở hữu. Người triển khai có thể làm theo tài liệu này mà không cần phụ thuộc vào chat context.

Nguyên tắc bắt buộc:

- Google account của khách sở hữu Apps Script project, Drive folder, Sheets data, trigger và Web App deployment.
- Không commit `.clasp.json`, `scriptId`, Drive folder ID, Spreadsheet ID, password tạm hoặc secret.
- Chỉ push artifact trong `dist/`; không push source TypeScript trực tiếp lên Apps Script.
- Trước upgrade/migration phải có backup bắt buộc và compatibility check.
- Nếu migration ảnh hưởng ghi dữ liệu, bật maintenance/freeze write trước khi chạy migration.

## 2. Prerequisites trên Google account khách

Trước khi deploy, xác nhận:

1. Khách đăng nhập đúng Google account sẽ sở hữu hệ thống.
2. Account có quyền tạo Apps Script project, Google Sheets, Google Drive folder và trigger.
3. Nếu dùng Google Workspace/Shared Drive, xác nhận chính sách admin cho phép Apps Script, Drive và Sheets.
4. Cấu hình timezone là `Asia/Ho_Chi_Minh`.
5. Người triển khai không lưu token/secret của khách trong source code, tài liệu repo hoặc Google Sheets.
6. Máy triển khai đã có Node.js theo `package.json` (`>=22.12.0`) và đã cài dependency:

```bash
npm install
```

## 3. Tạo Apps Script project và `.clasp.json` cục bộ

`.clasp.json.example` trong repo chỉ được chứa:

```json
{
  "rootDir": "./dist"
}
```

Tệp `.clasp.json` thật là tệp local-only, bị `.gitignore` loại trừ và không được commit.

Tạo Apps Script project bằng một trong hai cách:

### Cách A — tạo bằng Apps Script UI

1. Vào Apps Script bằng Google account khách.
2. Tạo project mới, ví dụ: `Sales Management - <Tên khách>`.
3. Lấy `scriptId` trong phần Project Settings.
4. Tạo `.clasp.json` ở root repo:

```json
{
  "scriptId": "<SCRIPT_ID_CUA_KHACH>",
  "rootDir": "./dist"
}
```

### Cách B — tạo bằng clasp

Đăng nhập clasp bằng Google account khách:

```bash
npx clasp login
```

Tạo project mới và đảm bảo `.clasp.json` cuối cùng có `scriptId` và `rootDir: "./dist"`. Nếu clasp tạo thiếu `rootDir`, sửa lại thủ công theo mẫu ở trên.

## 4. Verify local trước khi push

Chạy full verification:

```bash
npm run verify
```

Lệnh này kiểm:

- cấu trúc repository;
- typecheck web và Apps Script;
- lint;
- toàn bộ test;
- build artifact vào `dist/`;
- kiểm tra artifact Apps Script.

Không push nếu `npm run verify` fail.

## 5. Push artifact lên Apps Script

Chạy:

```bash
npm run deploy:push
```

Script `deploy:push` sẽ:

1. chạy lại `npm run verify`;
2. kiểm tra `.clasp.json` local tồn tại;
3. kiểm tra `.clasp.json` có `scriptId`;
4. kiểm tra `rootDir` là `./dist`;
5. chạy `npx clasp push`.

Nếu script báo thiếu `.clasp.json`, không sửa `.clasp.json.example` để thêm `scriptId`. Phải tạo `.clasp.json` local riêng.

## 5.1. Debug Web App bằng test deployment không tăng version

Trong giai đoạn debug, khi cần cập nhật Apps Script nhiều lần nhưng không muốn tạo immutable version mới, chạy:

```bash
npm run deploy:test
```

Script `deploy:test` sẽ:

1. kiểm tra `.clasp.json` local tồn tại và trỏ tới `rootDir: "./dist"`;
2. chạy `npm run verify`;
3. chạy `npx clasp push`;
4. đọc HEAD/test deployment ID từ `npx clasp deployments --json`;
5. in test Web App URL dạng `https://script.google.com/macros/s/<DEPLOYMENT_ID>/dev`.

Lệnh này không chạy `clasp version`, không chạy `clasp deploy`, không cập nhật public Web App URL `/exec` và không tiêu tốn version deploy. URL `/dev` là test deployment chạy code mới nhất đã lưu/push trên Apps Script project và thường chỉ editor của Apps Script project truy cập được. URL này phải dùng Web App deployment ID dạng `AKfy...`, không dùng Apps Script project `scriptId`.

## 6. Tạo versioned Web App deployment

Để push, tạo immutable version và deploy Web App trong cùng một lệnh:

```bash
npm run deploy:webapp
```

Lệnh này sẽ:

1. chạy `npm run verify`;
2. push artifact trong `dist/`;
3. tạo Apps Script version mới;
4. deploy version đó thành Web App;
5. in `Deployment ID` và `Web App URL` nếu `clasp` trả deployment ID.

Manifest source phải có Web App config:

```json
{
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

Cấu hình này bám theo ADR 0001: Web App public, chạy bằng quyền Google account khách/Owner triển khai; user đăng nhập bằng tài khoản/mật khẩu nội bộ của app, không dựa vào Google identity.

Sau lần deploy đầu tiên, ghi lại `Deployment ID` ngoài source repo. Các lần cập nhật nên redeploy vào deployment cũ để giữ nguyên Web App URL:

```bash
npm run deploy:webapp -- --deploymentId <DEPLOYMENT_ID>
```

Ghi lại deployment ID và Web App URL vào biên bản bàn giao ngoài source repo.

## 7. Bootstrap tenant

Bootstrap phải chạy một lần sau deploy đầu tiên.

Với tenant test/mặc định, chạy:

```bash
npm run bootstrap:default
```

Lệnh này gọi Apps Script function `installDefaultTenant_` qua clasp. Function này tạo Drive root, storage folders, các Spreadsheet dữ liệu, runtime config trong Script Properties và seed tenant/admin mặc định. Đây là owner-run function, không phải UI public bootstrap.

Nếu `clasp run` báo `Script function not found. Please make sure script is deployed as API executable.`, bootstrap chưa chạy. Cách xử lý nhanh cho lần đầu triển khai:

1. mở Apps Script editor bằng `npx clasp open-script`;
2. chọn function `installDefaultTenant_`;
3. bấm Run và duyệt quyền Google nếu được hỏi;
4. kiểm tra function chạy xong không lỗi;
5. mở lại Web App và đăng nhập bằng `admin/admin123`.

Payload nghiệp vụ tối thiểu:

```json
{
  "operation": "platform.bootstrap.install",
  "payload": {
    "tenantDisplayName": "<Tên doanh nghiệp>",
    "adminLoginId": "admin",
    "temporaryPassword": "<MẬT_KHẨU_TẠM_CHUYỂN_RIÊNG_CHO_KHÁCH>"
  }
}
```

Kết quả bootstrap cần tạo hoặc ghi nhận:

- Drive root: `Sales Management - <Tên doanh nghiệp>`;
- storage group: `Database`, `Attachments`, `Backups`, `Exports`, `Archive`, `Templates`, `Generated Documents`;
- runtime config trong Script Properties;
- schema/migration baseline;
- chi nhánh mặc định;
- kho mặc định;
- tài khoản admin/Owner nội bộ;
- scheduled worker trigger;
- health/readiness baseline.

Mật khẩu tạm chỉ được chuyển cho khách qua kênh riêng, không ghi trong repo, issue, log hoặc Sheets. Sau lần đăng nhập đầu tiên, admin phải đổi mật khẩu.

## 8. Record runtime config và bàn giao

Sau bootstrap, ghi vào biên bản bàn giao ngoài repo:

- tên khách/tenant;
- Google account Owner;
- Apps Script project ID/deployment ID/Web App URL;
- Drive root folder ID;
- các Spreadsheet/folder chính;
- app version/schema version;
- ngày giờ bootstrap;
- người thực hiện;
- trạng thái health check;
- xác nhận admin đã đổi mật khẩu tạm.

Không commit biên bản có ID thật nếu repo có thể chia sẻ cho bên khác.

## 9. Health check sau triển khai

Chạy operation:

```json
{
  "operation": "operations.health.check",
  "payload": {
    "includeIntegrity": true
  }
}
```

Health check phải xác nhận:

- deployment version đúng;
- runtime config đọc được;
- schema version compatible;
- Drive/Sheets access còn hiệu lực;
- trigger worker tồn tại;
- backup freshness không cảnh báo sau khi tạo backup đầu tiên;
- worker backlog/failure không có lỗi chặn;
- partition capacity chưa vượt ngưỡng;
- không có integrity error.

Nếu có warning, ghi rõ vào biên bản và xử lý trước khi bàn giao nếu warning ảnh hưởng POS, backup, restore hoặc dữ liệu.

## 10. Backup trước upgrade

Trước mọi upgrade/migration:

1. thông báo thời gian bảo trì nếu migration ảnh hưởng ghi dữ liệu;
2. chạy compatibility check;
3. tạo backup thủ công:

```json
{
  "operation": "operations.backup.request",
  "payload": {
    "commandId": "cmd-pre-upgrade-backup-<YYYYMMDD-HHMM>",
    "idempotencyKey": "idem-pre-upgrade-backup-<YYYYMMDD-HHMM>",
    "backupType": "Manual"
  }
}
```

4. đợi worker hoàn tất backup;
5. kiểm manifest gồm app/schema version, partitions/resources, row count, checksum và attachment metadata;
6. chỉ tiếp tục push/deploy/migration khi backup đạt trạng thái usable.

Không upgrade production nếu backup fail hoặc chưa verify checksum.

## 11. Upgrade/migration an toàn

Luồng upgrade chuẩn:

1. Checkout đúng release tag/commit.
2. Kiểm tra `.clasp.json` đang trỏ tới đúng Apps Script project của khách.
3. Chạy `npm run verify`.
4. Tạo backup thủ công theo mục 10.
5. Nếu migration ảnh hưởng command ghi, bật maintenance/freeze write.
6. Chạy `npm run deploy:push`.
7. Tạo versioned deployment mới bằng `npx clasp deploy`.
8. Chạy migration idempotent/compatibility.
9. Chạy health check.
10. Mở lại ghi dữ liệu khi health check đạt.
11. Ghi release evidence vào biên bản bàn giao.

Rollback deployment chỉ được dùng khi schema còn compatible. Nếu schema đã migration không đảo được, dùng restore replacement-resource hoặc forward migration.

## 12. Emergency restore procedure

Restore không được overwrite trực tiếp production resource.

Quy trình:

1. Owner chọn backup cần restore.
2. Freeze write/maintenance để chặn command mới.
3. Chạy prepare restore:

```json
{
  "operation": "operations.restore.prepare",
  "payload": {
    "commandId": "cmd-restore-prepare-<RESTORE_SESSION>",
    "idempotencyKey": "idem-restore-prepare-<RESTORE_SESSION>",
    "backupRunId": "<BACKUP_RUN_ID>",
    "confirmationText": "RESTORE <BACKUP_RUN_ID>"
  }
}
```

4. Hệ thống verify manifest, schema, row count, checksum và reference.
5. Tạo replacement Spreadsheet/folder riêng.
6. Import dữ liệu vào replacement resource.
7. Chạy health check trên replacement.
8. Owner xác nhận switch:

```json
{
  "operation": "operations.restore.switch",
  "payload": {
    "commandId": "cmd-restore-switch-<RESTORE_SESSION>",
    "idempotencyKey": "idem-restore-switch-<RESTORE_SESSION>",
    "restoreRunId": "<RESTORE_RUN_ID>",
    "ownerConfirmationText": "SWITCH <RESTORE_RUN_ID>"
  }
}
```

9. Sau switch, revoke toàn bộ session cũ và yêu cầu đăng nhập lại.
10. Chạy health check lại trên resource mới.
11. Chỉ mở ghi dữ liệu khi health check pass.
12. Giữ resource cũ để phục vụ rollback/đối soát, không xóa ngay.

## 13. Checklist bàn giao khách hàng

- [ ] `.clasp.json` chỉ tồn tại local và không bị commit.
- [ ] `npm run verify` pass trước push.
- [ ] `npm run deploy:push` pass và chỉ push `dist/`.
- [ ] Web App deployment có version/description rõ.
- [ ] Bootstrap tenant đã chạy một lần.
- [ ] Drive root và storage group được tạo đúng.
- [ ] Runtime config đã ghi nhận ngoài repo.
- [ ] Admin đổi mật khẩu tạm sau lần đăng nhập đầu tiên.
- [ ] Health check pass hoặc warning đã xử lý/ghi rõ.
- [ ] Backup đầu tiên đã tạo và manifest usable.
- [ ] Restore drill đã được chạy trên test deployment trước release thật.

## 14. Gap còn phải xác minh ở Task 10

Runbook này chưa tự chứng minh production deployment đã sẵn sàng. Trước khi chuyển release sang `Ready`, vẫn phải có evidence:

- fresh tenant dry-run trên Apps Script test project;
- upgraded tenant dry-run với backup trước migration;
- backup/restore replacement-resource drill;
- POS benchmark trên môi trường Apps Script production-like;
- `npm run release:readiness` không còn P0 gap.
