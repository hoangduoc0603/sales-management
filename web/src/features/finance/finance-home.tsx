import type { FinanceSummaryResponse } from '@shared/contracts/finance/finance';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import { Table } from '../../components/ui/table';

export interface FinanceHomeProps {
  summary?: FinanceSummaryResponse;
}

const defaultSummary: FinanceSummaryResponse = {
  generatedAt: '2026-07-27T09:00:00.000Z',
  openShiftCount: 1,
  cashInVnd: 9_420_000,
  cashOutVnd: 760_000,
  receivableOpenVnd: 2_160_000,
  payableOpenVnd: 0,
};

export function FinanceHome({ summary = defaultSummary }: FinanceHomeProps) {
  return (
    <div className="cn-finance-shell">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">Finance / Cash / Shifts</p>
          <h1>Tài chính & ca thu ngân</h1>
          <p>
            Payment, CashTransaction, Allocation và công nợ là evidence bất biến; số dư chỉ đọc từ projection backend.
          </p>
        </div>
        <div className="cn-dashboard-actions">
          <Badge tone="success">Snapshot {formatDateTime(summary.generatedAt)}</Badge>
          <Button variant="secondary">Làm mới</Button>
          <Button variant="primary">Tạo phiếu thu / chi</Button>
        </div>
      </header>

      <div className="cn-kpi-grid">
        <FinanceMetric label="Thu trong kỳ" value={summary.cashInVnd} tone="success" />
        <FinanceMetric label="Chi / hoàn tiền" value={summary.cashOutVnd} tone="warning" />
        <FinanceMetric label="Phải thu mở" value={summary.receivableOpenVnd} tone="info" />
        <FinanceMetric label="Ca đang mở" value={summary.openShiftCount} suffix=" ca" tone="neutral" />
      </div>

      <div className="cn-finance-grid">
        <Panel
          description="Một payment có thể phân bổ cho nhiều obligation; phần dư tạo credit/prepayment, không tạo nợ âm."
          title="Sổ quỹ & payment"
        >
          <Table
            columns={[
              { key: 'code', header: 'Chứng từ' },
              { key: 'party', header: 'Đối tượng' },
              { key: 'status', header: 'Trạng thái' },
              { key: 'amount', header: 'Giá trị', align: 'right' },
            ]}
            emptyMessage="Chưa có chứng từ phù hợp."
            getRowKey={(row) => String(row.key)}
            rows={[
              {
                key: 'payment-260727-0001',
                code: (
                  <span>
                    <strong>PT-260727-0001</strong>
                    <small>SO-260727-0012</small>
                  </span>
                ),
                party: 'Khách lẻ',
                status: <Badge tone="success">Approved</Badge>,
                amount: <span className="num">{formatVnd(500_000)}</span>,
              },
              {
                key: 'expense-260727-0002',
                code: (
                  <span>
                    <strong>PC-260727-0002</strong>
                    <small>Chi phí vận hành</small>
                  </span>
                ),
                party: 'Nhân viên giao hàng',
                status: <Badge tone="warning">PendingApproval</Badge>,
                amount: <span className="num">{formatVnd(120_000)}</span>,
              },
            ]}
          />
        </Panel>

        <Panel
          description="Số chi tiết chỉ render khi backend xác nhận quyền tài chính phù hợp."
          title="Bị giới hạn theo quyền"
        >
          <StateBlock
            description="Công nợ nhà cung cấp, số dư tài khoản và cost detail không trả về masked value nếu thiếu quyền."
            title="Không có quyền xem số liệu nhạy cảm"
            tone="warning"
          />
        </Panel>

        <Panel
          description="Dùng trong phạm vi chi nhánh đang chọn."
          title="Cash drawer & tài khoản"
        >
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>Quầy 01</strong>
                <small>Cash drawer · đang hoạt động</small>
              </span>
              <Badge tone="success">Active</Badge>
            </div>
            <div className="cn-mini-row">
              <span>
                <strong>Tài khoản thu nội bộ</strong>
                <small>Bank/account · không lưu secret provider.</small>
              </span>
              <Badge tone="success">Active</Badge>
            </div>
          </div>
        </Panel>

        <Panel
          description="Thay đổi trạng thái không làm thay đổi chứng từ đã duyệt."
          title="Phương thức thanh toán"
        >
          <div className="cn-mini-list">
            {['Tiền mặt', 'Thẻ', 'Chuyển khoản thủ công', 'Bán chịu'].map((method) => (
              <div className="cn-mini-row" key={method}>
                <span>
                  <strong>{method}</strong>
                  <small>Ghi nhận theo chứng từ Approved.</small>
                </span>
                <Badge tone="info">Đang dùng</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="cn-finance-grid">
        <Panel
          description="Mở lúc 08:00 · trạng thái giữ theo đúng Branch / CashDrawer / Warehouse."
          title="Ca thu ngân"
        >
          <div className="cn-shift-steps">
            <span className="active">Mở ca</span>
            <span className="active">Đang vận hành</span>
            <span>Đóng & khóa</span>
          </div>
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>Quầy 01 · Admin Local</strong>
                <small>Tiền đầu ca {formatVnd(500_000)} · POS phải có ca Open nếu policy bắt buộc.</small>
              </span>
              <Badge tone="success">Open</Badge>
            </div>
          </div>
        </Panel>

        <Panel
          description="Nhập tiền thực tế, lý do chênh lệch và gửi duyệt trước khi khóa."
          title="Đóng ca & khóa sổ"
        >
          <StateBlock
            description="Sau Locked không mở lại; mọi điều chỉnh dùng chứng từ mới có audit."
            title="Chênh lệch cần giải trình"
            tone="warning"
          />
        </Panel>

        <Panel
          description="Chỉ chứng từ được duyệt mới tạo CashTransaction Expense/Disbursement."
          title="Chi phí vận hành"
        >
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>PC-260727-0011</strong>
                <small>Vật tư đóng gói · cần tệp đính kèm theo policy.</small>
              </span>
              <Badge tone="warning">Chờ duyệt</Badge>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function FinanceMetric({
  label,
  suffix = '',
  tone,
  value,
}: {
  label: string;
  suffix?: string;
  tone: 'success' | 'warning' | 'info' | 'neutral';
  value: number;
}) {
  return (
    <article className="cn-metric-card">
      <span>{label}</span>
      <strong className="num">{suffix ? `${value}${suffix}` : formatVnd(value)}</strong>
      <Badge tone={tone}>{tone === 'warning' ? 'Cần đối soát' : 'Sẵn sàng'}</Badge>
    </article>
  );
}

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  });
}
