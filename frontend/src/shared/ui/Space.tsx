import { Space as AntSpace, type SpaceProps as AntSpaceProps } from 'antd';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Space (thừa hưởng từ Ant Design SpaceProps).
 */
export type SpaceProps = AntSpaceProps;

type CompoundedSpace = FC<SpaceProps> & { Compact: typeof AntSpace.Compact };

/**
 * Khoảng cách giữa các phần tử (Space):
 * Dùng để dàn hàng ngang hoặc dọc và tạo khoảng cách đều đặn giữa các button, input hoặc component con.
 * Hỗ trợ `Space.Compact` để gom liền kề các input/button thành một cụm thống nhất.
 */
export const Space: CompoundedSpace = Object.assign(
  (({ className, ...props }: SpaceProps) => (
    <AntSpace className={clsx(className)} {...props} />
  )) as FC<SpaceProps>,
  { Compact: AntSpace.Compact },
);
