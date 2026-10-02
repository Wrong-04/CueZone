import { Alert as AntAlert, type AlertProps as AntAlertProps } from 'antd';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Alert (thừa hưởng từ Ant Design AlertProps).
 */
export type AlertProps = AntAlertProps;

/**
 * Hộp thông báo / cảnh báo (Alert):
 * Dùng để hiển thị các thông điệp quan trọng tới người dùng (thành công, lỗi, cảnh báo, thông tin).
 */
export const Alert: FC<AlertProps> = ({ className, ...props }) => (
  <AntAlert className={clsx(className)} {...props} />
);
