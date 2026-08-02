import type { ReceiptSnapshotDTO } from '@shared/contracts/sales/sales';

export interface ReceiptPrintContext {
  branchName?: string;
  warehouseName?: string;
  cashierName?: string;
}

export function printReceiptSnapshot(receipt: ReceiptSnapshotDTO, context: ReceiptPrintContext = {}): boolean {
  if (typeof window === 'undefined' || typeof window.open !== 'function') {
    return false;
  }

  const printWindow = window.open('', '_blank', 'width=420,height=720');
  if (printWindow === null) {
    return false;
  }

  renderReceiptPrintDocument(printWindow.document, receipt, context);
  printWindow.focus();
  printWindow.print();
  return true;
}

function renderReceiptPrintDocument(
  document: Document,
  receipt: ReceiptSnapshotDTO,
  context: ReceiptPrintContext = {},
): void {
  const branchName = context.branchName ?? receipt.branchId;
  const warehouseName = context.warehouseName ?? receipt.warehouseId;
  const cashierName = context.cashierName ?? receipt.cashierId;
  const receiptClass = receipt.receiptFormat === 'A4' ? 'receipt receipt-a4' : 'receipt receipt-k80';

  document.title = receipt.businessNumber;
  document.head.replaceChildren(element(document, 'meta', { charset: 'utf-8' }), viewportMeta(document), receiptStyle(document));

  const main = element(document, 'main', { className: receiptClass });
  const header = element(document, 'header');
  header.append(
    element(document, 'h1', { text: 'Phiếu bán hàng' }),
    paragraph(document, receipt.businessNumber, { strong: true }),
    paragraph(document, `Mẫu ${receipt.receiptFormat} · ${formatDateTime(receipt.createdAt)}`),
    paragraph(document, `${branchName} · ${warehouseName}`),
    paragraph(document, `Người bán: ${cashierName}`),
  );

  main.append(header, receiptLinesTable(document, receipt), receiptTotalsSection(document, receipt));
  main.append(element(document, 'p', { className: 'note', text: 'In lại từ receipt snapshot; thao tác in không tạo ledger mới.' }));
  document.body.replaceChildren(main);
}

function viewportMeta(document: Document): HTMLMetaElement {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1';
  return meta;
}

function receiptStyle(document: Document): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      color: #111827;
      font-family: Arial, sans-serif;
      font-size: 13px;
    }
    body {
      background: #f8fafc;
      margin: 0;
      padding: 16px;
    }
    .receipt {
      background: #fff;
      border: 1px solid #e5e7eb;
      box-sizing: border-box;
      margin: 0 auto;
      padding: 16px;
    }
    .receipt-k80 {
      max-width: 320px;
    }
    .receipt-a4 {
      max-width: 794px;
      min-height: 1123px;
      padding: 32px;
    }
    header {
      border-bottom: 1px dashed #cbd5e1;
      margin-bottom: 12px;
      padding-bottom: 12px;
      text-align: center;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 4px;
    }
    p {
      margin: 4px 0;
    }
    table {
      border-collapse: collapse;
      margin-top: 12px;
      width: 100%;
    }
    th,
    td {
      border-bottom: 1px solid #e5e7eb;
      padding: 8px 0;
      text-align: left;
      vertical-align: top;
    }
    th.num,
    td.num {
      text-align: right;
      white-space: nowrap;
    }
    small {
      color: #64748b;
      display: block;
      margin-top: 2px;
    }
    .totals {
      margin-top: 12px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0;
    }
    .grand-total {
      border-top: 1px solid #111827;
      font-size: 16px;
      font-weight: 700;
      margin-top: 6px;
      padding-top: 8px;
    }
    .note {
      border-top: 1px dashed #cbd5e1;
      color: #64748b;
      margin-top: 12px;
      padding-top: 12px;
      text-align: center;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .receipt {
        border: 0;
        box-shadow: none;
        margin: 0;
      }
      .receipt-k80 {
        max-width: 80mm;
        width: 80mm;
      }
      .receipt-a4 {
        max-width: none;
        width: 210mm;
      }
    }
  `;
  return style;
}

function receiptLinesTable(document: Document, receipt: ReceiptSnapshotDTO): HTMLTableElement {
  const table = element(document, 'table');
  table.setAttribute('aria-label', 'Dòng hàng');

  const thead = element(document, 'thead');
  const headRow = element(document, 'tr');
  headRow.append(
    element(document, 'th', { text: 'Hàng hóa' }),
    element(document, 'th', { className: 'num', text: 'Đơn giá' }),
    element(document, 'th', { className: 'num', text: 'Thành tiền' }),
  );
  thead.append(headRow);

  const tbody = element(document, 'tbody');
  for (const line of receipt.lines) {
    const row = element(document, 'tr');
    const itemCell = element(document, 'td');
    itemCell.append(
      element(document, 'strong', { text: line.displayName }),
      element(document, 'small', {
        text: `${line.sku ?? line.variantId} · ${formatQuantity(line.quantityMilli)} ${line.unitName}`,
      }),
    );
    row.append(
      itemCell,
      element(document, 'td', { className: 'num', text: formatVnd(line.unitPriceVnd) }),
      element(document, 'td', { className: 'num', text: formatVnd(line.lineTotalVnd) }),
    );
    tbody.append(row);
  }

  table.append(thead, tbody);
  return table;
}

function receiptTotalsSection(document: Document, receipt: ReceiptSnapshotDTO): HTMLElement {
  const section = element(document, 'section', { className: 'totals' });
  section.setAttribute('aria-label', 'Tổng kết thanh toán');
  section.append(
    totalRowElement(document, 'Tạm tính', receipt.totals.subtotalVnd),
    totalRowElement(document, 'Giảm giá', receipt.totals.discountVnd),
    totalRowElement(document, 'VAT', receipt.totals.taxVnd),
    totalRowElement(document, 'Phí giao hàng', receipt.totals.shippingFeeVnd),
    totalRowElement(document, 'Đã thu', receipt.totals.paidVnd),
  );
  if (receipt.totals.changeVnd > 0) {
    section.append(totalRowElement(document, 'Tiền thừa', receipt.totals.changeVnd));
  }
  if (receipt.totals.receivableVnd > 0) {
    section.append(totalRowElement(document, 'Còn phải thu', receipt.totals.receivableVnd));
  }

  const grandTotal = element(document, 'div', { className: 'total-row grand-total' });
  grandTotal.append(element(document, 'span', { text: 'Tổng thanh toán' }), element(document, 'strong', { text: formatVnd(receipt.totals.totalVnd) }));
  section.append(grandTotal);
  return section;
}

function totalRowElement(document: Document, label: string, amountVnd: number): HTMLDivElement {
  const row = element(document, 'div', { className: 'total-row' });
  row.append(element(document, 'span', { text: label }), element(document, 'strong', { text: formatVnd(amountVnd) }));
  return row;
}

function paragraph(document: Document, text: string, options: { strong?: boolean } = {}): HTMLParagraphElement {
  const p = element(document, 'p');
  p.append(options.strong === true ? element(document, 'strong', { text }) : document.createTextNode(text));
  return p;
}

function element<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tagName: K,
  options: { className?: string; text?: string; charset?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tagName);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.charset !== undefined) node.setAttribute('charset', options.charset);
  return node;
}

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function formatQuantity(quantityMilli: number): string {
  const quantity = quantityMilli / 1000;
  return Number.isInteger(quantity) ? String(quantity) : quantity.toLocaleString('vi-VN');
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}
