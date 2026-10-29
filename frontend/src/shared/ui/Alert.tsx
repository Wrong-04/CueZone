import { Alert as AntAlert, type AlertProps as AntAlertProps } from "antd";
import clsx from "clsx";
import type { FC } from "react";

export type AlertProps = AntAlertProps;

export const Alert: FC<AlertProps> = ({ className, ...props }) => (
  <AntAlert className={clsx(className)} {...props} />
);
