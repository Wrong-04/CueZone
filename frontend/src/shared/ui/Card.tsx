import { Card as AntCard, type CardProps as AntCardProps } from 'antd';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Card (thừa hưởng từ Ant Design CardProps).
 */
export type CardProps = AntCardProps;

type CompoundedCard = FC<CardProps> & {
  Grid: typeof AntCard.Grid;
  Meta: typeof AntCard.Meta;
};

/**
 * Thẻ chứa nội dung (Card):
 * Khung bọc giao diện có viền, bo góc và đổ bóng nhẹ theo chuẩn thiết kế của hệ thống.
 */
export const Card: CompoundedCard = Object.assign(
  (({ className, ...props }: CardProps) => {
    return (
      <AntCard
        className={clsx('border-border-divider shadow-2xs rounded-lg', className)}
        {...props}
      />
    );
  }) as FC<CardProps>,
  {
    Grid: AntCard.Grid,
    Meta: AntCard.Meta,
  },
);
