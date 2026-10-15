import { Breadcrumb as AntBreadcrumb, type BreadcrumbProps as AntBreadcrumbProps } from 'antd';
import type { ItemType } from 'antd/es/breadcrumb/Breadcrumb';
import clsx from 'clsx';
import type { FC } from 'react';

/** Props của Breadcrumb. */
export type BreadcrumbProps = AntBreadcrumbProps;
export type BreadcrumbItem = ItemType;

/**
 * Điều hướng phân cấp (Breadcrumb):
 * Hiển thị đường dẫn vị trí hiện tại trong hệ thống phân cấp trang web,
 * cho phép người dùng quay lại các cấp trước đó dễ dàng.
 */
export const Breadcrumb: FC<BreadcrumbProps> = ({ className, ...props }) => {
  return <AntBreadcrumb className={clsx('text-[13.5px]', className)} {...props} />;
};
