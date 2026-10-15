import { Popover as AntPopover, type PopoverProps as AntPopoverProps } from 'antd';
import type { FC } from 'react';

/**
 * Props của component Popover (thừa hưởng từ Ant Design PopoverProps).
 */
export type PopoverProps = AntPopoverProps;

/**
 * Hộp thông tin/thao tác nổi bên cạnh một phần tử (Popover):
 * dùng cho panel chọn/lọc mở bằng click, không phải hộp thoại chặn luồng
 * chính (xem `Dialog`/`SideDrawer` cho các trường hợp đó).
 */
export const Popover: FC<PopoverProps> = (props) => {
  return <AntPopover {...props} />;
};
