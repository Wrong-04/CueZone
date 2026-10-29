import { Result as AntResult, type ResultProps as AntResultProps } from "antd";
import clsx from "clsx";
import type { FC } from "react";

export type ResultProps = AntResultProps;

export const Result: FC<ResultProps> = ({ className, ...props }) => (
  <AntResult className={clsx(className)} {...props} />
);
