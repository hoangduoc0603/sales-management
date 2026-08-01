import { describe, expect, it } from 'vitest';
import { createLocalFakeBackendClient } from '../../web/src/lib/api/local-fake-backend';

describe('createLocalFakeBackendClient', () => {
  it('login local và dùng session để gọi protected registry query', async () => {
    const client = createLocalFakeBackendClient();

    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    expect(login).toMatchObject({ ok: true });
    if (!login.ok) throw new Error('login failed');

    const registry = await client.invoke({
      operation: 'platform.registry.getTableDefinitions',
      requestId: 'req-registry',
      sessionToken: login.data.sessionToken,
      payload: {},
    });

    expect(registry).toMatchObject({ ok: true });
    if (!registry.ok) throw new Error('registry failed');
    expect(registry.data.tables.map((table) => table.tableName)).toContain('CommandTransaction');
  });

  it('trả SESSION_REQUIRED cho protected operation thiếu session', async () => {
    const client = createLocalFakeBackendClient();

    await expect(
      client.invoke({
        operation: 'platform.session.me',
        requestId: 'req-me',
        payload: {},
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'SESSION_REQUIRED' },
    });
  });

  it('hỗ trợ bootstrap status, current scope và đổi mật khẩu ở local fake backend', async () => {
    const client = createLocalFakeBackendClient();

    await expect(
      client.invoke({
        operation: 'platform.install.getStatus',
        requestId: 'req-install-status',
        payload: {},
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { status: 'Installed', installed: true },
    });

    await expect(
      client.invoke({
        operation: 'platform.install.run',
        requestId: 'req-install-run',
        payload: {
          tenantDisplayName: 'Cửa hàng test',
          adminLoginId: 'admin',
          adminPassword: 'admin1234',
          confirmAdminPassword: 'admin1234',
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { status: 'Installed', tenantDisplayName: 'Cửa hàng test' },
    });

    await expect(
      client.invoke({
        operation: 'platform.bootstrap.getStatus',
        requestId: 'req-bootstrap-status',
        payload: {},
      }),
    ).resolves.toMatchObject({ ok: true, data: { installed: true } });

    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    await expect(
      client.invoke({
        operation: 'platform.scope.getCurrent',
        requestId: 'req-scope',
        sessionToken: login.data.sessionToken,
        payload: {},
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        activeBranchId: 'branch-default',
        activeWarehouseId: 'warehouse-default',
      },
    });

    await expect(
      client.invoke({
        operation: 'platform.auth.changeOwnPassword',
        requestId: 'req-change-password',
        sessionToken: login.data.sessionToken,
        payload: { currentPassword: 'admin123', newPassword: 'new-admin-123' },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { changed: true, sessionRevoked: true },
    });

    await expect(
      client.invoke({
        operation: 'platform.session.me',
        requestId: 'req-old-session',
        sessionToken: login.data.sessionToken,
        payload: {},
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'SESSION_EXPIRED' } });

    await expect(
      client.invoke({
        operation: 'platform.auth.login',
        requestId: 'req-relogin',
        payload: { loginId: 'admin', password: 'new-admin-123' },
      }),
    ).resolves.toMatchObject({ ok: true });
  });

  it('trả INVALID_REQUEST thay vì throw khi change password payload không hợp lệ', async () => {
    const client = createLocalFakeBackendClient();
    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    await expect(
      client.invoke({
        operation: 'platform.auth.changeOwnPassword',
        requestId: 'req-invalid-change-password',
        sessionToken: login.data.sessionToken,
        payload: { currentPassword: 'admin123', newPassword: '' },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REQUEST' },
    });
  });

  it('hỗ trợ Catalog/CRM projection, quote và customer quick create ở local fake backend', async () => {
    const client = createLocalFakeBackendClient();
    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const projection = await client.invoke({
      operation: 'catalog.pos.getProjection',
      requestId: 'req-projection',
      sessionToken: login.data.sessionToken,
      payload: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
    });
    expect(projection).toMatchObject({ ok: true });
    if (!projection.ok) throw new Error('projection failed');
    expect(projection.data.variants).toEqual(
      expect.arrayContaining([expect.objectContaining({ sku: 'SH-OC-1L' })]),
    );

    await expect(
      client.invoke({
        operation: 'catalog.quote.preview',
        requestId: 'req-quote',
        sessionToken: login.data.sessionToken,
        payload: {
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          lines: [
            {
              lineId: 'line-1',
              variantId: 'variant-milk-1l',
              unitVersionId: 'unit-bottle-v1',
              quantity: 2,
            },
          ],
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { subtotalVnd: 84000 },
    });

    await expect(
      client.invoke({
        operation: 'crm.customer.quickCreate',
        requestId: 'req-customer',
        sessionToken: login.data.sessionToken,
        payload: { displayName: 'Khách test', phone: '0909000111' },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { duplicateWarnings: [] },
    });
  });

  it('hỗ trợ Inventory balance summary ở local fake backend', async () => {
    const client = createLocalFakeBackendClient();
    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    await expect(
      client.invoke({
        operation: 'inventory.balance.getSummary',
        requestId: 'req-inventory-summary',
        sessionToken: login.data.sessionToken,
        payload: { warehouseId: 'warehouse-default' },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        rows: expect.arrayContaining([
          expect.objectContaining({
            warehouseId: 'warehouse-default',
            variantId: 'variant-milk-1l',
            availableMilli: 26_000,
          }),
        ]),
      },
    });
  });

  it('hỗ trợ Finance summary ở local fake backend', async () => {
    const client = createLocalFakeBackendClient();
    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    await expect(
      client.invoke({
        operation: 'finance.summary.get',
        requestId: 'req-finance-summary',
        sessionToken: login.data.sessionToken,
        payload: {},
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        openShiftCount: 1,
        cashInVnd: 9_420_000,
      },
    });
  });

  it('hỗ trợ Reporting dashboard, report query và export ở local fake backend', async () => {
    const client = createLocalFakeBackendClient();
    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-reporting-local',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    await expect(
      client.invoke({
        operation: 'reporting.dashboard.get',
        requestId: 'req-dashboard-local',
        sessionToken: login.data.sessionToken,
        payload: {
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          dateRange: { from: '2026-07-26', to: '2026-07-26' },
          requestedSensitiveFields: ['grossProfitVnd'],
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        metadata: { archiveIncluded: false },
        kpis: [{ kpiId: 'netRevenue' }, { kpiId: 'completedOrders' }, { kpiId: 'collected' }, { kpiId: 'receivableOverdue' }],
        restricted: { sensitiveFields: ['grossProfitVnd'] },
      },
    });

    const report = await client.invoke({
      operation: 'reporting.report.query',
      requestId: 'req-report-local',
      sessionToken: login.data.sessionToken,
      payload: {
        reportId: 'sales-profit',
        dateField: 'completedOrShippedAt',
        dateRange: { from: '2026-07-26', to: '2026-07-26' },
        scope: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
        pageSize: 50,
      },
    });
    expect(report).toMatchObject({ ok: true, data: { rows: [{ netRevenueVnd: 286_450_000 }] } });
    if (!report.ok) throw new Error('report failed');
    expect(report.data.rows[0]).not.toHaveProperty('grossProfitVnd');

    const exportRequest = await client.invoke({
        operation: 'reporting.export.request',
        requestId: 'req-export-local',
        sessionToken: login.data.sessionToken,
        payload: {
          commandId: 'cmd-export-local',
          idempotencyKey: 'idem-export-local',
          format: 'CSV',
          query: {
            reportId: 'sales-summary',
            dateField: 'completedOrShippedAt',
            dateRange: { from: '2026-07-26', to: '2026-07-26' },
            scope: { branchId: 'branch-default' },
            pageSize: 50,
          },
        },
      });
    expect(exportRequest).toMatchObject({ ok: true, data: { exportRun: { status: 'Completed', routing: 'SmallSync' } } });
    if (!exportRequest.ok) throw new Error('export request failed');

    await expect(
      client.invoke({
        operation: 'reporting.export.getStatus',
        requestId: 'req-export-status-local',
        sessionToken: login.data.sessionToken,
        payload: { runId: exportRequest.data.exportRun.runId },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { exportRun: { runId: exportRequest.data.exportRun.runId, status: 'Completed' } },
    });
  });

  it('hỗ trợ Operations import, attachment, backup, restore, health ở local fake backend', async () => {
    const client = createLocalFakeBackendClient({ now: () => new Date('2026-07-27T09:00:00.000Z') });
    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-operations-local',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const upload = await client.invoke({
      operation: 'operations.import.upload',
      requestId: 'req-local-import-upload',
      sessionToken: login.data.sessionToken,
      payload: {
        importType: 'Catalog',
        schemaVersion: 1,
        fileName: 'catalog.csv',
        checksum: 'file-checksum-local',
        scopeKey: 'branch-default/warehouse-default',
        rowCount: 2,
        commandId: 'cmd-local-import-upload',
        idempotencyKey: 'idem-local-import-upload',
      },
    });
    expect(upload).toMatchObject({ ok: true, data: { batch: { status: 'Uploaded', rowCount: 2 } } });
    if (!upload.ok) throw new Error('upload failed');

    await expect(
      client.invoke({
        operation: 'operations.import.validate',
        requestId: 'req-local-import-validate',
        sessionToken: login.data.sessionToken,
        payload: {
          batchId: upload.data.batch.batchId,
          rows: [
            { rowNumber: 1, rowKey: 'SKU-001', payload: { sku: 'SKU-001', name: 'Sữa hạt' } },
            { rowNumber: 2, rowKey: 'SKU-002', payload: { sku: '', name: 'Thiếu SKU' } },
          ],
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { batch: { status: 'AwaitingConfirmation', validCount: 1, invalidCount: 1 } },
    });

    await expect(
      client.invoke({
        operation: 'operations.import.commit',
        requestId: 'req-local-import-commit',
        sessionToken: login.data.sessionToken,
        payload: {
          batchId: upload.data.batch.batchId,
          selectionMode: 'ValidRowsOnly',
          commandId: 'cmd-local-import-commit',
          idempotencyKey: 'idem-local-import-commit',
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        batch: { status: 'Completed', selectionMode: 'ValidRowsOnly' },
        committedRows: [expect.objectContaining({ rowKey: 'SKU-001', commitStatus: 'Committed' })],
      },
    });

    const attachment = await client.invoke({
      operation: 'operations.attachment.complete',
      requestId: 'req-local-attachment-complete',
      sessionToken: login.data.sessionToken,
      payload: {
        objectType: 'Expense',
        objectId: 'expense-local-1',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        driveFileId: 'drive-file-local-1',
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        checksum: 'attachment-checksum-local',
        commandId: 'cmd-local-attachment',
        idempotencyKey: 'idem-local-attachment',
      },
    });
    expect(attachment).toMatchObject({ ok: true, data: { attachment: { status: 'Available' } } });
    if (!attachment.ok) throw new Error('attachment failed');

    const attachmentAccess = await client.invoke({
      operation: 'operations.attachment.download',
      requestId: 'req-local-attachment-download',
      sessionToken: login.data.sessionToken,
      payload: {
        attachmentId: attachment.data.attachment.attachmentId,
        objectType: 'Expense',
        objectId: 'expense-local-1',
      },
    });
    expect(attachmentAccess).toMatchObject({
      ok: true,
      data: {
        accessToken: expect.stringContaining('attachment-access-token'),
        contentBase64: expect.stringContaining('local-private-content'),
      },
    });
    expect(JSON.stringify(attachmentAccess)).not.toContain('drive.google.com');
    expect(JSON.stringify(attachmentAccess)).not.toContain('publicUrl');

    const uploadedAttachment = await client.invoke({
      operation: 'operations.attachment.upload',
      requestId: 'req-local-attachment-upload',
      sessionToken: login.data.sessionToken,
      payload: {
        objectType: 'Expense',
        objectId: 'expense-local-2',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        fileName: 'receipt-upload.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512,
        checksum: 'attachment-upload-checksum-local',
        contentBase64: 'cmVjZWlwdA==',
        commandId: 'cmd-local-attachment-upload',
        idempotencyKey: 'idem-local-attachment-upload',
      },
    });
    expect(uploadedAttachment).toMatchObject({
      ok: true,
      data: {
        attachment: {
          objectType: 'Expense',
          objectId: 'expense-local-2',
          status: 'Available',
          driveFileId: expect.stringMatching(/^local-private-drive-file-local-file-/),
        },
      },
    });
    expect(JSON.stringify(uploadedAttachment)).not.toContain('publicUrl');
    if (!uploadedAttachment.ok) throw new Error('attachment upload failed');

    const attachmentList = await client.invoke({
      operation: 'operations.attachment.list',
      requestId: 'req-local-attachment-list',
      sessionToken: login.data.sessionToken,
      payload: {
        objectType: 'Expense',
        objectId: 'expense-local-2',
      },
    });
    expect(attachmentList).toMatchObject({
      ok: true,
      data: { attachments: [{ attachmentId: uploadedAttachment.data.attachment.attachmentId, status: 'Available' }] },
    });

    const deletedAttachment = await client.invoke({
      operation: 'operations.attachment.delete',
      requestId: 'req-local-attachment-delete',
      sessionToken: login.data.sessionToken,
      payload: {
        attachmentId: uploadedAttachment.data.attachment.attachmentId,
        objectType: 'Expense',
        objectId: 'expense-local-2',
        commandId: 'cmd-local-attachment-delete',
        idempotencyKey: 'idem-local-attachment-delete',
      },
    });
    expect(deletedAttachment).toMatchObject({
      ok: true,
      data: { attachment: { attachmentId: uploadedAttachment.data.attachment.attachmentId, status: 'Deleted' } },
    });

    const backup = await client.invoke({
      operation: 'operations.backup.request',
      requestId: 'req-local-backup',
      sessionToken: login.data.sessionToken,
      payload: {
        backupType: 'Manual',
        commandId: 'cmd-local-backup',
        idempotencyKey: 'idem-local-backup',
      },
    });
    expect(backup).toMatchObject({
      ok: true,
      data: {
        backup: {
          status: 'Completed',
          manifest: { checksum: expect.stringContaining('checksum-') },
        },
      },
    });
    if (!backup.ok) throw new Error('backup failed');

    await expect(
      client.invoke({
        operation: 'operations.restore.prepare',
        requestId: 'req-local-restore-prepare',
        sessionToken: login.data.sessionToken,
        payload: {
          backupRunId: backup.data.backup.backupRunId,
          confirmationText: `RESTORE ${backup.data.backup.backupRunId}`,
          commandId: 'cmd-local-restore-prepare',
          idempotencyKey: 'idem-local-restore-prepare',
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { restore: { status: 'Prepared', writeFrozen: true } },
    });

    await expect(
      client.invoke({
        operation: 'operations.health.check',
        requestId: 'req-local-health',
        sessionToken: login.data.sessionToken,
        payload: { includeIntegrity: true },
      }),
    ).resolves.toMatchObject({ ok: true, data: { status: 'Ok' } });

    await expect(
      client.invoke({
        operation: 'operations.partition.ensureNext',
        requestId: 'req-local-partition',
        sessionToken: login.data.sessionToken,
        payload: { storageRole: 'transaction', thresholdPct: 80 },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { nextPartition: { partitionKey: 'FY2026-P02', readOnly: false } },
    });

    await expect(
      client.invoke({
        operation: 'operations.audit.search' as never,
        requestId: 'req-local-audit-disabled',
        sessionToken: login.data.sessionToken,
        payload: {},
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
  });

  it('hỗ trợ Purchasing supplier, PO, receipt và supplier return ở local fake backend', async () => {
    const client = createLocalFakeBackendClient();
    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-purchasing-local',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const supplier = await client.invoke({
      operation: 'purchasing.supplier.create',
      requestId: 'req-supplier-local',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-supplier-local',
        idempotencyKey: 'idem-supplier-local',
        supplierCode: 'NCC-LOCAL',
        name: 'Nhà cung cấp local',
        paymentTerms: { dueDays: 15 },
      },
    });
    expect(supplier).toMatchObject({ ok: true, data: { supplier: { status: 'Active' } } });
    if (!supplier.ok) throw new Error('supplier failed');

    const po = await client.invoke({
      operation: 'purchasing.po.create',
      requestId: 'req-po-local',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-po-local',
        idempotencyKey: 'idem-po-local',
        supplierId: supplier.data.supplier.supplierId,
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        actorId: 'buyer-1',
        lines: [
          {
            lineId: 'po-line-1',
            variantId: 'variant-milk-1l',
            unitVersionId: 'unit-bottle-v1',
            quantity: 5,
            quantityMilli: 5_000,
            unitCostVnd: 20_000,
            lineDiscountVnd: 0,
            vatVnd: 0,
          },
        ],
      },
    });
    expect(po).toMatchObject({ ok: true, data: { purchaseOrder: { status: 'Draft' } } });
    if (!po.ok) throw new Error('po failed');

    await expect(
      client.invoke({
        operation: 'purchasing.po.approve',
        requestId: 'req-po-approve-local',
        sessionToken: login.data.sessionToken,
        payload: {
          commandId: 'cmd-po-approve-local',
          idempotencyKey: 'idem-po-approve-local',
          purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
          approverId: 'manager-1',
        },
      }),
    ).resolves.toMatchObject({ ok: true, data: { purchaseOrder: { status: 'Approved' } } });

    const receipt = await client.invoke({
      operation: 'purchasing.receipt.create',
      requestId: 'req-receipt-local',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-receipt-local',
        idempotencyKey: 'idem-receipt-local',
        supplierId: supplier.data.supplier.supplierId,
        purchaseOrderId: po.data.purchaseOrder.purchaseOrderId,
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        receivedDate: '2026-07-27',
        actorId: 'receiver-1',
        lines: [
          {
            lineId: 'receipt-line-1',
            purchaseOrderLineId: po.data.lines[0].purchaseOrderLineId,
            variantId: 'variant-milk-1l',
            unitVersionId: 'unit-bottle-v1',
            quantity: 5,
            quantityMilli: 5_000,
            unitCostVnd: 20_000,
            lineDiscountVnd: 0,
            vatVnd: 0,
            allocatedLandedCostVnd: 10_000,
          },
        ],
      },
    });
    expect(receipt).toMatchObject({ ok: true, data: { goodsReceipt: { status: 'Draft' } } });
    if (!receipt.ok) throw new Error('receipt failed');

    const approvedReceipt = await client.invoke({
      operation: 'purchasing.receipt.approve',
      requestId: 'req-receipt-approve-local',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-receipt-approve-local',
        idempotencyKey: 'idem-receipt-approve-local',
        goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
        approverId: 'manager-1',
      },
    });
    expect(approvedReceipt).toMatchObject({ ok: true, data: { goodsReceipt: { status: 'Approved' }, payable: { originalAmountVnd: 110_000 } } });
    if (!approvedReceipt.ok) throw new Error('receipt approve failed');

    const supplierReturn = await client.invoke({
      operation: 'purchasing.supplierReturn.create',
      requestId: 'req-supplier-return-local',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-supplier-return-local',
        idempotencyKey: 'idem-supplier-return-local',
        supplierId: supplier.data.supplier.supplierId,
        goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        actorId: 'buyer-1',
        treatment: 'ReducePayable',
        reason: 'Hàng lỗi.',
        lines: [
          {
            lineId: 'return-line-1',
            goodsReceiptLineId: approvedReceipt.data.lines[0].goodsReceiptLineId,
            variantId: 'variant-milk-1l',
            quantity: 1,
            quantityMilli: 1_000,
            unitCostVnd: 22_000,
          },
        ],
      },
    });
    expect(supplierReturn).toMatchObject({ ok: true, data: { supplierReturn: { status: 'Draft' } } });
    if (!supplierReturn.ok) throw new Error('supplier return failed');

    await expect(
      client.invoke({
        operation: 'purchasing.supplierReturn.approve',
        requestId: 'req-supplier-return-approve-local',
        sessionToken: login.data.sessionToken,
        payload: {
          commandId: 'cmd-supplier-return-approve-local',
          idempotencyKey: 'idem-supplier-return-approve-local',
          supplierReturnId: supplierReturn.data.supplierReturn.supplierReturnId,
          approverId: 'manager-1',
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        supplierReturn: { status: 'Approved' },
        inventoryMovements: [{ movement: { movementType: 'PurchaseReturn' } }],
        payableAdjustment: { remainingAmountVnd: 88_000 },
      },
    });

    const supplierReturnRefund = await client.invoke({
      operation: 'purchasing.supplierReturn.create',
      requestId: 'req-supplier-return-refund-local',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-supplier-return-refund-local',
        idempotencyKey: 'idem-supplier-return-refund-local',
        supplierId: supplier.data.supplier.supplierId,
        goodsReceiptId: receipt.data.goodsReceipt.goodsReceiptId,
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        actorId: 'buyer-1',
        treatment: 'Refund',
        reason: 'NCC hoàn tiền.',
        lines: [
          {
            lineId: 'return-refund-line-1',
            goodsReceiptLineId: approvedReceipt.data.lines[0].goodsReceiptLineId,
            variantId: 'variant-milk-1l',
            quantity: 1,
            quantityMilli: 1_000,
            unitCostVnd: 22_000,
          },
        ],
      },
    });
    if (!supplierReturnRefund.ok) throw new Error('supplier return refund failed');

    await expect(
      client.invoke({
        operation: 'purchasing.supplierReturn.approve',
        requestId: 'req-supplier-return-refund-approve-local',
        sessionToken: login.data.sessionToken,
        payload: {
          commandId: 'cmd-supplier-return-refund-approve-local',
          idempotencyKey: 'idem-supplier-return-refund-approve-local',
          supplierReturnId: supplierReturnRefund.data.supplierReturn.supplierReturnId,
          approverId: 'manager-1',
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        supplierReturn: { status: 'Approved', treatment: 'Refund' },
        supplierPrepayment: {
          supplierId: supplier.data.supplier.supplierId,
          amountVnd: 22_000,
          status: 'Open',
        },
      },
    });
  });

  it('hỗ trợ Sales draft, POS checkout, idempotency và conflict ở local fake backend', async () => {
    const client = createLocalFakeBackendClient();
    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const projection = await client.invoke({
      operation: 'catalog.pos.getProjection',
      requestId: 'req-projection-sales',
      sessionToken: login.data.sessionToken,
      payload: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
    });
    if (!projection.ok) throw new Error('projection failed');
    const variant = projection.data.variants[0];
    if (variant === undefined) throw new Error('missing variant');

    const quote = await client.invoke({
      operation: 'catalog.quote.preview',
      requestId: 'req-quote-sales',
      sessionToken: login.data.sessionToken,
      payload: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        lines: [{ lineId: 'line-1', variantId: variant.variantId, unitVersionId: variant.unitVersionId, quantity: 2 }],
      },
    });
    if (!quote.ok) throw new Error('quote failed');

    await expect(
      client.invoke({
        operation: 'sales.draft.save',
        requestId: 'req-draft-save',
        sessionToken: login.data.sessionToken,
        payload: {
          commandId: 'cmd-draft-local',
          idempotencyKey: 'idem-draft-local',
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          cashierId: 'user-admin',
          lines: [
            {
              lineId: 'line-1',
              variantId: variant.variantId,
              unitVersionId: variant.unitVersionId,
              quantity: 2,
              quantityMilli: 2_000,
              unitPriceVnd: variant.unitPriceVnd,
              lineDiscountVnd: 0,
            },
          ],
          tenders: [{ tenderId: 'tender-cash', paymentMethodId: 'cash', amountVnd: quote.data.totalVnd }],
        },
      }),
    ).resolves.toMatchObject({ ok: true, data: { order: { status: 'Draft' } } });

    await expect(
      client.invoke({
        operation: 'sales.draft.list',
        requestId: 'req-draft-list',
        sessionToken: login.data.sessionToken,
        payload: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        drafts: [
          expect.objectContaining({
            order: expect.objectContaining({ status: 'Draft' }),
          }),
        ],
      },
    });

    const completePayload = {
      commandId: 'cmd-pos-local',
      idempotencyKey: 'idem-pos-local',
      branchId: 'branch-default',
      warehouseId: 'warehouse-default',
      cashierId: 'user-admin',
      cashDrawerId: 'drawer-main',
      shiftId: 'shift-local-open',
      quoteVersion: quote.data.quoteVersion,
      receiptFormat: 'K80',
      lines: [
        {
          lineId: 'line-1',
          variantId: variant.variantId,
          unitVersionId: variant.unitVersionId,
          quantity: 2,
          quantityMilli: 2_000,
          unitPriceVnd: variant.unitPriceVnd,
          lineDiscountVnd: 0,
        },
      ],
      tenders: [{ tenderId: 'tender-cash', paymentMethodId: 'cash', amountVnd: quote.data.totalVnd }],
    };

    const first = await client.invoke({
      operation: 'sales.pos.complete',
      requestId: 'req-pos-complete',
      sessionToken: login.data.sessionToken,
      payload: completePayload,
    });
    expect(first).toMatchObject({ ok: true, data: { order: { status: 'Completed' }, receipt: { receiptFormat: 'K80' } } });
    if (!first.ok) throw new Error('checkout failed');

    await expect(
      client.invoke({
        operation: 'sales.pos.complete',
        requestId: 'req-pos-complete-retry',
        sessionToken: login.data.sessionToken,
        payload: { ...completePayload, commandId: 'cmd-pos-local-retry' },
      }),
    ).resolves.toMatchObject({ ok: true, data: { order: { saleOrderId: first.data.order.saleOrderId } } });

    await expect(
      client.invoke({
        operation: 'sales.pos.complete',
        requestId: 'req-pos-conflict',
        sessionToken: login.data.sessionToken,
        payload: { ...completePayload, commandId: 'cmd-pos-conflict', idempotencyKey: 'idem-pos-conflict', quoteVersion: 'quote-old' },
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'PRICE_CHANGED' } });

    const exchangeVariant = projection.data.variants.find((candidate) => candidate.variantId === 'variant-laundry-36');
    if (exchangeVariant === undefined) throw new Error('missing exchange variant');
    const exchangeQuote = await client.invoke({
      operation: 'catalog.quote.preview',
      requestId: 'req-exchange-quote-local',
      sessionToken: login.data.sessionToken,
      payload: {
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        lines: [{ lineId: 'exchange-line-1', variantId: exchangeVariant.variantId, unitVersionId: exchangeVariant.unitVersionId, quantity: 1 }],
      },
    });
    if (!exchangeQuote.ok) throw new Error('exchange quote failed');

    await expect(
      client.invoke({
        operation: 'sales.exchange.create',
        requestId: 'req-exchange-local',
        sessionToken: login.data.sessionToken,
        payload: {
          commandId: 'cmd-exchange-local',
          idempotencyKey: 'idem-exchange-local',
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          actorId: 'user-admin',
          cashierId: 'user-admin',
          cashDrawerId: 'drawer-main',
          sourceSaleOrderId: first.data.order.saleOrderId,
          customerId: 'customer-local',
          reason: 'Đổi sản phẩm.',
          quoteVersion: exchangeQuote.data.quoteVersion,
          receiptFormat: 'K80',
          returnLines: [
            {
              sourceSaleLineId: first.data.lines[0].saleOrderLineId,
              variantId: variant.variantId,
              quantity: 1,
              quantityMilli: 1_000,
              disposition: 'Restock',
            },
          ],
          exchangeLines: [
            {
              lineId: 'exchange-line-1',
              variantId: exchangeVariant.variantId,
              unitVersionId: exchangeVariant.unitVersionId,
              quantity: 1,
              quantityMilli: 1_000,
              unitPriceVnd: exchangeVariant.unitPriceVnd,
              lineDiscountVnd: 0,
            },
          ],
          tenders: [{ tenderId: 'tender-exchange-cash', paymentMethodId: 'cash', amountVnd: exchangeQuote.data.totalVnd - 42_000 }],
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        returnOrder: { returnType: 'Exchange', status: 'Resolved' },
        exchangeOrder: { status: 'Completed', paymentStatus: 'Paid' },
        netSettlementVnd: 143_000,
      },
    });
  });

  it('hỗ trợ Sales order list/detail và online transition ở local fake backend', async () => {
    const client = createLocalFakeBackendClient();
    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login-online-local',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const projection = await client.invoke({
      operation: 'catalog.pos.getProjection',
      requestId: 'req-projection-online-local',
      sessionToken: login.data.sessionToken,
      payload: { branchId: 'branch-default', warehouseId: 'warehouse-default' },
    });
    if (!projection.ok) throw new Error('projection failed');
    const variant = projection.data.variants[0];
    if (variant === undefined) throw new Error('missing variant');

    const draft = await client.invoke({
      operation: 'sales.draft.save',
      requestId: 'req-online-draft-local',
      sessionToken: login.data.sessionToken,
      payload: {
        commandId: 'cmd-online-draft-local',
        idempotencyKey: 'idem-online-draft-local',
        source: 'ManualOnline',
        branchId: 'branch-default',
        warehouseId: 'warehouse-default',
        cashierId: 'user-admin',
        customerId: 'customer-1',
        recipient: {
          name: 'Trần Thị Hồng Nhung',
          phone: '0909482176',
          address: '12 Nguyễn Trãi',
          shippingMethod: 'Tự giao',
          codVnd: 84_000,
        },
        lines: [
          {
            lineId: 'line-1',
            variantId: variant.variantId,
            unitVersionId: variant.unitVersionId,
            quantity: 2,
            quantityMilli: 2_000,
            unitPriceVnd: variant.unitPriceVnd,
            lineDiscountVnd: 0,
          },
        ],
        tenders: [{ tenderId: 'tender-online-deposit', paymentMethodId: 'cash', cashDrawerId: 'drawer-main', amountVnd: 20_000 }],
      },
    });
    expect(draft).toMatchObject({ ok: true, data: { order: { source: 'ManualOnline', status: 'Draft' } } });
    if (!draft.ok) throw new Error('draft failed');

    await expect(
      client.invoke({
        operation: 'sales.online.confirm',
        requestId: 'req-online-confirm-local',
        sessionToken: login.data.sessionToken,
        payload: {
          commandId: 'cmd-online-confirm-local',
          idempotencyKey: 'idem-online-confirm-local',
          saleOrderId: draft.data.order.saleOrderId,
          actorId: 'user-admin',
        },
      }),
    ).resolves.toMatchObject({ ok: true, data: { order: { status: 'Confirmed' } } });

    await expect(
      client.invoke({
        operation: 'sales.order.list',
        requestId: 'req-order-list-local',
        sessionToken: login.data.sessionToken,
        payload: {
          branchId: 'branch-default',
          warehouseId: 'warehouse-default',
          statuses: ['Confirmed'],
          sources: ['ManualOnline'],
          limit: 20,
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        orders: [
          expect.objectContaining({
            order: expect.objectContaining({ status: 'Confirmed' }),
            lineCount: 1,
          }),
        ],
      },
    });

    await expect(
      client.invoke({
        operation: 'sales.order.get',
        requestId: 'req-order-get-local',
        sessionToken: login.data.sessionToken,
        payload: { saleOrderId: draft.data.order.saleOrderId },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        order: { saleOrderId: draft.data.order.saleOrderId },
        lines: [expect.objectContaining({ quantityMilli: 2_000 })],
      },
    });

    await expect(
      client.invoke({
        operation: 'sales.online.cancel',
        requestId: 'req-online-cancel-local',
        sessionToken: login.data.sessionToken,
        payload: {
          commandId: 'cmd-online-cancel-local',
          idempotencyKey: 'idem-online-cancel-local',
          saleOrderId: draft.data.order.saleOrderId,
          actorId: 'user-admin',
          reason: 'Khách hủy và giữ tiền cọc.',
          depositTreatment: 'KeepCustomerCredit',
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        order: { status: 'Cancelled', paidVnd: 20_000 },
        customerCredit: { customerId: 'customer-1', amountVnd: 20_000, sourceDocument: { sourceType: 'SaleOrder' } },
      },
    });
  });
});
