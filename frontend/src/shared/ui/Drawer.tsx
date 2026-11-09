import { Drawer as AntDrawer, type DrawerProps as AntDrawerProps } from "antd";
import clsx from "clsx";
import type { FC } from "react";

export type DrawerProps = AntDrawerProps;

export const Drawer: FC<DrawerProps> = ({ className, ...props }: DrawerProps) => (
  <AntDrawer className={clsx(className)} {...props} />
);
