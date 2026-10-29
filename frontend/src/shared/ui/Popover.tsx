import { Popover as AntPopover, type PopoverProps as AntPopoverProps } from "antd";
import type { FC } from "react";

export type PopoverProps = AntPopoverProps;

export const Popover: FC<PopoverProps> = (props) => {
  return <AntPopover {...props} />;
};
