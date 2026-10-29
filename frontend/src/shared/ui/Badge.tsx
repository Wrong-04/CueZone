import { Badge as AntBadge, type BadgeProps as AntBadgeProps } from "antd";
import clsx from "clsx";
import type { FC } from "react";

export type BadgeProps = AntBadgeProps;

type CompoundedBadge = FC<BadgeProps> & { Ribbon: typeof AntBadge.Ribbon };

export const Badge: CompoundedBadge = Object.assign(
  (({ className, ...props }: BadgeProps) => (
    <AntBadge className={clsx(className)} {...props} />
  )) as FC<BadgeProps>,
  { Ribbon: AntBadge.Ribbon },
);
