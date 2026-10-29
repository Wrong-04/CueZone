import {
  Col as AntCol,
  Row as AntRow,
  type ColProps as AntColProps,
  type RowProps as AntRowProps,
} from "antd";
import clsx from "clsx";
import type { FC } from "react";

export type RowProps = AntRowProps;

export type ColProps = AntColProps;

export const Row: FC<RowProps> = ({ className, ...props }) => (
  <AntRow className={clsx(className)} {...props} />
);

export const Col: FC<ColProps> = ({ className, ...props }) => (
  <AntCol className={clsx(className)} {...props} />
);
