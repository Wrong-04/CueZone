import { Result as AntResult, type ResultProps as AntResultProps } from 'antd';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Result (thừa hưởng từ Ant Design ResultProps).
 */
export type ResultProps = AntResultProps;

/**
 * Trang / khối kết quả (Result):
 * Dùng để thông báo kết quả của một tác vụ lớn (thành công, thất bại, lỗi 404, 403, 500) kèm icon minh hoạ và nút điều hướng.
 */
export const Result: FC<ResultProps> = ({ className, ...props }) => (
  <AntResult className={clsx(className)} {...props} />
);
