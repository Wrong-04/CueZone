import { Spin as AntSpin, type SpinProps as AntSpinProps } from "antd";
import clsx from "clsx";
import type { FC, ReactNode } from "react";

export interface SpinProps extends Omit<AntSpinProps, "tip"> {
  tip?: ReactNode;
  description?: ReactNode;
}

export const Spin: FC<SpinProps> = ({ className, tip, description, ...props }) => {
  const resolvedDescription = description ?? tip;
  return <AntSpin className={clsx(className)} description={resolvedDescription} {...props} />;
};
