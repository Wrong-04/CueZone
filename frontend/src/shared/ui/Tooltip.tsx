import { Tooltip as AntTooltip, type TooltipProps as AntTooltipProps } from "antd";
import type { FC } from "react";

export type TooltipProps = AntTooltipProps;

export const Tooltip: FC<TooltipProps> = (props) => {
  return <AntTooltip {...props} />;
};
