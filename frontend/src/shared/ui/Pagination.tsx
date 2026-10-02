import { Pagination as AntPagination, type PaginationProps as AntPaginationProps } from 'antd';
import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

/**
 * Props của component Pagination.
 * Mặc định hỗ trợ hiển thị tổng số bản ghi dưới dạng text tiếng Việt: "Hiển thị x-y trên z bản ghi".
 */
export interface PaginationProps extends Omit<AntPaginationProps, 'showTotal'> {
  showTotal?: boolean | ((total: number, range: [number, number]) => ReactNode);
}

const defaultShowTotal = (total: number, range: [number, number]) =>
  `Hiển thị ${range[0]}-${range[1]} trên ${total} bản ghi`;

/**
 * Phân trang danh sách (Pagination):
 * Điều hướng trang, chọn số lượng bản ghi hiển thị trên mỗi trang (10, 20, 50, 100), căn lề phải theo chuẩn giao diện.
 */
export const Pagination: FC<PaginationProps> = ({
  className,
  size = 'small',
  showSizeChanger = true,
  pageSizeOptions = ['10', '20', '50', '100'],
  showTotal = true,
  ...props
}) => {
  const resolvedShowTotal =
    typeof showTotal === 'function' ? showTotal : showTotal === true ? defaultShowTotal : undefined;

  return (
    <AntPagination
      size={size}
      showSizeChanger={showSizeChanger}
      pageSizeOptions={pageSizeOptions}
      showTotal={resolvedShowTotal}
      className={clsx('flex items-center justify-end text-[13px]', className)}
      {...props}
    />
  );
};
