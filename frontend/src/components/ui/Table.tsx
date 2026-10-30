import type { ReactNode } from 'react';

export type TableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  className?: string;
};

type TableProps<Row> = {
  columns: TableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  rowClassName?: string;
  onRowClick?: (row: Row) => void;
  showHeader?: boolean;
};

export default function Table<Row>({ columns, rows, getRowKey, rowClassName = '', onRowClick, showHeader = true }: TableProps<Row>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse text-left text-sm">
        {showHeader && <thead className="sticky top-0 z-10 bg-surface text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>{columns.map((column) => <th key={column.key} className={`h-11 whitespace-nowrap px-5 ${column.className ?? ''}`}>{column.header}</th>)}</tr>
        </thead>}
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={getRowKey(row)} onClick={() => onRowClick?.(row)} className={`min-h-[62px] transition hover:bg-primary-tint/40 ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName}`}>
              {columns.map((column) => <td key={column.key} className={`px-5 py-4 text-text ${column.className ?? ''}`}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}