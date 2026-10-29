import { Timeline as AntTimeline, type TimelineProps as AntTimelineProps } from "antd";
import clsx from "clsx";
import type { FC } from "react";

export type TimelineProps = AntTimelineProps;

export const Timeline: FC<TimelineProps> = ({ className, ...props }) => (
  <AntTimeline className={clsx(className)} {...props} />
);
