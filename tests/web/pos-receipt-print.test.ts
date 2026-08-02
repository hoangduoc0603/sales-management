import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReceiptSnapshotDTO } from '@shared/contracts/sales/sales';
import { printReceiptSnapshot } from '../../web/src/features/pos/pos-receipt-print';

const receipt: ReceiptSnapshotDTO = {
  receiptId: 'receipt-1',
  saleOrderId: 'sale-order-1',
  businessNumber: 'SO-260802-0001',
  receiptFormat: 'K80',
  createdAt: '2026-08-02T09:30:00.000Z',
  branchId: 'branch-default',
  warehouseId: 'warehouse-default',
  cashierId: 'user-admin',
  customerId: 'customer-1',
  lines: [
    {
      lineId: 'line-1',
      saleOrderLineId: 'sale-line-1',
      variantId: 'variant-1',
      unitVersionId: 'unit-v1',
      sku: 'SKU-<unsafe>',
      displayName: 'Sữa hạt <script>alert(1)</script>',
      quantity: 2,
      quantityMilli: 2_000,
      unitName: 'chai',
      unitPriceVnd: 42_000,
      lineDiscountVnd: 0,
      lineSubtotalVnd: 84_000,
      lineTotalVnd: 84_000,
    },
  ],
  totals: {
    subtotalVnd: 84_000,
    discountVnd: 0,
    taxVnd: 0,
    shippingFeeVnd: 0,
    totalVnd: 84_000,
    paidVnd: 100_000,
    receivableVnd: 0,
    changeVnd: 16_000,
  },
};

describe('printReceiptSnapshot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders receipt into popup DOM and prints without document.write', () => {
    const popup = createFakePopup();
    const open = vi.fn(() => popup);
    vi.stubGlobal('window', { open });

    const printed = printReceiptSnapshot(receipt, {
      branchName: 'Chi nhánh <Nguyễn Trãi>',
      cashierName: 'Admin <Local>',
    });

    expect(printed).toBe(true);
    expect(open).toHaveBeenCalledWith('', '_blank', 'width=420,height=720');
    expect(popup.document.write).not.toHaveBeenCalled();
    expect(popup.document.open).not.toHaveBeenCalled();
    expect(popup.document.close).not.toHaveBeenCalled();
    expect(popup.focus).toHaveBeenCalledOnce();
    expect(popup.print).toHaveBeenCalledOnce();
    expect(popup.document.title).toBe('SO-260802-0001');
    expect(popup.document.body.text()).toContain('Phiếu bán hàng');
    expect(popup.document.body.text()).toContain('Chi nhánh <Nguyễn Trãi>');
    expect(popup.document.body.text()).toContain('Admin <Local>');
    expect(popup.document.body.text()).toContain('Sữa hạt <script>alert(1)</script>');
    expect(popup.document.body.text()).toContain('SKU-<unsafe>');
    expect(popup.document.body.text()).toContain('84.000 đ');
    expect(popup.document.body.text()).toContain('Tiền thừa');
    expect(popup.document.body.text()).toContain('16.000 đ');
    expect(popup.document.body.findByClassName('receipt-k80')).toBeDefined();
    expect(popup.document.head.text()).toContain('@media print');
  });

  it('uses A4 layout class when receipt snapshot requests A4', () => {
    const popup = createFakePopup();
    vi.stubGlobal('window', { open: vi.fn(() => popup) });

    const printed = printReceiptSnapshot({ ...receipt, receiptFormat: 'A4' });

    expect(printed).toBe(true);
    expect(popup.document.body.findByClassName('receipt-a4')).toBeDefined();
    expect(popup.document.body.text()).toContain('Mẫu A4');
  });

  it('returns false when popup is blocked', () => {
    vi.stubGlobal('window', { open: vi.fn(() => null) });

    expect(printReceiptSnapshot(receipt)).toBe(false);
  });
});

function createFakePopup() {
  return {
    document: new FakeDocument(),
    focus: vi.fn(),
    print: vi.fn(),
  };
}

class FakeDocument {
  title = '';
  readonly head = new FakeElement('head');
  readonly body = new FakeElement('body');
  readonly open = vi.fn();
  readonly close = vi.fn();
  readonly write = vi.fn();

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName);
  }

  createTextNode(text: string): FakeText {
    return new FakeText(text);
  }
}

class FakeText {
  constructor(readonly textContent: string) {}

  text(): string {
    return this.textContent;
  }
}

class FakeElement {
  className = '';
  textContent = '';
  readonly attributes = new Map<string, string>();
  readonly children: Array<FakeElement | FakeText> = [];

  constructor(readonly tagName: string) {}

  append(...nodes: Array<FakeElement | FakeText>): void {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: Array<FakeElement | FakeText>): void {
    this.children.length = 0;
    this.children.push(...nodes);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  text(): string {
    return `${this.textContent}${this.children.map((child) => child.text()).join('')}`;
  }

  findByClassName(className: string): FakeElement | undefined {
    if (this.className.split(/\s+/).includes(className)) return this;
    for (const child of this.children) {
      if (child instanceof FakeText) continue;
      const found = child.findByClassName(className);
      if (found !== undefined) return found;
    }
    return undefined;
  }
}
