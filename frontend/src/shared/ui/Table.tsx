import {
  Table as AntTable,
  type TableProps as AntTableProps,
  type TableColumnsType as AntTableColumnsType,
} from 'antd';
import clsx from 'clsx';

/**
 * Kiểu dữ liệu định nghĩa danh sách các cột trong bảng (ColumnsType).
 */
export type ColumnsType<T = unknown> = AntTableColumnsType<T>;

/**
 * Định nghĩa các cột của bảng (TableColumnsType).
 */
export type TableColumnsType<T = unknown> = AntTableColumnsType<T>;

/**
 * Props của component Table.
 */
export type TableProps<T = unknown> = AntTableProps<T>;

function InternalTable<T extends object = Record<string, unknown>>({
  className,
  size = 'small',
  bordered = true,
  ...props
}: TableProps<T>) {
  return (
    <AntTable<T> size={size} bordered={bordered} className={clsx('w-full', className)} {...props} />
  );
}

/**
 * Bảng dữ liệu cơ sở (Table):
 * Bọc Ant Design Table, mặc định kích cỡ 'small', có đường viền (bordered = true) và rộng 100%.
 * Tích hợp sẵn `Table.Summary`, `Table.Column`, `Table.SELECTION_COLUMN`,...
 */
export const Table = Object.assign(InternalTable, {
  Summary: AntTable.Summary,
  Column: AntTable.Column,
  ColumnGroup: AntTable.ColumnGroup,
  EXPAND_COLUMN: AntTable.EXPAND_COLUMN,
  SELECTION_COLUMN: AntTable.SELECTION_COLUMN,
  SELECTION_ALL: AntTable.SELECTION_ALL,
  SELECTION_INVERT: AntTable.SELECTION_INVERT,
  SELECTION_NONE: AntTable.SELECTION_NONE,
});
