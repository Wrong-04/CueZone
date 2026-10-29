import {
  Table as AntTable,
  type TableProps as AntTableProps,
  type TableColumnsType as AntTableColumnsType,
} from "antd";
import clsx from "clsx";

export type ColumnsType<T = unknown> = AntTableColumnsType<T>;

export type TableColumnsType<T = unknown> = AntTableColumnsType<T>;

export type TableProps<T = unknown> = AntTableProps<T>;

function InternalTable<T extends object = Record<string, unknown>>({
  className,
  size = "small",
  bordered = true,
  ...props
}: TableProps<T>) {
  return (
    <AntTable<T> size={size} bordered={bordered} className={clsx("w-full", className)} {...props} />
  );
}

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
