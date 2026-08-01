import { useState } from 'react';
import type { AppRoute } from '../../app/app-shell/app-shell';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Listbox } from '../../components/ui/listbox';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import { Table } from '../../components/ui/table';

export interface ReportingAdministrationOperationsHomeProps {
  route: Extract<AppRoute, 'reports' | 'admin'>;
}

const reportRows = [
  {
    key: 'sales-daily',
    name: 'Báo cáo bán hàng theo ngày',
    scope: 'Branch/Warehouse hiện tại',
    coverage: 'Complete',
  },
  {
    key: 'inventory-aging',
    name: 'Tồn kho và cảnh báo hạn dùng',
    scope: 'Warehouse hiện tại',
    coverage: 'Archive partial',
  },
  {
    key: 'cash-aging',
    name: 'Sổ quỹ, ca và công nợ aging',
    scope: 'Branch hiện tại',
    coverage: 'Complete',
  },
];

export function ReportingAdministrationOperationsHome({
  route,
}: ReportingAdministrationOperationsHomeProps) {
  const [reportId, setReportId] = useState('sales-daily');
  const [operationStatus, setOperationStatus] = useState('pending');
  const isAdminRoute = route === 'admin';

  return (
    <div className="cn-reporting-shell">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">Reporting / Administration / Operations</p>
          <h1>{isAdminRoute ? 'Quản trị & vận hành hệ thống' : 'Báo cáo, quản trị & vận hành'}</h1>
          <p>
            Báo cáo, export, user/role/scope, import, attachment, backup/restore và health theo
            artifact Approved.
          </p>
        </div>
        <div className="cn-dashboard-actions">
          <Badge tone="success">Approved design</Badge>
          <Button variant="secondary">Làm mới</Button>
          <Button isLoading={operationStatus === 'running'} variant="primary">
            Xuất báo cáo
          </Button>
        </div>
      </header>

      <div className="cn-filter-bar" aria-label="Bộ lọc báo cáo và vận hành">
        <Listbox
          label="Báo cáo"
          onChange={setReportId}
          options={[
            { value: 'sales-daily', label: 'Bán hàng theo ngày' },
            { value: 'inventory-aging', label: 'Tồn kho / hạn dùng' },
            { value: 'cash-aging', label: 'Sổ quỹ / công nợ aging' },
          ]}
          value={reportId}
        />
        <Listbox
          label="Trạng thái tác vụ"
          onChange={setOperationStatus}
          options={[
            { value: 'pending', label: 'Đang chờ' },
            { value: 'running', label: 'Đang xử lý' },
            { value: 'done', label: 'Hoàn tất' },
          ]}
          value={operationStatus}
        />
        <div className="cn-search-box" role="search">
          <span>Tìm báo cáo, export run, user hoặc tác vụ vận hành</span>
        </div>
      </div>

      <div className="cn-sales-grid">
        <Panel
          description="Query envelope giữ date semantic, scope, as-of, coverage và cursor/page size từ backend."
          title="Report shell & drill-down"
        >
          <Table
            columns={[
              { key: 'name', header: 'Báo cáo' },
              { key: 'scope', header: 'Scope' },
              { key: 'coverage', header: 'Coverage' },
              { key: 'action', header: '' },
            ]}
            emptyMessage="Không có báo cáo trong phạm vi hiện tại."
            getRowKey={(row) => String(row.key)}
            rows={reportRows.map((report) => ({
              key: report.key,
              name: (
                <span>
                  <strong>{report.name}</strong>
                  <small>generatedAt/asOf từ projection backend; không dùng dữ liệu cũ sau đổi scope.</small>
                </span>
              ),
              scope: report.scope,
              coverage: (
                <Badge tone={report.coverage === 'Complete' ? 'success' : 'warning'}>
                  {report.coverage}
                </Badge>
              ),
              action: <Button variant="ghost">Mở</Button>,
            }))}
          />
        </Panel>

        <Panel
          description="Export lớn chạy nền bằng worker/checkpoint, không giữ ScriptLock và không cạnh tranh POS fast path."
          title="Export runs"
        >
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>EXP-260727-0012 · Sales daily</strong>
                <small>Scope Branch hiện tại · link download hết hạn và kiểm quyền khi tải.</small>
              </span>
              <Badge tone="info">Running</Badge>
            </div>
            <div className="cn-mini-row">
              <span>
                <strong>Cột sensitive bị loại</strong>
                <small>COGS/lợi nhuận chỉ xuất khi backend xác thực permission.</small>
              </span>
              <Badge tone="warning">Restricted</Badge>
            </div>
          </div>
        </Panel>
      </div>

      <div className="cn-sales-grid">
        <Panel
          description="User, Role, UserScope và cấu hình tenant future-effective; thay đổi quyền làm revoke session theo authVersion."
          title="Administration"
        >
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>Admin Local</strong>
                <small>Không dùng Google identity khi đăng nhập; role/scope do backend cấp.</small>
              </span>
              <Badge tone="success">Owner</Badge>
            </div>
            <div className="cn-mini-row">
              <span>
                <strong>Cấu hình chi nhánh/kho</strong>
                <small>Không xóa cứng entity đã có chứng từ; dùng lifecycle và blocker.</small>
              </span>
              <Badge tone="info">Future-effective</Badge>
            </div>
          </div>
        </Panel>

        <Panel
          description="Import Center và attachment dùng private Drive metadata; không trả public URL."
          title="Import & attachments"
        >
          <StateBlock
            actionLabel="Tải template"
            description="Import phải qua staging/validation/confirmation; worker retry không tạo duplicate."
            onAction={() => undefined}
            title="Staging validation trước khi ghi"
            tone="info"
          />
        </Panel>

        <Panel
          description="Operations health không lộ session token, password hoặc secret trong payload/export/error."
          title="Operations health"
        >
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>Không lưu audit riêng</strong>
                <small>Record nghiệp vụ lưu createdBy/updatedBy hoặc người duyệt tương ứng.</small>
              </span>
              <Badge tone="success">Baseline</Badge>
            </div>
          </div>
        </Panel>
      </div>

      <div className="cn-sales-grid">
        <Panel
          description="Backup/restore theo replacement-resource; Owner xác nhận switch, không overwrite trực tiếp production."
          title="Backup / Restore"
        >
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>Daily backup manifest</strong>
                <small>Partitions, resources, row count, checksum và retention 30 bản.</small>
              </span>
              <Badge tone="success">Ready</Badge>
            </div>
            <div className="cn-mini-row">
              <span>
                <strong>Restore verification</strong>
                <small>Freeze write → verify resource thay thế → Owner switch → revoke sessions → health check.</small>
              </span>
              <Badge tone="warning">Needs Owner</Badge>
            </div>
          </div>
        </Panel>

        <Panel
          description="Quota, capacity, partition lifecycle và trạng thái worker dùng cho vận hành lâu dài trên Google Workspace khách."
          title="Health & capacity"
        >
          <StateBlock
            description="Archive coverage partial phải hiển thị rõ dữ liệu một phần; không trình bày như báo cáo đầy đủ."
            title="Archive coverage cần chú ý"
            tone="warning"
          />
        </Panel>

        <Panel
          className="cn-state-lab"
          description="Các state bắt buộc theo handoff Reporting/Administration/Operations."
          title="State lab"
        >
          <div className="cn-state-grid">
            <StateBlock
              description="Giữ layout ổn định trong lúc query/export/import tải dữ liệu."
              title="Loading"
              tone="info"
            />
            <StateBlock
              description="Không có row hợp lệ trong scope/date đang xem."
              title="Empty"
              tone="neutral"
            />
            <StateBlock
              description="Có thể retry; không suy diễn thành offline write/sync."
              title="Error / stale retry"
              tone="danger"
            />
            <StateBlock
              description="Sensitive fields bị backend loại bỏ, không che bằng UI."
              title="Restricted"
              tone="restricted"
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
