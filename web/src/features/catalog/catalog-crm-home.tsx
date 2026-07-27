import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Panel } from '../../components/ui/panel';
import { StateBlock } from '../../components/ui/state-block';
import { Table } from '../../components/ui/table';
import type { AppRoute } from '../../app/app-shell/app-shell';

export interface CatalogCrmHomeProps {
  route: Extract<AppRoute, 'catalog' | 'customers'>;
}

const productRows = [
  {
    sku: 'SH-OC-1L',
    name: 'Sữa hạt óc chó 1L',
    unit: 'chai',
    status: <Badge tone="success">Active</Badge>,
  },
  {
    sku: 'NG-SH-3600',
    name: 'Nước giặt sinh học hương hoa 3,6kg',
    unit: 'túi',
    status: <Badge tone="success">Active</Badge>,
  },
];

export function CatalogCrmHome({ route }: CatalogCrmHomeProps) {
  const isCustomerRoute = route === 'customers';

  return (
    <div className="cn-catalog-shell">
      <header className="cn-dashboard-head">
        <div>
          <p className="cn-breadcrumb">Catalog / CRM / Commercial</p>
          <h1>{isCustomerRoute ? 'Khách hàng & loyalty' : 'Catalog, CRM & Commercial'}</h1>
          <p>
            Product/Variant, khách hàng, bảng giá, promotion, import và state recovery theo
            artifact Approved.
          </p>
        </div>
        <div className="cn-dashboard-actions">
          <Badge tone="success">Approved design</Badge>
          <Button variant="primary">{isCustomerRoute ? 'Tạo khách hàng' : 'Tạo sản phẩm'}</Button>
        </div>
      </header>

      <div className="cn-catalog-grid">
        <Panel
          description="Variant là transaction unit; SKU/barcode unique không phân biệt hoa thường."
          title="Product / Variant"
        >
          <Table
            columns={[
              { key: 'sku', header: 'SKU' },
              { key: 'name', header: 'Tên hàng' },
              { key: 'unit', header: 'Đơn vị' },
              { key: 'status', header: 'Trạng thái' },
            ]}
            emptyMessage="Chưa có sản phẩm phù hợp."
            getRowKey={(row) => String(row.sku)}
            rows={productRows}
          />
        </Panel>

        <Panel
          description="Không hiển thị cost/supplier/credit nhạy cảm nếu backend không cấp quyền."
          title="Customer 360"
        >
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>Trần Thị Hồng Nhung</strong>
                <small>0909 482 176 · Bán lẻ thân thiết</small>
              </span>
              <Badge tone="warning">Duplicate warning</Badge>
            </div>
            <div className="cn-mini-row">
              <span>
                <strong>Point ledger</strong>
                <small>Ledger điểm bất biến; return tạo reversal theo đơn gốc.</small>
              </span>
              <Badge tone="info">Restricted-safe</Badge>
            </div>
          </div>
        </Panel>
      </div>

      <div className="cn-catalog-grid">
        <Panel
          description="Publish guard chặn effective range conflict; quote dùng một promotion tự động tốt nhất."
          title="Price lists & promotions"
        >
          <div className="cn-mini-list">
            <div className="cn-mini-row">
              <span>
                <strong>Retail Hà Nội v6</strong>
                <small>Branch price → customer group price → best promotion.</small>
              </span>
              <Badge tone="success">Published</Badge>
            </div>
            <div className="cn-mini-row">
              <span>
                <strong>OAT10 · promotion tự động</strong>
                <small>Usage/budget chỉ xác thực khi checkout commit.</small>
              </span>
              <Badge tone="warning">Policy guard</Badge>
            </div>
          </div>
        </Panel>

        <Panel
          description="Template → private upload/staging → validation → confirmation → audit."
          title="Catalog import"
        >
          <StateBlock
            actionLabel="Tải template"
            description="Import hợp lệ không tạo một phần âm thầm; user chọn ValidRowsOnly hoặc AllOrNothing."
            onAction={() => undefined}
            title="Staging validation trước khi ghi"
            tone="info"
          />
        </Panel>
      </div>
    </div>
  );
}
