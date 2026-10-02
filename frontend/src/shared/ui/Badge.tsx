import { Badge as AntBadge, type BadgeProps as AntBadgeProps } from 'antd';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Badge (thừa hưởng từ Ant Design BadgeProps).
 */
export type BadgeProps = AntBadgeProps;

type CompoundedBadge = FC<BadgeProps> & { Ribbon: typeof AntBadge.Ribbon };

/**
 * Huy hiệu số lượng / trạng thái (Badge):
 * Dùng để hiển thị số lượng thông báo chưa đọc, chấm trạng thái (status dot), hoặc dải ruy-băng (Badge.Ribbon).
 */
export const Badge: CompoundedBadge = Object.assign(
  (({ className, ...props }: BadgeProps) => (
    <AntBadge className={clsx(className)} {...props} />
  )) as FC<BadgeProps>,
  { Ribbon: AntBadge.Ribbon },
);
