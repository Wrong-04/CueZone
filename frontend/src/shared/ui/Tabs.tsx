import {
  Tabs as AntTabs,
  type TabPaneProps as AntTabPaneProps,
  type TabsProps as AntTabsProps,
} from 'antd';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Tabs (thừa hưởng từ Ant Design TabsProps).
 */
export type TabsProps = AntTabsProps;

/**
 * Props của từng tab con (TabPaneProps).
 */
export type TabPaneProps = AntTabPaneProps;

/**
 * Thanh chuyển đổi Tab (Tabs):
 * Cho phép chuyển đổi linh hoạt giữa các màn hình, nhóm nội dung hoặc danh mục khác nhau trên cùng một trang.
 */
export const Tabs: FC<TabsProps> = ({ className, ...props }) => (
  <AntTabs className={clsx(className)} {...props} />
);
