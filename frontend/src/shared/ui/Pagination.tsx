import { Pagination as AntPagination, type PaginationProps as AntPaginationProps } from "antd";
import clsx from "clsx";
import type { FC, ReactNode } from "react";

export interface PaginationProps extends Omit<AntPaginationProps, "showTotal"> {
  showTotal?: boolean | ((total: number, range: [number, number]) => ReactNode);
}

const defaultShowTotal = (total: number, range: [number, number]) =>
  `Hiển thị ${range[0]}-${range[1]} trên ${total} bản ghi`;

export const Pagination: FC<PaginationProps> = ({
  className,
  size = "small",
  showSizeChanger = true,
  pageSizeOptions = ["10", "20", "50", "100"],
  showTotal = true,
  ...props
}) => {
  const resolvedShowTotal =
    typeof showTotal === "function" ? showTotal : showTotal === true ? defaultShowTotal : undefined;

  return (
    <AntPagination
      size={size}
      showSizeChanger={showSizeChanger}
      pageSizeOptions={pageSizeOptions}
      showTotal={resolvedShowTotal}
      className={clsx("flex items-center justify-end text-[13px]", className)}
      {...props}
    />
  );
};
