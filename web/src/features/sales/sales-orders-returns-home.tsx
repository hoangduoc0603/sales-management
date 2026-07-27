import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Listbox } from '../../components/ui/listbox';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import { Table } from '../../components/ui/table';

export interface SalesOrdersReturnsHomeProps {
  scope: CurrentScopeResponse;
  selectedBranchId: string;
  selectedWarehouseId: string;
}

const orderRows = [
  {
    key: 'SO-260726-01842',
    code: 'SO-260726-01842',
    source: 'Tin nhắn khách hàng',
    customer: 'Trần Thị Hồng Nhung',
    age: '18 phút',
    status: 'Confirmed',
    valueVnd: 2_680_000,
  },
  {
    key: 'SO-260726-01837',
    code: 'SO-260726-01837',
    source: 'Khách đặt trước',
    customer: 'Công ty CP Văn phòng Phương Nam',
    age: '31 phút',
    status: 'Packing',
    valueVnd: 18_450_000,
  },
  {
    key: 'SO-260726-01815',
    code: 'SO-260726-01815',
    source: 'Nhân viên tạo',
    customer: 'Nguyễn Minh Tâm',
    age: '46 phút',
    status: 'Draft',
    valueVnd: 1_249_000,
  },
];

export function SalesOrdersReturnsHome({
  scope,
  selectedBranchId,
  selectedWarehouseId,
}: SalesOrdersReturnsHomeProps) {
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('active');
  const branch = scope.branches.find((item) => item.branchId === selectedBranchId);
  const warehouse = scope.warehouses.find((item) => item.warehouseId === selectedWarehouseId);

  return (
    <div className="cn-sales-shell">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">Sales / Đơn bán / Trả hàng</p>
          <h1>Đơn bán & hậu mãi</h1>
          <p>
            Quản lý chứng từ bán, đơn nhập tay, trả/đổi hàng và bảo hành theo scope{' '}
            {branch?.name ?? selectedBranchId} · {warehouse?.name ?? selectedWarehouseId}.
          </p>
        </div>
        <div className="cn-dashboard-actions">
          <Badge tone="success">Artifact Approved</Badge>
          <Button variant="secondary">Làm mới</Button>
          <Button variant="primary">Tạo đơn nhập tay</Button>
        </div>
      </header>

      <div className="cn-filter-bar" aria-label="Bộ lọc đơn bán">
        <Listbox
          label="Nguồn đơn"
          onChange={setSource}
          options={[
            { value: 'all', label: 'Tất cả nguồn' },
            { value: 'pos', label: 'POS tại quầy' },
            { value: 'manual', label: 'Đơn nhập tay' },
          ]}
          value={source}
        />
        <Listbox
          label="Trạng thái đơn"
          onChange={setStatus}
          options={[
            { value: 'active', label: 'Đang xử lý' },
            { value: 'completed', label: 'Completed / Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          value={status}
        />
        <div className="cn-search-box" role="search">
          <span>Tìm mã đơn, khách hàng hoặc SĐT</span>
        </div>
      </div>

      <div className="cn-kpi-grid">
        <SalesMetric label="Đơn online cần xử lý" value="17" caption="Mục tiêu xác nhận trong 15 phút" tone="warning" />
        <SalesMetric label="Đơn đã xuất giao" value="42" caption="Delivered không ghi ledger lần hai" tone="success" />
        <SalesMetric label="Phiếu trả chờ kiểm" value="6" caption="Quarantine trước khi Restock/Scrap" tone="info" />
        <SalesMetric label="Ca bảo hành mở" value="3" caption="Theo serial và đơn gốc" tone="neutral" />
      </div>

      <div className="cn-sales-grid">
        <Panel
          action={<Button variant="secondary">Mở hàng đợi</Button>}
          description="Chỉ gồm đơn hợp lệ đang chờ thao tác; không gồm Draft bị hủy hoặc chứng từ ngoài scope."
          title="Đơn online cần xử lý"
        >
          <Table
            columns={[
              { key: 'order', header: 'Đơn / nguồn' },
              { key: 'customer', header: 'Khách hàng' },
              { key: 'age', header: 'Tuổi đơn' },
              { key: 'status', header: 'Trạng thái' },
              { key: 'value', header: 'Giá trị', align: 'right' },
              { key: 'action', header: '' },
            ]}
            emptyMessage="Không có đơn phù hợp."
            getRowKey={(row) => String(row.key)}
            rows={orderRows.map((order) => ({
              key: order.key,
              order: (
                <span>
                  <strong>{order.code}</strong>
                  <small>{order.source}</small>
                </span>
              ),
              customer: (
                <span>
                  <strong>{order.customer}</strong>
                  <small>ManualOnline · {order.source}</small>
                </span>
              ),
              age: order.age,
              status: <OrderStatusBadge status={order.status} />,
              value: <span className="num">{formatVnd(order.valueVnd)}</span>,
              action: <Button variant="ghost">Xử lý</Button>,
            }))}
          />
        </Panel>

        <Panel
          description="Chi tiết chứng từ bất biến; mọi sửa sai đi qua return/reversal/adjustment."
          title="Detail chứng từ"
        >
          <div className="cn-document-detail">
            <div>
              <span>Mã đơn</span>
              <strong>SO-260726-01842</strong>
            </div>
            <div>
              <span>Lifecycle</span>
              <strong>Draft → Confirmed → Packing → Shipped → Delivered</strong>
            </div>
            <div>
              <span>Khách / nhận hàng</span>
              <strong>Trần Thị Hồng Nhung · 0909 482 176</strong>
            </div>
            <div>
              <span>Reservation</span>
              <strong>Đã giữ 2 dòng tại Kho mặc định</strong>
            </div>
          </div>
          <div className="cn-action-row">
            <Button variant="secondary">Xác nhận giữ hàng</Button>
            <Button variant="secondary">Bắt đầu soạn hàng</Button>
            <Button variant="primary">Xuất giao</Button>
            <Button variant="ghost">Hủy trước Shipped</Button>
          </div>
        </Panel>
      </div>

      <div className="cn-sales-grid">
        <Panel
          description="Return tham chiếu source order dùng snapshot giá/thuế/cost gốc; hàng vào Quarantine trước khi quyết định."
          title="Trả hàng theo đơn gốc"
        >
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>RT-260727-0007 · SO-260726-01842</strong>
                <small>1 chai Sữa hạt óc chó 1L · lý do hàng lỗi · đang kiểm.</small>
              </span>
              <Badge tone="warning">Quarantine</Badge>
            </div>
            <div className="cn-mini-row">
              <span>
                <strong>Fast return cần quyền riêng</strong>
                <small>Không có đơn gốc phải có approval/audit; UI không tự suy diễn quyền.</small>
              </span>
              <Badge tone="danger">Restricted</Badge>
            </div>
          </div>
          <div className="cn-action-row">
            <Button variant="secondary">Restock</Button>
            <Button variant="secondary">Scrap</Button>
            <Button variant="ghost">KeepQuarantine</Button>
          </div>
        </Panel>

        <Panel
          description="Đổi hàng là Return + SaleOrder mới liên kết hai chiều; phần chênh lệch thu thêm/hoàn/credit xử lý qua Finance."
          title="Đổi hàng & thanh toán chênh lệch"
        >
          <StateBlock
            description="Exchange net settlement cần nối tiếp ledger Finance/CRM ở slice sau; hiện UI giữ vùng nghiệp vụ đúng handoff."
            title="Chờ triển khai exchange sâu"
            tone="info"
          />
        </Panel>

        <Panel
          description="Tra cứu theo serial/IMEI, khách hàng, đơn gốc và attachment metadata."
          title="Bảo hành theo serial"
        >
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>BH-260727-0003 · SERIAL-001</strong>
                <small>SO-260726-01842 · lỗi không lên nguồn · có 1 tệp đính kèm.</small>
              </span>
              <Badge tone="info">Open</Badge>
            </div>
          </div>
        </Panel>

        <Panel
          description="COGS/lợi nhuận, cost detail và dữ liệu nhạy cảm phải bị loại từ backend khi thiếu quyền."
          title="Dữ liệu nhạy cảm bị hạn chế"
        >
          <StateBlock
            description="Không che số bằng UI. API phải trả permission-restricted state thay vì gửi giá vốn/lợi nhuận."
            title="Không có quyền xem cost/profit"
            tone="restricted"
          />
        </Panel>
      </div>
    </div>
  );
}

function SalesMetric({
  caption,
  label,
  tone,
  value,
}: {
  caption: string;
  label: string;
  tone: 'success' | 'warning' | 'info' | 'neutral';
  value: string;
}) {
  return (
    <article className="cn-metric-card">
      <span>{label}</span>
      <strong className="num">{value}</strong>
      <Badge tone={tone}>{caption}</Badge>
    </article>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const tone = status === 'Draft' ? 'warning' : status === 'Packing' ? 'info' : 'success';
  return <Badge tone={tone}>{status}</Badge>;
}

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}
