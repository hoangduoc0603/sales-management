import type { ReactNode } from 'react';

export interface TableColumn<TRow extends Record<string, ReactNode>> {
  key: keyof TRow & string;
  header: ReactNode;
  align?: 'left' | 'right';
}

export interface TableProps<TRow extends Record<string, ReactNode>> {
  columns: readonly TableColumn<TRow>[];
  rows: readonly TRow[];
  emptyMessage: string;
  getRowKey?(row: TRow, index: number): string;
}

export function Table<TRow extends Record<string, ReactNode>>({
  columns,
  emptyMessage,
  getRowKey,
  rows,
}: TableProps<TRow>) {
  return (
    <div className="cn-table-wrap">
      <table className="cn-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.align === 'right' ? 'right' : undefined} key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}>
                {columns.map((column) => (
                  <td className={column.align === 'right' ? 'right' : undefined} key={column.key}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="cn-table-empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
