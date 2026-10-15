import { Spin as AntSpin, type SpinProps as AntSpinProps } from 'antd';
import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

/**
 * Props của component Spin (thừa hưởng từ Ant Design SpinProps).
 */
export interface SpinProps extends Omit<AntSpinProps, 'tip'> {
  /**
   * @deprecated Vui lòng sử dụng `description` thay thế (theo chuẩn Ant Design v6)
   */
  tip?: ReactNode;
  description?: ReactNode;
}

/**
 * Hiệu ứng đang tải (Spin / Loading Spinner):
 * Dùng để hiển thị trạng thái đang tải dữ liệu cho một vùng nội dung hoặc toàn trang.
 */
export const Spin: FC<SpinProps> = ({ className, tip, description, ...props }) => {
  const resolvedDescription = description ?? tip;
  return <AntSpin className={clsx(className)} description={resolvedDescription} {...props} />;
};
