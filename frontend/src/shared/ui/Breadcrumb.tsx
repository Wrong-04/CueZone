import { Breadcrumb as AntBreadcrumb, type BreadcrumbProps as AntBreadcrumbProps } from "antd";
import type { ItemType } from "antd/es/breadcrumb/Breadcrumb";
import clsx from "clsx";
import type { FC } from "react";

export type BreadcrumbProps = AntBreadcrumbProps;
export type BreadcrumbItem = ItemType;

export const Breadcrumb: FC<BreadcrumbProps> = ({ className, ...props }) => {
  return <AntBreadcrumb className={clsx("text-[13.5px]", className)} {...props} />;
};
