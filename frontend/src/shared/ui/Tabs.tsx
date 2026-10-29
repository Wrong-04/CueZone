import {
  Tabs as AntTabs,
  type TabPaneProps as AntTabPaneProps,
  type TabsProps as AntTabsProps,
} from "antd";
import clsx from "clsx";
import type { FC } from "react";

export type TabsProps = AntTabsProps;

export type TabPaneProps = AntTabPaneProps;

export const Tabs: FC<TabsProps> = ({ className, ...props }) => (
  <AntTabs className={clsx(className)} {...props} />
);
